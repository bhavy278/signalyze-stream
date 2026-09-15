package com.signalyze.processing.ai;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChunkerTest {

    private static final int CHUNK_SIZE = 800;
    private static final int OVERLAP = 150;

    // Deterministic filler with no whitespace, so strip() never alters boundaries.
    private static String filler(int len) {
        StringBuilder sb = new StringBuilder(len);
        String cycle = "abcdefghij";
        for (int i = 0; i < len; i++) sb.append(cycle.charAt(i % cycle.length()));
        return sb.toString();
    }

    @Test
    void returnsEmptyForNullOrBlank() {
        assertThat(Chunker.chunk(null)).isEmpty();
        assertThat(Chunker.chunk("   ")).isEmpty();
    }

    @Test
    void shortTextBecomesASingleChunk() {
        String text = "A short lease clause.";
        assertThat(Chunker.chunk(text)).containsExactly(text);
    }

    @Test
    void longTextIsSplitIntoOverlappingWindows() {
        List<String> chunks = Chunker.chunk(filler(2000));

        assertThat(chunks.size()).isGreaterThan(1);
        // no chunk exceeds the window size
        assertThat(chunks).allSatisfy(c -> assertThat(c.length()).isLessThanOrEqualTo(CHUNK_SIZE));
        // consecutive chunks overlap by OVERLAP chars: tail of one == head of the next
        String firstTail = chunks.get(0).substring(chunks.get(0).length() - OVERLAP);
        String secondHead = chunks.get(1).substring(0, OVERLAP);
        assertThat(secondHead).isEqualTo(firstTail);
    }

    @Test
    void coversTheEntireDocument() {
        String text = filler(2000);
        List<String> chunks = Chunker.chunk(text);

        String firstChunk = chunks.get(0);
        String lastChunk = chunks.get(chunks.size() - 1);
        assertThat(text).startsWith(firstChunk.substring(0, 50));
        assertThat(text).endsWith(lastChunk.substring(lastChunk.length() - 50));
    }

    @Test
    void capsAtFortyChunks() {
        // input large enough to produce far more than 40 windows if uncapped
        assertThat(Chunker.chunk(filler(100_000))).hasSizeLessThanOrEqualTo(40);
    }
}
