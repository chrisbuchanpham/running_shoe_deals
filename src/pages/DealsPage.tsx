import { useMemo, useState } from "react";
import { DealCard } from "../components/DealCard";
import { defaultDealFilters, filterDeals } from "../lib/filters";
import type { Dataset } from "../lib/dataLoader";

type DealsPageProps = {
  data: Dataset;
};

export function DealsPage({ data }: DealsPageProps) {
  const [filters, setFilters] = useState(defaultDealFilters());

  const offersById = useMemo(
    () => new Map(data.offers.map((offer) => [offer.id, offer])),
    [data.offers]
  );
  const shoesById = useMemo(
    () => new Map(data.shoes.map((shoe) => [shoe.shoeId, shoe])),
    [data.shoes]
  );
  const retailersById = useMemo(
    () => new Map(data.retailers.map((retailer) => [retailer.id, retailer])),
    [data.retailers]
  );

  const brandOptions = useMemo(
    () => [...new Set(data.shoes.map((shoe) => shoe.brand))].sort(),
    [data.shoes]
  );

  const visibleDeals = useMemo(
    () =>
      filterDeals(data.deals, offersById, shoesById, filters).sort(
        (a, b) => (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0)
      ),
    [data.deals, filters, offersById, shoesById]
  );

  return (
    <section>
      <div className="section-header">
        <h1>Deal Search</h1>
        <p>Filter by brand, category, gender, price range, and retailer.</p>
      </div>

      <div className="filter-grid">
        <label>
          Search
          <input
            aria-label="Search"
            value={filters.query}
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
            placeholder="e.g. kayano, speedgoat, pegasus"
          />
        </label>
        <label>
          Brand
          <select
            aria-label="Brand"
            value={filters.brand}
            onChange={(event) => setFilters((prev) => ({ ...prev, brand: event.target.value }))}
          >
            <option value="all">All</option>
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            aria-label="Category"
            value={filters.category}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, category: event.target.value as typeof prev.category }))
            }
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="trail">Trail</option>
          </select>
        </label>
        <label>
          Gender
          <select
            aria-label="Gender"
            value={filters.gender}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, gender: event.target.value as typeof prev.gender }))
            }
          >
            <option value="all">All</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
            <option value="kids">Kids</option>
          </select>
        </label>
        <label>
          Retailer
          <select
            aria-label="Retailer"
            value={filters.retailerId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, retailerId: event.target.value }))
            }
          >
            <option value="all">All</option>
            {data.retailers.map((retailer) => (
              <option key={retailer.id} value={retailer.id}>
                {retailer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min Price (CAD)
          <input
            aria-label="Min Price"
            type="number"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                minPrice: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
        </label>
        <label>
          Max Price (CAD)
          <input
            aria-label="Max Price"
            type="number"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                maxPrice: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          />
        </label>
      </div>

      <p className="result-count">{visibleDeals.length} matches</p>

      <div className="deal-grid">
        {visibleDeals.map((deal) => {
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
