import { useState, useEffect, useRef } from "react";
import { BellIcon } from "./Icons";

function Navbar({ activePage, toggleMobileSidebar, onOpenOrgModal }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const notifications = [
    {
      id: 1,
      text: "Rent overdue: Sneha Verma (Room 201, Heaven Heights) - ₹8,500",
      time: "2 hours ago",
      type: "alert",
    },
    {
      id: 2,
      text: "New payment received: Rahul Sharma paid ₹8,500 via UPI",
      time: "4 hours ago",
      type: "success",
    },
    {
      id: 3,
      text: "Bed B4 in Room 104 reserved (Heaven Heights)",
      time: "Yesterday",
      type: "info",
    },
  ];

  // Close notifications dropdown on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        showNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showNotifications) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

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
        <div className="notification-wrapper" ref={notificationRef}>
          <button
            type="button"
            className="notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications, ${notifications.length} unread`}
            aria-expanded={showNotifications}
            aria-haspopup="true"
            title="Notifications"
          >
            <BellIcon size={18} />
            <span className="notification-badge">{notifications.length}</span>
          </button>

          {showNotifications && (
            <div className="notification-dropdown" role="region" aria-label="Notifications panel">
              <div className="dropdown-header">
                <strong>Notifications ({notifications.length})</strong>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications panel"
                >
                  Close
                </button>
              </div>
              <ul className="notification-list" role="list">
                {notifications.map((item) => (
                  <li key={item.id} className={`notification-item ${item.type}`}>
                    <p>{item.text}</p>
                    <small>{item.time}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className="profile"
          onClick={onOpenOrgModal}
          onKeyDown={handleProfileKeyDown}
          role="button"
          tabIndex={0}
          title="Click to view Organization Profile"
          aria-label="Administrator profile: Admin. Click to view organization settings."
        >
          <div className="profile-avatar" aria-hidden="true">A</div>
          <div className="profile-info">
            <strong>Admin</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;