package com.signalyze.query.web.dto;

import java.util.List;

public record ChatMessageDto(
        String role,
        String content,
        List<AskResponse.Source> sources,
        String createdAt) {}
