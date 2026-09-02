package com.signalyze.processing.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiSummarizer {

    private static final int MAX_CHARS = 8000;

    private static final String SYSTEM_PROMPT = """
        You are a contract and document analysis assistant. Analyze the document and
        respond with ONLY a valid JSON object (no markdown, no commentary) with this exact shape:
        {
          "documentType": "e.g. Service Agreement, NDA, Invoice, Lease",
          "parties": ["each named party and its role"],
          "summary": "a 2 to 3 sentence plain-English overview",
          "keyTerms": [{"label": "string", "value": "string"}],
          "risks": [{"severity": "HIGH | MEDIUM | LOW", "title": "string", "detail": "string"}]
        }
        keyTerms should capture items like Payment, Term, Termination, Late Fee, Governing Law, Renewal.
        risks should flag unusual, one-sided, or high-exposure clauses.
        If a section has no content, use an empty array or an empty string. Keep values concise.
        """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public AiSummarizer(@Value("${openai.api-key}") String apiKey,
                        @Value("${openai.model}") String model,
                        @Value("${openai.base-url}") String baseUrl,
                        ObjectMapper objectMapper) {
        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public AnalysisResult analyze(String filename, String content) {
        String text = (content == null) ? "" : content;
        if (text.length() > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", "Filename: " + filename + "\n\nDocument:\n" + text)
                )
        );

        OpenAiResponse response = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(OpenAiResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new IllegalStateException("Empty response from AI");
        }

        String json = response.choices().get(0).message().content();
        try {
            return objectMapper.readValue(json, AnalysisResult.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI JSON response", e);
        }
    }

    public record OpenAiResponse(List<Choice> choices) {}
    public record Choice(Message message) {}
    public record Message(String content) {}
}