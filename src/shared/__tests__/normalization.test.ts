import { describe, expect, it } from "vitest";
import { normalizeModel } from "../normalization";

describe("normalizeModel", () => {
  it("normalizes gel-kayano aliases to a canonical token", () => {
    expect(normalizeModel("gel kayano 30")).toBe("gel-kayano-30");
    expect(normalizeModel("GEL-KAYANO 30")).toBe("gel-kayano-30");
    expect(normalizeModel("gel-kayano 30")).toBe("gel-kayano-30");
  });
});
