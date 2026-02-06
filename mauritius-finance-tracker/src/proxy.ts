import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const csrfCookie = request.cookies.get("mft_csrf")?.value;
  const requestHeaders = new Headers(request.headers);
  const csrfToken = csrfCookie ?? crypto.randomUUID();
  requestHeaders.set("x-csrf-token", csrfToken);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!csrfCookie) {
    response.cookies.set("mft_csrf", csrfToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
