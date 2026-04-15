import { useEffect, useState } from "react";
import { fetchQuerySources, fetchTimeline } from "../api/client";

const FLAG_COLORS = { CRYPTO: "#d29922", FOREIGN: "#4493f8", LONG_CALL: "#f85149", LINK: "#6e7681", SUSPICIOUS: "#f85149", PHONE_IN_TEXT: "#3fb950" };
const TYPE_COLORS = { chat: "#3fb950", call: "#4493f8", contact: "#6e7681" };

function TimelinePage() {
  const [records, setRecords] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourceScope, setSourceScope] = useState("latest");
  const [selectedSourceFile, setSelectedSourceFile] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterFlag, setFilterFlag] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuerySources().then((items) => { setSources(items); if (items[0]?.sourceFile) setSelectedSourceFile(items[0].sourceFile); }).catch(() => setSources([]));
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError("");
        const scope = { sourceScope, sourceFile: sourceScope === "file" ? selectedSourceFile : "" };
        const data = await fetchTimeline(scope);
        setRecords(data.records || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }
    load();
  }, [sourceScope, selectedSourceFile]);

  const filtered = records.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterFlag !== "all" && !(r.flags || []).includes(filterFlag)) return false;
    return true;
  });

  return (
    <section className="page">
      <header className="page-header">
        <h1>Evidence Timeline</h1>
        <p>Chronological view of all communications and events</p>
      </header>
      <section className="panel panel-highlight">
        <div className="formats">
          <label>Scope:<select value={sourceScope} onChange={(e) => setSourceScope(e.target.value)} style={{ marginLeft: "0.5rem" }}><option value="latest">Latest uploaded file</option><option value="file">Specific file</option><option value="all">All records</option></select></label>
          {sourceScope === "file" && <label>File:<select value={selectedSourceFile} onChange={(e) => setSelectedSourceFile(e.target.value)} style={{ marginLeft: "0.5rem" }}>{sources.map((item) => <option key={item.sourceFile} value={item.sourceFile}>{item.sourceFile} ({item.count})</option>)}</select></label>}
          <label>Type:<select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ marginLeft: "0.5rem" }}><option value="all">All</option><option value="chat">Chat</option><option value="call">Call</option><option value="contact">Contact</option></select></label>
          <label>Flag:<select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)} style={{ marginLeft: "0.5rem" }}><option value="all">All</option><option value="CRYPTO">CRYPTO</option><option value="FOREIGN">FOREIGN</option><option value="LONG_CALL">LONG_CALL</option><option value="SUSPICIOUS">SUSPICIOUS</option><option value="LINK">LINK</option></select></label>
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading timeline...</p>}
      {!loading && (
        <section className="panel">
          <p className="muted">{filtered.length} event(s) shown</p>
          <div className="timeline">
            {filtered.map((row, idx) => (
              <div key={row._id || idx} className="timeline-item">
                <div className="timeline-dot" style={{ background: TYPE_COLORS[row.type] || "#6e7681" }} />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-type" style={{ color: TYPE_COLORS[row.type] || "#6e7681" }}>{row.type?.toUpperCase()}</span>
                    <span className="timeline-time">{row.timestamp || row.createdAt || "-"}</span>
                  </div>
                  <p className="timeline-parties"><strong>{row.from || "?"}</strong> → <strong>{row.to || "?"}</strong></p>
                  {row.content && <p className="timeline-content-text">{row.content.slice(0, 120)}</p>}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                    {(row.flags || []).map((f) => <span key={f} className="flag-badge" style={{ background: FLAG_COLORS[f] || "#6e7681" }}>{f}</span>)}
                  </div>
                </div>
              </div>
            ))}
            {!filtered.length && <p className="muted">No records match the current filters.</p>}
          </div>
        </section>
      )}
    </section>
  );
}

export default TimelinePage;
