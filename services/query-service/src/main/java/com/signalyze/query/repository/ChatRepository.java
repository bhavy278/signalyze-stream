package com.signalyze.query.repository;

import com.signalyze.query.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByJobIdOrderByCreatedAtAsc(String jobId);
    void deleteByJobId(String jobId);
}
