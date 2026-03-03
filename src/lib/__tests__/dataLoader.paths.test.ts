import { describe, expect, it } from "vitest";
import { resolveDataPath } from "../dataLoader";

describe("resolveDataPath", () => {
  it("resolves root base path", () => {
    expect(resolveDataPath("offers.json", "/")).toBe("/data/offers.json");
  });

  it("resolves project subpath with trailing slash", () => {
    expect(resolveDataPath("offers.json", "/running_shoe_deals/")).toBe(
      "/running_shoe_deals/data/offers.json"
    );
  });

  it("resolves relative Vite base path", () => {
    expect(resolveDataPath("offers.json", "./")).toBe("./data/offers.json");
  });

  it("resolves project subpath without trailing slash", () => {
    expect(resolveDataPath("offers.json", "/running_shoe_deals")).toBe(
      "/running_shoe_deals/data/offers.json"
    );
  });
});
