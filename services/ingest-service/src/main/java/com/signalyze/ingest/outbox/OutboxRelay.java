package com.signalyze.ingest.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Polls the outbox and publishes PENDING events to Kafka, marking each SENT once the broker
 * acknowledges. A failed publish leaves the row PENDING (attempts incremented) to be retried
 * on the next tick, so an event is delivered at-least-once even across broker outages. The
 * whole tick is guarded, so a transient datastore blip is logged and retried rather than
 * throwing out of the scheduler.
 *
 * Single-relay assumption: with multiple ingest instances a claim step (findAndModify to a
 * SENDING state) would be needed to avoid double-publish; the processing side is the place to
 * dedupe if that ever matters.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private static final String PENDING = "PENDING";
    private static final String SENT = "SENT";
    private static final int BATCH = 50;

    private final OutboxRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public OutboxRelay(OutboxRepository repository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelayString = "${outbox.relay.poll-interval-ms:2000}",
            initialDelayString = "${outbox.relay.initial-delay-ms:3000}")
    public void relay() {
        List<OutboxEvent> batch;
        try {
            batch = repository.findByStatusOrderByCreatedAtAsc(PENDING, PageRequest.of(0, BATCH));
        } catch (Exception e) {
            // Datastore momentarily unavailable — skip this tick and try again on the next one.
            log.warn("Outbox poll failed (will retry next tick): {}", e.toString());
            return;
        }
        if (batch.isEmpty()) {
            return;
        }
        int sent = 0;
        for (OutboxEvent e : batch) {
            try {
                kafkaTemplate.send(e.getTopic(), e.getMessageKey(), e.getPayload()).get(10, TimeUnit.SECONDS);
                e.setStatus(SENT);
                e.setSentAt(Instant.now());
                repository.save(e);
                sent++;
            } catch (Exception ex) {
                e.setAttempts(e.getAttempts() + 1);
                try {
                    repository.save(e);
                } catch (Exception ignored) {
                    // best-effort attempt bookkeeping
                }
                log.warn("Outbox publish failed id={} attempts={}: {}", e.getId(), e.getAttempts(), ex.toString());
            }
        }
        if (sent > 0) {
            log.info("Outbox relay published {}/{} pending event(s)", sent, batch.size());
        }
    }
}
