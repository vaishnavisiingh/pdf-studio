import { useState } from "react";

export default function CompressPanel({ docId, onClose, onComplete }) {
  const [quality, setQuality] = useState(60);
  const [deflate, setDeflate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleCompress = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/compress/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, quality, deflate }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (onComplete) onComplete();
      } else {
        setError(data.detail || "Compression failed");
      }
    } catch (e) {
      setError("Compression failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 };
  const panel   = { background: "var(--bg-panel)", border: "1px solid var(--border-default)", borderRadius: 12, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden" };
  const header  = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-default)" };
  const body    = { padding: 18 };
  const label   = { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" };
  const footer  = { padding: "12px 18px", borderTop: "1px solid var(--border-default)", display: "flex", gap: 8, justifyContent: "flex-end" };

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={header}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>🗜 Compress PDF</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={body}>
          <label style={label}>Image Quality: {quality}%</label>
          <input
            type="range" min="10" max="95" value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            style={{ width: "100%", marginBottom: 6, accentColor: "var(--accent-primary)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>
            <span>Smaller file</span><span>Better quality</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <input type="checkbox" id="deflate" checked={deflate} onChange={e => setDeflate(e.target.checked)} style={{ accentColor: "var(--accent-primary)" }} />
            <label htmlFor="deflate" style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              Enable stream compression (recommended)
            </label>
          </div>

          <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            💡 Compression removes redundant data and reduces image quality. Use lower quality for smaller files.
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>{error}</div>}

          {result && (
            <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginBottom: 6 }}>✓ Compression Complete</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Original: {formatSize(result.original_size)}</span>
                <span>Compressed: {formatSize(result.new_size)}</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>Saved: {formatSize(result.saved_bytes)} ({result.reduction_pct}% smaller)</span>
              </div>
            </div>
          )}
        </div>

        <div style={footer}>
          <button onClick={onClose} style={{ height: 32, padding: "0 16px", borderRadius: 7, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button onClick={handleCompress} disabled={loading} style={{ height: 32, padding: "0 20px", borderRadius: 7, border: "none", background: "var(--accent-primary)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {loading ? "Compressing..." : "Compress PDF"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
