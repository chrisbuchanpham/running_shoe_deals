import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPageWithRetry } from "../lib/fetch";
import { fetchPageWithBrowser } from "../lib/browser-fetch";
import { readJsonFile } from "../lib/files";
import { isLikelyShoeOffer, normalizeOfferText } from "../lib/shoeOfferQuality";
import { inferCategory, inferGender } from "../../src/shared/normalization";
import type {
  RetailerConfig,
  RetailerExtractionHints,
  RetailerHttpProfileConfig,
  RetailerPaginationConfig
} from "../config/retailers";
import type {
  ParsedRetailerResult,
  RawRetailerOffer,
  RetailerBlockerClassification,
  RetailerParser
} from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PAGINATION_CONFIG: RetailerPaginationConfig = {
  strategy: "query",
  pageParam: "page",
  startPage: 2,
  maxPages: 3
};
const DEFAULT_HTTP_PROFILE_CONFIG: RetailerHttpProfileConfig = {
  profile: "default",
  retries: 2,
  timeoutMs: 12_000,
  minDelayMs: 700
};
const DEFAULT_BROWSER_WAIT_MS = 2_500;
const DEFAULT_BROWSER_MAX_PAGES = 3;
const PRICE_RE = /(?:CAD|CA\$|C\$|\$)\s*([0-9][0-9\s,]*(?:\s*[.,]\s*[0-9]{2})?)/gi;
const SCRIPT_RE = /<script[^>]*>([\s\S]*?)<\/script>/gi;
const JSON_LD_SCRIPT_RE = /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi;
const PRODUCT_LINK_RE = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

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

