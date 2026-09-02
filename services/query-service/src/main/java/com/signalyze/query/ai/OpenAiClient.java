package com.signalyze.query.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiClient {

    private final RestClient restClient;
    private final String chatModel;
    private final String embeddingModel;

    public OpenAiClient(@Value("${openai.api-key}") String apiKey,
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.model}") String chatModel,
            @Value("${openai.embedding-model}") String embeddingModel) {
        this.chatModel = chatModel;
        this.embeddingModel = embeddingModel;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public float[] embed(String input) {
        Map<String, Object> body = Map.of("model", embeddingModel, "input", input);
        EmbeddingResponse res = restClient.post()
                .uri("/embeddings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(EmbeddingResponse.class);
        if (res == null || res.data() == null || res.data().isEmpty()) {
            throw new IllegalStateException("Empty embedding response");
        }
        List<Double> vec = res.data().get(0).embedding();
        float[] arr = new float[vec.size()];
        for (int i = 0; i < arr.length; i++)
            arr[i] = vec.get(i).floatValue();
        return arr;
    }

    public String chat(String system, String user) {
        Map<String, Object> body = Map.of(
                "model", chatModel,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user)));
        ChatResponse res = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(ChatResponse.class);
        if (res == null || res.choices() == null || res.choices().isEmpty()) {
            throw new IllegalStateException("Empty chat response");
        }
        return res.choices().get(0).message().content();
    }

    public record EmbeddingResponse(List<Item> data) {
    }

    public record Item(List<Double> embedding) {
    }

    public record ChatResponse(List<Choice> choices) {
    }

    public record Choice(Message message) {
    }

    public record Message(String content) {
    }
}