import { describe, expect, it } from "vitest";
import { runIngestion } from "../ingest";

describe("ingestion pipeline", () => {
  it("produces all required output datasets", async () => {
    const result = await runIngestion({ writeFiles: false, fixtureOnly: true });
    expect(result.retailers.length).toBeGreaterThan(0);
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.shoes.length).toBeGreaterThan(0);
    expect(result.deals.length).toBeGreaterThan(0);
    expect(result.metadata.parserHealth.length).toBeGreaterThan(0);
  });
});
