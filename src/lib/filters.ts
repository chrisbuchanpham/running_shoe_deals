import type { DealCard, Offer, ShoeCanonical } from "../shared/contracts";
import { normalizeToken } from "../shared/normalization";

export type DealFilterState = {
  query: string;
  brand: string;
  category: "all" | "running" | "trail";
  gender: "all" | "men" | "women" | "unisex" | "kids";
  retailerId: string;
  minPrice?: number;
  maxPrice?: number;
};

export function defaultDealFilters(): DealFilterState {
  return {
    query: "",
    brand: "all",
    category: "all",
    gender: "all",
    retailerId: "all",
    minPrice: undefined,
    maxPrice: undefined
  };
}

export function filterDeals(
  deals: DealCard[],
  offersById: Map<string, Offer>,
  shoesById: Map<string, ShoeCanonical>,
  filters: DealFilterState
): DealCard[] {
  const queryToken = normalizeToken(filters.query);

  return deals.filter((deal) => {
    const offer = offersById.get(deal.bestOfferId);
    const shoe = shoesById.get(deal.shoeId);
    if (!offer || !shoe) return false;

    if (filters.brand !== "all" && shoe.brand !== filters.brand) return false;
    if (filters.category !== "all" && shoe.category !== filters.category) return false;
    if (filters.gender !== "all" && offer.gender !== filters.gender) return false;
    if (filters.retailerId !== "all" && offer.retailerId !== filters.retailerId) return false;
    if (filters.minPrice !== undefined && deal.bestPrice < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && deal.bestPrice > filters.maxPrice) return false;

    if (queryToken) {
      const haystack = normalizeToken(`${shoe.brand} ${shoe.model} ${offer.titleRaw}`);
      if (!haystack.includes(queryToken)) return false;
    }

    return true;
  });
}
