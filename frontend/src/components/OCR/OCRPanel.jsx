import { useState, useEffect } from "react";
import "./OCRPanel.css";

export default function OCRPanel({ docId, totalPages, onClose, onComplete }) {
  const [checking, setChecking]   = useState(true);
  const [ocrInfo, setOcrInfo]     = useState(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone]           = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => {
    checkOCR();
  }, []);

  const checkOCR = async () => {
    setChecking(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/ocr/check/${docId}`);
      const data = await res.json();
      setOcrInfo(data);
    } catch (err) {
      setError("Could not check document.");
    } finally {
      setChecking(false);
    }
  };

  const runOCR = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/ocr/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setDone(true);
        onComplete();
      }
    } catch (err) {
      setError("OCR processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="ocr-overlay">
      <div className="ocr-panel">
        <div className="ocr-header">
          <span>🔍 OCR — Make PDF Searchable</span>
          <button className="ocr-close" onClick={onClose}>✕</button>
        </div>

        <div className="ocr-body">
          {checking && (
            <div className="ocr-checking">
              <div className="ocr-spinner" />
              <p>Analyzing document...</p>
            </div>
          )}

          {!checking && ocrInfo && !done && (
            <>
              <div className="ocr-status-box">
                <div className="ocr-stat">
                  <span className="ocr-stat-num">{ocrInfo.total_pages}</span>
                  <span className="ocr-stat-label">Total Pages</span>
                </div>
                <div className="ocr-stat">
                  <span className="ocr-stat-num" style={{ color: ocrInfo.needs_ocr ? "#dc2626" : "#059669" }}>
                    {ocrInfo.pages_need_ocr.length}
                  </span>
                  <span className="ocr-stat-label">Pages Need OCR</span>
                </div>
                <div className="ocr-stat">
                  <span className="ocr-stat-num" style={{ color: "#059669" }}>
                    {ocrInfo.total_pages - ocrInfo.pages_need_ocr.length}
                  </span>
                  <span className="ocr-stat-label">Already Searchable</span>
                </div>
              </div>

              {ocrInfo.needs_ocr ? (
                <>
                  <div className="ocr-info">
                    <p>This document has <strong>{ocrInfo.pages_need_ocr.length} image-only page(s)</strong> that cannot be searched or edited.</p>
                    <p>Running OCR will add an invisible text layer, making all content searchable, editable, and AI-readable — without changing how the document looks.</p>
                  </div>
                  <div className="ocr-warning">
                    ⏱ This may take {Math.max(10, ocrInfo.pages_need_ocr.length * 3)}–{Math.max(20, ocrInfo.pages_need_ocr.length * 6)} seconds depending on document size.
                  </div>
                </>
              ) : (
                <div className="ocr-info ocr-good">
                  ✅ All pages already have searchable text. OCR is not needed for this document.
                </div>
              )}

              {error && <div className="ocr-error">{error}</div>}
            </>
          )}

          {done && result && (
            <div className="ocr-done">
              <div className="ocr-done-icon">✅</div>
              <div className="ocr-done-title">OCR Complete!</div>
              <div className="ocr-done-stats">
                <span>{result.pages_processed} pages processed</span>
                <span>{result.words_added} words extracted</span>
              </div>
              <p className="ocr-done-desc">
                You can now use Find & Replace, AI Chat, and Export on this document.
              </p>
            </div>
          )}
        </div>

        <div className="ocr-footer">
          {!done && ocrInfo?.needs_ocr && (
            <button
              className="ocr-run-btn"
              onClick={runOCR}
              disabled={processing || checking}
            >
              {processing ? (
                <><span className="ocr-btn-spinner" /> Running OCR...</>
              ) : (
                "🔍 Run OCR Now"
              )}
            </button>
          )}
          <button className="ocr-close-btn" onClick={onClose}>
            {done ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
