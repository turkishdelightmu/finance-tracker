import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { goalSchema } from "@/domains/goals/schema";
import { parseAmount } from "@/lib/number";
import { formatCurrency, formatDate } from "@/lib/format";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";
import { redirect } from "next/navigation";
import { addContribution, createGoal } from "@/domains/goals/service";

async function createGoalAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/goals?notice=invalid");
  }
  const data = parsed.data;

  await createGoal(user.id, data);

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect("/goals?notice=created");
}

async function addContributionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const goalId = String(formData.get("goalId") || "");
  const transactionId = String(formData.get("transactionId") || "");
  const amount = parseAmount(String(formData.get("amount") || "0"));
  if (!goalId || amount <= 0) redirect("/goals?notice=invalid");

  const goal = await addContribution(user.id, goalId, amount, transactionId);
  if (!goal) redirect("/goals?notice=invalid");

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect("/goals?notice=contributed");
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const user = await requireUser();
  const notice = searchParams?.notice;
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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
          {notice === "created" && "Goal saved."}
          {notice === "contributed" && "Contribution saved."}
          {notice === "invalid" && "Please check the form inputs."}
        </div>
      )}
      <h2 className="text-2xl font-semibold">Savings goals</h2>
      <section className="rounded-3xl bg-white/90 border border-slate-200 p-5">
        <h3 className="text-lg font-semibold">Add goal</h3>
        <form action={createGoalAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Goal name" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="targetAmount" placeholder="Target amount" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="targetDate" type="date" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="currentAmount" placeholder="Current amount" className="rounded-xl border border-slate-200 px-3 py-2" />
          <SubmitButton className="md:col-span-2" pendingText="Saving...">
            Save goal
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-3xl bg-white/90 border border-slate-200 p-5">
        <h3 className="text-lg font-semibold">Your goals</h3>
        <div className="mt-4 space-y-3">
          {goals.length === 0 && (
            <p className="text-sm text-slate-500">No goals yet.</p>
          )}
          {goals.map((goal) => {
            const target = Number(goal.targetAmount);
            const current = Number(goal.currentAmount);
            const remaining = Math.max(target - current, 0);
            const monthsLeft = Math.max(
              Math.ceil(
                DateTime.fromJSDate(goal.targetDate)
                  .setZone(DEFAULT_TIMEZONE)
                  .diffNow("months").months,
              ),
              1,
            );
            const monthlyRequired = remaining / monthsLeft;

            return (
              <div key={goal.id} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-xs text-slate-500">
                      Target {formatCurrency(target)} by {formatDate(goal.targetDate)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(current)}</p>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Required monthly saving: {formatCurrency(monthlyRequired)}
                </div>
                <form action={addContributionAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input name="amount" placeholder="Contribution (MUR)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="transactionId" placeholder="Transaction ID (optional)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <SubmitButton className="px-3 py-2 text-sm" pendingText="Saving...">
                    Add
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
