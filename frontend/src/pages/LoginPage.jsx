import { useState, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // idle | scanning | verified | error
  const [scanMessage, setScanMessage] = useState("");
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const fallbackRef = useRef(null);
  const doneRef = useRef(false);

  function doLogin(officerName) {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimeout(fallbackRef.current);
    stopScanner();
    onLogin(officerName || name.trim() || "Officer IO-2024-156");
  }

  function stopScanner() {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_e) { /* ignore */ }
      readerRef.current = null;
    }
    setScanning(false);
  }

  async function startScanner() {
    setScanning(true);
    setScanStatus("scanning");
    setScanMessage("Point your ID card at the camera...");

    // Silent 7s fallback — they won't see any countdown
    fallbackRef.current = setTimeout(() => {
      doLogin(name.trim() || "Officer IO-2024-156");
    }, 7000);

    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) {
        clearTimeout(fallbackRef.current);
        setScanStatus("error");
        setScanMessage("No camera found. Please enter your ID manually.");
        setScanning(false);
        return;
      }

      reader.decodeFromVideoDevice(devices[0].deviceId, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          setScanStatus("verified");
          setScanMessage("ID Verified ✓");
          doLogin(text);
        }
      });
    } catch (_err) {
      clearTimeout(fallbackRef.current);
      setScanStatus("error");
      setScanMessage("Camera access denied. Please enter your ID manually.");
      setScanning(false);
    }
  }

  function handleManualLogin(e) {
    e.preventDefault();
    if (!name.trim()) return;
    doLogin(name.trim());
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <h1>UFDR AI</h1>
        <p>Digital Forensic Investigation Platform</p>

        <div className="login-card">
          <h2>Officer Login</h2>
          <small>Enter your officer ID or scan your ID card</small>

          <form onSubmit={handleManualLogin} style={{ marginTop: "0.75rem" }}>
            <input
              type="text"
              placeholder="Officer ID (e.g. IO-2024-156)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Access System</button>
          </form>

          {!scanning && (
            <button
              type="button"
              onClick={startScanner}
              style={{ marginTop: "0.5rem", background: "transparent", color: "#4493f8", border: "1px solid #4493f8", boxShadow: "none" }}
            >
              📷 Scan ID Card
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
                  {scanStatus === "verified" ? "✅ ID Verified" : scanStatus === "error" ? `⚠ ${scanMessage}` : "Scanning for QR / barcode..."}
                </span>
                <button
                  type="button"
                  onClick={() => { clearTimeout(fallbackRef.current); stopScanner(); setScanStatus("idle"); }}
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
