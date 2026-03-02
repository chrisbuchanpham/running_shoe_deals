import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { HealthBadge } from "./HealthBadge";
import { StaleBanner } from "./StaleBanner";
import { deriveRetailerHealthFromMetadata } from "../lib/retailerHealth";
import type { Metadata } from "../shared/contracts";

type LayoutProps = PropsWithChildren<{
  metadata?: Metadata;
}>;

type FreshnessInfo = {
  stale: boolean;
  label: string;
  title: string;
};

function buildFreshness(metadata: Metadata): FreshnessInfo {
  const generatedDate = new Date(metadata.generatedAt);
  const generatedMs = generatedDate.getTime();
  const hasValidDate = Number.isFinite(generatedMs);
  const computedStale =
    hasValidDate && Date.now() - generatedMs > metadata.staleAfterHours * 60 * 60 * 1000;
  const stale = metadata.stale || computedStale;

  if (!hasValidDate) {
    return {
      stale,
      label: stale ? "Stale snapshot" : "Snapshot available",
      title: `Generated timestamp unavailable. Refresh target: every ${metadata.staleAfterHours}h.`
    };
  }

  const timestamp = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(generatedDate);

  return {
    stale,
    label: `${stale ? "Stale snapshot" : "Fresh snapshot"} - ${timestamp}`,
    title: `Generated ${generatedDate.toLocaleString()}. Refresh target: every ${metadata.staleAfterHours}h.`
  };
}

export function Layout({ metadata, children }: LayoutProps) {
  const freshness = metadata ? buildFreshness(metadata) : null;
  const healthSummary = deriveRetailerHealthFromMetadata(metadata);

  return (
    <div className="app-shell">
      <header className="site-header animate-fade-up">
        <div className="site-header-top">
          <div className="brand-block">
            <Link to="/" className="brand-link">
              Canadian Running Deals
            </Link>
            <p className="brand-subtitle">
              Athletic editorial view of cross-retailer running and trail pricing across Canada.
            </p>
          </div>

          {freshness ? (
            <div className="masthead-trust" aria-label="Data freshness and parser health">
              <span
                className={`freshness-chip ${freshness.stale ? "is-stale" : "is-fresh"}`}
                title={freshness.title}
              >
                <span className="freshness-dot" aria-hidden="true" />
                <span className="freshness-label">{freshness.label}</span>
              </span>
              <HealthBadge summary={healthSummary} />
            </div>
          ) : null}
        </div>

        <nav className="site-nav stagger-fade">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/deals">Deals</NavLink>
          <NavLink to="/retailers">Retailers</NavLink>
          <NavLink to="/disclaimer">Disclaimer</NavLink>
        </nav>
      </header>

      {metadata ? (
        <StaleBanner
          stale={metadata.stale}
          generatedAt={metadata.generatedAt}
          staleAfterHours={metadata.staleAfterHours}
        />
      ) : null}

      <main className="content">{children}</main>

      <footer className="site-footer">
        <p>
          Data snapshots are generated automatically. Always verify final pricing and stock on
          retailer websites.
        </p>
        <div className="legal-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/disclaimer">Data Source Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
