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

export default function SettingsPanel({ onClose, theme, setTheme }) {
  const [s, setS] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" };
  const label = { fontSize: 13, color: "#e8eaf6", fontWeight: 500 };
  const sublabel = { fontSize: 11, color: "#8b90b8", marginTop: 2 };
  const sel = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8eaf6", borderRadius: 7, padding: "6px 10px", fontSize: 12, cursor: "pointer", outline: "none" };
  const sectionTitle = { fontSize: 10, fontWeight: 700, color: "#4a4f72", letterSpacing: "0.1em", textTransform: "uppercase", margin: "20px 0 4px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
      <div style={{ background: "#0f1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, width: 480, maxHeight: "80vh", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(108,99,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8eaf6", letterSpacing: "-0.3px" }}>Settings</div>
            <div style={{ fontSize: 11, color: "#8b90b8", marginTop: 2 }}>PDF Studio Preferences</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#8b90b8", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "8px 24px 24px", overflowY: "auto", flex: 1 }}>

          {/* Appearance */}
          <div style={sectionTitle}>Appearance</div>
          <div style={{ ...row }}>
            <div>
              <div style={label}>Theme</div>
              <div style={sublabel}>Switch between dark and light mode</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["dark", "light"].map(t => (
                <button key={t} onClick={() => setTheme && setTheme(t)} style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  background: (theme || "dark") === t ? "rgba(108,99,255,0.25)" : "transparent",
                  borderColor: (theme || "dark") === t ? "rgba(108,99,255,0.5)" : "rgba(255,255,255,0.08)",
                  color: (theme || "dark") === t ? "#c4bfff" : "#6b7280",
                  transition: "all 0.15s ease",
                }}>
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </div>

          {/* Viewer */}
          <div style={sectionTitle}>Viewer</div>
          <div style={row}>
            <div><div style={label}>Default Zoom</div><div style={sublabel}>Starting zoom level when opening a PDF</div></div>
            <select style={sel} value={s.defaultZoom} onChange={e => update("defaultZoom", parseFloat(e.target.value))}>
              <option value={0.75}>75%</option>
              <option value={1.0}>100%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
            </select>
          </div>

          {/* Export */}
          <div style={sectionTitle}>Export</div>
          <div style={row}>
            <div><div style={label}>Default Export Format</div><div style={sublabel}>Preferred format for exports</div></div>
            <select style={sel} value={s.defaultExport} onChange={e => update("defaultExport", e.target.value)}>
              <option value="docx">Word (.docx)</option>
              <option value="txt">Plain Text (.txt)</option>
              <option value="html">HTML (.html)</option>
            </select>
          </div>

          {/* AI */}
          <div style={sectionTitle}>AI</div>
          <div style={row}>
            <div><div style={label}>Groq Model</div><div style={sublabel}>Model used for chat and summarization</div></div>
            <select style={sel} value={s.groqModel} onChange={e => update("groqModel", e.target.value)}>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
              <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Smart)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>

          {/* Processing */}
          <div style={sectionTitle}>Processing</div>
          <div style={{ ...row, borderBottom: "none" }}>
            <div><div style={label}>Auto OCR on Open</div><div style={sublabel}>Automatically run OCR on image-based PDFs</div></div>
            <div onClick={() => update("autoOCR", !s.autoOCR)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: s.autoOCR ? "#6c63ff" : "rgba(255,255,255,0.08)", border: `1px solid ${s.autoOCR ? "#6c63ff" : "rgba(255,255,255,0.12)"}`, position: "relative", transition: "all 0.2s ease", flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: s.autoOCR ? 22 : 2, transition: "left 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 8, background: "rgba(0,0,0,0.2)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#8b90b8", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 20px", background: saved ? "rgba(52,211,153,0.2)" : "rgba(108,99,255,0.8)", border: `1px solid ${saved ? "rgba(52,211,153,0.4)" : "rgba(108,99,255,0.5)"}`, color: saved ? "#34d399" : "white", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
