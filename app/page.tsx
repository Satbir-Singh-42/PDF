"use client";
import { useState, useRef } from "react";
import { Link2, Clipboard, Download, FileWarning, CheckCircle, FileText, Globe, Loader2, XCircle } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import OptionsPanel from "@/components/OptionsPanel";
import ProgressBar from "@/components/ProgressBar";
import FeatureCards from "@/components/FeatureCards";
import BrowserFrame from "@/components/BrowserFrame";
import type { PdfOptions, AppState, ProgressEvent } from "@/lib/types";

const DEFAULT_OPTIONS: PdfOptions = {
  format: "A4",
  margins: "normal",
  maxScrolls: 25,
  scrollDelay: "normal",
  includeBackground: true,
};

const FAKE_STEPS: ProgressEvent[] = [
  { stage: "fetching",   message: "Launching headless browser…",   percent: 8  },
  { stage: "fetching",   message: "Opening page…",                  percent: 16 },
  { stage: "scrolling",  message: "Page loaded — scrolling…",       percent: 26, scrollCount: 1,  maxScrolls: 25 },
  { stage: "scrolling",  message: "Capturing content…",             percent: 38, scrollCount: 7,  maxScrolls: 25 },
  { stage: "scrolling",  message: "Loading more content…",          percent: 52, scrollCount: 13, maxScrolls: 25 },
  { stage: "scrolling",  message: "Almost at the bottom…",          percent: 64, scrollCount: 21, maxScrolls: 25 },
  { stage: "generating", message: "Rendering full page…",           percent: 78 },
  { stage: "generating", message: "Generating PDF file…",           percent: 91 },
];

type TabId = "url" | "browser";

