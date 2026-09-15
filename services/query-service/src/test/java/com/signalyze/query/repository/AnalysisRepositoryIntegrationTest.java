package com.signalyze.query.repository;

import com.signalyze.query.model.Analysis;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test: runs the AnalysisRepository against a real MongoDB started
 * in Docker by Testcontainers. Verifies multi-tenant scoping, pagination, and
 * the case-insensitive regex search — the parts a mock can't prove.
 */
@DataMongoTest
@Testcontainers
class AnalysisRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static MongoDBContainer mongo = new MongoDBContainer(DockerImageName.parse("mongo:7"));

    @Autowired
    AnalysisRepository repository;

    @BeforeEach
    void clean() {
        repository.deleteAll();
    }

    private Analysis analysis(String jobId, String userId, String filename) {
        Analysis a = new Analysis();
        a.setJobId(jobId);
        a.setUserId(userId);
        a.setFilename(filename);
        a.setStatus("DONE");
        a.setCreatedAt(Instant.now());
        return a;
    }

    @Test
    void findByUserIdReturnsOnlyThatUsersDocuments() {
        repository.save(analysis("j1", "alice", "lease.pdf"));
        repository.save(analysis("j2", "alice", "nda.pdf"));
        repository.save(analysis("j3", "bob", "invoice.pdf"));

        List<Analysis> alices =
                repository.findByUserId("alice", PageRequest.of(0, 10)).getContent();

        assertThat(alices).extracting(Analysis::getJobId).containsExactlyInAnyOrder("j1", "j2");
        assertThat(alices).allSatisfy(a -> assertThat(a.getUserId()).isEqualTo("alice"));
    }

    @Test
    void findByUserIdPaginates() {
        for (int i = 0; i < 5; i++) {
            repository.save(analysis("j" + i, "alice", "doc" + i + ".pdf"));
        }
        repository.save(analysis("other", "bob", "bob.pdf"));

        Page<Analysis> page = repository.findByUserId("alice", PageRequest.of(0, 2));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(5); // bob's doc excluded
        assertThat(page.getTotalPages()).isEqualTo(3);
    }

    @Test
    void searchIsCaseInsensitiveAndScopedToTheUser() {
        repository.save(analysis("j1", "alice", "Master-Lease-Agreement.pdf"));
        repository.save(analysis("j2", "alice", "invoice.pdf"));
        repository.save(analysis("j3", "bob", "another-lease.pdf")); // bob also has "lease"

        List<Analysis> hits = repository.search("lease", "alice", PageRequest.of(0, 10));

        // matches alice's file case-insensitively, and never leaks bob's
        assertThat(hits).extracting(Analysis::getJobId).containsExactly("j1");
        assertThat(repository.countSearch("lease", "alice")).isEqualTo(1);
    }
}
