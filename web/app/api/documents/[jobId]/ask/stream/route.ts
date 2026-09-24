import { authHeaders } from "@/lib/server-auth";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8085";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const body = await req.text();

  const upstream = await fetch(`${QUERY_URL}/documents/${jobId}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status || 502 });
  }

  // Pump the upstream SSE manually so we close our stream cleanly when
  // query-service ends the connection (avoids "failed to pipe response").
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch {
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
