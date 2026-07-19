"use client";
import { useState, useRef, useCallback } from "react";
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, X,
  Lock, AlertTriangle, ArrowUpRight, FileDown, Search
} from "lucide-react";

interface BrowserFrameProps {
  onUseUrl: (url: string) => void;
}

const BLOCKED_ORIGINS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

function isSelfUrl(url: string) {
  try {
    const parsed = new URL(url);
    return BLOCKED_ORIGINS.some((b) => parsed.hostname === b || parsed.hostname.startsWith(b));
  } catch { return false; }
}

const QUICK_LINKS = [
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Main_Page" },
  { label: "MDN Docs", url: "https://developer.mozilla.org" },
  { label: "BBC News", url: "https://www.bbc.com/news" },
];

export default function BrowserFrame({ onUseUrl }: BrowserFrameProps) {
  const [addressInput, setAddressInput] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<"blocked" | "frame" | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&igu=1`;
  };

  const navigate = useCallback((raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return;

    // Block loading self (localhost)
    if (isSelfUrl(url)) {
      setErrorType("blocked");
      setHasError(true);
      setLoadedUrl(url);
      setAddressInput(url);
      setIsLoading(false);
      return;
    }

    setAddressInput(url);
    setLoadedUrl(url);
    setIsLoading(true);
    setHasError(false);
    setErrorType(null);

    setHistory((h) => {
      const sliced = h.slice(0, historyIdx + 1);
      const next = [...sliced, url];
      setHistoryIdx(next.length - 1);
      return next;
    });
  }, [historyIdx]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); navigate(addressInput); };

  const goBack = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx((i) => i - 1);
      setAddressInput(prev); setLoadedUrl(prev);
      setIsLoading(true); setHasError(false); setErrorType(null);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx((i) => i + 1);
      setAddressInput(next); setLoadedUrl(next);
      setIsLoading(true); setHasError(false); setErrorType(null);
    }
  };

  const reload = () => {
    if (!loadedUrl || hasError) return;
    setIsLoading(true);
    if (iframeRef.current) iframeRef.current.src = loadedUrl;
  };

  const handleLoad = () => {
    setIsLoading(false);
    // Try to read final URL (same-origin only; silently ignore cross-origin)
    try {
      const href = iframeRef.current?.contentWindow?.location?.href;
      if (href && href !== "about:blank") { setAddressInput(href); setLoadedUrl(href); }
    } catch { /* cross-origin — keep current address */ }
  };

  // If iframe can't load (X-Frame-Options / CSP), show friendly error
  const handleError = () => { setIsLoading(false); setHasError(true); setErrorType("frame"); };

  const isSecure = loadedUrl.startsWith("https://");
  const canBack = historyIdx > 0;
  const canForward = historyIdx < history.length - 1;
  const showIframe = loadedUrl && !hasError;

  return (
    <div className="browser-card">
      {/* ── Chrome bar ── */}
      <div className="browser-chrome">
        <div className="browser-dots">
          <span className="bdot bdot-r" />
          <span className="bdot bdot-y" />
          <span className="bdot bdot-g" />
        </div>

        <div className="browser-actions">
          <button className="browser-action-btn" onClick={goBack} disabled={!canBack} title="Back" aria-label="Back">
            <ArrowLeft size={15} />
          </button>
          <button className="browser-action-btn" onClick={goForward} disabled={!canForward} title="Forward" aria-label="Forward">
            <ArrowRight size={15} />
          </button>
          <button
            className="browser-action-btn" onClick={reload} disabled={!loadedUrl || hasError}
            title="Reload" aria-label="Reload"
            style={{ animation: isLoading ? "spin 0.7s linear infinite" : "none" }}
          >
            <RotateCw size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <div className="browser-address-wrap">
            {loadedUrl ? (
              isSecure
                ? <Lock size={12} color="var(--success)" />
                : <AlertTriangle size={12} color="var(--danger)" />
            ) : <Globe size={12} />}
            <input
              id="browser-url-input"
              className="browser-url-input"
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Type a URL or search…"
              autoComplete="off"
              spellCheck={false}
              aria-label="Browser address bar"
            />
            {addressInput && (
              <button type="button" onClick={() => setAddressInput("")}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text-3)", padding: 0 }}
                aria-label="Clear">
                <X size={12} />
              </button>
            )}
            <button type="submit"
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text-3)", padding: 0 }}
              aria-label="Go">
              <Search size={12} />
            </button>
          </div>
        </form>

        {loadedUrl && !hasError && (
          <a href={loadedUrl} target="_blank" rel="noopener noreferrer"
            className="browser-action-btn" title="Open in new tab" aria-label="Open in new tab">
            <ArrowUpRight size={15} />
          </a>
        )}
      </div>

      {/* ── Viewport ── */}
      <div className="browser-viewport">
        {isLoading && <div className="browser-loading-bar" />}

        {/* Empty state */}
        {!loadedUrl && !hasError && (
          <div className="browser-overlay">
            <Globe size={44} />
            <p className="browser-overlay-text">Browse any website</p>
            <p className="browser-overlay-sub">Enter a URL above to preview it, then convert to PDF</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
              {QUICK_LINKS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => navigate(q.url)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 500,
                    background: "var(--accent-soft)", color: "var(--accent)",
                    border: "1px solid rgba(91,94,246,0.2)", cursor: "pointer", transition: "all 0.18s"
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blocked (localhost / self-referential) */}
        {hasError && errorType === "blocked" && (
          <div className="browser-overlay">
            <AlertTriangle size={40} color="var(--danger)" style={{ opacity: 0.8 }} />
            <p className="browser-overlay-text">Cannot load this address</p>
            <p className="browser-overlay-sub">
              Local addresses (localhost, 127.0.0.1) cannot be previewed here.
              Switch to the <strong>Paste URL</strong> tab to convert a public website.
            </p>
          </div>
        )}

        {/* X-Frame-Options / CSP blocked by site */}
        {hasError && errorType === "frame" && (
          <div className="browser-overlay">
            <AlertTriangle size={40} color="var(--warning, #f59e0b)" style={{ opacity: 0.8 }} />
            <p className="browser-overlay-text">This site blocks embedding</p>
            <p className="browser-overlay-sub">
              Many sites set X-Frame-Options to block iframes. You can still convert it to PDF — 
              click <strong>"Use this URL for PDF"</strong> below.
            </p>
          </div>
        )}

        {/* Iframe */}
        {showIframe && (
          <iframe
            ref={iframeRef}
            src={loadedUrl}
            className={`browser-iframe ${isLoading ? "loading" : ""}`}
            onLoad={handleLoad}
            onError={handleError}
            title="Page preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>

      {/* ── Footer action bar ── */}
      {loadedUrl && (
        <div style={{
          padding: "10px 16px", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface-2)", flexWrap: "wrap"
        }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {loadedUrl}
          </div>
          <button
            id="use-iframe-url-btn"
            className="use-iframe-url-btn"
            onClick={() => onUseUrl(loadedUrl)}
            type="button"
          >
            <FileDown size={13} />
            Use this URL for PDF
          </button>
        </div>
      )}
    </div>
  );
}
