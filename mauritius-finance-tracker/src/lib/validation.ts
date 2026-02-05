import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: "Password must include a letter and a number.",
    }),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const transactionSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  merchant: z.string().optional(),
  amount: z.string().min(1),
  currency: z.string().default("MUR"),
  account: z.string().optional(),
  paymentMethod: z.string().optional(),
  categoryId: z.string().optional(),
});

export const billSchema = z.object({
  name: z.string().min(1),
  expectedAmount: z.string().min(1),
  frequency: z.enum(["ONCE", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  dueDay: z.string().optional(),
  dueDate: z.string().optional(),
  nextDueDate: z.string().min(1),
  active: z.string().optional(),
});

export const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.string().min(1),
  targetDate: z.string().min(1),
  currentAmount: z.string().optional(),
});

export const loanSchema = z.object({
  name: z.string().min(1),
  principal: z.string().min(1),
  apr: z.string().min(1),
  termMonths: z.string().min(1),
  paymentDay: z.string().min(1),
  monthlyPayment: z.string().min(1),
  currentBalance: z.string().min(1),
});

export const investmentAccountSchema = z.object({
  name: z.string().min(1),
  institution: z.string().optional(),
});

export const holdingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string().min(1),
  price: z.string().min(1),
});

export const investmentTxSchema = z.object({
  type: z.enum(["BUY", "SELL", "DIVIDEND", "DEPOSIT", "WITHDRAW"]),
  symbol: z.string().optional(),
  quantity: z.string().optional(),
  price: z.string().optional(),
  amount: z.string().min(1),
  date: z.string().min(1),
});
