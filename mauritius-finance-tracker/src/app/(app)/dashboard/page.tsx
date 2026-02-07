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

  const categoryLookup = new Map<string, { name: string }>(
    categories.map((c: { id: string; name: string }) => [c.id, c]),
  );
  type TotalsRow = { categoryId: string | null; _sum: { amount: unknown | null } };
  type TotalsEntry = { category: string; amount: number };
  type TxRow = {
    id: string;
    description: string;
    date: Date;
    category?: { name: string } | null;
    amount: unknown;
    currency: string;
  };
  type BillRow = {
    id: string;
    name: string;
    nextDueDate: Date;
    expectedAmount: unknown;
  };
  type NotificationRow = {
    id: string;
    title: string;
    body: string;
    createdAt: Date;
  };
  const totals: TotalsEntry[] = totalsByCategory
    .map((row: TotalsRow) => ({
      category: categoryLookup.get(row.categoryId ?? "")?.name ?? "Uncategorized",
      amount: Number(row._sum.amount ?? 0),
    }))
    .sort((a: TotalsEntry, b: TotalsEntry) => b.amount - a.amount);

  type HoldingRow = { quantity: unknown; price: unknown };
  const portfolioValue = holdings.reduce(
    (sum: number, holding: HoldingRow) =>
      sum + Number(holding.quantity) * Number(holding.price),
    0,
  );

  return (
    <div className="space-y-6 pb-20">
      <section className="glass rounded-3xl p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">This month</p>
        <h2 className="text-2xl font-semibold text-white">
          {now.toFormat("MMMM yyyy")}
        </h2>
        <div className="mt-4 grid gap-3">
          {totals.length === 0 && (
            <p className="text-sm text-slate-300">No transactions yet.</p>
          )}
          {totals.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{item.category}</span>
              <span className="font-medium text-white">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-white">Recent transactions</h3>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-slate-300">No recent activity.</p>
            )}
            {transactions.map((tx: TxRow) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-slate-300">
                    {formatDate(tx.date)} · {tx.category?.name || "Uncategorized"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-200">
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-white">Upcoming bills</h3>
          <div className="mt-3 space-y-2">
            {bills.length === 0 && (
              <p className="text-sm text-slate-300">No upcoming bills.</p>
            )}
            {bills.map((bill: BillRow) => (
              <div key={bill.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{bill.name}</p>
                  <p className="text-xs text-slate-300">
                    Next due {formatDate(bill.nextDueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-200">
                  {formatCurrency(Number(bill.expectedAmount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-white">Goals</h3>
          <p className="text-3xl font-semibold mt-2 text-emerald-200">{goals.length}</p>
          <p className="text-sm text-slate-300">Active savings goals</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-white">Loans</h3>
          <p className="text-3xl font-semibold mt-2 text-emerald-200">{loans.length}</p>
          <p className="text-sm text-slate-300">Tracked loans</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <h3 className="text-lg font-semibold text-white">Investments</h3>
          <p className="text-3xl font-semibold mt-2 text-emerald-200">{formatCurrency(portfolioValue)}</p>
          <p className="text-sm text-slate-300">Estimated portfolio value</p>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
        <div className="mt-3 space-y-2">
          {notifications.length === 0 && (
            <p className="text-sm text-slate-300">No notifications yet.</p>
          )}
          {notifications.map((note: NotificationRow) => (
            <div key={note.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-sm font-medium text-white">{note.title}</p>
              <p className="text-xs text-slate-300">{note.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
