import { cookies } from "next/headers";

const CSRF_COOKIE = "mft_csrf";

export async function getOrCreateCsrfToken() {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? "";
}
