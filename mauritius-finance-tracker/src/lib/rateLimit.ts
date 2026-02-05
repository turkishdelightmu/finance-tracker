type Entry = { hits: number[] };

const store = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key) || { hits: [] };
  entry.hits = entry.hits.filter((hit) => now - hit < windowMs);
  entry.hits.push(now);
  store.set(key, entry);
  return entry.hits.length <= limit;
}
