/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // Server-side externals for Puppeteer native binaries
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
};

module.exports = nextConfig;
