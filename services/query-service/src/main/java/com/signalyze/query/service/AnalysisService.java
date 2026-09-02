package com.signalyze.query.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.signalyze.query.model.Analysis;
import com.signalyze.query.repository.AnalysisRepository;
import com.signalyze.query.repository.ChatRepository;
import com.signalyze.query.repository.ChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);
    private static final String CACHE_PREFIX = "cache:doc:";

    private final AnalysisRepository repository;
    private final ChunkRepository chunkRepository;
    private final ChatRepository chatRepository;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public AnalysisService(AnalysisRepository repository,
                           ChunkRepository chunkRepository,
                           ChatRepository chatRepository,
                           StringRedisTemplate redis,
                           ObjectMapper objectMapper) {
        this.repository = repository;
        this.chunkRepository = chunkRepository;
        this.chatRepository = chatRepository;
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public Optional<Analysis> getById(String jobId) {
        String key = CACHE_PREFIX + jobId;

        String cached = redis.opsForValue().get(key);
        if (cached != null) {
            try {
                log.info("Cache HIT jobId={}", jobId);
                return Optional.of(objectMapper.readValue(cached, Analysis.class));
            } catch (Exception e) {
                log.warn("Failed to read cache for jobId={}, falling back to MongoDB", jobId);
            }
        }

        Optional<Analysis> found = repository.findById(jobId);
        found.ifPresent(analysis -> {
            try {
                redis.opsForValue().set(key, objectMapper.writeValueAsString(analysis), Duration.ofHours(1));
                log.info("Cache MISS jobId={} — loaded from MongoDB and cached", jobId);
            } catch (Exception e) {
                log.warn("Failed to cache jobId={}", jobId);
            }
        });
        return found;
    }

    public boolean delete(String jobId) {
        boolean existed = repository.existsById(jobId);
        repository.deleteById(jobId);
        chunkRepository.deleteByJobId(jobId);
        chatRepository.deleteByJobId(jobId);
        redis.delete(CACHE_PREFIX + jobId);
        redis.delete("status:" + jobId);
        log.info("Deleted jobId={} (existed={}) + chunks + chat", jobId, existed);
        return existed;
    }
}
