import { useState } from "react";
import { uploadUfdr } from "../api/client";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) { setError("Please select an XML, CSV, JSON, or XLS/XLSX UFDR file."); return; }
    try {
      setLoading(true); setError("");
      const data = await uploadUfdr(file);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Upload UFDR File</h1>
        <p>Upload forensic extraction reports for AI-powered analysis</p>
      </header>
      <section className="panel">
        <h3>Select UFDR File</h3>
        <div className="upload-box">
          <input type="file" accept=".xml,.csv,.json,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="button" onClick={handleUpload} disabled={loading}>{loading ? "Processing..." : "Upload & Parse"}</button>
        </div>
        <div className="formats"><span>Supported: XML</span><span>CSV</span><span>JSON</span><span>XLS/XLSX</span></div>
        {error && <p className="error">{error}</p>}
        {result && (
          <div className="notice success">
            <strong>{result.message}</strong>
            <p>{result.fileName} ingested {result.ingested} records.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export default UploadPage;
