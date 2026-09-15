package com.signalyze.query.web;

import com.signalyze.query.service.StatusEventService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/documents")
public class StatusController {

    private final StatusEventService statusEvents;

    public StatusController(StatusEventService statusEvents) {
        this.statusEvents = statusEvents;
    }

    @GetMapping("/{jobId}/status/stream")
    public SseEmitter stream(@PathVariable String jobId) {
        return statusEvents.subscribe(jobId);
    }
}
