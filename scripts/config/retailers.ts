import type { Retailer } from "../../src/shared/contracts";

export type RetailerPaginationConfig =
  | {
      strategy: "none";
    }
  | {
      strategy: "query";
      pageParam: string;
      startPage: number;
      maxPages: number;
    }
  | {
      strategy: "path";
      pathTemplate: string;
      startPage: number;
      maxPages: number;
    };

export type RetailerHttpProfileConfig = {
  profile: "default" | "anti-bot" | "selector-fallback";
  retries: number;
  timeoutMs: number;
  minDelayMs: number;
};

export type RetailerExtractionHints = {
  embeddedState?: {
    prefer: boolean;
    scriptIds?: string[];
    globalKeys?: string[];
    rootKeys?: string[];
  };
};

export type RetailerConfig = Retailer & {
  parserId: string;
  dealsUrl: string;
  fixtureFile: string;
  allowScrape: boolean;
  pagination?: RetailerPaginationConfig;
  httpProfile?: RetailerHttpProfileConfig;
  extractionHints?: RetailerExtractionHints;
};

const QUERY_PAGE_PAGINATION: RetailerPaginationConfig = {
  strategy: "query",
  pageParam: "page",
  startPage: 2,
  maxPages: 3
};

const NO_PAGINATION: RetailerPaginationConfig = {
  strategy: "none"
};

const ASICS_PAGINATION: RetailerPaginationConfig = {
  strategy: "query",
  pageParam: "p",
  startPage: 2,
  maxPages: 3
};

const DEFAULT_HTTP_PROFILE: RetailerHttpProfileConfig = {
  profile: "default",
  retries: 2,
  timeoutMs: 12_000,
  minDelayMs: 700
};

const ANTI_BOT_HTTP_PROFILE: RetailerHttpProfileConfig = {
  profile: "anti-bot",
  retries: 2,
  timeoutMs: 18_000,
  minDelayMs: 1_200
};

const SELECTOR_FALLBACK_HTTP_PROFILE: RetailerHttpProfileConfig = {
  profile: "selector-fallback",
  retries: 2,
  timeoutMs: 15_000,
  minDelayMs: 900
};

