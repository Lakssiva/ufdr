import { useState, useEffect, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

const AUTO_LOGIN_SECONDS = 7;
const DEFAULT_OFFICER = "Officer IO-2024-156";

function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_LOGIN_SECONDS);
  const [scanStatus, setScanStatus] = useState("idle"); // idle | scanning | verified | error
  const [scanMessage, setScanMessage] = useState("");
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const loggedInRef = useRef(false);

  // Start countdown on mount
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          if (!loggedInRef.current) {
            loggedInRef.current = true;
            onLogin(DEFAULT_OFFICER);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownRef.current);
      stopScanner();
    };
  }, []);

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
    setScanMessage("Point your ID card QR code at the camera...");

    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) {
        setScanStatus("error");
        setScanMessage("No camera found.");
        setScanning(false);
        return;
      }

      const deviceId = devices[0].deviceId;

      reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          const text = result.getText();
          clearInterval(countdownRef.current);
          stopScanner();
          setScanStatus("verified");
          setScanMessage(`ID Verified: ${text}`);
          if (!loggedInRef.current) {
            loggedInRef.current = true;
            setTimeout(() => onLogin(text), 800);
          }
        }
      });
    } catch (err) {
      setScanStatus("error");
      setScanMessage("Camera access denied or unavailable.");
      setScanning(false);
    }
  }

  function handleManualLogin(e) {
    e.preventDefault();
    if (!name.trim()) return;
    clearInterval(countdownRef.current);
    stopScanner();
    if (!loggedInRef.current) {
      loggedInRef.current = true;
      onLogin(name.trim());
    }
  }

  const statusClass = {
    idle: "scan-idle",
    scanning: "scan-scanning",
    verified: "scan-verified",
    error: "scan-error"
  }[scanStatus];

  return (
    <div className="login-screen">
      <div className="login-panel">
        <h1>UFDR AI</h1>
        <p>Digital Forensic Investigation Platform</p>

        <div className="login-card">
          <h2>Officer Authentication</h2>
          <small>Scan your ID card QR code or enter your officer ID manually</small>

          {/* Auto-login countdown */}
          {countdown > 0 && (
            <div className="scan-status scan-scanning" style={{ textAlign: "center", marginTop: "0.5rem" }}>
              Auto-login in <strong>{countdown}s</strong> as {DEFAULT_OFFICER}
            </div>
          )}

          {/* QR Scanner */}
          {!scanning ? (
            <button type="button" onClick={startScanner} style={{ marginTop: "0.75rem" }}>
              📷 Scan ID Card QR Code
            </button>
          ) : (
            <div className="scan-card" style={{ marginTop: "0.75rem" }}>
              <div className="scan-header">
                <span style={{ fontWeight: 600 }}>Scanning...</span>
                <button type="button" className="scan-close" onClick={stopScanner}>Cancel</button>
              </div>
              <div className="scan-frame">
                <video ref={videoRef} className="scan-video" autoPlay muted playsInline />
                <div className="scan-guide" />
              </div>
              <div className={`scan-status ${statusClass}`}>{scanMessage}</div>
            </div>
          )}

          {scanStatus === "verified" && (
            <div className="scan-status scan-verified" style={{ marginTop: "0.5rem" }}>{scanMessage}</div>
          )}
          {scanStatus === "error" && (
            <div className="scan-status scan-error" style={{ marginTop: "0.5rem" }}>{scanMessage}</div>
          )}

          {/* Manual login */}
          <div style={{ borderTop: "1px solid #21293a", marginTop: "1rem", paddingTop: "1rem" }}>
            <small style={{ color: "#7d8fa8" }}>Or enter manually:</small>
            <form onSubmit={handleManualLogin}>
              <input
                type="text"
                placeholder="Officer ID (e.g. IO-2024-156)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ marginTop: "0.5rem" }}
              />
              <button type="submit">Access System</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
