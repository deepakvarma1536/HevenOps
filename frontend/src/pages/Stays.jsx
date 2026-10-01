import { useState } from "react";
import { stays as initialStays, properties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

function Stays({ onNavigate }) {
  const [staysList, setStaysList] = useState(initialStays);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStay, setSelectedStay] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tenant: "",
    property: properties[0]?.name || "Heaven Heights",
    room: "Room 101",
    bed: "Bed B1",
    moveInDate: "01 Oct 2026",
    moveOutDate: "Ongoing",
    status: "Active",
    monthlyRent: 8500,
    deposit: 17000,
    agreementPeriod: "11 Months",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStay = (e) => {
    e.preventDefault();
    const trimmedTenant = formData.tenant.trim();
    if (!trimmedTenant) return;

    const prop = properties.find((p) => p.name === formData.property) || properties[0];

    const newStay = {
      id: `stay-${Date.now()}`,
      tenantId: `t-${Date.now()}`,
      tenant: trimmedTenant,
      phone: "+91 98765 00000",
      property: prop.name,
      propertyId: prop.id,
      room: formData.room.trim().startsWith("Room") ? formData.room.trim() : `Room ${formData.room.trim()}`,
      bed: formData.bed.trim().startsWith("Bed") ? formData.bed.trim() : `Bed ${formData.bed.trim()}`,
      moveInDate: formData.moveInDate.trim() || "01 Oct 2026",
      moveOutDate: formData.moveOutDate.trim() || "Ongoing",
      status: formData.status,
      monthlyRent: Number(formData.monthlyRent) || 8500,
      deposit: Number(formData.deposit) || 17000,
      agreementPeriod: formData.agreementPeriod.trim() || "11 Months",
    };

    setStaysList([newStay, ...staysList]);
    setIsAddModalOpen(false);
    setFormData({
      tenant: "",
      property: properties[0]?.name || "Heaven Heights",
      room: "Room 101",
      bed: "Bed B1",
      moveInDate: "01 Oct 2026",
      moveOutDate: "Ongoing",
      status: "Active",
      monthlyRent: 8500,
      deposit: 17000,
      agreementPeriod: "11 Months",
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

  // Filtered Stays
  const filteredStays = staysList.filter((s) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      s.tenant.toLowerCase().includes(query) ||
      s.room.toLowerCase().includes(query) ||
      s.property.toLowerCase().includes(query) ||
      (s.phone && s.phone.includes(query));
    const matchesProperty =
      propertyFilter === "All" || s.property === propertyFilter;
    const matchesStatus =
      statusFilter === "All" || s.status === statusFilter;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  return (
    <section className="page-content" aria-label="Tenant Stays Management">
      <div className="page-header">
        <div>
          <h2>Stays</h2>
          <p>Track resident tenure, active lease agreements and past move-outs.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Record new tenant stay"
        >
          <PlusIcon size={16} />
          <span>Record New Stay</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="stays-search"
            type="text"
            placeholder="Search tenant name, room or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search stays"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="stay-prop-filter">Property:</label>
          <select
            id="stay-prop-filter"
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
          <label htmlFor="stay-status-filter">Stay Status:</label>
          <select
            id="stay-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Stays</option>
            <option value="Active">Active (Ongoing)</option>
            <option value="Completed">Completed (Past)</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all stay filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredStays.length} of {staysList.length} stay agreements</span>
      </div>

      {/* Stays Table */}
      {filteredStays.length === 0 ? (
        <EmptyState
          title="No stays match your filter"
          message="No tenancy records found for your current search query or filter selection."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Tenant Stays Agreement Table">
              <thead>
                <tr>
                  <th scope="col">Stay ID</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Property</th>
                  <th scope="col">Room & Bed</th>
                  <th scope="col">Move-In Date</th>
                  <th scope="col">Move-Out Date</th>
                  <th scope="col">Tenure Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStays.map((stay) => (
                  <tr key={stay.id}>
                    <td>
                      <code className="code-badge">{stay.id}</code>
                    </td>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => setSelectedStay(stay)}
                        title="View stay agreement"
                      >
                        {stay.tenant}
                      </strong>
                    </td>
                    <td>{stay.property}</td>
                    <td>
                      <div>{stay.room}</div>
                      <small className="text-muted">{stay.bed}</small>
                    </td>
                    <td>{stay.moveInDate}</td>
                    <td>
                      {stay.moveOutDate === "Ongoing" ? (
                        <span className="text-emerald font-medium">Ongoing</span>
                      ) : (
                        stay.moveOutDate
                      )}
                    </td>
                    <td>
                      <StatusBadge status={stay.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setSelectedStay(stay)}
                        aria-label={`View agreement details for ${stay.tenant}`}
                      >
                        Agreement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredStays.length} of {staysList.length} stay agreements
          </div>
        </div>
      )}

      {/* New Stay Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Tenant Stay"
        subtitle="Establish a new tenancy agreement and move-in timeline"
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
              onClick={handleAddStay}
            >
              Register Stay
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddStay} className="modal-form">
          <div className="form-group">
            <label htmlFor="stay-tenant-input">Tenant Name *</label>
            <input
              id="stay-tenant-input"
              type="text"
              name="tenant"
              placeholder="e.g. Ramesh Sen or select resident"
              value={formData.tenant}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stay-property-select">Property</label>
              <select
                id="stay-property-select"
                name="property"
                value={formData.property}
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
              <label htmlFor="stay-room-input">Room & Bed</label>
              <input
                id="stay-room-input"
                type="text"
                name="room"
                placeholder="e.g. Room 103, Bed B1"
                value={formData.room}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stay-movein-input">Move-In Date</label>
              <input
                id="stay-movein-input"
                type="text"
                name="moveInDate"
                placeholder="e.g. 01 Oct 2026"
                value={formData.moveInDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stay-moveout-input">Move-Out / End Date</label>
              <input
                id="stay-moveout-input"
                type="text"
                name="moveOutDate"
                placeholder="Ongoing or 31 Dec 2026"
                value={formData.moveOutDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stay-rent-input">Monthly Agreed Rent (₹)</label>
              <input
                id="stay-rent-input"
                type="number"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stay-deposit-input">Security Deposit (₹)</label>
              <input
                id="stay-deposit-input"
                type="number"
                name="deposit"
                value={formData.deposit}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stay-period-input">Agreement Period</label>
              <input
                id="stay-period-input"
                type="text"
                name="agreementPeriod"
                placeholder="e.g. 11 Months"
                value={formData.agreementPeriod}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stay-status-select">Stay Status</label>
              <select
                id="stay-status-select"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Stay Details Modal */}
      {selectedStay && (
        <Modal
          isOpen={Boolean(selectedStay)}
          onClose={() => setSelectedStay(null)}
          title={`Stay Agreement: ${selectedStay.tenant}`}
          subtitle={`${selectedStay.property} • ${selectedStay.room} (${selectedStay.bed})`}
          footer={
            <div className="modal-actions-space-between">
              <button
                type="button"
                className="outline-btn link-action-btn"
                onClick={() => {
                  setSelectedStay(null);
                  if (onNavigate) onNavigate("Tenants");
                }}
              >
                <span>View Tenant Profile</span>
                <ArrowRightIcon size={13} />
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedStay(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="stay-modal-body">
            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Stay Status</span>
                <strong><StatusBadge status={selectedStay.status} /></strong>
              </div>
              <div className="detail-box">
                <span>Monthly Rent</span>
                <strong>₹{selectedStay.monthlyRent?.toLocaleString("en-IN")}</strong>
              </div>
              <div className="detail-box">
                <span>Security Deposit</span>
                <strong>₹{selectedStay.deposit?.toLocaleString("en-IN")}</strong>
              </div>
              <div className="detail-box">
                <span>Lease Term</span>
                <strong>{selectedStay.agreementPeriod}</strong>
              </div>
            </div>

            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Stay Reference ID:</span>
                <span className="info-val">{selectedStay.id}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Resident Name:</span>
                <span className="info-val"><strong>{selectedStay.tenant}</strong></span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Move-In Date:</span>
                <span className="info-val">{selectedStay.moveInDate}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Move-Out / Termination:</span>
                <span className="info-val">{selectedStay.moveOutDate}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Assigned Room:</span>
                <span className="info-val">{selectedStay.room}, {selectedStay.bed}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">PG Branch:</span>
                <span className="info-val">{selectedStay.property}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Stays;
