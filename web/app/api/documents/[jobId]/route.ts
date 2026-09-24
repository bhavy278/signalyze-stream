import { NextResponse } from "next/server";
import type { Analysis } from "@/lib/types";
import { authHeaders } from "@/lib/server-auth";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8085";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}`, {
    cache: "no-store",
    headers: { ...(await authHeaders()) },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  const data = (await res.json()) as Analysis;
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}`, {
    method: "DELETE",
    cache: "no-store",
    headers: { ...(await authHeaders()) },
  });
  if (!res.ok && res.status !== 404) {
    return new NextResponse(null, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
