package com.signalyze.processing.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.signalyze.processing.event.DocumentProcessed;
import com.signalyze.processing.event.DocumentUploaded;

@Component
public class DocumentListener {

    private static final Logger log = LoggerFactory.getLogger(DocumentListener.class);
    private static final String DOCUMENT_PROCESSED = "document.processed";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public DocumentListener(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = "document.uploaded")
    public void onDocumentUploaded(DocumentUploaded event) {
        log.info("Received DocumentUploaded jobId:{} filename: {}", event.jobId(), event.filename());

        if(event.filename()!=null && event.filename().contains("fail")){
            throw new RuntimeException("Simulated processing failure for "+event.filename());
        }
        
        // Simulate document processing
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String summary = "Mock summary for " + event.filename();
        DocumentProcessed processed = DocumentProcessed.done(event.jobId(), summary);
        kafkaTemplate.send(DOCUMENT_PROCESSED, event.jobId(), processed);
        log.info("Published DocumentProcessed jobId:{} status:DONE", event.jobId());
    }
}
