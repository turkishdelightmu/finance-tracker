import { cookies, headers } from "next/headers";

const CSRF_COOKIE = "mft_csrf";

export async function getOrCreateCsrfToken() {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;
  const requestHeaders = await headers();
  return requestHeaders.get("x-csrf-token") ?? "";
}
