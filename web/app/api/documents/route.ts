import { NextRequest, NextResponse } from "next/server";
import type { UploadResponse } from "@/lib/types";
import { authHeaders } from "@/lib/server-auth";

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:8081";
const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8083";

// Upload a document → forwards to ingest-service (with the user's token)
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const out = new FormData();
  out.append("file", file, file.name);

  const res = await fetch(`${INGEST_URL}/documents`, {
    method: "POST",
    headers: { ...(await authHeaders()) },
    body: out,
  });
  const data = (await res.json()) as UploadResponse | { error: string };
  return NextResponse.json(data, { status: res.status });
}

// List / search analyses (paged) → reads from query-service (scoped to the user)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params = new URLSearchParams();
  const q = sp.get("q");
  if (q) params.set("q", q);
  params.set("page", sp.get("page") ?? "0");
  params.set("size", sp.get("size") ?? "8");

  const res = await fetch(`${QUERY_URL}/documents?${params.toString()}`, {
    cache: "no-store",
    headers: { ...(await authHeaders()) },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
