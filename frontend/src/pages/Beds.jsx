import { useState } from "react";
import { beds as initialBeds, properties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

function Beds({ onNavigate }) {
  const [bedsList, setBedsList] = useState(initialBeds);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    bedNumber: "",
    roomNumber: "Room 101",
    propertyName: properties[0]?.name || "Heaven Heights",
    floor: "Floor 1",
    status: "Vacant",
    tenant: "",
    rent: 7500,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBed = (e) => {
    e.preventDefault();
    const trimmedBedNo = formData.bedNumber.trim();
    const trimmedRoomNo = formData.roomNumber.trim();
    if (!trimmedBedNo) return;

    const prop = properties.find((p) => p.name === formData.propertyName) || properties[0];

    const newBed = {
      id: `b-${Date.now()}`,
      bedNumber: trimmedBedNo.startsWith("Bed") ? trimmedBedNo : `Bed ${trimmedBedNo}`,
      roomNumber: trimmedRoomNo.startsWith("Room") ? trimmedRoomNo : `Room ${trimmedRoomNo}`,
      roomId: "r-custom",
      propertyId: prop.id,
      propertyName: prop.name,
      floor: formData.floor,
      tenant: formData.tenant.trim() || (formData.status === "Occupied" ? "Assigned Resident" : "—"),
      status: formData.status,
      moveInDate: formData.status === "Occupied" ? "01 Oct 2026" : "—",
      rent: Number(formData.rent) || 7500,
    };

    setBedsList([newBed, ...bedsList]);
    setIsAddModalOpen(false);
    setFormData({
      bedNumber: "",
      roomNumber: "Room 101",
      propertyName: properties[0]?.name || "Heaven Heights",
      floor: "Floor 1",
      status: "Vacant",
      tenant: "",
      rent: 7500,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setPropertyFilter("All");
    setStatusFilter("All");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    propertyFilter !== "All" ||
    statusFilter !== "All";

  // Toggle status for quick testing in modal
  const handleToggleBedStatus = (bedId, newStatus) => {
    setBedsList((prev) =>
      prev.map((b) => (b.id === bedId ? { ...b, status: newStatus } : b))
    );
    if (selectedBed && selectedBed.id === bedId) {
      setSelectedBed((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Metrics
  const totalBedsCount = bedsList.length;
  const occupiedCount = bedsList.filter((b) => b.status === "Occupied").length;
  const vacantCount = bedsList.filter((b) => b.status === "Vacant").length;
  const reservedCount = bedsList.filter((b) => b.status === "Reserved").length;

  // Filtered list
  const filteredBeds = bedsList.filter((b) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      b.bedNumber.toLowerCase().includes(query) ||
      b.roomNumber.toLowerCase().includes(query) ||
      b.tenant.toLowerCase().includes(query) ||
      b.propertyName.toLowerCase().includes(query);
    const matchesProperty =
      propertyFilter === "All" || b.propertyName === propertyFilter;
    const matchesStatus =
      statusFilter === "All" || b.status === statusFilter;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  return (
    <section className="page-content" aria-label="Beds Management">
      <div className="page-header">
        <div>
          <h2>Beds</h2>
          <p>Manage individual bed allocations, vacancies and reservation statuses.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add new bed"
        >
          <PlusIcon size={16} />
          <span>Add Bed</span>
        </button>
      </div>

      {/* Mini Stat Summary */}
      <div className="mini-stats-grid">
        <div className="mini-stat-card theme-forest">
          <span className="stat-label">Total Tracked Beds</span>
          <strong className="stat-value">{totalBedsCount}</strong>
        </div>
        <div className="mini-stat-card theme-green">
          <span className="stat-label">Occupied</span>
          <strong className="stat-value text-success">{occupiedCount}</strong>
        </div>
        <div className="mini-stat-card theme-amber">
          <span className="stat-label">Vacant Available</span>
          <strong className="stat-value text-warning">{vacantCount}</strong>
        </div>
        <div className="mini-stat-card theme-terracotta">
          <span className="stat-label">Reserved / Holding</span>
          <strong className="stat-value text-terracotta">{reservedCount}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="beds-search"
            type="text"
            placeholder="Search bed, room number, or resident name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search beds"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="bed-prop-filter">Property:</label>
          <select
            id="bed-prop-filter"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="bed-status-filter">Status:</label>
          <select
            id="bed-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Occupied">Occupied</option>
            <option value="Vacant">Vacant</option>
            <option value="Reserved">Reserved</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all bed filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredBeds.length} of {bedsList.length} beds</span>
      </div>

      {/* Beds Table */}
      {filteredBeds.length === 0 ? (
        <EmptyState
          title="No beds match your filter"
          message="No bed found for your current search term or filter parameters."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Beds Inventory Table">
              <thead>
                <tr>
                  <th scope="col">Bed Number</th>
                  <th scope="col">Room</th>
                  <th scope="col">Property</th>
                  <th scope="col">Floor</th>
                  <th scope="col">Current Resident</th>
                  <th scope="col">Move-In Date</th>
                  <th scope="col">Monthly Rent</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeds.map((bed) => (
                  <tr key={bed.id}>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => setSelectedBed(bed)}
                        title="View bed details"
                      >
                        {bed.bedNumber}
                      </strong>
                    </td>
                    <td>{bed.roomNumber}</td>
                    <td>{bed.propertyName}</td>
                    <td>{bed.floor}</td>
                    <td>
                      {bed.tenant && bed.tenant !== "—" ? (
                        <strong
                          className="resident-link clickable-text"
                          onClick={() => {
                            if (onNavigate) onNavigate("Tenants");
                          }}
                          title="View resident in Tenants"
                        >
                          {bed.tenant}
                        </strong>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{bed.moveInDate}</td>
                    <td>
                      <strong className="rent-amount">₹{bed.rent?.toLocaleString("en-IN") || "—"}</strong>
                    </td>
                    <td>
                      <StatusBadge status={bed.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setSelectedBed(bed)}
                        aria-label={`View details for ${bed.bedNumber}`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredBeds.length} of {bedsList.length} beds
          </div>
        </div>
      )}

      {/* Add Bed Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Bed"
        subtitle="Register a new bed slot in a specific room"
        footer={
          <div className="modal-actions-right">
            <button
              type="button"
              className="outline-btn"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleAddBed}
            >
              Save Bed
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddBed} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bed-no-input">Bed Identifier *</label>
              <input
                id="bed-no-input"
                type="text"
                name="bedNumber"
                placeholder="e.g. Bed B1 or B4"
                value={formData.bedNumber}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bed-room-no-input">Room Number *</label>
              <input
                id="bed-room-no-input"
                type="text"
                name="roomNumber"
                placeholder="e.g. Room 101"
                value={formData.roomNumber}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bed-property-select">Property</label>
              <select
                id="bed-property-select"
                name="propertyName"
                value={formData.propertyName}
                onChange={handleInputChange}
                className="form-input"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bed-floor-select">Floor</label>
              <select
                id="bed-floor-select"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="Floor 1">Floor 1</option>
                <option value="Floor 2">Floor 2</option>
                <option value="Floor 3">Floor 3</option>
                <option value="Floor 4">Floor 4</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bed-status-select">Initial Status</label>
              <select
                id="bed-status-select"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="Vacant">Vacant</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bed-rent-input">Monthly Rent (₹)</label>
              <input
                id="bed-rent-input"
                type="number"
                name="rent"
                value={formData.rent}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          {formData.status === "Occupied" && (
            <div className="form-group">
              <label htmlFor="bed-tenant-input">Tenant Name</label>
              <input
                id="bed-tenant-input"
                type="text"
                name="tenant"
                placeholder="Resident full name"
                value={formData.tenant}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Bed Details Modal */}
      {selectedBed && (
        <Modal
          isOpen={Boolean(selectedBed)}
          onClose={() => setSelectedBed(null)}
          title={`${selectedBed.bedNumber} — Details`}
          subtitle={`${selectedBed.roomNumber}, ${selectedBed.propertyName} (${selectedBed.floor})`}
          footer={
            <div className="modal-actions-space-between">
              <div className="modal-quick-links">
                {selectedBed.status === "Vacant" && (
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => handleToggleBedStatus(selectedBed.id, "Reserved")}
                  >
                    Mark as Reserved
                  </button>
                )}
                {selectedBed.status === "Reserved" && (
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => handleToggleBedStatus(selectedBed.id, "Vacant")}
                  >
                    Mark as Vacant
                  </button>
                )}
                <button
                  type="button"
                  className="outline-btn link-action-btn"
                  onClick={() => {
                    setSelectedBed(null);
                    if (onNavigate) onNavigate("Tenants");
                  }}
                >
                  <span>View Tenants</span>
                  <ArrowRightIcon size={13} />
                </button>
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedBed(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="bed-modal-body">
            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Bed Status</span>
                <strong><StatusBadge status={selectedBed.status} /></strong>
              </div>
              <div className="detail-box">
                <span>Monthly Rent</span>
                <strong>₹{selectedBed.rent?.toLocaleString("en-IN") || "—"}</strong>
              </div>
              <div className="detail-box">
                <span>Move-in Date</span>
                <strong>{selectedBed.moveInDate}</strong>
              </div>
            </div>

            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Assigned Resident:</span>
                <span className="info-val">
                  <strong>{selectedBed.tenant !== "—" ? selectedBed.tenant : "No resident assigned (Vacant)"}</strong>
                </span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Room Allocation:</span>
                <span className="info-val">{selectedBed.roomNumber} ({selectedBed.floor})</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Premises:</span>
                <span className="info-val">{selectedBed.propertyName}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Beds;
