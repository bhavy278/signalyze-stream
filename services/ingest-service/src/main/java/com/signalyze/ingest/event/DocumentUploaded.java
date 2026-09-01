package com.signalyze.ingest.event;

import java.time.Instant;

public record DocumentUploaded(String jobId, String filename, long sizeBytes, String content,
String uploadedAt) {
    public static DocumentUploaded of(String jobId, String filename, long sizeBytes,String content) {
        return new DocumentUploaded(jobId, filename, sizeBytes,content, Instant.now().toString());
    }
}
