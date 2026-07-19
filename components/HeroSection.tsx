"use client";
import { FileText } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="hero">
      <h1>
        Convert Any Webpage<br />
        to a <span className="gradient-text">Perfect PDF</span>
      </h1>

      <p className="hero-sub">
        Paste a URL or browse inside the app — we render it fully with headless Chrome,
        auto-scroll infinite pages, and export a pixel-perfect PDF.
      </p>
    </section>
  );
}
