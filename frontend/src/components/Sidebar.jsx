import {
  DashboardIcon,
  PropertiesIcon,
  FloorsIcon,
  RoomsIcon,
  BedsIcon,
  TenantsIcon,
  StaysIcon,
  RentDueIcon,
  PaymentsIcon,
} from "./Icons";

function Sidebar({ activePage, setActivePage, mobileOpen, closeMobileSidebar, onOpenOrgModal }) {
  const menuItem = (name, IconComponent) => {
    const isActive = activePage === name;
    return (
      <button
        type="button"
        className={`nav-item ${isActive ? "active" : ""}`}
        onClick={() => {
          setActivePage(name);
          if (closeMobileSidebar) closeMobileSidebar();
        }}
        aria-current={isActive ? "page" : undefined}
        aria-label={`Navigate to ${name}`}
      >
        <span className="nav-icon" aria-hidden="true">
          <IconComponent size={18} />
        </span>
        <span className="nav-text">{name}</span>
      </button>
    );
  };

  const handleOrgKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenOrgModal();
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="Main Navigation"
      >
        <div className="logo">
          <div className="logo-badge" aria-hidden="true">
            <span className="logo-letters">HO</span>
          </div>
          <div className="logo-text">
            <h2>HevenOps</h2>
            <span>Property Management</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard Sections">
          <div className="nav-section">
            <p id="nav-section-main">MAIN</p>
            <div role="group" aria-labelledby="nav-section-main">
              {menuItem("Dashboard", DashboardIcon)}
            </div>
          </div>

          <div className="nav-section">
            <p id="nav-section-property">PROPERTY</p>
            <div role="group" aria-labelledby="nav-section-property">
              {menuItem("Properties", PropertiesIcon)}
              {menuItem("Floors", FloorsIcon)}
              {menuItem("Rooms", RoomsIcon)}
              {menuItem("Beds", BedsIcon)}
            </div>
          </div>

          <div className="nav-section">
            <p id="nav-section-people">PEOPLE</p>
            <div role="group" aria-labelledby="nav-section-people">
              {menuItem("Tenants", TenantsIcon)}
              {menuItem("Stays", StaysIcon)}
            </div>
          </div>

          <div className="nav-section">
            <p id="nav-section-finance">FINANCE</p>
            <div role="group" aria-labelledby="nav-section-finance">
              {menuItem("Rent Due", RentDueIcon)}
              {menuItem("Payments", PaymentsIcon)}
            </div>
          </div>
        </nav>

        <div
          className="sidebar-bottom"
          onClick={onOpenOrgModal}
          onKeyDown={handleOrgKeyDown}
          role="button"
          tabIndex={0}
          title="Click to view Organization details"
          aria-label="View Organization and Administrator details"
        >
          <div className="user-avatar" aria-hidden="true">A</div>
          <div className="user-details">
            <strong>Admin</strong>
            <small>HevenOps Living ⚙</small>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;