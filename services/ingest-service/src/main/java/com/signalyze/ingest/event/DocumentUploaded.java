package com.signalyze.ingest.event;

import java.time.Instant;

public record DocumentUploaded(String jobId, String filename, long sizeBytes, String uploadedAt) {
    public static DocumentUploaded of(String jobId, String filename, long sizeBytes){
        return new DocumentUploaded(jobId, filename, sizeBytes, Instant.now().toString());
    }
}
