import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, verifyCsrf } from "@/lib/security";
import { importTransactions } from "@/domains/transactions/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const mapping = body.mapping as Record<string, string>;
  const rows = (body.rows as Record<string, string>[]) || [];
  const dryRun = Boolean(body.dryRun);

  const result = await importTransactions(user.id, mapping, rows, dryRun);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      count: result.count,
      errors: result.errors,
    });
  }

  if (result.errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: result.count });
}
