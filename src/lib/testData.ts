import type { Dataset } from "./dataLoader";

export function buildTestDataset(): Dataset {
  return {
    retailers: [
      {
        id: "nike-ca",
        name: "Nike Canada",
        country: "CA",
        currency: "CAD",
        homepageUrl: "https://www.nike.com/ca",
        logoUrl: "https://www.nike.com/favicon.ico",
        lastCrawledAt: "2026-03-01T12:00:00.000Z"
      },
      {
        id: "asics-ca",
        name: "ASICS Canada",
        country: "CA",
        currency: "CAD",
        homepageUrl: "https://www.asics.com/ca/en-ca",
        logoUrl: "https://www.asics.com/favicon.ico",
        lastCrawledAt: "2026-03-01T12:00:00.000Z"
      }
    ],
    offers: [
      {
        id: "offer-1",
        retailerId: "nike-ca",
        url: "https://example.com/nike",
        titleRaw: "Nike Pegasus 41 Men's Running Shoes",
        brand: "Nike",
        modelNormalized: "pegasus-41",
        gender: "men",
        category: "running",
        sizeRange: "M 8-13",
        priceCurrent: 159.99,
        priceOriginal: 189.99,
        discountPct: 15.79,
        inStock: true,
        scrapedAt: "2026-03-01T12:00:00.000Z",
        sourceConfidence: 0.92
      },
      {
        id: "offer-2",
        retailerId: "asics-ca",
        url: "https://example.com/asics",
        titleRaw: "ASICS Gel-Kayano 30",
        brand: "ASICS",
        modelNormalized: "gel-kayano-30",
        gender: "women",
        category: "running",
        sizeRange: "W 6-11",
        priceCurrent: 179.99,
        priceOriginal: 229.99,
        discountPct: 21.74,
        inStock: true,
        scrapedAt: "2026-03-01T12:00:00.000Z",
        sourceConfidence: 0.88
      }
    ],
    shoes: [
      {
        shoeId: "shoe-1",
        brand: "Nike",
        model: "pegasus-41",
        category: "running",
        aliases: ["pegasus-41"],
        identifiers: {},
        matchRulesVersion: "v1"
      },
      {
        shoeId: "shoe-2",
        brand: "ASICS",
        model: "gel-kayano-30",
        category: "running",
        aliases: ["gel-kayano-30"],
        identifiers: {},
        matchRulesVersion: "v1"
      }
    ],
    deals: [
      {
        shoeId: "shoe-1",
        bestOfferId: "offer-1",
        bestPrice: 159.99,
        offersCount: 1,
        maxDiscountPct: 15.79,
        updatedAt: "2026-03-01T12:00:00.000Z"
      },
      {
        shoeId: "shoe-2",
        bestOfferId: "offer-2",
        bestPrice: 179.99,
        offersCount: 1,
        maxDiscountPct: 21.74,
        updatedAt: "2026-03-01T12:00:00.000Z"
      }
    ],
    metadata: {
      generatedAt: "2026-03-01T12:00:00.000Z",
      staleAfterHours: 36,
      stale: false,
      counts: {
        retailers: 2,
        offers: 2,
        shoes: 2,
        deals: 2
      },
      parserHealth: [],
      warnings: []
    }
  };
}
