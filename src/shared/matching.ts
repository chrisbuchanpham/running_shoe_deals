import {
  normalizeBrand,
  normalizeIdentifiers,
  normalizeModel,
  splitTokens
} from "./normalization";

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
  const normalizedCandidateIdentifiers = normalizeIdentifiers(candidate.identifiers);
  if (normalizedCandidateIdentifiers?.sku || normalizedCandidateIdentifiers?.gtin) {
    const exact = knownShoes.find((shoe) => {
      const normalizedShoeIdentifiers = normalizeIdentifiers(shoe.identifiers);
      const skuMatch =
        normalizedCandidateIdentifiers.sku &&
        normalizedShoeIdentifiers?.sku &&
        normalizedCandidateIdentifiers.sku === normalizedShoeIdentifiers.sku;
      const gtinMatch =
        normalizedCandidateIdentifiers.gtin &&
        normalizedShoeIdentifiers?.gtin &&
        normalizedCandidateIdentifiers.gtin === normalizedShoeIdentifiers.gtin;
      return Boolean(skuMatch || gtinMatch);
    });
    if (exact) {
      return { shoeId: exact.shoeId, confidence: 1, reason: "exact-id" };
    }
  }

  const normalizedBrand = normalizeBrand(candidate.brand);
  const normalizedModel = normalizeModel(candidate.modelRaw);
  const sameCategoryPool = knownShoes.filter((shoe) => shoe.category === candidate.category);
  const pool = normalizedBrand
    ? sameCategoryPool.filter((shoe) => normalizeBrand(shoe.brand) === normalizedBrand)
    : sameCategoryPool;
  const threshold = normalizedBrand ? 0.6 : 0.72;
  const ambiguityDelta = normalizedBrand ? 0.04 : 0.08;

  let winner: CanonicalShoeIndex | undefined;
  let winnerScore = 0;
  let runnerUpScore = 0;

  for (const shoe of pool) {
    const score = calculateFallbackConfidence(normalizedModel, shoe.model);
    if (score > winnerScore) {
      runnerUpScore = winnerScore;
      winner = shoe;
      winnerScore = score;
      continue;
    }
    if (score > runnerUpScore) {
      runnerUpScore = score;
    }
  }

  if (winner && winnerScore >= threshold && winnerScore - runnerUpScore >= ambiguityDelta) {
    return { shoeId: winner.shoeId, confidence: winnerScore, reason: "model-fallback" };
  }

  return { confidence: 0, reason: "none" };
}
