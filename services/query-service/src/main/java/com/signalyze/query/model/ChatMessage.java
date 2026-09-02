package com.signalyze.query.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "chat_messages")
public class ChatMessage {

    @Id
    private String id;
    private String jobId;
    private String role;      // "user" | "assistant"
    private String content;
    private List<Source> sources;   // null for user messages
    private Instant createdAt;

    public ChatMessage() {}

    public ChatMessage(String id, String jobId, String role, String content,
                       List<Source> sources, Instant createdAt) {
        this.id = id;
        this.jobId = jobId;
        this.role = role;
        this.content = content;
        this.sources = sources;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public List<Source> getSources() { return sources; }
    public void setSources(List<Source> sources) { this.sources = sources; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public record Source(int chunkIndex, String excerpt) {}
}
