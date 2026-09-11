import { useState, useRef, useEffect } from "react";
import FindReplace from "./FindReplace";
import "./Toolbar.css";

function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="dd-wrap" ref={ref}>
      <button className={`dd-btn ${open ? "active" : ""}`} onClick={() => setOpen(o => !o)}>
        {label} <span className="dd-arrow">▾</span>
      </button>
      {open && <div className="dd-menu" onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

function DropItem({ icon, label, sublabel, onClick, danger }) {
  return (
    <button className={`dd-item ${danger ? "danger" : ""}`} onClick={onClick}>
      <span className="dd-item-icon">{icon}</span>
      <div>
        <div className="dd-item-label">{label}</div>
        {sublabel && <div className="dd-item-sub">{sublabel}</div>}
      </div>
    </button>
  );
}

export default function Toolbar({ docId, onRefreshPage, activeTool, onToolChange, callbacks }) {
  const [showFontPanel, setShowFontPanel]     = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const [showWatermark, setShowWatermark]     = useState(false);
  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError]     = useState("");
  const [fontName, setFontName]     = useState("Helvetica");
  const [fontSize, setFontSize]     = useState(11);
  const [pageSize, setPageSize]     = useState("A4");
  const [marginTop, setMarginTop]   = useState(1.0);
  const [marginLeft, setMarginLeft] = useState(1.2);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [repaginLoading, setRepaginLoading] = useState(false);
  const [watermarkText, setWatermarkText]   = useState("DRAFT");
  const [watermarkColor, setWatermarkColor] = useState("gray");

  const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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

  const handleExport = async (format) => {
    if (!docId) return;
    try {
      const res = await fetch(`${API}/api/export/${docId}/${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `export.${format}`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error("Export failed:", err); }
  };

  const handleWatermark = async () => {
    if (!docId) return;
    try {
      await fetch(`${API}/api/watermark/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, text: watermarkText, color: watermarkColor }),
      });
      setShowWatermark(false);
      await new Promise(r => setTimeout(r, 800));
      if (onRefreshPage) onRefreshPage();
    } catch (err) { console.error("Watermark failed:", err); }
  };

  const handleProtect = async () => {
    if (!docId) return;
    setPwdError("");
    if (password !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    if (password.length < 4) { setPwdError("Minimum 4 characters required"); return; }
    try {
      const res = await fetch(`${API}/api/security/protect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, password, confirm_password: confirmPwd }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "protected.pdf"; a.click();
        URL.revokeObjectURL(url);
        setShowPassword(false); setPassword(""); setConfirmPwd("");
      }
    } catch { setPwdError("Protection failed"); }
  };

  const handleRepaginate = async () => {
    if (!docId) return;
    setRepaginLoading(true);
    try {
      const res = await fetch(`${API}/api/repaginate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId, font_name: fontName, font_size: fontSize,
          page_size: pageSize, margin_top: marginTop, margin_bottom: marginTop,
          margin_left: marginLeft, margin_right: marginLeft,
          line_spacing: lineSpacing, show_page_numbers: true,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "repaginated.pdf"; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error("Repagination failed:", err); }
    finally { setRepaginLoading(false); setShowFontPanel(false); }
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar">
        <div className="tool-group">
          {editTools.map(tool => (
            <button key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}>
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          {insertTools.map(tool => (
            <button key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}>
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <Dropdown label="File">
          <DropItem icon="💾" label="Save PDF" sublabel="Download working copy" onClick={() => callbacks?.onSave?.()} />
          <DropItem icon="📝" label="Word → PDF" sublabel="Import .docx file" onClick={() => callbacks?.onImportDocx?.()} />
          <DropItem icon="🖼" label="Images → PDF" sublabel="Combine images into PDF" onClick={() => callbacks?.onImagesToPDF?.()} />
          <DropItem icon="📊" label="PPT → PDF" sublabel="PowerPoint to PDF" onClick={() => callbacks?.onPptToPdf?.()} />
          <DropItem icon="↩" label="Undo" onClick={() => callbacks?.onUndo?.()} />
          <DropItem icon="↪" label="Redo" onClick={() => callbacks?.onRedo?.()} />
          <DropItem icon="⟳" label="Revert to Original" sublabel="Discard all changes" onClick={() => callbacks?.onRevert?.()} danger />
        </Dropdown>

        <Dropdown label="Edit">
          <DropItem icon="🔍" label="Find & Replace" sublabel="Search and replace text" onClick={() => { setShowFindReplace(v => !v); setShowFontPanel(false); }} />
          <DropItem icon="⟳" label="Re-paginate" sublabel="Change font, margins, page size" onClick={() => { setShowFontPanel(v => !v); setShowFindReplace(false); }} />
        </Dropdown>

        <Dropdown label="Pages">
          <DropItem icon="📋" label="Page Manager" sublabel="Extract, merge, split pages" onClick={() => callbacks?.onShowPages?.()} />
          <DropItem icon="📐" label="Page Tools" sublabel="Numbers, header, footer" onClick={() => callbacks?.onShowPageDecor?.()} />
          <DropItem icon="✂️" label="Crop & Resize" sublabel="Crop or resize pages" onClick={() => callbacks?.onShowCrop?.()} />
        </Dropdown>

        <Dropdown label="Export">
          <DropItem icon="📝" label="Export as Word" sublabel=".docx format" onClick={() => handleExport("docx")} />
          <DropItem icon="📄" label="Export as TXT" sublabel="Plain text format" onClick={() => handleExport("txt")} />
          <DropItem icon="🌐" label="Export as HTML" sublabel="Web format" onClick={() => handleExport("html")} />
          <DropItem icon="🔄" label="Convert Files" sublabel="PDF↔PNG/JPG, PPT→PDF" onClick={() => callbacks?.onShowConvert?.()} />
          <DropItem icon="🗜" label="Compress PDF" sublabel="Reduce file size" onClick={() => callbacks?.onShowCompress?.()} />
        </Dropdown>

        <Dropdown label="Annotate">
          <DropItem icon="✍" label="Signature" sublabel="Draw, type or upload signature" onClick={() => callbacks?.onShowSignature?.()} />
          <DropItem icon="🔖" label="Stamp" sublabel="APPROVED, REVIEWED, GRADED" onClick={() => callbacks?.onShowStamp?.()} />
          <DropItem icon="⚠" label="Watermark" sublabel="Add watermark to all pages" onClick={() => setShowWatermark(v => !v)} />
        </Dropdown>

        <Dropdown label="Security">
          <DropItem icon="🔒" label="Password Protect" sublabel="AES-256 encrypted PDF" onClick={() => { setShowPassword(v => !v); setShowWatermark(false); }} />
        </Dropdown>

        <Dropdown label="View">
          <DropItem icon="⛶" label="Presentation Mode" sublabel="Full screen, arrow key nav" onClick={() => callbacks?.onShowPresent?.()} />
          <DropItem icon="🔍" label="OCR" sublabel="Make scanned PDF searchable" onClick={() => callbacks?.onShowOCR?.()} />
          <DropItem icon="✨" label="AI Assistant" sublabel="Summarize & chat with your PDF" onClick={() => callbacks?.onShowAI?.()} />
        </Dropdown>

      </div>

      {showFontPanel && (
        <div className="font-panel">
          <div className="font-panel-title">Re-pagination Settings</div>
          <div className="font-panel-grid">
            <div className="font-field"><label>Font</label>
              <select value={fontName} onChange={e => setFontName(e.target.value)}>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier">Courier</option>
                <option value="Arial">Arial</option>
              </select>
            </div>
            <div className="font-field"><label>Font Size</label>
              <input type="number" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
            </div>
            <div className="font-field"><label>Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)}>
                <option value="A4">A4</option>
                <option value="LETTER">Letter</option>
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
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="SAMPLE">SAMPLE</option>
                <option value="DO NOT COPY">DO NOT COPY</option>
              </select>
            </div>
            <div className="font-field"><label>Color</label>
              <select value={watermarkColor} onChange={e => setWatermarkColor(e.target.value)}>
                <option value="gray">Gray</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
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
