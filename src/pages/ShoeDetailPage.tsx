import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Dataset } from "../lib/dataLoader";
import { normalizeBrand } from "../shared/normalization";

type ShoeDetailPageProps = {
  data: Dataset;
};

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
      .sort((a, b) => a.priceCurrent - b.priceCurrent);
  }, [data.offers, shoe]);

  const retailersById = useMemo(
    () => new Map(data.retailers.map((retailer) => [retailer.id, retailer])),
    [data.retailers]
  );

  if (!shoe) {
    return (
      <section>
        <h1>Shoe Not Found</h1>
        <p>The selected shoe id does not exist in the current snapshot.</p>
        <Link to="/deals">Back to deals</Link>
      </section>
    );
  }

  return (
    <section>
      <div className="section-header">
        <h1>
          {shoe.brand} {shoe.model}
        </h1>
        <p>
          Category: {shoe.category} · Match rules: {shoe.matchRulesVersion}
        </p>
      </div>

      <table className="offer-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Current Price</th>
            <th>Original Price</th>
            <th>Discount</th>
            <th>Stock</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {relatedOffers.map((offer) => (
            <tr key={offer.id}>
              <td>{retailersById.get(offer.retailerId)?.name ?? offer.retailerId}</td>
              <td>${offer.priceCurrent.toFixed(2)}</td>
              <td>{offer.priceOriginal ? `$${offer.priceOriginal.toFixed(2)}` : "—"}</td>
              <td>{offer.discountPct ? `${offer.discountPct.toFixed(0)}%` : "—"}</td>
              <td>{offer.inStock ? "In stock" : "Out of stock"}</td>
              <td>
                <a href={offer.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
