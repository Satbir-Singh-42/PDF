"use client";
import { Loader2, CheckCircle2, Globe, Scroll, FileOutput } from "lucide-react";
import type { ProgressEvent } from "@/lib/types";

const STEPS: Array<{ key: ProgressEvent["stage"]; label: string; icon: React.ReactNode }> = [
  { key: "fetching",   label: "Loading Page",    icon: <Globe size={10} /> },
  { key: "scrolling",  label: "Scrolling",        icon: <Scroll size={10} /> },
  { key: "generating", label: "Generating PDF",   icon: <FileOutput size={10} /> },
  { key: "done",       label: "Done",             icon: <CheckCircle2 size={10} /> },
];

interface ProgressBarProps {
  progress: ProgressEvent;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const stageOrder = STEPS.map((s) => s.key);
  const currentIdx = stageOrder.indexOf(progress.stage);

  return (
    <div className="progress-card" role="status" aria-live="polite">
      <div className="progress-header">
        <div className="progress-title">
          <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} color="var(--accent)" />
          {progress.message}
        </div>
        <span className="progress-pct">{progress.percent}%</span>
      </div>

      <div className="progress-track" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>

      <div className="step-pills">
        {STEPS.map((step, idx) => {
          const isDone   = idx < currentIdx;
          const isActive = idx === currentIdx;
          return (
            <div key={step.key} className={`step-pill ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
              <span className="step-dot" />
              {step.icon}
              {isDone ? "✓ " : ""}{step.label}
              {step.key === "scrolling" && progress.scrollCount !== undefined && (
                <span style={{ opacity: 0.7 }}>
                  ({progress.scrollCount}/{progress.maxScrolls === 0 ? "∞" : progress.maxScrolls})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
