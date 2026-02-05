import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  loan: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  loanPayment: { create: vi.fn() },
  transaction: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { createLoan, recordLoanPayment } from "@/domains/loans/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loans module", () => {
  it("creates a loan", async () => {
    prismaMock.loan.create.mockResolvedValue({ id: "l1" });

    const result = await createLoan("u1", {
      name: "Car",
      principal: "10000",
      apr: "10",
      termMonths: "12",
      paymentDay: "5",
      monthlyPayment: "900",
      currentBalance: "9000",
    });

    expect(prismaMock.loan.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "l1" });
  });

  it("returns null when loan payment is recorded for missing loan", async () => {
    prismaMock.loan.findFirst.mockResolvedValue(null);

    const result = await recordLoanPayment("u1", "missing", false);

    expect(result).toBeNull();
  });
});
