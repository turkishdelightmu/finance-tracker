import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const shouldUseNeon =
  process.env.VERCEL === "1" ||
  (process.env.DATABASE_URL || "").includes("neon.tech");

if (process.env.DEBUG_DB_URL === "1") {
  const raw = process.env.DATABASE_URL || "";
  try {
    const url = new URL(raw);
    console.info("[db] url ok", {
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
    });
  } catch (error) {
    console.error("[db] invalid DATABASE_URL", {
      length: raw.length,
      startsWithPostgres: raw.startsWith("postgresql://"),
    });
    console.error("[db] error", error);
  }
}

const prismaOptions = shouldUseNeon
  ? {
      adapter: new PrismaNeon({
        connectionString: process.env.DATABASE_URL || "",
      }),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }
  : {
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