function normalizeUrl(candidate: string, fallbackUrl: string): string {
  try {
    return new URL(candidate, fallbackUrl).toString();
  } catch {
    return fallbackUrl;
  }
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value
      .replace(/&nbsp;/gi, " ")
      .replace(/[^\d.,-]+/g, "")
      .replace(/\s+/g, "")
      .replace(/(\d),(\d{2})$/, "$1.$2")
      .replace(/,/g, "");
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parsePriceList(snippet: string): number[] {
  const text = stripTags(snippet).replace(/(\d)\s*[.,]\s*(\d{2})/g, "$1.$2");
  const prices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = PRICE_RE.exec(text)) !== null) {
    const parsed = numberFromUnknown(match[1]);
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
      prices.push(parsed);
    }
  }
  PRICE_RE.lastIndex = 0;

  if (prices.length === 0 && /\b(?:price|sale|now|from|was|save)\b/i.test(text)) {
    const numericRe = /\b([1-9][0-9]{1,3}(?:[.,][0-9]{2}))\b/g;
    while ((match = numericRe.exec(text)) !== null) {
      const parsed = numberFromUnknown(match[1]);
      if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 20 && parsed < 2_500) {
        prices.push(parsed);
      }
    }
  }

  return prices;
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromUrlPath(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split("/").filter(Boolean).pop();
    if (!slug) return undefined;
    const decoded = decodeURIComponent(slug)
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b(?:pdp|product|products|pd|p)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (decoded.length < 8) return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

function productToRawOffer(product: any, fallbackUrl: string): RawRetailerOffer | undefined {
  const titleRaw = normalizeOfferText(String(product?.name ?? ""));
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
  const modelRaw = normalizeOfferText(String(product?.model ?? titleRaw)) || titleRaw;
  const category = inferCategory(titleRaw);
  const gender = inferGender(titleRaw);
  const url = normalizeUrl(String(product?.url ?? fallbackUrl), fallbackUrl);
  if (!isLikelyShoeOffer({ title: titleRaw, model: modelRaw, url, category })) {
    return undefined;
  }

  return {
    url,
    titleRaw,
    brand: brandRaw,
    modelRaw,
    category,
    gender,
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

function extractJsonLdOffers(html: string, fallbackUrl: string): RawRetailerOffer[] {
  const scripts = html.match(JSON_LD_SCRIPT_RE) ?? [];
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

function extractProductCards(html: string, fallbackUrl: string): RawRetailerOffer[] {
  const offers: RawRetailerOffer[] = [];
  PRODUCT_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PRODUCT_LINK_RE.exec(html)) !== null) {
    const href = match[2];
    const anchorContent = match[0];
    const absoluteUrl = normalizeUrl(href, fallbackUrl);
    const titleFromAttr =
      /aria-label=(["'])(.*?)\1/i.exec(anchorContent)?.[2] ??
      /title=(["'])(.*?)\1/i.exec(anchorContent)?.[2];
    const titleRaw = normalizeOfferText(
      stripTags(titleFromAttr ?? match[3] ?? "") || titleFromUrlPath(absoluteUrl) || ""
    );
    if (!titleRaw || titleRaw.length < 8) continue;

    const windowStart = Math.max(0, (match.index ?? 0) - 400);
    const windowEnd = Math.min(html.length, (match.index ?? 0) + anchorContent.length + 700);
    const surrounding = html.slice(windowStart, windowEnd);
    const surroundingText = stripTags(`${anchorContent} ${surrounding}`);
    const prices = parsePriceList(surroundingText);
    if (prices.length === 0) {
      prices.push(...parsePriceList(titleRaw));
    }
    if (prices.length === 0) continue;

    const uniqueSortedPrices = [...new Set(prices)].sort((a, b) => a - b);

    const current = uniqueSortedPrices[0];
    const original = uniqueSortedPrices.find((value) => value > current);
    const modelRaw = titleRaw;
    const category = inferCategory(titleRaw);
    const gender = inferGender(titleRaw);
    if (!isLikelyShoeOffer({ title: titleRaw, model: modelRaw, url: absoluteUrl, category })) {
      continue;
    }

    offers.push({
      url: absoluteUrl,
      titleRaw,
      modelRaw,
      brand: undefined,
      category,
      gender,
      priceCurrent: current,
      priceOriginal: original,
      inStock: !/out[-\s]?of[-\s]?stock|sold[-\s]?out/i.test(surroundingText),
      identifiers: {
        sku:
          /(?:sku|product(?:[_\s-]?id)?)["':\s-]*([a-z0-9-]{4,})/i.exec(surrounding)?.[1] ??
          undefined,
        gtin: /(?:gtin|ean|upc)["':\s-]*([0-9]{8,14})/i.exec(surrounding)?.[1] ?? undefined
      }
    });
  }
  PRODUCT_LINK_RE.lastIndex = 0;

  return offers;
}

function extractTrackingSignalOffers(html: string, fallbackUrl: string): RawRetailerOffer[] {
  if (!/\/pdp\//i.test(fallbackUrl)) {
    return [];
  }

  const titleRaw = normalizeOfferText(
    stripTags((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\|.*$/, ""))
  );
  if (!titleRaw || titleRaw.length < 8) {
    return [];
  }

  const trackedPrices: number[] = [];
  const trackedPriceRe = /\bpr%3D([0-9]+(?:\.[0-9]{2})?)/gi;
  let match: RegExpExecArray | null;
  while ((match = trackedPriceRe.exec(html)) !== null) {
    const parsed = numberFromUnknown(match[1]);
    if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
      trackedPrices.push(parsed);
    }
  }
  trackedPriceRe.lastIndex = 0;

  const priceCurrent = [...new Set(trackedPrices)].sort((a, b) => a - b)[0];
  if (!priceCurrent) {
    return [];
  }

  const category = inferCategory(titleRaw);
  const modelRaw = titleRaw;
  if (!isLikelyShoeOffer({ title: titleRaw, model: modelRaw, url: fallbackUrl, category })) {
    return [];
  }

  return [
    {
      url: fallbackUrl,
      titleRaw,
      modelRaw,
      brand: undefined,
      category,
      gender: inferGender(titleRaw),
      priceCurrent,
      priceOriginal: undefined,
      inStock: !/out[-\s]?of[-\s]?stock|sold[-\s]?out/i.test(html),
      identifiers: {}
    }
  ];
}

function extractOfferLikeNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) {
      extractOfferLikeNodes(child, out);
    }
    return;
  }

  const candidate = node as Record<string, unknown>;
  const title = candidate.name ?? candidate.title ?? candidate.productName ?? candidate.product_name;
  const titleText =
    typeof title === "string" || typeof title === "number"
      ? normalizeOfferText(String(title))
      : "";
  const directPrice =
    candidate.price ??
    candidate.currentPrice ??
    candidate.salePrice ??
    candidate.offerPrice ??
    (candidate.pricing_information as Record<string, unknown> | undefined)?.currentPrice ??
    (candidate.prices as Record<string, unknown> | undefined)?.final ??
    (candidate.prices as Record<string, unknown> | undefined)?.sale ??
    (candidate.prices as Record<string, unknown> | undefined)?.current;

  if (titleText && numberFromUnknown(directPrice) && isLikelyShoeOffer({ title: titleText })) {
    out.push(candidate);
  }

  for (const value of Object.values(candidate)) {
    extractOfferLikeNodes(value, out);
  }
}

function parseScriptJson(rawScriptBody: string): unknown | undefined {
  const body = rawScriptBody.trim();
  if (!body) return undefined;

  const nextData = /id=(["'])__NEXT_DATA__\1/i.test(rawScriptBody);
  if (nextData) {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }

  const assignmentMatch = body.match(/^window\.[a-zA-Z0-9_$]+\s*=\s*([\s\S]+?);?$/);
  const payload = assignmentMatch ? assignmentMatch[1].trim() : body;
  if (!(payload.startsWith("{") || payload.startsWith("["))) {
    return undefined;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function nestedNumber(node: Record<string, unknown>, keys: string[]): number | undefined {
  let cursor: unknown = node;
  for (const key of keys) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return numberFromUnknown(cursor);
}

function offerLikeNodeToRawOffer(node: Record<string, unknown>, fallbackUrl: string): RawRetailerOffer | undefined {
  const titleRaw = normalizeOfferText(
    String(node.name ?? node.title ?? node.productName ?? node.product_name ?? "")
  );
  if (!titleRaw) return undefined;

  const priceCurrent =
    numberFromUnknown(node.price) ??
    numberFromUnknown(node.currentPrice) ??
    numberFromUnknown(node.salePrice) ??
    numberFromUnknown(node.offerPrice) ??
    numberFromUnknown((node.pricing_information as Record<string, unknown> | undefined)?.currentPrice) ??
    numberFromUnknown((node.prices as Record<string, unknown> | undefined)?.final) ??
    numberFromUnknown((node.prices as Record<string, unknown> | undefined)?.sale) ??
    numberFromUnknown((node.prices as Record<string, unknown> | undefined)?.current) ??
    nestedNumber(node, ["pricing_information", "currentPrice"]) ??
    nestedNumber(node, ["prices", "final"]) ??
    nestedNumber(node, ["price", "amount"]) ??
    nestedNumber(node, ["price", "value"]) ??
    nestedNumber(node, ["prices", "current", "amount"]);
  if (!priceCurrent || priceCurrent <= 0) return undefined;

  const priceOriginal =
    numberFromUnknown(node.originalPrice) ??
    numberFromUnknown(node.compareAtPrice) ??
    numberFromUnknown(node.listPrice) ??
    numberFromUnknown((node.pricing_information as Record<string, unknown> | undefined)?.standardPrice) ??
    numberFromUnknown((node.prices as Record<string, unknown> | undefined)?.list) ??
    numberFromUnknown((node.prices as Record<string, unknown> | undefined)?.original) ??
    nestedNumber(node, ["pricing_information", "standardPrice"]) ??
    nestedNumber(node, ["compareAtPrice", "amount"]) ??
    nestedNumber(node, ["prices", "original", "amount"]) ??
    nestedNumber(node, ["priceRange", "max"]);

  const rawBrand = node.brand;
  const brand =
    typeof rawBrand === "string"
      ? rawBrand
      : typeof rawBrand === "object" && rawBrand !== null
        ? String((rawBrand as Record<string, unknown>).name ?? "")
        : undefined;
  const modelRaw = normalizeOfferText(String(node.model ?? titleRaw)) || titleRaw;
  const category = inferCategory(titleRaw);
  const gender = inferGender(titleRaw);
  const url = normalizeUrl(String(node.url ?? node.link ?? fallbackUrl), fallbackUrl);
  if (!isLikelyShoeOffer({ title: titleRaw, model: modelRaw, url, category })) {
    return undefined;
  }

  return {
    url,
    titleRaw,
    brand: brand || undefined,
    modelRaw,
    category,
    gender,
    priceCurrent,
    priceOriginal: priceOriginal && priceOriginal > priceCurrent ? priceOriginal : undefined,
    inStock: !/out[-\s]?of[-\s]?stock|sold[-\s]?out/i.test(String(node.availability ?? "")),
    identifiers: {
      sku:
        typeof node.sku === "string"
          ? node.sku
          : typeof node.product_id === "string" || typeof node.product_id === "number"
            ? String(node.product_id)
            : undefined,
      gtin:
        typeof node.gtin === "string"
          ? node.gtin
          : typeof node.gtin13 === "string"
            ? node.gtin13
            : undefined
    }
  };
}

function matchesEmbeddedHint(
  rawScriptTag: string,
  rawScriptBody: string,
  hints?: RetailerExtractionHints["embeddedState"]
): boolean {
  if (!hints) return false;
  const source = `${rawScriptTag}\n${rawScriptBody}`.toLowerCase();

  for (const scriptId of hints.scriptIds ?? []) {
    if (source.includes(scriptId.toLowerCase())) return true;
  }
  for (const globalKey of hints.globalKeys ?? []) {
    if (source.includes(globalKey.toLowerCase())) return true;
  }
  for (const rootKey of hints.rootKeys ?? []) {
    const needle = rootKey.toLowerCase();
    if (source.includes(`"${needle}"`) || source.includes(`${needle}:`)) return true;
  }
  return false;
}

function extractEmbeddedStateOffers(
  html: string,
  fallbackUrl: string,
  hints?: RetailerExtractionHints["embeddedState"]
): RawRetailerOffer[] {
  const offers: RawRetailerOffer[] = [];
  const prioritizedScripts: string[] = [];
  const regularScripts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = SCRIPT_RE.exec(html)) !== null) {
    if (matchesEmbeddedHint(match[0], match[1], hints)) {
      prioritizedScripts.push(match[1]);
    } else {
      regularScripts.push(match[1]);
    }
  }
  SCRIPT_RE.lastIndex = 0;

  for (const scriptBody of [...prioritizedScripts, ...regularScripts]) {
    const parsed = parseScriptJson(scriptBody);
    if (!parsed) continue;
    const nodes: Record<string, unknown>[] = [];
    extractOfferLikeNodes(parsed, nodes);
    for (const node of nodes) {
      const offer = offerLikeNodeToRawOffer(node, fallbackUrl);
      if (offer) offers.push(offer);
    }
  }

  return offers;
}

function dedupeOffers(offers: RawRetailerOffer[]): RawRetailerOffer[] {
  const seen = new Set<string>();
  const output: RawRetailerOffer[] = [];
  for (const offer of offers) {
    const key = `${offer.url}|${offer.titleRaw}|${offer.priceCurrent.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(offer);
    }
  }
  return output;
}

function extractOffersFromHtml(html: string, fallbackUrl: string, config: RetailerConfig): {
  offers: RawRetailerOffer[];
  discoveredCount: number;
} {
  const embeddedHints = config.extractionHints?.embeddedState;
  const fromEmbedded = extractEmbeddedStateOffers(html, fallbackUrl, embeddedHints);
  const fromJsonLd = extractJsonLdOffers(html, fallbackUrl);
  const fromCards = extractProductCards(html, fallbackUrl);
  const fromTrackingSignals = extractTrackingSignalOffers(html, fallbackUrl);
  const discoveredCount =
    fromJsonLd.length + fromCards.length + fromEmbedded.length + fromTrackingSignals.length;
  const offers = embeddedHints?.prefer
    ? dedupeOffers([...fromEmbedded, ...fromJsonLd, ...fromCards, ...fromTrackingSignals])
    : dedupeOffers([...fromJsonLd, ...fromCards, ...fromEmbedded, ...fromTrackingSignals]);
  return { offers, discoveredCount };
}

async function loadFixtureOffers(config: RetailerConfig): Promise<RawRetailerOffer[]> {
  const fixturePath = path.resolve(__dirname, "..", "fixtures", config.fixtureFile);
  return readJsonFile<RawRetailerOffer[]>(fixturePath);
}

function dedupePageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    output.push(url);
  }
  return output;
}

function buildPageUrls(baseUrl: string, pagination?: RetailerPaginationConfig): string[] {
  const resolvedPagination = pagination ?? DEFAULT_PAGINATION_CONFIG;
  const urls = [baseUrl];

  if (resolvedPagination.strategy === "none") {
    return urls;
  }

  if (resolvedPagination.strategy === "query") {
    for (let page = resolvedPagination.startPage; page <= resolvedPagination.maxPages; page += 1) {
      try {
        const parsed = new URL(baseUrl);
        parsed.searchParams.set(resolvedPagination.pageParam, String(page));
        urls.push(parsed.toString());
      } catch {
        break;
      }
    }
    return dedupePageUrls(urls);
  }

  for (let page = resolvedPagination.startPage; page <= resolvedPagination.maxPages; page += 1) {
    try {
      const pathUrl = resolvedPagination.pathTemplate.replace("{page}", String(page));
      urls.push(new URL(pathUrl, baseUrl).toString());
    } catch {
      break;
    }
  }
  return dedupePageUrls(urls);
}

function extractXmlLocLinks(xml: string): string[] {
  const links: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const value = match[1].replace(/&amp;/g, "&").trim();
    if (value) links.push(value);
  }
  return links;
}

function extractHtmlHrefLinks(html: string): string[] {
  const links: string[] = [];
  const re = /<a\b[^>]*href=(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[2].replace(/&amp;/g, "&").trim();
    if (href) links.push(href);
  }
  return links;
}

function extractSitemapLinksFromRobots(robotsTxt: string): string[] {
  const links: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap:\s*(\S+)\s*$/i);
    if (match) {
      links.push(match[1]);
    }
  }
  return links;
}

function looksLikeSitemapDocument(url: string): boolean {
  return /sitemap|\.xml(\?|$)/i.test(url);
}

function looksLikeRetailerOfferUrl(url: string, retailerHostname: string): boolean {
  try {
    const parsed = new URL(url);
    const retailerHost = retailerHostname.replace(/^www\./i, "");
    const linkHost = parsed.hostname.replace(/^www\./i, "");
    if (linkHost !== retailerHost) return false;
    const path = parsed.pathname.toLowerCase();
    return /running|trail|shoe|footwear|product|products|\/pd\/|\/p\/|\/dp\//i.test(path);
  } catch {
    return false;
  }
}

async function discoverFallbackUrls(
  config: RetailerConfig,
  httpProfile: RetailerHttpProfileConfig
): Promise<string[]> {
  const homepage = new URL(config.homepageUrl);
  const queue: string[] = [
    new URL("/sitemap.xml", homepage).toString(),
    new URL("/sitemap", homepage).toString(),
    new URL("/sitemap_index.xml", homepage).toString()
  ];
  if (homepage.hostname.includes("adidas.")) {
    queue.push(new URL("/glass/sitemaps/adidas/CA/en/html-sitemap/index.html", homepage).toString());
  }
  if (homepage.hostname.includes("newbalance.")) {
    queue.push(new URL("/en_ca/sitemap", homepage).toString());
  }
  const visited = new Set<string>();
  const candidates: string[] = [];

  try {
    const robotsUrl = new URL("/robots.txt", homepage).toString();
    const robotsPage = await fetchPageWithRetry(robotsUrl, {
      retries: 1,
      timeoutMs: Math.min(httpProfile.timeoutMs, 10_000),
      minDelayMs: 300,
      headerPreset: httpProfile.profile
    });
    for (const link of extractSitemapLinksFromRobots(robotsPage.html)) {
      queue.push(normalizeUrl(link, robotsUrl));
    }
  } catch {
    // continue with default sitemap endpoint
  }

  while (queue.length > 0 && visited.size < 10) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);

    try {
      const page = await fetchPageWithRetry(sitemapUrl, {
        retries: 1,
        timeoutMs: Math.min(httpProfile.timeoutMs, 10_000),
        minDelayMs: 300,
        headerPreset: httpProfile.profile
      });
      const links = [
        ...extractXmlLocLinks(page.html),
        ...extractHtmlHrefLinks(page.html)
      ];
      for (const link of links) {
        const absolute = normalizeUrl(link, sitemapUrl);
        if (looksLikeSitemapDocument(absolute)) {
          if (
            queue.length < 20 &&
            !visited.has(absolute) &&
            /product|catalog|sitemap|shoe|running|trail|\/p\/|\/pd\//i.test(absolute)
          ) {
            queue.push(absolute);
          }
          continue;
        }

        if (looksLikeRetailerOfferUrl(absolute, homepage.hostname)) {
          candidates.push(absolute);
        }
      }
    } catch {
      continue;
    }
  }

  return dedupePageUrls(candidates).slice(0, 40);
}

async function fetchSitemapFallbackOffers(
  config: RetailerConfig,
  httpProfile: RetailerHttpProfileConfig
): Promise<{
  offers: RawRetailerOffer[];
  discoveredCount: number;
  pagesCrawled: number;
}> {
  const fallbackUrls = await discoverFallbackUrls(config, httpProfile);
  if (fallbackUrls.length === 0) {
    return { offers: [], discoveredCount: 0, pagesCrawled: 0 };
  }

  const scrapedOffers: RawRetailerOffer[] = [];
  let discoveredCount = 0;
  let pagesCrawled = 0;

  for (const fallbackUrl of fallbackUrls) {
    try {
      const page = await fetchPageWithRetry(fallbackUrl, {
        retries: 1,
        timeoutMs: Math.min(httpProfile.timeoutMs, 12_000),
        minDelayMs: 400,
        headerPreset: httpProfile.profile
      });
      pagesCrawled += 1;

      const extraction = extractOffersFromHtml(page.html, page.finalUrl || fallbackUrl, config);
      discoveredCount += extraction.discoveredCount;
      scrapedOffers.push(...extraction.offers);

      if (dedupeOffers(scrapedOffers).length >= 80) {
        break;
      }
    } catch {
      continue;
    }
  }

  return {
    offers: dedupeOffers(scrapedOffers),
    discoveredCount,
    pagesCrawled
  };
}

function extractLinkedProductUrlsFromPageHtml(
  html: string,
  baseUrl: string,
  retailerHostname: string
): string[] {
  const links = extractHtmlHrefLinks(html);
  const prioritizedCandidates: string[] = [];
  const secondaryCandidates: string[] = [];
  for (const link of links) {
    const absolute = normalizeUrl(link, baseUrl);
    try {
      const parsed = new URL(absolute);
      const retailerHost = retailerHostname.replace(/^www\./i, "");
      const linkHost = parsed.hostname.replace(/^www\./i, "");
      if (linkHost !== retailerHost) continue;
      const path = parsed.pathname.toLowerCase();
      if (/\/pdp\/|\/product\/|\/pd\/|\/p\//i.test(path)) {
        prioritizedCandidates.push(absolute);
        continue;
      }
      if (/running|trail|shoe|footwear/i.test(path)) {
        secondaryCandidates.push(absolute);
      }
    } catch {
      continue;
    }
  }
  return dedupePageUrls([...prioritizedCandidates, ...secondaryCandidates]);
}

async function fetchLinkedProductFallbackOffers(
  config: RetailerConfig,
  fetchedPages: FetchedPageSnapshot[],
  httpProfile: RetailerHttpProfileConfig
): Promise<{
  offers: RawRetailerOffer[];
  discoveredCount: number;
  pagesCrawled: number;
}> {
  if (fetchedPages.length === 0) {
    return { offers: [], discoveredCount: 0, pagesCrawled: 0 };
  }

  const retailerHostname = new URL(config.homepageUrl).hostname;
  const candidateUrls: string[] = [];
  for (const page of fetchedPages) {
    candidateUrls.push(
      ...extractLinkedProductUrlsFromPageHtml(page.html, page.finalUrl || page.pageUrl, retailerHostname)
    );
  }

  const dedupedCandidateUrls = dedupePageUrls(candidateUrls).slice(0, 8);
  if (dedupedCandidateUrls.length === 0) {
    return { offers: [], discoveredCount: 0, pagesCrawled: 0 };
  }

  const scrapedOffers: RawRetailerOffer[] = [];
  let discoveredCount = 0;
  let pagesCrawled = 0;
  let browserProductPagesFetched = 0;

  for (const productUrl of dedupedCandidateUrls) {
    try {
      const page = await fetchPageWithRetry(productUrl, {
        retries: 1,
        timeoutMs: Math.min(httpProfile.timeoutMs, 15_000),
        minDelayMs: 350,
        headerPreset: httpProfile.profile
      });
      pagesCrawled += 1;
      const extraction = extractOffersFromHtml(page.html, page.finalUrl || productUrl, config);
      discoveredCount += extraction.discoveredCount;
      scrapedOffers.push(...extraction.offers);

      if (extraction.offers.length === 0 && /\/pdp\//i.test(productUrl) && browserProductPagesFetched < 4) {
        try {
          const browserPage = await fetchPageWithBrowser(productUrl, {
            timeoutMs: Math.max(httpProfile.timeoutMs * 2, 30_000),
            waitMs: 2_500
          });
          browserProductPagesFetched += 1;
          pagesCrawled += 1;
          const browserExtraction = extractOffersFromHtml(
            browserPage.html,
            browserPage.finalUrl || productUrl,
            config
          );
          discoveredCount += browserExtraction.discoveredCount;
          scrapedOffers.push(...browserExtraction.offers);
        } catch {
          // Continue scanning remaining candidate URLs.
        }
      }

      if (dedupeOffers(scrapedOffers).length >= 6) {
        break;
      }
    } catch {
      continue;
    }
  }

  return {
    offers: dedupeOffers(scrapedOffers),
    discoveredCount,
    pagesCrawled
  };
}

function shouldAttemptSitemapFallback(classification: RetailerBlockerClassification): boolean {
  return (
    classification === "anti-bot" ||
    classification === "selector-drift" ||
    classification === "url-drift" ||
    classification === "unknown"
  );
}

function shouldAttemptBrowserFallback(classification: RetailerBlockerClassification): boolean {
  return (
    classification === "anti-bot" ||
    classification === "selector-drift" ||
    classification === "url-drift" ||
    classification === "unknown"
  );
}

type PageFetchFailure = {
  pageIndex: number;
  pageUrl: string;
  status?: number;
  antiBotSignal: boolean;
};

type FetchedPageSnapshot = {
  pageUrl: string;
  finalUrl: string;
  html: string;
};

type ExecutionPath = "http" | "browser" | "fixture";
type BrowserFallbackMode = NonNullable<RetailerConfig["browserFallbackMode"]>;

function getResolvedHttpProfile(config: RetailerConfig): RetailerHttpProfileConfig {
  return config.httpProfile ?? DEFAULT_HTTP_PROFILE_CONFIG;
}

function getResolvedBrowserWaitMs(config: RetailerConfig): number {
  if (
    typeof config.browserWaitMs !== "number" ||
    !Number.isFinite(config.browserWaitMs) ||
    config.browserWaitMs < 0
  ) {
    return DEFAULT_BROWSER_WAIT_MS;
  }
  return Math.min(Math.floor(config.browserWaitMs), 30_000);
}

function getResolvedBrowserMaxPages(config: RetailerConfig): number {
  if (
    typeof config.browserMaxPages !== "number" ||
    !Number.isFinite(config.browserMaxPages) ||
    config.browserMaxPages < 1
  ) {
    return DEFAULT_BROWSER_MAX_PAGES;
  }
  return Math.min(Math.floor(config.browserMaxPages), 20);
}

function getResolvedBrowserFallbackMode(config: RetailerConfig): BrowserFallbackMode {
  return config.browserFallbackMode ?? "listing";
}

function isPlaywrightUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("playwright runtime not available") ||
    message.includes("cannot find package 'playwright'") ||
    message.includes("cannot find package 'playwright-core'")
  );
}

async function resolveBrowserFallbackUrls(
  config: RetailerConfig,
  pageUrls: string[],
  httpProfile: RetailerHttpProfileConfig
): Promise<string[]> {
  const maxPages = getResolvedBrowserMaxPages(config);
  const mode = getResolvedBrowserFallbackMode(config);
  if (mode === "sitemap-products") {
    const discovered = await discoverFallbackUrls(config, httpProfile);
    const dedupedDiscovered = dedupePageUrls(discovered);
    if (dedupedDiscovered.length > 0) {
      return dedupedDiscovered.slice(0, maxPages);
    }
    // When sitemap discovery is blocked, still attempt browser rendering on listing pages.
    return dedupePageUrls(pageUrls).slice(0, Math.max(1, Math.min(maxPages, 3)));
  }
  return dedupePageUrls(pageUrls).slice(0, maxPages);
}

async function fetchBrowserFallbackOffers(
  config: RetailerConfig,
  pageUrls: string[],
  httpProfile: RetailerHttpProfileConfig
): Promise<{
  offers: RawRetailerOffer[];
  discoveredCount: number;
  pagesCrawled: number;
  warnings: string[];
}> {
  const fallbackUrls = await resolveBrowserFallbackUrls(config, pageUrls, httpProfile);
  if (fallbackUrls.length === 0) {
    return {
      offers: [],
      discoveredCount: 0,
      pagesCrawled: 0,
      warnings: []
    };
  }

  const waitMs = getResolvedBrowserWaitMs(config);
  const timeoutMs = Math.max(httpProfile.timeoutMs * 2, waitMs + 10_000, 30_000);
  const scrapedOffers: RawRetailerOffer[] = [];
  const fetchedPages: FetchedPageSnapshot[] = [];
  const warnings: string[] = [];
  let discoveredCount = 0;
  let pagesCrawled = 0;

  for (const pageUrl of fallbackUrls) {
    try {
      const page = await fetchPageWithBrowser(pageUrl, {
        timeoutMs,
        waitMs
      });
      pagesCrawled += 1;
      fetchedPages.push({
        pageUrl,
        finalUrl: page.finalUrl || pageUrl,
        html: page.html
      });

      const extraction = extractOffersFromHtml(page.html, page.finalUrl || pageUrl, config);
      discoveredCount += extraction.discoveredCount;
      scrapedOffers.push(...extraction.offers);

      if (extraction.offers.length === 0 && pagesCrawled > 1) {
        break;
      }
    } catch (error) {
      warnings.push(
        `browser fetch failed (${pageUrl}): ${error instanceof Error ? error.message : "unknown"}`
      );
      if (isPlaywrightUnavailableError(error) || pagesCrawled > 0) {
        break;
      }
    }
  }

  let linkedProductsRecoveryPages = 0;
  if (scrapedOffers.length === 0 && fetchedPages.length > 0) {
    const linkedProductsResult = await fetchLinkedProductFallbackOffers(config, fetchedPages, httpProfile);
    if (linkedProductsResult.offers.length > 0) {
      scrapedOffers.push(...linkedProductsResult.offers);
      discoveredCount += linkedProductsResult.discoveredCount;
      linkedProductsRecoveryPages = linkedProductsResult.pagesCrawled;
      warnings.push(
        `Recovered linked products from browser pages (${linkedProductsResult.pagesCrawled} pages).`
      );
    }
  }

  return {
    offers: dedupeOffers(scrapedOffers),
    discoveredCount,
    pagesCrawled: pagesCrawled + linkedProductsRecoveryPages,
    warnings
  };
}

function getHttpStatusFromError(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const match = /HTTP\s+(\d{3})/i.exec(error.message);
  if (!match) return undefined;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : undefined;
}

function isLikelyAntiBotSignal(error: unknown, status?: number): boolean {
  if (status === 401 || status === 403 || status === 429) {
    return true;
  }
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("captcha") ||
    message.includes("forbidden") ||
    message.includes("access denied") ||
    message.includes("blocked")
  );
}

function classifyBlocker(args: {
  failures: PageFetchFailure[];
  firstPageSucceeded: boolean;
  parsedCount: number;
  pagesCrawled: number;
}): {
  classification: RetailerBlockerClassification;
  details?: string;
  url?: string;
} {
  const basePageFailure = args.failures.find((failure) => failure.pageIndex === 0);
  if (basePageFailure?.status && [404, 410, 451, 500, 502, 503].includes(basePageFailure.status)) {
    return {
      classification: "url-drift",
      details: `Base deals URL returned ${basePageFailure.status}.`,
      url: basePageFailure.pageUrl
    };
  }

  const antiBotFailure = args.failures.find((failure) => failure.antiBotSignal);
  if (antiBotFailure) {
    return {
      classification: "anti-bot",
      details: "Request blocked, timed out, or fetch aborted.",
      url: antiBotFailure.pageUrl
    };
  }

  if (
    args.firstPageSucceeded &&
    args.failures.length > 0 &&
    args.failures.every((failure) => failure.pageIndex > 0)
  ) {
    return {
      classification: "pagination",
      details: "Later pages failed after base page succeeded.",
      url: args.failures[0].pageUrl
    };
  }

  if (args.pagesCrawled > 0 && args.parsedCount === 0) {
    return {
      classification: "selector-drift",
      details: "Pages fetched successfully but no offers were extracted."
    };
  }

  return {
    classification: "unknown"
  };
}

function appendBlockerHintToWarning(
  warning: string,
  classification: RetailerBlockerClassification
): string {
  return `${warning} Blocker hint: ${classification}.`;
}

function diagnosticsForExecutionPath(
  executionPath: ExecutionPath
): ParsedRetailerResult["diagnostics"] {
  return {
    executionPath
  };
}

function diagnosticsFromBlocker(blocker: {
  classification: RetailerBlockerClassification;
  details?: string;
  url?: string;
}, executionPath: ExecutionPath = "fixture"): ParsedRetailerResult["diagnostics"] {
  return {
    executionPath,
    blocker: {
      classification: blocker.classification,
      details: blocker.details,
      url: blocker.url
    }
  };
}

function browserFallbackEnabled(config: RetailerConfig): boolean {
  return config.browserFallbackEnabled === true;
}

function shouldPrioritizeBrowserFallback(classification: RetailerBlockerClassification): boolean {
  return classification === "anti-bot" || classification === "unknown";
}

function classifyBlockerFromUnexpectedError(
  error: unknown
): {
  classification: RetailerBlockerClassification;
  details?: string;
} {
  const status = getHttpStatusFromError(error);
  if (status && [404, 410, 451, 500, 502, 503].includes(status)) {
    return {
      classification: "url-drift",
      details: `Base deals URL returned ${status}.`
    };
  }
  if (isLikelyAntiBotSignal(error, status)) {
    return {
      classification: "anti-bot",
      details: "Request blocked, timed out, or fetch aborted."
    };
  }
  return {
    classification: "unknown",
    details: "Unexpected parser failure."
  };
}

export function createRetailerParser(config: RetailerConfig): RetailerParser {
  return {
    config,
    async fetchOffers(): Promise<ParsedRetailerResult> {
      if (!config.allowScrape) {
        const fixtureOffers = await loadFixtureOffers(config);
        return {
          offers: fixtureOffers,
          warning: "Scraping disabled by retailer guardrail, loaded fixture data.",
          usedFixture: true,
          discoveredCount: fixtureOffers.length,
          parsedCount: fixtureOffers.length,
          pagesCrawled: 0,
          sourceMode: "fixture",
          diagnostics: diagnosticsForExecutionPath("fixture")
        };
      }

      const warnings: string[] = [];
      const pageUrls = buildPageUrls(config.dealsUrl, config.pagination);
      const httpProfile = getResolvedHttpProfile(config);
      const scrapedOffers: RawRetailerOffer[] = [];
      const pageFailures: PageFetchFailure[] = [];
      const fetchedPages: FetchedPageSnapshot[] = [];
      let discoveredCount = 0;
      let pagesCrawled = 0;
      let firstPageSucceeded = false;

      try {
        for (let pageIndex = 0; pageIndex < pageUrls.length; pageIndex += 1) {
          const pageUrl = pageUrls[pageIndex];
          try {
            const page = await fetchPageWithRetry(pageUrl, {
              retries: httpProfile.retries,
              timeoutMs: httpProfile.timeoutMs,
              minDelayMs: httpProfile.minDelayMs,
              headerPreset: httpProfile.profile
            });
            pagesCrawled += 1;
            if (pageIndex === 0) firstPageSucceeded = true;
            fetchedPages.push({
              pageUrl,
              finalUrl: page.finalUrl || pageUrl,
              html: page.html
            });
            const extraction = extractOffersFromHtml(page.html, page.finalUrl || config.dealsUrl, config);
            discoveredCount += extraction.discoveredCount;
            scrapedOffers.push(...extraction.offers);
            if (extraction.offers.length === 0 && pagesCrawled > 1) break;
          } catch (error) {
            const status = getHttpStatusFromError(error);
            pageFailures.push({
              pageIndex,
              pageUrl,
              status,
              antiBotSignal: isLikelyAntiBotSignal(error, status)
            });
            warnings.push(
              `page fetch failed (${pageUrl}): ${error instanceof Error ? error.message : "unknown"}`
            );
            if (pagesCrawled > 0) break;
          }
        }

        const deduped = dedupeOffers(scrapedOffers);
        if (deduped.length > 0) {
          return {
            offers: deduped,
            warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
            usedFixture: false,
            discoveredCount,
            parsedCount: deduped.length,
            pagesCrawled,
            sourceMode: "live",
            diagnostics: diagnosticsForExecutionPath("http")
          };
        }

        const blocker = classifyBlocker({
          failures: pageFailures,
          firstPageSucceeded,
          parsedCount: deduped.length,
          pagesCrawled
        });

        const tryBrowserFallback = async (): Promise<ParsedRetailerResult | undefined> => {
          if (!browserFallbackEnabled(config) || !shouldAttemptBrowserFallback(blocker.classification)) {
            return undefined;
          }
          const browserFallbackResult = await fetchBrowserFallbackOffers(config, pageUrls, httpProfile);
          if (browserFallbackResult.warnings.length > 0) {
            warnings.push(...browserFallbackResult.warnings);
          }

          if (browserFallbackResult.offers.length > 0) {
            const recoveryMessage = `Recovered via browser fallback (${browserFallbackResult.pagesCrawled} pages).`;
            const warning =
              warnings.length > 0 ? `${warnings.join(" | ")} | ${recoveryMessage}` : recoveryMessage;

            return {
              offers: browserFallbackResult.offers,
              warning,
              usedFixture: false,
              discoveredCount: discoveredCount + browserFallbackResult.discoveredCount,
              parsedCount: browserFallbackResult.offers.length,
              pagesCrawled: pagesCrawled + browserFallbackResult.pagesCrawled,
              sourceMode: "live",
              diagnostics: diagnosticsForExecutionPath("browser")
            };
          }
          return undefined;
        };

        if (shouldPrioritizeBrowserFallback(blocker.classification)) {
          const browserRecovered = await tryBrowserFallback();
          if (browserRecovered) return browserRecovered;
        }

        if (blocker.classification === "selector-drift" || blocker.classification === "unknown") {
          const linkedProductsResult = await fetchLinkedProductFallbackOffers(
            config,
            fetchedPages,
            httpProfile
          );
          if (linkedProductsResult.offers.length > 0) {
            const recoveryMessage = `Recovered via linked product fallback (${linkedProductsResult.pagesCrawled} pages).`;
            const warning = warnings.length > 0 ? `${warnings.join(" | ")} | ${recoveryMessage}` : recoveryMessage;
            return {
              offers: linkedProductsResult.offers,
              warning,
              usedFixture: false,
              discoveredCount: discoveredCount + linkedProductsResult.discoveredCount,
              parsedCount: linkedProductsResult.offers.length,
              pagesCrawled: pagesCrawled + linkedProductsResult.pagesCrawled,
              sourceMode: "live",
              diagnostics: diagnosticsForExecutionPath("http")
            };
          }
        }

        if (shouldAttemptSitemapFallback(blocker.classification)) {
          const fallbackResult = await fetchSitemapFallbackOffers(config, httpProfile);
          if (fallbackResult.offers.length > 0) {
            const recoveryMessage = `Recovered via sitemap fallback (${fallbackResult.pagesCrawled} pages).`;
            const warning = warnings.length > 0 ? `${warnings.join(" | ")} | ${recoveryMessage}` : recoveryMessage;

            return {
              offers: fallbackResult.offers,
              warning,
              usedFixture: false,
              discoveredCount: discoveredCount + fallbackResult.discoveredCount,
              parsedCount: fallbackResult.offers.length,
              pagesCrawled: pagesCrawled + fallbackResult.pagesCrawled,
              sourceMode: "live",
              diagnostics: diagnosticsForExecutionPath("http")
            };
          }
        }

        if (!shouldPrioritizeBrowserFallback(blocker.classification)) {
          const browserRecovered = await tryBrowserFallback();
          if (browserRecovered) return browserRecovered;
        }

        const fixtureOffers = await loadFixtureOffers(config);
        const warningBase =
          warnings.length > 0
            ? `Live extraction failed (${warnings.join(" | ")}), loaded fixture data.`
            : "No offers extracted from live pages, loaded fixture data.";
        return {
          offers: fixtureOffers,
          warning: appendBlockerHintToWarning(warningBase, blocker.classification),
          usedFixture: true,
          discoveredCount,
          parsedCount: fixtureOffers.length,
          pagesCrawled,
          sourceMode: "fixture",
          diagnostics: diagnosticsFromBlocker(blocker, "fixture")
        };
      } catch (error) {
        const fixtureOffers = await loadFixtureOffers(config);
        const blocker = classifyBlockerFromUnexpectedError(error);
        const warningBase = `Fetch failed, loaded fixture data (${error instanceof Error ? error.message : "unknown"}).`;
        return {
          offers: fixtureOffers,
          warning: appendBlockerHintToWarning(warningBase, blocker.classification),
          usedFixture: true,
          discoveredCount,
          parsedCount: fixtureOffers.length,
          pagesCrawled,
          sourceMode: "fixture",
          diagnostics: diagnosticsFromBlocker(blocker, "fixture")
        };
      }
    }
  };
}
