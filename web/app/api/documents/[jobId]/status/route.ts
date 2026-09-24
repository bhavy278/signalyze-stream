import { NextResponse } from "next/server";
import { authHeaders } from "@/lib/server-auth";

const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8085";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const res = await fetch(`${QUERY_URL}/documents/${jobId}/status`, {
    cache: "no-store",
    headers: { ...(await authHeaders()) },
  });
  if (res.status === 404) {
    return NextResponse.json({ jobId, status: "PROCESSING" });
  }
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
