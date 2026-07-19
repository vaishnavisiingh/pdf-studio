import { useState } from "react";

export default function CropPanel({ docId, currentPage, totalPages, onClose, onComplete }) {
  const [tab, setTab]             = useState("crop");
  const [applyAll, setApplyAll]   = useState(false);
  const [resizeW, setResizeW]     = useState(595);
  const [resizeH, setResizeH]     = useState(842);
  const [presetSize, setPresetSize] = useState("A4");
  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState("");

  const presets = {
    "A4":     [595, 842],
    "Letter": [612, 792],
    "A3":     [842, 1191],
    "Square": [595, 595],
    "Custom": [resizeW, resizeH],
  };

  const handlePreset = (key) => {
    setPresetSize(key);
    if (key !== "Custom") {
      setResizeW(presets[key][0]);
      setResizeH(presets[key][1]);
    }
  };

  const handleResize = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/crop/resize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, width: resizeW, height: resizeH, apply_to_all: applyAll }),
      });
      if (res.ok) { setMessage("Page resized!"); onComplete(); }
    } catch { setMessage("Failed."); }
    finally { setLoading(false); }
  };

  const handleCropMode = () => {
    onClose();
    onComplete("crop_mode");
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "white", borderRadius: 12, width: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px",
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          color: "white", fontSize: 14, fontWeight: 600,
        }}>
          <span>✂️ Crop & Resize</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
          {[["crop", "✂️ Crop"], ["resize", "⇲ Resize"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "10px 4px", border: "none",
              background: tab === id ? "white" : "#f9fafb",
              fontSize: 12, cursor: "pointer", fontWeight: 500,
              color: tab === id ? "#7c3aed" : "#6b7280",
              borderBottom: tab === id ? "2px solid #7c3aed" : "none",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: 18 }}>
          {tab === "crop" && (
            <>
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 16 }}>
                Drag on the PDF to select the area you want to keep. Everything outside will be cropped.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <input type="checkbox" id="cropall" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} />
                <label htmlFor="cropall" style={{ fontSize: 13, color: "#374151" }}>Apply to all pages</label>
              </div>
              <button
                onClick={handleCropMode}
                style={{
                  width: "100%", padding: "10px",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "white", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                ✂️ Click to Start Cropping
              </button>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, textAlign: "center" }}>
                Panel will close — drag on PDF to select crop area
              </p>
            </>
          )}

          {tab === "resize" && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {Object.keys(presets).map(key => (
                  <button key={key} onClick={() => handlePreset(key)} style={{
                    padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: 20,
                    background: presetSize === key ? "#7c3aed" : "white",
                    color: presetSize === key ? "white" : "#374151",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>{key}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Width (pts)</label>
                  <input type="number" value={resizeW} onChange={e => { setResizeW(Number(e.target.value)); setPresetSize("Custom"); }}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Height (pts)</label>
                  <input type="number" value={resizeH} onChange={e => { setResizeH(Number(e.target.value)); setPresetSize("Custom"); }}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <input type="checkbox" id="resizeall" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} />
                <label htmlFor="resizeall" style={{ fontSize: 13, color: "#374151" }}>Apply to all pages</label>
              </div>

              <div style={{ fontSize: 12, color: "#6b7280", background: "#f9fafb", padding: "8px 12px", borderRadius: 6 }}>
                A4 = 595×842 pts &nbsp;|&nbsp; Letter = 612×792 pts
              </div>
            </>
          )}

          {message && <div style={{ fontSize: 12, color: "#059669", marginTop: 8, fontWeight: 500 }}>{message}</div>}
        </div>

        {tab === "resize" && (
          <div style={{ padding: "12px 18px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "white", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleResize} disabled={loading} style={{ padding: "8px 20px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {loading ? "Resizing..." : "Apply Resize"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
