import { describe, expect, it } from "vitest";
import { calculateMonthlyPayment, generateAmortizationSchedule } from "../src/lib/amortization";

it("calculates a monthly payment", () => {
  const payment = calculateMonthlyPayment(100000, 12, 12);
  expect(payment).toBeGreaterThan(8000);
  expect(payment).toBeLessThan(9000);
});

it("generates schedule that amortizes to zero", () => {
  const schedule = generateAmortizationSchedule(10000, 10, 12);
  const last = schedule[schedule.length - 1];
  expect(last.balance).toBeLessThanOrEqual(0.01);
});
