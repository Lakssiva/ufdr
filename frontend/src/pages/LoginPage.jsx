import { useState } from "react";

function LoginPage({ onLogin }) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <h1>UFDR AI</h1>
        <p>Digital Forensic Investigation Platform</p>
        <div className="login-card">
          <h2>Officer Login</h2>
          <small>Enter your officer ID to begin investigation</small>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Officer ID (e.g. IO-2024-156)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Access System</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
