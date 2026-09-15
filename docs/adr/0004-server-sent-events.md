# 0004 - Server-Sent Events for live status and streamed answers

## Context
Two things need to reach the browser as they happen: a document's status when async
processing finishes, and chat answers as the model generates them. Options were polling,
WebSockets, and SSE.

## Decision
Use Server-Sent Events. `query-service` exposes SSE endpoints (`SseEmitter`) for live
status — backed by a Kafka consumer on `document.processed` / `document.failed` — and for
token-streamed `/ask` answers. Next.js route handlers proxy the streams to the client.

## Consequences
The flow is one-directional (server → client), which is exactly what SSE is for — it is
simpler than WebSockets, works over plain HTTP, and reconnects automatically. Polling is
eliminated. The trade-off is no client→server channel on the same connection (not needed
here) and a per-connection server thread while streaming.
