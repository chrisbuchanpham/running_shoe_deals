import { useMemo, useState } from "react";
import { DealCard } from "../components/DealCard";
import { defaultDealFilters, filterDeals } from "../lib/filters";
import type { Dataset } from "../lib/dataLoader";

type DealsPageProps = {
  data: Dataset;
};

type SortMode = "max-discount" | "lowest-price" | "most-offers";

const sortLabels: Record<SortMode, string> = {
  "max-discount": "Max discount",
  "lowest-price": "Lowest price",
  "most-offers": "Most offers"
};

export function DealsPage({ data }: DealsPageProps) {
  const [filters, setFilters] = useState(() => defaultDealFilters());
  const [sortMode, setSortMode] = useState<SortMode>("max-discount");

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
  const parserHealthByRetailerId = useMemo(
    () => new Map(data.metadata.parserHealth.map((entry) => [entry.retailerId, entry])),
    [data.metadata.parserHealth]
  );

  const brandOptions = useMemo(
    () => [...new Set(data.shoes.map((shoe) => shoe.brand))].sort(),
    [data.shoes]
  );

  const visibleDeals = useMemo(() => {
    const deals = filterDeals(data.deals, offersById, shoesById, filters);

    deals.sort((a, b) => {
      if (sortMode === "lowest-price") {
        const priceDelta = a.bestPrice - b.bestPrice;
        if (priceDelta !== 0) return priceDelta;
        return (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
      }

      if (sortMode === "most-offers") {
        const offersDelta = b.offersCount - a.offersCount;
        if (offersDelta !== 0) return offersDelta;
        return (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
      }

      const discountDelta = (b.maxDiscountPct ?? 0) - (a.maxDiscountPct ?? 0);
      if (discountDelta !== 0) return discountDelta;
      return a.bestPrice - b.bestPrice;
    });

    return deals;
  }, [data.deals, filters, offersById, shoesById, sortMode]);

  const activeFilters = useMemo(() => {
    const summary: string[] = [];

    if (filters.query.trim()) summary.push(`Search: "${filters.query.trim()}"`);
    if (filters.brand !== "all") summary.push(`Brand: ${filters.brand}`);
    if (filters.category !== "all") summary.push(`Category: ${filters.category}`);
    if (filters.gender !== "all") summary.push(`Gender: ${filters.gender}`);
    if (filters.retailerId !== "all") {
      summary.push(`Retailer: ${retailersById.get(filters.retailerId)?.name ?? filters.retailerId}`);
    }
    if (filters.minPrice !== undefined) summary.push(`Min CAD: ${filters.minPrice.toFixed(2)}`);
    if (filters.maxPrice !== undefined) summary.push(`Max CAD: ${filters.maxPrice.toFixed(2)}`);

    return summary;
  }, [filters, retailersById]);

  const hasActiveFilters = activeFilters.length > 0;

  function resetFilters() {
    setFilters(defaultDealFilters());
  }

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
            onChange={(event) => setFilters((prev) => ({ ...prev, retailerId: event.target.value }))}
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
          Sort
          <select
            aria-label="Sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="max-discount">{sortLabels["max-discount"]}</option>
            <option value="lowest-price">{sortLabels["lowest-price"]}</option>
            <option value="most-offers">{sortLabels["most-offers"]}</option>
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

      <div
        style={{
          marginTop: "0.8rem",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          background: "var(--surface-strong)",
          padding: "0.65rem 0.75rem",
          display: "flex",
          gap: "0.65rem",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <strong>Active filters:</strong>
        <span>{hasActiveFilters ? activeFilters.join(" | ") : "None"}</span>
        <span>Sort: {sortLabels[sortMode]}</span>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          style={{
            marginLeft: "auto",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: hasActiveFilters ? "#fff" : "#f1f1f1",
            color: "inherit",
            cursor: hasActiveFilters ? "pointer" : "not-allowed",
            padding: "0.4rem 0.6rem",
            fontWeight: 700
          }}
        >
          Reset filters
        </button>
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
              retailerHealth={parserHealthByRetailerId.get(offer.retailerId)}
            />
          );
        })}
      </div>
    </section>
  );
}
