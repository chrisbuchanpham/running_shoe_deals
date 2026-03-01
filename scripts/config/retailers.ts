import type { Retailer } from "../../src/shared/contracts";

export type RetailerConfig = Retailer & {
  parserId: string;
  dealsUrl: string;
  fixtureFile: string;
  allowScrape: boolean;
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
    allowScrape: true
  },
  {
    id: "mec",
    parserId: "mec",
    name: "MEC",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.mec.ca",
    logoUrl: "https://www.mec.ca/favicon.ico",
    dealsUrl: "https://www.mec.ca/en/products/footwear/running-shoes",
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
    allowScrape: true
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
    dealsUrl: "https://www.blacktoerunning.com/collections/mens-running-shoes",
    fixtureFile: "blacktoe.json",
    allowScrape: true
  },
  {
    id: "soles",
    parserId: "soles",
    name: "Soles",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://shop.sportinglife.ca",
    logoUrl: "https://shop.sportinglife.ca/favicon.ico",
    dealsUrl: "https://shop.sportinglife.ca/collections/running-shoes",
    fixtureFile: "soles.json",
    allowScrape: true
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
    allowScrape: true
  },
  {
    id: "asics-ca",
    parserId: "asics-ca",
    name: "ASICS Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.asics.com/ca/en-ca",
    logoUrl: "https://www.asics.com/favicon.ico",
    dealsUrl: "https://www.asics.com/ca/en-ca/running-shoes/c/aa20105000/",
    fixtureFile: "asics-ca.json",
    allowScrape: true
  },
  {
    id: "new-balance-ca",
    parserId: "new-balance-ca",
    name: "New Balance Canada",
    country: "CA",
    currency: "CAD",
    homepageUrl: "https://www.newbalance.ca",
    logoUrl: "https://www.newbalance.ca/favicon.ico",
    dealsUrl: "https://www.newbalance.ca/en_ca/men/shoes/running/",
    fixtureFile: "new-balance-ca.json",
    allowScrape: true
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
  }
];
