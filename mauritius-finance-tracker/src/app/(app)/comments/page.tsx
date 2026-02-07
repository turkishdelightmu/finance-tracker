import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

async function create(formData: FormData) {
  "use server";
  const user = await requireUser();
  const comment = String(formData.get("comment") || "").trim();
  if (!comment || comment.length > 500) {
    redirect("/comments?notice=invalid");
  }

  const sql = neon(process.env.DATABASE_URL || "");
  await sql`INSERT INTO "Comment" ("id", "userId", "body", "createdAt")
            VALUES (${randomUUID()}, ${user.id}, ${comment}, NOW())`;

  revalidatePath("/comments");
  redirect("/comments?notice=created");
}

export default async function CommentsPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  await requireUser();
  const notice = searchParams?.notice;
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
          {notice === "created" && "Comment saved."}
          {notice === "invalid" && "Please enter a comment under 500 characters."}
        </div>
      )}
      <h2 className="text-2xl font-semibold text-white">Comments</h2>

      <section className="glass rounded-3xl p-5">
        <h3 className="text-lg font-semibold">Add comment</h3>
        <form action={create} className="mt-4 grid gap-3">
          <textarea
            name="comment"
            placeholder="Write a comment..."
            className="min-h-[120px] rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-slate-100"
            maxLength={500}
            required
          />
          <SubmitButton className="w-fit" pendingText="Saving...">
            Save comment
          </SubmitButton>
        </form>
      </section>

    </div>
  );
}
