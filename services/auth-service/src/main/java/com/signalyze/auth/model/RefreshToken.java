package com.signalyze.auth.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A server-side refresh token. Only a SHA-256 hash of the raw token is stored (id), so a
 * database leak never yields usable tokens. Tokens are single-use: rotating or revoking one
 * deletes the row. A TTL index on expiresAt lets MongoDB purge expired tokens automatically.
 */
@Document(collection = "refresh_tokens")
public class RefreshToken {

    @Id
    private String id; // sha256(raw token)
    private String userId;
    private String email;
    private Instant createdAt;
    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    public RefreshToken() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
