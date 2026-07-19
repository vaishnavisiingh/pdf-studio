import { useState, useRef, useEffect } from "react";
import FindReplace from "./FindReplace";
import "./Toolbar.css";

function DropdownMenu({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button className={`tool-btn-text ${open ? "active" : ""}`} onClick={() => setOpen(o => !o)}>
        {label}
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div className="dropdown-menu">
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

function DropItem({ onClick, icon, label, sublabel, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer",
        background: hov ? (danger ? "rgba(248,113,113,0.1)" : "rgba(108,99,255,0.12)") : "transparent",
        textAlign: "left", transition: "background 0.12s ease",
      }}
    >
      {icon && <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: danger ? "#f87171" : "#e8eaf6" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: "#4a4f72", marginTop: 1 }}>{sublabel}</div>}
      </div>
    </button>
  );
}

function DropDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />;
}

export default function Toolbar({ docId, onRefreshPage, activeTool, onToolChange, callbacks = {} }) {
  const [showFontPanel, setShowFontPanel]     = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const [showWatermark, setShowWatermark]     = useState(false);
  const [password, setPassword]       = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [pwdError, setPwdError]       = useState("");
  const [fontName, setFontName]       = useState("Helvetica");
  const [fontSize, setFontSize]       = useState(11);
  const [pageSize, setPageSize]       = useState("A4");
  const [marginTop, setMarginTop]     = useState(1.0);
  const [marginLeft, setMarginLeft]   = useState(1.2);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [repaginLoading, setRepaginLoading] = useState(false);
  const [watermarkText, setWatermarkText]   = useState("DRAFT");
  const [watermarkColor, setWatermarkColor] = useState("gray");

  const editTools = [
    { id: "select",    label: "Select",    icon: "⬚" },
    { id: "text",      label: "Text",      icon: "T" },
    { id: "highlight", label: "Highlight", icon: "▮" },
    { id: "annotate",  label: "Annotate",  icon: "✎" },
    { id: "redact",    label: "Redact",    icon: "█" },
  ];

  const insertTools = [
    { id: "image",    label: "Image",    icon: "🖼" },
    { id: "table",    label: "Table",    icon: "⊞" },
    { id: "equation", label: "Equation", icon: "∑" },
  ];

  const closeAllPanels = () => {
    setShowFontPanel(false);
    setShowFindReplace(false);
    setShowPassword(false);
    setShowWatermark(false);
  };

  const handleExport = async (format) => {
    if (!docId) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/export/${docId}/${format}`);
      if (res.ok) {
        const a = Object.assign(document.createElement("a"), {
          href: URL.createObjectURL(await res.blob()),
          download: `export.${format}`,
        });
        a.click();
      }
    } catch {}
  };

  const handleRepaginate = async () => {
    if (!docId) return;
    setRepaginLoading(true);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/repaginate/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, font_name: fontName, font_size: fontSize, page_size: pageSize, margin_top: marginTop, margin_bottom: marginTop, margin_left: marginLeft, margin_right: marginLeft, line_spacing: lineSpacing, show_page_numbers: true }),
      });
      if (res.ok) {
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: "repaginated.pdf" });
        a.click();
      }
    } catch {}
    finally { setRepaginLoading(false); setShowFontPanel(false); }
  };

  const handleWatermark = async () => {
    if (!docId) return;
    try {
      await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/watermark/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, text: watermarkText, color: watermarkColor }),
      });
      setShowWatermark(false);
      await new Promise(r => setTimeout(r, 800));
      if (onRefreshPage) onRefreshPage();
    } catch {}
  };

  const handleProtect = async () => {
    if (!docId) return;
    setPwdError("");
    if (password !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    if (password.length < 4) { setPwdError("Minimum 4 characters required"); return; }
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/security/protect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, password, confirm_password: confirmPwd }),
      });
      if (res.ok) {
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(await res.blob()), download: "protected.pdf" });
        a.click();
        setShowPassword(false); setPassword(""); setConfirmPwd("");
      }
    } catch { setPwdError("Protection failed"); }
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar">

        {/* Edit tool buttons */}
        <div className="tool-group">
          {editTools.map(tool => (
            <button key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Insert tool buttons */}
        <div className="tool-group">
          {insertTools.map(tool => (
            <button key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* File dropdown */}
        <DropdownMenu label="File">
          {({ close }) => <>
            <DropItem icon="💾" label="Save PDF" sublabel="Download working copy" onClick={() => { callbacks.onSave?.(); close(); }} />
            <DropItem icon="📄" label="Import Word" sublabel=".docx → PDF" onClick={() => { callbacks.onImportDocx?.(); close(); }} />
            <DropItem icon="🖼" label="Images → PDF" sublabel="Combine images into PDF" onClick={() => { callbacks.onImagesToPDF?.(); close(); }} />
            <DropDivider />
            <DropItem icon="↩" label="Undo" onClick={() => { callbacks.onUndo?.(); close(); }} />
            <DropItem icon="↪" label="Redo" onClick={() => { callbacks.onRedo?.(); close(); }} />
            <DropItem icon="⟳" label="Revert to Original" sublabel="Discard all changes" danger onClick={() => { callbacks.onRevert?.(); close(); }} />
          </>}
        </DropdownMenu>

        {/* Edit dropdown */}
        <DropdownMenu label="Edit">
          {({ close }) => <>
            <DropItem icon="🔍" label="Find & Replace" onClick={() => { close(); closeAllPanels(); setShowFindReplace(true); }} />
            <DropItem icon="⟳" label="Re-paginate" sublabel="Change font, margins, layout" onClick={() => { close(); closeAllPanels(); setShowFontPanel(true); }} />
            <DropDivider />
            <DropItem icon="✂" label="Crop & Resize" sublabel="Crop page area or resize" onClick={() => { callbacks.onShowCrop?.(); close(); }} />
            <DropItem icon="📐" label="Page Tools" sublabel="Numbers, headers, footers, rotate" onClick={() => { callbacks.onShowPageDecor?.(); close(); }} />
          </>}
        </DropdownMenu>

        {/* Pages dropdown */}
        <DropdownMenu label="Pages">
          {({ close }) => <>
            <DropItem icon="⊞" label="Extract / Merge / Split" sublabel="Manage PDF pages" onClick={() => { callbacks.onShowPages?.(); close(); }} />
            <DropItem icon="🔍" label="OCR" sublabel="Make scanned PDF searchable" onClick={() => { callbacks.onShowOCR?.(); close(); }} />
          </>}
        </DropdownMenu>

        {/* Export dropdown */}
        <DropdownMenu label="Export">
          {({ close }) => <>
            <DropItem icon="📝" label="Word Document" sublabel=".docx" onClick={() => { handleExport("docx"); close(); }} />
            <DropItem icon="🌐" label="HTML File" sublabel=".html" onClick={() => { handleExport("html"); close(); }} />
            <DropItem icon="📄" label="Plain Text" sublabel=".txt" onClick={() => { handleExport("txt"); close(); }} />
            <DropDivider />
            <DropItem icon="🔄" label="Convert Files" sublabel="PDF↔PNG/JPG, PPT→PDF" onClick={() => { callbacks.onShowConvert?.(); close(); }} />
            <DropItem icon="🗜" label="Compress PDF" sublabel="Reduce file size" onClick={() => { callbacks.onShowCompress?.(); close(); }} />
            <DropItem icon="🕒" label="Version History" sublabel="View and restore previous versions" onClick={() => { callbacks.onShowVersionHistory?.(); close(); }} />
          </>}
        </DropdownMenu>

        {/* Annotate dropdown */}
        <DropdownMenu label="Annotate">
          {({ close }) => <>
            <DropItem icon="🔖" label="Add Stamp" sublabel="APPROVED / REVIEWED / etc." onClick={() => { callbacks.onShowStamp?.(); close(); }} />
            <DropItem icon="✍" label="Add Signature" sublabel="Draw, type or upload image" onClick={() => { callbacks.onShowSignature?.(); close(); }} />
            <DropDivider />
            <DropItem icon="⚠" label="Add Watermark" sublabel="DRAFT / CONFIDENTIAL / etc." onClick={() => { close(); closeAllPanels(); setShowWatermark(true); }} />
          </>}
        </DropdownMenu>

        {/* Security dropdown */}
        <DropdownMenu label="Security">
          {({ close }) => <>
            <DropItem icon="🔒" label="Password Protect" sublabel="AES-256 encrypted PDF" danger onClick={() => { close(); closeAllPanels(); setShowPassword(true); }} />
          </>}
        </DropdownMenu>

        {/* View dropdown */}
        <DropdownMenu label="View">
          {({ close }) => <>
            <DropItem icon="⛶" label="Presentation Mode" sublabel="Full screen, arrow key nav" onClick={() => { callbacks.onShowPresent?.(); close(); }} />
            <DropDivider />
            <DropItem icon="✦" label={callbacks.showAI ? "Close AI Panel" : "Open AI Assistant"} sublabel="Summarize & chat with your PDF" onClick={() => { callbacks.onShowAI?.(); close(); }} />
          </>}
        </DropdownMenu>

      </div>

      {/* ── Panels ── */}
      {showFontPanel && (
        <div className="font-panel">
          <div className="font-panel-title">Re-pagination Settings</div>
          <div className="font-panel-grid">
            <div className="font-field"><label>Font</label>
              <select value={fontName} onChange={e => setFontName(e.target.value)}>
                <option>Helvetica</option><option>Times New Roman</option><option>Courier</option><option>Arial</option>
              </select>
            </div>
            <div className="font-field"><label>Font Size</label>
              <input type="number" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
            </div>
            <div className="font-field"><label>Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)}>
                <option value="A4">A4</option><option value="LETTER">Letter</option>
              </select>
            </div>
            <div className="font-field"><label>Margin (in)</label>
              <input type="number" min="0.5" max="2" step="0.1" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} />
            </div>
            <div className="font-field"><label>Left Margin</label>
              <input type="number" min="0.5" max="2" step="0.1" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} />
            </div>
            <div className="font-field"><label>Line Spacing</label>
              <input type="number" min="1" max="3" step="0.1" value={lineSpacing} onChange={e => setLineSpacing(Number(e.target.value))} />
            </div>
          </div>
          <div className="font-panel-actions">
            <button className="cancel-btn" onClick={() => setShowFontPanel(false)}>Cancel</button>
            <button className="apply-btn" onClick={handleRepaginate} disabled={repaginLoading}>
              {repaginLoading ? "Processing..." : "Apply & Download"}
            </button>
          </div>
        </div>
      )}

      {showPassword && (
        <div className="font-panel">
          <div className="font-panel-title">Password Protect PDF</div>
          <div className="font-panel-grid">
            <div className="font-field"><label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </div>
            <div className="font-field"><label>Confirm Password</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirm password" />
            </div>
          </div>
          {pwdError && <div className="panel-error">{pwdError}</div>}
          <div className="font-panel-actions">
            <button className="cancel-btn" onClick={() => setShowPassword(false)}>Cancel</button>
            <button className="apply-btn" onClick={handleProtect}>Download Protected PDF</button>
          </div>
        </div>
      )}

      {showFindReplace && (
        <FindReplace docId={docId} onClose={() => setShowFindReplace(false)} onRefreshPage={onRefreshPage} />
      )}

      {showWatermark && (
        <div className="font-panel">
          <div className="font-panel-title">Add Watermark</div>
          <div className="font-panel-grid">
            <div className="font-field"><label>Text</label>
              <select value={watermarkText} onChange={e => setWatermarkText(e.target.value)}>
                <option>DRAFT</option><option>CONFIDENTIAL</option><option>SAMPLE</option><option>DO NOT COPY</option>
              </select>
            </div>
            <div className="font-field"><label>Color</label>
              <select value={watermarkColor} onChange={e => setWatermarkColor(e.target.value)}>
                <option value="gray">Gray</option><option value="red">Red</option><option value="blue">Blue</option><option value="green">Green</option>
              </select>
            </div>
          </div>
          <div className="font-panel-actions">
            <button className="cancel-btn" onClick={() => setShowWatermark(false)}>Cancel</button>
            <button className="apply-btn" onClick={handleWatermark}>Apply to All Pages</button>
          </div>
        </div>
      )}
    </div>
  );
}
