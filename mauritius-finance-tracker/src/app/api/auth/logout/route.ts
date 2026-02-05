import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { isSameOrigin, verifyCsrf } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await logAudit(user.id, "auth.logout", { email: user.email });
  }
  return NextResponse.json({ ok: true });
}
