import { describe, expect, it } from "vitest";
import { parsers } from "../parsers";
import { offerSchema, parserHealthSchema } from "../../src/shared/contracts";
import { inferCategory, inferGender, normalizeModel } from "../../src/shared/normalization";
import { computeDiscountPct } from "../../src/shared/discount";

describe("retailer parsers", () => {
  it("returns at least one offer from fixture for every parser", async () => {
    for (const parser of parsers) {
      parser.config.allowScrape = false;
      const result = await parser.fetchOffers();
      expect(result.offers.length).toBeGreaterThan(0);
      expect(result.sourceMode).toBe("fixture");
      expect(result.pagesCrawled).toBe(0);
      expect(result.discoveredCount).toBeGreaterThan(0);
      expect(result.parsedCount).toBeGreaterThan(0);
      const parserHealth = parserHealthSchema.parse({
        retailerId: parser.config.id,
        status: "failed",
        offersCount: result.offers.length,
        durationMs: 1,
        discoveredCount: result.discoveredCount,
        parsedCount: result.parsedCount,
        pagesCrawled: result.pagesCrawled,
        sourceMode: result.sourceMode,
        executionPath: "fixture"
      });
      expect(parserHealth.executionPath).toBe("fixture");

      const first = result.offers[0];
      const baseOffer = {
        id: "dummy",
        retailerId: parser.config.id,
        url: first.url,
        titleRaw: first.titleRaw,
        brand: first.brand,
        modelNormalized: normalizeModel(first.modelRaw ?? first.titleRaw),
        gender: first.gender ?? inferGender(first.titleRaw),
        category: first.category ?? inferCategory(first.titleRaw),
        priceCurrent: first.priceCurrent,
        priceOriginal: first.priceOriginal,
        discountPct: computeDiscountPct(first.priceCurrent, first.priceOriginal),
        inStock: first.inStock,
        scrapedAt: new Date().toISOString(),
        sourceConfidence: 0.7
      };
      const parsedOffer = offerSchema.parse({ ...baseOffer, sizeRange: first.sizeRange });
      expect(parsedOffer.sizeRange).toBe(first.sizeRange);
      const parsedOfferWithSizeRange = offerSchema.parse({ ...baseOffer, sizeRange: "M 8-12" });
      expect(parsedOfferWithSizeRange.sizeRange).toBe("M 8-12");
    }
  });

  it("accepts browser and http execution paths in parser health contracts", () => {
    const browserHealth = parserHealthSchema.parse({
      retailerId: "browser-retailer",
      status: "ok",
      offersCount: 1,
      durationMs: 1,
      discoveredCount: 1,
      parsedCount: 1,
      pagesCrawled: 1,
      sourceMode: "live",
      executionPath: "browser"
    });
    const httpHealth = parserHealthSchema.parse({
      retailerId: "http-retailer",
      status: "ok",
      offersCount: 1,
      durationMs: 1,
      discoveredCount: 1,
      parsedCount: 1,
      pagesCrawled: 1,
      sourceMode: "live",
      executionPath: "http"
    });
    expect(browserHealth.executionPath).toBe("browser");
    expect(httpHealth.executionPath).toBe("http");
  });
});
