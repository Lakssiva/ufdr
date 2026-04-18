import { useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { loginOfficer, registerOfficer } from "../api/client";

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  function stopScanner() {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_error) { /* ignore */ }
      readerRef.current = null;
    }
    setScanning(false);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setScanMessage("");
    setScanStatus("idle");
  }

  async function startScanner() {
    setError("");
    setScanning(true);
    setScanStatus("scanning");
    setScanMessage("Point your ID card at the camera to capture your officer ID.");

    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) {
        setScanStatus("error");
        setScanMessage("No camera found. Please enter your ID manually.");
        setScanning(false);
        return;
      }

      reader.decodeFromVideoDevice(devices[0].deviceId, videoRef.current, (result) => {
        if (!result) return;
        setOfficerId(result.getText().trim());
        setScanStatus("verified");
        setScanMessage("ID captured.");
        stopScanner();
      });
    } catch (_error) {
      setScanStatus("error");
      setScanMessage("Camera access denied. Please enter your ID manually.");
      setScanning(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanOfficerId = officerId.trim();
    const cleanName = name.trim();
    if (!cleanOfficerId || !password || (mode === "register" && !cleanName)) {
      setError(mode === "register" ? "Name, officer ID, and password are required." : "Officer ID and password are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const session = mode === "register"
        ? await registerOfficer({ name: cleanName, officerId: cleanOfficerId, password })
        : await loginOfficer(cleanOfficerId, password);
      onLogin(session);
    } catch (err) {
      setError(err?.response?.data?.error || (mode === "register" ? "Unable to create account." : "Unable to sign in with that officer ID."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <h1>UFDR AI</h1>
        <p>Digital Forensic Investigation Platform</p>

        <div className="login-card">
          <div className="auth-switch">
            <button type="button" className={`auth-tab ${mode === "login" ? "auth-tab-active" : ""}`} onClick={() => switchMode("login")}>Login</button>
            <button type="button" className={`auth-tab ${mode === "register" ? "auth-tab-active" : ""}`} onClick={() => switchMode("register")}>Register</button>
          </div>

          <h2>{mode === "login" ? "Officer Login" : "Create Officer Account"}</h2>
          <small>
            {mode === "login"
              ? "Enter your officer ID and password to continue."
              : "Register with your name, officer ID, and password. You can also scan your ID to fill the officer ID field."}
          </small>

          <form onSubmit={handleSubmit} style={{ marginTop: "0.75rem" }}>
            {mode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
            <input
              type="text"
              placeholder="Officer ID (e.g. IO-2024-156)"
              value={officerId}
              onChange={(event) => setOfficerId(event.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="error">{error}</p>}
            {scanMessage && (
              <p className={`notice ${scanStatus === "error" ? "warning" : scanStatus === "verified" ? "success" : ""}`}>
                {scanMessage}
              </p>
            )}
            <button type="submit" disabled={submitting}>
              {submitting ? (mode === "login" ? "Signing In..." : "Creating Account...") : (mode === "login" ? "Login" : "Register")}
            </button>
          </form>

          {!scanning && (
            <button
              type="button"
              onClick={startScanner}
              style={{ marginTop: "0.5rem", background: "transparent", color: "#4493f8", border: "1px solid #4493f8", boxShadow: "none" }}
            >
              Scan ID Card
            </button>
          )}

          {scanning && (
            <div style={{ marginTop: "0.75rem" }}>
              <div className="scan-frame" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #21293a", background: "#0d1117", height: "200px", position: "relative" }}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} autoPlay muted playsInline />
                <div className="scan-guide" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <span style={{ color: "#7d8fa8", fontSize: "0.88rem" }}>
                  {scanStatus === "verified" ? "ID captured" : scanStatus === "error" ? scanMessage : "Scanning for QR / barcode..."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    stopScanner();
                    setScanStatus("idle");
                    setScanMessage("");
                  }}
                  style={{ marginTop: 0, background: "transparent", color: "#7d8fa8", border: "1px solid #30363d", boxShadow: "none", padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
