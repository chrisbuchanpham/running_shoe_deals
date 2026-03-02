import type { CSSProperties } from "react";
import type { Dataset } from "../lib/dataLoader";

type RetailersPageProps = {
  data: Dataset;
};

type CrawlStatus =
  | Dataset["metadata"]["parserHealth"][number]["status"]
  | "unknown";
type SourceMode =
  | NonNullable<Dataset["metadata"]["parserHealth"][number]["sourceMode"]>
  | "unknown";

const WARNING_EXCERPT_LIMIT = 130;

function formatDateTime(timestamp?: string): string {
  if (!timestamp) return "Not available";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Invalid timestamp";
  return parsed.toLocaleString();
}

function getWarningExcerpt(warning?: string): string {
  if (!warning) return "None";

  const compact = warning.replace(/\s+/g, " ").trim();
  if (!compact) return "None";
  if (compact.length <= WARNING_EXCERPT_LIMIT) return compact;
  return `${compact.slice(0, WARNING_EXCERPT_LIMIT - 3)}...`;
}

function getStatusLabel(status: CrawlStatus): string {
  if (status === "ok") return "Healthy";
  if (status === "failed") return "Failed";
  if (status === "disabled") return "Disabled";
  return "Unknown";
}

function getStatusRank(status: CrawlStatus): number {
  if (status === "failed") return 0;
  if (status === "disabled") return 1;
  if (status === "unknown") return 2;
  return 3;
}

function getStatusBadgeStyle(status: CrawlStatus): CSSProperties {
  if (status === "ok") {
    return {
      background: "#e8f7f2",
      color: "#125f51",
      border: "1px solid #badfd4"
    };
  }
  if (status === "failed") {
    return {
      background: "#ffe7df",
      color: "#7b2710",
      border: "1px solid #efc5b8"
    };
  }
  if (status === "disabled") {
    return {
      background: "#f4f0e7",
      color: "#6a5b37",
      border: "1px solid #ded4bc"
    };
  }
  return {
    background: "#f1f1f1",
    color: "#4a4a4a",
    border: "1px solid #dbdbdb"
  };
}

function getSourceModeLabel(sourceMode: SourceMode): string {
  if (sourceMode === "live") return "Live";
  if (sourceMode === "fixture") return "Fixture";
  return "Unknown";
}

function getSourceModeBadgeStyle(sourceMode: SourceMode): CSSProperties {
  if (sourceMode === "live") {
    return {
      background: "#edf8f5",
      color: "#1a7b68",
      border: "1px solid #cae5de"
    };
  }
  if (sourceMode === "fixture") {
    return {
      background: "#fff3e3",
      color: "#a05816",
      border: "1px solid #f0d5b9"
    };
  }
  return {
    background: "#f1f1f1",
    color: "#4a4a4a",
    border: "1px solid #dbdbdb"
  };
}

export function RetailersPage({ data }: RetailersPageProps) {
  const parserHealthByRetailerId = new Map(
    data.metadata.parserHealth.map((entry) => [entry.retailerId, entry])
  );

  const reliabilityRows = data.retailers
    .map((retailer) => {
      const health = parserHealthByRetailerId.get(retailer.id);
      const status: CrawlStatus = health?.status ?? "unknown";
      const sourceMode: SourceMode = health?.sourceMode ?? "unknown";
      const warning = health?.warning;

      return {
        retailer,
        status,
        sourceMode,
        warning,
        warningExcerpt: getWarningExcerpt(warning),
        offersCount: health?.offersCount ?? 0
      };
    })
    .sort(
      (left, right) =>
        getStatusRank(left.status) - getStatusRank(right.status) ||
        left.retailer.name.localeCompare(right.retailer.name)
    );

  const liveHealthyCount = reliabilityRows.filter(
    (row) => row.status === "ok" && row.sourceMode === "live"
  ).length;
  const attentionCount = reliabilityRows.filter(
    (row) => row.status !== "ok" || row.warning !== undefined
  ).length;
  const fixtureCount = reliabilityRows.filter(
    (row) => row.sourceMode === "fixture"
  ).length;
  const crawledCount = reliabilityRows.filter(
    (row) => row.retailer.lastCrawledAt !== undefined
  ).length;

  return (
    <section>
      <div className="section-header">
        <h1>Retailer Reliability Center</h1>
        <p>
          Crawl reliability, source mode visibility, and warning diagnostics for
          each tracked retailer.
        </p>
      </div>

      <div className="deal-grid">
        <article className="deal-card">
          <p className="deal-brand">Snapshot</p>
          <p className="deal-model">
            {formatDateTime(data.metadata.generatedAt)}
          </p>
          <p className="deal-meta">
            {data.metadata.stale
              ? "Data marked stale."
              : "Within freshness threshold."}
          </p>
        </article>

        <article className="deal-card">
          <p className="deal-brand">Live Healthy</p>
          <p className="deal-model">
            {liveHealthyCount} / {reliabilityRows.length}
          </p>
          <p className="deal-meta">
            Retailers crawling in live mode without failures.
          </p>
        </article>

        <article className="deal-card">
          <p className="deal-brand">Needs Attention</p>
          <p className="deal-model">{attentionCount}</p>
          <p className="deal-meta">
            Failed, disabled, unknown, or warning-bearing crawls.
          </p>
        </article>

        <article className="deal-card">
          <p className="deal-brand">Coverage Signals</p>
          <p className="deal-model">{fixtureCount} fixture-mode</p>
          <p className="deal-meta">
            {crawledCount} retailers include a last crawl timestamp.
          </p>
        </article>
      </div>

      <div className="section-header" style={{ marginTop: "1.2rem" }}>
        <h1>Per-Retailer Crawl Health</h1>
        <p>Status, recency, source mode, and warning excerpts.</p>
      </div>

      <table className="offer-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Crawl Status</th>
            <th>Last Crawl</th>
            <th>Source Mode</th>
            <th>Offers</th>
            <th>Warning Excerpt</th>
          </tr>
        </thead>
        <tbody>
          {reliabilityRows.map((row) => (
            <tr key={row.retailer.id}>
              <td>
                <a
                  href={row.retailer.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.retailer.name}
                </a>
              </td>
              <td>
                <span
                  style={{
                    ...getStatusBadgeStyle(row.status),
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    display: "inline-block",
                    padding: "0.22rem 0.52rem"
                  }}
                >
                  {getStatusLabel(row.status)}
                </span>
              </td>
              <td>{formatDateTime(row.retailer.lastCrawledAt)}</td>
              <td>
                <span
                  style={{
                    ...getSourceModeBadgeStyle(row.sourceMode),
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    display: "inline-block",
                    padding: "0.22rem 0.52rem"
                  }}
                >
                  {getSourceModeLabel(row.sourceMode)}
                </span>
              </td>
              <td>{row.offersCount}</td>
              <td style={{ maxWidth: "520px" }} title={row.warning}>
                {row.warningExcerpt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
