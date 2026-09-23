#!/usr/bin/env bash
# Seed the running stack with a demo user + the sample contract, so a fresh
# clone has something to show immediately. Requires the stack to be up.
set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:8084}"
INGEST_URL="${INGEST_URL:-http://localhost:8081}"
EMAIL="${SEED_EMAIL:-demo@signalyze.local}"
PASSWORD="${SEED_PASSWORD:-demo12345}"
SAMPLE="${SEED_SAMPLE:-web/public/samples/consulting-services-agreement.txt}"

if [ ! -f "$SAMPLE" ]; then
  echo "Sample document not found at $SAMPLE (run from the repo root)." >&2
  exit 1
fi

echo "→ Registering (or reusing) $EMAIL ..."
curl -sf -X POST "$AUTH_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null 2>&1 || true

echo "→ Logging in ..."
TOKEN="$(curl -sf -X POST "$AUTH_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')"

if [ -z "${TOKEN:-}" ]; then
  echo "Login failed — is the stack up? Try: make up" >&2
  exit 1
fi

echo "→ Uploading sample contract ..."
RESP="$(curl -sf -X POST "$INGEST_URL/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$SAMPLE")"
echo "  $RESP"

echo ""
echo "Seeded. Sign in at http://localhost:3000 as:"
echo "  email:    $EMAIL"
echo "  password: $PASSWORD"
