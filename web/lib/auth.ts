export interface AuthUser {
  userId?: string;
  email: string;
}

async function post(path: string, body: unknown): Promise<{ email: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Something went wrong.");
  }
  return res.json();
}

export function apiLogin(email: string, password: string) {
  return post("/api/auth/login", { email, password });
}

export function apiRegister(email: string, password: string) {
  return post("/api/auth/register", { email, password });
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function apiMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
