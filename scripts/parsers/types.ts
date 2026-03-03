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

export type RetailerBlockerClassification =
  | "url-drift"
  | "anti-bot"
  | "selector-drift"
  | "pagination"
  | "unknown";

export type ParsedRetailerDiagnostics = {
  executionPath?: "http" | "browser" | "fixture";
  blocker?: {
    classification: RetailerBlockerClassification;
    details?: string;
    url?: string;
  };
};

export type ParsedRetailerResult = {
  offers: RawRetailerOffer[];
  warning?: string;
  usedFixture: boolean;
  discoveredCount: number;
  parsedCount: number;
  pagesCrawled: number;
  sourceMode: "live" | "fixture";
  diagnostics?: ParsedRetailerDiagnostics;
};

export type RetailerParser = {
  config: RetailerConfig;
  fetchOffers: () => Promise<ParsedRetailerResult>;
};
