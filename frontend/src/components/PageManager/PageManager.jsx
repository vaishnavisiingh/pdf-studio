import { useState } from "react";
import "./PageManager.css";

export default function PageManager({ docId, totalPages, onClose }) {
  const [tab, setTab]             = useState("extract");
  const [extractInput, setExtractInput] = useState("");
  const [splitInput, setSplitInput]     = useState("");
  const [mergeFiles, setMergeFiles]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");

  const parsePageList = (input, max) => {
    const pages = new Set();
    input.split(",").forEach(part => {
      part = part.trim();
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(n => parseInt(n.trim()) - 1);
        for (let i = a; i <= Math.min(b, max - 1); i++) {
          if (i >= 0) pages.add(i);
        }
      } else {
        const n = parseInt(part) - 1;
        if (n >= 0 && n < max) pages.add(n);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleExtract = async () => {
    if (!extractInput.trim()) return;
    const pages = parsePageList(extractInput, totalPages);
    if (!pages.length) { setMessage("No valid pages entered."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/pages/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, pages }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = "extracted.pdf"; a.click();
        URL.revokeObjectURL(url);
        setMessage(`Extracted ${pages.length} page(s) successfully.`);
      }
    } catch (err) {
      setMessage("Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSplit = async () => {
    if (!splitInput.trim()) return;
    const splitAt = splitInput.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n < totalPages);
    if (!splitAt.length) { setMessage("Enter valid page numbers to split at."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/pages/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, split_at: splitAt }),
      });
      const data = await res.json();
      data.data.forEach((hex, i) => {
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const blob  = new Blob([bytes], { type: "application/pdf" });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement("a");
        a.href = url; a.download = `part_${i + 1}.pdf`; a.click();
        URL.revokeObjectURL(url);
      });
      setMessage(`Split into ${data.parts} file(s).`);
    } catch (err) {
      setMessage("Split failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeFiles.length) return;
    setLoading(true);
    const formData = new FormData();
    mergeFiles.forEach(f => formData.append("files", f));
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/pages/merge`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = "merged.pdf"; a.click();
        URL.revokeObjectURL(url);
        setMessage(`Merged ${mergeFiles.length} PDFs successfully.`);
      }
    } catch (err) {
      setMessage("Merge failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-overlay">
      <div className="pm-panel">
        <div className="pm-header">
          <span>📄 Page Manager</span>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>

        <div className="pm-tabs">
          {["extract", "split", "merge"].map(t => (
            <button key={t} className={`pm-tab ${tab === t ? "active" : ""}`} onClick={() => { setTab(t); setMessage(""); }}>
              {t === "extract" ? "Extract Pages" : t === "split" ? "Split PDF" : "Merge PDFs"}
            </button>
          ))}
        </div>

        <div className="pm-body">
          {tab === "extract" && (
            <>
              <p className="pm-desc">Enter page numbers to extract (e.g. 1,3,5-8). This document has {totalPages} pages.</p>
              <input
                className="pm-input"
                placeholder="e.g. 1, 3, 5-8"
                value={extractInput}
                onChange={e => setExtractInput(e.target.value)}
              />
              <button className="pm-action" onClick={handleExtract} disabled={loading}>
                {loading ? "Extracting..." : "Extract & Download"}
              </button>
            </>
          )}

          {tab === "split" && (
            <>
              <p className="pm-desc">Split this {totalPages}-page PDF by entering page numbers after which to split (e.g. 3,7 splits into 3 parts).</p>
              <input
                className="pm-input"
                placeholder="e.g. 3, 7"
                value={splitInput}
                onChange={e => setSplitInput(e.target.value)}
              />
              <button className="pm-action" onClick={handleSplit} disabled={loading}>
                {loading ? "Splitting..." : "Split & Download Parts"}
              </button>
            </>
          )}

          {tab === "merge" && (
            <>
              <p className="pm-desc">Select multiple PDF files to merge into one document (in the order selected).</p>
              <div
                className="pm-dropzone"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = ".pdf"; input.multiple = true;
                  input.onchange = e => setMergeFiles(Array.from(e.target.files));
                  input.click();
                }}
              >
                {mergeFiles.length > 0
                  ? mergeFiles.map(f => f.name).join(", ")
                  : "Click to select PDF files"}
              </div>
              <button className="pm-action" onClick={handleMerge} disabled={loading || !mergeFiles.length}>
                {loading ? "Merging..." : `Merge ${mergeFiles.length} PDF(s)`}
              </button>
            </>
          )}

          {message && <div className="pm-message">{message}</div>}
        </div>
      </div>
    </div>
  );
}
