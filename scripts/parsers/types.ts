import type { RetailerConfig } from "../config/retailers";

export type RawRetailerOffer = {
  url: string;
  titleRaw: string;
  brand?: string;
  modelRaw?: string;
  gender?: "men" | "women" | "unisex" | "kids";
  category?: "running" | "trail";
  colorway?: string;
  sizeRange?: string;
  priceCurrent: number;
  priceOriginal?: number;
  inStock: boolean;
  identifiers?: {
    sku?: string;
    gtin?: string;
  };
};

export type ParsedRetailerResult = {
  offers: RawRetailerOffer[];
  warning?: string;
  usedFixture: boolean;
};

export type RetailerParser = {
  config: RetailerConfig;
  fetchOffers: () => Promise<ParsedRetailerResult>;
};
