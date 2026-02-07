import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session && session.expiresAt.getTime() >= Date.now()) {
      return session.user;
    }
    if (session && session.expiresAt.getTime() < Date.now()) {
      await prisma.session.deleteMany({ where: { token } });
    }
  }

  // Fallback for Better Auth social login sessions (e.g., Google OAuth).
  const allCookies = cookieStore.getAll();
  if (allCookies.length === 0) return null;
  const cookieHeader = allCookies
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");

  const authBaseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const resp = await fetch(`${authBaseUrl}/api/auth/get-session`, {
    method: "GET",
    headers: { cookie: cookieHeader },
    cache: "no-store",
  }).catch(() => null);

  if (!resp?.ok) return null;
  const data = await resp.json().catch(() => null) as {
    user?: { id?: string };
  } | null;
  const userId = data?.user?.id;
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
