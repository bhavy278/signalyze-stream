# Architecture

## Overview

Signalyze Stream is an asynchronous, event-driven pipeline. Uploading a document
publishes an event; the heavy AI work (analysis + RAG indexing) happens downstream,
decoupled from the request/response cycle. The browser learns about progress and
receives answers over Server-Sent Events rather than polling.

The system is multi-tenant: an owner id is attached at upload and flows through the
Kafka pipeline, and every read is filtered by the authenticated user.

## Services

| Service | Port | Role |
|---------|------|------|
| auth-service | 8084 | Issues JWTs (register / login / me), users stored with BCrypt |
| ingest-service | 8081 | Auth'd uploads → store original in GridFS, extract text (PDFBox), rate-limit per user, publish `document.uploaded` |
| processing-service | internal | Kafka consumer → OpenAI analysis + chunk/embed → MongoDB + Redis → publish `document.processed` / `.failed` |
| query-service | 8083 | Cache-first reads, search/pagination, delete, file serving, streaming `/ask` (RAG), and SSE live status (also a Kafka consumer) |
| web | 3000 | Next.js UI + API-route proxy (attaches JWT, relays SSE) |

## Flow

1. Client authenticates against **auth-service** and receives a JWT (kept in an httpOnly cookie).
2. Client uploads to **ingest-service**, which stores the original file in **GridFS**,
   extracts text, and publishes `document.uploaded` (carrying the owner id).
3. **processing-service** consumes the event, calls **OpenAI** for the structured
   analysis, chunks and embeds the text for RAG, writes the result to **MongoDB**,
   sets status in **Redis**, and publishes `document.processed` (or `document.failed`).
4. **query-service** serves reads cache-first from Redis, falling back to MongoDB. It
   also consumes `document.processed` / `document.failed` and pushes the terminal
   status to the browser over **SSE** — the UI never polls.
5. Asking a question embeds the query, ranks the document's chunks by cosine
   similarity, and streams a grounded `gpt-4o-mini` answer back token-by-token over SSE.

## Kafka topics

- `document.uploaded`  — ingest → processing
- `document.processed` — processing → query (live status) and archive
- `document.failed`    — dead-letter for messages that fail processing after retries

## Data stores

- **MongoDB (Atlas):** the source of truth — variable-shape analysis output, RAG
  chunks + embeddings, chat history (`chat_messages`), users, and original files (GridFS).
- **Redis:** job status (backs the SSE live-status stream), cached read results
  (cache-first reads), and per-user upload rate limiting.

## Streaming

Both live status and streamed answers are Server-Sent Events from `query-service`,
proxied through Next.js route handlers that re-emit the upstream stream to the browser.
See ADR 0004 for why SSE over WebSockets or polling.

## Retrieval (RAG)

Retrieval is scoped to a single document's handful of chunk vectors, so cosine
similarity is computed in-app rather than in a vector database. See ADR 0003.
