const BRAND_ALIASES: Record<string, string> = {
  "asics": "ASICS",
  "new balance": "New Balance",
  "nb": "New Balance",
  "brooks": "Brooks",
  "adidas": "adidas",
  "nike": "Nike",
  "hoka": "HOKA",
  "saucony": "Saucony"
};

const MODEL_ALIASES: Record<string, string> = {
  "gel kayano 30": "gel-kayano-30",
  "gel-kayano 30": "gel-kayano-30",
  "gelkayano 30": "gel-kayano-30",
  "pegasus 41": "pegasus-41",
  "fresh foam 1080 v13": "fresh-foam-1080-v13"
};

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeToken(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBrand(rawBrand?: string): string | undefined {
  if (!rawBrand) return undefined;
  const normalized = normalizeToken(rawBrand);
  return BRAND_ALIASES[normalized] ?? normalizeWhitespace(rawBrand);
}

export function normalizeModel(rawModel: string): string {
  const normalized = normalizeToken(rawModel);
  const alias = MODEL_ALIASES[normalized];
  if (alias) return alias;
  return normalized.replace(/\s+/g, "-");
}

export function splitTokens(raw: string): string[] {
  return normalizeToken(raw)
    .split(" ")
    .filter(Boolean);
}

export function inferCategory(title: string): "running" | "trail" {
  const tokenized = normalizeToken(title);
  return tokenized.includes("trail") ? "trail" : "running";
}

export function inferGender(
  title: string
): "men" | "women" | "unisex" | "kids" | undefined {
  const tokenized = normalizeToken(title);
  if (/\b(women|womens|women's)\b/.test(tokenized)) return "women";
  if (/\b(men|mens|men's)\b/.test(tokenized)) return "men";
  if (/\b(kids|youth|junior)\b/.test(tokenized)) return "kids";
  if (/\bunisex\b/.test(tokenized)) return "unisex";
  return undefined;
}

export function extractBrand(title: string): string | undefined {
  const normalized = normalizeToken(title);
  for (const alias of Object.keys(BRAND_ALIASES)) {
    if (normalized.includes(alias)) {
      return BRAND_ALIASES[alias];
    }
  }
  return undefined;
}

export function normalizeForMatch(title: string): string {
  return normalizeModel(title.replace(/\b(men|women|womens|mens|trail|running)\b/gi, ""));
}