export default function HomePage() {
  const [tab, setTab] = useState<TabId>("url");
  const [url, setUrl] = useState("");
  const [options, setOptions] = useState<PdfOptions>(DEFAULT_OPTIONS);
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidUrl = (u: string) => {
    try { new URL(u.startsWith("http") ? u : `https://${u}`); return u.length > 3; }
    catch { return false; }
  };

  function startFakeProgress(maxScrolls: number) {
    const steps = FAKE_STEPS.map((s) => s.stage === "scrolling" ? { ...s, maxScrolls } : s);
    let step = 0;
    setAppState({ status: "loading", progress: steps[0] });
    timerRef.current = setInterval(() => {
      step++;
      if (step < steps.length) setAppState({ status: "loading", progress: steps[step] });
      else clearInterval(timerRef.current!);
    }, 2400);
  }

  function stopFakeProgress() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch { /* clipboard unavailable */ }
  }

  function handleCancel() {
    abortRef.current?.abort();
    stopFakeProgress();
    setAppState({ status: "idle" });
  }

  async function handleGenerate(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      setAppState({ status: "error", message: "Please enter a valid URL (e.g. https://example.com)." });
      return;
    }

    abortRef.current = new AbortController();
    startFakeProgress(options.maxScrolls);

    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
          options,
        }),
        signal: abortRef.current.signal,
      });

      stopFakeProgress();

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Server error." }));
        throw new Error(body.error ?? `Server error: ${res.status}`);
      }

      const filename = res.headers.get("X-Filename") ?? "download.pdf";
      const sizeKb   = Number(res.headers.get("X-Size-KB") ?? "0");
      const blob     = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setAppState({ status: "success", downloadUrl, filename, sizeKb });
      const a = document.createElement("a");
      a.href = downloadUrl; a.download = filename; a.click();
    } catch (err: unknown) {
      stopFakeProgress();
      if ((err as Error).name === "AbortError") return;
      setAppState({ status: "error", message: err instanceof Error ? err.message : "Unexpected error." });
    }
  }

  const isLoading = appState.status === "loading";

  return (
    <>
      {/* Background decorations */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-blob bg-blob-1" aria-hidden="true" />
      <div className="bg-blob bg-blob-2" aria-hidden="true" />

      <div className="app-wrapper">
        {/* ── Navbar ── */}
        <nav className="navbar" role="navigation" aria-label="Main navigation">
          <div className="container">
            <div className="navbar-inner">
              <div className="logo">
                <div className="logo-mark">
                  <FileText size={18} strokeWidth={2} />
                </div>
                Page<span className="logo-dot">PDF</span>
              </div>
              <div className="nav-right">
                <span className="badge-free">Free</span>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-btn"
                >
                  <Globe size={14} />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <div className="container">
            {/* Hero */}
            <HeroSection />

            {/* ── Mode Tabs ── */}
            <div className="tabs" role="tablist" aria-label="Conversion mode">
              <button
                id="tab-url"
                role="tab"
                aria-selected={tab === "url"}
                aria-controls="panel-url"
                className={`tab-btn ${tab === "url" ? "active" : ""}`}
                onClick={() => setTab("url")}
                type="button"
              >
                <Link2 size={15} />
                Paste URL
              </button>
              <button
                id="tab-browser"
                role="tab"
                aria-selected={tab === "browser"}
                aria-controls="panel-browser"
                className={`tab-btn ${tab === "browser" ? "active" : ""}`}
                onClick={() => setTab("browser")}
                type="button"
              >
                <Globe size={15} />
                Browse & Convert
              </button>
            </div>

            {/* ── URL Mode ── */}
            <div id="panel-url" role="tabpanel" aria-labelledby="tab-url" hidden={tab !== "url"}>
              <div className="main-card">
                <form onSubmit={handleGenerate} noValidate>
                  <div className="field-label">
                    <Link2 size={11} />
                    Website URL or Link
                  </div>

                  <div className="url-row">
                    <div className="url-wrap">
                      <span className="url-icon">
                        <Globe size={15} />
                      </span>
                      <input
                        id="url-input"
                        type="url"
                        className="url-input"
                        placeholder="https://example.com/novel/chapter-1"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        autoComplete="url"
                        spellCheck={false}
                        aria-label="Enter website URL to convert to PDF"
                      />
                    </div>
                    <button
                      id="paste-btn"
                      type="button"
                      className="icon-btn"
                      onClick={handlePaste}
                      disabled={isLoading}
                      aria-label="Paste URL from clipboard"
                    >
                      <Clipboard size={14} />
                      Paste
                    </button>
                  </div>

                  <OptionsPanel options={options} onChange={setOptions} />
                  <div className="divider" />

                  {isLoading ? (
                    <button id="cancel-btn" type="button" className="cancel-btn" onClick={handleCancel}>
                      <XCircle size={16} />
                      Cancel Generation
                    </button>
                  ) : (
                    <button
                      id="generate-btn"
                      type="submit"
                      className="generate-btn"
                      disabled={isLoading || !url.trim()}
                    >
                      {isLoading
                        ? <><span className="btn-spinner" />&nbsp;Generating…</>
                        : <><FileText size={16} />Generate PDF</>
                      }
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* ── Browser Mode ── */}
            <div id="panel-browser" role="tabpanel" aria-labelledby="tab-browser" hidden={tab !== "browser"}>
              <BrowserFrame
                onUseUrl={(u) => {
                  setUrl(u);
                }}
              />
              {/* Options + Generate directly in browser tab */}
              <div className="main-card" style={{ marginTop: 14 }}>
                {url.trim() && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                    padding: "8px 12px", borderRadius: 8,
                    background: "var(--accent-soft)", border: "1px solid rgba(91,94,246,0.2)"
                  }}>
                    <Globe size={13} color="var(--accent)" />
                    <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {url}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUrl("")}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--accent)", padding: 0, opacity: 0.6 }}
                      aria-label="Clear URL"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                )}
                <OptionsPanel options={options} onChange={setOptions} />
                <div className="divider" />
                {isLoading ? (
                  <button id="cancel-btn-browser" type="button" className="cancel-btn" onClick={handleCancel}>
                    <XCircle size={16} />
                    Cancel Generation
                  </button>
                ) : (
                  <button
                    id="generate-btn-browser"
                    type="button"
                    className="generate-btn"
                    disabled={isLoading || !url.trim()}
                    onClick={handleGenerate}
                  >
                    <FileText size={16} />
                    {url.trim() ? `Generate PDF` : "Browse to a page first"}
                  </button>
                )}
              </div>
            </div>

            {/* ── Progress ── */}
            {appState.status === "loading" && (
              <ProgressBar progress={appState.progress} />
            )}

            {/* ── Success ── */}
            {appState.status === "success" && (
              <div className="success-card" role="status" aria-live="polite">
                <div className="success-icon-wrap">
                  <CheckCircle size={24} color="white" />
                </div>
                <h2 className="success-title">PDF Ready!</h2>
                <p className="success-sub">
                  {appState.filename}
                  {appState.sizeKb > 0 ? ` · ${appState.sizeKb} KB` : ""}
                </p>
                <a
                  id="download-btn"
                  href={appState.downloadUrl}
                  download={appState.filename}
                  className="download-btn"
                >
                  <Download size={16} />
                  Download Again
                </a>
                <button
                  id="convert-another-btn"
                  type="button"
                  className="reset-link"
                  onClick={() => { setAppState({ status: "idle" }); setUrl(""); }}
                >
                  ← Convert another page
                </button>
              </div>
            )}

            {/* ── Error ── */}
            {appState.status === "error" && (
              <div className="error-card" role="alert" aria-live="assertive">
                <FileWarning size={18} />
                <div>
                  <p className="error-text">
                    <strong>Error: </strong>{appState.message}
                  </p>
                  <button
                    id="dismiss-error-btn"
                    type="button"
                    className="error-dismiss"
                    onClick={() => setAppState({ status: "idle" })}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Features */}
            <FeatureCards />
          </div>
        </main>

        <footer className="footer">
          <div className="container">
            <p>
              PagePDF &mdash; Convert any webpage to PDF &middot;{" "}
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                Open Source on GitHub
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
