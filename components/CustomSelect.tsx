"use client";
import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  id: string;
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  icon?: React.ReactNode;
}

export function CustomSelect({ id, options, value, onChange, label, icon }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="cs-root" ref={ref}>
      {label && (
        <div className="cs-label">
          {icon}
          {label}
        </div>
      )}
      <button
        id={id}
        type="button"
        className={`cs-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label` : undefined}
      >
        <span className="cs-trigger-text">{selected?.label}</span>
        <ChevronDown size={14} className={`cs-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="cs-dropdown" role="listbox" aria-label={label}>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`cs-option ${isActive ? "active" : ""}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={13} className="cs-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
