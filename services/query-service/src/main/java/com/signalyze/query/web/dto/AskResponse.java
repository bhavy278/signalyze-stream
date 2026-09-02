package com.signalyze.query.web.dto;

import java.util.List;

public record AskResponse(String answer, List<Source> sources) {
    public record Source(int chunkIndex, String excerpt) {
    }
}