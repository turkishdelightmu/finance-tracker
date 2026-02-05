import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/number";
import { parseDateInput } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export async function createBill(
  userId: string,
  data: {
    name: string;
    expectedAmount: string;
    frequency: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    dueDay?: string;
    dueDate?: string;
    nextDueDate: string;
  },
) {
  const bill = await prisma.bill.create({
    data: {
      userId,
      name: data.name,
      expectedAmount: parseAmount(data.expectedAmount),
      frequency: data.frequency,
      dueDay: data.dueDay ? Number(data.dueDay) : null,
      dueDate: data.dueDate ? parseDateInput(data.dueDate) : null,
      nextDueDate: parseDateInput(data.nextDueDate),
      active: true,
    },
  });

  await logAudit(userId, "bill.created", { name: data.name });
  return bill;
}

export async function markBillPaid(userId: string, id: string, createTx: boolean) {
  const bill = await prisma.bill.findFirst({ where: { id, userId } });
  if (!bill) return null;

  if (createTx) {
    await prisma.transaction.create({
      data: {
        userId,
        date: new Date(),
        description: `Bill payment: ${bill.name}`,
        amount: bill.expectedAmount,
        currency: "MUR",
        source: "BILL",
        billId: bill.id,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      title: "Bill marked paid",
      body: `${bill.name} marked as paid.`,
      channel: "in_app",
    },
  });

  await logAudit(userId, "bill.paid", { id: bill.id, createTx });
  return bill;
}

export async function toggleBill(userId: string, id: string) {
  const bill = await prisma.bill.findFirst({ where: { id, userId } });
  if (!bill) return null;

  await prisma.bill.update({ where: { id: bill.id }, data: { active: !bill.active } });
  await logAudit(userId, "bill.toggled", { id: bill.id, active: !bill.active });
  return bill;
}
