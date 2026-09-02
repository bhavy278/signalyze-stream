package com.signalyze.processing.repository;

import com.signalyze.processing.model.DocumentChunk;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChunkRepository extends MongoRepository<DocumentChunk, String> {
    List<DocumentChunk> findByJobId(String jobId);

    void deleteByJobId(String jobId);
}