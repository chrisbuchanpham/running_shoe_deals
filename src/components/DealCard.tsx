import { Link } from "react-router-dom";
import { formatModelDisplay, formatSizeDisplay } from "../lib/modelDisplay";
import type {
  DealCard as DealCardType,
  Offer,
  ParserHealth,
  Retailer,
  ShoeCanonical
} from "../shared/contracts";

type DealCardProps = {
  deal: DealCardType;
  shoe: ShoeCanonical;
  bestOffer: Offer;
  retailer?: Retailer;
  retailerHealth?: ParserHealth;
};

type HealthTone = "good" | "warn" | "bad" | "neutral";

function getHealthBadge(retailerHealth?: ParserHealth): {
  label: string;
  tone: HealthTone;
  title: string;
} {
  if (!retailerHealth) {
    return {
      label: "Health unknown",
      tone: "neutral",
      title: "No parser health status is currently available."
    };
  }

  if (retailerHealth.sourceMode === "fixture") {
    return {
      label: "Fixture fallback",
      tone: "warn",
      title: retailerHealth.warning ?? "Fixture data was used for this retailer."
    };
  }

  if (retailerHealth.status === "ok") {
    return {
      label: "Live parser",
      tone: "good",
      title: "Retailer parser is healthy and running live."
    };
  }

  if (retailerHealth.status === "disabled") {
    return {
      label: "Parser disabled",
      tone: "warn",
      title: retailerHealth.warning ?? "Retailer parser is currently disabled."
    };
  }

  return {
    label: "Parser issue",
    tone: "bad",
    title: retailerHealth.warning ?? "Retailer parser reported a failure."
  };
}

function getBadgeStyles(tone: HealthTone) {
  if (tone === "good") {
    return {
      background: "#e8f7f2",
      color: "#125f51",
      border: "1px solid #bfe8de"
    };
  }

  if (tone === "warn") {
    return {
      background: "#fff6e7",
      color: "#7a4a00",
      border: "1px solid #f3d9a8"
    };
  }

  if (tone === "bad") {
    return {
      background: "#ffe7df",
      color: "#7c2a18",
      border: "1px solid #eab6a9"
    };
  }

  return {
    background: "#f3f4f6",
    color: "#404040",
    border: "1px solid #d7d7d7"
  };
}

export function DealCard({ deal, shoe, bestOffer, retailer, retailerHealth }: DealCardProps) {
  const healthBadge = getHealthBadge(retailerHealth);
  const badgeStyles = getBadgeStyles(healthBadge.tone);
  const modelDisplay = formatModelDisplay(shoe.model);
  const sizeDisplay = formatSizeDisplay(bestOffer.sizeRange);

  return (
    <article className="deal-card">
      <div className="deal-card-top">
        <p className="deal-brand">{shoe.brand}</p>
        <p className="deal-model">{modelDisplay}</p>
        {sizeDisplay ? <span className="size-chip">Size {sizeDisplay}</span> : null}
        <p className="deal-meta">
          {shoe.category} | {deal.offersCount} retailer offer{deal.offersCount > 1 ? "s" : ""}
        </p>
      </div>
      <div className="deal-pricing">
        <p className="deal-price">${deal.bestPrice.toFixed(2)} CAD</p>
        {deal.maxDiscountPct ? (
          <span className="deal-discount">Up to {deal.maxDiscountPct.toFixed(0)}% off</span>
        ) : null}
      </div>
      <p className="deal-retailer">
        Best listed at <strong>{retailer?.name ?? bestOffer.retailerId}</strong>{" "}
        <span
          title={healthBadge.title}
          style={{
            ...badgeStyles,
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            padding: "0.15rem 0.5rem",
            fontSize: "0.72rem",
            fontWeight: 800
          }}
        >
          {healthBadge.label}
        </span>
      </p>
      <div className="deal-actions">
        <Link
          to={`/shoes/${shoe.shoeId}`}
          style={{
            borderColor: "var(--accent)",
            background: "var(--accent)",
            color: "#fff"
          }}
        >
          Compare retailers
        </Link>
        <a
          href={bestOffer.url}
          target="_blank"
          rel="noreferrer"
          style={{
            background: "#fff",
            color: "inherit"
          }}
        >
          Open retailer
        </a>
      </div>
    </article>
  );
}
