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

const LOW_SIGNAL_TOKENS = new Set([
  "men",
  "mens",
  "women",
  "womens",
  "unisex",
  "kids",
  "youth",
  "junior",
  "running",
  "trail",
  "shoe",
  "shoes"
]);

type Identifiers = {
  sku?: string;
  gtin?: string;
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

export function splitTokens(
  raw: string,
  options?: { dropLowSignal?: boolean }
): string[] {
  const dropLowSignal = options?.dropLowSignal ?? true;
  const tokens = normalizeToken(raw).split(/[\s-]+/).filter(Boolean);
  if (!dropLowSignal) return tokens;
  return tokens.filter((token) => !LOW_SIGNAL_TOKENS.has(token));
}

export function normalizeSku(rawSku?: string): string | undefined {
  if (!rawSku) return undefined;
  const cleaned = normalizeToken(rawSku)
    .replace(/[\s-]+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase();
  return cleaned || undefined;
}

export function normalizeGtin(rawGtin?: string): string | undefined {
  if (!rawGtin) return undefined;
  const digits = rawGtin.replace(/\D+/g, "");
  if (!digits) return undefined;
  return digits.padStart(14, "0");
}

export function normalizeIdentifiers(rawIdentifiers?: Identifiers): Identifiers | undefined {
  if (!rawIdentifiers) return undefined;
  const sku = normalizeSku(rawIdentifiers.sku);
  const gtin = normalizeGtin(rawIdentifiers.gtin);
  return sku || gtin ? { sku, gtin } : undefined;
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
