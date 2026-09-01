  package com.signalyze.query.repository;

  import com.signalyze.query.model.Analysis;
  import org.springframework.data.mongodb.repository.MongoRepository;

  public interface AnalysisRepository extends MongoRepository<Analysis, String> {
  }