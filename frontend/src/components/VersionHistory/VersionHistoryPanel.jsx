import { useState, useEffect } from "react";

export default function VersionHistoryPanel({ docId, onClose, onRestore }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [restoring, setRestoring] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/document/${docId}/history`);
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [docId]);

  const handleRestore = async (index) => {
    setRestoring(index);
    try {
      const res = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/document/${docId}/restore/${index}`, { method: "POST" });
      if (res.ok) {
        await fetchHistory();
        if (onRestore) onRestore();
      }
    } catch (e) { console.error(e); }
    finally { setRestoring(null); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 };
  const panel   = { background: "var(--bg-panel)", border: "1px solid var(--border-default)", borderRadius: 12, width: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden" };

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>🕒 Version History</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>Loading history...</div>
          )}
          {!loading && snapshots.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 13 }}>
              No snapshots yet. Make some edits to create version history.
            </div>
          )}
          {!loading && snapshots.map((snap, i) => (
            <div key={snap.index} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", borderRadius: 8, marginBottom: 8,
              background: snap.is_current ? "rgba(108,99,255,0.12)" : "var(--bg-card)",
              border: snap.is_current ? "1px solid rgba(108,99,255,0.35)" : "1px solid var(--border-default)",
              transition: "all 0.15s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: snap.is_current ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {snap.index === 0 ? "��" : "📝"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {snap.label}
                    {snap.is_current && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(108,99,255,0.3)", color: "#c4bfff", padding: "1px 6px", borderRadius: 4 }}>CURRENT</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {snap.timestamp} · {formatSize(snap.size)}
                  </div>
                </div>
              </div>
              {!snap.is_current && (
                <button
                  onClick={() => handleRestore(snap.index)}
                  disabled={restoring === snap.index}
                  style={{
                    height: 28, padding: "0 12px", borderRadius: 6,
                    border: "1px solid var(--border-active)",
                    background: "rgba(108,99,255,0.15)",
                    color: "var(--text-accent)", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  {restoring === snap.index ? "Restoring..." : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border-default)", fontSize: 11, color: "var(--text-muted)" }}>
          💡 Each edit operation creates a new snapshot. Click Restore to go back to any version.
        </div>
      </div>
    </div>
  );
}
