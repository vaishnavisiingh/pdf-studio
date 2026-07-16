import { useState } from "react";

const CONVERSIONS = [
  { id: "pdf-to-png", label: "PDF → PNG", icon: "🖼", desc: "Each page as a PNG image", accept: ".pdf", multi: false },
  { id: "pdf-to-jpg", label: "PDF → JPG", icon: "📸", desc: "Each page as a JPG image", accept: ".pdf", multi: false },
  { id: "ppt-to-pdf", label: "PPT → PDF", icon: "📊", desc: "PowerPoint to PDF", accept: ".ppt,.pptx", multi: false },
  { id: "pdf-to-ppt", label: "PDF → PPT", icon: "📑", desc: "PDF slides to PowerPoint", accept: ".pdf", multi: false },
];

export default function ConvertPanel({ onClose }) {
  const [active, setActive]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dpi, setDpi]         = useState(150);
  const [quality, setQuality] = useState(85);

  const handleConvert = async (conv) => {
    const input    = document.createElement("input");
    input.type     = "file";
    input.accept   = conv.accept;
    input.multiple = conv.multi;

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      setMessage("");
      setActive(conv.id);

      const fd = new FormData();
      fd.append("file", file);

      let url = `http://127.0.0.1:8000/api/convert/${conv.id}`;
      if (conv.id === "pdf-to-png") url += `?dpi=${dpi}`;
      if (conv.id === "pdf-to-jpg") url += `?dpi=${dpi}&quality=${quality}`;

      try {
        const res = await fetch(url, { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json();
          setMessage(`Error: ${err.detail}`);
          return;
        }
        const blob = await res.blob();
        const ext  = conv.id === "pdf-to-ppt" ? "pptx" : conv.id === "pdf-to-png" ? "png"
                   : conv.id === "pdf-to-jpg" ? "jpg"
                   : "pdf";
        const isZip = blob.type === "application/zip";
        const a = Object.assign(document.createElement("a"), {
          href: URL.createObjectURL(blob),
          download: isZip ? "pages.zip" : `converted.${ext}`,
        });
        a.click();
        setMessage(`✓ Converted successfully${isZip ? " — downloaded as zip (multiple pages)" : ""}`);
      } catch {
        setMessage("Conversion failed. Make sure backend is running.");
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{
        background: "rgba(13,14,26,0.98)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
        width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.7)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", display: "flex", justifyContent: "space-between",
          alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(139,92,246,0.08))",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf6" }}>🔄 Convert Files</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b90b8", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Settings */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "#4a4f72", textTransform: "uppercase", letterSpacing: "0.5px" }}>DPI (image quality)</label>
            <select value={dpi} onChange={e => setDpi(Number(e.target.value))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#e8eaf6", padding: "4px 8px", fontSize: 12 }}>
              <option value={72}>72 — Low</option>
              <option value={96}>96 — Medium</option>
              <option value={150}>150 — High</option>
              <option value={300}>300 — Print quality</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "#4a4f72", textTransform: "uppercase", letterSpacing: "0.5px" }}>JPG quality</label>
            <select value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#e8eaf6", padding: "4px 8px", fontSize: 12 }}>
              <option value={95}>95 — Best</option>
              <option value={85}>85 — High</option>
              <option value={65}>65 — Medium</option>
              <option value={45}>45 — Low</option>
            </select>
          </div>
        </div>

        {/* Conversion options */}
        <div style={{ padding: "12px 20px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {CONVERSIONS.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleConvert(conv)}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 10,
                background: active === conv.id && loading
                  ? "rgba(108,99,255,0.15)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${active === conv.id ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.06)"}`,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease", textAlign: "left", width: "100%",
                opacity: loading && active !== conv.id ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(108,99,255,0.1)"; e.currentTarget.style.borderColor = "rgba(108,99,255,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = active === conv.id && loading ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = active === conv.id ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.06)"; }}
            >
              <span style={{ fontSize: 26, flexShrink: 0 }}>{conv.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf6" }}>
                  {conv.label}
                  {active === conv.id && loading && <span style={{ marginLeft: 8, fontSize: 11, color: "#8b90b8" }}>Converting...</span>}
                </div>
                <div style={{ fontSize: 11, color: "#4a4f72", marginTop: 2 }}>{conv.desc}</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 16, color: "#4a4f72" }}>→</span>
            </button>
          ))}
        </div>

        {message && (
          <div style={{
            margin: "8px 20px 16px",
            padding: "10px 14px", borderRadius: 8,
            background: message.startsWith("✓") ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${message.startsWith("✓") ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
            fontSize: 12, color: message.startsWith("✓") ? "#34d399" : "#f87171",
          }}>{message}</div>
        )}

        <div style={{ padding: "0 20px 16px" }}>
          <p style={{ fontSize: 10, color: "#4a4f72", lineHeight: 1.5 }}>
            PPT→PDF requires LibreOffice installed. PDF→image conversions work without any extra software.
          </p>
        </div>
      </div>
    </div>
  );
}
