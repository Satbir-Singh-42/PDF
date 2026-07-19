"use client";
import { useState, useRef, useCallback } from "react";
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, X,
  Lock, AlertTriangle, ArrowUpRight, Search,
  FileText, Download, CheckCircle, FileWarning,
  Loader2, XCircle, Settings2, ChevronDown
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import ProgressBar from "@/components/ProgressBar";
import FeatureCards from "@/components/FeatureCards";
import type { PdfOptions, AppState, ProgressEvent } from "@/lib/types";

/* ── constants ──────────────────────────────────────────────── */
const BLOCKED = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

const FORMAT_OPTS  = [{ value:"A4", label:"A4" }, { value:"Letter", label:"Letter" }, { value:"fullpage", label:"Full Page" }];
const MARGIN_OPTS  = [{ value:"none", label:"No margins" }, { value:"small", label:"Small" }, { value:"normal", label:"Normal" }];
const SCROLL_OPTS  = [{ value:10, label:"10 scrolls" }, { value:25, label:"25 scrolls" }, { value:50, label:"50 scrolls" }, { value:100, label:"100 scrolls" }, { value:0, label:"Unlimited ∞" }];
const SPEED_OPTS   = [{ value:"fast", label:"Fast" }, { value:"normal", label:"Normal" }, { value:"slow", label:"Slow" }];

