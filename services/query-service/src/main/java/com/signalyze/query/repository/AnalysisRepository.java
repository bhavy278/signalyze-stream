package com.signalyze.query.repository;

import com.signalyze.query.model.Analysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface AnalysisRepository extends MongoRepository<Analysis, String> {

    Page<Analysis> findByUserId(String userId, Pageable pageable);

    @Query("{ 'userId': ?1, $or: [ "
            + "{ 'filename': { $regex: ?0, $options: 'i' } }, "
            + "{ 'result.documentType': { $regex: ?0, $options: 'i' } } "
            + "] }")
    List<Analysis> search(String q, String userId, Pageable pageable);

    @Query(value = "{ 'userId': ?1, $or: [ "
            + "{ 'filename': { $regex: ?0, $options: 'i' } }, "
            + "{ 'result.documentType': { $regex: ?0, $options: 'i' } } "
            + "] }", count = true)
    long countSearch(String q, String userId);
}
