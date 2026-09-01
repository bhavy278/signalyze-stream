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