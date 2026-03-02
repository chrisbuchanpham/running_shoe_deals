import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readJsonFile, writeJsonFile } from "../lib/files";
import {
  coverageBenchmarkSchema,
  coverageReportSchema,
  coverageStateSchema,
  metadataSchema,
  offersFileSchema,
  type CoverageBenchmark,
  type CoverageRetailerResult
} from "../../src/shared/contracts";

const RETAILER_RECALL_THRESHOLD = 0.9;
const AGGREGATE_RECALL_THRESHOLD = 0.93;
const FIXTURE_USAGE_THRESHOLD = 0.1;

type CoverageBreach = {
  scope: "retailer" | "aggregate" | "fixture";
  retailerId?: string;
  recall: number;
  threshold: number;
  consecutiveFailures?: number;
  autoDisabled?: boolean;
};

function dataPath(rootDir: string, ...parts: string[]): string {
  return path.resolve(rootDir, ...parts);
}

function normalizeModelToken(value: string): string {
  return value.trim().toLowerCase();
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function toTicketTimestamp(input: Date): string {
  return input.toISOString().replace(/[:.]/g, "-");
}

function sanitizeForFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadCoverageBenchmarks(benchmarksDir: string): Promise<CoverageBenchmark[]> {
  const files = (await readdir(benchmarksDir)).filter((file) => file.endsWith(".json")).sort();
  const benchmarks: CoverageBenchmark[] = [];
  const seenRetailers = new Set<string>();

  for (const file of files) {
    const benchmarkPath = path.resolve(benchmarksDir, file);
    const benchmark = coverageBenchmarkSchema.parse(await readJsonFile(benchmarkPath));
    if (seenRetailers.has(benchmark.retailerId)) {
      throw new Error(`Duplicate coverage benchmark for retailer ${benchmark.retailerId}.`);
    }
    seenRetailers.add(benchmark.retailerId);
    benchmarks.push(benchmark);
  }

  if (benchmarks.length === 0) {
    throw new Error("No coverage benchmark files found.");
  }

  return benchmarks;
}

async function loadCoverageState(statePath: string): Promise<{
  retailerConsecutiveFailures: Record<string, number>;
  aggregateConsecutiveFailures: number;
}> {
  try {
    const state = coverageStateSchema.parse(await readJsonFile(statePath));
    return {
      retailerConsecutiveFailures: { ...state.retailerConsecutiveFailures },
      aggregateConsecutiveFailures: state.aggregateConsecutiveFailures
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {
        retailerConsecutiveFailures: {},
        aggregateConsecutiveFailures: 0
      };
    }
    throw error;
  }
}

async function writeCoverageTicket(options: {
  ticketsDir: string;
  generatedAt: Date;
  scope: "retailer" | "aggregate" | "fixture";
  retailerId?: string;
  recall: number;
  threshold: number;
  consecutiveFailures?: number;
  aggregateRecall?: number;
  autoDisabled?: boolean;
  fixtureUsageRate: number;
}): Promise<void> {
  const slug = sanitizeForFileName(
    options.scope === "retailer"
      ? options.retailerId ?? "retailer"
      : options.scope === "fixture"
        ? "fixture-usage"
        : "all-retailers"
  );
  const ticketName = `${toTicketTimestamp(options.generatedAt)}-${options.scope}-${slug}.md`;
  const ticketPath = path.resolve(options.ticketsDir, ticketName);
  const title =
    options.scope === "retailer"
      ? `Coverage breach: ${options.retailerId}`
      : options.scope === "fixture"
        ? "Coverage breach: fixture usage"
        : "Coverage breach: aggregate recall";
  const metricLabel = options.scope === "fixture" ? "Fixture usage rate" : "Recall";

  const lines = [
    `# ${title}`,
    "",
    `- Generated at: ${options.generatedAt.toISOString()}`,
    `- Scope: ${options.scope}`,
    `- ${metricLabel}: ${options.recall.toFixed(4)}`,
    `- Threshold: ${options.threshold.toFixed(2)}`,
    `- Fixture usage rate: ${options.fixtureUsageRate.toFixed(4)}`
  ];

  if (typeof options.consecutiveFailures === "number") {
    lines.push(`- Consecutive failures: ${options.consecutiveFailures}`);
  }
  if (typeof options.aggregateRecall === "number") {
    lines.push(`- Aggregate recall: ${options.aggregateRecall.toFixed(4)}`);
  }
  if (options.scope === "retailer") {
    lines.push(`- Retailer: ${options.retailerId}`);
    lines.push(`- Parser auto-disabled: ${options.autoDisabled ? "yes" : "no"}`);
  }

  lines.push("");
  lines.push("## Follow-up");
  lines.push("");
  lines.push("1. Review parser output against benchmark expectations.");
  lines.push("2. Patch parser selectors or mappings.");
  lines.push("3. Re-run `npm run coverage:audit` and confirm thresholds pass.");
  lines.push("");

  await writeFile(ticketPath, `${lines.join("\n")}`, "utf8");
}

async function run(): Promise<void> {
  const rootDir = process.cwd();
  const benchmarksDir = dataPath(rootDir, "data", "coverage_benchmarks");
  const offersPath = dataPath(rootDir, "public", "data", "offers.json");
  const metadataPath = dataPath(rootDir, "public", "data", "metadata.json");
  const coveragePath = dataPath(rootDir, "public", "data", "coverage.json");
  const statePath = dataPath(rootDir, "data", "coverage_state.json");
  const disabledParsersPath = dataPath(rootDir, "scripts", "config", "disabled-parsers.json");
  const ticketsDir = dataPath(rootDir, "data", "coverage_tickets");

  const generatedAt = new Date();
  const benchmarks = await loadCoverageBenchmarks(benchmarksDir);
  const offers = offersFileSchema.parse(await readJsonFile(offersPath));
  const metadata = metadataSchema.parse(await readJsonFile(metadataPath));
  const priorState = await loadCoverageState(statePath);
  const disabledParsers = new Set(await readJsonFile<string[]>(disabledParsersPath));

  const offerModelsByRetailer = new Map<string, Set<string>>();
  for (const offer of offers) {
    const models = offerModelsByRetailer.get(offer.retailerId) ?? new Set<string>();
    models.add(normalizeModelToken(offer.modelNormalized));
    offerModelsByRetailer.set(offer.retailerId, models);
  }

  const perRetailerRecall: Record<string, number> = {};
  const retailerResults: CoverageRetailerResult[] = [];
  const breaches: CoverageBreach[] = [];
  const nextFailureState = { ...priorState.retailerConsecutiveFailures };
  const newlyDisabledParsers: string[] = [];

  let totalExpected = 0;
  let totalMatched = 0;

  for (const benchmark of benchmarks) {
    const availableModels = offerModelsByRetailer.get(benchmark.retailerId) ?? new Set<string>();
    const expectedModels = [...new Set((benchmark.expectedModels ?? []).map(normalizeModelToken))];
    const expected = benchmark.expectedCount ?? expectedModels.length;
    const modelMatched = expectedModels.filter((model) => availableModels.has(model)).length;
    const countMatched = Math.min(availableModels.size, expected);
    const matched = expectedModels.length > 0 ? Math.max(modelMatched, countMatched) : countMatched;

    totalExpected += expected;
    totalMatched += matched;

    const recall = expected === 0 ? 1 : roundRate(matched / expected);
    const pass = recall >= RETAILER_RECALL_THRESHOLD;
    const previousFailures = priorState.retailerConsecutiveFailures[benchmark.retailerId] ?? 0;
    const consecutiveFailures = pass ? 0 : previousFailures + 1;
    const autoDisabled = !pass && consecutiveFailures >= 2;

    nextFailureState[benchmark.retailerId] = consecutiveFailures;

    if (!pass) {
      if (autoDisabled && !disabledParsers.has(benchmark.retailerId)) {
        disabledParsers.add(benchmark.retailerId);
        newlyDisabledParsers.push(benchmark.retailerId);
      }

      breaches.push({
        scope: "retailer",
        retailerId: benchmark.retailerId,
        recall,
        threshold: RETAILER_RECALL_THRESHOLD,
        consecutiveFailures,
        autoDisabled
      });
    }

    perRetailerRecall[benchmark.retailerId] = recall;
    retailerResults.push({
      retailerId: benchmark.retailerId,
      expected,
      matched,
      recall,
      threshold: RETAILER_RECALL_THRESHOLD,
      pass,
      consecutiveFailures,
      autoDisabled
    });
  }

  const aggregateRecall = totalExpected === 0 ? 1 : roundRate(totalMatched / totalExpected);
  const activeParserHealth = metadata.parserHealth.filter((entry) => entry.status !== "disabled");
  const fixtureHits = activeParserHealth.filter((entry) =>
    entry.sourceMode === "fixture" || (entry.warning ?? "").toLowerCase().includes("fixture")
  ).length;
  const fixtureUsageRate =
    activeParserHealth.length === 0 ? 0 : roundRate(fixtureHits / activeParserHealth.length);
  const fixturePass = fixtureUsageRate <= FIXTURE_USAGE_THRESHOLD;
  if (!fixturePass) {
    breaches.push({
      scope: "fixture",
      recall: fixtureUsageRate,
      threshold: FIXTURE_USAGE_THRESHOLD
    });
  }

  const aggregatePass = aggregateRecall >= AGGREGATE_RECALL_THRESHOLD;
  const aggregateConsecutiveFailures = aggregatePass
    ? 0
    : priorState.aggregateConsecutiveFailures + 1;
  if (!aggregatePass) {
    breaches.push({
      scope: "aggregate",
      recall: aggregateRecall,
      threshold: AGGREGATE_RECALL_THRESHOLD,
      consecutiveFailures: aggregateConsecutiveFailures
    });
  }

  const coverageReport = coverageReportSchema.parse({
    generatedAt: generatedAt.toISOString(),
    thresholds: {
      perRetailerRecall: RETAILER_RECALL_THRESHOLD,
      aggregateRecall: AGGREGATE_RECALL_THRESHOLD,
      fixtureUsageRate: FIXTURE_USAGE_THRESHOLD
    },
    perRetailerRecall,
    aggregateRecall,
    fixtureUsageRate,
    retailers: retailerResults.sort((a, b) => a.retailerId.localeCompare(b.retailerId)),
    breaches
  });

  metadata.coverage = {
    perRetailerRecall,
    aggregateRecall,
    fixtureUsageRate,
    fixtureUsageThreshold: FIXTURE_USAGE_THRESHOLD
  };
  metadataSchema.parse(metadata);

  const nextState = coverageStateSchema.parse({
    generatedAt: generatedAt.toISOString(),
    retailerConsecutiveFailures: nextFailureState,
    aggregateConsecutiveFailures
  });

  await mkdir(ticketsDir, { recursive: true });
  await writeJsonFile(coveragePath, coverageReport);
  await writeJsonFile(metadataPath, metadata);
  await writeJsonFile(statePath, nextState);
  await writeJsonFile(disabledParsersPath, [...disabledParsers].sort());

  for (const breach of breaches) {
    await writeCoverageTicket({
      ticketsDir,
      generatedAt,
      scope: breach.scope,
      retailerId: breach.retailerId,
      recall: breach.recall,
      threshold: breach.threshold,
      consecutiveFailures: breach.consecutiveFailures,
      aggregateRecall,
      autoDisabled: breach.autoDisabled,
      fixtureUsageRate
    });
  }

  console.log(
    `[coverage] aggregate=${aggregateRecall.toFixed(4)} fixtureUsage=${fixtureUsageRate.toFixed(4)} fixtureThreshold<=${FIXTURE_USAGE_THRESHOLD.toFixed(2)} breaches=${breaches.length}`
  );

  if (newlyDisabledParsers.length > 0) {
    console.log(`[coverage] auto-disabled parsers: ${newlyDisabledParsers.join(", ")}`);
  }

  if (breaches.length > 0) {
    const details = breaches
      .map((breach) => {
        if (breach.scope === "aggregate") {
          return `aggregate ${breach.recall.toFixed(4)} < ${breach.threshold.toFixed(2)}`;
        }
        if (breach.scope === "fixture") {
          return `fixture usage ${breach.recall.toFixed(4)} > ${breach.threshold.toFixed(2)}`;
        }
        return `${breach.retailerId} ${breach.recall.toFixed(4)} < ${breach.threshold.toFixed(2)} (streak=${breach.consecutiveFailures})`;
      })
      .join("; ");
    throw new Error(`[coverage] threshold breach: ${details}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
