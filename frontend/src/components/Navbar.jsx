function Navbar({ activePage, toggleMobileSidebar, onOpenOrgModal, user }) {
  const getPageSubtitle = (page) => {
    switch (page) {
      case "Dashboard":
        return "Welcome back to HevenOps — Overview & live performance metrics";
      case "Properties":
        return "Manage your PG properties, buildings and facility capacities";
      case "Floors":
        return "Inspect property floors, room distribution and bed occupancy";
      case "Rooms":
        return "Monitor room types, pricing, and live bed allocations";
      case "Beds":
        return "Manage individual bed assignments, vacancies and reservations";
      case "Tenants":
        return "Resident directory, contact details and rent collection status";
      case "Stays":
        return "Track tenant stays, lease periods and move-in histories";
      case "Rent Due":
        return "Monitor upcoming, pending and overdue rent receivables";
      case "Payments":
        return "Ledger of rent collections, payment methods and digital receipts";
      default:
        return "HevenOps Property Management System";
    }
  };

  const handleProfileKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenOrgModal();
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={toggleMobileSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div>
          <h1>{activePage}</h1>
          <p>{getPageSubtitle(activePage)}</p>
        </div>
      </div>

      <div className="navbar-right">
        <div
          className="profile"
          onClick={onOpenOrgModal}
          onKeyDown={handleProfileKeyDown}
          role="button"
          tabIndex={0}
          title="Click to view Organization Profile"
          aria-label={`Account profile: ${user?.name || 'User'}. Click to view account settings.`}
        >
          <div className="profile-avatar" aria-hidden="true">{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="profile-info">
            <strong>{user?.name || 'User'}</strong>
            <span>{user?.role || 'Staff'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;