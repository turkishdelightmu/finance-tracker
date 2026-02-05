import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { createDefaultsForUser } from "@/lib/seedDefaults";
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
  if (!rateLimit(`register:${ip}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name || null },
  });

  await createDefaultsForUser(user.id);
  await createSession(user.id);
  await logAudit(user.id, "auth.register", { email: user.email });

  return NextResponse.json({ ok: true });
}
