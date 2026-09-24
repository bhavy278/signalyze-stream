package com.signalyze.auth.dto;

public record AuthResponse(String token, String refreshToken, String email) {}
