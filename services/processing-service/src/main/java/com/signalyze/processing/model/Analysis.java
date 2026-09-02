package com.signalyze.processing.model;

import com.signalyze.processing.ai.AnalysisResult;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "analyses")
public class Analysis {

    @Id
    private String jobId;
    private String filename;
    private String status;
    private String summary;
    private AnalysisResult result;
    private Instant createdAt;

    public Analysis() {
    }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public AnalysisResult getResult() { return result; }
    public void setResult(AnalysisResult result) { this.result = result; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}