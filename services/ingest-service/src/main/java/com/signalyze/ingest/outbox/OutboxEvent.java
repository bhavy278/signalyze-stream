package com.signalyze.ingest.outbox;

import com.signalyze.ingest.event.DocumentUploaded;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Transactional-outbox record. On upload we persist the event here (status PENDING) in the
 * same request that stores the file — never publishing to Kafka inline — so the event can't
 * be lost if the broker is momentarily unavailable. A scheduled relay publishes PENDING rows
 * and flips them to SENT. SENT rows carry a TTL so the collection self-prunes; PENDING rows
 * (sentAt == null) are never expired.
 */
@Document(collection = "outbox_events")
public class OutboxEvent {

    @Id
    private String id;
    private String topic;
    private String messageKey;          // Kafka partition key (the jobId)
    private DocumentUploaded payload;    // the event to publish
    @Indexed
    private String status;              // PENDING | SENT
    private int attempts;
    private Instant createdAt;
    @Indexed(expireAfterSeconds = 86400) // SENT rows expire 24h after sentAt; nulls (PENDING) never expire
    private Instant sentAt;

    public OutboxEvent() {
    }

    public static OutboxEvent pending(String topic, String messageKey, DocumentUploaded payload) {
        OutboxEvent e = new OutboxEvent();
        e.topic = topic;
        e.messageKey = messageKey;
        e.payload = payload;
        e.status = "PENDING";
        e.attempts = 0;
        e.createdAt = Instant.now();
        return e;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getMessageKey() { return messageKey; }
    public void setMessageKey(String messageKey) { this.messageKey = messageKey; }

    public DocumentUploaded getPayload() { return payload; }
    public void setPayload(DocumentUploaded payload) { this.payload = payload; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}
