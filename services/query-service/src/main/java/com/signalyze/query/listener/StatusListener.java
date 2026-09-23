package com.signalyze.query.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.signalyze.query.service.StatusEventService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class StatusListener {

    private static final Logger log = LoggerFactory.getLogger(StatusListener.class);

    private final StatusEventService statusEvents;
    private final ObjectMapper objectMapper;

    public StatusListener(StatusEventService statusEvents, ObjectMapper objectMapper) {
        this.statusEvents = statusEvents;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "document.processed", groupId = "query-service")
    public void onProcessed(String message) {
        publishStatus(extractJobId(message), "DONE");
    }

    @KafkaListener(topics = "document.failed", groupId = "query-service")
    public void onFailed(String message) {
        publishStatus(extractJobId(message), "FAILED");
    }

    private void publishStatus(String jobId, String status) {
        if (jobId == null) return;
        MDC.put("jobId", jobId);
        try {
            statusEvents.publish(jobId, status);
        } finally {
            MDC.remove("jobId");
        }
    }

    private String extractJobId(String message) {
        try {
            return objectMapper.readTree(message).path("jobId").asText(null);
        } catch (Exception e) {
            log.warn("Could not parse jobId from status event: {}", e.getMessage());
            return null;
        }
    }
}
