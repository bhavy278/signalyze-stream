package com.signalyze.ingest.web;

import com.signalyze.ingest.config.KafkaTopicsConfig;
import com.signalyze.ingest.event.DocumentUploaded;
import jakarta.servlet.http.HttpServletRequest;
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
    private static final int MAX_UPLOADS_PER_MINUTE = 5;

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redis;

    public DocumentController(KafkaTemplate<String, Object> kafkaTemplate, StringRedisTemplate redis) {
        this.kafkaTemplate = kafkaTemplate;
        this.redis = redis;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file,
                                                      HttpServletRequest request) {
        // Fixed-window rate limit: 5 uploads per minute per client IP
        String rateKey = "rate:" + request.getRemoteAddr();
        Long count = redis.opsForValue().increment(rateKey);
        if (count != null && count == 1L) {
            redis.expire(rateKey, Duration.ofMinutes(1));
        }
        if (count != null && count > MAX_UPLOADS_PER_MINUTE) {
            log.warn("Rate limit exceeded for {}", request.getRemoteAddr());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded. Please wait a minute."));
        }

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