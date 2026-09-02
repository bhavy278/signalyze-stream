import { NextResponse } from "next/server";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8083";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const body = await req.json();
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
