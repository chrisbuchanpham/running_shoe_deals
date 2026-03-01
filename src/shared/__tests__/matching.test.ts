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
});
