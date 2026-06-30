import { useState, useEffect, useRef } from "react";
import "./AnnotationLayer.css";

export default function AnnotationLayer({ docId, page, width, height, activeTool, refreshKey }) {
  const [annotations, setAnnotations] = useState([]);
  const [drawing, setDrawing]         = useState(false);
  const [startPos, setStartPos]       = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [showComment, setShowComment] = useState(false);
  const [pendingAnn, setPendingAnn]   = useState(null);
  const [comment, setComment]         = useState("");
  const layerRef = useRef(null);

  const COLORS = {
    highlight: "#FFE066",
    underline: "#2563eb",
    annotate:  "#34d399",
    comment:   "#34d399",
  };

  useEffect(() => {
    if (docId && page !== undefined) fetchAnnotations();
  }, [docId, page, refreshKey]);

  const fetchAnnotations = async () => {
    try {
      const res  = await fetch(`http://127.0.0.1:8000/api/annotations/${docId}/page/${page}`);
      const data = await res.json();
      setAnnotations(data.annotations || []);
    } catch (err) {
      console.error("Failed to fetch annotations:", err);
    }
  };

  const getPos = (e) => {
    const rect = layerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e) => {
    if (!activeTool || !["highlight", "underline", "comment", "annotate"].includes(activeTool)) return;
    e.preventDefault();
    const pos = getPos(e);
    setDrawing(true);
    setStartPos(pos);
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return;
    const pos = getPos(e);
    setCurrentRect({
      x: Math.min(pos.x, startPos.x),
      y: Math.min(pos.y, startPos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = async (e) => {
    if (!drawing) return;
    setDrawing(false);
    if (!currentRect || currentRect.width < 0.5) {
      setCurrentRect(null);
      return;
    }

    const ann = {
      doc_id: docId,
      page,
      type: activeTool,
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.width,
      height: Math.max(currentRect.height, activeTool === "underline" ? 0.5 : 2),
      color: COLORS[activeTool] || "#FFE066",
      comment: "",
      selected_text: "",
    };

    if (activeTool === "comment" || activeTool === "annotate") {
      setPendingAnn(ann);
      setShowComment(true);
    } else {
      await saveAnnotation(ann);
    }
    setCurrentRect(null);
  };

  const saveAnnotation = async (ann) => {
    try {
      const res  = await fetch("http://127.0.0.1:8000/api/annotations/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ann),
      });
      const data = await res.json();
      setAnnotations(prev => [...prev, data]);
    } catch (err) {
      console.error("Failed to save annotation:", err);
    }
  };

  const handleCommentSave = async () => {
    if (!pendingAnn) return;
    await saveAnnotation({ ...pendingAnn, comment });
    setShowComment(false);
    setPendingAnn(null);
    setComment("");
  };

  const deleteAnnotation = async (annId) => {
    try {
      await fetch("http://127.0.0.1:8000/api/annotations/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, annotation_id: annId }),
      });
      setAnnotations(prev => prev.filter(a => a.id !== annId));
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  };

  return (
    <div
      ref={layerRef}
      className="annotation-layer"
      style={{ width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {annotations.map((ann, i) => (
        <div
          key={ann.id || i}
          className={`annotation ann-${ann.type}`}
          style={{
            left:    `${ann.x}%`,
            top:     `${ann.y}%`,
            width:   `${ann.width}%`,
            height:  `${ann.height}%`,
            background: (ann.type === "highlight")
              ? ann.color
              : (ann.type === "annotate" || ann.type === "comment")
              ? "rgba(52, 211, 153, 0.3)"
              : "transparent",
            borderBottom: ann.type === "underline" ? `2px solid ${ann.color}` : "none",
            border: (ann.type === "annotate" || ann.type === "comment")
              ? `2px solid #34d399`
              : "none",
          }}
          title={ann.comment || ann.type}
          onDoubleClick={() => deleteAnnotation(ann.id)}
        >
          {(ann.type === "comment" || ann.type === "annotate") && ann.comment && (
            <div className="comment-bubble">{ann.comment}</div>
          )}
        </div>
      ))}

      {currentRect && (
        <div
          className="annotation-preview"
          style={{
            left:   `${currentRect.x}%`,
            top:    `${currentRect.y}%`,
            width:  `${currentRect.width}%`,
            height: `${currentRect.height}%`,
            background: activeTool === "highlight"
              ? "rgba(255,224,102,0.4)"
              : "rgba(52,211,153,0.3)",
          }}
        />
      )}

      {showComment && (
        <div className="comment-input-popup">
          <div className="comment-input-title">Add Comment</div>
          <textarea
            autoFocus
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Type your comment..."
            rows={3}
          />
          <div className="comment-input-actions">
            <button onClick={() => { setShowComment(false); setCurrentRect(null); }}>Cancel</button>
            <button className="save" onClick={handleCommentSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
