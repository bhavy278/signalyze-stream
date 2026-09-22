package com.signalyze.query.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Relays a job's live analysis overview to the browser over SSE. The processing service
 * right-pushes token/done/failed events onto a Redis list as it generates the overview;
 * this endpoint drains that list and forwards each event. Fully additive — if nothing is
 * ever pushed (older docs, a reconnect, a Redis miss), the client falls back to the stored
 * analysis via the normal status-stream path, so the UI degrades gracefully.
 */
@RestController
@RequestMapping("/documents")
public class AnalysisStreamController {

    private static final Logger log = LoggerFactory.getLogger(AnalysisStreamController.class);
    private static final String STREAM_PREFIX = "analysis:stream:";
    private static final long TIMEOUT_MS = 120_000L;
    private static final long DEADLINE_MS = 110_000L;
    private static final long POLL_SLEEP_MS = 50L;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public AnalysisStreamController(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{jobId}/analysis/stream")
    public SseEmitter stream(@PathVariable String jobId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        String key = STREAM_PREFIX + jobId;

        executor.execute(() -> {
            long deadline = System.currentTimeMillis() + DEADLINE_MS;
            try {
                while (System.currentTimeMillis() < deadline) {
                    String raw = redis.opsForList().leftPop(key);
                    if (raw != null) {
                        JsonNode node = objectMapper.readTree(raw);
                        String t = node.path("t").asText("");
                        if ("token".equals(t)) {
                            emitter.send(SseEmitter.event().name("token")
                                    .data(objectMapper.writeValueAsString(node.path("v").asText())));
                        } else if ("done".equals(t)) {
                            emitter.send(SseEmitter.event().name("done").data("{}"));
                            break;
                        } else if ("failed".equals(t)) {
                            emitter.send(SseEmitter.event().name("failed").data("{}"));
                            break;
                        }
                        continue;
                    }

                    // List empty right now — if the job already settled, stop waiting.
                    String status = redis.opsForValue().get("status:" + jobId);
                    if ("DONE".equals(status)) {
                        emitter.send(SseEmitter.event().name("done").data("{}"));
                        break;
                    }
                    if ("FAILED".equals(status)) {
                        emitter.send(SseEmitter.event().name("failed").data("{}"));
                        break;
                    }
                    Thread.sleep(POLL_SLEEP_MS);
                }
                emitter.complete();
            } catch (Exception e) {
                log.debug("Analysis stream ended jobId={}: {}", jobId, e.getMessage());
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }
}
