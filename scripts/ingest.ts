import path from "node:path";
import { performance } from "node:perf_hooks";
import { RETAILERS } from "./config/retailers";
import { parsers } from "./parsers";
import { stableId } from "./lib/hash";
import { readJsonFile, writeJsonFile } from "./lib/files";
import {
  extractSizeRange,
  isLikelyShoeOffer,
  normalizeOfferText
} from "./lib/shoeOfferQuality";
import {
  dealsFileSchema,
  metadataSchema,
  offersFileSchema,
  retailersFileSchema,
  shoesFileSchema,
  type DealCard,
  type Metadata,
  type Offer,
  type ParserHealth,
  type Retailer,
  type ShoeCanonical
} from "../src/shared/contracts";
import { computeDiscountPct } from "../src/shared/discount";
import {
  extractBrand,
  inferCategory,
  inferGender,
  normalizeBrand,
  normalizeIdentifiers,
  normalizeModel,
  normalizeToken
} from "../src/shared/normalization";
import { resolveShoeMatch, type CanonicalShoeIndex } from "../src/shared/matching";
import type { RawRetailerOffer } from "./parsers/types";

type ManualOverrides = {
  forceCategoryByToken: { token: string; category: "running" | "trail" }[];
  offerPatches: Array<{
    offerId: string;
    set: Partial<Offer>;
  }>;
};

type WorkingOffer = Offer & {
  identifiers?: {
    sku?: string;
    gtin?: string;
  };
};

const TRACKING_QUERY_PARAM = /^(utm_|fbclid$|gclid$|ref$|referrer$|mc_eid$|mc_cid$)/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDataPath(rootDir: string, ...parts: string[]): string {
  return path.resolve(rootDir, ...parts);
}

function normalizeCategory(
  raw: RawRetailerOffer,
  title: string,
  overrides: ManualOverrides
): "running" | "trail" {
  const forced = overrides.forceCategoryByToken.find((rule) =>
    normalizeToken(title).includes(normalizeToken(rule.token))
  );
  if (forced) return forced.category;
  if (raw.category) return raw.category;
  return inferCategory(title);
}

function scoreSourceConfidence(raw: RawRetailerOffer, usedFixture: boolean): number {
  let score = 0.45;
  if (raw.brand) score += 0.1;
  if (raw.modelRaw) score += 0.1;
  if (raw.identifiers?.sku || raw.identifiers?.gtin) score += 0.2;
  if (raw.priceOriginal && raw.priceOriginal > raw.priceCurrent) score += 0.1;
  if (usedFixture) score -= 0.1;
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function canonicalizeOfferUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const normalizedPath = (parsed.pathname.replace(/\/+$/g, "") || "/").toLowerCase();
    const entries = [...parsed.searchParams.entries()]
      .filter(([key]) => !TRACKING_QUERY_PARAM.test(key))
      .map(([key, value]) => [key.toLowerCase(), value.trim()] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
        return leftKey.localeCompare(rightKey);
      });

    const search = new URLSearchParams();
    for (const [key, value] of entries) {
      search.append(key, value);
    }
    const queryString = search.toString();

    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
  } catch {
    return rawUrl.trim().replace(/\/+$/g, "").toLowerCase();
  }
}

function enrichCanonicalShoe(shoe: ShoeCanonical, offer: WorkingOffer): void {
  if (!shoe.aliases.includes(offer.modelNormalized)) {
    shoe.aliases.push(offer.modelNormalized);
  }

  if (!shoe.identifiers.sku && offer.identifiers?.sku) {
    shoe.identifiers.sku = offer.identifiers.sku;
  }
  if (!shoe.identifiers.gtin && offer.identifiers?.gtin) {
    shoe.identifiers.gtin = offer.identifiers.gtin;
  }
}

