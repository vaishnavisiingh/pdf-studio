import { useState } from "react";
import "./PageDecorPanel.css";

export default function PageDecorPanel({ docId, totalPages, onClose, onComplete }) {
  const [tab, setTab]               = useState("pagenum");
  const [position, setPosition]     = useState("bottom-center");
  const [prefix, setPrefix]         = useState("");
  const [startFrom, setStartFrom]   = useState(1);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [includeDate, setIncludeDate] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotateAll, setRotateAll]   = useState(true);
  const [rotatePages, setRotatePages] = useState("");
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState("");

  const handlePageNumbers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/pagedecor/page-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, position, prefix, start_from: startFrom, fontsize: 10 }),
      });
      if (res.ok) { setMessage("Page numbers added!"); onComplete(); }
    } catch { setMessage("Failed."); }
    finally { setLoading(false); }
  };

  const handleHeaderFooter = async () => {
    if (!headerText.trim() && !footerText.trim()) { setMessage("Enter header or footer text."); return; }
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/pagedecor/header-footer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, header_text: headerText, footer_text: footerText, include_date: includeDate, fontsize: 10 }),
      });
      if (res.ok) { setMessage("Header/footer added!"); onComplete(); }
    } catch { setMessage("Failed."); }
    finally { setLoading(false); }
  };

  const handleRotate = async () => {
    setLoading(true);
    let pages = null;
    if (!rotateAll && rotatePages.trim()) {
      pages = rotatePages.split(",").map(n => parseInt(n.trim()) - 1).filter(n => !isNaN(n));
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/rotate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, angle: rotateAngle, pages }),
      });
      if (res.ok) { setMessage("Pages rotated!"); onComplete(); }
    } catch { setMessage("Failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="pd-overlay">
      <div className="pd-panel">
        <div className="pd-header">
          <span>📐 Page Tools</span>
          <button className="pd-close" onClick={onClose}>✕</button>
        </div>

        <div className="pd-tabs">
          {[["pagenum", "# Page Numbers"], ["headfoot", "Header/Footer"], ["rotate", "↻ Rotate"]].map(([id, label]) => (
            <button key={id} className={`pd-tab ${tab === id ? "active" : ""}`} onClick={() => { setTab(id); setMessage(""); }}>{label}</button>
          ))}
        </div>

        <div className="pd-body">
          {tab === "pagenum" && (
            <>
              <div className="pd-field">
                <label>Position</label>
                <select value={position} onChange={e => setPosition(e.target.value)}>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
              <div className="pd-row">
                <div className="pd-field">
                  <label>Prefix (optional)</label>
                  <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="e.g. Page " />
                </div>
                <div className="pd-field">
                  <label>Start From</label>
                  <input type="number" min="1" value={startFrom} onChange={e => setStartFrom(Number(e.target.value))} />
                </div>
              </div>
              <div className="pd-preview">
                Preview: <span className="pd-preview-num">{prefix || ""}{startFrom}</span>
              </div>
            </>
          )}

          {tab === "headfoot" && (
            <>
              <div className="pd-field">
                <label>Header Text</label>
                <input value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="e.g. Pimpri Chinchwad University" />
              </div>
              <div className="pd-field">
                <label>Footer Text</label>
                <input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="e.g. Confidential" />
              </div>
              <div className="pd-check">
                <input type="checkbox" id="incdate" checked={includeDate} onChange={e => setIncludeDate(e.target.checked)} />
                <label htmlFor="incdate">Include today's date</label>
              </div>
            </>
          )}

          {tab === "rotate" && (
            <>
              <div className="pd-field">
                <label>Rotation Angle</label>
                <div className="pd-angle-btns">
                  {[90, 180, 270].map(a => (
                    <button key={a} className={`pd-angle-btn ${rotateAngle === a ? "active" : ""}`} onClick={() => setRotateAngle(a)}>
                      {a}°
                    </button>
                  ))}
                </div>
              </div>
              <div className="pd-check">
                <input type="checkbox" id="rotall" checked={rotateAll} onChange={e => setRotateAll(e.target.checked)} />
                <label htmlFor="rotall">Rotate all pages</label>
              </div>
              {!rotateAll && (
                <div className="pd-field">
                  <label>Page Numbers (e.g. 1,3,5)</label>
                  <input value={rotatePages} onChange={e => setRotatePages(e.target.value)} placeholder="1, 3, 5" />
                </div>
              )}
            </>
          )}

          {message && <div className="pd-message">{message}</div>}
        </div>

        <div className="pd-footer">
          <button className="pd-cancel" onClick={onClose}>Cancel</button>
          <button className="pd-apply" disabled={loading} onClick={tab === "pagenum" ? handlePageNumbers : tab === "headfoot" ? handleHeaderFooter : handleRotate}>
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
