import { NextResponse } from "next/server";
import type { StatusResponse } from "@/lib/types";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8083";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/status`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = (await res.json()) as StatusResponse;
  return NextResponse.json(data, { status: res.status });
}
