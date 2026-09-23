#!/usr/bin/env python3
"""
RAG evaluation harness for Signalyze Stream.

Runs a fixed "golden" Q&A set against the live pipeline and reports, per question,
whether the answer contains the expected facts and whether the model returned
grounding sources. It exercises the real path end to end: register/login -> upload
the sample contract via ingest -> poll status -> ask each question via query.

This is a lightweight, keyword-based factuality proxy (not a semantic judge), which is
deliberate: it is deterministic, needs no extra model calls, and is enough to catch
regressions when chunking, reranking, or prompts change. Exit code is non-zero when the
pass rate falls below PASS_THRESHOLD, so it can gate CI.

Usage:
    pip install requests            # if not already installed
    # start the stack first:  docker compose up -d
    python eval/rag_eval.py

Config (env, with sensible localhost defaults):
    AUTH_URL   default http://localhost:8084
    INGEST_URL default http://localhost:8081
    QUERY_URL  default http://localhost:8083
    EVAL_EMAIL / EVAL_PASSWORD   test account (created if it doesn't exist)
"""

import os
import sys
import time
import pathlib

try:
    import requests
except ImportError:
    sys.exit("This harness needs 'requests'. Install it with:  pip install requests")

AUTH_URL = os.environ.get("AUTH_URL", "http://localhost:8084").rstrip("/")
INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:8081").rstrip("/")
QUERY_URL = os.environ.get("QUERY_URL", "http://localhost:8083").rstrip("/")
EMAIL = os.environ.get("EVAL_EMAIL", "rag-eval@signalyze.local")
PASSWORD = os.environ.get("EVAL_PASSWORD", "eval-secret-123")

PASS_THRESHOLD = float(os.environ.get("PASS_THRESHOLD", "0.75"))
STATUS_TIMEOUT_S = int(os.environ.get("STATUS_TIMEOUT_S", "90"))

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
SAMPLE_DOC = REPO_ROOT / "web" / "public" / "samples" / "consulting-services-agreement.txt"

# Golden set: each question must yield an answer containing at least `min_hits`
# of the expected phrases (case-insensitive). Phrases are facts actually present
# in the sample contract, so a correct, grounded answer will surface them.
GOLDEN = [
    {
        "q": "What is the monthly fee and when are invoices due?",
        "expect": ["12,000", "twelve thousand", "net", "15", "fifteen"],
        "min_hits": 2,
    },
    {
        "q": "What is the penalty for late payment?",
        "expect": ["5%", "five percent", "compound"],
        "min_hits": 1,
    },
    {
        "q": "Can the consultant terminate the agreement for convenience?",
        "expect": ["cannot", "only", "cause", "material breach", "no"],
        "min_hits": 1,
    },
    {
        "q": "Who owns the intellectual property in the deliverables?",
        "expect": ["client", "work made for hire", "assigned"],
        "min_hits": 1,
    },
    {
        "q": "Is the consultant's liability capped under this agreement?",
        "expect": ["not capped", "uncapped", "not", "no cap"],
        "min_hits": 1,
    },
    {
        "q": "Which state's law governs the agreement?",
        "expect": ["delaware"],
        "min_hits": 1,
    },
    {
        "q": "What is the initial term and how does renewal work?",
        "expect": ["twelve", "12", "automatically renew", "90", "ninety"],
        "min_hits": 2,
    },
    {
        "q": "Does the client have any obligation to indemnify the consultant?",
        "expect": ["no", "not", "no reciprocal", "does not"],
        "min_hits": 1,
    },
]


def get_token(session):
    """Register the eval user (idempotent) then log in for a fresh token."""
    session.post(f"{AUTH_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    r = session.post(f"{AUTH_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    r.raise_for_status()
    token = r.json().get("token")
    if not token:
        sys.exit("Login succeeded but no token was returned.")
    return token


def upload_sample(session, token):
    if not SAMPLE_DOC.exists():
        sys.exit(f"Sample document not found at {SAMPLE_DOC}")
    with open(SAMPLE_DOC, "rb") as fh:
        files = {"file": (SAMPLE_DOC.name, fh, "text/plain")}
        r = session.post(
            f"{INGEST_URL}/documents",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            timeout=30,
        )
    r.raise_for_status()
    return r.json()["jobId"]


def wait_for_done(session, token, job_id):
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + STATUS_TIMEOUT_S
    while time.time() < deadline:
        r = session.get(f"{QUERY_URL}/documents/{job_id}/status", headers=headers, timeout=15)
        if r.status_code == 200:
            status = r.json().get("status", "").upper()
            if status == "DONE":
                return True
            if status == "FAILED":
                sys.exit("Processing FAILED for the sample document.")
        time.sleep(1.5)
    sys.exit(f"Timed out after {STATUS_TIMEOUT_S}s waiting for processing.")


def ask(session, token, job_id, question):
    r = session.post(
        f"{QUERY_URL}/documents/{job_id}/ask",
        headers={"Authorization": f"Bearer {token}"},
        json={"question": question},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("answer", ""), data.get("sources", [])


def main():
    print("Signalyze RAG eval\n" + "=" * 60)
    session = requests.Session()
    token = get_token(session)
    print(f"Authenticated as {EMAIL}")

    job_id = upload_sample(session, token)
    print(f"Uploaded sample -> jobId={job_id}")
    wait_for_done(session, token, job_id)
    print("Processing DONE. Running golden Q&A set...\n")

    passed = 0
    total_sources = 0
    for i, item in enumerate(GOLDEN, 1):
        answer, sources = ask(session, token, job_id, item["q"])
        lower = answer.lower()
        hits = [p for p in item["expect"] if p.lower() in lower]
        answer_ok = len(hits) >= item["min_hits"]
        grounded = len(sources) > 0
        ok = answer_ok and grounded
        passed += 1 if ok else 0
        total_sources += len(sources)

        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] Q{i}: {item['q']}")
        print(f"       answer hits: {hits or 'none'}  (need {item['min_hits']})  sources: {len(sources)}")
        if not ok:
            print(f"       answer: {answer.strip()[:200]}")
        print()

    n = len(GOLDEN)
    rate = passed / n if n else 0.0
    avg_sources = total_sources / n if n else 0.0
    print("=" * 60)
    print(f"Passed {passed}/{n}  ({rate:.0%})   avg sources/answer: {avg_sources:.1f}")
    print(f"Threshold: {PASS_THRESHOLD:.0%}")

    if rate < PASS_THRESHOLD:
        print("RESULT: BELOW THRESHOLD")
        sys.exit(1)
    print("RESULT: OK")


if __name__ == "__main__":
    main()
