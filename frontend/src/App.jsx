import { useState, useCallback, useEffect, useRef } from "react";
import { useDocument } from "./hooks/useDocument";
import useDocumentStore from "./store/documentStore";
import useUIStore from "./store/uiStore";
import PDFViewer from "./components/PDFViewer/PDFViewer";
import Sidebar from "./components/Sidebar/Sidebar";
import Toolbar from "./components/Editor/Toolbar";
import AIPanel from "./components/AI/AIPanel";
import SignaturePanel from "./components/Signature/SignaturePanel";
import StampPanel from "./components/Stamp/StampPanel";
import PageManager from "./components/PageManager/PageManager";
import OCRPanel from "./components/OCR/OCRPanel";
import PageDecorPanel from "./components/PageDecor/PageDecorPanel";
import PresentationMode from "./components/PDFViewer/PresentationMode";
import CropPanel from "./components/Crop/CropPanel";
import ConvertPanel from "./components/Convert/ConvertPanel";
import SettingsPanel from "./components/Settings/SettingsPanel";
import CompressPanel from "./components/Compress/CompressPanel";
import VersionHistoryPanel from "./components/VersionHistory/VersionHistoryPanel";

function saveRecentDoc(filePath) {
  try {
    const name = filePath.split("/").pop();
    const list = JSON.parse(localStorage.getItem("recentDocs") || "[]");
    const filtered = list.filter(d => d.path !== filePath);
    filtered.unshift({ name, path: filePath, time: Date.now() });
    localStorage.setItem("recentDocs", JSON.stringify(filtered.slice(0, 6)));
  } catch {}
}

