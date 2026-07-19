/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium-min",
  ],
};

module.exports = nextConfig;
