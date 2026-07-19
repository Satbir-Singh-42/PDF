"use client";
import { Settings2, ChevronDown, FileType, AlignJustify, ScrollText, Timer, Palette } from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";
import type { PdfOptions } from "@/lib/types";

interface OptionsPanelProps {
  options: PdfOptions;
  onChange: (options: PdfOptions) => void;
}

const FORMAT_OPTIONS = [
  { value: "A4",       label: "A4 (International)" },
  { value: "Letter",   label: "Letter (US)" },
  { value: "fullpage", label: "Full Page (Exact Size)" },
];

const MARGIN_OPTIONS = [
  { value: "none",   label: "None" },
  { value: "small",  label: "Small (3mm)" },
  { value: "normal", label: "Normal (10mm)" },
];

const SCROLL_OPTIONS = [
  { value: 10,  label: "Short — 10 scrolls" },
  { value: 25,  label: "Medium — 25 scrolls" },
  { value: 50,  label: "Long — 50 scrolls" },
  { value: 100, label: "Very Long — 100 scrolls" },
  { value: 0,   label: "Unlimited ∞" },
];

const SPEED_OPTIONS = [
  { value: "fast",   label: "Fast — 0.6s / scroll" },
  { value: "normal", label: "Normal — 1.2s / scroll" },
  { value: "slow",   label: "Slow — 2.2s / scroll" },
];

export default function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof PdfOptions>(key: K, value: PdfOptions[K]) =>
    onChange({ ...options, [key]: value });

  return (
    <div>
      <button
        id="options-toggle-btn"
        className="options-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="options-panel"
        type="button"
      >
        <Settings2 size={15} />
        <span>Advanced Options</span>
        <span className={`chevron ${open ? "open" : ""}`}>
          <ChevronDown size={14} />
        </span>
      </button>

      <div id="options-panel" className={`options-panel ${open ? "open" : ""}`} role="region">
        <div className="options-inner">
          <div className="options-grid">

            {/* Page Format */}
            <CustomSelect
              id="opt-format"
              label="Page Format"
              icon={<FileType size={11} />}
              options={FORMAT_OPTIONS}
              value={options.format}
              onChange={(v) => set("format", v as PdfOptions["format"])}
            />

            {/* Margins */}
            <CustomSelect
              id="opt-margins"
              label="Margins"
              icon={<AlignJustify size={11} />}
              options={MARGIN_OPTIONS}
              value={options.margins}
              onChange={(v) => set("margins", v as PdfOptions["margins"])}
            />

            {/* Scroll Depth */}
            <CustomSelect
              id="opt-scrolls"
              label="Scroll Depth"
              icon={<ScrollText size={11} />}
              options={SCROLL_OPTIONS}
              value={options.maxScrolls}
              onChange={(v) => set("maxScrolls", Number(v))}
            />

            {/* Scroll Speed */}
            <CustomSelect
              id="opt-speed"
              label="Scroll Speed"
              icon={<Timer size={11} />}
              options={SPEED_OPTIONS}
              value={options.scrollDelay}
              onChange={(v) => set("scrollDelay", v as PdfOptions["scrollDelay"])}
            />

            {/* Background toggle */}
            <div className="option-group">
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>
                <Palette size={11} />
                Background Colors
              </label>
              <div className="toggle-row">
                <span>Include backgrounds</span>
                <label className="toggle-switch" aria-label="Toggle background colors">
                  <input
                    type="checkbox"
                    id="opt-background"
                    checked={options.includeBackground}
                    onChange={(e) => set("includeBackground", e.target.checked)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
