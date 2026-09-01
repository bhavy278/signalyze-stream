package com.signalyze.processing.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiSummarizer {

    private static final int MAX_CHARS = 6000;

    private final RestClient restClient;
    private final String model;

    public AiSummarizer(@Value("${openai.api-key}") String apiKey,
                        @Value("${openai.model}") String model,
                        @Value("${openai.base-url}") String baseUrl) {
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public String summarize(String filename, String content) {
        String text = (content == null) ? "" : content;
        if (text.length() > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system",
                                "content", "You are a document analysis assistant. In 3-4 sentences, summarize the document's purpose, key obligations, and any risks or unusual clauses."),
                        Map.of("role", "user",
                                "content", "Filename: " + filename + "\n\nDocument:\n" + text)
                )
        );

        OpenAiResponse response = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(OpenAiResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            return "No summary produced.";
        }
        return response.choices().get(0).message().content();
    }

    public record OpenAiResponse(List<Choice> choices) {}
    public record Choice(Message message) {}
    public record Message(String content) {}
}