package com.signalyze.query.ai;

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
public class OpenAiClient {

    private final RestClient restClient;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String chatModel;
    private final String embeddingModel;

    public OpenAiClient(@Value("${openai.api-key}") String apiKey,
                        @Value("${openai.base-url}") String baseUrl,
                        @Value("${openai.model}") String chatModel,
                        @Value("${openai.embedding-model}") String embeddingModel,
                        ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.chatModel = chatModel;
        this.embeddingModel = embeddingModel;
        this.objectMapper = objectMapper;
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
        for (int i = 0; i < arr.length; i++) arr[i] = vec.get(i).floatValue();
        return arr;
    }

    public String chat(List<Map<String, String>> messages) {
        Map<String, Object> body = Map.of("model", chatModel, "messages", messages);
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

    /** Streams a chat completion, invoking onToken for each content delta as it arrives. */
    public void streamChat(List<Map<String, String>> messages, Consumer<String> onToken) {
        try {
            Map<String, Object> body = Map.of(
                    "model", chatModel, "messages", messages, "stream", true);
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
                        JsonNode content = node.path("choices").path(0).path("delta").path("content");
                        if (content.isTextual()) onToken.accept(content.asText());
                    } catch (Exception ignore) {
                        // skip keepalive / non-JSON lines
                    }
                });
            }
        } catch (Exception e) {
            throw new RuntimeException("Streaming failed: " + e.getMessage(), e);
        }
    }

    public record EmbeddingResponse(List<Item> data) {}
    public record Item(List<Double> embedding) {}
    public record ChatResponse(List<Choice> choices) {}
    public record Choice(Message message) {}
    public record Message(String content) {}
}
