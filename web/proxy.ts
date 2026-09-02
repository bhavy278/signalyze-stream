import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "sz_token";
const PROTECTED = ["/", "/documents"];

export function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const path = req.nextUrl.pathname;

  if (PROTECTED.includes(path) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (path === "/login" && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/documents", "/login"],
};
