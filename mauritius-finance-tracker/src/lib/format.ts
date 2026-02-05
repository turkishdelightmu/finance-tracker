import { DateTime } from "luxon";
import { DEFAULT_CURRENCY, DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE } from "@/lib/constants";

export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date) {
  return DateTime.fromJSDate(date).setZone(DEFAULT_TIMEZONE).toFormat(DEFAULT_DATE_FORMAT);
}

export function parseDateInput(value: string) {
  const trimmed = value.trim();
  const fromFormat = DateTime.fromFormat(trimmed, DEFAULT_DATE_FORMAT, {
    zone: DEFAULT_TIMEZONE,
  });
  if (fromFormat.isValid) return fromFormat.toJSDate();
  const fromIso = DateTime.fromISO(trimmed, { zone: DEFAULT_TIMEZONE });
  if (fromIso.isValid) return fromIso.toJSDate();
  return new Date(trimmed);
}

export function startOfMonth(date: Date) {
  return DateTime.fromJSDate(date).setZone(DEFAULT_TIMEZONE).startOf("month").toJSDate();
}

export function endOfMonth(date: Date) {
  return DateTime.fromJSDate(date).setZone(DEFAULT_TIMEZONE).endOf("month").toJSDate();
}

export function addMonths(date: Date, months: number) {
  return DateTime.fromJSDate(date).setZone(DEFAULT_TIMEZONE).plus({ months }).toJSDate();
}

export function todayInMauritius() {
  return DateTime.now().setZone(DEFAULT_TIMEZONE);
}
