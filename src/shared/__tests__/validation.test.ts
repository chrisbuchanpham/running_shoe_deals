import { describe, expect, it } from "vitest";
import { offerSchema } from "../contracts";

describe("offerSchema", () => {
  it("rejects malformed offers", () => {
    const invalid = {
      id: "offer-1",
      retailerId: "",
      url: "https://example.com",
      titleRaw: "Example",
      modelNormalized: "example",
      category: "running",
      priceCurrent: -5,
      inStock: true,
      scrapedAt: "2026-03-01T12:00:00.000Z",
      sourceConfidence: 0.8
    };

    expect(() => offerSchema.parse(invalid)).toThrow();
  });
});
