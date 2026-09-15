# 0002 - Asynchronous event-driven pipeline over Kafka

## Context
Document analysis is slow and bursty (multiple OpenAI calls per document). Doing it
inside the upload request would tie up connections, couple upload latency to AI
latency, and make retries and back-pressure hard.

## Decision
Decouple upload from processing with Apache Kafka. Upload only stores the file,
extracts text, and publishes `document.uploaded`; a separate consumer does the AI work
and publishes `document.processed` / `document.failed`. `document.failed` acts as a
dead-letter topic for messages that exhaust retries.

## Consequences
Uploads return immediately; processing scales and retries independently; failures are
isolated on a dead-letter topic. The cost is eventual consistency — the UI must learn
when processing finishes, which is handled with a live SSE status stream (see ADR 0004).
