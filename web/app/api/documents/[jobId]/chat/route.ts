import { NextResponse } from "next/server";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8083";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/chat`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
