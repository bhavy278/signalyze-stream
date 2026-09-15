package com.signalyze.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    // 64-char secret -> 64-byte key -> HS512, same as production
    private static final String SECRET =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final long ONE_HOUR = 3_600_000L;

    @Test
    void issuesTokenThatParsesBackToItsClaims() {
        JwtService jwt = new JwtService(SECRET, ONE_HOUR);

        String token = jwt.issue("user-123", "bhavy@example.com");
        Jws<Claims> parsed = jwt.parse(token);

        assertThat(parsed.getPayload().getSubject()).isEqualTo("user-123");
        assertThat(parsed.getPayload().get("email", String.class))
                .isEqualTo("bhavy@example.com");
    }

    @Test
    void rejectsTokenSignedWithADifferentSecret() {
        String token = new JwtService(SECRET, ONE_HOUR).issue("user-123", "a@b.com");
        JwtService other = new JwtService(
                "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", ONE_HOUR);

        assertThrows(JwtException.class, () -> other.parse(token));
    }

    @Test
    void rejectsATamperedToken() {
        JwtService jwt = new JwtService(SECRET, ONE_HOUR);
        String token = jwt.issue("user-123", "a@b.com");
        String tampered = token.substring(0, token.length() - 4) + "AAAA";

        assertThrows(JwtException.class, () -> jwt.parse(tampered));
    }

    @Test
    void rejectsAnExpiredToken() {
        JwtService jwt = new JwtService(SECRET, -1_000L); // issued already-expired

        String token = jwt.issue("user-123", "a@b.com");

        assertThrows(ExpiredJwtException.class, () -> jwt.parse(token));
    }
}
