import { useEffect, useState } from "react";
import { fetchSuspects, fetchSuspectProfile } from "../api/client";

const FLAG_COLORS = { CRYPTO: "#d29922", FOREIGN: "#4493f8", LONG_CALL: "#f85149", LINK: "#6e7681", SUSPICIOUS: "#f85149", PHONE_IN_TEXT: "#3fb950" };

function SuspectPage() {
  const [suspects, setSuspects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchSuspects().then(setSuspects).catch(() => setSuspects([])); }, []);

  async function loadProfile(number) {
    try {
      setLoading(true); setError(""); setProfile(null);
      const data = await fetchSuspectProfile(number);
      setSelected(number); setProfile(data);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Suspect Profiles</h1>
        <p>Select a contact to view all their activity, flags, and communications</p>
      </header>
      <div className="split-grid">
        <section className="panel">
          <h3>All Contacts ({suspects.length})</h3>
          <div className="suspect-list">
            {suspects.map((s) => (
              <button key={s.number} type="button" className={`suspect-row ${selected === s.number ? "suspect-row-active" : ""}`} onClick={() => loadProfile(s.number)}>
                <span className="suspect-number">{s.number}</span>
                <span className="suspect-meta">{s.totalRecords} records</span>
                <span className="suspect-flags">{s.flags.map((f) => <span key={f} className="flag-badge" style={{ background: FLAG_COLORS[f] || "#6e7681" }}>{f}</span>)}</span>
              </button>
            ))}
            {!suspects.length && <p className="muted">No contacts found. Upload a UFDR file first.</p>}
          </div>
        </section>
        <section className="panel">
          {!selected && !loading && <p className="muted">Select a contact on the left to view their full profile.</p>}
          {loading && <p>Loading profile...</p>}
          {error && <p className="error">{error}</p>}
          {profile && (
            <div>
              <h3>{profile.number}</h3>
              <div className="mini-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1rem" }}>
                <article className="mini-card"><h4>Total Records</h4><h2>{profile.totalRecords}</h2></article>
                <article className="mini-card"><h4>Chats</h4><h2>{profile.chats}</h2></article>
                <article className="mini-card"><h4>Calls</h4><h2>{profile.calls}</h2></article>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {profile.flags.map((f) => <span key={f} className="flag-badge" style={{ background: FLAG_COLORS[f] || "#6e7681" }}>{f}</span>)}
              </div>
              <h4>Top Contacts</h4>
              <div className="edge-list" style={{ marginBottom: "1rem" }}>
                {profile.topContacts.map((c) => (
                  <div key={c.number} className="edge-item"><strong>{c.number}</strong><span>↔</span><small>{c.count} interaction(s)</small></div>
                ))}
              </div>
              <h4>Recent Activity</h4>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Type</th><th>From</th><th>To</th><th>Timestamp</th><th>Flags</th></tr></thead>
                  <tbody>
                    {profile.records.map((row) => (
                      <tr key={row._id}><td>{row.type}</td><td>{row.from}</td><td>{row.to}</td><td>{row.timestamp || "-"}</td><td>{(row.flags || []).join(", ") || "-"}</td></tr>
                    ))}
                    {!profile.records.length && <tr><td colSpan={5}>No records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default SuspectPage;
