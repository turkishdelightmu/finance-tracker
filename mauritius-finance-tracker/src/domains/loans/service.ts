import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/number";
import { generateAmortizationSchedule } from "@/lib/amortization";
import { logAudit } from "@/lib/audit";

export async function createLoan(
  userId: string,
  data: {
    name: string;
    principal: string;
    apr: string;
    termMonths: string;
    paymentDay: string;
    monthlyPayment: string;
    currentBalance: string;
  },
) {
  const loan = await prisma.loan.create({
    data: {
      userId,
      name: data.name,
      principal: parseAmount(data.principal),
      apr: parseAmount(data.apr),
      termMonths: Number(data.termMonths),
      paymentDay: Number(data.paymentDay),
      monthlyPayment: parseAmount(data.monthlyPayment),
      currentBalance: parseAmount(data.currentBalance),
    },
  });

  await logAudit(userId, "loan.created", { name: data.name });
  return loan;
}

export async function recordLoanPayment(
  userId: string,
  loanId: string,
  createTx: boolean,
) {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
  if (!loan) return null;

  const schedule = generateAmortizationSchedule(
    Number(loan.currentBalance),
    Number(loan.apr),
    loan.termMonths,
    Number(loan.monthlyPayment),
  );

  const nextRow = schedule[0];
  if (!nextRow) return null;

  let transactionId: string | null = null;
  if (createTx) {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        date: new Date(),
        description: `Loan payment: ${loan.name}`,
        amount: nextRow.payment,
        currency: "MUR",
        source: "LOAN",
      },
    });
    transactionId = tx.id;
  }

  await prisma.loanPayment.create({
    data: {
      userId,
      loanId: loan.id,
      amount: nextRow.payment,
      date: new Date(),
      principalPaid: nextRow.principal,
      interestPaid: nextRow.interest,
      status: "PAID",
      transactionId,
    },
  });

  await prisma.loan.update({
    where: { id: loan.id },
    data: { currentBalance: nextRow.balance },
  });

  await logAudit(userId, "loan.payment", { loanId: loan.id, amount: nextRow.payment, createTx });
  return loan;
}

export async function overrideLoanBalance(userId: string, loanId: string, balance: number) {
  await prisma.loan.updateMany({ where: { id: loanId, userId }, data: { currentBalance: balance } });
  await logAudit(userId, "loan.balance_override", { loanId, balance });
}
