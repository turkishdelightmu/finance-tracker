import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  investmentAccountSchema,
  holdingSchema,
  investmentTxSchema,
} from "@/domains/investments/schema";
import { formatCurrency } from "@/lib/format";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";
import { redirect } from "next/navigation";
import { parseAmount } from "@/lib/number";
import {
  addInvestmentTransaction,
  createInvestmentAccount,
  updateHoldingPrice,
  upsertHolding,
} from "@/domains/investments/service";

async function createAccountAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = investmentAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/investments?notice=invalid");
  }

  await createInvestmentAccount(user.id, parsed.data);

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  redirect("/investments?notice=created");
}

async function addHoldingAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const accountId = String(formData.get("accountId") || "");
  const parsed = holdingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !accountId) redirect("/investments?notice=invalid");

  const holding = await upsertHolding(user.id, accountId, parsed.data);
  if (!holding) redirect("/investments?notice=invalid");

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  redirect("/investments?notice=holding");
}

async function addTransactionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const accountId = String(formData.get("accountId") || "");
  const parsed = investmentTxSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !accountId) redirect("/investments?notice=invalid");

  const account = await addInvestmentTransaction(user.id, accountId, parsed.data);
  if (!account) redirect("/investments?notice=invalid");

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  redirect("/investments?notice=transaction");
}

async function updateHoldingPriceAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const holdingId = String(formData.get("holdingId") || "");
  const price = parseAmount(String(formData.get("price") || "0"));
  if (!holdingId) redirect("/investments?notice=invalid");

  const holding = await updateHoldingPrice(user.id, holdingId, price);
  if (!holding) redirect("/investments?notice=invalid");

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  redirect("/investments?notice=price");
}

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const user = await requireUser();
  const notice = searchParams?.notice;
  const accounts = await prisma.investmentAccount.findMany({
    where: { userId: user.id },
    include: { holdings: true, transactions: true },
  });

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
          {notice === "created" && "Investment account saved."}
          {notice === "holding" && "Holding updated."}
          {notice === "transaction" && "Investment transaction saved."}
          {notice === "price" && "Price updated."}
          {notice === "invalid" && "Please check the form inputs."}
        </div>
      )}
      <h2 className="text-2xl font-semibold">Investments</h2>

      <section className="rounded-3xl bg-white/90 border border-slate-200 p-5">
        <h3 className="text-lg font-semibold">Add investment account</h3>
        <form action={createAccountAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Account name" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="institution" placeholder="Institution" className="rounded-xl border border-slate-200 px-3 py-2" />
          <SubmitButton className="md:col-span-2" pendingText="Saving...">
            Save account
          </SubmitButton>
        </form>
      </section>

      {accounts.length === 0 && (
        <div className="rounded-3xl bg-white/90 border border-slate-200 p-5 text-sm text-slate-500">
          No investment accounts yet. Add one to start tracking holdings.
        </div>
      )}

      {accounts.map((account) => {
        const portfolioValue = account.holdings.reduce(
          (sum, holding) => sum + Number(holding.quantity) * Number(holding.price),
          0,
        );
        return (
          <section key={account.id} className="rounded-3xl bg-white/90 border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{account.name}</h3>
                <p className="text-sm text-slate-500">{account.institution || ""}</p>
              </div>
              <p className="font-semibold">{formatCurrency(portfolioValue)}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Holdings</h4>
              <div className="mt-2 space-y-2">
                {account.holdings.length === 0 && (
                  <p className="text-sm text-slate-500">No holdings yet.</p>
                )}
                {account.holdings.map((holding) => {
                  const value = Number(holding.quantity) * Number(holding.price);
                  const cost = Number(holding.quantity) * Number(holding.avgCost);
                  const pnl = value - cost;
                  const allocation = portfolioValue
                    ? Math.round((value / portfolioValue) * 100)
                    : 0;

                  return (
                    <div key={holding.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{holding.symbol}</p>
                          <p className="text-xs text-slate-500">{holding.name}</p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(value)}
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                        <span>Allocation {allocation}%</span>
                        <span>Unrealized P/L {formatCurrency(pnl)}</span>
                      </div>
                      <form action={updateHoldingPriceAction} className="mt-2 flex gap-2">
                        <input type="hidden" name="holdingId" value={holding.id} />
                        <input name="price" placeholder="Update price" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                        <SubmitButton className="px-3 py-2 text-xs" pendingText="Updating...">
                          Update
                        </SubmitButton>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Add holding</h4>
              <form action={addHoldingAction} className="mt-2 grid gap-2 md:grid-cols-4">
                <input type="hidden" name="accountId" value={account.id} />
                <input name="symbol" placeholder="Symbol" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <input name="name" placeholder="Name" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <input name="quantity" placeholder="Quantity (e.g. 10)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <input name="price" placeholder="Price (MUR)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <SubmitButton className="md:col-span-4 py-2 text-sm" pendingText="Saving...">
                  Save holding
                </SubmitButton>
              </form>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Investment transactions</h4>
              <form action={addTransactionAction} className="mt-2 grid gap-2 md:grid-cols-3">
                <input type="hidden" name="accountId" value={account.id} />
                <select name="type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="DIVIDEND">Dividend</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                </select>
                <input name="symbol" placeholder="Symbol" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="quantity" placeholder="Quantity (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="price" placeholder="Price (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="amount" placeholder="Amount (MUR)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <input name="date" type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
                <SubmitButton className="md:col-span-3 py-2 text-sm" pendingText="Saving...">
                  Add transaction
                </SubmitButton>
              </form>
            </div>
          </section>
        );
      })}
    </div>
  );
}
