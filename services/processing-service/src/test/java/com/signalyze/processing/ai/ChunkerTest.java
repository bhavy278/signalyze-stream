package com.signalyze.processing.ai;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChunkerTest {

    private static final int CHUNK_SIZE = 800;

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
    void keepsSentencesWhole() {
        // Build a document of many distinct, whole sentences.
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 200; i++) {
            sb.append("Clause number ").append(i).append(" states an obligation. ");
        }
        List<String> chunks = Chunker.chunk(sb.toString());

        assertThat(chunks.size()).isGreaterThan(1);
        // a representative sentence survives intact inside some chunk (not cut)
        String sentence = "Clause number 42 states an obligation.";
        assertThat(chunks).anySatisfy(c -> assertThat(c).contains(sentence));
    }

    @Test
    void hardSplitsAVeryLongUnpunctuatedRun() {
        // No sentence boundaries → falls back to hard windows, none absurdly large.
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 2500; i++) sb.append('x');
        List<String> chunks = Chunker.chunk(sb.toString());

        assertThat(chunks.size()).isGreaterThan(1);
        assertThat(chunks).allSatisfy(c -> assertThat(c.length()).isLessThanOrEqualTo(CHUNK_SIZE));
    }

    @Test
    void capsAtFortyChunks() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5000; i++) {
            sb.append("Sentence ").append(i).append(" here. ");
        }
        assertThat(Chunker.chunk(sb.toString())).hasSizeLessThanOrEqualTo(40);
    }
}
