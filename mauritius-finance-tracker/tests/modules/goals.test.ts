import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  goal: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  contribution: { create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { addContribution, createGoal } from "@/domains/goals/service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("goals module", () => {
  it("creates a goal", async () => {
    prismaMock.goal.create.mockResolvedValue({ id: "g1" });

    const result = await createGoal("u1", {
      name: "Emergency",
      targetAmount: "5000",
      targetDate: "2026-12-31",
    });

    expect(prismaMock.goal.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "g1" });
  });

  it("returns null when contributing to missing goal", async () => {
    prismaMock.goal.findFirst.mockResolvedValue(null);

    const result = await addContribution("u1", "missing", 50);

    expect(result).toBeNull();
  });
});
