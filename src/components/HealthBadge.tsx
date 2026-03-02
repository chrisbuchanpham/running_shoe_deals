import type { RetailerHealthSummary } from "../lib/retailerHealth";

type HealthBadgeProps = {
  summary: RetailerHealthSummary;
  className?: string;
};

const levelLabel: Record<RetailerHealthSummary["level"], string> = {
  healthy: "Retailer health healthy",
  degraded: "Retailer health degraded",
  critical: "Retailer health critical",
  unknown: "Retailer health unavailable"
};

export function HealthBadge({ summary, className }: HealthBadgeProps) {
  const classNames = ["health-badge", `is-${summary.level}`, className].filter(Boolean).join(" ");

  return (
    <div className={classNames} role="status" aria-label={levelLabel[summary.level]} title={summary.detail}>
      <span className="health-badge-dot" aria-hidden="true" />
      <span className="health-badge-title">Retailers</span>
      <strong className="health-badge-value">{summary.headline}</strong>
    </div>
  );
}
