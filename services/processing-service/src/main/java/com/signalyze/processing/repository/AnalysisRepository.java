package com.signalyze.processing.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.signalyze.processing.model.Analysis;

public interface AnalysisRepository extends MongoRepository<Analysis, String> {

}
