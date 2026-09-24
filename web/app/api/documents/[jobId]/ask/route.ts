import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/server-auth";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8085";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const body = await req.json();
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
