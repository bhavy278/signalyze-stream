import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:8085";
const COOKIE = "sz_token";

export async function GET() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const res = await fetch(`${AUTH_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await res.json());
}
