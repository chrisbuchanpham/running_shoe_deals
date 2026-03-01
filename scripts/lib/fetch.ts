const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; ShoeDealsCA/0.1; +https://github.com/placeholder)"
};

type FetchRetryOptions = {
  retries?: number;
  timeoutMs?: number;
  minDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTextWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<string> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const minDelayMs = options.minDelayMs ?? 500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on ${url}`);
      }
      clearTimeout(timeout);
      return await response.text();
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
