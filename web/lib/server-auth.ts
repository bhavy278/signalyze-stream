import { cookies } from "next/headers";

/** Reads the httpOnly session cookie and returns an Authorization header for backend calls. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get("sz_token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
