import { describe, expect, it } from "vitest";
import { normalizeGtin, normalizeIdentifiers, normalizeModel, normalizeSku, splitTokens } from "../normalization";

describe("normalizeModel", () => {
  it("normalizes gel-kayano aliases to a canonical token", () => {
    expect(normalizeModel("gel kayano 30")).toBe("gel-kayano-30");
    expect(normalizeModel("GEL-KAYANO 30")).toBe("gel-kayano-30");
    expect(normalizeModel("gel-kayano 30")).toBe("gel-kayano-30");
  });
});

describe("splitTokens", () => {
  it("splits hyphen and space tokens and removes low-signal words", () => {
    expect(splitTokens("ASICS Gel-Kayano 30 Men's Running Shoes")).toEqual([
      "asics",
      "gel",
      "kayano",
      "30"
    ]);
  });

  it("can keep low-signal tokens when requested", () => {
    expect(splitTokens("Pegasus-41 Running Shoe", { dropLowSignal: false })).toEqual([
      "pegasus",
      "41",
      "running",
      "shoe"
    ]);
  });
});

describe("identifier normalization", () => {
  it("normalizes SKU values for stable matching", () => {
    expect(normalizeSku(" asics-gk30 m_001 ")).toBe("ASICSGK30M001");
  });

  it("normalizes GTIN to 14-digit canonical form", () => {
    expect(normalizeGtin("193604233001")).toBe("00193604233001");
  });

  it("normalizes both identifiers together", () => {
    expect(
      normalizeIdentifiers({
        sku: "ASICS-GK30-M-001",
        gtin: "193604233001"
      })
    ).toEqual({
      sku: "ASICSGK30M001",
      gtin: "00193604233001"
    });
  });
});
