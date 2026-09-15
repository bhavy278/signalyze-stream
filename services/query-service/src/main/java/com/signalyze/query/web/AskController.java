package com.signalyze.query.web;

import com.signalyze.query.repository.AnalysisRepository;
import com.signalyze.query.security.CurrentUser;
import com.signalyze.query.service.AskService;
import com.signalyze.query.web.dto.AskRequest;
import com.signalyze.query.web.dto.AskResponse;
import com.signalyze.query.web.dto.ChatMessageDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/documents")
public class AskController {

    private final AskService askService;
    private final AnalysisRepository analysisRepository;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public AskController(AskService askService, AnalysisRepository analysisRepository) {
        this.askService = askService;
        this.analysisRepository = analysisRepository;
    }

    private boolean owns(String jobId) {
        String userId = CurrentUser.id();
        return userId != null && analysisRepository.findById(jobId)
                .map(a -> userId.equals(a.getUserId()))
                .orElse(false);
    }

    @GetMapping("/{jobId}/chat")
    public ResponseEntity<List<ChatMessageDto>> history(@PathVariable String jobId) {
        if (!owns(jobId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(askService.history(jobId));
    }

    @PostMapping("/{jobId}/ask")
    public ResponseEntity<AskResponse> ask(@PathVariable String jobId,
                                           @RequestBody AskRequest request) {
        if (!owns(jobId)) {
            return ResponseEntity.notFound().build();
        }
        if (request == null || request.question() == null || request.question().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(askService.ask(jobId, request.question().trim()));
    }

    @PostMapping("/{jobId}/ask/stream")
    public SseEmitter askStream(@PathVariable String jobId, @RequestBody AskRequest request) {
        SseEmitter emitter = new SseEmitter(180_000L);
        if (!owns(jobId) || request == null || request.question() == null || request.question().isBlank()) {
            emitter.completeWithError(new IllegalStateException("Invalid request or not found"));
            return emitter;
        }
        String question = request.question().trim();
        executor.execute(() -> {
            try {
                askService.streamAnswer(jobId, question, emitter);
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }
}
