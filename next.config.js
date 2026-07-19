/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack (Next.js 16 default)
  turbopack: {},

  // Keep heavy server-only packages out of the bundle
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "@sparticuz/chromium-min",
  ],
};

module.exports = nextConfig;
