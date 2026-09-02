import { NextResponse } from "next/server";

const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:8084";
const COOKIE = "sz_token";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const out = NextResponse.json({ email: data.email });
  out.cookies.set(COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return out;
}
