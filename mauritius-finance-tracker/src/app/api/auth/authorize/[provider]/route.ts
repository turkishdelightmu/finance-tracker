import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);

  // OAuth state cookies are host-bound. If auth starts on 127.0.0.1 but
  // Better Auth is configured for localhost (or vice versa), callback state
  // verification fails with `state_mismatch`.
  const configuredBase =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredBase) {
    const canonicalBase = new URL(configuredBase);
    if (url.origin !== canonicalBase.origin) {
      const canonicalUrl = new URL(
        `${url.pathname}${url.search}`,
        canonicalBase,
      );
      return NextResponse.redirect(canonicalUrl);
    }
  }

  const origin = url.origin;

  if (provider === "google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return new Response(
        "Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env",
        { status: 400 }
      );
    }
  }

  if (provider === "github") {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return new Response(
        "GitHub OAuth not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your .env",
        { status: 400 }
      );
    }
  }

  const resp = await fetch(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, disableRedirect: false }),
    redirect: "manual",
  });

  let redirectUrl = resp.headers.get("location");

  // Some Better Auth versions return a JSON body with `url` instead of a
  // Location header, even when redirects are enabled.
  if (!redirectUrl) {
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await resp.json().catch(() => null) as { url?: unknown } | null;
      if (typeof data?.url === "string" && data.url.length > 0) {
        redirectUrl = data.url;
      }
    }
  }

  if (redirectUrl) {
    const redirectResponse = NextResponse.redirect(redirectUrl);
    const headersWithSetCookie = resp.headers as Headers & {
      getSetCookie?: () => string[];
    };

    // Preserve OAuth state cookies created by Better Auth before redirect.
    const setCookies = headersWithSetCookie.getSetCookie?.() ?? [];
    for (const value of setCookies) {
      redirectResponse.headers.append("set-cookie", value);
    }

    return redirectResponse;
  }

  // Otherwise return the JSON response (contains `url` when disableRedirect=true)
  const text = await resp.text();
  const status = resp.status;
  return new Response(text, { status, headers: { "Content-Type": resp.headers.get("Content-Type") || "text/plain" } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  // Allow POST to behave the same as GET for clients that prefer POST.
  return GET(request, { params });
}
