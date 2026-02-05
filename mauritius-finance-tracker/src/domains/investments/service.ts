import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/number";
import { logAudit } from "@/lib/audit";

export async function createInvestmentAccount(
  userId: string,
  data: { name: string; institution?: string },
) {
  const account = await prisma.investmentAccount.create({
    data: {
      userId,
      name: data.name,
      institution: data.institution || null,
    },
  });

  await logAudit(userId, "investment.account_created", { name: data.name });
  return account;
}

export async function upsertHolding(
  userId: string,
  accountId: string,
  data: { symbol: string; name: string; quantity: string; price: string },
) {
  const account = await prisma.investmentAccount.findUnique({
    where: { id: accountId, userId },
  });
  if (!account) return null;

  const quantity = parseAmount(data.quantity);
  const price = parseAmount(data.price);

  const holding = await prisma.holding.upsert({
    where: { accountId_symbol: { accountId, symbol: data.symbol } },
    create: {
      accountId,
      symbol: data.symbol,
      name: data.name,
      quantity,
      price,
      avgCost: price,
    },
    update: {
      name: data.name,
      quantity,
      price,
      avgCost: price,
    },
  });

  await prisma.investmentAccount.update({
    where: { id: accountId },
    data: { updatedAt: new Date() },
  });

  await logAudit(userId, "investment.holding_saved", { accountId, symbol: data.symbol });
  return holding;
}

export async function addInvestmentTransaction(
  userId: string,
  accountId: string,
  data: {
    type: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAW";
    symbol?: string;
    quantity?: string;
    price?: string;
    amount: string;
    date: string;
  },
) {
  const account = await prisma.investmentAccount.findUnique({
    where: { id: accountId, userId },
  });
  if (!account) return null;

  const amount = parseAmount(data.amount);
  const quantity = data.quantity ? parseAmount(data.quantity) : null;
  const price = data.price ? parseAmount(data.price) : null;

  await prisma.investmentTransaction.create({
    data: {
      accountId,
      type: data.type,
      symbol: data.symbol || null,
      quantity,
      price,
      amount,
      date: new Date(data.date),
    },
  });

  if (data.symbol && quantity && price) {
    const symbol = data.symbol;
    if (data.type === "BUY" || data.type === "SELL") {
      const existing = await prisma.holding.findUnique({
        where: { accountId_symbol: { accountId, symbol } },
      });
      const existingQty = existing ? Number(existing.quantity) : 0;
      const existingCost = existing ? Number(existing.avgCost) : 0;
      const delta = data.type === "SELL" ? -quantity : quantity;
      const newQty = Math.max(existingQty + delta, 0);
      const newAvgCost =
        data.type === "BUY"
          ? (existingQty * existingCost + quantity * price) / Math.max(newQty, 1)
          : existingCost;

      await prisma.holding.upsert({
        where: { accountId_symbol: { accountId, symbol } },
        create: {
          accountId,
          symbol,
          name: symbol,
          quantity: newQty,
          price,
          avgCost: newAvgCost,
        },
        update: {
          quantity: newQty,
          price,
          avgCost: newAvgCost,
        },
      });
    }
  }

  await logAudit(userId, "investment.transaction", {
    accountId,
    type: data.type,
    symbol: data.symbol,
    amount,
  });
  return account;
}

export async function updateHoldingPrice(userId: string, holdingId: string, priceValue: number) {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
    include: { account: true },
  });
  if (!holding || holding.account.userId !== userId) return null;

  const updated = await prisma.holding.update({
    where: { id: holdingId },
    data: { price: priceValue, updatedAt: new Date() },
  });

  await logAudit(userId, "investment.price_update", { holdingId, price: priceValue });
  return updated;
}
