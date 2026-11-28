import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Modal from "./Modal";
import { staffApi } from '../api/client';
import { loadProperties } from '../api/dataApi';
import useAsyncResource from '../hooks/useAsyncResource';

async function loadAccount(signal) {
  const [response, properties] = await Promise.all([staffApi.get('/organizations', { signal }), loadProperties(signal)]);
  return { organizations: response.data.data || response.data, properties };
}
import { useAuth } from "../context/useAuth";

function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const location = useLocation();
  const { data: account, retry: reloadAccount } = useAsyncResource(loadAccount);
  const { user, logout } = useAuth();
  const organization = account?.organizations?.find((entry) => String(entry.id) === String(user?.organizationId));
  const access = user?.role === 'owner' ? 'All Properties' : 'Assigned Properties';
  const role = user?.role === 'owner' ? 'Owner' : user?.role === 'manager' ? 'Manager' : 'Staff';
  const canManageSpends = user?.role === "owner" || user?.role === "manager";

  // Map path to active page name for UI
  const getActivePageName = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/properties")) return "Properties";
    if (path.startsWith("/floors")) return "Floors";
    if (path.startsWith("/apartments")) return "Apartments";
    if (path.startsWith("/rooms")) return "Rooms";
    if (path.startsWith("/beds")) return "Beds";
    if (path.startsWith("/tenants")) return "Tenants";
    if (path.startsWith("/stays")) return "Stays";
    if (path.startsWith("/rent-dues")) return "Rent Due";
    if (path.startsWith("/payments")) return "Payments";
    if (path.startsWith("/managers")) return "Property Managers";
    if (path.startsWith("/spends")) return "Spends";
    return "Dashboard";
  };

  const activePage = getActivePageName();

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  function openAccount() {
    setIsOrgModalOpen(true);
    void reloadAccount();
  }


  return (
    <div className="app">
      <Sidebar
        user={user}
        organizationName={organization?.name}
        canManageSpends={canManageSpends}
        mobileOpen={mobileSidebarOpen}
        closeMobileSidebar={closeMobileSidebar}
        onOpenOrgModal={openAccount}
      />

      <main className="main-content">
        <Navbar
          activePage={activePage}
          toggleMobileSidebar={toggleMobileSidebar}
          onOpenOrgModal={openAccount}
          user={user}
        />
        <Outlet context={{ canManageSpends }} />
      </main>

      {/* Organization / Admin Profile Modal */}
      <Modal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={organization?.name || "Organization account"}
        subtitle="HevenOps Property Management"
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
          <div className="detail-stat-row">
            {[
              ['Managed Properties', account?.properties?.length ?? '—'],
              ['Account Type', role],
              ['Access Level', access],
            ].map(([label, value]) => <div className="detail-box" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
          <dl className="detail-info-list">
            <div className="detail-info-item"><dt className="info-label">Organization Name</dt><dd className="info-val">{organization?.name || '—'}</dd></div>
            <div className="detail-info-item"><dt className="info-label">Account Name</dt><dd className="info-val">{user?.name || '—'}</dd></div>
            <div className="detail-info-item"><dt className="info-label">Account Email</dt><dd className="info-val">{user?.email || '—'}</dd></div>
          </dl>
          {user?.role === 'owner' && <Link className="outline-btn" to="/managers" onClick={() => setIsOrgModalOpen(false)}>Manage Property Managers</Link>}
        </div>
      </Modal>
    </div>
  );
}

export default Layout;
