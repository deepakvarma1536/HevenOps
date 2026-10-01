import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Modal from "./components/Modal";
import { organization } from "./data/mockData";

// Pages
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Floors from "./pages/Floors";
import Rooms from "./pages/Rooms";
import Beds from "./pages/Beds";
import Tenants from "./pages/Tenants";
import Stays from "./pages/Stays";
import RentDue from "./pages/RentDue";
import Payments from "./pages/Payments";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "Properties":
        return <Properties onNavigate={setActivePage} />;
      case "Floors":
        return <Floors onNavigate={setActivePage} />;
      case "Rooms":
        return <Rooms onNavigate={setActivePage} />;
      case "Beds":
        return <Beds onNavigate={setActivePage} />;
      case "Tenants":
        return <Tenants onNavigate={setActivePage} />;
      case "Stays":
        return <Stays onNavigate={setActivePage} />;
      case "Rent Due":
        return <RentDue onNavigate={setActivePage} />;
      case "Payments":
        return <Payments onNavigate={setActivePage} />;
      default:
        return (
          <section className="page-content">
            <h2>{activePage}</h2>
            <p>This module is under development.</p>
          </section>
        );
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileSidebarOpen}
        closeMobileSidebar={closeMobileSidebar}
        onOpenOrgModal={() => setIsOrgModalOpen(true)}
      />

      <main className="main-content">
        <Navbar
          activePage={activePage}
          toggleMobileSidebar={toggleMobileSidebar}
          onOpenOrgModal={() => setIsOrgModalOpen(true)}
        />
        {renderPage()}
      </main>

      {/* Organization / Admin Profile Modal */}
      <Modal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={organization.name}
        subtitle={`${organization.type} • ${organization.plan}`}
        footer={
          <div className="modal-actions-right">
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
            <div className="detail-box">
              <span>Managed Properties</span>
              <strong>{organization.totalProperties}</strong>
            </div>
            <div className="detail-box">
              <span>Account Type</span>
              <strong>Admin Owner</strong>
            </div>
            <div className="detail-box">
              <span>Access Level</span>
              <strong>Super Admin</strong>
            </div>
          </div>

          <div className="detail-info-list" style={{ marginTop: "18px" }}>
            <div className="detail-info-item">
              <span className="info-label">Organization Name:</span>
              <span className="info-val"><strong>{organization.name}</strong></span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Support Email:</span>
              <span className="info-val">{organization.supportEmail}</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Current Role:</span>
              <span className="info-val">System Administrator (Full Permissions)</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Database Schema Mode:</span>
              <span className="info-val">Multi-Property PG Tenancy</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;