import { useEffect, useState } from "react";
import { fetchQueryExamples, fetchQuerySources, runQuery } from "../api/client";
import { saveQueryToHistory } from "./ChatHistoryPage";

function highlight(text, flags = []) {
  let output = text || "";
  if (flags.includes("CRYPTO")) output = `[CRYPTO] ${output}`;
  if (flags.includes("FOREIGN")) output = `[FOREIGN] ${output}`;
  return output;
}

function QueryPage() {
  const [question, setQuestion] = useState("");
  const [examples, setExamples] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState([]);
  const [sourceScope, setSourceScope] = useState("latest");
  const [selectedSourceFile, setSelectedSourceFile] = useState("");

  useEffect(() => {
    fetchQueryExamples().then(setExamples).catch(() => setExamples([]));
    fetchQuerySources().then((items) => { setSources(items); if (items[0]?.sourceFile) setSelectedSourceFile(items[0].sourceFile); }).catch(() => setSources([]));
  }, []);

  async function analyze() {
    if (!question.trim()) return;
    try {
      setLoading(true); setError("");
      const data = await runQuery(question, { sourceScope, sourceFile: sourceScope === "file" ? selectedSourceFile : "" });
      setResponse(data);
      saveQueryToHistory(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Natural Language Query</h1>
        <p>Ask questions in plain English and get evidence-grounded answers</p>
      </header>
      <section className="panel">
        <h3>Ask an Investigation Question</h3>
        <div className="formats">
          <label>Query Scope:
            <select value={sourceScope} onChange={(e) => setSourceScope(e.target.value)} style={{ marginLeft: "0.5rem" }}>
              <option value="latest">Latest uploaded file</option>
              <option value="file">Specific file</option>
              <option value="all">All records</option>
            </select>
          </label>
          {sourceScope === "file" && (
            <label>File:
              <select value={selectedSourceFile} onChange={(e) => setSelectedSourceFile(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                {sources.map((item) => <option key={item.sourceFile} value={item.sourceFile}>{item.sourceFile} ({item.count})</option>)}
              </select>
            </label>
          )}
        </div>
        <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What suspicious communications are in this uploaded file?" />
        <button type="button" onClick={analyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze Evidence"}</button>
        <div className="example-grid">
          {examples.map((item) => <button key={item} type="button" className="example-chip" onClick={() => setQuestion(item)}>{item}</button>)}
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {response && (
        <section className="panel">
          <h3>Answer</h3>
          <p>{response.answer || "No answer generated."}</p>
          <p>Answer Engine: <strong>{response.answerProvider || "rules"}</strong></p>
          {response.answerNote && <p className="error">Answer fallback: {response.answerNote}</p>}
          <h3>Evidence Results</h3>
          <p>Interpreter: <strong>{response.interpreter || "rules"}</strong></p>
          {response.interpreterNote && <p className="error">HF fallback: {response.interpreterNote}</p>}
          <p>Data scope: <strong>{response.sourceFile || response.sourceScope}</strong></p>
          <p>{response.summary}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Timestamp</th><th>Content</th><th>Flags</th></tr></thead>
              <tbody>
                {response.results.map((row) => (
                  <tr key={row._id}>
                    <td>{row.type}</td><td>{row.from}</td><td>{row.to}</td>
                    <td>{row.timestamp || "-"}</td>
                    <td>{highlight(row.content, row.flags)}</td>
                    <td>{(row.flags || []).join(", ") || "-"}</td>
                  </tr>
                ))}
                {!response.results.length && <tr><td colSpan={6}>No records matched this query.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}

export default QueryPage;
