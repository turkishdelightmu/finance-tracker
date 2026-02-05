import { cookies } from "next/headers";

const CSRF_COOKIE = "mft_csrf";

export async function getOrCreateCsrfToken() {
  const store = await cookies();
  let token = store.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = crypto.randomUUID();
    store.set(CSRF_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return token;
}
