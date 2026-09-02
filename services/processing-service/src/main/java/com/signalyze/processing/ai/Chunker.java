package com.signalyze.processing.ai;

import java.util.ArrayList;
import java.util.List;

/** Splits document text into overlapping windows for embedding. */
public final class Chunker {

    private static final int CHUNK_SIZE = 800;
    private static final int OVERLAP = 150;
    private static final int MAX_CHUNKS = 40;

    private Chunker() {
    }

    public static List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank())
            return chunks;
        String clean = text.strip();
        int start = 0;
        while (start < clean.length() && chunks.size() < MAX_CHUNKS) {
            int end = Math.min(start + CHUNK_SIZE, clean.length());
            chunks.add(clean.substring(start, end).strip());
            if (end == clean.length())
                break;
            start = end - OVERLAP;
        }
        return chunks;
    }
}