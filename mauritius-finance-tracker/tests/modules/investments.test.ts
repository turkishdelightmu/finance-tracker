import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  investmentAccount: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  holding: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  investmentTransaction: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { createInvestmentAccount, upsertHolding, updateHoldingPrice } from "@/domains/investments/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("investments module", () => {
  it("creates an investment account", async () => {
    prismaMock.investmentAccount.create.mockResolvedValue({ id: "a1" });

    const result = await createInvestmentAccount("u1", { name: "Broker" });

    expect(prismaMock.investmentAccount.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "a1" });
  });

  it("returns null when account is missing for holding upsert", async () => {
    prismaMock.investmentAccount.findUnique.mockResolvedValue(null);

    const result = await upsertHolding("u1", "missing", {
      symbol: "ABC",
      name: "ABC",
      quantity: "10",
      price: "5",
    });

    expect(result).toBeNull();
  });

  it("returns null when holding not owned for price update", async () => {
    prismaMock.holding.findUnique.mockResolvedValue({ id: "h1", account: { userId: "other" } });

    const result = await updateHoldingPrice("u1", "h1", 10);

    expect(result).toBeNull();
  });
});
