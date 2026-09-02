package com.signalyze.query.web;

import com.signalyze.query.service.AskService;
import com.signalyze.query.web.dto.AskRequest;
import com.signalyze.query.web.dto.AskResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/documents")
public class AskController {

    private final AskService askService;

    public AskController(AskService askService) {
        this.askService = askService;
    }

    @PostMapping("/{jobId}/ask")
    public ResponseEntity<AskResponse> ask(@PathVariable String jobId,
            @RequestBody AskRequest request) {
        if (request == null || request.question() == null || request.question().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(askService.ask(jobId, request.question().trim()));
    }
}