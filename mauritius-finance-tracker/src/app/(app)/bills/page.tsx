import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { billSchema } from "@/domains/bills/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";
import { redirect } from "next/navigation";
import { createBill, markBillPaid, toggleBill } from "@/domains/bills/service";

async function createBillAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/bills?notice=invalid");
  }
  const data = parsed.data;
  await createBill(user.id, data);

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  redirect("/bills?notice=created");
}

async function markPaidAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const createTx = String(formData.get("createTx") || "");
  if (!id) redirect("/bills?notice=invalid");

  const bill = await markBillPaid(user.id, id, createTx === "yes");
  if (!bill) redirect("/bills?notice=invalid");

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  redirect("/bills?notice=paid");
}

async function toggleBillAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/bills?notice=invalid");
  const bill = await toggleBill(user.id, id);
  if (!bill) redirect("/bills?notice=invalid");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  redirect("/bills?notice=updated");
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const user = await requireUser();
  const notice = searchParams?.notice;
  const bills = await prisma.bill.findMany({
    where: { userId: user.id },
    orderBy: { nextDueDate: "asc" },
  });
  type BillRow = {
    id: string;
    name: string;
    expectedAmount: unknown;
    nextDueDate: Date;
    frequency: string;
    active: boolean;
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
          {notice === "created" && "Bill saved."}
          {notice === "paid" && "Bill marked paid."}
          {notice === "updated" && "Bill updated."}
          {notice === "invalid" && "Please check the form inputs."}
        </div>
      )}
      <h2 className="text-2xl font-semibold text-white">Bills</h2>
      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Add bill</h3>
        <form action={createBillAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Bill name" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <input name="expectedAmount" placeholder="Expected amount" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
          <select name="frequency" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100">
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="ONCE">Once</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <input name="dueDay" placeholder="Due day (1-31, optional)" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" />
          <input name="dueDate" placeholder="Due date (dd/mm/yyyy)" className="rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" />
          <div className="space-y-1">
            <input name="nextDueDate" placeholder="Next due date (dd/mm/yyyy)" className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100" required />
            <p className="text-xs text-slate-300">Bills will trigger reminders at 08:00 Mauritius time.</p>
          </div>
          <SubmitButton className="md:col-span-2" pendingText="Saving...">
            Save bill
          </SubmitButton>
        </form>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Your bills</h3>
        <div className="mt-4 space-y-3">
          {bills.length === 0 && (
            <p className="text-sm text-slate-300">No bills yet.</p>
          )}
          {bills.map((bill: BillRow) => (
            <div key={bill.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{bill.name}</p>
                  <p className="text-xs text-slate-300">
                    Next due {formatDate(bill.nextDueDate)} · {bill.frequency}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(Number(bill.expectedAmount))}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <form action={markPaidAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={bill.id} />
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" name="createTx" value="yes" />
                    <span>Create linked transaction</span>
                  </div>
                  <SubmitButton className="px-3 py-2 text-sm" pendingText="Saving...">
                    Mark paid
                  </SubmitButton>
                </form>
                <form action={toggleBillAction} className="md:text-right">
                  <input type="hidden" name="id" value={bill.id} />
                  <button className="text-sm font-medium text-slate-300">
                    {bill.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
