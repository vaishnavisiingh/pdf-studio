import { useState } from "react";
import "./FindReplace.css";

export default function FindReplace({ docId, onClose, onRefreshPage }) {
  const [findText, setFindText]       = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [replacing, setReplacing]     = useState(false);
  const [message, setMessage]         = useState(null);

  const handleFind = async () => {
    if (!findText.trim() || !docId) return;
    setSearching(true);
    setMessage(null);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/api/search/${docId}?q=${encodeURIComponent(findText)}`);
      const data = await res.json();
      setResults(data.results || []);
      if ((data.results || []).length === 0) setMessage("No matches found.");
    } catch (err) {
      setMessage("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleReplace = async () => {
    if (!findText.trim() || !docId) return;
    setReplacing(true);
    setMessage(null);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/api/search/${docId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ find: findText, replace: replaceText }),
      });
      const data = await res.json();
      setMessage(`Replaced ${data.count} occurrence(s).`);
      setResults([]);
      if (data.count > 0 && onRefreshPage) onRefreshPage();
    } catch (err) {
      setMessage("Replace failed.");
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="find-replace">
      <div className="fr-header">
        <span>Find & Replace</span>
        <button className="fr-close" onClick={onClose}>✕</button>
      </div>

      <div className="fr-row">
        <input
          className="fr-input"
          placeholder="Find..."
          value={findText}
          onChange={e => setFindText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleFind()}
        />
        <button className="fr-btn" onClick={handleFind} disabled={searching}>
          {searching ? "..." : "Find"}
        </button>
      </div>

      <div className="fr-row">
        <input
          className="fr-input"
          placeholder="Replace with..."
          value={replaceText}
          onChange={e => setReplaceText(e.target.value)}
        />
        <button className="fr-btn replace" onClick={handleReplace} disabled={replacing || !results.length}>
          {replacing ? "..." : "Replace All"}
        </button>
      </div>

      {message && <div className="fr-message">{message}</div>}

      {results.length > 0 && (
        <div className="fr-results">
          <div className="fr-results-header">{results.length} match(es) found</div>
          {results.map((r, i) => (
            <div key={i} className="fr-result-item">
              <span className="fr-page">p.{r.page + 1}</span>
              <span className="fr-context">{r.context}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
