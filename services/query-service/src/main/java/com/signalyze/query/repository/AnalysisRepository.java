package com.signalyze.query.repository;

import com.signalyze.query.model.Analysis;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface AnalysisRepository extends MongoRepository<Analysis, String> {
    @Query("{ $or: [ " +
            "{ 'filename': { $regex: ?0, $options: 'i' } }, " +
            "{ 'result.documentType': { $regex: ?0, $options: 'i' } } " +
            "] }")
    List<Analysis> search(String q);
}