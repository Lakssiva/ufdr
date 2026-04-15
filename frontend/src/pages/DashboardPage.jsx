import { useEffect, useState } from "react";
import { fetchDashboard, generateAiSummary } from "../api/client";
import StatCard from "../components/StatCard";

function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function loadDashboard() {
    setLoading(true); setError("");
    try {
      const result = await fetchDashboard();
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Network error");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function handleAiSummary() {
    try {
      setAiLoading(true); setAiError(""); setAiSummary("");
      const result = await generateAiSummary();
      setAiSummary(result.summary || "No summary generated.");
    } catch (err) {
      setAiError(err.response?.data?.error || err.message);
    } finally { setAiLoading(false); }
  }

  if (error) return (
    <section className="page">
      <p className="error">Failed to load dashboard: {error}</p>
      <button type="button" onClick={loadDashboard}>Retry</button>
    </section>
  );
  if (loading && !data) return <p>Loading dashboard...</p>;

  const metrics = data?.metrics || {};

  return (
    <section className="page">
      <header className="page-header">
        <h1>Investigation Dashboard</h1>
        <p>Overview of digital forensic evidence and alerts</p>
      </header>
      {data?.isDemoData && <div className="notice warning">Dashboard is currently showing seeded demo data.</div>}
      <div className="card-grid">
        <StatCard title="Total Records" value={metrics.totalRecords || 0} subtitle="Extracted from UFDR" />
        <StatCard title="Total Chats" value={metrics.totalChats || 0} subtitle="WhatsApp, Telegram, Signal" />
        <StatCard title="Foreign Communications" value={metrics.foreignCount || 0} subtitle="International numbers detected" tone="blue" />
        <StatCard title="Crypto-Flagged Evidence" value={metrics.cryptoCount || 0} subtitle="Wallet/crypto references" tone="amber" />
        <StatCard title="Long Calls" value={metrics.longCalls || 0} subtitle="Calls above 10 minutes" tone="red" />
        <StatCard title="Unique Contacts" value={metrics.uniqueFromContacts || 0} subtitle="Distinct source numbers" tone="green" />
      </div>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>AI Case Summary</h3>
          <button type="button" onClick={handleAiSummary} disabled={aiLoading} style={{ marginTop: 0 }}>
            {aiLoading ? "Summarizing..." : "Summarize This Case"}
          </button>
        </div>
        {aiError && <p className="error">{aiError}</p>}
        {aiSummary && <p style={{ marginTop: "0.75rem", lineHeight: 1.7 }}>{aiSummary}</p>}
        {!aiSummary && !aiLoading && !aiError && <p className="muted">Click the button to generate an AI-powered summary of all flagged evidence.</p>}
      </section>
      <section className="panel">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {(data?.recentActivity || []).map((item) => (
            <div className="activity-item" key={item.id}>
              <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              <span>{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          ))}
          {!data?.recentActivity?.length && <p>No records yet. Upload UFDR to begin.</p>}
        </div>
      </section>
    </section>
  );
}

export default DashboardPage;
