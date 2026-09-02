package com.signalyze.query.service;

import com.signalyze.query.ai.OpenAiClient;
import com.signalyze.query.model.ChatMessage;
import com.signalyze.query.model.DocumentChunk;
import com.signalyze.query.repository.ChatRepository;
import com.signalyze.query.repository.ChunkRepository;
import com.signalyze.query.web.dto.AskResponse;
import com.signalyze.query.web.dto.ChatMessageDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AskService {

    private static final Logger log = LoggerFactory.getLogger(AskService.class);
    private static final int TOP_K = 4;
    private static final int HISTORY_LIMIT = 12; // prior messages sent for context

    private static final String SYSTEM_PROMPT = """
        You are answering questions about one specific document, in an ongoing conversation.
        Use the provided excerpts as your source of truth, and use the earlier conversation for
        context (so follow-up questions like "what about the second one?" make sense).
        If the answer is not in the excerpts, say you could not find it in the document.
        Be concise, quote concrete details, and do not invent facts.
        """;

    private final ChunkRepository chunkRepository;
    private final ChatRepository chatRepository;
    private final OpenAiClient ai;

    public AskService(ChunkRepository chunkRepository, ChatRepository chatRepository, OpenAiClient ai) {
        this.chunkRepository = chunkRepository;
        this.chatRepository = chatRepository;
        this.ai = ai;
    }

    public List<ChatMessageDto> history(String jobId) {
        return chatRepository.findByJobIdOrderByCreatedAtAsc(jobId).stream()
                .map(m -> new ChatMessageDto(
                        m.getRole(),
                        m.getContent(),
                        m.getSources() == null ? null : m.getSources().stream()
                                .map(s -> new AskResponse.Source(s.chunkIndex(), s.excerpt()))
                                .toList(),
                        m.getCreatedAt() == null ? null : m.getCreatedAt().toString()))
                .toList();
    }

    public AskResponse ask(String jobId, String question) {
        List<DocumentChunk> chunks = chunkRepository.findByJobId(jobId);
        if (chunks.isEmpty()) {
            String msg = "This document isn't indexed for questions yet — re-upload it and try again.";
            saveTurn(jobId, question, msg, List.of());
            return new AskResponse(msg, List.of());
        }

        // Retrieve the most relevant chunks for the current question
        float[] q = ai.embed(question);
        List<Scored> scored = new ArrayList<>();
        for (DocumentChunk c : chunks) {
            scored.add(new Scored(c, cosine(q, c.getEmbedding())));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        List<Scored> top = scored.subList(0, Math.min(TOP_K, scored.size()));

        StringBuilder context = new StringBuilder();
        for (Scored s : top) {
            context.append("[Excerpt ").append(s.chunk().getChunkIndex()).append("]\n")
                    .append(s.chunk().getText()).append("\n\n");
        }

        // Build the message list: system + recent history + new question with fresh context
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));

        List<ChatMessage> history = chatRepository.findByJobIdOrderByCreatedAtAsc(jobId);
        int start = Math.max(0, history.size() - HISTORY_LIMIT);
        for (ChatMessage m : history.subList(start, history.size())) {
            messages.add(Map.of("role", m.getRole(), "content", m.getContent()));
        }
        messages.add(Map.of("role", "user",
                "content", "Relevant excerpts from the document:\n\n" + context + "\nQuestion: " + question));

        String answer = ai.chat(messages);

        List<AskResponse.Source> sources = new ArrayList<>();
        for (Scored s : top) {
            sources.add(new AskResponse.Source(s.chunk().getChunkIndex(), excerpt(s.chunk().getText())));
        }

        saveTurn(jobId, question, answer, sources);
        log.info("Chat answer jobId={} priorTurns={} chunks={}", jobId, history.size(), top.size());
        return new AskResponse(answer, sources);
    }

    private void saveTurn(String jobId, String question, String answer, List<AskResponse.Source> sources) {
        Instant now = Instant.now();
        List<ChatMessage.Source> modelSources = sources.stream()
                .map(s -> new ChatMessage.Source(s.chunkIndex(), s.excerpt()))
                .toList();
        chatRepository.save(new ChatMessage(
                UUID.randomUUID().toString(), jobId, "user", question, null, now));
        chatRepository.save(new ChatMessage(
                UUID.randomUUID().toString(), jobId, "assistant", answer, modelSources, now.plusMillis(1)));
    }

    private static String excerpt(String text) {
        String t = text.strip().replaceAll("\\s+", " ");
        return t.length() > 160 ? t.substring(0, 160) + "…" : t;
    }

    private static double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private record Scored(DocumentChunk chunk, double score) {}
}
