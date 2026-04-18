import { useEffect, useState } from "react";
import { fetchSuspects, fetchSuspectProfile } from "../api/client";

const FLAG_COLORS = { CRYPTO: "#d29922", FOREIGN: "#4493f8", LONG_CALL: "#f85149", LINK: "#6e7681", SUSPICIOUS: "#f85149", PHONE_IN_TEXT: "#3fb950" };

function formatFlag(flag = "") {
  return flag
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatType(type = "") {
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "-";
}

function formatInteractionCount(count) {
  return `${count} interaction${count === 1 ? "" : "s"}`;
}

function SuspectPage() {
  const [suspects, setSuspects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuspects().then(setSuspects).catch(() => setSuspects([]));
  }, []);

  async function loadProfile(number) {
    try {
      setLoading(true);
      setError("");
      setProfile(null);
      const data = await fetchSuspectProfile(number);
      setSelected(number);
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Suspect Profiles</h1>
        <p>Select a contact to view all their activity, flags, and communications</p>
      </header>
      <div className="split-grid suspect-layout">
        <section className="panel">
          <h3>All Contacts ({suspects.length})</h3>
          <div className="suspect-list">
            {suspects.map((suspect) => (
              <button
                key={suspect.number}
                type="button"
                className={`suspect-row ${selected === suspect.number ? "suspect-row-active" : ""}`}
                onClick={() => loadProfile(suspect.number)}
              >
                <span className="suspect-number number-cell">{suspect.number}</span>
                <span className="suspect-meta">{suspect.totalRecords} records</span>
                <span className="suspect-flags">
                  {suspect.flags.map((flag) => (
                    <span key={flag} className="flag-badge" style={{ background: FLAG_COLORS[flag] || "#6e7681" }}>
                      {formatFlag(flag)}
                    </span>
                  ))}
                </span>
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
              <h3 className="number-cell">{profile.number}</h3>
              <div className="mini-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1rem" }}>
                <article className="mini-card"><h4>Total Records</h4><h2>{profile.totalRecords}</h2></article>
                <article className="mini-card"><h4>Chats</h4><h2>{profile.chats}</h2></article>
                <article className="mini-card"><h4>Calls</h4><h2>{profile.calls}</h2></article>
              </div>
              <div className="flag-list">
                {profile.flags.map((flag) => (
                  <span key={flag} className="flag-badge" style={{ background: FLAG_COLORS[flag] || "#6e7681" }}>
                    {formatFlag(flag)}
                  </span>
                ))}
              </div>
              <h4>Top Contacts</h4>
              <div className="edge-list" style={{ marginBottom: "1rem" }}>
                {profile.topContacts.map((contact) => (
                  <div key={contact.number} className="edge-item edge-item-compact">
                    <strong className="number-cell">{contact.number}</strong>
                    <span className="relation-pill">Contact</span>
                    <small>{formatInteractionCount(contact.count)}</small>
                  </div>
                ))}
                {!profile.topContacts.length && <p className="muted">No related contacts found.</p>}
              </div>
              <h4>Recent Activity</h4>
              <div className="table-wrap">
                <table className="suspect-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Timestamp</th>
                      <th>Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.records.map((row) => (
                      <tr key={row._id}>
                        <td>{formatType(row.type)}</td>
                        <td className="number-cell">{row.from || "-"}</td>
                        <td className="number-cell">{row.to || "-"}</td>
                        <td>{row.timestamp || "-"}</td>
                        <td>{(row.flags || []).map(formatFlag).join(", ") || "-"}</td>
                      </tr>
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
