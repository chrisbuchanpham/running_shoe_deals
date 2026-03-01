import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTextWithRetry } from "../lib/fetch";
import { readJsonFile } from "../lib/files";
import { inferCategory, inferGender } from "../../src/shared/normalization";
import type { RetailerConfig } from "../config/retailers";
import type { ParsedRetailerResult, RawRetailerOffer, RetailerParser } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function collectProductsFromJsonLd(node: unknown, out: any[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectProductsFromJsonLd(item, out);
    }
    return;
  }

  const type = (node as Record<string, unknown>)["@type"];
  if (typeof type === "string" && type.toLowerCase() === "product") {
    out.push(node);
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    collectProductsFromJsonLd(value, out);
  }
}

function productToRawOffer(product: any, fallbackUrl: string): RawRetailerOffer | undefined {
  const titleRaw: string | undefined = product?.name;
  if (!titleRaw) return undefined;

  const offerData = Array.isArray(product?.offers)
    ? product.offers[0]
    : product?.offers ?? {};
  const priceCurrent = Number(offerData?.price);
  if (!Number.isFinite(priceCurrent) || priceCurrent <= 0) return undefined;

  const availabilityRaw = String(offerData?.availability ?? "");
  const inStock = !availabilityRaw || /instock/i.test(availabilityRaw);
  const brandRaw =
    typeof product?.brand === "string"
      ? product.brand
      : typeof product?.brand?.name === "string"
        ? product.brand.name
        : undefined;

  const gtin =
    typeof product?.gtin13 === "string"
      ? product.gtin13
      : typeof product?.gtin === "string"
        ? product.gtin
        : undefined;

  return {
    url: product?.url ?? fallbackUrl,
    titleRaw,
    brand: brandRaw,
    modelRaw: product?.model ?? titleRaw,
    category: inferCategory(titleRaw),
    gender: inferGender(titleRaw),
    priceCurrent,
    priceOriginal:
      Number.isFinite(Number(offerData?.highPrice)) && Number(offerData?.highPrice) > priceCurrent
        ? Number(offerData.highPrice)
        : undefined,
    inStock,
    identifiers: {
      sku: typeof product?.sku === "string" ? product.sku : undefined,
      gtin
    }
  };
}

function extractOffersFromHtml(html: string, fallbackUrl: string): RawRetailerOffer[] {
  const scripts = html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const products: any[] = [];

  for (const script of scripts) {
    const body = script
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!body) continue;
    try {
      const parsed = JSON.parse(body);
      collectProductsFromJsonLd(parsed, products);
    } catch {
      continue;
    }
  }

  const rawOffers: RawRetailerOffer[] = [];
  for (const product of products) {
    const offer = productToRawOffer(product, fallbackUrl);
    if (offer) rawOffers.push(offer);
  }
  return rawOffers;
}

async function loadFixtureOffers(config: RetailerConfig): Promise<RawRetailerOffer[]> {
  const fixturePath = path.resolve(__dirname, "..", "fixtures", config.fixtureFile);
  return readJsonFile<RawRetailerOffer[]>(fixturePath);
}

export function createRetailerParser(config: RetailerConfig): RetailerParser {
  return {
    config,
    async fetchOffers(): Promise<ParsedRetailerResult> {
      if (!config.allowScrape) {
        return {
          offers: await loadFixtureOffers(config),
          warning: "Scraping disabled by retailer guardrail, loaded fixture data.",
          usedFixture: true
        };
      }

      try {
        const html = await fetchTextWithRetry(config.dealsUrl, {
          retries: 2,
          timeoutMs: 10_000,
          minDelayMs: 700
        });

        const extracted = extractOffersFromHtml(html, config.dealsUrl);
        if (extracted.length > 0) {
          return { offers: extracted, usedFixture: false };
        }

        return {
          offers: await loadFixtureOffers(config),
          warning: "No JSON-LD offers found, loaded fixture data.",
          usedFixture: true
        };
      } catch {
        return {
          offers: await loadFixtureOffers(config),
          warning: "Fetch failed, loaded fixture data.",
          usedFixture: true
        };
      }
    }
  };
}
