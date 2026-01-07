import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";

export default function Shell({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function onLogout() {
    logout();
    navigate("/login");
  }

  function goToUserView() {
    navigate("/tickets");
    setMobileMenuOpen(false);
  }

  function goToAdminView() {
    navigate("/admin");
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header className="header">
        <div className="headerInner">
          <div className="brand">
            <Link to={user?.is_admin ? "/admin" : "/tickets"}>
              🎟️ Mini Service Desk
            </Link>
            <span className="badge">{user?.is_admin ? "Admin" : "User"}</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="navActions desktopNav">
            {user?.is_admin && (
              <>
                <button className="btn ghost" type="button" onClick={goToUserView}>
                  👤 User View
                </button>
                <button className="btn ghost" type="button" onClick={goToAdminView}>
                  ⚙️ Admin View
                </button>
              </>
            )}
            {user && <span className="badge">{user.email}</span>}
            <button className="btn danger" onClick={onLogout}>
              Logout
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="btn ghost mobileMenuBtn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="mobileNav" onClick={() => setMobileMenuOpen(false)}>
            {user && (
              <div className="mobileNavItem">
                <span className="badge" style={{ width: "100%", justifyContent: "center" }}>
                  {user.email}
                </span>
              </div>
            )}
            {user?.is_admin && (
              <>
                <button className="btn ghost mobileNavItem" type="button" onClick={goToUserView}>
                  👤 User View
                </button>
                <button className="btn ghost mobileNavItem" type="button" onClick={goToAdminView}>
                  ⚙️ Admin View
                </button>
              </>
            )}
            <button className="btn danger mobileNavItem" onClick={onLogout}>
              Logout
            </button>
          </nav>
        )}
      </header>

      <main className="container">
        <div style={{ marginBottom: "24px" }}>
          <h1 className="h1">{title}</h1>
          {subtitle && <div className="h2">{subtitle}</div>}
        </div>

        {children}
      </main>

      <style>{`
        .desktopNav {
          display: flex;
        }
        .mobileMenuBtn {
          display: none;
        }
        .mobileNav {
          display: none;
        }
        
        @media (max-width: 768px) {
          .desktopNav {
            display: none;
          }
          .mobileMenuBtn {
            display: flex;
            font-size: 20px;
          }
          .mobileNav {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            animation: fadeIn 0.2s ease;
          }
          .mobileNavItem {
            width: 100%;
            justify-content: center;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
