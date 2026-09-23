# RAG evaluation harness

A small, deterministic harness that measures the quality of the retrieval-augmented
question answering end to end, against a known document with a golden Q&A set.

It runs the *real* pipeline — register/login, upload the sample contract through the
ingest service, wait for processing, then ask each question through the query
service — and scores each answer on whether it contains the expected facts and
whether the model returned grounding sources.

## Why keyword-based scoring?

The checks are case-insensitive substring matches against facts that are actually in
the sample contract (fees, governing law, liability cap, etc.). This is a factuality
*proxy*, not a semantic judge — but it is deterministic, needs no extra model calls,
and reliably catches regressions when chunking, the MMR reranker, or the prompts
change. It is the kind of guardrail you can run on every change and in CI.

## Run it

```bash
# 1. bring the stack up
docker compose up -d

# 2. install the one dependency (if needed)
pip install requests

# 3. run the eval
python eval/rag_eval.py
```

The process exits non-zero if the pass rate falls below `PASS_THRESHOLD` (default 75%),
so it can gate a CI job.

## Configuration (env)

| Variable          | Default                         | Purpose                          |
|-------------------|---------------------------------|----------------------------------|
| `AUTH_URL`        | `http://localhost:8084`         | auth service                     |
| `INGEST_URL`      | `http://localhost:8081`         | ingest (upload) service          |
| `QUERY_URL`       | `http://localhost:8083`         | query (ask/status) service       |
| `EVAL_EMAIL`      | `rag-eval@signalyze.local`      | test account (created if absent) |
| `EVAL_PASSWORD`   | `eval-secret-123`               | test account password            |
| `PASS_THRESHOLD`  | `0.75`                          | min pass rate before non-zero exit |
| `STATUS_TIMEOUT_S`| `90`                            | max seconds to wait for processing |

## Extending the golden set

Edit the `GOLDEN` list in `rag_eval.py`. Each entry is a question, a list of expected
phrases, and how many must appear (`min_hits`). Keep phrases to facts that are
genuinely present in the source document so a correct, grounded answer surfaces them.
