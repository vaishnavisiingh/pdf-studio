import { useState } from "react";
import "./StampPanel.css";

export default function StampPanel({ onClose, onReady }) {
  const [stampText, setStampText]     = useState("APPROVED");
  const [color, setColor]             = useState("red");
  const [includeDate, setIncludeDate] = useState(true);

  const presets = ["APPROVED", "REVIEWED", "GRADED", "REJECTED", "CONFIDENTIAL", "DRAFT"];

  return (
    <div className="stamp-overlay">
      <div className="stamp-panel">
        <div className="stamp-header">
          <span>🔖 Add Stamp</span>
          <button className="stamp-close" onClick={onClose}>✕</button>
        </div>

        <div className="stamp-body">
          <div className="stamp-presets">
            {presets.map(p => (
              <button
                key={p}
                className={`stamp-preset ${stampText === p ? "active" : ""}`}
                onClick={() => setStampText(p)}
              >{p}</button>
            ))}
          </div>

          <div className="stamp-field">
            <label>Custom Text</label>
            <input
              value={stampText}
              onChange={e => setStampText(e.target.value.toUpperCase())}
              placeholder="CUSTOM STAMP"
            />
          </div>

          <div className="stamp-row">
            <div className="stamp-field">
              <label>Color</label>
              <select value={color} onChange={e => setColor(e.target.value)}>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
              </select>
            </div>
            <div className="stamp-field">
              <label>Include Date</label>
              <input
                type="checkbox"
                checked={includeDate}
                onChange={e => setIncludeDate(e.target.checked)}
                style={{ width: "auto", marginTop: 6 }}
              />
            </div>
          </div>

          <div className="stamp-preview">
            <div className="stamp-preview-box" style={{
              color: color === "red" ? "#b30000" : color === "blue" ? "#00008B" : "#006400",
              borderColor: color === "red" ? "#b30000" : color === "blue" ? "#00008B" : "#006400",
            }}>
              <div className="stamp-preview-text">{stampText || "STAMP"}</div>
              {includeDate && (
                <div className="stamp-preview-date">
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stamp-footer">
          <p className="stamp-note">After clicking below, click anywhere on the PDF to place the stamp</p>
          <div className="stamp-actions">
            <button className="stamp-cancel" onClick={onClose}>Cancel</button>
            <button
              className="stamp-insert"
              onClick={() => { onReady({ text: stampText, color, includeDate }); onClose(); }}
              disabled={!stampText.trim()}
            >
              Choose Position →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
