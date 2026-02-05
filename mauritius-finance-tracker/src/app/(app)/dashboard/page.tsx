import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = DateTime.now().setZone(DEFAULT_TIMEZONE);
  const start = now.startOf("month").toJSDate();
  const end = now.endOf("month").toJSDate();

  const [transactions, categories, bills, goals, loans, holdings, notifications] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.category.findMany({ where: { userId: user.id } }),
      prisma.bill.findMany({
        where: { userId: user.id, active: true },
        orderBy: { nextDueDate: "asc" },
        take: 5,
      }),
      prisma.goal.findMany({ where: { userId: user.id } }),
      prisma.loan.findMany({ where: { userId: user.id } }),
      prisma.holding.findMany({
        where: { account: { userId: user.id } },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const totalsByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: user.id, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  const categoryLookup = new Map(categories.map((c) => [c.id, c]));
  const totals = totalsByCategory
    .map((row) => ({
      category: categoryLookup.get(row.categoryId ?? "")?.name ?? "Uncategorized",
      amount: Number(row._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + Number(holding.quantity) * Number(holding.price),
    0,
  );

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl bg-white/90 border border-slate-200 p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">This month</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {now.toFormat("MMMM yyyy")}
        </h2>
        <div className="mt-4 grid gap-3">
          {totals.length === 0 && (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          )}
          {totals.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{item.category}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Recent transactions</h3>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-slate-500">No recent activity.</p>
            )}
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(tx.date)} · {tx.category?.name || "Uncategorized"}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Upcoming bills</h3>
          <div className="mt-3 space-y-2">
            {bills.length === 0 && (
              <p className="text-sm text-slate-500">No upcoming bills.</p>
            )}
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{bill.name}</p>
                  <p className="text-xs text-slate-500">
                    Next due {formatDate(bill.nextDueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(Number(bill.expectedAmount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Goals</h3>
          <p className="text-3xl font-semibold mt-2">{goals.length}</p>
          <p className="text-sm text-slate-500">Active savings goals</p>
        </div>
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Loans</h3>
          <p className="text-3xl font-semibold mt-2">{loans.length}</p>
          <p className="text-sm text-slate-500">Tracked loans</p>
        </div>
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5">
          <h3 className="text-lg font-semibold">Investments</h3>
          <p className="text-3xl font-semibold mt-2">{formatCurrency(portfolioValue)}</p>
          <p className="text-sm text-slate-500">Estimated portfolio value</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 border border-slate-200 p-5">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <div className="mt-3 space-y-2">
          {notifications.length === 0 && (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
          {notifications.map((note) => (
            <div key={note.id} className="border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-medium">{note.title}</p>
              <p className="text-xs text-slate-500">{note.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
