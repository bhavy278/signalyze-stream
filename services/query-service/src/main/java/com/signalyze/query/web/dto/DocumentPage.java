package com.signalyze.query.web.dto;

import com.signalyze.query.model.Analysis;

import java.util.List;

public record DocumentPage(
        List<Analysis> items,
        int page,
        int size,
        long total,
        int totalPages) {}
