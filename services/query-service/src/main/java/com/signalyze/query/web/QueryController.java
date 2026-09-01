package com.signalyze.query.web;

import com.signalyze.query.model.Analysis;
import com.signalyze.query.repository.AnalysisRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/documents")
public class QueryController {

    private final AnalysisRepository analysisRepository;

    public QueryController(AnalysisRepository analysisRepository) {
        this.analysisRepository = analysisRepository;
    }

    @GetMapping
    public List<Analysis> listAll() {
        return analysisRepository.findAll();
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<Analysis> getAnalysis(@PathVariable String jobId) {
        return analysisRepository.findById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}