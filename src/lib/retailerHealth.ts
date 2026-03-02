import type { Metadata, ParserHealth } from "../shared/contracts";

export type RetailerHealthLevel = "healthy" | "degraded" | "critical" | "unknown";

export type RetailerHealthSummary = {
  level: RetailerHealthLevel;
  totalRetailers: number;
  healthyRetailers: number;
  degradedRetailers: number;
  failedRetailers: number;
  disabledRetailers: number;
  warningRetailers: number;
  fixtureRetailers: number;
  liveRetailers: number;
  totalOffers: number;
  headline: string;
  detail: string;
};

const hasWarning = (value: string | undefined): boolean => Boolean(value?.trim().length);

export function deriveRetailerHealth(parserHealth: ParserHealth[]): RetailerHealthSummary {
  const totals = parserHealth.reduce(
    (acc, entry) => {
      const warning = hasWarning(entry.warning);
      const fixture = entry.sourceMode === "fixture";

      acc.totalOffers += entry.offersCount;

      if (warning) {
        acc.warningRetailers += 1;
      }

      if (fixture) {
        acc.fixtureRetailers += 1;
      } else {
        acc.liveRetailers += 1;
      }

      if (entry.status === "failed") {
        acc.failedRetailers += 1;
        return acc;
      }

      if (entry.status === "disabled") {
        acc.disabledRetailers += 1;
        return acc;
      }

      if (warning || fixture) {
        acc.degradedRetailers += 1;
        return acc;
      }

      acc.healthyRetailers += 1;
      return acc;
    },
    {
      healthyRetailers: 0,
      degradedRetailers: 0,
      failedRetailers: 0,
      disabledRetailers: 0,
      warningRetailers: 0,
      fixtureRetailers: 0,
      liveRetailers: 0,
      totalOffers: 0
    }
  );

  const totalRetailers = parserHealth.length;

  if (totalRetailers === 0) {
    return {
      level: "unknown",
      totalRetailers: 0,
      ...totals,
      headline: "Health unavailable",
      detail: "No parser telemetry found in metadata."
    };
  }

  const level: RetailerHealthLevel =
    totals.failedRetailers > 0
      ? "critical"
      : totals.degradedRetailers > 0 || totals.disabledRetailers > 0
        ? "degraded"
        : "healthy";

  const headline =
    level === "critical"
      ? `${totals.failedRetailers}/${totalRetailers} failed`
      : level === "degraded"
        ? `${totals.healthyRetailers}/${totalRetailers} healthy`
        : `${totals.healthyRetailers}/${totalRetailers} stable`;

  const detailSegments: string[] = [
    `${totals.healthyRetailers} healthy`,
    `${totals.degradedRetailers} degraded`,
    `${totals.failedRetailers} failed`
  ];

  if (totals.disabledRetailers > 0) {
    detailSegments.push(`${totals.disabledRetailers} disabled`);
  }

  if (totals.fixtureRetailers > 0) {
    detailSegments.push(`${totals.fixtureRetailers} fixture-backed`);
  }

  if (totals.warningRetailers > 0) {
    detailSegments.push(`${totals.warningRetailers} with warnings`);
  }

  return {
    level,
    totalRetailers,
    ...totals,
    headline,
    detail: detailSegments.join(" | ")
  };
}

export function deriveRetailerHealthFromMetadata(
  metadata?: Pick<Metadata, "parserHealth"> | null
): RetailerHealthSummary {
  return deriveRetailerHealth(metadata?.parserHealth ?? []);
}