function toWorkingOffer(
  retailerId: string,
  raw: RawRetailerOffer,
  scrapedAt: string,
  usedFixture: boolean,
  overrides: ManualOverrides
): WorkingOffer {
  const cleanedTitle = normalizeOfferText(raw.titleRaw);
  const cleanedModel = raw.modelRaw ? normalizeOfferText(raw.modelRaw) : undefined;
  const modelSource = cleanedModel ?? cleanedTitle;
  const { cleaned: cleanedModelSource, sizeRange: extractedSizeRange } = extractSizeRange(modelSource);
  const brand = normalizeBrand(raw.brand ?? extractBrand(cleanedTitle));
  const modelNormalized = normalizeModel(cleanedModelSource);
  const category = normalizeCategory(raw, cleanedTitle, overrides);
  const identifiers = normalizeIdentifiers(raw.identifiers);
  const discountPct = computeDiscountPct(raw.priceCurrent, raw.priceOriginal);

  const offerId = stableId(
    "ofr",
    retailerId,
    raw.url,
    modelNormalized,
    raw.priceCurrent.toFixed(2),
    identifiers?.sku ?? "",
    identifiers?.gtin ?? ""
  );

  return {
    id: offerId,
    retailerId,
    url: raw.url,
    titleRaw: cleanedTitle,
    brand,
    modelNormalized,
    gender: raw.gender ?? inferGender(cleanedTitle),
    category,
    colorway: raw.colorway,
    sizeRange: raw.sizeRange ?? extractedSizeRange,
    priceCurrent: raw.priceCurrent,
    priceOriginal: raw.priceOriginal,
    discountPct,
    inStock: raw.inStock,
    scrapedAt,
    sourceConfidence: scoreSourceConfidence(raw, usedFixture),
    identifiers
  };
}

function dedupeOffers(offers: WorkingOffer[]): WorkingOffer[] {
  const seen = new Set<string>();
  const output: WorkingOffer[] = [];
  for (const offer of offers) {
    const key = [
      offer.retailerId,
      canonicalizeOfferUrl(offer.url),
      offer.modelNormalized,
      offer.category,
      offer.gender ?? "",
      offer.sizeRange ?? "",
      offer.identifiers?.sku ?? "",
      offer.identifiers?.gtin ?? "",
      offer.priceCurrent.toFixed(2)
    ].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      output.push(offer);
    }
  }
  return output;
}

function applyOfferPatches(offers: WorkingOffer[], overrides: ManualOverrides): WorkingOffer[] {
  if (overrides.offerPatches.length === 0) return offers;
  const patchMap = new Map(overrides.offerPatches.map((patch) => [patch.offerId, patch.set]));
  return offers.map((offer) => {
    const patch = patchMap.get(offer.id);
    return patch ? { ...offer, ...patch } : offer;
  });
}

