import { DealCard } from "../components/DealCard";
import type { Dataset } from "../lib/dataLoader";

type HomePageProps = {
  data: Dataset;
};

export function HomePage({ data }: HomePageProps) {
  const offersById = new Map(data.offers.map((offer) => [offer.id, offer]));
  const shoesById = new Map(data.shoes.map((shoe) => [shoe.shoeId, shoe]));
  const retailersById = new Map(data.retailers.map((retailer) => [retailer.id, retailer]));

  const featuredDeals = [...data.deals]
    .sort((a, b) => {
      const discountDelta = (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
      if (discountDelta !== 0) return discountDelta;
      return a.bestPrice - b.bestPrice;
    })
    .slice(0, 12);

  return (
    <section>
      <div className="section-header">
        <h1>Best Running + Trail Deals</h1>
        <p>Daily CAD snapshots from major Canadian retailers.</p>
      </div>
      <div className="deal-grid">
        {featuredDeals.map((deal) => {
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
            />
          );
        })}
      </div>
    </section>
  );
}
