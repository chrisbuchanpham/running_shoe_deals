import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  extractSizeRange,
  isLikelyShoeOffer,
  normalizeOfferText
} from "../shoeOfferQuality";

describe("decodeHtmlEntities", () => {
  it("decodes Men&#x27;s correctly", () => {
    expect(decodeHtmlEntities("Men&#x27;s")).toBe("Men's");
  });
});

describe("normalizeOfferText", () => {
  it("decodes supported entities and collapses whitespace", () => {
    expect(normalizeOfferText("  Men&#x27;s&nbsp;&amp;&nbsp;Women&#39;s  ")).toBe("Men's & Women's");
  });
});

describe("extractSizeRange", () => {
  it("extracts m7 w8 pair and removes it from cleaned text", () => {
    expect(extractSizeRange("adidas adizero takumi sen 10 m7 w8")).toEqual({
      cleaned: "adidas adizero takumi sen 10",
      sizeRange: "M7/W8"
    });
  });

  it("extracts size from Size 10.5", () => {
    expect(extractSizeRange("Saucony Endorphin Speed 4 Size 10.5")).toEqual({
      cleaned: "Saucony Endorphin Speed 4",
      sizeRange: "Size 10.5"
    });
  });

  it("keeps Guide 19 unchanged when no size context exists", () => {
    expect(extractSizeRange("Guide 19")).toEqual({
      cleaned: "Guide 19"
    });
  });
});

describe("isLikelyShoeOffer", () => {
  it("rejects 4.75 stars & up", () => {
    expect(isLikelyShoeOffer({ title: "4.75 stars & up" })).toBe(false);
  });

  it("rejects Get a monthly chance to win $200", () => {
    expect(isLikelyShoeOffer({ title: "Get a monthly chance to win $200" })).toBe(false);
  });

  it("rejects Add to Wish List", () => {
    expect(isLikelyShoeOffer({ title: "Add to Wish List" })).toBe(false);
  });

  it("rejects Product Not Added to Wishlist", () => {
    expect(isLikelyShoeOffer({ title: "Product Not Added to Wishlist" })).toBe(false);
  });

  it("accepts legitimate shoe model titles", () => {
    expect(isLikelyShoeOffer({ title: "Guide 19" })).toBe(true);
    expect(isLikelyShoeOffer({ title: "Endorphin Pro 5" })).toBe(true);
    expect(isLikelyShoeOffer({ title: "Cloudrunner 3" })).toBe(true);
  });

  it("rejects apparel even with running context", () => {
    expect(isLikelyShoeOffer({ title: "HOKA Men's Essential Long Sleeve Tee", category: "running" })).toBe(false);
    expect(isLikelyShoeOffer({ title: "The North Face Wind Jacket - Men's", category: "trail" })).toBe(false);
  });
});
