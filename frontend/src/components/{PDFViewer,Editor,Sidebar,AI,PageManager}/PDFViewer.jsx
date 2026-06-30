import { useState, useEffect, useCallback } from "react";
import { getPage } from "../../api/document";
import AnnotationLayer from "../Annotations/AnnotationLayer";
import "./PDFViewer.css";

export default function PDFViewer({ docId, totalPages, externalPage, onPageChange, refreshKey, activeTool, pendingSignature, onSignaturePlaced, cropMode, onCropApplied }) {
  const [currentPage, setCurrentPage]         = useState(0);
  const [pageData, setPageData]               = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [zoom, setZoom]                       = useState(1.0);
  const [showTextInput, setShowTextInput]     = useState(false);
  const [textPos, setTextPos]                 = useState({ x: 0, y: 0 });
  const [textValue, setTextValue]             = useState("");
  const [fontSize, setFontSize]               = useState(12);
  const [showTableInput, setShowTableInput]   = useState(false);
  const [showEquationInput, setShowEquationInput] = useState(false);
  const [equationValue, setEquationValue]         = useState("");
  const [redactStart, setRedactStart]   = useState(null);
  const [redactRect, setRedactRect]     = useState(null);
  const [isRedacting, setIsRedacting]   = useState(false);
  const [dragStart, setDragStart]   = useState(null);
  const [dragRect, setDragRect]     = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTool, setDragTool]     = useState(null);
  const [tableRows, setTableRows]   = useState(3);
  const [tableCols, setTableCols]   = useState(3);

  const fetchPage = useCallback(async (pageNum, bust = 0) => {
    setLoading(true);
    try {
      const data = await getPage(docId, pageNum, 150, bust);
      setPageData(data);
    } catch (err) { console.error("Failed to fetch page:", err); }
    finally { setLoading(false); }
  }, [docId]);

  useEffect(() => {
    if (docId) fetchPage(currentPage, refreshKey > 0 ? Date.now() : 0);
  }, [docId, currentPage, refreshKey]);

  useEffect(() => {
    if (externalPage !== undefined && externalPage !== currentPage) {
      setCurrentPage(externalPage);
    }
  }, [externalPage]);

  const goTo = (page) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      if (onPageChange) onPageChange(page);
    }
  };

  const getCoords = (e) => {
    const wrapper = e.currentTarget;
    const img = wrapper?.querySelector("img");
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * (pageData?.dimensions?.width  || 595),
      y: ((e.clientY - rect.top)  / rect.height) * (pageData?.dimensions?.height || 842),
    };
  };

  const isDragTool = (tool) => ["image", "table", "equation"].includes(tool);

  const handleMouseDown = (e) => {
    if (cropMode) {
      const coords = getCoords(e);
      if (!coords) return;
      setDragStart(coords);
      setIsDragging(true);
      setDragRect(null);
      setDragTool("crop");
      return;
    }
    if (activeTool === "redact") {
      const coords = getCoords(e);
      if (!coords) return;
      setRedactStart(coords);
      setIsRedacting(true);
      setRedactRect(null);
      return;
    }
    if (isDragTool(activeTool)) {
      const coords = getCoords(e);
      if (!coords) return;
      setDragStart(coords);
      setIsDragging(true);
      setDragRect(null);
      setDragTool(activeTool);
    }
  };

  const handleMouseMove = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const coords = {
      x: ((e.clientX - rect.left) / rect.width)  * (pageData?.dimensions?.width  || 595),
      y: ((e.clientY - rect.top)  / rect.height) * (pageData?.dimensions?.height || 842),
    };

    if (isRedacting && redactStart) {
      setRedactRect({
        x: Math.min(coords.x, redactStart.x),
        y: Math.min(coords.y, redactStart.y),
        width: Math.abs(coords.x - redactStart.x),
        height: Math.abs(coords.y - redactStart.y),
      });
    }
    if (isDragging && dragStart) {
      setDragRect({
        x: Math.min(coords.x, dragStart.x),
        y: Math.min(coords.y, dragStart.y),
        width: Math.abs(coords.x - dragStart.x),
        height: Math.abs(coords.y - dragStart.y),
      });
    }
  };

  const handleMouseUp = async (e) => {
    if (isRedacting) {
      setIsRedacting(false);
      if (!redactRect || redactRect.width < 5 || redactRect.height < 5) { setRedactRect(null); return; }
      try {
        await fetch("http://127.0.0.1:8000/api/redact/region", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc_id: docId, page: currentPage, x: redactRect.x, y: redactRect.y, width: redactRect.width, height: redactRect.height, color: "black" }),
        });
        setRedactRect(null);
        fetchPage(currentPage, Date.now());
      } catch (err) { console.error("Redact failed:", err); }
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      if (!dragRect || dragRect.width < 10 || dragRect.height < 10) { setDragRect(null); return; }

      if (dragTool === "crop") {
        if (onCropApplied) onCropApplied(dragRect);
        setDragRect(null);
      } else if (dragTool === "image") {
        const input = document.createElement("input");
        input.type  = "file";
        input.accept = "image/*";
        const rect = { ...dragRect };
        input.onchange = async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          try {
            await fetch(`http://127.0.0.1:8000/api/insert/${docId}/image?page=${currentPage}&x=${rect.x}&y=${rect.y}&width=${rect.width}&height=${rect.height}`, { method: "POST", body: formData });
            fetchPage(currentPage, Date.now());
          } catch (err) { console.error("Image insert failed:", err); }
        };
        input.click();
        setDragRect(null);
      } else if (dragTool === "table") {
        setShowTableInput(true);
      } else if (dragTool === "equation") {
        setShowEquationInput(true);
        setEquationValue("");
      }
    }
  };

  const handleClick = (e) => {
    if (pendingSignature) {
      const coords = getCoords(e);
      if (!coords) return;
      if (onSignaturePlaced) onSignaturePlaced(coords.x, coords.y);
      return;
    }
    if (activeTool === "text") {
      const coords = getCoords(e);
      if (!coords) return;
      setTextPos(coords);
      setShowTextInput(true);
      setTextValue("");
    }
  };

  const handleTextInsert = async () => {
    if (!textValue.trim()) { setShowTextInput(false); return; }
    try {
      await fetch(`http://127.0.0.1:8000/api/document/${docId}/insert-text?page=${currentPage}&x=${textPos.x}&y=${textPos.y}&text=${encodeURIComponent(textValue)}&fontsize=${fontSize}`, { method: "POST" });
      setShowTextInput(false);
      fetchPage(currentPage, Date.now());
    } catch (err) { console.error("Insert text failed:", err); }
  };

  const handleTableInsert = async () => {
    if (!dragRect) return;
    const cellW = dragRect.width / tableCols;
    const cellH = dragRect.height / tableRows;
    try {
      await fetch(`http://127.0.0.1:8000/api/document/${docId}/insert-table?page=${currentPage}&x=${dragRect.x}&y=${dragRect.y}&rows=${tableRows}&cols=${tableCols}&cell_width=${cellW}&cell_height=${cellH}`, { method: "POST" });
      setShowTableInput(false);
      setDragRect(null);
      fetchPage(currentPage, Date.now());
    } catch (err) { console.error("Table insert failed:", err); }
  };

  const handleEquationInsert = async () => {
    if (!equationValue.trim() || !dragRect) { setShowEquationInput(false); return; }
    const fontsize = Math.min(dragRect.height * 0.6, 36);
    try {
      await fetch(`http://127.0.0.1:8000/api/document/${docId}/insert-equation?page=${currentPage}&x=${dragRect.x}&y=${dragRect.y + dragRect.height * 0.8}&equation=${encodeURIComponent(equationValue)}&fontsize=${fontsize}`, { method: "POST" });
      setShowEquationInput(false);
      setDragRect(null);
      fetchPage(currentPage, Date.now());
    } catch (err) { console.error("Insert equation failed:", err); }
  };

  const popupStyle = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 1000 };
  const inputStyle = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: "border-box" };
  const btnPrimary   = { padding: "6px 14px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
  const btnSecondary = { padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 };

  const activePreview = (isDragging || isRedacting) && (dragRect || redactRect);
  const previewRect   = dragRect || redactRect;
  const isRedactMode  = activeTool === "redact" || isRedacting;
  const previewColor  = isRedactMode ? "rgba(0,0,0,0.5)" : dragTool === "image" ? "rgba(37,99,235,0.2)" : dragTool === "table" ? "rgba(5,150,105,0.2)" : dragTool === "crop" ? "rgba(124,58,237,0.2)" : "rgba(139,92,246,0.2)";
  const previewBorder = isRedactMode ? "2px solid black" : dragTool === "image" ? "2px solid #2563eb" : dragTool === "table" ? "2px solid #059669" : dragTool === "crop" ? "2px dashed #7c3aed" : "2px solid #7c3aed";

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 0}>← Prev</button>
        <span className="page-info">Page {currentPage + 1} of {totalPages}</span>
        <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages - 1}>Next →</button>
        <div className="zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}>+</button>
          <button onClick={() => setZoom(1.0)}>Reset</button>
        </div>
      </div>

      <div className="pdf-canvas-area">
        {loading && <div className="page-loading"><div className="spinner" /><p>Loading page...</p></div>}
        {pageData && !loading && (
          <div
            className="page-wrapper"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              position: "relative",
              cursor: cropMode ? "crosshair" : pendingSignature ? "crosshair" : activeTool === "text" ? "text" : activeTool === "redact" ? "crosshair" : isDragTool(activeTool) ? "crosshair" : "default",
              userSelect: "none",
            }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img
              src={`data:image/png;base64,${pageData.image}`}
              alt={`Page ${currentPage + 1}`}
              draggable={false}
              style={{ width: pageData.dimensions.width, height: pageData.dimensions.height, display: "block", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: "4px" }}
            />
            {docId && (
              <AnnotationLayer docId={docId} page={currentPage} width="100%" height="100%" activeTool={activeTool} refreshKey={refreshKey} />
            )}

            {activePreview && previewRect && (
              <div style={{
                position: "absolute",
                left: `${(previewRect.x / (pageData?.dimensions?.width || 595)) * 100}%`,
                top: `${(previewRect.y / (pageData?.dimensions?.height || 842)) * 100}%`,
                width: `${(previewRect.width / (pageData?.dimensions?.width || 595)) * 100}%`,
                height: `${(previewRect.height / (pageData?.dimensions?.height || 842)) * 100}%`,
                background: previewColor, border: previewBorder,
                pointerEvents: "none", borderRadius: 2,
              }} />
            )}

            {showTextInput && (
              <div style={{ ...popupStyle, width: 300 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Insert Text</div>
                <input autoFocus value={textValue} onChange={e => setTextValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTextInsert()} placeholder="Type text..." style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "#6b7280" }}>Font Size:</label>
                  <input type="number" min="8" max="72" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: 60, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowTextInput(false)} style={btnSecondary}>Cancel</button>
                  <button onClick={handleTextInsert} style={btnPrimary}>Insert</button>
                </div>
              </div>
            )}

            {showTableInput && (
              <div style={{ ...popupStyle, width: 280 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Insert Table</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{dragRect ? `${Math.round(dragRect.width)} × ${Math.round(dragRect.height)} pts` : ""}</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Rows</label>
                    <input type="number" min="1" max="20" value={tableRows} onChange={e => setTableRows(Number(e.target.value))} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Columns</label>
                    <input type="number" min="1" max="10" value={tableCols} onChange={e => setTableCols(Number(e.target.value))} style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowTableInput(false); setDragRect(null); }} style={btnSecondary}>Cancel</button>
                  <button onClick={handleTableInsert} style={btnPrimary}>Insert</button>
                </div>
              </div>
            )}

            {showEquationInput && (
              <div style={{ ...popupStyle, width: 320 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Insert Equation</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>e.g. E = mc², ∑x², ∫f(x)dx</div>
                <input autoFocus value={equationValue} onChange={e => setEquationValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEquationInsert()} placeholder="E = mc²" style={inputStyle} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowEquationInput(false); setDragRect(null); }} style={btnSecondary}>Cancel</button>
                  <button onClick={handleEquationInsert} style={btnPrimary}>Insert</button>
                </div>
              </div>
            )}
          </div>
        )}
        {!pageData && !loading && <div className="no-page">No page loaded</div>}
      </div>
    </div>
  );
}


