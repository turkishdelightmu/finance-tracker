import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/number";
import { logAudit } from "@/lib/audit";

export async function createGoal(
  userId: string,
  data: {
    name: string;
    targetAmount: string;
    targetDate: string;
    currentAmount?: string;
  },
) {
  const goal = await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      targetAmount: parseAmount(data.targetAmount),
      targetDate: new Date(data.targetDate),
      currentAmount: parseAmount(data.currentAmount || "0"),
    },
  });

  await logAudit(userId, "goal.created", { name: data.name });
  return goal;
}

export async function addContribution(
  userId: string,
  goalId: string,
  amount: number,
  transactionId?: string,
) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return null;

  await prisma.contribution.create({
    data: {
      userId,
      goalId,
      amount,
      transactionId: transactionId || null,
    },
  });

  await prisma.goal.update({
    where: { id: goal.id },
    data: { currentAmount: { increment: amount } },
  });

  await logAudit(userId, "goal.contribution", { goalId, amount });
  return goal;
}
