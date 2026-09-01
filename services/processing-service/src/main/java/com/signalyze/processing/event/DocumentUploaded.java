package com.signalyze.processing.event;

public record DocumentUploaded(String jobId, String filename, long sizeBytes, String uploadedAt) {

}
