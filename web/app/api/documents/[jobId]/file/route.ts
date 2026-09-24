import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/server-auth";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8085";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/file`, {
    cache: "no-store",
    headers: { ...(await authHeaders()) },
  });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
