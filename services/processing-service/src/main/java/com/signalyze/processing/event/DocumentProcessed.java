package com.signalyze.processing.event;

import java.time.Instant;

public record DocumentProcessed(String jobId, String status, String summary, String processedAt) {

    public static DocumentProcessed done(String jobId, String summary) {
        return new DocumentProcessed(jobId, "DONE", summary, Instant.now().toString());
    }
}
