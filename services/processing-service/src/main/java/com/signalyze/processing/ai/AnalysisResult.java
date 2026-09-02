package com.signalyze.processing.ai;

import java.util.List;

public record AnalysisResult(
        String documentType,
        List<String> parties,
        String summary,
        List<KeyTerm> keyTerms,
        List<Risk> risks
) {
    public record KeyTerm(String label, String value) {}
    public record Risk(String severity, String title, String detail) {}
}