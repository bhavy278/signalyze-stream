package com.signalyze.auth.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.signalyze.auth.model.User;
import com.signalyze.auth.repository.UserRepository;
import com.signalyze.auth.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer slice for the auth endpoints. Security filters are disabled (the auth-service
 * permits all requests and validates tokens manually), and the collaborators are mocked, so
 * these exercise the controller's request/response contract without a database or JWT signing.
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper om;

    @MockBean
    private UserRepository users;
    @MockBean
    private PasswordEncoder encoder;
    @MockBean
    private JwtService jwt;

    private String body(Object o) throws Exception {
        return om.writeValueAsString(o);
    }

    @Test
    void registerReturnsTokenForNewUser() throws Exception {
        when(users.existsByEmail("new@ex.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("hashed");
        when(jwt.issue(any(), eq("new@ex.com"))).thenReturn("tok-123");

        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "new@ex.com", "password", "secret1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("tok-123"))
                .andExpect(jsonPath("$.email").value("new@ex.com"));
    }

    @Test
    void registerRejectsShortPassword() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "a@ex.com", "password", "123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsDuplicateEmail() throws Exception {
        when(users.existsByEmail("dupe@ex.com")).thenReturn(true);

        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "dupe@ex.com", "password", "secret1"))))
                .andExpect(status().isConflict());
    }

    @Test
    void loginReturnsTokenForValidCredentials() throws Exception {
        User user = new User("uid-1", "user@ex.com", "hashed", Instant.now());
        when(users.findByEmail("user@ex.com")).thenReturn(Optional.of(user));
        when(encoder.matches("secret1", "hashed")).thenReturn(true);
        when(jwt.issue("uid-1", "user@ex.com")).thenReturn("tok-xyz");

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "user@ex.com", "password", "secret1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("tok-xyz"));
    }

    @Test
    void loginRejectsUnknownUser() throws Exception {
        when(users.findByEmail("ghost@ex.com")).thenReturn(Optional.empty());

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "ghost@ex.com", "password", "whatever"))))
                .andExpect(status().isUnauthorized());
    }
}
