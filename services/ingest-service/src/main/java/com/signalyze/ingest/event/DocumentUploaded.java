package com.signalyze.ingest.event;

import java.time.Instant;

public record DocumentUploaded(String jobId, String userId, String filename, long sizeBytes,
                               String content, String uploadedAt) {
    public static DocumentUploaded of(String jobId, String userId, String filename, long sizeBytes, String content) {
        return new DocumentUploaded(jobId, userId, filename, sizeBytes, content, Instant.now().toString());
    }
}
