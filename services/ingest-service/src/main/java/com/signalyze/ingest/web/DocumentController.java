package com.signalyze.ingest.web;

import com.signalyze.ingest.config.KafkaTopicsConfig;
import com.signalyze.ingest.event.DocumentUploaded;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redis;

    public DocumentController(KafkaTemplate<String, Object> kafkaTemplate, StringRedisTemplate redis) {
        this.kafkaTemplate = kafkaTemplate;
        this.redis = redis;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String jobId = UUID.randomUUID().toString();
        DocumentUploaded event =
                DocumentUploaded.of(jobId, file.getOriginalFilename(), file.getSize());

        redis.opsForValue().set("status:" + jobId, "PROCESSING", Duration.ofHours(1));
        kafkaTemplate.send(KafkaTopicsConfig.DOCUMENT_UPLOADED, jobId, event);
        log.info("Published DocumentUploaded jobId={} filename={}", jobId, file.getOriginalFilename());

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("jobId", jobId, "status", "PROCESSING"));
    }
}