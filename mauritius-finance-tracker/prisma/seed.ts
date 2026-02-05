import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { defaultCategories, defaultKeywordMap } from "../src/lib/defaults";

const shouldUseNeon = (process.env.DATABASE_URL || "").includes("neon.tech");

const prisma = new PrismaClient({
  ...(shouldUseNeon
    ? {
        adapter: new PrismaNeon({
          connectionString: process.env.DATABASE_URL || "",
        }),
      }
    : {}),
});

async function main() {
  if (process.env.ENABLE_DEMO_USER !== "true") {
    return;
  }
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@mauritius.mu" },
    update: {},
    create: {
      email: "demo@mauritius.mu",
      passwordHash,
      name: "Demo User",
    },
  });

  await prisma.category.deleteMany({ where: { userId: user.id } });

  const categories = await prisma.$transaction(
    defaultCategories.map((category) =>
      prisma.category.create({
        data: {
          userId: user.id,
          name: category.name,
          color: category.color,
        },
      }),
    ),
  );

  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  await prisma.keywordDictionary.deleteMany({
    where: { category: { userId: user.id } },
  });

  await prisma.$transaction(
    defaultKeywordMap.map((entry) =>
      prisma.keywordDictionary.create({
        data: {
          keyword: entry.keyword,
          categoryId: categoryByName.get(entry.category)!.id,
          isGlobal: true,
        },
      }),
    ),
  );

  await prisma.transaction.deleteMany({ where: { userId: user.id } });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        date: new Date(),
        description: "Winners groceries",
        merchant: "Winners",
        amount: 1250,
        currency: "MUR",
        categoryId: categoryByName.get("Groceries")!.id,
        source: "MANUAL",
      },
      {
        userId: user.id,
        date: new Date(),
        description: "CEB utility bill",
        merchant: "CEB",
        amount: 950,
        currency: "MUR",
        categoryId: categoryByName.get("Utilities")!.id,
        source: "MANUAL",
      },
    ],
  });

  await prisma.bill.deleteMany({ where: { userId: user.id } });
  await prisma.bill.create({
    data: {
      userId: user.id,
      name: "CWA Water",
      expectedAmount: 420,
      frequency: "MONTHLY",
      dueDay: 12,
      nextDueDate: new Date(),
      active: true,
    },
  });

  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Emergency Fund",
      targetAmount: 50000,
      targetDate: new Date(new Date().getFullYear(), 11, 31),
      currentAmount: 12000,
    },
  });

  await prisma.loan.deleteMany({ where: { userId: user.id } });
  await prisma.loan.create({
    data: {
      userId: user.id,
      name: "Car Loan",
      principal: 300000,
      apr: 7.5,
      termMonths: 60,
      paymentDay: 5,
      monthlyPayment: 6000,
      currentBalance: 240000,
    },
  });

  await prisma.investmentAccount.deleteMany({ where: { userId: user.id } });
  const account = await prisma.investmentAccount.create({
    data: {
      userId: user.id,
      name: "Local Broker",
      institution: "MCB Stockbrokers",
    },
  });

  await prisma.holding.create({
    data: {
      accountId: account.id,
      symbol: "ENL",
      name: "ENL Ltd",
      quantity: 120,
      price: 18.5,
      avgCost: 16.2,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
