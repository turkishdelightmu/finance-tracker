export function parseAmount(value: string) {
  const cleaned = value.replace(/[,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
