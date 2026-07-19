import type { PdfOptions, ProgressEvent } from "./types";

type ProgressCallback = (event: ProgressEvent) => void;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function scrollDelayMs(setting: PdfOptions["scrollDelay"]): number {
  return { fast: 800, normal: 1400, slow: 2500 }[setting];
}

export async function generatePdf(
  url: string,
  options: PdfOptions,
  onProgress: ProgressCallback
): Promise<Buffer> {
  let browser: import("puppeteer-core").Browser | null = null;

  try {
    // ── 1. Launch browser ──────────────────────────────────────
    onProgress({ stage: "fetching", message: "Launching browser…", percent: 5 });

    // Common stealth launch args — makes headless Chrome look like a real browser
    const STEALTH_ARGS = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1280,900",
      "--lang=en-US,en",
      "--disable-infobars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
    ];

    if (process.env.NODE_ENV === "production") {
      // ── Vercel serverless ──
      const chromium = await import("@sparticuz/chromium-min");
      const puppeteerExtra = (await import("puppeteer-extra")).default;
      const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
      puppeteerExtra.use(StealthPlugin());

      const executablePath = await chromium.default.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );
      browser = await puppeteerExtra.launch({
        args: [...chromium.default.args, ...STEALTH_ARGS],
        executablePath,
        headless: true,
      }) as unknown as import("puppeteer-core").Browser;
    } else {
      // ── Local dev — use installed Chrome ──
      const puppeteerExtra = (await import("puppeteer-extra")).default;
      const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
      puppeteerExtra.use(StealthPlugin());

      const possiblePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
      ];

      const fs = await import("fs");
      let executablePath = possiblePaths[0];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) { executablePath = p; break; }
      }

      browser = await puppeteerExtra.launch({
        executablePath,
        headless: true,
        args: STEALTH_ARGS,
      }) as unknown as import("puppeteer-core").Browser;
    }

    // ── 2. Open page with stealth headers ─────────────────────
    onProgress({ stage: "fetching", message: `Opening ${url}…`, percent: 12 });

    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Set realistic browser headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    // Override automation-detection properties before any script runs
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });

      // Spoof plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Spoof languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });

      // Spoof platform
      Object.defineProperty(navigator, "platform", {
        get: () => "Win32",
      });

      // Remove chrome automation indicator
      // @ts-ignore
      window.chrome = { runtime: {} };

      // Realistic screen dimensions
      Object.defineProperty(screen, "width",  { get: () => 1920 });
      Object.defineProperty(screen, "height", { get: () => 1080 });
    });

    // Navigate with generous timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Check if we hit a Cloudflare/bot-detection page — wait up to 8s for it to resolve
    for (let attempt = 0; attempt < 4; attempt++) {
      const title = await page.title();
      const bodyText: string = await page.evaluate(() => document.body?.innerText ?? "");
      const isChallenge =
        title.toLowerCase().includes("just a moment") ||
        title.toLowerCase().includes("checking your browser") ||
        bodyText.includes("Verify you are human") ||
        bodyText.includes("Enable JavaScript and cookies");

      if (!isChallenge) break;

      onProgress({
        stage: "fetching",
        message: `Waiting for security check… (${attempt + 1}/4)`,
        percent: 14 + attempt * 3,
      });
      await delay(2500);
    }

    onProgress({ stage: "fetching", message: "Page loaded. Starting scroll…", percent: 22 });

    // ── 3. Smart Infinite Scroll ────────────────────────────────
    const maxScrolls = options.maxScrolls === 0 ? 200 : options.maxScrolls;
    const delayMs = scrollDelayMs(options.scrollDelay);
    let previousHeight = 0;
    let stalledRounds = 0;

    for (let scrollCount = 0; scrollCount < maxScrolls; scrollCount++) {
      const currentHeight: number = await page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        stalledRounds++;
        if (stalledRounds >= 3) break; // bottom reached
      } else {
        stalledRounds = 0;
      }
      previousHeight = currentHeight;

      // Smooth scroll to bottom
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
      );
      await delay(delayMs);

      // Try clicking "Load more" / "Next chapter" buttons
      await page.evaluate(() => {
        const selectors = [
          '[class*="load-more"]', '[class*="loadmore"]',
          '[class*="next-chapter"]', '[class*="next_chapter"]',
          '[id*="load-more"]', 'button[data-action="load-more"]',
          'a[class*="next"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector<HTMLElement>(sel);
          if (el && el.offsetParent !== null) { el.click(); break; }
        }
      });

      const pct = Math.min(22 + Math.round(((scrollCount + 1) / maxScrolls) * 45), 67);
      onProgress({
        stage: "scrolling",
        message: `Scrolling… (${scrollCount + 1}/${options.maxScrolls === 0 ? "∞" : maxScrolls})`,
        scrollCount: scrollCount + 1,
        maxScrolls: options.maxScrolls,
        percent: pct,
      });
    }

    // Scroll back to top for clean render
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(600);

    // ── 4. Generate PDF ────────────────────────────────────────
    onProgress({ stage: "generating", message: "Rendering PDF…", percent: 76 });

    const marginMap = {
      none:   { top: "0", right: "0", bottom: "0", left: "0" },
      small:  { top: "0.3cm", right: "0.3cm", bottom: "0.3cm", left: "0.3cm" },
      normal: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    };

    let pdfOptions: Parameters<typeof page.pdf>[0] = {
      printBackground: options.includeBackground,
      margin: marginMap[options.margins],
    };

    if (options.format === "fullpage") {
      const bodyHeight: number = await page.evaluate(() => document.body.scrollHeight);
      pdfOptions = { ...pdfOptions, width: "1280px", height: `${bodyHeight}px` };
    } else {
      pdfOptions = { ...pdfOptions, format: options.format as "A4" | "Letter" };
    }

    const pdfBuffer = await page.pdf(pdfOptions);
    onProgress({ stage: "done", message: "PDF ready!", percent: 100 });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}
