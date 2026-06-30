import { useState, useRef, useEffect } from "react";
import "./SignaturePanel.css";

export default function SignaturePanel({ onClose, onReady }) {
  const [mode, setMode]           = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [color, setColor]         = useState("blue");
  const [fontsize, setFontsize]   = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef(null);
  const lastPos   = useRef(null);

  useEffect(() => { clearCanvas(); }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color === "blue" ? "#00008B" : color === "red" ? "#8B0000" : "#000000";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawing(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const handleReady = () => {
    if (mode === "type") {
      if (!typedName.trim()) return;
      onReady({ mode: "type", name: typedName, color, fontsize });
    } else {
      if (!hasDrawing) return;
      const canvas   = canvasRef.current;
      const imageB64 = canvas.toDataURL("image/png").split(",")[1];
      onReady({ mode: "draw", imageB64, color });
    }
    onClose();
  };

  return (
    <div className="sig-overlay">
      <div className="sig-panel">
        <div className="sig-header">
          <span>✍ Add Signature</span>
          <button className="sig-close" onClick={onClose}>✕</button>
        </div>

        <div className="sig-tabs">
          <button className={`sig-tab ${mode === "draw" ? "active" : ""}`} onClick={() => setMode("draw")}>Draw</button>
          <button className={`sig-tab ${mode === "type" ? "active" : ""}`} onClick={() => setMode("type")}>Type</button>
        </div>

        {mode === "draw" && (
          <div className="sig-draw-area">
            <p className="sig-hint">Draw your signature below</p>
            <canvas
              ref={canvasRef}
              width={380} height={120}
              className="sig-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
            />
            <button className="sig-clear" onClick={clearCanvas}>Clear</button>
          </div>
        )}

        {mode === "type" && (
          <div className="sig-type-area">
            <input
              autoFocus
              className="sig-type-input"
              placeholder="Type your name..."
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
            />
            <div className="sig-preview">
              <span style={{
                fontFamily: "Georgia, serif",
                fontSize: fontsize,
                color: color === "blue" ? "#00008B" : color === "red" ? "#8B0000" : "#000",
                fontStyle: "italic",
              }}>
                {typedName || "Preview"}
              </span>
            </div>
          </div>
        )}

        <div className="sig-options">
          <div className="sig-option">
            <label>Color</label>
            <select value={color} onChange={e => setColor(e.target.value)}>
              <option value="blue">Blue</option>
              <option value="black">Black</option>
              <option value="red">Red</option>
            </select>
          </div>
          {mode === "type" && (
            <div className="sig-option">
              <label>Size</label>
              <input type="number" min="10" max="36" value={fontsize}
                onChange={e => setFontsize(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="sig-footer">
          <p className="sig-note">After clicking below, click anywhere on the PDF to place your signature</p>
          <div className="sig-actions">
            <button className="sig-cancel" onClick={onClose}>Cancel</button>
            <button
              className="sig-insert"
              onClick={handleReady}
              disabled={mode === "draw" ? !hasDrawing : !typedName.trim()}
            >
              Choose Position →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
