import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
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

function App() {
  const [officer, setOfficer] = useState(() => localStorage.getItem("ufdr_officer") || "");

  if (!officer) {
    return <LoginPage onLogin={(name) => { localStorage.setItem("ufdr_officer", name); setOfficer(name); }} />;
  }

  return (
    <div className="app-shell">
      <Sidebar officer={officer} onLogout={() => { localStorage.removeItem("ufdr_officer"); setOfficer(""); }} />
      <main className="content-shell">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/links" element={<LinkAnalysisPage />} />
          <Route path="/geo" element={<GeoMapPage />} />
          <Route path="/reports" element={<ReportsPage officer={officer} />} />
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
