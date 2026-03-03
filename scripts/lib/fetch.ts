const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; ShoeDealsCA/0.1; +https://github.com/placeholder)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
  "cache-control": "no-cache"
};

const ANTI_BOT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
  "cache-control": "no-cache",
  pragma: "no-cache",
  dnt: "1",
  referer: "https://www.google.com/",
  "upgrade-insecure-requests": "1",
  "sec-ch-ua":
    "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1"
};

const SELECTOR_FALLBACK_HEADERS = {
  ...DEFAULT_HEADERS
};

type FetchHeaderPreset = "default" | "anti-bot" | "selector-fallback";

type FetchRetryOptions = {
  retries?: number;
  timeoutMs?: number;
  minDelayMs?: number;
  headerPreset?: FetchHeaderPreset;
};

export type FetchPageResult = {
  html: string;
  finalUrl: string;
  status: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headersForPreset(preset: FetchHeaderPreset): Record<string, string> {
  if (preset === "anti-bot") return ANTI_BOT_HEADERS;
  if (preset === "selector-fallback") return SELECTOR_FALLBACK_HEADERS;
  return DEFAULT_HEADERS;
}

function resolveAttemptHeaderPreset(basePreset: FetchHeaderPreset, attempt: number): FetchHeaderPreset {
  if (basePreset !== "anti-bot") return basePreset;
  // Alternate presets so we can recover when strict anti-bot headers are themselves a blocker.
  return attempt % 2 === 0 ? "anti-bot" : "default";
}

export async function fetchPageWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<FetchPageResult> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const minDelayMs = options.minDelayMs ?? 500;
  const headerPreset = options.headerPreset ?? "default";

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: headersForPreset(resolveAttemptHeaderPreset(headerPreset, attempt)),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on ${url}`);
      }
      const html = await response.text();
      clearTimeout(timeout);
      return {
        html,
        finalUrl: response.url || url,
        status: response.status
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        await sleep(minDelayMs * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function fetchTextWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<string> {
  const result = await fetchPageWithRetry(url, options);
  return result.html;
}
