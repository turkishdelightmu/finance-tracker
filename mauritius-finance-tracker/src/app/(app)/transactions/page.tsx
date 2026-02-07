import Link from "next/link";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { transactionSchema } from "@/domains/transactions/schema";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";
import {
  createTransaction,
  deleteTransaction,
  updateTransactionCategory,
} from "@/domains/transactions/service";

async function createTransactionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/transactions?notice=invalid");
  }

  const data = parsed.data;
  await createTransaction(user.id, data);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions?notice=created");
}

async function deleteTransactionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/transactions?notice=invalid");
  await deleteTransaction(user.id, id);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions?notice=deleted");
}

async function updateTransactionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const saveRule = String(formData.get("saveRule") || "");
  if (!id || !categoryId) redirect("/transactions?notice=invalid");

  const tx = await updateTransactionCategory(
    user.id,
    id,
    categoryId,
    saveRule === "yes",
  );
  if (!tx) redirect("/transactions?notice=invalid");

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions?notice=updated");
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: { month?: string; category?: string; notice?: string };
}) {
  const user = await requireUser();
  const notice = searchParams?.notice;
  const now = DateTime.now().setZone(DEFAULT_TIMEZONE);
  const monthParam = searchParams?.month;
  const month = monthParam
    ? DateTime.fromFormat(monthParam, "yyyy-MM", { zone: DEFAULT_TIMEZONE })
    : now;
  const start = month.startOf("month").toJSDate();
  const end = month.endOf("month").toJSDate();

  const categoryFilter = searchParams?.category || "";

  const [categories, transactions, totals] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: user.id, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  type CategoryRow = { id: string; name: string };
  type TotalsRow = { categoryId: string | null; _sum: { amount: unknown | null } };
  type TransactionRow = {
    id: string;
    description: string;
    date: Date;
    merchant: string | null;
    amount: unknown;
    currency: string;
    categoryId: string | null;
    account: string | null;
    paymentMethod: string | null;
    category?: { name: string } | null;
  };

  const totalsByCategory = totals
    .map((row: TotalsRow) => {
      const category =
        categories.find((c: CategoryRow) => c.id === row.categoryId)?.name ||
        "Uncategorized";
      return { category, amount: Number(row._sum.amount ?? 0) };
    })
    .sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);

  return (
    <div className="space-y-6 pb-20">
      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice === "invalid"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {notice === "created" && "Transaction saved."}
          {notice === "updated" && "Transaction updated."}
          {notice === "deleted" && "Transaction deleted."}
          {notice === "invalid" && "Please check the form inputs."}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Transactions</h2>
        <Link
          href="/transactions/import"
          className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Import CSV
        </Link>
      </div>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Add transaction</h3>
        <form action={createTransactionAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <input name="date" placeholder="Date (dd/mm/yyyy)" className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
            <p className="text-xs text-slate-300">Example: 05/02/2026</p>
          </div>
          <input name="description" placeholder="Description" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="merchant" placeholder="Merchant" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" />
          <div className="space-y-1">
            <input name="amount" placeholder="Amount (MUR)" className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
            <p className="text-xs text-slate-300">Use a minus sign for refunds.</p>
          </div>
          <input name="account" placeholder="Account" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" />
          <input name="paymentMethod" placeholder="Payment method" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" />
          <select name="currency" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100">
            <option value="MUR">MUR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="ZAR">ZAR</option>
          </select>
          <select name="categoryId" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100">
            <option value="">Auto-categorize</option>
            {categories.map((cat: CategoryRow) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <SubmitButton className="md:col-span-2" pendingText="Saving...">
            Save transaction
          </SubmitButton>
        </form>
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-lg font-semibold">Monthly totals</h3>
          <form className="flex gap-2" method="get">
            <input
              type="month"
              name="month"
              defaultValue={month.toFormat("yyyy-MM")}
              className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm"
            />
            <select
              name="category"
              defaultValue={categoryFilter}
              className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((cat: CategoryRow) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <button className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm">Filter</button>
          </form>
        </div>
        <div className="mt-4 space-y-2">
          {totalsByCategory.length === 0 && (
            <p className="text-sm text-slate-300">No transactions for this month.</p>
          )}
          {totalsByCategory.map((item: { category: string; amount: number }) => (
            <div key={item.category} className="flex justify-between">
              <span className="text-sm text-slate-300">{item.category}</span>
              <span className="font-medium text-white">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">All transactions</h3>
        <div className="mt-4 space-y-3">
          {transactions.length === 0 && (
            <p className="text-sm text-slate-300">No transactions found.</p>
          )}
          {transactions.map((tx: TransactionRow) => (
            <div key={tx.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-slate-300">
                    {formatDate(tx.date)} · {tx.merchant || "No merchant"}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(Number(tx.amount), tx.currency)}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <form action={updateTransactionAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={tx.id} />
                  <select name="categoryId" defaultValue={tx.categoryId || ""} className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm">
                    <option value="">Uncategorized</option>
                    {categories.map((cat: CategoryRow) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" name="saveRule" value="yes" />
                    <span>Save rule for this merchant/keyword?</span>
                  </div>
                  <SubmitButton className="px-3 py-2 text-sm" pendingText="Updating...">
                    Update category
                  </SubmitButton>
                </form>
                <div className="text-xs text-slate-300">
                  <p>Account: {tx.account || "-"}</p>
                  <p>Payment: {tx.paymentMethod || "-"}</p>
                  <p>Category: {tx.category?.name || "Uncategorized"}</p>
                </div>
                <form action={deleteTransactionAction} className="md:text-right">
                  <input type="hidden" name="id" value={tx.id} />
                  <button className="text-sm font-medium text-rose-300">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
