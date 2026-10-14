import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Modal from "./Modal";
import { useAuth } from "../context/useAuth";

function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Map path to active page name for UI
  const getActivePageName = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/properties")) return "Properties";
    if (path.startsWith("/floors")) return "Floors";
    if (path.startsWith("/rooms")) return "Rooms";
    if (path.startsWith("/beds")) return "Beds";
    if (path.startsWith("/tenants")) return "Tenants";
    if (path.startsWith("/stays")) return "Stays";
    if (path.startsWith("/rent-dues")) return "Rent Due";
    if (path.startsWith("/payments")) return "Payments";
    return "Dashboard";
  };

  const activePage = getActivePageName();

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // Mock navigation for sidebar until we convert it to Links
  const handleNavigate = (pageName) => {
    const routeMap = {
      "Dashboard": "/",
      "Properties": "/properties",
      "Floors": "/floors",
      "Rooms": "/rooms",
      "Beds": "/beds",
      "Tenants": "/tenants",
      "Stays": "/stays",
      "Rent Due": "/rent-dues",
      "Payments": "/payments"
    };
    if (routeMap[pageName]) {
      navigate(routeMap[pageName]);
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={handleNavigate}
        mobileOpen={mobileSidebarOpen}
        closeMobileSidebar={closeMobileSidebar}
        onOpenOrgModal={() => setIsOrgModalOpen(true)}
      />

      <main className="main-content">
        <Navbar
          activePage={activePage}
          toggleMobileSidebar={toggleMobileSidebar}
          onOpenOrgModal={() => setIsOrgModalOpen(true)}
          user={user}
        />
        <Outlet />
      </main>

      {/* Organization / Admin Profile Modal */}
      <Modal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={`Organization ${user?.organizationId ?? ''}`}
        subtitle={user?.role || 'Organization account'}
        footer={
          <div className="modal-actions-space-between">
            <button
              type="button"
              className="outline-btn"
              onClick={logout}
              style={{ color: '#e53e3e', borderColor: '#fc8181' }}
            >
              Log Out
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => setIsOrgModalOpen(false)}
            >
              Close
            </button>
          </div>
        }
      >
        <div className="org-modal-content">
          <div className="detail-info-list" style={{ marginTop: "18px" }}>
            <div className="detail-info-item">
              <span className="info-label">Organization ID:</span>
              <span className="info-val">{user?.organizationId ?? '—'}</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Admin Name:</span>
              <span className="info-val">{user?.name || '—'}</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Account email:</span>
              <span className="info-val">{user?.email || '—'}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Layout;
