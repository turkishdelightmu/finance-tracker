import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

function cleanEnv(value: string | undefined | null): string {
  return (value || "").replace(/[\r\n]/g, "").trim();
}

const vercelHost = cleanEnv(process.env.VERCEL_URL);
const vercelUrl = vercelHost
  ? `https://${vercelHost}`
  : null;
const appBaseUrl =
  cleanEnv(process.env.BETTER_AUTH_URL) ||
  cleanEnv(process.env.NEXT_PUBLIC_APP_URL) ||
  vercelUrl ||
  "http://localhost:3000";
const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
const googleClientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  secret: cleanEnv(process.env.BETTER_AUTH_SECRET),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignUpEmail: false,
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    appBaseUrl,
    ...(vercelUrl ? [vercelUrl] : []),
  ],
  baseURL: appBaseUrl,
});

// Provide a safe wrapper for Next.js routing. The `better-auth` package may
// expose a helper to produce Next.js handlers; if not available we expose a
// fallback that returns 501 responses so imports don't crash during development.

export type Session = any;
