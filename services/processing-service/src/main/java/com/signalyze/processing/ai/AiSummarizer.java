package com.signalyze.processing.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Stream;

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

    private static final String OVERVIEW_PROMPT = """
        You are a document analyst. In 3 to 4 sentences of plain English, give a busy
        reviewer your executive read of this document: what it is, who it is between,
        what it is for, and the single thing most worth a closer look. Write flowing prose —
        no lists, no headings, no preamble — just the read itself.
        """;

    private final RestClient restClient;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public AiSummarizer(@Value("${openai.api-key}") String apiKey,
                        @Value("${openai.model}") String model,
                        @Value("${openai.base-url}") String baseUrl,
                        ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
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

    /**
     * Streams a short plain-English overview of the document, invoking onToken for each
     * content delta as it arrives. This gives the UI something to render live while the
     * full structured analysis is still being produced. Best-effort by contract: callers
     * should treat any failure here as non-fatal (the structured analysis is the source of truth).
     */
    public void streamOverview(String filename, String content, Consumer<String> onToken) {
        String text = (content == null) ? "" : content;
        if (text.length() > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
        }
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "stream", true,
                    "messages", List.of(
                            Map.of("role", "system", "content", OVERVIEW_PROMPT),
                            Map.of("role", "user", "content", "Filename: " + filename + "\n\nDocument:\n" + text)
                    )
            );
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<Stream<String>> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofLines());
            try (Stream<String> lines = response.body()) {
                lines.forEach(line -> {
                    if (!line.startsWith("data:")) return;
                    String data = line.substring(5).trim();
                    if (data.isEmpty() || data.equals("[DONE]")) return;
                    try {
                        JsonNode node = objectMapper.readTree(data);
                        JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                        if (delta.isTextual()) onToken.accept(delta.asText());
                    } catch (Exception ignore) {
                        // skip keepalive / non-JSON lines
                    }
                });
            }
        } catch (Exception e) {
            throw new RuntimeException("Overview streaming failed: " + e.getMessage(), e);
        }
    }

    public record OpenAiResponse(List<Choice> choices) {}
    public record Choice(Message message) {}
    public record Message(String content) {}
}