function materializeShoesAndDeals(offers: WorkingOffer[]): {
  shoes: ShoeCanonical[];
  deals: DealCard[];
} {
  const shoes: ShoeCanonical[] = [];
  const shoesById = new Map<string, ShoeCanonical>();
  const shoeIndex: CanonicalShoeIndex[] = [];
  const offerToShoe = new Map<string, string>();

  for (const offer of offers) {
    const match = resolveShoeMatch(
      {
        brand: offer.brand,
        modelRaw: offer.modelNormalized,
        category: offer.category,
        identifiers: offer.identifiers
      },
      shoeIndex
    );

    if (match.shoeId) {
      offerToShoe.set(offer.id, match.shoeId);
      const matchedShoe = shoesById.get(match.shoeId);
      if (matchedShoe) {
        enrichCanonicalShoe(matchedShoe, offer);
      }
      offer.sourceConfidence = Math.max(
        offer.sourceConfidence,
        Math.round(((offer.sourceConfidence + match.confidence) / 2) * 100) / 100
      );
      continue;
    }

    const shoeId = stableId(
      "shoe",
      offer.brand ?? "unknown",
      offer.modelNormalized,
      offer.category,
      offer.identifiers?.sku ?? "",
      offer.identifiers?.gtin ?? ""
    );

    const shoe: ShoeCanonical = {
      shoeId,
      brand: offer.brand ?? "Unknown",
      model: offer.modelNormalized,
      category: offer.category,
      aliases: [offer.modelNormalized],
      identifiers: {
        sku: offer.identifiers?.sku,
        gtin: offer.identifiers?.gtin
      },
      matchRulesVersion: "v1-hybrid-exact-fallback"
    };
    shoes.push(shoe);
    shoesById.set(shoeId, shoe);
    shoeIndex.push({
      shoeId,
      brand: shoe.brand,
      model: shoe.model,
      category: shoe.category,
      identifiers: shoe.identifiers
    });
    offerToShoe.set(offer.id, shoeId);
  }

  const grouped = new Map<string, WorkingOffer[]>();
  for (const offer of offers) {
    const shoeId = offerToShoe.get(offer.id);
    if (!shoeId) continue;
    const list = grouped.get(shoeId) ?? [];
    list.push(offer);
    grouped.set(shoeId, list);
  }

  const deals: DealCard[] = [];
  for (const [shoeId, shoeOffers] of grouped.entries()) {
    const sortedByPrice = [...shoeOffers].sort((a, b) => a.priceCurrent - b.priceCurrent);
    const best = sortedByPrice[0];
    const updatedAt =
      [...shoeOffers]
        .map((offer) => offer.scrapedAt)
        .sort((a, b) => (a > b ? -1 : 1))
        .at(0) ?? new Date().toISOString();

    const maxDiscountPct = shoeOffers
      .map((offer) => offer.discountPct ?? 0)
      .reduce((max, current) => Math.max(max, current), 0);

    deals.push({
      shoeId,
      bestOfferId: best.id,
      bestPrice: best.priceCurrent,
      offersCount: shoeOffers.length,
      maxDiscountPct: maxDiscountPct > 0 ? Math.round(maxDiscountPct * 100) / 100 : undefined,
      updatedAt
    });
  }

  deals.sort((a, b) => b.bestPrice - a.bestPrice);
  shoes.sort((a, b) => a.model.localeCompare(b.model));
  return { shoes, deals };
}

