package com.signalyze.query.service;

import com.signalyze.query.ai.OpenAiClient;
import com.signalyze.query.model.DocumentChunk;
import com.signalyze.query.repository.ChunkRepository;
import com.signalyze.query.web.dto.AskResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class AskService {

    private static final Logger log = LoggerFactory.getLogger(AskService.class);
    private static final int TOP_K = 4;

    private static final String SYSTEM_PROMPT = """
            You answer questions about a specific document using ONLY the provided excerpts.
            If the answer is not contained in the excerpts, say you could not find it in the document.
            Be concise, quote concrete details, and do not invent facts.
            """;

    private final ChunkRepository chunkRepository;
    private final OpenAiClient ai;

    public AskService(ChunkRepository chunkRepository, OpenAiClient ai) {
        this.chunkRepository = chunkRepository;
        this.ai = ai;
    }

    public AskResponse ask(String jobId, String question) {
        List<DocumentChunk> chunks = chunkRepository.findByJobId(jobId);
        if (chunks.isEmpty()) {
            return new AskResponse(
                    "This document isn't indexed for questions yet — re-upload it and try again.",
                    List.of());
        }

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

        String user = "Document excerpts:\n\n" + context + "Question: " + question;
        String answer = ai.chat(SYSTEM_PROMPT, user);

        List<AskResponse.Source> sources = new ArrayList<>();
        for (Scored s : top) {
            sources.add(new AskResponse.Source(s.chunk().getChunkIndex(), excerpt(s.chunk().getText())));
        }

        log.info("Answered jobId={} using {} of {} chunks", jobId, top.size(), chunks.size());
        return new AskResponse(answer, sources);
    }

    private static String excerpt(String text) {
        String t = text.strip().replaceAll("\\s+", " ");
        return t.length() > 160 ? t.substring(0, 160) + "…" : t;
    }

    private static double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length)
            return 0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0)
            return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private record Scored(DocumentChunk chunk, double score) {
    }
}