# 0006 - GridFS for original-file storage

## Context
The viewer renders the original uploaded file (PDF/DOCX/MD/TXT), so the raw bytes must be
kept, not just the extracted text. Local disk isn't shared across containers, and adding
an object store (S3/MinIO) was avoided while the project stays free and local.

## Decision
Store the original file in MongoDB GridFS at ingest time, tagged with its job and owner
id in metadata. `query-service` streams it back on demand, ownership-checked.

## Consequences
File storage reuses the database already in the stack — no extra service, and files are
co-located with their analyses and multi-tenant by the same metadata. GridFS is fine at
this scale; the natural cloud upgrade is S3 with the DB holding only the object key.
