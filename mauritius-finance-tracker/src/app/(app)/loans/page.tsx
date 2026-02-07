import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { loanSchema } from "@/domains/loans/schema";
import { parseAmount } from "@/lib/number";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateAmortizationSchedule } from "@/lib/amortization";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";
import { redirect } from "next/navigation";
import {
  createLoan,
  overrideLoanBalance,
  recordLoanPayment,
} from "@/domains/loans/service";

async function createLoanAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/loans?notice=invalid");
  }
  const data = parsed.data;

  await createLoan(user.id, data);

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans?notice=created");
}

async function recordPaymentAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const loanId = String(formData.get("loanId") || "");
  const createTx = String(formData.get("createTx") || "");
  if (!loanId) redirect("/loans?notice=invalid");
  const loan = await recordLoanPayment(user.id, loanId, createTx === "yes");
  if (!loan) redirect("/loans?notice=invalid");

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans?notice=paid");
}

async function overrideBalanceAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const loanId = String(formData.get("loanId") || "");
  const balance = parseAmount(String(formData.get("balance") || "0"));
  if (!loanId) redirect("/loans?notice=invalid");
  await overrideLoanBalance(user.id, loanId, balance);
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  redirect("/loans?notice=updated");
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const user = await requireUser();
  const notice = searchParams?.notice;
  const loans = await prisma.loan.findMany({ where: { userId: user.id } });
  type LoanRow = {
    id: string;
    name: string;
    currentBalance: unknown;
    apr: unknown;
    termMonths: number;
    monthlyPayment: unknown;
    paymentDay: number;
  };

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
          {notice === "created" && "Loan saved."}
          {notice === "paid" && "Loan payment recorded."}
          {notice === "updated" && "Loan balance updated."}
          {notice === "invalid" && "Please check the form inputs."}
        </div>
      )}
      <h2 className="text-2xl font-semibold text-white">Loans</h2>
      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Add loan</h3>
        <form action={createLoanAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Loan name" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="principal" placeholder="Principal" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="apr" placeholder="APR (%)" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="termMonths" placeholder="Term (months)" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="paymentDay" placeholder="Payment day (1-28)" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="monthlyPayment" placeholder="Monthly payment" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="currentBalance" placeholder="Current balance" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <SubmitButton className="md:col-span-2" pendingText="Saving...">
            Save loan
          </SubmitButton>
        </form>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Your loans</h3>
        <div className="mt-4 space-y-3">
          {loans.length === 0 && (
            <p className="text-sm text-slate-300">No loans yet.</p>
          )}
          {loans.map((loan: LoanRow) => {
            const schedule = generateAmortizationSchedule(
              Number(loan.currentBalance),
              Number(loan.apr),
              loan.termMonths,
              Number(loan.monthlyPayment),
            );
            const nextPayment = schedule[0];
            const payoffMonths = schedule.length;
            const now = DateTime.now().setZone(DEFAULT_TIMEZONE);
            const baseDate = now.set({ day: loan.paymentDay });
            const nextDate = (baseDate < now ? baseDate.plus({ months: 1 }) : baseDate).toJSDate();

            return (
              <div key={loan.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{loan.name}</p>
                    <p className="text-xs text-slate-300">
                      Payment day {loan.paymentDay} · APR {String(loan.apr)}%
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(Number(loan.currentBalance))}</p>
                </div>
                {nextPayment && (
                  <div className="mt-3 text-xs text-slate-300">
                    Next payment {formatCurrency(nextPayment.payment)} on {formatDate(nextDate)} ·
                    Payoff in {payoffMonths} months
                  </div>
                )}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <form action={recordPaymentAction} className="space-y-2">
                    <input type="hidden" name="loanId" value={loan.id} />
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" name="createTx" value="yes" />
                      Create linked transaction
                    </label>
                    <SubmitButton className="px-3 py-2 text-sm" pendingText="Saving...">
                      Mark payment paid
                    </SubmitButton>
                  </form>
                  <form action={overrideBalanceAction} className="flex gap-2">
                    <input type="hidden" name="loanId" value={loan.id} />
                    <input name="balance" placeholder="Override balance" className="flex-1 rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm" />
                    <SubmitButton className="px-3 py-2 text-sm" pendingText="Updating...">
                      Update
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
