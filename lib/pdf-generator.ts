import type { PdfOptions, ProgressEvent } from "./types";

type ProgressCallback = (event: ProgressEvent) => void;

// Delay helper
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Map scroll delay setting to ms
function scrollDelayMs(setting: PdfOptions["scrollDelay"]): number {
  return { fast: 600, normal: 1200, slow: 2200 }[setting];
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

    let executablePath: string;
    let puppeteer: typeof import("puppeteer-core");

    if (process.env.NODE_ENV === "production") {
      // Vercel serverless — use @sparticuz/chromium-min
      const chromium = await import("@sparticuz/chromium-min");
      puppeteer = await import("puppeteer-core");
      executablePath = await chromium.default.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath,
        headless: true,
      });
    } else {
      // Local development — use installed Chrome
      puppeteer = await import("puppeteer-core");
      // Try common local Chrome paths
      const possiblePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
      ];

      executablePath = possiblePaths[0]; // Will use first; puppeteer will error if not found
      browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }

    // ── 2. Open page ───────────────────────────────────────────
    onProgress({ stage: "fetching", message: `Opening ${url}…`, percent: 12 });
    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 900 });

    // Set a real user-agent to avoid bot blocks
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Navigate with a generous timeout
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    onProgress({ stage: "fetching", message: "Page loaded. Starting scroll capture…", percent: 22 });

    // ── 3. Smart Infinite Scroll ────────────────────────────────
    const maxScrolls = options.maxScrolls === 0 ? 200 : options.maxScrolls; // 200 = effectively unlimited
    const delayMs = scrollDelayMs(options.scrollDelay);
    let scrollCount = 0;
    let previousHeight = 0;
    let stalledRounds = 0;

    while (scrollCount < maxScrolls) {
      const currentHeight: number = await page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        stalledRounds++;
        if (stalledRounds >= 3) {
          // No new content after 3 attempts — we're at the bottom
          break;
        }
      } else {
        stalledRounds = 0;
      }

      previousHeight = currentHeight;

      // Scroll to the very bottom
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      });

      await delay(delayMs);

      // Try clicking "Load more" / "Next chapter" buttons if present
      await page.evaluate(() => {
        const loadMoreSelectors = [
          '[class*="load-more"]',
          '[class*="loadmore"]',
          '[class*="next-chapter"]',
          '[id*="load-more"]',
          'button[data-action="load-more"]',
        ];
        for (const sel of loadMoreSelectors) {
          const btn = document.querySelector<HTMLElement>(sel);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            break;
          }
        }
      });

      scrollCount++;

      const scrollPercent = Math.min(22 + Math.round((scrollCount / maxScrolls) * 45), 67);
      onProgress({
        stage: "scrolling",
        message: `Scrolling page… (${scrollCount}/${options.maxScrolls === 0 ? "∞" : maxScrolls})`,
        scrollCount,
        maxScrolls: options.maxScrolls,
        percent: scrollPercent,
      });
    }

    // Scroll back to top for clean PDF render
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(500);

    // ── 4. Generate PDF ────────────────────────────────────────
    onProgress({ stage: "generating", message: "Rendering PDF…", percent: 75 });

    const marginMap = {
      none:   { top: "0", right: "0", bottom: "0", left: "0" },
      small:  { top: "0.3cm", right: "0.3cm", bottom: "0.3cm", left: "0.3cm" },
      normal: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    };

    const formatMap: Record<PdfOptions["format"], string | { width: string; height: string }> = {
      A4: "A4",
      Letter: "Letter",
      fullpage: "A4", // will override with full height below
    };

    let pdfOptions: Parameters<typeof page.pdf>[0] = {
      printBackground: options.includeBackground,
      margin: marginMap[options.margins],
    };

    if (options.format === "fullpage") {
      // Capture full-page width at actual page height
      const bodyHeight: number = await page.evaluate(() => document.body.scrollHeight);
      pdfOptions = {
        ...pdfOptions,
        width: "1280px",
        height: `${bodyHeight}px`,
      };
    } else {
      pdfOptions = {
        ...pdfOptions,
        format: formatMap[options.format] as "A4" | "Letter",
      };
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    onProgress({ stage: "done", message: "PDF ready!", percent: 100 });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}
