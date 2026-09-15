package com.signalyze.query.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class StatusEventService {

    private static final Logger log = LoggerFactory.getLogger(StatusEventService.class);

    private final Map<String, List<SseEmitter>> subscribers = new ConcurrentHashMap<>();
    private final StringRedisTemplate redis;

    public StatusEventService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Opens an SSE stream for a job's status; completes as soon as it's DONE/FAILED. */
    public SseEmitter subscribe(String jobId) {
        SseEmitter emitter = new SseEmitter(90_000L);
        String status = redis.opsForValue().get("status:" + jobId);

        if ("DONE".equals(status) || "FAILED".equals(status)) {
            send(emitter, status);
            emitter.complete();
            return emitter;
        }

        subscribers.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> unregister(jobId, emitter));
        emitter.onTimeout(() -> {
            unregister(jobId, emitter);
            emitter.complete();
        });
        send(emitter, status != null ? status : "PROCESSING");
        return emitter;
    }

    /** Called when a Kafka event marks a job DONE/FAILED — pushes to all its subscribers. */
    public void publish(String jobId, String status) {
        List<SseEmitter> list = subscribers.remove(jobId);
        if (list == null || list.isEmpty()) return;
        for (SseEmitter e : list) {
            send(e, status);
            e.complete();
        }
        log.info("Pushed status={} to {} subscriber(s) jobId={}", status, list.size(), jobId);
    }

    private void unregister(String jobId, SseEmitter emitter) {
        List<SseEmitter> list = subscribers.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) subscribers.remove(jobId);
        }
    }

    private void send(SseEmitter emitter, String status) {
        try {
            emitter.send(SseEmitter.event().name("status").data(status));
        } catch (IOException e) {
            // client disconnected
        }
    }
}
