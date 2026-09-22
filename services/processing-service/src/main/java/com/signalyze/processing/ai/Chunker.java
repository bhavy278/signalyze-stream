package com.signalyze.processing.ai;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits document text into overlapping windows for embedding, respecting
 * sentence/paragraph boundaries so a chunk never cuts a sentence in half.
 * Very long sentences (no punctuation) are hard-split as a fallback.
 */
public final class Chunker {

    private static final int CHUNK_SIZE = 800;
    private static final int MAX_CHUNKS = 40;

    private Chunker() {
    }

    public static List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return chunks;
        }

        String clean = text.strip();
        // Break on sentence enders followed by whitespace, or on blank lines.
        String[] sentences = clean.split("(?<=[.!?])\\s+|\\n{2,}");

        StringBuilder current = new StringBuilder();
        String prevSentence = "";

        for (String raw : sentences) {
            if (chunks.size() >= MAX_CHUNKS) {
                return chunks;
            }
            String sentence = raw.strip();
            if (sentence.isEmpty()) {
                continue;
            }

            // A single sentence longer than the window: flush, then hard-split it.
            if (sentence.length() > CHUNK_SIZE) {
                flush(chunks, current);
                current.setLength(0);
                for (int i = 0; i < sentence.length() && chunks.size() < MAX_CHUNKS; i += CHUNK_SIZE) {
                    chunks.add(sentence.substring(i, Math.min(i + CHUNK_SIZE, sentence.length())));
                }
                prevSentence = "";
                continue;
            }

            // Adding this sentence would overflow the window → start a new chunk,
            // seeded with the previous sentence so chunks overlap for continuity.
            if (current.length() > 0 && current.length() + sentence.length() + 1 > CHUNK_SIZE) {
                flush(chunks, current);
                if (chunks.size() >= MAX_CHUNKS) {
                    return chunks;
                }
                current.setLength(0);
                current.append(prevSentence);
            }

            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(sentence);
            prevSentence = sentence;
        }

        flush(chunks, current);
        return chunks;
    }

    private static void flush(List<String> chunks, StringBuilder current) {
        String c = current.toString().strip();
        if (!c.isEmpty() && chunks.size() < MAX_CHUNKS) {
            chunks.add(c);
        }
    }
}
