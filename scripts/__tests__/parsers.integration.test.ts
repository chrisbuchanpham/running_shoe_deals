import { describe, expect, it } from "vitest";
import { parsers } from "../parsers";
import { offerSchema } from "../../src/shared/contracts";
import { inferCategory, inferGender, normalizeModel } from "../../src/shared/normalization";
import { computeDiscountPct } from "../../src/shared/discount";

describe("retailer parsers", () => {
  it("returns at least one offer from fixture for every parser", async () => {
    for (const parser of parsers) {
      parser.config.allowScrape = false;
      const result = await parser.fetchOffers();
      expect(result.offers.length).toBeGreaterThan(0);

      const first = result.offers[0];
      offerSchema.parse({
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
      });
    }
  });
});
