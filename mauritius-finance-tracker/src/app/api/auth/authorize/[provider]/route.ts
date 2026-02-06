import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  const url = new URL(request.url);
  const origin = url.origin;

  const resp = await fetch(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, disableRedirect: false }),
    redirect: "manual",
  });

  // If Better Auth returned a Location header to redirect the user to the
  // provider authorization page, forward that redirect to the browser.
  const location = resp.headers.get("Location");
  if (location) {
    return NextResponse.redirect(location);
  }

  // Otherwise return the JSON response (contains `url` when disableRedirect=true)
  const text = await resp.text();
  const status = resp.status;
  return new Response(text, { status, headers: { "Content-Type": resp.headers.get("Content-Type") || "text/plain" } });
}

export async function POST(request: Request, { params }: { params: { provider: string } }) {
  // Allow POST to behave the same as GET for clients that prefer POST.
  return GET(request, { params });
}
