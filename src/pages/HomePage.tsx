import { Link } from "react-router-dom";
import { DealCard } from "../components/DealCard";
import type { Dataset } from "../lib/dataLoader";

type HomePageProps = {
  data: Dataset;
};

export function HomePage({ data }: HomePageProps) {
  const offersById = new Map(data.offers.map((offer) => [offer.id, offer]));
  const shoesById = new Map(data.shoes.map((shoe) => [shoe.shoeId, shoe]));
  const retailersById = new Map(data.retailers.map((retailer) => [retailer.id, retailer]));
  const parserHealthByRetailerId = new Map(
    data.metadata.parserHealth.map((entry) => [entry.retailerId, entry])
  );

  const topDiscountDeals = [...data.deals]
    .sort((a, b) => {
      const discountDelta = (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
      if (discountDelta !== 0) return discountDelta;
      return a.bestPrice - b.bestPrice;
    })
    .slice(0, 4);

  const budgetDeals = [...data.deals]
    .sort((a, b) => {
      const priceDelta = a.bestPrice - b.bestPrice;
      if (priceDelta !== 0) return priceDelta;
      return (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
    })
    .slice(0, 4);

  const mostOffersDeals = [...data.deals]
    .sort((a, b) => {
      const offersDelta = b.offersCount - a.offersCount;
      if (offersDelta !== 0) return offersDelta;
      return (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
    })
    .slice(0, 4);

  const generatedAtDate = new Date(data.metadata.generatedAt);
  const generatedAtMs = generatedAtDate.getTime();
  const computedStale =
    data.metadata.stale ||
    (!Number.isNaN(generatedAtMs) &&
      Date.now() - generatedAtMs > data.metadata.staleAfterHours * 60 * 60 * 1000);
  const generatedAtLabel = Number.isNaN(generatedAtMs)
    ? data.metadata.generatedAt
    : generatedAtDate.toLocaleString();

  const liveSources = data.metadata.parserHealth.filter((entry) => entry.sourceMode === "live").length;
  const fixtureSources = data.metadata.parserHealth.filter(
    (entry) => entry.sourceMode === "fixture"
  ).length;

  const sections = [
    {
      title: "Top Discounts",
      description: "Highest markdowns first for quick upside.",
      deals: topDiscountDeals
    },
    {
      title: "Budget Picks",
      description: "Lowest cash outlay across current offers.",
      deals: budgetDeals
    },
    {
      title: "Most Offers Available",
      description: "Models with the broadest retailer coverage.",
      deals: mostOffersDeals
    }
  ];

  return (
    <section>
      <div
        className="section-header"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #fffaf0, #ffffff)",
          padding: "1rem"
        }}
      >
        <h1>Find Your Best Shoe Deal in One Scan</h1>
        <p>Start with today&apos;s highest-converting offers across Canadian retailers.</p>
        <div style={{ marginTop: "0.9rem" }}>
          <Link
            to="/deals"
            style={{
              display: "inline-block",
              textDecoration: "none",
              fontWeight: 800,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "10px",
              padding: "0.55rem 0.85rem"
            }}
          >
            Scan Deals
          </Link>
        </div>
      </div>

      <aside
        aria-label="Data trust summary"
        style={{
          marginTop: "0.9rem",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--surface-strong)",
          padding: "0.75rem 0.85rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "center"
        }}
      >
        <strong>{computedStale ? "Snapshot stale" : "Snapshot fresh"}</strong>
        <span>Generated: {generatedAtLabel}</span>
        <span>Live sources: {liveSources}</span>
        <span>Fixture sources: {fixtureSources}</span>
      </aside>

      {sections.map((section) => (
        <section key={section.title} style={{ marginTop: "1.2rem" }}>
          <div className="section-header">
            <h2 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", "Segoe UI", sans-serif' }}>
              {section.title}
            </h2>
            <p>{section.description}</p>
          </div>
          <div className="deal-grid">
            {section.deals.map((deal) => {
              const offer = offersById.get(deal.bestOfferId);
              const shoe = shoesById.get(deal.shoeId);
              if (!offer || !shoe) return null;
              return (
                <DealCard
                  key={deal.shoeId}
                  deal={deal}
                  bestOffer={offer}
                  shoe={shoe}
                  retailer={retailersById.get(offer.retailerId)}
                  retailerHealth={parserHealthByRetailerId.get(offer.retailerId)}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div style={{ marginTop: "1.1rem" }}>
        <Link to="/deals">View all deals</Link>
      </div>
    </section>
  );
}
