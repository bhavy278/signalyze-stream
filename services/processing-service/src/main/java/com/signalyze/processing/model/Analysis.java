package com.signalyze.processing.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "analysis")
public class Analysis {

    @Id
    private String jobId;
    private String filename;
    private String status;
    private String summary;
    private Instant createdAt;

    public Analysis() {
    }

    public Analysis(String jobId, String filename, String status, String summary, Instant createdAt) {
        this.jobId = jobId;
        this.filename = filename;
        this.status = status;
        this.summary = summary;
        this.createdAt = createdAt;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

}
