import { useState, useEffect } from "react";

const STORAGE_KEY = "ufdr_query_history";

export function saveQueryToHistory(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [{ ...entry, id: Date.now() }, ...existing].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_e) { /* ignore */ }
}

function ChatHistoryPage() {
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setHistory(stored);
    } catch (_e) { setHistory([]); }
  }, []);

  function clearHistory() { localStorage.removeItem(STORAGE_KEY); setHistory([]); }
  function toggle(id) { setExpanded((prev) => (prev === id ? null : id)); }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Query History</h1>
        <p>Review all past investigation queries and their AI answers</p>
      </header>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="muted">{history.length} saved queries</p>
          {history.length > 0 && (
            <button type="button" onClick={clearHistory} style={{ marginTop: 0, background: "transparent", color: "#f85149", border: "1px solid #f85149", boxShadow: "none" }}>
              Clear All
            </button>
          )}
        </div>
        {!history.length && <p className="muted">No queries yet. Run a query on the Query Evidence page and it will appear here.</p>}
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <button type="button" className="history-question" onClick={() => toggle(item.id)}>
                <span>{item.question}</span>
                <span className="history-meta">{new Date(item.id).toLocaleString()} · {item.count ?? "?"} records · {item.answerProvider || "rules"}</span>
                <span className="history-chevron">{expanded === item.id ? "▲" : "▼"}</span>
              </button>
              {expanded === item.id && (
                <div className="history-detail">
                  <p><strong>Answer:</strong> {item.answer || "No answer."}</p>
                  <p><strong>Scope:</strong> {item.sourceFile || item.sourceScope || "-"}</p>
                  <p><strong>Records matched:</strong> {item.count}</p>
                  {item.interpreterNote && <p className="error">Note: {item.interpreterNote}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export default ChatHistoryPage;
