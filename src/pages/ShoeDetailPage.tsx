import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import type { Dataset } from "../lib/dataLoader";
import { formatModelDisplay, formatSizeDisplay } from "../lib/modelDisplay";
import { normalizeBrand } from "../shared/normalization";

type ShoeDetailPageProps = {
  data: Dataset;
};

type TrustSignal = {
  label: string;
  scorePct: number;
  style: CSSProperties;
};

const CAD_FORMATTER = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD"
});

function formatPrice(price: number): string {
  return CAD_FORMATTER.format(price);
}

function formatDateTime(timestamp?: string): string {
  if (!timestamp) return "Not available";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Invalid timestamp";
  return parsed.toLocaleString();
}

function getTrustSignal(sourceConfidence: number): TrustSignal {
  const scorePct = Math.round(sourceConfidence * 100);

  if (sourceConfidence >= 0.9) {
    return {
      label: "High trust",
      scorePct,
      style: {
        background: "#e8f7f2",
        color: "#125f51",
        border: "1px solid #badfd4"
      }
    };
  }

  if (sourceConfidence >= 0.75) {
    return {
      label: "Moderate trust",
      scorePct,
      style: {
        background: "#fff3e3",
        color: "#a05816",
        border: "1px solid #f0d5b9"
      }
    };
  }

  return {
    label: "Low trust",
    scorePct,
    style: {
      background: "#ffe7df",
      color: "#7b2710",
      border: "1px solid #efc5b8"
    }
  };
}

