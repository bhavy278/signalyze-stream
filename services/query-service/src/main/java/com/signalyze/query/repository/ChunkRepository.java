package com.signalyze.query.repository;

import com.signalyze.query.model.DocumentChunk;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChunkRepository extends MongoRepository<DocumentChunk, String> {
    List<DocumentChunk> findByJobId(String jobId);
}