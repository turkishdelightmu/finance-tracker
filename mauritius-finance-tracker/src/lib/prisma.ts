import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const shouldUseNeon = (process.env.DATABASE_URL || "").includes("neon.tech");

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

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
