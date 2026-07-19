# PagePDF — Webpage to PDF Converter

Convert any URL into a pixel-perfect PDF. Supports infinite scroll, JS-rendered sites, novel reading sites, and more.

## Features

- ⚡ Full headless Chrome rendering (Puppeteer)
- ♾️ Infinite scroll auto-capture
- 📚 Auto-clicks "Load more" / "Next chapter" buttons
- 🎨 Preserves backgrounds, fonts, and layout
- ⚙️ Configurable format, margins, scroll depth & speed
- 🔒 No file storage — PDFs sent directly to your browser

## Local Development

```bash
npm install
npm run dev
```

> **Note**: For local dev, you need Google Chrome installed at the default path.

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import repo
3. Framework: **Next.js** (auto-detected) → **Deploy**

### Plan Note
- **Hobby (Free)**: 10s function timeout — works for short pages
- **Pro**: 60s timeout — for heavy infinite-scroll pages

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| PDF Engine | Puppeteer-core + @sparticuz/chromium-min |
| Styling | Vanilla CSS (glassmorphism dark theme) |
| Deployment | Vercel |
