package com.signalyze.ingest.web;

import com.signalyze.ingest.outbox.OutboxRepository;
import com.signalyze.ingest.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer slice for the upload endpoint's validation guards, which run before any auth,
 * rate-limiting, or outbox write. Security filters are disabled and collaborators mocked, so
 * these assert the controller rejects bad input with 400 without touching Kafka/Mongo/Redis.
 */
@WebMvcTest(DocumentController.class)
@AutoConfigureMockMvc(addFilters = false)
class DocumentControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private OutboxRepository outbox;
    @MockBean
    private StringRedisTemplate redis;
    @MockBean
    private FileStorageService fileStorage;

    @Test
    void rejectsUnsupportedFileType() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("file", "malware.exe", "application/octet-stream", "x".getBytes());
        mvc.perform(multipart("/documents").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsEmptyFile() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);
        mvc.perform(multipart("/documents").file(file))
                .andExpect(status().isBadRequest());
    }
}
