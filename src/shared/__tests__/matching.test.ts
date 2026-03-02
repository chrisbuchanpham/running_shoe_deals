import { describe, expect, it } from "vitest";
import { resolveShoeMatch } from "../matching";

describe("resolveShoeMatch", () => {
  it("prefers exact SKU/GTIN before fallback matching", () => {
    const result = resolveShoeMatch(
      {
        brand: "ASICS",
        modelRaw: "completely-different-name",
        category: "running",
        identifiers: { sku: "ASICS-GK30-M-001" }
      },
      [
        {
          shoeId: "shoe-a",
          brand: "ASICS",
          model: "gel-kayano-30",
          category: "running",
          identifiers: { sku: "ASICS-GK30-M-001" }
        },
        {
          shoeId: "shoe-b",
          brand: "ASICS",
          model: "novablast-4",
          category: "running",
          identifiers: { sku: "NBLAST4-001" }
        }
      ]
    );

    expect(result.reason).toBe("exact-id");
    expect(result.shoeId).toBe("shoe-a");
    expect(result.confidence).toBe(1);
  });

  it("normalizes SKU identifiers before exact matching", () => {
    const result = resolveShoeMatch(
      {
        brand: "ASICS",
        modelRaw: "noisy title",
        category: "running",
        identifiers: { sku: "asics-gk30-m-001" }
      },
      [
        {
          shoeId: "shoe-a",
          brand: "ASICS",
          model: "gel-kayano-30",
          category: "running",
          identifiers: { sku: "ASICSGK30M001" }
        }
      ]
    );

    expect(result.reason).toBe("exact-id");
    expect(result.shoeId).toBe("shoe-a");
  });

  it("can fallback match within category when brand is missing", () => {
    const result = resolveShoeMatch(
      {
        modelRaw: "Fresh Foam 1080 v13",
        category: "running"
      },
      [
        {
          shoeId: "shoe-a",
          brand: "New Balance",
          model: "fresh-foam-1080-v13",
          category: "running"
        },
        {
          shoeId: "shoe-b",
          brand: "ASICS",
          model: "gel-kayano-30",
          category: "running"
        }
      ]
    );

    expect(result.reason).toBe("model-fallback");
    expect(result.shoeId).toBe("shoe-a");
    expect(result.confidence).toBeGreaterThanOrEqual(0.72);
  });

  it("rejects ambiguous fallback matches", () => {
    const result = resolveShoeMatch(
      {
        brand: "ASICS",
        modelRaw: "Gel Nimbus",
        category: "running"
      },
      [
        {
          shoeId: "shoe-a",
          brand: "ASICS",
          model: "gel-nimbus-26",
          category: "running"
        },
        {
          shoeId: "shoe-b",
          brand: "ASICS",
          model: "gel-nimbus-27",
          category: "running"
        }
      ]
    );

    expect(result.reason).toBe("none");
    expect(result.shoeId).toBeUndefined();
  });
});