export default function App() {
  const { open, error }            = useDocument();
  const { activeDocId, documents } = useDocumentStore();
  const { loading, loadingMsg }    = useUIStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [showAI, setShowAI]           = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("pdfstudio_theme") || "dark");

  const makePdfItemStyle = {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "8px 10px", borderRadius: 7,
    border: "none", background: "transparent",
    cursor: "pointer", textAlign: "left",
    transition: "background 0.15s ease",
  };

  // Close Make PDF dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (makePdfRef.current && !makePdfRef.current.contains(e.target)) {
        setShowMakePdf(false);
      }
    };
    document.addEventListener("mousedown", handler);

  return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pdfstudio_theme", theme);
  }, [theme]);
  const [activeTool, setActiveTool]   = useState(null);

  const [showSignature, setShowSignature]       = useState(false);
  const [pendingSignature, setPendingSignature] = useState(null);
  const [showStamp, setShowStamp]               = useState(false);
  const [pendingStamp, setPendingStamp]         = useState(null);
  const [showPageManager, setShowPageManager]   = useState(false);
  const [showPageDecor, setShowPageDecor]       = useState(false);
  const [showOCR, setShowOCR]                   = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showCrop, setShowCrop]                 = useState(false);
  const [showMakePdf, setShowMakePdf]           = useState(false);
  const [showCompress, setShowCompress]         = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const makePdfRef = useRef(null);
  const [cropMode, setCropMode]                 = useState(false);
  const [cropApplyAll, setCropApplyAll]         = useState(false);
  const [showConvert, setShowConvert]           = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const activeDoc = activeDocId ? documents[activeDocId] : null;
  const handleRefreshPage = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleOpenFile = async () => {
    const filePath = await window.electronAPI?.openFile();
    if (!filePath) return;
    setCurrentPage(0);
    await open(filePath);
    saveRecentDoc(filePath);
  };

  const handleOpenRecent = async (filePath) => {
    setCurrentPage(0);
    await open(filePath);
    saveRecentDoc(filePath);
  };

  const handleGoHome = () => {
    useDocumentStore.getState().closeDocument?.(activeDocId);
  };

  const handleImportDocx = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".docx";
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const fd = new FormData(); fd.append("file", file);
      try {
        useUIStore.getState().setLoading(true, "Converting Word document...");
        const res = await fetch("http://127.0.0.1:8000/api/import/docx", { method: "POST", body: fd });
        const d = await res.json();
        useDocumentStore.getState().openDocument(d.id, d);
        setCurrentPage(0);
      } catch {}
      finally { useUIStore.getState().setLoading(false); }
    };
    input.click();
  };

  const handlePptToPdf = async () => {
    const input  = document.createElement("input");
    input.type   = "file";
    input.accept = ".ppt,.pptx";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        useUIStore.getState().setLoading(true, "Converting PPT to PDF...");
        const res = await fetch("http://127.0.0.1:8000/api/convert/ppt-to-pdf", { method: "POST", body: formData });
        if (res.ok) {
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href = url; a.download = "converted.pdf"; a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) { console.error("PPT to PDF failed:", err); }
      finally { useUIStore.getState().setLoading(false); }
    };
    input.click();
  };

  const handleImagesToPDF = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files); if (!files.length) return;
      const fd = new FormData(); files.forEach(f => fd.append("files", f));
      try {
        useUIStore.getState().setLoading(true, "Converting images to PDF...");
        const res = await fetch("http://127.0.0.1:8000/api/images-to-pdf/convert", { method: "POST", body: fd });
        if (res.ok) {
          const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: "images.pdf" });
          a.click();
        }
      } catch {}
      finally { useUIStore.getState().setLoading(false); }
    };
    input.click();
  };

  const handleSavePDF = async () => {
    if (!activeDocId) return;
    const res = await fetch(`http://127.0.0.1:8000/api/document/${activeDocId}/download`);
    if (res.ok) {
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: "edited.pdf" });
      a.click();
    }
  };

  const handleRevert = async () => {
    if (!activeDocId || !window.confirm("Revert to original? All changes will be lost.")) return;
    const res = await fetch(`http://127.0.0.1:8000/api/document/${activeDocId}/revert`, { method: "POST" });
    if (res.ok) setRefreshKey(k => k + 1);
  };

  const handleUndo = async () => {
    if (!activeDocId) return;
    const res = await fetch(`http://127.0.0.1:8000/api/document/${activeDocId}/undo_v2`, { method: "POST" });
    if (res.ok) setRefreshKey(k => k + 1);
  };

  const handleRedo = async () => {
    if (!activeDocId) return;
    const res = await fetch(`http://127.0.0.1:8000/api/document/${activeDocId}/redo_v2`, { method: "POST" });
    if (res.ok) setRefreshKey(k => k + 1);
  };

  const handleSignaturePlaced = async (x, y) => {
    if (!pendingSignature || !activeDocId) return;
    const sig = pendingSignature; setPendingSignature(null);
    await fetch(sig.mode === "type"
      ? "http://127.0.0.1:8000/api/signature/text"
      : "http://127.0.0.1:8000/api/signature/image", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sig.mode === "type"
        ? { doc_id: activeDocId, page: currentPage, x, y, name: sig.name, fontsize: sig.fontsize, color: sig.color }
        : { doc_id: activeDocId, page: currentPage, x, y, width: 180, height: 70, image_b64: sig.imageB64 }),
    });
    handleRefreshPage();
  };

  const handleStampPlaced = async (x, y) => {
    if (!pendingStamp || !activeDocId) return;
    const s = pendingStamp; setPendingStamp(null);
    await fetch("http://127.0.0.1:8000/api/stamp/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: activeDocId, page: currentPage, x, y, text: s.text, color: s.color, include_date: s.includeDate }),
    });
    handleRefreshPage();
  };

  const handleCropApplied = async (rect) => {
    if (!activeDocId) return;
    await fetch("http://127.0.0.1:8000/api/crop/page", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: activeDocId, page: currentPage, x: rect.x, y: rect.y, width: rect.width, height: rect.height, apply_to_all: cropApplyAll }),
    });
    setCropMode(false); handleRefreshPage();
  };

  const pendingPlacement = pendingSignature || pendingStamp;
  const handlePlacement  = (x, y) => pendingSignature ? handleSignaturePlaced(x, y) : handleStampPlaced(x, y);

  // callbacks object passed to Toolbar so it can trigger modals/actions
  const toolbarCallbacks = {
    onSave:         handleSavePDF,
    onUndo:         handleUndo,
    onRedo:         handleRedo,
    onRevert:       handleRevert,
    onImportDocx:   handleImportDocx,
    onShowCompress:  () => setShowCompress(true),
    onShowVersionHistory: () => setShowVersionHistory(true),
    onImagesToPDF:  handleImagesToPDF,
    onShowPages:    () => setShowPageManager(true),
    onShowPageDecor:() => setShowPageDecor(true),
    onShowCrop:     () => setShowCrop(true),
    onShowConvert:  () => setShowConvert(true),
    onShowOCR:      () => setShowOCR(true),
    onShowPresent:  () => setShowPresentation(true),
    onShowStamp:    () => setShowStamp(true),
    onShowSignature:() => setShowSignature(true),
    onShowAI:       () => setShowAI(v => !v),
    showAI,
  };

  return (
    <div className="app-shell">
      {/* ── TOPBAR — minimal ── */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="logo" onClick={handleGoHome} style={{ cursor: "pointer", userSelect: "none" }}>
            PDF Studio
          </span>
          <span className="idrep-badge">ID-REP</span>
        </div>

        <div style={{ flex: 1 }} />

        {activeDocId && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 10 }}>
            <div className="topbar-btn-group">
              <button onClick={handleUndo} title="Undo" className="topbar-icon-btn">↩</button>
              <button onClick={handleRedo} title="Redo" className="topbar-icon-btn">↪</button>
              <button onClick={handleRevert} title="Revert to original" className="topbar-icon-btn danger">⟳</button>
            </div>
            <button onClick={() => setShowVersionHistory(true)} title="Version History" className="topbar-text-btn">🕒 History</button>
            <button onClick={() => setShowCompress(true)} title="Compress PDF" className="topbar-text-btn">🗜 Compress</button>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />
            <button onClick={() => setShowAI(a => !a)} title="AI Assistant" className={`topbar-text-btn accent${showAI ? " active" : ""}`}>
              ✨ AI
            </button>
            <button onClick={() => setShowPresentation(true)} title="Presentation Mode" className="topbar-text-btn">
              ⛶ Present
            </button>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />
          </div>
        )}

        <div style={{ position: "relative" }} ref={makePdfRef}>
          <button
            onClick={() => setShowMakePdf(m => !m)}
            style={{
              height: 32, padding: "0 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.2px",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📄 Make PDF <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
          </button>
          {showMakePdf && (
            <div style={{
              position: "absolute", top: 38, right: 0,
              background: "var(--bg-panel)", border: "1px solid var(--border-default)",
              borderRadius: 10, padding: 6, minWidth: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200,
            }}>
              <button onClick={() => { handleImportDocx(); setShowMakePdf(false); }} style={makePdfItemStyle}>
                <span>📝</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Word → PDF</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Import .docx file</div>
                </div>
              </button>
              <button onClick={() => { handleImagesToPDF(); setShowMakePdf(false); }} style={makePdfItemStyle}>
                <span>🖼</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Images → PDF</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Combine images into PDF</div>
                </div>
              </button>
              <button onClick={() => { handlePptToPdf(); setShowMakePdf(false); }} style={makePdfItemStyle}>
                <span>📊</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>PPT → PDF</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>PowerPoint to PDF</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleOpenFile}
          style={{
            height: 32, padding: "0 18px", borderRadius: 8,
            background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
            border: "none", color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: "pointer", letterSpacing: "0.2px",
            boxShadow: "0 2px 12px rgba(108,99,255,0.35)",
          }}
        >
          Open PDF
        </button>
        <button onClick={() => setShowSettings(true)} title="Settings" className="topbar-icon-btn settings-btn">⚙️</button>
      </header>

      {/* ── BANNERS ── */}
      {pendingPlacement && (
        <div style={{ background: "rgba(108,99,255,0.15)", borderBottom: "1px solid rgba(108,99,255,0.3)", color: "#c4bfff", padding: "7px 20px", fontSize: 12, fontWeight: 500, textAlign: "center" }}>
          {pendingSignature ? "Click anywhere on the PDF to place your signature" : "Click anywhere on the PDF to place the stamp"}
          <button onClick={() => { setPendingSignature(null); setPendingStamp(null); }} style={{ marginLeft: 16, background: "none", border: "none", color: "#a89fe8", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Cancel</button>
        </div>
      )}
      {cropMode && (
        <div style={{ background: "rgba(108,99,255,0.15)", borderBottom: "1px solid rgba(108,99,255,0.3)", color: "#c4bfff", padding: "7px 20px", fontSize: 12, fontWeight: 500, textAlign: "center" }}>
          Drag on the PDF to select crop area
          <button onClick={() => setCropMode(false)} style={{ marginLeft: 16, background: "none", border: "none", color: "#a89fe8", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Cancel</button>
        </div>
      )}

      {/* ── MAIN AREA ── */}
      <div className="main-area">
        {activeDocId && (
          <Sidebar
            docId={activeDocId}
            totalPages={activeDoc?.totalPages || 0}
            currentPage={currentPage}
            onPageSelect={setCurrentPage}
          />
        )}

        <main className="viewer-area">
          {activeDocId && (
            <Toolbar
              docId={activeDocId}
              onRefreshPage={handleRefreshPage}
              activeTool={activeTool}
              onToolChange={setActiveTool}
              callbacks={toolbarCallbacks}
            />
          )}

          {loading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{loadingMsg}</p>
            </div>
          )}
          {error && <div className="error-banner">{error}</div>}

          {activeDocId
            ? <PDFViewer
                docId={activeDocId}
                totalPages={activeDoc?.totalPages || 0}
                externalPage={currentPage}
                onPageChange={setCurrentPage}
                refreshKey={refreshKey}
                activeTool={activeTool}
                pendingSignature={pendingPlacement}
                onSignaturePlaced={handlePlacement}
                cropMode={cropMode}
                onCropApplied={handleCropApplied}
              />
            : <WelcomeScreen onOpen={handleOpenFile} onOpenRecent={handleOpenRecent} />
          }
        </main>

        {activeDocId && showAI && (
          <AIPanel docId={activeDocId} onClose={() => setShowAI(false)} />
        )}
      </div>

      {/* ── MODALS ── */}
      {showSignature && activeDocId && (
        <SignaturePanel onClose={() => setShowSignature(false)} onReady={d => { setShowSignature(false); setPendingSignature(d); }} />
      )}
      {showStamp && activeDocId && (
        <StampPanel onClose={() => setShowStamp(false)} onReady={d => { setShowStamp(false); setPendingStamp(d); }} />
      )}
      {showPageManager && activeDocId && (
        <PageManager docId={activeDocId} totalPages={activeDoc?.totalPages || 0} onClose={() => setShowPageManager(false)} />
      )}
      {showOCR && activeDocId && (
        <OCRPanel docId={activeDocId} totalPages={activeDoc?.totalPages || 0} onClose={() => setShowOCR(false)} onComplete={handleRefreshPage} />
      )}
      {showPageDecor && activeDocId && (
        <PageDecorPanel docId={activeDocId} totalPages={activeDoc?.totalPages || 0} onClose={() => setShowPageDecor(false)} onComplete={() => { handleRefreshPage(); setShowPageDecor(false); }} />
      )}
      {showCrop && activeDocId && (
        <CropPanel
          docId={activeDocId} currentPage={currentPage} totalPages={activeDoc?.totalPages || 0}
          onClose={() => setShowCrop(false)}
          onComplete={mode => { if (mode === "crop_mode") { setCropMode(true); setCropApplyAll(false); } else { handleRefreshPage(); setShowCrop(false); } }}
        />
      )}
      {showConvert && (
        <ConvertPanel onClose={() => setShowConvert(false)} />
      )}
      {showPresentation && activeDocId && (
        <PresentationMode docId={activeDocId} totalPages={activeDoc?.totalPages || 0} startPage={currentPage} onClose={() => setShowPresentation(false)} />
      )}
      {showVersionHistory && activeDocId && (
        <VersionHistoryPanel
          docId={activeDocId}
          onClose={() => setShowVersionHistory(false)}
          onRestore={() => { handleRefreshPage(); }}
        />
      )}
      {showCompress && activeDocId && (
        <CompressPanel
          docId={activeDocId}
          onClose={() => setShowCompress(false)}
          onComplete={() => { handleRefreshPage(); }}
        />
      )}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} theme={theme} setTheme={setTheme} />
      )}
    </div>
  );
}

function WelcomeScreen({ onOpen, onOpenRecent }) {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("recentDocs") || "[]")); } catch {}
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-app-shell)", padding: "40px 32px 60px", overflowY: "auto" }}>
      <button
        onClick={onOpen}
        style={{
          width: 200, padding: "28px 0", borderRadius: 16,
          background: "linear-gradient(135deg, #6c63ff 0%, #8b5cf6 100%)",
          border: "none", color: "#fff", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(108,99,255,0.35)",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", marginBottom: 56,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(108,99,255,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(108,99,255,0.35)"; }}
      >
        <span style={{ fontSize: 42 }}>📂</span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Open PDF</span>
      </button>

      {recent.length > 0 && (
        <div style={{ width: "100%", maxWidth: 800 }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(139,144,184,0.6)" }}>Recent Documents</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {recent.slice(0, 3).map((doc, i) => (
              <div key={i} onClick={() => onOpenRecent(doc.path)}
                style={{ background: "rgba(26,28,48,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.25s ease" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(108,99,255,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e8eaf6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(doc.name || "").replace(/\.pdf$/i, "")}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(139,144,184,0.55)", marginTop: 3 }}>{doc.time ? new Date(doc.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
