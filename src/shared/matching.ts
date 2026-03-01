import { normalizeBrand, normalizeModel, splitTokens } from "./normalization";

export type MatchCandidate = {
  brand?: string;
  modelRaw: string;
  category: "running" | "trail";
  identifiers?: {
    sku?: string;
    gtin?: string;
  };
};

export type CanonicalShoeIndex = {
  shoeId: string;
  brand: string;
  model: string;
  category: "running" | "trail";
  identifiers?: {
    sku?: string;
    gtin?: string;
  };
};

function jaccardScore(left: string, right: string): number {
  const a = new Set(splitTokens(left));
  const b = new Set(splitTokens(right));
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function calculateFallbackConfidence(
  modelRaw: string,
  knownModel: string
): number {
  return Math.round(jaccardScore(normalizeModel(modelRaw), knownModel) * 100) / 100;
}

export function resolveShoeMatch(
  candidate: MatchCandidate,
  knownShoes: CanonicalShoeIndex[]
): { shoeId?: string; confidence: number; reason: "exact-id" | "model-fallback" | "none" } {
  if (candidate.identifiers?.sku || candidate.identifiers?.gtin) {
    const exact = knownShoes.find((shoe) => {
      const skuMatch =
        candidate.identifiers?.sku &&
        shoe.identifiers?.sku &&
        candidate.identifiers.sku === shoe.identifiers.sku;
      const gtinMatch =
        candidate.identifiers?.gtin &&
        shoe.identifiers?.gtin &&
        candidate.identifiers.gtin === shoe.identifiers.gtin;
      return Boolean(skuMatch || gtinMatch);
    });
    if (exact) {
      return { shoeId: exact.shoeId, confidence: 1, reason: "exact-id" };
    }
  }

  const normalizedBrand = normalizeBrand(candidate.brand) ?? "";
  const normalizedModel = normalizeModel(candidate.modelRaw);

  const pool = knownShoes.filter(
    (shoe) =>
      shoe.category === candidate.category &&
      normalizeBrand(shoe.brand) === normalizedBrand
  );

  let winner: CanonicalShoeIndex | undefined;
  let winnerScore = 0;

  for (const shoe of pool) {
    const score = calculateFallbackConfidence(normalizedModel, shoe.model);
    if (score > winnerScore) {
      winner = shoe;
      winnerScore = score;
    }
  }

  if (winner && winnerScore >= 0.6) {
    return { shoeId: winner.shoeId, confidence: winnerScore, reason: "model-fallback" };
  }

  return { confidence: 0, reason: "none" };
}
