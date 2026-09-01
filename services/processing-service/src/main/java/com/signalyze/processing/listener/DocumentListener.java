package com.signalyze.processing.listener;

import com.signalyze.processing.event.DocumentProcessed;
import com.signalyze.processing.event.DocumentUploaded;
import com.signalyze.processing.model.Analysis;
import com.signalyze.processing.repository.AnalysisRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class DocumentListener {

    private static final Logger log = LoggerFactory.getLogger(DocumentListener.class);
    private static final String DOCUMENT_PROCESSED = "document.processed";

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AnalysisRepository analysisRepository;
    private final StringRedisTemplate redis;

    public DocumentListener(KafkaTemplate<String, Object> kafkaTemplate,
                            AnalysisRepository analysisRepository,
                            StringRedisTemplate redis) {
        this.kafkaTemplate = kafkaTemplate;
        this.analysisRepository = analysisRepository;
        this.redis = redis;
    }

    @KafkaListener(topics = "document.uploaded")
    public void onDocumentUploaded(DocumentUploaded event) {
        log.info("Received DocumentUploaded jobId={} filename={}", event.jobId(), event.filename());

        // Demo hook: any file whose name contains "fail" simulates a processing error
        if (event.filename() != null && event.filename().contains("fail")) {
            throw new RuntimeException("Simulated processing failure for " + event.filename());
        }

        // Simulate AI processing — replaced with the real RAG pipeline later
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String summary = "Mock summary for " + event.filename();

        Analysis analysis = new Analysis(event.jobId(), event.filename(), "DONE", summary, Instant.now());
        analysisRepository.save(analysis);
        redis.opsForValue().set("status:" + event.jobId(), "DONE", Duration.ofHours(1));
        log.info("Saved analysis + set status=DONE jobId={}", event.jobId());

        DocumentProcessed processed = DocumentProcessed.done(event.jobId(), summary);
        kafkaTemplate.send(DOCUMENT_PROCESSED, event.jobId(), processed);
        log.info("Published DocumentProcessed jobId={} status=DONE", event.jobId());
    }
}