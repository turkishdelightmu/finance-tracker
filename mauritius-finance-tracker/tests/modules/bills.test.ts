import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  bill: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  transaction: { create: vi.fn() },
  notification: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { createBill, markBillPaid, toggleBill } from "@/domains/bills/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bills module", () => {
  it("creates a bill", async () => {
    prismaMock.bill.create.mockResolvedValue({ id: "b1" });

    const result = await createBill("u1", {
      name: "CWA",
      expectedAmount: "100",
      frequency: "MONTHLY",
      nextDueDate: "05/02/2026",
    });

    expect(prismaMock.bill.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "b1" });
  });

  it("returns null when marking a missing bill as paid", async () => {
    prismaMock.bill.findFirst.mockResolvedValue(null);

    const result = await markBillPaid("u1", "missing", false);

    expect(result).toBeNull();
  });

  it("toggles bill active status", async () => {
    prismaMock.bill.findFirst.mockResolvedValue({ id: "b2", active: true, name: "CEB" });
    prismaMock.bill.update.mockResolvedValue({ id: "b2", active: false });

    const result = await toggleBill("u1", "b2");

    expect(prismaMock.bill.update).toHaveBeenCalled();
    expect(result).toEqual({ id: "b2", active: true, name: "CEB" });
  });
});
