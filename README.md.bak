# Signalyze Stream
> Event-driven document-intelligence platform — upload a contract, get an
> AI-powered analysis back, asynchronously.

## What it does
Upload a document; the system streams it through an asynchronous AI analysis
pipeline (Kafka to Spring Boot to MongoDB/Redis) and returns a structured
summary of clauses, risks, and key terms.

## Tech stack
Java 21, Spring Boot 3, Apache Kafka, MongoDB, Redis, Next.js,
Terraform, Jenkins, AWS (ECS, S3), LangChain (OpenAI / Anthropic).

## Architecture
See docs/architecture.md for the async flow, the three Kafka topics, and why
each datastore was chosen.

## Run it locally
Clone, copy .env.example to .env and add your keys, then run docker compose up.
The web app runs at http://localhost:3000

## Services
| Service | Port | Responsibility |
|---------|------|----------------|
| ingest-service | 8081 | Upload and publish event |
| processing-service | 8082 | Consume, run AI, persist |
| query-service | 8083 | Cache-first reads |

## Roadmap
Built in phases: async core, data layer, UI, cloud (Terraform), CI/CD (Jenkins).

## License
MIT — see LICENSE.
