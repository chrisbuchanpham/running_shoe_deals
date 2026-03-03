import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runIngestion } from "../ingest";
import { coverageReportSchema, metadataSchema, offerSchema } from "../../src/shared/contracts";

const execFileAsync = promisify(execFile);
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("ingestion pipeline", () => {
  it("produces all required output datasets", async () => {
    const result = await runIngestion({ writeFiles: false, fixtureOnly: true });
    expect(result.retailers.length).toBeGreaterThan(0);
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.shoes.length).toBeGreaterThan(0);
    expect(result.deals.length).toBeGreaterThan(0);
    expect(result.metadata.parserHealth.length).toBeGreaterThan(0);
    expect(result.metadata.parserHealth.some((health) => health.sourceMode === "fixture")).toBe(true);
    for (const health of result.metadata.parserHealth) {
      expect(health.pagesCrawled ?? 0).toBeGreaterThanOrEqual(0);
      expect(health.discoveredCount ?? 0).toBeGreaterThanOrEqual(0);
      expect(health.parsedCount ?? 0).toBeGreaterThanOrEqual(0);
    }
    const firstOffer = result.offers[0];
    const offerWithSizeRange = offerSchema.parse({
      ...firstOffer,
      sizeRange: firstOffer.sizeRange ?? "M 8-12"
    });
    expect(offerWithSizeRange.sizeRange).toBe(firstOffer.sizeRange ?? "M 8-12");
  });

  it("accepts browser, http, and fixture execution paths in metadata parser health", () => {
    const now = new Date().toISOString();
    const metadata = metadataSchema.parse({
      generatedAt: now,
      staleAfterHours: 36,
      stale: false,
      counts: {
        retailers: 3,
        offers: 3,
        shoes: 0,
        deals: 0
      },
      parserHealth: [
        {
          retailerId: "browser-retailer",
          status: "ok",
          offersCount: 1,
          durationMs: 1,
          sourceMode: "live",
          executionPath: "browser"
        },
        {
          retailerId: "http-retailer",
          status: "ok",
          offersCount: 1,
          durationMs: 1,
          sourceMode: "live",
          executionPath: "http"
        },
        {
          retailerId: "fixture-retailer",
          status: "failed",
          offersCount: 1,
          durationMs: 1,
          sourceMode: "fixture",
          executionPath: "fixture"
        }
      ],
      warnings: []
    });

    expect(metadata.parserHealth.map((entry) => entry.executionPath)).toEqual([
      "browser",
      "http",
      "fixture"
    ]);
  });

  it("fails coverage audit when fixture usage exceeds threshold and records fixture breach data", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "coverage-audit-fixture-"));
    try {
      const now = new Date().toISOString();
      await writeJson(path.resolve(tempRoot, "data", "coverage_benchmarks", "unit-retailer.json"), {
        retailerId: "unit-retailer",
        expectedCount: 1,
        expectedModels: []
      });
      await writeJson(path.resolve(tempRoot, "public", "data", "offers.json"), [
        {
          id: "ofr-unit-1",
          retailerId: "unit-retailer",
          url: "https://example.com/product",
          titleRaw: "Unit Test Shoe",
          modelNormalized: "unit test shoe",
          category: "running",
          sizeRange: "M 8-12",
          priceCurrent: 120,
          inStock: true,
          scrapedAt: now,
          sourceConfidence: 0.8
        }
      ]);
      await writeJson(path.resolve(tempRoot, "public", "data", "metadata.json"), {
        generatedAt: now,
        staleAfterHours: 36,
        stale: false,
        counts: {
          retailers: 1,
          offers: 1,
          shoes: 1,
          deals: 1
        },
        parserHealth: [
          {
            retailerId: "unit-retailer",
            status: "ok",
            offersCount: 1,
            durationMs: 1,
            discoveredCount: 1,
            parsedCount: 1,
            pagesCrawled: 0,
            sourceMode: "fixture",
            executionPath: "fixture"
          }
        ],
        warnings: []
      });
      await writeJson(path.resolve(tempRoot, "scripts", "config", "disabled-parsers.json"), []);

      const repoRoot = path.resolve(TEST_DIR, "..", "..");
      const nodeBin = process.execPath;
      const tsxCli = path.resolve(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
      const auditScript = path.resolve(repoRoot, "scripts", "coverage", "audit.ts");

      let commandOutput = "";
      try {
        await execFileAsync(nodeBin, [tsxCli, auditScript], { cwd: tempRoot });
        throw new Error("Expected coverage audit to fail.");
      } catch (error) {
        const commandError = error as Error & { stdout?: string; stderr?: string };
        commandOutput = [commandError.stdout, commandError.stderr, commandError.message]
          .filter((part): part is string => Boolean(part && part.trim()))
          .join("\n");
      }

      expect(commandOutput).toContain("fixture usage 1.0000 > 0.10");

      const coverage = coverageReportSchema.parse(
        JSON.parse(await readFile(path.resolve(tempRoot, "public", "data", "coverage.json"), "utf8"))
      );
      const metadata = metadataSchema.parse(
        JSON.parse(await readFile(path.resolve(tempRoot, "public", "data", "metadata.json"), "utf8"))
      );

      expect(coverage.thresholds.fixtureUsageRate).toBe(0.1);
      expect(coverage.fixtureUsageRate).toBe(1);
      expect(
        coverage.breaches.some(
          (breach) => breach.scope === "fixture" && breach.recall === 1 && breach.threshold === 0.1
        )
      ).toBe(true);
      expect(metadata.coverage?.fixtureUsageThreshold).toBe(0.1);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
