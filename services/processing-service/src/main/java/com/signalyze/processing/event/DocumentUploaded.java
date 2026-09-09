package com.signalyze.processing.event;

public record DocumentUploaded(String jobId, String userId, String filename, long sizeBytes,
                               String content, String uploadedAt) {
}
