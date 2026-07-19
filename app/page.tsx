"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, X,
  Lock, AlertTriangle, ArrowUpRight, Search,
  FileText, Download, CheckCircle, FileWarning,
  Settings2, ChevronDown, Printer
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import FeatureCards from "@/components/FeatureCards";

/* ── constants ──────────────────────────────────────────────── */
const BLOCKED = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

// 1 page is roughly 1100px in print
const LENGTH_OPTS = [
  { value: 1200, label: "Screen size (1 page)" },
  { value: 5500, label: "Short (~5 pages)" },
  { value: 16500, label: "Medium (~15 pages)" },
  { value: 33000, label: "Long (~30 pages)" },
  { value: 55000, label: "Extra Long (~50 pages)" },
];

function isSelf(url: string) {
  try { return BLOCKED.some(b => new URL(url).hostname === b); }
  catch { return false; }
}

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(".") && !t.includes(" ")) return `https://${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

/* ── Main Component ─────────────────────────────────────────── */
export default function HomePage() {
  /* browser state */
  const [addrInput, setAddrInput]   = useState("");
  const [loadedUrl, setLoadedUrl]   = useState("");
  const [ifrLoading, setIfrLoading] = useState(false);
  const [ifrError, setIfrError]     = useState(false);
  const [history, setHistory]       = useState<string[]>([]);
  const [histIdx, setHistIdx]       = useState(-1);
  const ifrRef = useRef<HTMLIFrameElement>(null);

  /* print options */
  const [printHeight, setPrintHeight] = useState<number>(16500);
  const [optsOpen, setOptsOpen] = useState(false);
  
  /* Apply CSS variable to document so @media print can pick it up */
  useEffect(() => {
    document.documentElement.style.setProperty('--print-height', `${printHeight}px`);
  }, [printHeight]);

  /* ── browser navigation ─────────────────────────────────── */
  const navigate = useCallback((raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return;
    if (isSelf(url)) { setIfrError(true); setLoadedUrl(url); setAddrInput(url); return; }
    setAddrInput(url); setLoadedUrl(url); setIfrLoading(true); setIfrError(false);
    setHistory(h => { const s = h.slice(0, histIdx + 1); const n = [...s, url]; setHistIdx(n.length - 1); return n; });
  }, [histIdx]);

  const goBack = () => {
    if (histIdx > 0) { const u = history[histIdx-1]; setHistIdx(i=>i-1); setAddrInput(u); setLoadedUrl(u); setIfrLoading(true); setIfrError(false); }
  };
  const goFwd  = () => {
    if (histIdx < history.length-1) { const u = history[histIdx+1]; setHistIdx(i=>i+1); setAddrInput(u); setLoadedUrl(u); setIfrLoading(true); setIfrError(false); }
  };
  const reload = () => { if (!loadedUrl || ifrError) return; setIfrLoading(true); if (ifrRef.current) ifrRef.current.src = loadedUrl; };

  const handleLoad = () => {
    setIfrLoading(false); setIfrError(false);
    try {
      const href = ifrRef.current?.contentWindow?.location?.href;
      if (href && href !== "about:blank") { setAddrInput(href); setLoadedUrl(href); }
    } catch { /* cross-origin */ }
  };

  /* ── Print generation ───────────────────────────────────── */
  function handleGenerate() {
    const url = loadedUrl.trim();
    if (!url || isSelf(url)) return;
    
    // Close options panel before printing so it isn't rendered
    setOptsOpen(false);
    
    // Slight delay to allow CSS variable and options panel close to apply
    setTimeout(() => {
      window.print();
    }, 100);
  }

  const isSecure   = loadedUrl.startsWith("https://");
  const canBack    = histIdx > 0;
  const canFwd     = histIdx < history.length - 1;
  const canGenerate = !!loadedUrl && !isSelf(loadedUrl);

  return (
    <>
      <div className="bg-grid" aria-hidden />
      <div className="bg-blob bg-blob-1" aria-hidden />
      <div className="bg-blob bg-blob-2" aria-hidden />

      <div className="app-wrapper">

        {/* ── Navbar ────────────────────────────────────────── */}
        <nav className="navbar">
          <div className="container">
            <div className="navbar-inner">
              <div className="logo">
                <div className="logo-mark"><FileText size={18} /></div>
                Page<span className="logo-dot">PDF</span>
              </div>
              <span className="badge-free">Free</span>
            </div>
          </div>
        </nav>

        <main>
          <div className="container">

            {/* ── Hero ────────────────────────────────────────── */}
            <section className="hero">
              <h1>Browse Any Page,<br /><span className="gradient-text">Download as PDF</span></h1>
              <p className="hero-sub">
                Navigate to any website below. When you're ready, hit Generate PDF to trigger
                your device's native print-to-PDF tool (works perfectly on mobile!).
              </p>
            </section>

            {/* ── Browser Card ────────────────────────────────── */}
            <div className="browser-card" style={{ marginBottom: 40 }}>

              {/* Chrome bar */}
              <div className="browser-chrome">
                <div className="browser-dots">
                  <span className="bdot bdot-r"/><span className="bdot bdot-y"/><span className="bdot bdot-g"/>
                </div>

                <div className="browser-actions">
                  <button className="browser-action-btn" onClick={goBack}  disabled={!canBack} aria-label="Back"><ArrowLeft size={15}/></button>
                  <button className="browser-action-btn" onClick={goFwd}   disabled={!canFwd}  aria-label="Forward"><ArrowRight size={15}/></button>
                  <button className="browser-action-btn" onClick={reload}  disabled={!loadedUrl || ifrError}
                    style={{ animation: ifrLoading ? "spin 0.7s linear infinite" : "none" }} aria-label="Reload">
                    <RotateCw size={14}/>
                  </button>
                </div>

                {/* Address bar */}
                <form onSubmit={e => { e.preventDefault(); navigate(addrInput); }} style={{ flex:1 }}>
                  <div className="browser-address-wrap">
                    {loadedUrl
                      ? isSecure ? <Lock size={12} color="var(--success)"/> : <AlertTriangle size={12} color="var(--danger)"/>
                      : <Globe size={12}/>
                    }
                    <input
                      id="browser-url-input"
                      className="browser-url-input"
                      value={addrInput}
                      onChange={e => setAddrInput(e.target.value)}
                      placeholder="Type a URL or search — e.g. fenrirealm.com"
                      autoComplete="off" spellCheck={false}
                      aria-label="Browser address bar"
                    />
                    {addrInput && (
                      <button type="button" onClick={() => setAddrInput("")}
                        style={{ background:"none", border:"none", cursor:"pointer", display:"flex", color:"var(--text-3)", padding:0 }}>
                        <X size={12}/>
                      </button>
                    )}
                    <button type="submit" style={{ background:"none", border:"none", cursor:"pointer", display:"flex", color:"var(--text-3)", padding:0 }} aria-label="Go">
                      <Search size={12}/>
                    </button>
                  </div>
                </form>

                {loadedUrl && !ifrError && (
                  <a href={loadedUrl} target="_blank" rel="noopener noreferrer" className="browser-action-btn" title="Open in new tab">
                    <ArrowUpRight size={15}/>
                  </a>
                )}
              </div>

              {/* Viewport */}
              <div className="browser-viewport">
                {ifrLoading && <div className="browser-loading-bar"/>}

                {!loadedUrl && !ifrError && (
                  <div className="browser-overlay">
                    <Globe size={48}/>
                    <p className="browser-overlay-text">Browse to any website</p>
                    <p className="browser-overlay-sub">Type a URL above, then click Generate PDF below</p>
                  </div>
                )}

                {ifrError && (
                  <div className="browser-overlay">
                    <AlertTriangle size={40} color="var(--danger)" style={{ opacity:0.8 }}/>
                    <p className="browser-overlay-text">Can't display this page</p>
                    <p className="browser-overlay-sub">This site blocks embedding.</p>
                  </div>
                )}

                {loadedUrl && !ifrError && (
                  <iframe
                    ref={ifrRef}
                    src={loadedUrl}
                    className={`browser-iframe ${ifrLoading ? "loading" : ""}`}
                    onLoad={handleLoad}
                    onError={() => { setIfrLoading(false); setIfrError(true); }}
                    title="Page preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                )}
              </div>

              {/* ── Bottom action bar (inside browser card) ── */}
              <div className="bottom-action-bar" style={{
                borderTop:"1px solid var(--border)", background:"var(--surface-2)",
                padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
                borderBottomLeftRadius: optsOpen ? 0 : "calc(var(--radius-xl) - 1px)",
                borderBottomRightRadius: optsOpen ? 0 : "calc(var(--radius-xl) - 1px)"
              }}>
                {/* URL pill */}
                {loadedUrl ? (
                  <div style={{ flex:1, minWidth:0, fontSize:"0.78rem", color:"var(--text-3)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
                    {isSecure ? <Lock size={11} color="var(--success)"/> : <Globe size={11}/>}
                    {loadedUrl}
                  </div>
                ) : (
                  <div style={{ flex:1, fontSize:"0.78rem", color:"var(--text-3)" }}>
                    No page loaded yet
                  </div>
                )}

                {/* Options toggle */}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setOptsOpen(o => !o)}
                  style={{ padding:"8px 14px" }}
                  aria-expanded={optsOpen}
                >
                  <Settings2 size={14}/>
                  Options
                  <ChevronDown size={12} style={{ transform: optsOpen ? "rotate(180deg)" : "none", transition:"0.2s" }}/>
                </button>

                {/* Generate PDF (Native Print) */}
                <button
                  id="generate-btn"
                  type="button"
                  className="generate-btn"
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  style={{ width:"auto", padding:"9px 22px", fontSize:"0.875rem" }}
                >
                  <Printer size={15}/> Generate PDF
                </button>
              </div>

              {/* Inline options panel */}
              <div className={`options-panel ${optsOpen ? "open" : ""}`} style={{ 
                borderTop: optsOpen ? "1px solid var(--border)" : "none",
                borderBottomLeftRadius: optsOpen ? "calc(var(--radius-xl) - 1px)" : 0,
                borderBottomRightRadius: optsOpen ? "calc(var(--radius-xl) - 1px)" : 0,
                background: "var(--surface-2)"
              }}>
                <div className="options-inner" style={{ padding:"16px 18px" }}>
                  <div className="options-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <CustomSelect 
                      id="opt-length"  
                      label="Document Length (Helps capture full page)"      
                      options={LENGTH_OPTS}  
                      value={printHeight}      
                      onChange={v => setPrintHeight(Number(v))} 
                    />
                    <p style={{ fontSize:"0.8rem", color:"var(--text-3)", marginTop: "-8px" }}>
                      Since we use your device's native PDF generator, we have to artificially expand the page height to capture everything.
                      Choose a length that roughly matches the article length.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <FeatureCards/>
          </div>
        </main>

        <footer className="footer">
          <div className="container">
            <p>PagePDF — Convert any webpage to PDF</p>
          </div>
        </footer>
      </div>
    </>
  );
}
