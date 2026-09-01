package com.signalyze.ingest.web;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.signalyze.ingest.config.KafkaTopicsConfig;
import com.signalyze.ingest.event.DocumentUploaded;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public DocumentController(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String jobId = UUID.randomUUID().toString();
        DocumentUploaded event = DocumentUploaded.of(jobId, file.getOriginalFilename(), file.getSize());

        kafkaTemplate.send(KafkaTopicsConfig.DOCUMENT_UPLOADED, event);
        log.info("Published DocumentUploaded jobid:{} filename: {}", jobId, file.getOriginalFilename());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("jobId", jobId, "status", "accepted"));
    }
}
