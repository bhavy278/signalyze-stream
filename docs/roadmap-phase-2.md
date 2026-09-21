# Phase 2 — Polish, Hardening & Depth

The core product is feature-complete, tested, CI'd, and documented. Phase 2 makes it
**smooth, robust, and interview-grade**, and adds a few senior-level signals. Grouped
into shippable sub-phases, ordered by ROI and dependencies. Each sub-phase = one or a
few Conventional Commits. AWS/Terraform stays LAST (separate, costs money).

Legend: 🟢 quick win · 🟡 medium · 🔴 larger effort · 🔒 real bug/security

---

## 2A — Frontend smoothness + the security fix  (do first: visible + closes a real bug)
- [ ] 🔒 **Sanitize rendered HTML** — DOCX/Markdown preview injects Mammoth/Marked output via `innerHTML` (stored XSS). Add DOMPurify before insert. *(components/DocumentPreview.tsx)*
- [ ] 🟢 **Lazy-render PDF pages** — render page canvases on scroll (IntersectionObserver) instead of all upfront, so large PDFs open instantly. *(DocumentPreview.tsx)*
- [ ] 🟢 **Toast notifications** — a small toast system for upload done / deleted / errors, replacing silent actions and raw red text. *(new components/Toast + provider)*
- [ ] 🟢 **Friendlier errors + Retry** — replace "is the backend running?" dead-ends with a Retry action; add a React error boundary so nothing shows a blank screen.
- [ ] 🟢 **Prefetch on hover** — prefetch a document's analysis when its row is hovered in Your Documents. *(app/documents/page.tsx, lib/api.ts)*

## 2B — Backend robustness & data  (unglamorous, interview-gold)
- [ ] 🟡 **Global exception handling** — `@RestControllerAdvice` in each service so every error returns a consistent JSON shape.
- [ ] 🟢 **Input validation** — file type/size and request validation → clean 400s with clear messages. *(ingest DocumentController)*
- [ ] 🟢 **Health checks + start ordering** — Actuator health endpoints + `docker-compose` healthchecks + `depends_on: condition: service_healthy`.
- [ ] 🟢 **Re-add Redis persistence-off** — restore `command: redis-server --save "" --appendonly no` in docker-compose (dropped earlier).
- [ ] 🟢 **MongoDB indexes** — `userId`, `createdAt`, and a text/compound index for search (`@Indexed` / `@CompoundIndex`).

## 2C — AI quality & cost
- [ ] 🟡 **Smarter chunking** — sentence/paragraph-aware splitting instead of fixed 800-char windows. *(processing Chunker)*
- [ ] 🟡 **Lightweight rerank** — a second-pass rerank of retrieved chunks for better answer grounding. *(query AskService)*
- [ ] 🟡 **Stream the analysis** — deliver the structured analysis over SSE like chat, instead of all-at-once.
- [ ] 🟢 **Cache answers + embeddings in Redis** — cut OpenAI cost and latency on repeat questions/documents.
- [ ] 🟢 **Batch embedding calls** — embed chunks in batches rather than one request per chunk.

## 2D — Auth hardening
- [ ] 🟡 **Token refresh + graceful expiry** — refresh tokens and a clean re-auth flow instead of a hard 401. *(auth-service + web)*
- [ ] 🟡 **Password reset** — request + reset flow.
- [ ] 🟢 **CORS + rate-limit headers** — explicit CORS config and `X-RateLimit-*` headers on the ingest rate limiter.

## 2E — Observability & repo/ops polish
- [ ] 🟡 **Correlation IDs** — a request/job id propagated through the Kafka pipeline and included in structured logs, so one document is traceable across all four services.
- [ ] 🟢 **One-command setup** — a `Makefile` (`make up`, `make test`) + seed data so anyone can run it in one step.
- [ ] 🟢 **GitHub Actions** — a workflow mirroring the Jenkins pipeline so CI runs on the public repo (green checks visible to recruiters).

## 2F — Distributed-systems depth  (senior signals)
- [ ] 🔴 **API Gateway** — Spring Cloud Gateway in front of the services: single entry point, centralized auth, routing.
- [ ] 🟡 **Resilience4j** — circuit breakers + retries around OpenAI/Mongo calls for graceful degradation.
- [ ] 🔴 **Transactional outbox** — write events to an outbox collection in the same DB transaction, relay to Kafka, so an event is never lost on partial failure.

## 2G — Quality & test depth
- [ ] 🟡 **Web-layer + security tests** — `@WebMvcTest` for controllers incl. 401/403 paths; embedded-Kafka ingest→processing test.
- [ ] 🟢 **JaCoCo coverage** — coverage report + README badge.
- [ ] 🟢 **Trivy image scanning** — add an image-vuln scan stage to the CI pipeline.
- [ ] 🔴 **Playwright E2E** — a browser test driving the real UI: upload → analyze → ask.
- [ ] 🟢 **Virtualize the documents list** — windowed rendering as the archive grows.

## 2H — ML rigor & demo-ability  (recruiter-facing, free)
- [ ] 🟡 **"Try with a sample document" mode** — one-click demo with a pre-loaded contract, no signup, so recruiters see it work in seconds.
- [ ] 🟢 **Demo GIF/video in README** — plus the three screenshots the README already references.
- [ ] 🟡 **RAG evaluation harness** — question/expected-answer pairs measuring retrieval precision, to prove and discuss answer quality.
- [ ] 🔴 **PII detection/redaction** — flag/redact PII in uploaded documents.

---

## Recommended order
1. **2A** — visible smoothness + the XSS fix (start here).
2. **2B** — robustness + indexes.
3. **2C** — AI quality & cost.
4. **2E** — observability + GitHub Actions + one-command setup.
5. **2H** — sample-doc demo + README media (recruiter payoff).
6. **2D**, **2F**, **2G** — hardening, distributed-systems depth, deeper tests.
7. **AWS/Terraform** — last, as its own focused session.

Worked one sub-phase at a time: implement → run/verify → commit → next.
