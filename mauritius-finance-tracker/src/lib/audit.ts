import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function logAudit(
  userId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
) {
  await prisma.auditEvent.create({
    data: {
      userId,
      action,
      metadata: metadata ?? undefined,
    },
  });
}
