export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function verifyCsrf(request: Request) {
  const header = request.headers.get("x-csrf-token");
  if (!header) return false;
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookie = store.get("mft_csrf")?.value;
  return Boolean(cookie && header && cookie === header);
}
