# 0003 - In-app cosine similarity instead of a vector database

## Context
RAG needs to retrieve the most relevant chunks of a document for a question. A vector
database (Pinecone, Atlas Vector Search, pgvector) is the usual answer, but it adds a
dependency and operational surface.

## Decision
Store each document's chunk embeddings in MongoDB alongside its analysis, and at query
time score the question embedding against only that document's chunks with cosine
similarity computed in the service.

## Consequences
Retrieval is always scoped to a single document — a few dozen to a few hundred vectors —
so a brute-force in-app scan is fast and needs no extra infrastructure. This does not
scale to cross-document / corpus-wide search; the upgrade path there is MongoDB Atlas
Vector Search, which keeps the data where it already lives.