export function ShoeDetailPage({ data }: ShoeDetailPageProps) {
  const params = useParams();
  const shoeId = params.shoeId;
  const shoe = data.shoes.find((entry) => entry.shoeId === shoeId);

  const relatedOffers = useMemo(() => {
    if (!shoe) return [];

    return data.offers
      .filter(
        (offer) =>
          offer.modelNormalized === shoe.model &&
          normalizeBrand(offer.brand) === normalizeBrand(shoe.brand) &&
          offer.category === shoe.category
      )
      .sort(
        (left, right) =>
          Number(right.inStock) - Number(left.inStock) ||
          left.priceCurrent - right.priceCurrent
      );
  }, [data.offers, shoe]);

  const retailersById = useMemo(
    () => new Map(data.retailers.map((retailer) => [retailer.id, retailer])),
    [data.retailers]
  );

  const offerRows = useMemo(
    () =>
      relatedOffers.map((offer) => ({
        offer,
        retailerName:
          retailersById.get(offer.retailerId)?.name ?? offer.retailerId,
        trust: getTrustSignal(offer.sourceConfidence)
      })),
    [relatedOffers, retailersById]
  );

  const lowestPriceOffer = useMemo(() => {
    if (offerRows.length === 0) return undefined;

    return offerRows.reduce((lowest, current) =>
      current.offer.priceCurrent < lowest.offer.priceCurrent ? current : lowest
    );
  }, [offerRows]);

  const latestScrapedAt = useMemo(() => {
    if (offerRows.length === 0) return undefined;

    const timestampValues = offerRows
      .map((row) => new Date(row.offer.scrapedAt).getTime())
      .filter((value) => !Number.isNaN(value));

    if (timestampValues.length === 0) return undefined;
    return new Date(Math.max(...timestampValues)).toISOString();
  }, [offerRows]);

  const inStockCount = offerRows.filter((row) => row.offer.inStock).length;

  if (!shoe) {
    return (
      <section>
        <h1>Shoe Not Found</h1>
        <p>The selected shoe id does not exist in the current snapshot.</p>
        <Link to="/deals">Back to deals</Link>
      </section>
    );
  }

  const formattedModel = formatModelDisplay(shoe.model);

  return (
    <section>
      <div className="section-header">
        <h1>
          {shoe.brand} {formattedModel}
        </h1>
        <p>
          Category: {shoe.category} | Match rules: {shoe.matchRulesVersion}
        </p>
      </div>

      <div className="deal-grid">
        <article className="deal-card">
          <p className="deal-brand">Lowest Listed Price</p>
          <p className="deal-model">
            {lowestPriceOffer
              ? formatPrice(lowestPriceOffer.offer.priceCurrent)
              : "Not available"}
          </p>
          <p className="deal-meta">
            {lowestPriceOffer
              ? `Best seen at ${lowestPriceOffer.retailerName}.`
              : "No matching offers."}
          </p>
        </article>

        <article className="deal-card">
          <p className="deal-brand">Offers Compared</p>
          <p className="deal-model">{offerRows.length}</p>
          <p className="deal-meta">
            {inStockCount} currently in stock, {offerRows.length - inStockCount}{" "}
            out of stock.
          </p>
        </article>

        <article className="deal-card">
          <p className="deal-brand">Last Offer Crawl</p>
          <p className="deal-model">{formatDateTime(latestScrapedAt)}</p>
          <p className="deal-meta">
            Most recent scrape timestamp among this shoe's offers.
          </p>
        </article>
      </div>

      {offerRows.length === 0 ? (
        <p className="result-count">
          No normalized offers currently match {shoe.brand} {formattedModel}.
        </p>
      ) : (
        <>
          <table className="offer-table">
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Trust</th>
                <th>Current Price</th>
                <th>Original Price</th>
                <th>Discount</th>
                <th>Size</th>
                <th>Stock</th>
                <th>Scraped</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {offerRows.map((row) => (
                <tr key={row.offer.id}>
                  <td>
                    <strong>{row.retailerName}</strong>
                    <div
                      style={{
                        color: "var(--muted)",
                        marginTop: "0.22rem",
                        fontSize: "0.82rem"
                      }}
                    >
                      {row.offer.titleRaw}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        ...row.trust.style,
                        borderRadius: "999px",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        display: "inline-block",
                        padding: "0.2rem 0.5rem"
                      }}
                    >
                      {row.trust.label} ({row.trust.scorePct}%)
                    </span>
                  </td>
                  <td>{formatPrice(row.offer.priceCurrent)}</td>
                  <td>
                    {row.offer.priceOriginal
                      ? formatPrice(row.offer.priceOriginal)
                      : "Not listed"}
                  </td>
                  <td>
                    {typeof row.offer.discountPct === "number"
                      ? `${row.offer.discountPct.toFixed(0)}%`
                      : "Not listed"}
                  </td>
                  <td>{formatSizeDisplay(row.offer.sizeRange) ?? "Not listed"}</td>
                  <td
                    style={{
                      fontWeight: 700,
                      color: row.offer.inStock ? "#125f51" : "#7b2710"
                    }}
                  >
                    {row.offer.inStock ? "In stock" : "Out of stock"}
                  </td>
                  <td>{formatDateTime(row.offer.scrapedAt)}</td>
                  <td>
                    <a href={row.offer.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2
            style={{
              marginTop: "1.25rem",
              marginBottom: "0.45rem",
              fontFamily: "Bricolage Grotesque, Segoe UI, sans-serif",
              fontSize: "1.05rem"
            }}
          >
            Offer Cards
          </h2>
          <p className="result-count" style={{ marginTop: 0 }}>
            Mobile-friendly view with the same trust signal per offer.
          </p>

          <div className="deal-grid">
            {offerRows.map((row) => {
              const sizeDisplay = formatSizeDisplay(row.offer.sizeRange);

              return (
                <article className="deal-card" key={`${row.offer.id}-card`}>
                  <div>
                    <p className="deal-brand">{row.retailerName}</p>
                    <p className="deal-model" style={{ fontSize: "0.95rem" }}>
                      {row.offer.titleRaw}
                    </p>
                    <p className="deal-meta">
                      Scraped {formatDateTime(row.offer.scrapedAt)}
                    </p>
                    {sizeDisplay ? <span className="size-chip">Size {sizeDisplay}</span> : null}
                  </div>

                  <div className="deal-pricing">
                    <p className="deal-price">
                      {formatPrice(row.offer.priceCurrent)}
                    </p>
                    {typeof row.offer.discountPct === "number" ? (
                      <span className="deal-discount">
                        {row.offer.discountPct.toFixed(0)}% off
                      </span>
                    ) : null}
                  </div>

                  <p className="deal-retailer" style={{ marginTop: 0 }}>
                    {row.offer.inStock ? "In stock" : "Out of stock"}
                    {row.offer.priceOriginal
                      ? ` | Was ${formatPrice(row.offer.priceOriginal)}`
                      : ""}
                  </p>

                  <span
                    style={{
                      ...row.trust.style,
                      borderRadius: "999px",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      display: "inline-block",
                      padding: "0.23rem 0.56rem",
                      width: "fit-content"
                    }}
                  >
                    {row.trust.label} ({row.trust.scorePct}%)
                  </span>

                  <div className="deal-actions">
                    <a href={row.offer.url} target="_blank" rel="noreferrer">
                      Open retailer
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
