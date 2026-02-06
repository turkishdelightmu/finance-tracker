import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const URL_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

function readFirstUrl() {
  for (const key of URL_KEYS) {
    const value = (process.env[key] || "").trim();
    if (!value) continue;
    return {
      key,
      value: value.replace(/^["']/, "").replace(/["']$/, ""),
    };
  }
  return { key: "DATABASE_URL", value: "" };
}

const { key: databaseUrlKey, value: cleanedDatabaseUrl } = readFirstUrl();

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
      datasources: { db: { url: cleanedDatabaseUrl } },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }
  : {
      datasources: { db: { url: cleanedDatabaseUrl } },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
