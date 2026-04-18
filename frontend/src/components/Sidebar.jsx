import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload UFDR" },
  { to: "/query", label: "Query Evidence" },
  { to: "/links", label: "Link Analysis" },
  { to: "/geo", label: "Geolocation" },
  { to: "/reports", label: "Reports" },
  { to: "/suspects", label: "Suspect Profiles" },
  { to: "/timeline", label: "Timeline" },
  { to: "/history", label: "Query History" }
];

function Sidebar({ officerId, onLogout }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-badge">U</div>
          <div>
            <h1>UFDR Assistant</h1>
            <p>Forensic Analysis</p>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <p>Active Officer</p>
        <h3>{officerId}</h3>
        <button type="button" className="logout-btn" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
}

export default Sidebar;
