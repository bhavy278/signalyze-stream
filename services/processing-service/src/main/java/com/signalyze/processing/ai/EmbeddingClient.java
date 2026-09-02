package com.signalyze.processing.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingClient {

    private final RestClient restClient;
    private final String model;

    public EmbeddingClient(@Value("${openai.api-key}") String apiKey,
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.embedding-model}") String model) {
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    /** Embeds many texts in a single batched API call. */
    public List<float[]> embed(List<String> inputs) {
        Map<String, Object> body = Map.of("model", model, "input", inputs);

        EmbeddingResponse response = restClient.post()
                .uri("/embeddings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(EmbeddingResponse.class);

        if (response == null || response.data() == null) {
            throw new IllegalStateException("Empty embedding response");
        }
        return response.data().stream()
                .sorted(Comparator.comparingInt(Item::index))
                .map(Item::toFloatArray)
                .toList();
    }

    /** Embeds a single text (used later by the /ask endpoint's question). */
    public float[] embedOne(String input) {
        return embed(List.of(input)).get(0);
    }

    public record EmbeddingResponse(List<Item> data) {
    }

    public record Item(int index, List<Double> embedding) {
        float[] toFloatArray() {
            float[] arr = new float[embedding.size()];
            for (int i = 0; i < arr.length; i++)
                arr[i] = embedding.get(i).floatValue();
            return arr;
        }
    }
}