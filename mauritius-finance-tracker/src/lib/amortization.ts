export type AmortizationRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export function calculateMonthlyPayment(
  principal: number,
  apr: number,
  termMonths: number,
) {
  const rate = apr / 100 / 12;
  if (rate === 0) return principal / termMonths;
  const numerator = rate * Math.pow(1 + rate, termMonths);
  const denominator = Math.pow(1 + rate, termMonths) - 1;
  return principal * (numerator / denominator);
}

export function generateAmortizationSchedule(
  principal: number,
  apr: number,
  termMonths: number,
  monthlyPayment?: number,
) {
  const payment = monthlyPayment ?? calculateMonthlyPayment(principal, apr, termMonths);
  const schedule: AmortizationRow[] = [];
  let balance = principal;
  const rate = apr / 100 / 12;

  for (let i = 1; i <= termMonths; i += 1) {
    const interest = balance * rate;
    const principalPaid = Math.min(payment - interest, balance);
    balance = Math.max(balance - principalPaid, 0);

    schedule.push({
      month: i,
      payment: round(payment),
      principal: round(principalPaid),
      interest: round(interest),
      balance: round(balance),
    });

    if (balance <= 0) break;
  }

  return schedule;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
