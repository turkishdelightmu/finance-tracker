import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { getClientIp, isSameOrigin, verifyCsrf } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user.id);
  await logAudit(user.id, "auth.login", { email: user.email });
  return NextResponse.json({ ok: true });
}
