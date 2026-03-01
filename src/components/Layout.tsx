import { Link, NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { StaleBanner } from "./StaleBanner";
import type { Metadata } from "../shared/contracts";

type LayoutProps = PropsWithChildren<{
  metadata?: Metadata;
}>;

export function Layout({ metadata, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <Link to="/" className="brand-link">
            Canadian Running Deals
          </Link>
          <p className="brand-subtitle">
            Cross-retailer running and trail shoe pricing across Canada.
          </p>
        </div>
        <nav className="site-nav">
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
