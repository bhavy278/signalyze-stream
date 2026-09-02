package com.signalyze.query.web;

import com.signalyze.query.model.Analysis;
import com.signalyze.query.repository.AnalysisRepository;
import com.signalyze.query.service.AnalysisService;
import com.signalyze.query.web.dto.DocumentPage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public DocumentPage listAll(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {

        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 50);
        Pageable pageable = PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Analysis> items;
        long total;
        if (q == null || q.isBlank()) {
            Page<Analysis> result = analysisRepository.findAll(pageable);
            items = result.getContent();
            total = result.getTotalElements();
        } else {
            String term = q.trim();
            items = analysisRepository.search(term, pageable);
            total = analysisRepository.countSearch(term);
        }

        int totalPages = (int) Math.ceil((double) total / s);
        return new DocumentPage(items, p, s, total, totalPages);
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> delete(@PathVariable String jobId) {
        boolean existed = analysisService.delete(jobId);
        return existed
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
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
