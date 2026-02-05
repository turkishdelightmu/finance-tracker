import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string,
  action: string,
  metadata?: unknown,
) {
  await prisma.auditEvent.create({
    data: {
      userId,
      action,
      metadata: metadata ?? undefined,
    },
  });
}
