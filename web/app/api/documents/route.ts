import { NextRequest, NextResponse } from "next/server";
import type { Analysis, UploadResponse } from "@/lib/types";

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:8081";
const QUERY_URL = process.env.QUERY_URL ?? "http://localhost:8083";

// Upload a document → forwards to ingest-service
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
    body: out,
  });
  const data = (await res.json()) as UploadResponse | { error: string };
  return NextResponse.json(data, { status: res.status });
}

// List all analyses → reads from query-service
export async function GET() {
  const res = await fetch(`${QUERY_URL}/documents`, { cache: "no-store" });
  const data = (await res.json()) as Analysis[];
  return NextResponse.json(data, { status: res.status });
}
