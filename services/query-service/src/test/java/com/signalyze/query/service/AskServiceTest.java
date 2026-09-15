package com.signalyze.query.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.signalyze.query.ai.OpenAiClient;
import com.signalyze.query.model.DocumentChunk;
import com.signalyze.query.repository.ChatRepository;
import com.signalyze.query.repository.ChunkRepository;
import com.signalyze.query.web.dto.AskResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AskServiceTest {

    private static final String JOB = "job-1";

    @Mock private ChunkRepository chunkRepository;
    @Mock private ChatRepository chatRepository;
    @Mock private OpenAiClient ai;

    private AskService service;

    @BeforeEach
    void setUp() {
        service = new AskService(chunkRepository, chatRepository, ai, new ObjectMapper());
    }

    private static DocumentChunk chunk(int idx, String text, float... embedding) {
        DocumentChunk c = new DocumentChunk();
        c.setChunkIndex(idx);
        c.setText(text);
        c.setEmbedding(embedding);
        return c;
    }

    @Test
    void retrievesTheMostSimilarChunkAndGroundsThePromptOnIt() {
        List<DocumentChunk> chunks = List.of(
                chunk(0, "The base rent is $1200 per month.", 1f, 0f, 0f),
                chunk(1, "The lease term is 12 months.", 0f, 1f, 0f),
                chunk(2, "Pets are not allowed on the premises.", 0f, 0f, 1f));

        when(chunkRepository.findByJobId(JOB)).thenReturn(chunks);
        when(chatRepository.findByJobIdOrderByCreatedAtAsc(JOB)).thenReturn(List.of());
        when(ai.embed("How much is the rent?")).thenReturn(new float[] {0.9f, 0.1f, 0f});
        when(ai.chat(anyList())).thenReturn("The base rent is $1200 per month.");

        AskResponse resp = service.ask(JOB, "How much is the rent?");

        // answer is passed straight through from the model
        assertThat(resp.answer()).isEqualTo("The base rent is $1200 per month.");
        // the closest chunk (index 0) is the top-ranked source
        assertThat(resp.sources().get(0).chunkIndex()).isEqualTo(0);

        // the prompt sent to the model is grounded on the retrieved excerpt
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Map<String, String>>> captor = ArgumentCaptor.forClass(List.class);
        verify(ai).chat(captor.capture());
        List<Map<String, String>> messages = captor.getValue();
        assertThat(messages.get(0).get("role")).isEqualTo("system");
        String userMessage = messages.get(messages.size() - 1).get("content");
        assertThat(userMessage).contains("The base rent is $1200 per month.");
    }

    @Test
    void usesAtMostTopKChunks() {
        List<DocumentChunk> chunks = List.of(
                chunk(0, "alpha", 1f, 0f, 0f),
                chunk(1, "bravo", 0.9f, 0.1f, 0f),
                chunk(2, "charlie", 0.8f, 0.2f, 0f),
                chunk(3, "delta", 0.7f, 0.3f, 0f),
                chunk(4, "echo", 0f, 1f, 0f),
                chunk(5, "foxtrot", 0f, 0f, 1f));

        when(chunkRepository.findByJobId(JOB)).thenReturn(chunks);
        when(chatRepository.findByJobIdOrderByCreatedAtAsc(JOB)).thenReturn(List.of());
        when(ai.embed(any())).thenReturn(new float[] {1f, 0f, 0f});
        when(ai.chat(anyList())).thenReturn("answer");

        AskResponse resp = service.ask(JOB, "anything");

        // TOP_K is 4 — never more, even with six candidate chunks
        assertThat(resp.sources()).hasSize(4);
        assertThat(resp.sources().get(0).chunkIndex()).isEqualTo(0);
    }

    @Test
    void savesBothTurnsOfTheConversation() {
        when(chunkRepository.findByJobId(JOB)).thenReturn(
                List.of(chunk(0, "some text", 1f, 0f, 0f)));
        when(chatRepository.findByJobIdOrderByCreatedAtAsc(JOB)).thenReturn(List.of());
        when(ai.embed(any())).thenReturn(new float[] {1f, 0f, 0f});
        when(ai.chat(anyList())).thenReturn("answer");

        service.ask(JOB, "a question");

        // one save for the user turn, one for the assistant turn
        verify(chatRepository, times(2)).save(any());
    }

    @Test
    void shortCircuitsWhenTheDocumentIsNotIndexed() {
        when(chunkRepository.findByJobId(JOB)).thenReturn(List.of());

        AskResponse resp = service.ask(JOB, "How much is the rent?");

        assertThat(resp.answer()).contains("isn't indexed");
        assertThat(resp.sources()).isEmpty();
        // no embedding or completion calls are made for an unindexed document
        verify(ai, never()).embed(any());
        verify(ai, never()).chat(anyList());
    }
}
