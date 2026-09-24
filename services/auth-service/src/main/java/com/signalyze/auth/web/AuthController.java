package com.signalyze.auth.web;

import com.signalyze.auth.dto.AuthResponse;
import com.signalyze.auth.dto.LoginRequest;
import com.signalyze.auth.dto.RefreshRequest;
import com.signalyze.auth.dto.RegisterRequest;
import com.signalyze.auth.model.User;
import com.signalyze.auth.repository.UserRepository;
import com.signalyze.auth.security.JwtService;
import com.signalyze.auth.security.RefreshTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                         RefreshTokenService refreshTokens) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req == null || req.email() == null || req.email().isBlank()
                || req.password() == null || req.password().length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email and a password of at least 6 characters are required."));
        }
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            return ResponseEntity.status(409).body(Map.of("error", "That email is already registered."));
        }
        User user = new User(null, email, encoder.encode(req.password()), Instant.now());
        users.save(user);
        return ResponseEntity.ok(tokensFor(user.getId(), email));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String email = (req == null || req.email() == null) ? "" : req.email().trim().toLowerCase();
        Optional<User> found = users.findByEmail(email);
        if (found.isEmpty() || req == null
                || !encoder.matches(req.password(), found.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password."));
        }
        User user = found.get();
        return ResponseEntity.ok(tokensFor(user.getId(), email));
    }

    /** Exchanges a valid refresh token for a fresh access token and a rotated refresh token. */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody(required = false) RefreshRequest req) {
        String raw = (req == null) ? null : req.refreshToken();
        if (raw == null || raw.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing refresh token."));
        }
        return refreshTokens.rotate(raw)
                .<ResponseEntity<?>>map(r -> ResponseEntity.ok(
                        new AuthResponse(jwt.issue(r.userId(), r.email()), r.refreshToken(), r.email())))
                .orElseGet(() -> ResponseEntity.status(401)
                        .body(Map.of("error", "Invalid or expired refresh token.")));
    }

    /** Revokes the given refresh token (client also clears its own copy). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshRequest req) {
        if (req != null) {
            refreshTokens.revoke(req.refreshToken());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        try {
            var claims = jwt.parse(auth.substring(7)).getPayload();
            return ResponseEntity.ok(Map.of(
                    "userId", claims.getSubject(),
                    "email", claims.get("email", String.class)));
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    private AuthResponse tokensFor(String userId, String email) {
        String access = jwt.issue(userId, email);
        String refresh = refreshTokens.issue(userId, email);
        return new AuthResponse(access, refresh, email);
    }
}
