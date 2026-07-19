import { useState } from "react";
import "./AIPanel.css";

export default function AIPanel({ docId, onClose }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res  = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.summary }]);
    } catch (err) {
      setMessages([{ role: "assistant", content: "Summarization failed." }]);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !docId) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch(`${import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          message: input,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Error. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <span>✨ AI Assistant</span>
        <button className="ai-close" onClick={onClose}>✕</button>
      </div>

      <button
        className="summarize-btn"
        onClick={handleSummarize}
        disabled={summarizing}
      >
        {summarizing ? "Summarizing..." : "⚡ Summarize Document"}
      </button>

      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-placeholder">
            Ask anything about this document, or click Summarize above.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role}`}>
            <div className="ai-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-message assistant">
            <div className="ai-bubble ai-thinking">Thinking...</div>
          </div>
        )}
      </div>

      <div className="ai-input-row">
        <input
          className="ai-input"
          placeholder="Ask about this document..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
        />
        <button className="ai-send" onClick={handleSend} disabled={loading}>
          →
        </button>
      </div>
    </div>
  );
}
