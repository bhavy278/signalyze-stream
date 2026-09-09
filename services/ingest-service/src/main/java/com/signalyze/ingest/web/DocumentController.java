package com.signalyze.ingest.web;

import com.signalyze.ingest.config.KafkaTopicsConfig;
import com.signalyze.ingest.event.DocumentUploaded;
import com.signalyze.ingest.security.CurrentUser;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);
    private static final int MAX_UPLOADS_PER_MINUTE = 5;
    private static final int MAX_CONTENT_CHARS = 30_000;

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redis;

    public DocumentController(KafkaTemplate<String, Object> kafkaTemplate, StringRedisTemplate redis) {
        this.kafkaTemplate = kafkaTemplate;
        this.redis = redis;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String userId = CurrentUser.id();

        String rateKey = "rate:" + userId;
        Long count = redis.opsForValue().increment(rateKey);
        if (count != null && count == 1L) {
            redis.expire(rateKey, Duration.ofMinutes(1));
        }
        if (count != null && count > MAX_UPLOADS_PER_MINUTE) {
            log.warn("Rate limit exceeded for user {}", userId);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded. Please wait a minute."));
        }

        String jobId = UUID.randomUUID().toString();
        String content = extractText(file);
        if (content.length() > MAX_CONTENT_CHARS) {
            content = content.substring(0, MAX_CONTENT_CHARS);
        }

        DocumentUploaded event =
                DocumentUploaded.of(jobId, userId, file.getOriginalFilename(), file.getSize(), content);

        redis.opsForValue().set("status:" + jobId, "PROCESSING", Duration.ofHours(1));
        kafkaTemplate.send(KafkaTopicsConfig.DOCUMENT_UPLOADED, jobId, event);
        log.info("Published DocumentUploaded jobId={} userId={} filename={}", jobId, userId, file.getOriginalFilename());

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("jobId", jobId, "status", "PROCESSING"));
    }

    private String extractText(MultipartFile file) throws IOException {
        if (isPdf(file)) {
            try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
                return new PDFTextStripper().getText(doc);
            }
        }
        return new String(file.getBytes(), StandardCharsets.UTF_8);
    }

    private boolean isPdf(MultipartFile file) {
        String type = file.getContentType();
        String name = file.getOriginalFilename();
        return "application/pdf".equalsIgnoreCase(type)
                || (name != null && name.toLowerCase().endsWith(".pdf"));
    }
}
