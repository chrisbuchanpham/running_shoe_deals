import { Link } from "react-router-dom";
import type { DealCard as DealCardType, Offer, Retailer, ShoeCanonical } from "../shared/contracts";

type DealCardProps = {
  deal: DealCardType;
  shoe: ShoeCanonical;
  bestOffer: Offer;
  retailer?: Retailer;
};

export function DealCard({ deal, shoe, bestOffer, retailer }: DealCardProps) {
  return (
    <article className="deal-card">
      <div className="deal-card-top">
        <p className="deal-brand">{shoe.brand}</p>
        <p className="deal-model">{shoe.model}</p>
        <p className="deal-meta">
          {shoe.category} · {deal.offersCount} retailer offer{deal.offersCount > 1 ? "s" : ""}
        </p>
      </div>
      <div className="deal-pricing">
        <p className="deal-price">${deal.bestPrice.toFixed(2)} CAD</p>
        {deal.maxDiscountPct ? (
          <span className="deal-discount">Up to {deal.maxDiscountPct.toFixed(0)}% off</span>
        ) : null}
      </div>
      <p className="deal-retailer">
        Best listed at <strong>{retailer?.name ?? bestOffer.retailerId}</strong>
      </p>
      <div className="deal-actions">
        <Link to={`/shoes/${shoe.shoeId}`}>Compare retailers</Link>
        <a href={bestOffer.url} target="_blank" rel="noreferrer">
          Open retailer
        </a>
      </div>
    </article>
  );
}
