"use client";
import { Zap, Infinity, BookOpen, Palette, SlidersHorizontal, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    Icon: Zap,
    name: "JavaScript Rendered",
    desc: "Full headless Chrome rendering — works on React, Vue, Angular, and any modern SPA or SSR site.",
  },
  {
    Icon: Infinity,
    name: "Infinite Scroll Capture",
    desc: "Auto-scrolls and loads all content. Perfect for novel sites, news feeds, and endless social media.",
  },
  {
    Icon: BookOpen,
    name: "Auto Load-More",
    desc: 'Detects and clicks "Load more" and "Next chapter" buttons automatically as it scrolls.',
  },
  {
    Icon: Palette,
    name: "Pixel Perfect Output",
    desc: "Preserves backgrounds, custom fonts, colors, and exact layout just as seen in the browser.",
  },
  {
    Icon: SlidersHorizontal,
    name: "Fully Customizable",
    desc: "Control page format, margins, scroll depth, and speed for each individual conversion.",
  },
  {
    Icon: ShieldCheck,
    name: "Private & Secure",
    desc: "No files stored on servers. PDFs are generated on-demand and sent directly to you.",
  },
];

export default function FeatureCards() {
  return (
    <section className="features-section" aria-labelledby="features-heading">
      <div className="section-label">
        Features
      </div>
      <h2 id="features-heading" className="features-title">
        Everything you need
      </h2>
      <p className="features-sub">
        Built for developers, writers, and researchers who need reliable, high-fidelity PDF exports.
      </p>

      <div className="features-grid">
        {FEATURES.map(({ Icon, name, desc }) => (
          <article key={name} className="feature-card">
            <div className="feature-icon-wrap">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <h3 className="feature-name">{name}</h3>
            <p className="feature-desc">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
