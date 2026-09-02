package com.signalyze.auth.web;

import com.signalyze.auth.dto.AuthResponse;
import com.signalyze.auth.dto.LoginRequest;
import com.signalyze.auth.dto.RegisterRequest;
import com.signalyze.auth.model.User;
import com.signalyze.auth.repository.UserRepository;
import com.signalyze.auth.security.JwtService;
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

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
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
        return ResponseEntity.ok(new AuthResponse(jwt.issue(user.getId(), email), email));
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
        return ResponseEntity.ok(new AuthResponse(jwt.issue(user.getId(), email), email));
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
}
