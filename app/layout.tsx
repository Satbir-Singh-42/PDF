import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageToPDF — Convert Any Webpage to PDF Instantly",
  description:
    "Convert any URL or webpage to a high-quality PDF. Supports infinite-scroll pages, novels, news feeds, and JavaScript-rendered sites. Free, fast, and no signup required.",
  keywords: "webpage to pdf, url to pdf, web page converter, infinite scroll pdf, online pdf generator",
  openGraph: {
    title: "PageToPDF — Convert Any Webpage to PDF Instantly",
    description: "Convert any URL or infinite-scroll webpage to a perfect PDF. Free, fast, no signup.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
