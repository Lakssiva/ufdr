import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import QueryPage from "./pages/QueryPage";
import LinkAnalysisPage from "./pages/LinkAnalysisPage";
import ReportsPage from "./pages/ReportsPage";
import GeoMapPage from "./pages/GeoMapPage";
import SuspectPage from "./pages/SuspectPage";
import TimelinePage from "./pages/TimelinePage";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import { clearStoredSession, fetchCurrentUser, getStoredSession } from "./api/client";

function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getStoredSession()?.token));

  useEffect(() => {
    let alive = true;
    const existing = getStoredSession();
    if (!existing?.token) {
      setCheckingSession(false);
      return undefined;
    }

    fetchCurrentUser()
      .then((nextSession) => {
        if (!alive) return;
        if (nextSession) setSession(nextSession);
      })
      .catch(() => {
        if (!alive) return;
        clearStoredSession();
        setSession(null);
      })
      .finally(() => {
        if (alive) setCheckingSession(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h2>Checking secure session...</h2>
          <small>Please wait while UFDR AI verifies access.</small>
        </div>
      </div>
    );
  }

  if (!session?.token || !session?.user?.officerId) {
    return <LoginPage onLogin={setSession} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        officerId={session.user.officerId}
        onLogout={() => {
          clearStoredSession();
          setSession(null);
        }}
      />
      <main className="content-shell">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/links" element={<LinkAnalysisPage />} />
          <Route path="/geo" element={<GeoMapPage />} />
          <Route path="/reports" element={<ReportsPage officer={session.user.officerId} />} />
          <Route path="/suspects" element={<SuspectPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/history" element={<ChatHistoryPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
