import { useState, useEffect, useCallback } from "react";
import { getPage } from "../../api/document";

export default function PresentationMode({ docId, totalPages, startPage, onClose }) {
  const [currentPage, setCurrentPage] = useState(startPage || 0);
  const [pageData, setPageData]       = useState(null);
  const [loading, setLoading]         = useState(false);

  const fetchPage = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const data = await getPage(docId, pageNum, 150);
      setPageData(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [docId]);

  useEffect(() => { fetchPage(currentPage); }, [currentPage]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        setCurrentPage(p => Math.min(p + 1, totalPages - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentPage(p => Math.max(p - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalPages, onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.15)",
          color: "white", border: "none", borderRadius: 8,
          padding: "8px 16px", cursor: "pointer",
          fontSize: 13, fontWeight: 600,
          zIndex: 10000,
        }}
      >
        ✕ Exit (Esc)
      </button>

      {/* Page counter */}
      <div style={{
        position: "absolute", bottom: 24,
        color: "rgba(255,255,255,0.6)",
        fontSize: 13, fontWeight: 500,
        letterSpacing: "0.05em",
      }}>
        {currentPage + 1} / {totalPages}
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
        disabled={currentPage === 0}
        style={{
          position: "absolute", left: 20,
          background: "rgba(255,255,255,0.1)",
          color: "white", border: "none", borderRadius: "50%",
          width: 48, height: 48, fontSize: 20,
          cursor: currentPage === 0 ? "not-allowed" : "pointer",
          opacity: currentPage === 0 ? 0.3 : 0.8,
        }}
      >‹</button>

      <button
        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages - 1))}
        disabled={currentPage === totalPages - 1}
        style={{
          position: "absolute", right: 20,
          background: "rgba(255,255,255,0.1)",
          color: "white", border: "none", borderRadius: "50%",
          width: 48, height: 48, fontSize: 20,
          cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
          opacity: currentPage === totalPages - 1 ? 0.3 : 0.8,
        }}
      >›</button>

      {/* Page */}
      {loading && (
        <div style={{ color: "white", fontSize: 14 }}>Loading...</div>
      )}
      {pageData && !loading && (
        <img
          src={`data:image/png;base64,${pageData.image}`}
          alt={`Page ${currentPage + 1}`}
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            objectFit: "contain",
            boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
            borderRadius: 4,
          }}
        />
      )}
    </div>
  );
}
