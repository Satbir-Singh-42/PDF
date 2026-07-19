import type { PdfOptions, ProgressEvent } from "./types";

type ProgressCallback = (event: ProgressEvent) => void;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function scrollDelayMs(s: PdfOptions["scrollDelay"]) {
  return { fast: 800, normal: 1400, slow: 2500 }[s];
}

/** Applied via evaluateOnNewDocument — runs before any site JS */
const STEALTH_SCRIPT = `
  (() => {
    // 1. Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // 2. Realistic plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ];
        arr.__proto__ = PluginArray.prototype;
        return arr;
      }
    });

    // 3. Languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

    // 4. Platform
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

    // 5. Chrome object (real Chrome always has this)
    if (!window.chrome) {
      window.chrome = {
        runtime: {
          id: undefined,
          connect: () => {},
          sendMessage: () => {},
        },
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {},
      };
    }

    // 6. Notifications permission (headless returns 'denied' immediately — spoof it)
    const origQuery = window.navigator.permissions.query.bind(navigator.permissions);
    window.navigator.permissions.query = (params) => {
      if (params.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, name: 'notifications' });
      }
      return origQuery(params);
    };

    // 7. Screen dimensions
    Object.defineProperty(screen, 'width',       { get: () => 1920 });
    Object.defineProperty(screen, 'height',      { get: () => 1080 });
    Object.defineProperty(screen, 'availWidth',  { get: () => 1920 });
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
    Object.defineProperty(screen, 'colorDepth',  { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth',  { get: () => 24 });

    // 8. WebGL vendor/renderer spoofing
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return 'Intel Inc.';               // UNMASKED_VENDOR_WEBGL
      if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
      return getParam.call(this, param);
    };

    // 9. MimeTypes
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mt = { 'application/pdf': { type: 'application/pdf' } };
        mt.__proto__ = MimeTypeArray.prototype;
        return mt;
      }
    });

    // 10. Hairline feature — remove CDP artifact
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    const getImageData = CanvasRenderingContext2D.prototype.getImageData;
  })();
`;

export async function generatePdf(
  url: string,
  options: PdfOptions,
  onProgress: ProgressCallback
): Promise<Buffer> {
  let browser: import("puppeteer-core").Browser | null = null;

  try {
    onProgress({ stage: "fetching", message: "Launching browser…", percent: 5 });

    const puppeteer = await import("puppeteer-core");

    const LAUNCH_ARGS = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",  // KEY: removes bot flag
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1280,900",
      "--lang=en-US,en",
      "--disable-infobars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-default-apps",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-zygote",
      "--ignore-certificate-errors",
    ];

    if (process.env.NODE_ENV === "production") {
      const chromium = await import("@sparticuz/chromium-min");
      const executablePath = await chromium.default.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );
      browser = await puppeteer.default.launch({
        args: [...chromium.default.args, ...LAUNCH_ARGS],
        executablePath,
        headless: true,
      });
    } else {
      // Local dev — auto-find Chrome
      const fs = await import("fs");
      const paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
      ];
      const executablePath = paths.find((p) => fs.existsSync(p)) ?? paths[0];

      browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
        args: LAUNCH_ARGS,
      });
    }

    // ── Open page ──────────────────────────────────────────────
    onProgress({ stage: "fetching", message: `Opening ${url}…`, percent: 12 });

    const page = await browser.newPage();

    // Inject stealth script BEFORE any page JS runs
    await page.evaluateOnNewDocument(STEALTH_SCRIPT);

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait out Cloudflare "Just a moment…" challenge (up to ~10s)
    for (let i = 0; i < 4; i++) {
      const title = await page.title();
      const body: string = await page.evaluate(() => document.body?.innerText ?? "");
      const isChallenge =
        title.toLowerCase().includes("just a moment") ||
        title.toLowerCase().includes("checking") ||
        body.includes("Verify you are human") ||
        body.includes("Enable JavaScript and cookies");

      if (!isChallenge) break;

      onProgress({
        stage: "fetching",
        message: `Waiting for security check… (${i + 1}/4)`,
        percent: 14 + i * 2,
      });
      await delay(2500);
    }

    onProgress({ stage: "fetching", message: "Page loaded. Scrolling…", percent: 22 });

    // ── Smart Infinite Scroll ──────────────────────────────────
    const maxScrolls = options.maxScrolls === 0 ? 200 : options.maxScrolls;
    const delayMs = scrollDelayMs(options.scrollDelay);
    let prevHeight = 0;
    let stalled = 0;

    for (let i = 0; i < maxScrolls; i++) {
      const h: number = await page.evaluate(() => document.body.scrollHeight);
      if (h === prevHeight) { stalled++; if (stalled >= 3) break; }
      else stalled = 0;
      prevHeight = h;

      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
      );
      await delay(delayMs);

      // Click load-more / next-chapter buttons
      await page.evaluate(() => {
        const sels = [
          '[class*="load-more"]', '[class*="loadmore"]',
          '[class*="next-chapter"]', '[class*="next_chapter"]',
          '[id*="load-more"]', 'a[class*="next"]',
        ];
        for (const s of sels) {
          const el = document.querySelector<HTMLElement>(s);
          if (el && el.offsetParent !== null) { el.click(); break; }
        }
      });

      onProgress({
        stage: "scrolling",
        message: `Scrolling… (${i + 1}/${options.maxScrolls === 0 ? "∞" : maxScrolls})`,
        scrollCount: i + 1,
        maxScrolls: options.maxScrolls,
        percent: Math.min(22 + Math.round(((i + 1) / maxScrolls) * 45), 67),
      });
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(600);

    // ── Generate PDF ───────────────────────────────────────────
    onProgress({ stage: "generating", message: "Rendering PDF…", percent: 76 });

    const margins = {
      none:   { top: "0", right: "0", bottom: "0", left: "0" },
      small:  { top: "0.3cm", right: "0.3cm", bottom: "0.3cm", left: "0.3cm" },
      normal: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    };

    let pdfOpts: Parameters<typeof page.pdf>[0] = {
      printBackground: options.includeBackground,
      margin: margins[options.margins],
    };

    if (options.format === "fullpage") {
      const h: number = await page.evaluate(() => document.body.scrollHeight);
      pdfOpts = { ...pdfOpts, width: "1280px", height: `${h}px` };
    } else {
      pdfOpts = { ...pdfOpts, format: options.format as "A4" | "Letter" };
    }

    const buf = await page.pdf(pdfOpts);
    onProgress({ stage: "done", message: "PDF ready!", percent: 100 });
    return Buffer.from(buf);
  } finally {
    if (browser) await browser.close();
  }
}
