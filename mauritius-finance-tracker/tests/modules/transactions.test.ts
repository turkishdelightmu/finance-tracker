import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  transaction: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    createMany: vi.fn(),
  },
  categorizationRule: { findMany: vi.fn(), create: vi.fn() },
  keywordDictionary: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import {
  createTransaction,
  deleteTransaction,
  updateTransactionCategory,
  importTransactions,
} from "@/domains/transactions/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transactions module", () => {
  it("creates a transaction with auto categorization", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([]);
    prismaMock.keywordDictionary.findMany.mockResolvedValue([]);
    prismaMock.transaction.create.mockResolvedValue({ id: "tx1" });

    const result = await createTransaction("u1", {
      date: "05/02/2026",
      description: "Lunch",
      amount: "120",
      currency: "MUR",
    });

    expect(prismaMock.transaction.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "tx1" });
  });

  it("returns null when recategorizing a missing transaction", async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    const result = await updateTransactionCategory("u1", "missing", "cat1", true);

    expect(result).toBeNull();
  });

  it("dry-run import returns errors for invalid rows", async () => {
    prismaMock.categorizationRule.findMany.mockResolvedValue([]);
    prismaMock.keywordDictionary.findMany.mockResolvedValue([]);
    prismaMock.category.findMany.mockResolvedValue([]);

    const result = await importTransactions(
      "u1",
      { date: "d", description: "desc", amount: "amt" },
      [{ d: "", desc: "Test", amt: "0" }],
      true,
    );

    expect(result.errors.length).toBeGreaterThan(0);
  });
});
