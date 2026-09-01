package com.signalyze.query.web;

import com.signalyze.query.model.Analysis;
import com.signalyze.query.repository.AnalysisRepository;
import com.signalyze.query.service.AnalysisService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/documents")
public class QueryController {

    private final AnalysisRepository analysisRepository;
    private final AnalysisService analysisService;
    private final StringRedisTemplate redis;

    public QueryController(AnalysisRepository analysisRepository,
                           AnalysisService analysisService,
                           StringRedisTemplate redis) {
        this.analysisRepository = analysisRepository;
        this.analysisService = analysisService;
        this.redis = redis;
    }

    @GetMapping
    public List<Analysis> listAll() {
        return analysisRepository.findAll();
    }

    @GetMapping("/{jobId}/status")
    public ResponseEntity<Map<String, String>> status(@PathVariable String jobId) {
        String status = redis.opsForValue().get("status:" + jobId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("jobId", jobId, "status", status));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<Analysis> getAnalysis(@PathVariable String jobId) {
        return analysisService.getById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}