export const RETAILERS: RetailerConfig[] = [
  {
    id: "running-room",
    parserId: "running-room",
    name: "Running Room",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.runningroom.com",
    logoUrl: "https://www.runningroom.com/favicon.ico",
    shippingNotes: "Free shipping thresholds vary by promo.",
    dealsUrl: "https://www.runningroom.com/ca/products/shoes",
    fixtureFile: "running-room.json",
    allowScrape: true
  },
  {
    id: "sport-chek",
    parserId: "sport-chek",
    name: "Sport Chek",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.sportchek.ca",
    logoUrl: "https://www.sportchek.ca/favicon.ico",
    dealsUrl: "https://www.sportchek.ca/en/cat/shop-by-sport/running/running-shoes-DC2001110.html",
    fixtureFile: "sport-chek.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: SELECTOR_FALLBACK_HTTP_PROFILE
  },
  {
    id: "mec",
    parserId: "mec",
    name: "MEC",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.mec.ca",
    logoUrl: "https://www.mec.ca/favicon.ico",
    dealsUrl: "https://www.mec.ca/en/products/running/running-and-training-footwear/running-shoes/mens",
    fixtureFile: "mec.json",
    allowScrape: true
  },
  {
    id: "altitude-sports",
    parserId: "altitude-sports",
    name: "Altitude Sports",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.altitude-sports.com",
    logoUrl: "https://www.altitude-sports.com/favicon.ico",
    dealsUrl: "https://www.altitude-sports.com/collections/running-shoes",
    fixtureFile: "altitude-sports.json",
    allowScrape: true,
    pagination: QUERY_PAGE_PAGINATION,
    httpProfile: SELECTOR_FALLBACK_HTTP_PROFILE,
    extractionHints: {
      embeddedState: {
        prefer: true,
        scriptIds: ["__NEXT_DATA__", "__NUXT_DATA__"],
        globalKeys: ["window.__INITIAL_STATE__", "window.__APOLLO_STATE__"],
        rootKeys: ["products", "items", "hits", "edges"]
      }
    }
  },
  {
    id: "the-last-hunt",
    parserId: "the-last-hunt",
    name: "The Last Hunt",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.thelasthunt.com",
    logoUrl: "https://www.thelasthunt.com/favicon.ico",
    dealsUrl: "https://www.thelasthunt.com/collections/footwear-running",
    fixtureFile: "the-last-hunt.json",
    allowScrape: true
  },
  {
    id: "blacktoe",
    parserId: "blacktoe",
    name: "BlackToe Running",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.blacktoerunning.com",
    logoUrl: "https://www.blacktoerunning.com/favicon.ico",
    dealsUrl: "https://www.blacktoerunning.com/collections/mens-shoes",
    fixtureFile: "blacktoe.json",
    allowScrape: true
  },
  {
    id: "soles",
    parserId: "soles",
    name: "Soles",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.sportinglife.ca",
    logoUrl: "https://www.sportinglife.ca/favicon.ico",
    dealsUrl: "https://www.sportinglife.ca/",
    fixtureFile: "soles.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: DEFAULT_HTTP_PROFILE
  },
  {
    id: "nike-ca",
    parserId: "nike-ca",
    name: "Nike Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.nike.com/ca",
    logoUrl: "https://www.nike.com/favicon.ico",
    dealsUrl: "https://www.nike.com/ca/w/running-shoes-37v7jznik1zy7ok",
    fixtureFile: "nike-ca.json",
    allowScrape: true
  },
  {
    id: "adidas-ca",
    parserId: "adidas-ca",
    name: "adidas Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.adidas.ca",
    logoUrl: "https://www.adidas.ca/favicon.ico",
    dealsUrl: "https://www.adidas.ca/en/running-shoes",
    fixtureFile: "adidas-ca.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: ANTI_BOT_HTTP_PROFILE
  },
  {
    id: "asics-ca",
    parserId: "asics-ca",
    name: "ASICS Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.asics.com/ca/en-ca",
    logoUrl: "https://www.asics.com/favicon.ico",
    dealsUrl: "https://www.asics.com/ca/en-ca/footwear/running",
    fixtureFile: "asics-ca.json",
    allowScrape: true,
    pagination: ASICS_PAGINATION,
    httpProfile: DEFAULT_HTTP_PROFILE
  },
  {
    id: "new-balance-ca",
    parserId: "new-balance-ca",
    name: "New Balance Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.newbalance.ca",
    logoUrl: "https://www.newbalance.ca/favicon.ico",
    dealsUrl: "https://www.newbalance.ca/en_ca/shoes/running/",
    fixtureFile: "new-balance-ca.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: ANTI_BOT_HTTP_PROFILE
  },
  {
    id: "brooks-ca",
    parserId: "brooks-ca",
    name: "Brooks Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.brooksrunning.com/en_ca",
    logoUrl: "https://www.brooksrunning.com/favicon.ico",
    dealsUrl: "https://www.brooksrunning.com/en_ca/mens-running-shoes/",
    fixtureFile: "brooks-ca.json",
    allowScrape: true
  },
  {
    id: "hoka-ca",
    parserId: "hoka-ca",
    name: "HOKA Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.hoka.com/en/ca/",
    logoUrl: "https://www.hoka.com/favicon.ico",
    dealsUrl: "https://www.hoka.com/en/ca/mens-running-shoes/",
    fixtureFile: "hoka-ca.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: DEFAULT_HTTP_PROFILE
  },
  {
    id: "saucony-ca",
    parserId: "saucony-ca",
    name: "Saucony Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.saucony.com/CA/en_CA/home",
    logoUrl: "https://www.saucony.com/favicon.ico",
    dealsUrl: "https://www.saucony.com/CA/en_CA/mens-running-shoes/",
    fixtureFile: "saucony-ca.json",
    allowScrape: true
  },
  {
    id: "salomon-ca",
    parserId: "salomon-ca",
    name: "Salomon Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.salomon.com/en-ca",
    logoUrl: "https://www.salomon.com/favicon.ico",
    dealsUrl: "https://www.salomon.com/en-ca/c/sports/trail-running/trail-running-shoes",
    fixtureFile: "salomon-ca.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: ANTI_BOT_HTTP_PROFILE
  },
  {
    id: "on-running-ca",
    parserId: "on-running-ca",
    name: "On Running Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.on.com/en-ca",
    logoUrl: "https://www.on.com/favicon.ico",
    dealsUrl: "https://www.on.com/en-ca/shop/shoes/running",
    fixtureFile: "on-running-ca.json",
    allowScrape: true,
    pagination: QUERY_PAGE_PAGINATION,
    httpProfile: SELECTOR_FALLBACK_HTTP_PROFILE,
    extractionHints: {
      embeddedState: {
        prefer: true,
        scriptIds: ["__NEXT_DATA__"],
        globalKeys: ["window.__NEXT_DATA__", "window.__INITIAL_STATE__", "window.__APOLLO_STATE__"],
        rootKeys: ["props", "pageProps", "products", "productGrid", "items"]
      }
    }
  },
  {
    id: "under-armour-ca",
    parserId: "under-armour-ca",
    name: "Under Armour Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.underarmour.ca/en-ca/",
    logoUrl: "https://www.underarmour.ca/favicon.ico",
    dealsUrl: "https://www.underarmour.ca/en-ca/c/mens/shoes/running/",
    fixtureFile: "under-armour-ca.json",
    allowScrape: true,
    pagination: NO_PAGINATION,
    httpProfile: DEFAULT_HTTP_PROFILE
  }
];