export async function runIngestion(options?: {
  rootDir?: string;
  writeFiles?: boolean;
  fixtureOnly?: boolean;
}): Promise<{
  retailers: Retailer[];
  offers: Offer[];
  shoes: ShoeCanonical[];
  deals: DealCard[];
  metadata: Metadata;
}> {
  const rootDir = options?.rootDir ?? process.cwd();
  const writeFiles = options?.writeFiles ?? true;
  const fixtureOnly = options?.fixtureOnly ?? false;

  const disabledParsers = new Set(
    await readJsonFile<string[]>(
      buildDataPath(rootDir, "scripts", "config", "disabled-parsers.json")
    )
  );
  const overrides = await readJsonFile<ManualOverrides>(
    buildDataPath(rootDir, "data", "manual_overrides.json")
  );

  const parserHealth: ParserHealth[] = [];
  const warnings: string[] = [];
  const allOffers: WorkingOffer[] = [];
  for (let index = 0; index < parsers.length; index += 1) {
    const parser = parsers[index];
    if (index > 0) {
      await sleep(250);
    }
    const originalAllowScrape = parser.config.allowScrape;
    if (fixtureOnly) {
      parser.config.allowScrape = false;
    }
    const start = performance.now();

    if (disabledParsers.has(parser.config.parserId)) {
      parserHealth.push({
        retailerId: parser.config.id,
        status: "disabled",
        offersCount: 0,
        warning: "Parser disabled via config.",
        durationMs: Math.round(performance.now() - start),
        discoveredCount: 0,
        parsedCount: 0,
        pagesCrawled: 0
      });
      parser.config.allowScrape = originalAllowScrape;
      continue;
    }

    try {
      const result = await parser.fetchOffers();
      const scrapedAt = new Date().toISOString();

      const normalized = result.offers
        .filter((raw) => raw.priceCurrent > 0 && raw.url)
        .filter((raw) =>
          isLikelyShoeOffer({
            title: raw.titleRaw,
            model: raw.modelRaw,
            url: raw.url,
            category: raw.category
          })
        )
        .map((raw) =>
          toWorkingOffer(parser.config.id, raw, scrapedAt, result.usedFixture, overrides)
        );

      allOffers.push(...normalized);

      parserHealth.push({
        retailerId: parser.config.id,
        status: result.sourceMode === "fixture" ? "failed" : "ok",
        offersCount: normalized.length,
        warning: result.warning,
        durationMs: Math.round(performance.now() - start),
        discoveredCount: result.discoveredCount,
        parsedCount: result.parsedCount,
        pagesCrawled: result.pagesCrawled,
        sourceMode: result.sourceMode
      });

      if (result.warning) {
        warnings.push(`${parser.config.id}: ${result.warning}`);
      }
    } catch (error) {
      parserHealth.push({
        retailerId: parser.config.id,
        status: "failed",
        offersCount: 0,
        warning: error instanceof Error ? error.message : "Unknown parser failure.",
        durationMs: Math.round(performance.now() - start)
      });
      warnings.push(`${parser.config.id}: parser failed.`);
    } finally {
      parser.config.allowScrape = originalAllowScrape;
    }
  }

  const deduped = applyOfferPatches(dedupeOffers(allOffers), overrides);
  const { shoes, deals } = materializeShoesAndDeals(deduped);

  const offers: Offer[] = deduped.map((offer) => {
    const { identifiers, ...rest } = offer;
    void identifiers;
    return rest;
  });
  const retailers: Retailer[] = retailersFileSchema.parse(
    RETAILERS.map((retailer) => {
      const crawlRecord = parserHealth.find((p) => p.retailerId === retailer.id);
      return {
        id: retailer.id,
        name: retailer.name,
        country: retailer.country,
        currency: retailer.currency,
        homepageUrl: retailer.homepageUrl,
        logoUrl: retailer.logoUrl,
        shippingNotes: retailer.shippingNotes,
        lastCrawledAt:
          crawlRecord?.status === "ok" ? new Date().toISOString() : retailer.lastCrawledAt
      };
    })
  );

  const now = new Date();
  const newestScrape = offers
    .map((offer) => new Date(offer.scrapedAt).getTime())
    .reduce((max, value) => Math.max(max, value), 0);
  const staleAfterHours = 36;
  const stale = newestScrape === 0 ? true : now.getTime() - newestScrape > staleAfterHours * 3600_000;

  const metadata: Metadata = {
    generatedAt: now.toISOString(),
    staleAfterHours,
    stale,
    counts: {
      retailers: retailers.length,
      offers: offers.length,
      shoes: shoes.length,
      deals: deals.length
    },
    parserHealth,
    warnings
  };

  offersFileSchema.parse(offers);
  shoesFileSchema.parse(shoes);
  dealsFileSchema.parse(deals);
  metadataSchema.parse(metadata);

  if (writeFiles) {
    await writeJsonFile(buildDataPath(rootDir, "public", "data", "retailers.json"), retailers);
    await writeJsonFile(buildDataPath(rootDir, "public", "data", "offers.json"), offers);
    await writeJsonFile(buildDataPath(rootDir, "public", "data", "shoes.json"), shoes);
    await writeJsonFile(buildDataPath(rootDir, "public", "data", "deals.json"), deals);
    await writeJsonFile(buildDataPath(rootDir, "public", "data", "metadata.json"), metadata);
  }

  console.log(
    `[ingest] wrote ${offers.length} offers, ${shoes.length} shoes, ${deals.length} deals`
  );

  return { retailers, offers, shoes, deals, metadata };
}

if (process.env.VITEST !== "true") {
  runIngestion().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
