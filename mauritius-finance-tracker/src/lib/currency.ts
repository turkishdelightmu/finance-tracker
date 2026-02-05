import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/constants";

export function normalizeCurrency(value?: string | null) {
  const upper = (value || "").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(upper as any) ? upper : DEFAULT_CURRENCY;
}
