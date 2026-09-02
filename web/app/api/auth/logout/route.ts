import { NextResponse } from "next/server";

const COOKIE = "sz_token";

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return out;
}
