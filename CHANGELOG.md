# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]
### Added
- Initial repository scaffold, docs structure, and conventions.
- Local Kafka + Kafka UI via Docker Compose.
- Async core: ingest-service publishes DocumentUploaded; processing-service consumes it and publishes DocumentProcessed.
- Dead-letter error handling: messages that fail processing after 3 attempts are routed to the document.failed topic.
- MongoDB persistence: processing-service saves each analysis to the `analyses` collection (MongoDB Atlas).
- query-service: `GET /documents` and `GET /documents/{jobId}` to retrieve analyses from MongoDB.
- Redis-backed job status (PROCESSING → DONE) with a `GET /documents/{jobId}/status` endpoint.
- Cache-first reads in query-service: analyses served from Redis on hit, MongoDB on miss.
- Redis-based rate limiting on the upload endpoint (5 uploads/min per IP).
- Dockerized all three services (multi-stage builds); the full stack (Kafka, Redis, services) runs via `docker compose up`.
- Real AI analysis: processing-service calls OpenAI (gpt-4o-mini) to generate document summaries, replacing the mock; document text now flows through the pipeline.
- Next.js frontend (web/) with a vintage-newspaper design system: blackletter masthead, Abril Fatface headlines, Oswald labels, Old Standard TT body, aged-paper grain texture.
- Functional frontend: dropzone upload → status polling → analysis, wired to the backend through Next.js API routes (typed client + route handlers), with loading/empty/error states.
- Structured analysis: AI now returns document type, parties, key terms, and risk-flagged clauses (severity-rated), rendered as a report in the UI.
- PDF text extraction on ingest via Apache PDFBox
- Document deletion (removes the MongoDB record and its Redis cache/status keys)
- Archive search by filename or document type (MongoDB regex query on an embedded field)
- Ask the document: RAG Q&A — chunking, OpenAI embeddings, in-app cosine retrieval, and answers grounded in cited excerpts