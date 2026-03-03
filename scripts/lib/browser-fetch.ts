const DEFAULT_BROWSER_TIMEOUT_MS = 20_000;
const DEFAULT_BROWSER_WAIT_MS = 2_500;
const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type BrowserFetchOptions = {
  timeoutMs?: number;
  waitMs?: number;
  userAgent?: string;
};

export type BrowserFetchResult = {
  html: string;
  finalUrl: string;
  status: number;
};

type BrowserResponseLike = {
  status: () => number;
};

type BrowserPageLike = {
  goto: (
    targetUrl: string,
    options: {
      waitUntil: "domcontentloaded" | "networkidle";
      timeout: number;
    }
  ) => Promise<BrowserResponseLike | null>;
  waitForTimeout: (ms: number) => Promise<void>;
  content: () => Promise<string>;
  url: () => string;
  close: () => Promise<void>;
};

type BrowserContextLike = {
  newPage: () => Promise<BrowserPageLike>;
  close: () => Promise<void>;
};

type BrowserLike = {
  newContext: (options: {
    userAgent: string;
    locale?: string;
    timezoneId?: string;
    extraHTTPHeaders?: Record<string, string>;
  }) => Promise<BrowserContextLike>;
  close: () => Promise<void>;
};

type PlaywrightChromium = {
  launch: (options: { headless: boolean }) => Promise<BrowserLike>;
};

const importDynamically = new Function("specifier", "return import(specifier);") as (
  specifier: string
) => Promise<unknown>;

async function loadPlaywrightChromium(): Promise<PlaywrightChromium> {
  for (const candidate of ["playwright", "playwright-core"]) {
    try {
      const loaded = (await importDynamically(candidate)) as Record<string, unknown>;
      const chromium = loaded.chromium as PlaywrightChromium | undefined;
      if (chromium && typeof chromium.launch === "function") {
        return chromium;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Playwright runtime not available (`playwright` or `playwright-core`).");
}

async function tryClose(target?: { close: () => Promise<unknown> | unknown }): Promise<void> {
  if (!target) return;
  try {
    await target.close();
  } catch {
    // Ignore shutdown errors from browser resources.
  }
}

async function gotoWithSettle(
  page: BrowserPageLike,
  url: string,
  timeoutMs: number
): Promise<BrowserResponseLike | null> {
  try {
    return await page.goto(url, {
      waitUntil: "networkidle",
      timeout: timeoutMs
    });
  } catch {
    return page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs
    });
  }
}

export async function fetchPageWithBrowser(
  url: string,
  options: BrowserFetchOptions = {}
): Promise<BrowserFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS;
  const waitMs = options.waitMs ?? DEFAULT_BROWSER_WAIT_MS;
  const userAgent = options.userAgent ?? DEFAULT_BROWSER_USER_AGENT;

  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });

  let context: BrowserContextLike | undefined;
  let page: BrowserPageLike | undefined;

  try {
    context = await browser.newContext({
      userAgent,
      locale: "en-CA",
      timezoneId: "America/Toronto",
      extraHTTPHeaders: {
        "accept-language": "en-CA,en-US;q=0.9,en;q=0.8"
      }
    });
    page = await context.newPage();

    const response = await gotoWithSettle(page, url, timeoutMs);

    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }

    const html = await page.content();
    return {
      html,
      finalUrl: page.url() || url,
      status: response?.status() ?? 0
    };
  } finally {
    await tryClose(page);
    await tryClose(context);
    await tryClose(browser);
  }
}
