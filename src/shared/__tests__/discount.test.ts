import { describe, expect, it } from "vitest";
import { computeDiscountPct } from "../discount";

describe("computeDiscountPct", () => {
  it("returns undefined for invalid original price", () => {
    expect(computeDiscountPct(100, undefined)).toBeUndefined();
    expect(computeDiscountPct(100, 0)).toBeUndefined();
  });

  it("returns 0 when current is higher than original", () => {
    expect(computeDiscountPct(110, 100)).toBe(0);
  });

  it("calculates percentage with two decimals", () => {
    expect(computeDiscountPct(75, 100)).toBe(25);
    expect(computeDiscountPct(84.5, 109.99)).toBeCloseTo(23.18, 2);
  });
});
