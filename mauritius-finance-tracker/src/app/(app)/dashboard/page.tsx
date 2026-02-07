import Link from "next/link";
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
  type GoalRow = {
    id: string;
    name: string;
    currentAmount: unknown;
    targetAmount: unknown;
  };
  type LoanRow = {
    id: string;
    name: string;
    principal: unknown;
    currentBalance: unknown;
  };
  type NotificationRow = {
    id: string;
    title: string;
    body: string;
    createdAt: Date;
    readAt: Date | null;
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
  const monthlyVolume = (transactions as TxRow[]).reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount)),
    0,
  );
  const goalCurrentTotal = (goals as GoalRow[]).reduce(
    (sum, goal) => sum + Number(goal.currentAmount),
    0,
  );
  const goalTargetTotal = (goals as GoalRow[]).reduce(
    (sum, goal) => sum + Math.max(Number(goal.targetAmount), 0),
    0,
  );
  const savingsRate = goalTargetTotal > 0
    ? Math.min(100, Math.round((goalCurrentTotal / goalTargetTotal) * 100))
    : 0;
  const totalLoanBalance = (loans as LoanRow[]).reduce(
    (sum, loan) => sum + Number(loan.currentBalance),
    0,
  );
  const totalLoanPrincipal = (loans as LoanRow[]).reduce(
    (sum, loan) => sum + Math.max(Number(loan.principal), 0),
    0,
  );
  const loanProgress = totalLoanPrincipal > 0
    ? Math.min(100, Math.round(((totalLoanPrincipal - totalLoanBalance) / totalLoanPrincipal) * 100))
    : 0;
  const topGoals = (goals as GoalRow[])
    .map((goal) => ({
      ...goal,
      progress:
        Number(goal.targetAmount) > 0
          ? Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100))
          : 0,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  const todayNotes = (notifications as NotificationRow[]).filter((note) =>
    DateTime.fromJSDate(note.createdAt).setZone(DEFAULT_TIMEZONE).hasSame(now, "day"),
  );
  const earlierNotes = (notifications as NotificationRow[]).filter((note) =>
    !DateTime.fromJSDate(note.createdAt).setZone(DEFAULT_TIMEZONE).hasSame(now, "day"),
  );
  const categoryBadge = (name?: string | null) => name || "Uncategorized";
  const billStatus = (date: Date) => {
    const days = Math.floor(
      DateTime.fromJSDate(date).setZone(DEFAULT_TIMEZONE).startOf("day").diff(
        now.startOf("day"),
        "days",
      ).days,
    );
    if (days <= 0) return { label: "Due today", cls: "bg-rose-100 text-rose-700" };
    if (days <= 7) return { label: "This week", cls: "bg-amber-100 text-amber-700" };
    return { label: "Later", cls: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <div className="space-y-6 pb-20">
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">This month</p>
            <h2 className="text-2xl font-semibold text-white">
              {now.toFormat("MMMM yyyy")}
            </h2>
          </div>
          <div className="flex gap-2">
            <Link href="/transactions/import" className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
              Export
            </Link>
            <Link href="/transactions" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500">
              View all
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-xs text-slate-400">Monthly volume</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(monthlyVolume)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-xs text-slate-400">Bills due</p>
            <p className="mt-1 text-lg font-semibold text-white">{bills.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-xs text-slate-400">Savings rate</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{savingsRate}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-xs text-slate-400">Invested value</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{formatCurrency(portfolioValue)}</p>
          </div>
        </div>
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Recent transactions</h3>
            <Link href="/transactions" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-slate-300">No recent activity.</p>
            )}
            {transactions.map((tx: TxRow) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="mt-1 inline-flex rounded-full bg-emerald-50/20 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                    {categoryBadge(tx.category?.name)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(tx.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${Number(tx.amount) >= 0 ? "text-emerald-200" : "text-rose-300"}`}>
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Upcoming bills</h3>
            <Link href="/bills" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {bills.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 p-4 text-center">
                <p className="text-sm text-slate-300">No upcoming bills.</p>
                <Link href="/bills" className="mt-2 inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">
                  Add bill
                </Link>
              </div>
            )}
            {bills.map((bill: BillRow) => (
              <div key={bill.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{bill.name}</p>
                  <p className="text-xs text-slate-300">Next due {formatDate(bill.nextDueDate)}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-200">
                    {formatCurrency(Number(bill.expectedAmount))}
                  </span>
                  <p className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${billStatus(bill.nextDueDate).cls}`}>
                    {billStatus(bill.nextDueDate).label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Goals</h3>
            <Link href="/goals" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
              Add
            </Link>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-200">{goals.length}</p>
          <p className="text-sm text-slate-300">Active savings goals</p>
          <div className="mt-3 space-y-2">
            {topGoals.length === 0 && (
              <p className="text-xs text-slate-400">No goals yet.</p>
            )}
            {topGoals.map((goal) => (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-slate-300">{goal.name}</span>
                  <span className="text-emerald-200">{goal.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Loans</h3>
            <Link href="/loans" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
              View all
            </Link>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-200">{loans.length}</p>
          <p className="text-sm text-slate-300">Tracked loans</p>
          <p className="mt-3 text-xs text-slate-400">Outstanding: {formatCurrency(totalLoanBalance)}</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${loanProgress}%` }} />
          </div>
          <p className="mt-1 text-xs text-emerald-200">{loanProgress}% repaid</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Investments</h3>
            <Link href="/investments" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
              View all
            </Link>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-200">{formatCurrency(portfolioValue)}</p>
          <p className="text-sm text-slate-300">Estimated portfolio value</p>
          <p className="mt-3 text-xs text-slate-400">{holdings.length} holdings tracked</p>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <Link href="/comments" className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/15">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {notifications.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 p-4 text-center">
              <p className="text-sm text-slate-300">No notifications yet.</p>
            </div>
          )}
          {todayNotes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Today</p>
              <div className="space-y-2">
                {todayNotes.map((note) => (
                  <div key={note.id} className={`rounded-xl border p-3 ${note.readAt ? "border-white/10 bg-black/10" : "border-emerald-400/30 bg-emerald-500/10"}`}>
                    <p className="text-sm font-medium text-white">{note.title}</p>
                    <p className="text-xs text-slate-300">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {earlierNotes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Earlier</p>
              <div className="space-y-2">
                {earlierNotes.map((note) => (
                  <div key={note.id} className={`rounded-xl border p-3 ${note.readAt ? "border-white/10 bg-black/10" : "border-emerald-400/30 bg-emerald-500/10"}`}>
                    <p className="text-sm font-medium text-white">{note.title}</p>
                    <p className="text-xs text-slate-300">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
