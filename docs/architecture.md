# Architecture

## Overview
Asynchronous, event-driven pipeline. Uploading a document publishes an event;
heavy AI processing happens downstream, decoupled from the request.

## Flow
Client to ingest-service to (Kafka: document.uploaded) to processing-service
to AI/RAG to MongoDB (source of truth) plus Redis (status/cache)
to query-service (cache-first) to Client.

## Kafka topics
- document.uploaded  (ingest to processing)
- document.processed (processing to query/notify)
- document.failed    (dead-letter for failed processing)

## Data stores
- MongoDB: variable-shape analysis output
- Redis: job status, cached results, rate-limiting
