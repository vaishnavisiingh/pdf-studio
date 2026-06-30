import { useState, useEffect } from "react";
import { getPage } from "../../api/document";
import "./Sidebar.css";
import DocInfo from "./DocInfo";

export default function Sidebar({ docId, totalPages, currentPage, onPageSelect }) {
  const [thumbnails, setThumbnails] = useState({});
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!docId || !totalPages) return;
    loadThumbnails();
  }, [docId, totalPages]);

  const loadThumbnails = async () => {
    setLoading(true);
    for (let i = 0; i < totalPages; i++) {
      try {
        const data = await getPage(docId, i, 72);
        setThumbnails(prev => ({ ...prev, [i]: data.image }));
      } catch (err) {
        console.error("Thumbnail failed for page", i);
      }
    }
    setLoading(false);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>Pages</span>
        <span className="page-count">{totalPages}</span>
      </div>
      <div className="thumbnail-list">
        {Array.from({ length: totalPages }, (_, i) => (
          <div
            key={i}
            className={`thumbnail-item ${currentPage === i ? "active" : ""}`}
            onClick={() => onPageSelect(i)}
          >
            {thumbnails[i] ? (
              <img
                src={`data:image/png;base64,${thumbnails[i]}`}
                alt={`Page ${i + 1}`}
                className="thumbnail-img"
              />
            ) : (
              <div className="thumbnail-placeholder">
                <div className="thumb-spinner" />
              </div>
            )}
            <span className="thumbnail-label">{i + 1}</span>
          </div>
        ))}
      </div>
      <DocInfo docId={docId} />
    </div>
  );
}
