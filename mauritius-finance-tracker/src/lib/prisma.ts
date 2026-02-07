import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const URL_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

function readFirstUrl() {
  const invalidUrls: string[] = [];

  for (const key of URL_KEYS) {
    const value = (process.env[key] || "").trim();
    if (!value) continue;
    const cleaned = value.replace(/^["']+/, "").replace(/["']+$/, "");

    try {
      new URL(cleaned);
      return { key, value: cleaned };
    } catch (error) {
      invalidUrls.push(
        `${key}: ${(error as Error).message || "invalid URL format"}`,
      );
    }
  }

  if (invalidUrls.length > 0) {
    throw new Error(
      `[db] Invalid database URL in ${invalidUrls.join("; ")}. Set a valid URL in one of: ${URL_KEYS.join(", ")}`,
    );
  }

  throw new Error(
    `[db] Missing database URL. Set one of: ${URL_KEYS.join(", ")}`,
  );
}

const { key: databaseUrlKey, value: cleanedDatabaseUrl } = readFirstUrl();

// Temporary diagnostics for production env issues (do not log secrets).
if (process.env.DEBUG_DB_URL === "1") {
  const raw = (process.env[databaseUrlKey] || "").trim();
  const hasQuotes = /^["']/.test(raw) || /["']$/.test(raw);
  const hasWhitespace = /\s/.test(raw);
  console.info("[db] env check", {
    key: databaseUrlKey,
    length: raw.length,
    hasQuotes,
    hasWhitespace,
    startsWithPostgres: raw.startsWith("postgresql://") || raw.startsWith("postgres://"),
  });
  try {
    // Validate URL format without printing the full secret.
    new URL(raw.replace(/^["']+/, "").replace(/["']+$/, ""));
    console.info("[db] url parse ok", { key: databaseUrlKey });
  } catch (error) {
    console.error("[db] url parse error", {
      key: databaseUrlKey,
      message: (error as Error).message,
    });
  }
}

const shouldUseNeon =
  process.env.VERCEL === "1" || cleanedDatabaseUrl.includes("neon.tech");

if (process.env.DEBUG_DB_URL === "1") {
  const raw = cleanedDatabaseUrl;
  try {
    const url = new URL(raw);
    console.info("[db] url ok", {
      key: databaseUrlKey,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
    });
  } catch (error) {
    console.error("[db] invalid DATABASE_URL", {
      key: databaseUrlKey,
      length: raw.length,
      startsWithPostgres: raw.startsWith("postgresql://"),
    });
    console.error("[db] error", error);
  }
}

const prismaOptions = shouldUseNeon
  ? {
      adapter: new PrismaNeon({
        connectionString: cleanedDatabaseUrl,
      }),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }
  : {
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
