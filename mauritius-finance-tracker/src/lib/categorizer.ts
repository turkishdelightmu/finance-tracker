type CategorizationRule = {
  priority: number;
  merchant: string | null;
  keyword: string | null;
  categoryId: string;
};

type KeywordDictionary = {
  keyword: string;
  categoryId: string;
};

function normalize(value?: string | null) {
  return value?.toLowerCase().trim() ?? "";
}

function includesKeyword(text: string, keyword: string) {
  if (!keyword) return false;
  return text.includes(keyword.toLowerCase().trim());
}

export type CategorizerInput = {
  description?: string | null;
  merchant?: string | null;
  rules: CategorizationRule[];
  dictionary: KeywordDictionary[];
};

export function categorizeTransaction(input: CategorizerInput) {
  const description = normalize(input.description);
  const merchant = normalize(input.merchant);

  const sortedRules = [...input.rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (rule.merchant && includesKeyword(merchant, rule.merchant)) {
      return rule.categoryId;
    }
    if (rule.keyword && includesKeyword(description, rule.keyword)) {
      return rule.categoryId;
    }
  }

  for (const entry of input.dictionary) {
    if (includesKeyword(merchant, entry.keyword) || includesKeyword(description, entry.keyword)) {
      return entry.categoryId;
    }
  }

  return null;
}
