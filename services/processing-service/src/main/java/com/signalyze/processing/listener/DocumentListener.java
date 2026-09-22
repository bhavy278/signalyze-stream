package com.signalyze.processing.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.signalyze.processing.ai.AiSummarizer;
import com.signalyze.processing.ai.AnalysisResult;
import com.signalyze.processing.ai.Chunker;
import com.signalyze.processing.ai.EmbeddingClient;
import com.signalyze.processing.event.DocumentProcessed;
import com.signalyze.processing.event.DocumentUploaded;
import com.signalyze.processing.model.Analysis;
import com.signalyze.processing.model.DocumentChunk;
import com.signalyze.processing.repository.AnalysisRepository;
import com.signalyze.processing.repository.ChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class DocumentListener {

    private static final Logger log = LoggerFactory.getLogger(DocumentListener.class);
    private static final String DOCUMENT_PROCESSED = "document.processed";
    private static final String ANALYSIS_STREAM_PREFIX = "analysis:stream:";
    private static final Duration STREAM_TTL = Duration.ofMinutes(5);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AnalysisRepository analysisRepository;
    private final ChunkRepository chunkRepository;
    private final StringRedisTemplate redis;
    private final AiSummarizer aiSummarizer;
    private final EmbeddingClient embeddingClient;
    private final ObjectMapper objectMapper;

    public DocumentListener(KafkaTemplate<String, Object> kafkaTemplate,
            AnalysisRepository analysisRepository,
            ChunkRepository chunkRepository,
            StringRedisTemplate redis,
            AiSummarizer aiSummarizer,
            EmbeddingClient embeddingClient,
            ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.analysisRepository = analysisRepository;
        this.chunkRepository = chunkRepository;
        this.redis = redis;
        this.aiSummarizer = aiSummarizer;
        this.embeddingClient = embeddingClient;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "document.uploaded")
    public void onDocumentUploaded(DocumentUploaded event) {
        log.info("Received DocumentUploaded jobId={} filename={}", event.jobId(), event.filename());
        String streamKey = ANALYSIS_STREAM_PREFIX + event.jobId();

        // Demo hook: any file whose name contains "fail" simulates a processing error
        if (event.filename() != null && event.filename().contains("fail")) {
            pushEvent(streamKey, Map.of("t", "failed"));
            throw new RuntimeException("Simulated processing failure for " + event.filename());
        }

        try {
            // 1) Stream a live plain-English overview to the UI while we work (best-effort).
            try {
                aiSummarizer.streamOverview(event.filename(), event.content(),
                        token -> pushEvent(streamKey, Map.of("t", "token", "v", token)));
            } catch (Exception e) {
                log.warn("Overview streaming failed jobId={}: {}", event.jobId(), e.getMessage());
            }

            // 2) Full structured analysis — the source of truth.
            AnalysisResult result = aiSummarizer.analyze(event.filename(), event.content());
            log.info("AI analysis generated jobId={} type={}", event.jobId(), result.documentType());

            Analysis analysis = new Analysis();
            analysis.setJobId(event.jobId());
            analysis.setUserId(event.userId());
            analysis.setFilename(event.filename());
            analysis.setStatus("DONE");
            analysis.setSummary(result.summary());
            analysis.setResult(result);
            analysis.setCreatedAt(Instant.now());
            analysisRepository.save(analysis);

            // RAG indexing: chunk + embed + store (best-effort; never fails the analysis)
            indexChunks(event.jobId(), event.content());

            redis.opsForValue().set("status:" + event.jobId(), "DONE", Duration.ofHours(1));
            log.info("Saved analysis + set status=DONE jobId={}", event.jobId());

            // 3) Tell the live stream we're done so the UI can settle to the final card.
            pushEvent(streamKey, Map.of("t", "done"));

            DocumentProcessed processed = DocumentProcessed.done(event.jobId(), result.summary());
            kafkaTemplate.send(DOCUMENT_PROCESSED, event.jobId(), processed);
        } catch (RuntimeException e) {
            pushEvent(streamKey, Map.of("t", "failed"));
            throw e;
        }
    }

    private void indexChunks(String jobId, String content) {
        try {
            List<String> chunks = Chunker.chunk(content);
            if (chunks.isEmpty()) {
                log.info("No content to index jobId={}", jobId);
                return;
            }
            chunkRepository.deleteByJobId(jobId);
            List<float[]> vectors = embeddingClient.embed(chunks);

            List<DocumentChunk> docs = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                docs.add(new DocumentChunk(jobId + "-" + i, jobId, i, chunks.get(i), vectors.get(i)));
            }
            chunkRepository.saveAll(docs);
            log.info("Indexed {} chunks jobId={}", docs.size(), jobId);
        } catch (Exception e) {
            log.warn("Failed to index chunks jobId={}: {}", jobId, e.getMessage());
        }
    }

    /** Right-pushes a small JSON event onto the job's live-analysis list (best-effort). */
    private void pushEvent(String key, Map<String, Object> event) {
        try {
            redis.opsForList().rightPush(key, objectMapper.writeValueAsString(event));
            redis.expire(key, STREAM_TTL);
        } catch (Exception e) {
            // The live stream is a nicety, not the source of truth — never let it break processing.
        }
    }
}
