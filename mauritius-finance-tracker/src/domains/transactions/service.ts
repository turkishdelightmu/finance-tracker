import { prisma } from "@/lib/prisma";
import { categorizeTransaction } from "@/lib/categorizer";
import { parseDateInput } from "@/lib/format";
import { parseAmount } from "@/lib/number";
import { normalizeCurrency } from "@/lib/currency";
import { logAudit } from "@/lib/audit";

export async function createTransaction(
  userId: string,
  data: {
    date: string;
    description: string;
    merchant?: string;
    amount: string;
    currency?: string;
    account?: string;
    paymentMethod?: string;
    categoryId?: string;
  },
) {
  const date = parseDateInput(data.date);
  const amount = parseAmount(data.amount);

  const [rules, dictionary] = await Promise.all([
    prisma.categorizationRule.findMany({ where: { userId } }),
    prisma.keywordDictionary.findMany({ where: { category: { userId } } }),
  ]);

  const suggestedCategoryId = data.categoryId
    ? data.categoryId
    : categorizeTransaction({
        description: data.description,
        merchant: data.merchant,
        rules,
        dictionary,
      });

  const tx = await prisma.transaction.create({
    data: {
      userId,
      date,
      description: data.description,
      merchant: data.merchant || null,
      amount,
      currency: normalizeCurrency(data.currency) as any,
      account: data.account || null,
      paymentMethod: data.paymentMethod || null,
      categoryId: suggestedCategoryId || null,
      source: "MANUAL",
    },
  });

  await logAudit(userId, "transaction.created", {
    amount,
    currency: data.currency,
    date: date.toISOString(),
  });

  return tx;
}

export async function deleteTransaction(userId: string, id: string) {
  await prisma.transaction.deleteMany({ where: { id, userId } });
  await logAudit(userId, "transaction.deleted", { id });
}

export async function updateTransactionCategory(
  userId: string,
  id: string,
  categoryId: string,
  saveRule: boolean,
) {
  const tx = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!tx) return null;

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { categoryId },
  });

  if (saveRule) {
    const keyword = tx.merchant || tx.description;
    await prisma.categorizationRule.create({
      data: {
        userId,
        keyword: tx.merchant ? null : keyword,
        merchant: tx.merchant ? keyword : null,
        categoryId,
        priority: 10,
      },
    });
  }

  await logAudit(userId, "transaction.recategorized", { id, categoryId, saveRule });
  return tx;
}

export async function importTransactions(
  userId: string,
  mapping: Record<string, string>,
  rows: Record<string, string>[],
  dryRun: boolean,
) {
  const [rules, dictionary, categories] = await Promise.all([
    prisma.categorizationRule.findMany({ where: { userId } }),
    prisma.keywordDictionary.findMany({ where: { category: { userId } } }),
    prisma.category.findMany({ where: { userId } }),
  ]);

  const categoryByName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category.id]),
  );

  const errors: { row: number; message: string }[] = [];

  const records = rows
    .map((row, index) => {
      const dateRaw = row[mapping.date] || "";
      const description = row[mapping.description] || "Imported transaction";
      const merchant = row[mapping.merchant] || null;
      const amountRaw = row[mapping.amount] || "0";
      const amount = parseAmount(amountRaw);
      const date = parseDateInput(dateRaw);
      if (!dateRaw || Number.isNaN(date.getTime())) {
        errors.push({ row: index + 1, message: "Invalid date" });
        return null;
      }
      if (!amountRaw || amount === 0) {
        errors.push({ row: index + 1, message: "Invalid amount" });
        return null;
      }
      const currency = normalizeCurrency(row[mapping.currency] || "MUR");
      const account = row[mapping.account] || null;
      const paymentMethod = row[mapping.paymentMethod] || null;

      const mappedCategory = row[mapping.category]?.toLowerCase().trim() || "";

      const categoryId =
        (mappedCategory && categoryByName.get(mappedCategory)) ||
        categorizeTransaction({
          description,
          merchant,
          rules,
          dictionary,
        });

      return {
        userId,
        date,
        description,
        merchant,
        amount,
        currency: currency as any,
        account,
        paymentMethod,
        categoryId,
        source: "IMPORT",
      };
    })
    .filter(Boolean);

  if (dryRun) {
    await logAudit(userId, "transactions.import_dry_run", {
      rows: rows.length,
      valid: records.length,
      errors: errors.length,
    });
    return { records, errors, count: records.length };
  }

  if (errors.length > 0) {
    return { records: [], errors, count: 0 };
  }

  await prisma.transaction.createMany({ data: records as any });
  await logAudit(userId, "transactions.import", {
    rows: rows.length,
    inserted: records.length,
  });

  return { records, errors, count: records.length };
}
