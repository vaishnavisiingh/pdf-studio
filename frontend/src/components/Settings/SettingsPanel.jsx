import { useState } from "react";

const DEFAULTS = {
  defaultZoom: 1.0,
  defaultExport: "docx",
  autoOCR: true,
  groqModel: "llama-3.1-8b-instant",
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("pdfstudio_settings") || "{}") };
  } catch { return DEFAULTS; }
}

export function saveSettings(s) {
  localStorage.setItem("pdfstudio_settings", JSON.stringify(s));
}

export default function SettingsPanel({ onClose }) {
  const [s, setS] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" };
  const label = { fontSize: 13, color: "#e8eaf6", fontWeight: 500 };
  const sublabel = { fontSize: 11, color: "#8b90b8", marginTop: 2 };
  const sel = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8eaf6", borderRadius: 7, padding: "6px 10px", fontSize: 12, cursor: "pointer", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
      <div style={{ background: "#0f1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, width: 480, maxHeight: "85vh", boxShadow: "0 25px 90px rgba(0,0,0,0.7)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(108,99,255,0.08)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf6" }}>Settings</div>
            <div style={{ fontSize: 12, color: "#8b90b8" }}>PDF Studio Preferences</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#8b90b8", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: "12px 24px 24px", overflowY: "auto", flex: 1 }}>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#4a4f72", letterSpacing: "0.5px", textTransform: "uppercase", margin: "18px 0 6px" }}>Viewer</div>
          <div style={row}>
            <div>
              <div style={label}>Default Zoom</div>
              <div style={sublabel}>PDF khulte hi zoom level</div>
            </div>
            <select style={sel} value={s.defaultZoom} onChange={e => update("defaultZoom", parseFloat(e.target.value))}>
              <option value={0.75}>75%</option>
              <option value={1.0}>100%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
            </select>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#4a4f72", letterSpacing: "0.5px", textTransform: "uppercase", margin: "22px 0 6px" }}>Export</div>
          <div style={row}>
            <div>
              <div style={label}>Default Export Format</div>
              <div style={sublabel}>Export button ka default format</div>
            </div>
            <select style={sel} value={s.defaultExport} onChange={e => update("defaultExport", e.target.value)}>
              <option value="docx">Word (.docx)</option>
              <option value="txt">Text (.txt)</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#4a4f72", letterSpacing: "0.5px", textTransform: "uppercase", margin: "22px 0 6px" }}>AI</div>
          <div style={row}>
            <div>
              <div style={label}>Groq Model</div>
              <div style={sublabel}>Chat & summarization ke liye</div>
            </div>
            <select style={sel} value={s.groqModel} onChange={e => update("groqModel", e.target.value)}>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
              <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Smart)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#4a4f72", letterSpacing: "0.5px", textTransform: "uppercase", margin: "22px 0 6px" }}>Processing</div>
          <div style={{ ...row, borderBottom: "none" }}>
            <div>
              <div style={label}>Auto OCR on Open</div>
              <div style={sublabel}>Image PDFs par automatic OCR</div>
            </div>
            <div onClick={() => update("autoOCR", !s.autoOCR)} style={{
              width: 46, height: 24, borderRadius: 12, background: s.autoOCR ? "#6c63ff" : "rgba(255,255,255,0.1)",
              position: "relative", cursor: "pointer", transition: "0.25s"
            }}>
              <div style={{
                position: "absolute", top: 2, left: s.autoOCR ? 24 : 2,
                width: 20, height: 20, background: "white", borderRadius: "50%",
                transition: "0.25s", boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
              }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#8b90b8", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: "8px 22px",
            background: saved ? "#34d399" : "#6c63ff",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer"
          }}>
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
