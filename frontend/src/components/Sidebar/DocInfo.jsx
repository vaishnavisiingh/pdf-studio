import { useState, useEffect } from "react";
import "./DocInfo.css";

export default function DocInfo({ docId }) {
  const [info, setInfo]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (docId) fetchInfo();
  }, [docId]);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/info/${docId}`);
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      console.error("Failed to fetch doc info:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="docinfo-loading">Loading...</div>;
  if (!info)   return null;

  const fields = [
    { label: "File",     value: info.file_name },
    { label: "Title",    value: info.title },
    { label: "Author",   value: info.author },
    { label: "Pages",    value: info.pages },
    { label: "Size",     value: info.file_size },
    { label: "Subject",  value: info.subject },
    { label: "Creator",  value: info.creator },
  ].filter(f => f.value);

  return (
    <div className="docinfo">
      <div className="docinfo-header">Document Info</div>
      <div className="docinfo-fields">
        {fields.map((f, i) => (
          <div key={i} className="docinfo-field">
            <span className="docinfo-label">{f.label}</span>
            <span className="docinfo-value">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
