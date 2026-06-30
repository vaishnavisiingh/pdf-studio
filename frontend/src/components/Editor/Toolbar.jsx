import { useState } from "react";
import FindReplace from "./FindReplace";
import "./Toolbar.css";

export default function Toolbar({ docId, onRefreshPage, activeTool, onToolChange }) {
  const [showFontPanel, setShowFontPanel]     = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const [showWatermark, setShowWatermark]     = useState(false);
  const [password, setPassword]   = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError]   = useState("");
  const [fontName, setFontName]   = useState("Helvetica");
  const [fontSize, setFontSize]   = useState(11);
  const [pageSize, setPageSize]   = useState("A4");
  const [marginTop, setMarginTop] = useState(1.0);
  const [marginLeft, setMarginLeft] = useState(1.2);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [repaginLoading, setRepaginLoading] = useState(false);
  const [watermarkText, setWatermarkText] = useState("DRAFT");
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

  const handleWatermark = async () => {
    if (!docId) return;
    try {
      await fetch("http://127.0.0.1:8000/api/watermark/apply", {
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
      const res = await fetch("http://127.0.0.1:8000/api/security/protect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, password, confirm_password: confirmPwd }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = "protected.pdf"; a.click();
        URL.revokeObjectURL(url);
        setShowPassword(false);
        setPassword(""); setConfirmPwd("");
      }
    } catch { setPwdError("Protection failed"); }
  };

  const handleExport = async (format) => {
    if (!docId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/export/${docId}/${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `export.${format}`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error("Export failed:", err); }
  };

  const handleRepaginate = async () => {
    if (!docId) return;
    setRepaginLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/repaginate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId, font_name: fontName, font_size: fontSize, page_size: pageSize,
          margin_top: marginTop, margin_bottom: marginTop,
          margin_left: marginLeft, margin_right: marginLeft,
          line_spacing: lineSpacing, show_page_numbers: true,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
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
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          {insertTools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button className="tool-btn-text" title="Export as HTML" onClick={() => handleExport("html")}>↓ HTML</button>
          <button className="tool-btn-text" title="Export as Word" onClick={() => handleExport("docx")}>↓ Word</button>
          <button className="tool-btn-text" title="Export as TXT" onClick={() => handleExport("txt")}>↓ TXT</button>
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button
            className={`tool-btn-text ${showFindReplace ? "active" : ""}`}
            onClick={() => { const v = !showFindReplace; closeAllPanels(); setShowFindReplace(v); }}
          >🔍 Find</button>
          <button
            className={`tool-btn-text ${showFontPanel ? "active" : ""}`}
            onClick={() => { const v = !showFontPanel; closeAllPanels(); setShowFontPanel(v); }}
          >⟳ Re-paginate</button>
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button
            className={`tool-btn-text danger ${showWatermark ? "active" : ""}`}
            onClick={() => { const v = !showWatermark; closeAllPanels(); setShowWatermark(v); }}
          >⚠ Watermark</button>
          <button
            className={`tool-btn-text danger ${showPassword ? "active" : ""}`}
            onClick={() => { const v = !showPassword; closeAllPanels(); setShowPassword(v); }}
          >🔒 Protect</button>
        </div>
      </div>

      {showFontPanel && (
        <div className="font-panel">
          <div className="font-panel-title">Re-pagination Settings</div>
          <div className="font-panel-grid">
            <div className="font-field">
              <label>Font</label>
              <select value={fontName} onChange={e => setFontName(e.target.value)}>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier">Courier</option>
                <option value="Arial">Arial</option>
              </select>
            </div>
            <div className="font-field">
              <label>Font Size</label>
              <input type="number" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
            </div>
            <div className="font-field">
              <label>Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)}>
                <option value="A4">A4</option>
                <option value="LETTER">Letter</option>
              </select>
            </div>
            <div className="font-field">
              <label>Margin (in)</label>
              <input type="number" min="0.5" max="2" step="0.1" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} />
            </div>
            <div className="font-field">
              <label>Left Margin</label>
              <input type="number" min="0.5" max="2" step="0.1" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} />
            </div>
            <div className="font-field">
              <label>Line Spacing</label>
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
            <div className="font-field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </div>
            <div className="font-field">
              <label>Confirm Password</label>
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
            <div className="font-field">
              <label>Text</label>
              <select value={watermarkText} onChange={e => setWatermarkText(e.target.value)}>
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="SAMPLE">SAMPLE</option>
                <option value="DO NOT COPY">DO NOT COPY</option>
              </select>
            </div>
            <div className="font-field">
              <label>Color</label>
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
