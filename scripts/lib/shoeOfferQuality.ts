export type ShoeOfferInput = {
  title: string;
  model?: string;
  url?: string;
  category?: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: "\"",
  apos: "'",
  nbsp: " "
};

const HARD_REJECT_PATTERNS: RegExp[] = [
  /\badd to wish ?list\b/i,
  /\bproduct not added to wishlist\b/i,
  /\bstars?\s*&\s*up\b/i,
  /\bchance to win\b/i,
  /\bgift guide\b/i,
  /\bgifts?\s+for\s+under\b/i,
  /\bdeals?\s+under\b/i,
  /\bdoor\s+crashers?\b/i,
  /\bnew arrivals?\b/i,
  /\bbest sellers?\b/i,
  /\bcss-/i,
  /var\(--/i,
  /\{[^}]+\}/
];

const URL_HARD_REJECT_PATTERNS: RegExp[] = [
  /\bwishlist\b/i,
  /\bcontest\b/i,
  /\bcart\b/i,
  /href\s*=?\s*['"]?#['"]?/i,
  /^#$/i
];

const APPAREL_OR_ACCESSORY_TERMS: RegExp[] = [
  /\bt-?shirt\b/i,
  /\btee\b/i,
  /\bhoodie\b/i,
  /\bjacket\b/i,
  /\bshorts?\b/i,
  /\bpants?\b/i,
  /\bleggings?\b/i,
  /\btights?\b/i,
  /\bsocks?\b/i,
  /\bbras?\b/i,
  /\bhats?\b/i,
  /\bcaps?\b/i,
  /\bgloves?\b/i,
  /\bbackpacks?\b/i,
  /\bbags?\b/i,
  /\bbottles?\b/i,
  /\bbelts?\b/i,
  /\bwatches?\b/i,
  /\bsunglasses?\b/i
];

const FOOTWEAR_TERMS = /\b(shoe|shoes|sneaker|sneakers|spike|spikes|cleat|cleats|footwear)\b/i;
const RUNNING_TRAIL_CONTEXT = /\b(running|trail|road)\b/i;
const SHOE_MODEL_FAMILY_TERMS =
  /\b(guide|endorphin|cloudrunner|cloudmonster|kayano|pegasus|clifton|speedgoat|novablast|ghost|ride|vomero|adizero|adios|alphafly|vaporfly|boston|glycerin|bondi|mach|peregrine|sense\s+ride|fresh\s+foam|gel[-\s]?nimbus)\b/i;
const MODEL_WITH_VERSION = /\b[a-z][a-z0-9-]*(?:\s+[a-z0-9-]+){0,3}\s+\d{1,2}(?:\.\d+)?\b/i;

type SizePattern = {
  regex: RegExp;
  toSizeRange: (match: RegExpExecArray) => string;
};

const SIZE_PATTERNS: SizePattern[] = [
  {
    regex: /\b([mw])\s*(\d{1,2}(?:\.\d+)?)\s*[/-]\s*([mw])\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `${match[1].toUpperCase()}${match[2]}/${match[3].toUpperCase()}${match[4]}`
  },
  {
    regex: /\b(m)\s*(\d{1,2}(?:\.\d+)?)\s+(w)\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `${match[1].toUpperCase()}${match[2]}/${match[3].toUpperCase()}${match[4]}`
  },
  {
    regex: /\b(w)\s*(\d{1,2}(?:\.\d+)?)\s+(m)\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `${match[3].toUpperCase()}${match[4]}/${match[1].toUpperCase()}${match[2]}`
  },
  {
    regex: /\b([mw])\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `${match[1].toUpperCase()}${match[2]}`
  },
  {
    regex: /\b(us|eu)\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `${match[1].toUpperCase()} ${match[2]}`
  },
  {
    regex: /\bsize\s*:?\s*(\d{1,2}(?:\.\d+)?)\b/i,
    toSizeRange: (match) => `Size ${match[1]}`
  }
];

function isValidCodePoint(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function cleanResidualSeparators(input: string): string {
  const trimmed = input
    .replace(/^\s*[-|/,;:]+\s*/g, "")
    .replace(/\s*[-|/,;:]+\s*$/g, "")
    .replace(/\(\s*\)/g, " ")
    .replace(/\[\s*\]/g, " ");
  return normalizeOfferText(trimmed);
}

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|quot|apos|nbsp);/gi, (full, hex, decimal, named) => {
    if (hex) {
      const codePoint = Number.parseInt(hex, 16);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : full;
    }
    if (decimal) {
      const codePoint = Number.parseInt(decimal, 10);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : full;
    }
    if (named) {
      return NAMED_ENTITIES[named.toLowerCase()] ?? full;
    }
    return full;
  });
}

export function normalizeOfferText(input: string): string {
  return decodeHtmlEntities(input).replace(/\s+/g, " ").trim();
}

export function extractSizeRange(input: string): { cleaned: string; sizeRange?: string } {
  const normalized = normalizeOfferText(input);
  for (const pattern of SIZE_PATTERNS) {
    const match = pattern.regex.exec(normalized);
    if (!match) continue;

    const withoutSizeToken = normalized.replace(pattern.regex, " ");
    const cleaned = cleanResidualSeparators(withoutSizeToken);
    return {
      cleaned,
      sizeRange: pattern.toSizeRange(match)
    };
  }

  return { cleaned: normalized };
}

function hasFootwearSignal(text: string, category?: string, normalizedUrl?: string): boolean {
  if (FOOTWEAR_TERMS.test(text)) {
    return true;
  }

  const categoryText = normalizeOfferText(category ?? "");
  const hasFamilyModelSignal = SHOE_MODEL_FAMILY_TERMS.test(text);
  if (hasFamilyModelSignal) {
    return true;
  }

  const hasVersionedModelSignal = MODEL_WITH_VERSION.test(text);
  const hasRunningContext = RUNNING_TRAIL_CONTEXT.test(text) || RUNNING_TRAIL_CONTEXT.test(categoryText);
  const hasProductUrlSignal =
    Boolean(normalizedUrl) &&
    (/\/(p|pd|product|products)\//i.test(normalizedUrl ?? "") ||
      /sku=|pid=|product[_-]?id/i.test(normalizedUrl ?? ""));

  return hasVersionedModelSignal && (hasRunningContext || hasProductUrlSignal);
}

export function isLikelyShoeOffer({ title, model, url, category }: ShoeOfferInput): boolean {
  const normalizedTitle = normalizeOfferText(title).toLowerCase();
  const normalizedModel = normalizeOfferText(model ?? "").toLowerCase();
  const combined = normalizeOfferText(`${normalizedTitle} ${normalizedModel}`);
  if (!combined) return false;

  if (HARD_REJECT_PATTERNS.some((pattern) => pattern.test(combined))) {
    return false;
  }

  const normalizedUrl = normalizeOfferText(url ?? "").toLowerCase();
  if (normalizedUrl && URL_HARD_REJECT_PATTERNS.some((pattern) => pattern.test(normalizedUrl))) {
    return false;
  }

  const hasApparelOrAccessoryOnlySignal = APPAREL_OR_ACCESSORY_TERMS.some((pattern) =>
    pattern.test(combined)
  );
  const hasFootwear = hasFootwearSignal(combined, category, normalizedUrl);
  if (hasApparelOrAccessoryOnlySignal && !FOOTWEAR_TERMS.test(combined)) {
    return false;
  }

  return hasFootwear;
}