const FAKE_STEPS: ProgressEvent[] = [
  { stage:"fetching",   message:"Launching browser…",          percent:8  },
  { stage:"fetching",   message:"Opening page…",               percent:16 },
  { stage:"scrolling",  message:"Page loaded — scrolling…",    percent:26, scrollCount:1,  maxScrolls:25 },
  { stage:"scrolling",  message:"Capturing content…",          percent:40, scrollCount:8,  maxScrolls:25 },
  { stage:"scrolling",  message:"Loading more content…",       percent:54, scrollCount:15, maxScrolls:25 },
  { stage:"scrolling",  message:"Almost at the bottom…",       percent:66, scrollCount:22, maxScrolls:25 },
  { stage:"generating", message:"Rendering full page…",        percent:79 },
  { stage:"generating", message:"Generating PDF file…",        percent:92 },
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

  /* options state */
  const [opts, setOpts] = useState<PdfOptions>({
    format:"A4", margins:"normal", maxScrolls:25, scrollDelay:"normal", includeBackground:true
  });
  const [optsOpen, setOptsOpen] = useState(false);
  const setOpt = <K extends keyof PdfOptions>(k: K, v: PdfOptions[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

  /* pdf state */
  const [appState, setAppState] = useState<AppState>({ status:"idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  /* ── PDF generation ─────────────────────────────────────── */
  function startFakeProgress() {
    const steps = FAKE_STEPS.map(s => s.stage === "scrolling" ? { ...s, maxScrolls: opts.maxScrolls } : s);
    let i = 0;
    setAppState({ status:"loading", progress: steps[0] });
    timerRef.current = setInterval(() => {
      i++;
      if (i < steps.length) setAppState({ status:"loading", progress: steps[i] });
      else clearInterval(timerRef.current!);
    }, 2200);
  }
  function stopFakeProgress() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function handleGenerate() {
    const url = loadedUrl.trim();
    if (!url || isSelf(url)) return;

    abortRef.current = new AbortController();
    startFakeProgress();

    try {
      const res = await fetch("/api/generate-pdf", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ url, options: opts }),
        signal: abortRef.current.signal,
      });
      stopFakeProgress();

      if (!res.ok) {
        const b = await res.json().catch(() => ({ error:"Server error." }));
        throw new Error(b.error ?? `Error ${res.status}`);
      }

      const filename    = res.headers.get("X-Filename") ?? "download.pdf";
      const sizeKb      = Number(res.headers.get("X-Size-KB") ?? "0");
      const blob        = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setAppState({ status:"success", downloadUrl, filename, sizeKb });
      const a = document.createElement("a"); a.href = downloadUrl; a.download = filename; a.click();
    } catch (err: unknown) {
      stopFakeProgress();
      if ((err as Error).name === "AbortError") return;
      setAppState({ status:"error", message: err instanceof Error ? err.message : "Unexpected error." });
    }
  }

  const isLoading  = appState.status === "loading";
  const isSecure   = loadedUrl.startsWith("https://");
  const canBack    = histIdx > 0;
  const canFwd     = histIdx < history.length - 1;
  const canGenerate = !!loadedUrl && !isSelf(loadedUrl) && !isLoading;

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
                Navigate to any website below — novels, docs, news, anything.
                Hit Generate PDF and we'll auto-scroll and capture every bit of it.
              </p>
            </section>

            {/* ── Browser Card ────────────────────────────────── */}
            <div className="browser-card" style={{ marginBottom: 14 }}>

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
                      placeholder="Type a URL or search — e.g. fenrirealm.com/series/…"
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
              <div className="browser-viewport" style={{ height: 520 }}>
                {ifrLoading && <div className="browser-loading-bar"/>}

                {!loadedUrl && !ifrError && (
                  <div className="browser-overlay">
                    <Globe size={48}/>
                    <p className="browser-overlay-text">Browse to any website</p>
                    <p className="browser-overlay-sub">Type a URL above, then click Generate PDF below</p>
                    <div style={{ display:"flex", gap:8, marginTop:16, flexWrap:"wrap", justifyContent:"center" }}>
                      {[
                        { label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Main_Page" },
                        { label:"MDN Docs",  url:"https://developer.mozilla.org" },
                        { label:"BBC News",  url:"https://www.bbc.com/news" },
                      ].map(q => (
                        <button key={q.label} type="button" onClick={() => navigate(q.url)}
                          style={{ padding:"6px 14px", borderRadius:8, fontSize:"0.8rem", fontWeight:500,
                            background:"var(--accent-soft)", color:"var(--accent)",
                            border:"1px solid rgba(91,94,246,0.2)", cursor:"pointer" }}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ifrError && (
                  <div className="browser-overlay">
                    <AlertTriangle size={40} color="var(--danger)" style={{ opacity:0.8 }}/>
                    <p className="browser-overlay-text">Can't display this page</p>
                    <p className="browser-overlay-sub">This site blocks embedding. You can still generate a PDF — click the button below.</p>
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
              <div style={{
                borderTop:"1px solid var(--border)", background:"var(--surface-2)",
                padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"
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

                {/* Generate PDF */}
                {isLoading ? (
                  <button type="button" className="cancel-btn"
                    onClick={() => { abortRef.current?.abort(); stopFakeProgress(); setAppState({ status:"idle" }); }}
                    style={{ padding:"9px 18px", fontSize:"0.875rem" }}>
                    <XCircle size={15}/> Cancel
                  </button>
                ) : (
                  <button
                    id="generate-btn"
                    type="button"
                    className="generate-btn"
                    disabled={!canGenerate}
                    onClick={handleGenerate}
                    style={{ width:"auto", padding:"9px 22px", fontSize:"0.875rem" }}
                  >
                    {isLoading
                      ? <><span className="btn-spinner"/> Generating…</>
                      : <><FileText size={15}/> Generate PDF</>
                    }
                  </button>
                )}
              </div>

              {/* Inline options panel */}
              <div className={`options-panel ${optsOpen ? "open" : ""}`} style={{ borderTop: optsOpen ? "1px solid var(--border)" : "none" }}>
                <div className="options-inner" style={{ padding:"16px 18px" }}>
                  <div className="options-grid">
                    <CustomSelect id="opt-format"  label="Format"      options={FORMAT_OPTS}  value={opts.format}      onChange={v => setOpt("format", v as PdfOptions["format"])} />
                    <CustomSelect id="opt-margins" label="Margins"     options={MARGIN_OPTS}  value={opts.margins}     onChange={v => setOpt("margins", v as PdfOptions["margins"])} />
                    <CustomSelect id="opt-scrolls" label="Scroll Depth" options={SCROLL_OPTS} value={opts.maxScrolls}  onChange={v => setOpt("maxScrolls", Number(v))} />
                    <CustomSelect id="opt-speed"   label="Speed"       options={SPEED_OPTS}   value={opts.scrollDelay} onChange={v => setOpt("scrollDelay", v as PdfOptions["scrollDelay"])} />
                    <div>
                      <div style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>
                        Backgrounds
                      </div>
                      <div className="toggle-row">
                        <span>Include backgrounds</span>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={opts.includeBackground} onChange={e => setOpt("includeBackground", e.target.checked)}/>
                          <span className="toggle-track"/>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Progress ─────────────────────────────────── */}
            {appState.status === "loading" && <ProgressBar progress={appState.progress}/>}

            {/* ── Success ──────────────────────────────────── */}
            {appState.status === "success" && (
              <div className="success-card">
                <div className="success-icon-wrap"><CheckCircle size={24} color="white"/></div>
                <h2 className="success-title">PDF Ready!</h2>
                <p className="success-sub">{appState.filename}{appState.sizeKb > 0 ? ` · ${appState.sizeKb} KB` : ""}</p>
                <a id="download-btn" href={appState.downloadUrl} download={appState.filename} className="download-btn">
                  <Download size={16}/> Download Again
                </a>
                <button type="button" className="reset-link" onClick={() => setAppState({ status:"idle" })}>
                  ← Convert another page
                </button>
              </div>
            )}

            {/* ── Error ────────────────────────────────────── */}
            {appState.status === "error" && (
              <div className="error-card">
                <FileWarning size={18}/>
                <div>
                  <p className="error-text"><strong>Error: </strong>{appState.message}</p>
                  <button type="button" className="error-dismiss" onClick={() => setAppState({ status:"idle" })}>Dismiss</button>
                </div>
              </div>
            )}

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
