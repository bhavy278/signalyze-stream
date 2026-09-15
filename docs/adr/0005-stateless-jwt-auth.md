# 0005 - Stateless JWT auth with a shared secret across services

## Context
The system is multi-tenant across several services. Each service needs to know the
caller's identity without a shared session store or a round-trip to the auth service on
every request.

## Decision
`auth-service` issues a signed JWT (HS512) on login. `ingest-service` and `query-service`
validate it locally with a stateless `OncePerRequestFilter` using the same shared secret,
and derive the current user from the token. The owner id flows through the Kafka pipeline
so processed data is attributable, and every read is filtered by it.

## Consequences
No session store and no per-request auth hop — validation is local and cheap, which suits
independent services. The trade-off is that a shared symmetric secret must be distributed
to each validating service, and tokens can't be revoked before expiry; asymmetric keys
(RS256) via a small JWKS endpoint would be the hardening step.
