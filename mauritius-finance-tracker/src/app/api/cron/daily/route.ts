import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

function nextDueDateForBill(current: Date, frequency: string) {
  const dt = DateTime.fromJSDate(current).setZone(DEFAULT_TIMEZONE);
  switch (frequency) {
    case "WEEKLY":
      return dt.plus({ weeks: 1 }).toJSDate();
    case "MONTHLY":
      return dt.plus({ months: 1 }).toJSDate();
    case "QUARTERLY":
      return dt.plus({ months: 3 }).toJSDate();
    case "YEARLY":
      return dt.plus({ years: 1 }).toJSDate();
    default:
      return dt.toJSDate();
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = DateTime.now().setZone(DEFAULT_TIMEZONE);
  if (now.hour < 8) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const startOfDay = now.startOf("day").toJSDate();
  const endOfDay = now.endOf("day").toJSDate();

  const dueBills = await prisma.bill.findMany({
    where: {
      active: true,
      nextDueDate: { lte: endOfDay },
    },
  });

  for (const bill of dueBills) {
    await prisma.notification.create({
      data: {
        userId: bill.userId,
        title: "Bill due",
        body: `${bill.name} is due today. Expected ${bill.expectedAmount.toString()} MUR.`,
        channel: "in_app",
      },
    });

    await prisma.notification.create({
      data: {
        userId: bill.userId,
        title: "Email reminder scheduled",
        body: `Email reminder for ${bill.name} (MVP placeholder).`,
        channel: "email",
      },
    });

    if (bill.frequency !== "ONCE") {
      await prisma.bill.update({
        where: { id: bill.id },
        data: { nextDueDate: nextDueDateForBill(bill.nextDueDate, bill.frequency) },
      });
    } else if (bill.dueDate && bill.dueDate < startOfDay) {
      await prisma.bill.update({ where: { id: bill.id }, data: { active: false } });
    }
  }

  return NextResponse.json({ ok: true, count: dueBills.length });
}
