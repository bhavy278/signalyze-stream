package com.signalyze.auth.security;

import com.signalyze.auth.model.RefreshToken;
import com.signalyze.auth.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Issues and validates opaque refresh tokens. The raw token is high-entropy random and is
 * returned to the client only once; the store keeps just its hash. Refresh is a rotation:
 * a used token is deleted and a fresh one issued, so a stolen-and-replayed token stops working
 * as soon as the legitimate client refreshes.
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final long refreshExpirationMs;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository,
                               @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs) {
        this.repository = repository;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    /** Creates a new refresh token, persists its hash, and returns the raw value for the client. */
    public String issue(String userId, String email) {
        RefreshToken rt = new RefreshToken();
        String raw = randomToken();
        rt.setId(sha256(raw));
        rt.setUserId(userId);
        rt.setEmail(email);
        rt.setCreatedAt(Instant.now());
        rt.setExpiresAt(Instant.now().plusMillis(refreshExpirationMs));
        repository.save(rt);
        return raw;
    }

    /** Validates a raw token, deletes it (single-use), and issues a fresh one. */
    public Optional<Rotated> rotate(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        return repository.findById(sha256(raw))
                .filter(rt -> rt.getExpiresAt() != null && rt.getExpiresAt().isAfter(Instant.now()))
                .map(rt -> {
                    repository.deleteById(rt.getId());
                    String next = issue(rt.getUserId(), rt.getEmail());
                    return new Rotated(rt.getUserId(), rt.getEmail(), next);
                });
    }

    /** Revokes a raw token (used on logout). Best-effort. */
    public void revoke(String raw) {
        if (raw == null || raw.isBlank()) {
            return;
        }
        try {
            repository.deleteById(sha256(raw));
        } catch (Exception ignored) {
            // already gone
        }
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String s) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public record Rotated(String userId, String email, String refreshToken) {}
}
