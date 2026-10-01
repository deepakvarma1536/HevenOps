import { useState } from "react";
import { tenants as initialTenants, properties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

function Tenants({ onNavigate }) {
  const [tenantsList, setTenantsList] = useState(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [rentStatusFilter, setRentStatusFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    propertyName: properties[0]?.name || "Heaven Heights",
    room: "Room 101",
    bed: "Bed B1",
    moveInDate: "01 Oct 2026",
    rentStatus: "Due",
    monthlyRent: 8000,
    securityDeposit: 16000,
    emergencyContact: "",
    occupation: "",
    idProof: "Aadhaar verified",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTenant = (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();
    if (!trimmedName || !trimmedPhone) return;

    const prop = properties.find((p) => p.name === formData.propertyName) || properties[0];

    const newTenant = {
      id: `t-${Date.now()}`,
      name: trimmedName,
      phone: trimmedPhone,
      email: formData.email.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      room: formData.room.trim().startsWith("Room") ? formData.room.trim() : `Room ${formData.room.trim()}`,
      bed: formData.bed.trim().startsWith("Bed") ? formData.bed.trim() : `Bed ${formData.bed.trim()}`,
      property: prop.name,
      propertyId: prop.id,
      moveInDate: formData.moveInDate.trim() || "01 Oct 2026",
      rentStatus: formData.rentStatus,
      monthlyRent: Number(formData.monthlyRent) || 8000,
      securityDeposit: Number(formData.securityDeposit) || 16000,
      emergencyContact: formData.emergencyContact.trim() || "Guardian - Not provided",
      occupation: formData.occupation.trim() || "Working Professional",
      idProof: formData.idProof.trim() || "Government ID submitted",
    };

    setTenantsList([newTenant, ...tenantsList]);
    setIsAddModalOpen(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      propertyName: properties[0]?.name || "Heaven Heights",
      room: "Room 101",
      bed: "Bed B1",
      moveInDate: "01 Oct 2026",
      rentStatus: "Due",
      monthlyRent: 8000,
      securityDeposit: 16000,
      emergencyContact: "",
      occupation: "",
      idProof: "Aadhaar verified",
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setPropertyFilter("All");
    setRentStatusFilter("All");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    propertyFilter !== "All" ||
    rentStatusFilter !== "All";

  // Filtered tenants
  const filteredTenants = tenantsList.filter((t) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      t.name.toLowerCase().includes(query) ||
      t.phone.includes(query) ||
      t.email.toLowerCase().includes(query) ||
      t.room.toLowerCase().includes(query);
    const matchesProperty =
      propertyFilter === "All" || t.property === propertyFilter;
    const matchesStatus =
      rentStatusFilter === "All" || t.rentStatus === rentStatusFilter;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  const getAvatarGradient = (name) => {
    const colors = [
      "linear-gradient(135deg, #173F35, #2F6B5B)",
      "linear-gradient(135deg, #D97757, #E9B872)",
      "linear-gradient(135deg, #4F8A68, #2F6B5B)",
      "linear-gradient(135deg, #D6A64F, #D97757)",
      "linear-gradient(135deg, #2F6B5B, #173F35)",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <section className="page-content" aria-label="Tenants Directory">
      <div className="page-header">
        <div>
          <h2>Tenants</h2>
          <p>Resident directory, contact records, bed assignment and rent statuses.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Register new tenant"
        >
          <PlusIcon size={16} />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="tenants-search"
            type="text"
            placeholder="Search tenant name, phone, email, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search tenants"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="tenant-prop-filter">Property:</label>
          <select
            id="tenant-prop-filter"
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
          <label htmlFor="tenant-rent-filter">Rent Status:</label>
          <select
            id="tenant-rent-filter"
            value={rentStatusFilter}
            onChange={(e) => setRentStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Due">Due</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all tenant filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredTenants.length} of {tenantsList.length} tenants</span>
      </div>

      {/* Tenants Table */}
      {filteredTenants.length === 0 ? (
        <EmptyState
          title="No tenants match your filter"
          message="No resident record matches your current search query or filter selection."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Residents Directory Table">
              <thead>
                <tr>
                  <th scope="col">Tenant Name</th>
                  <th scope="col">Phone & Email</th>
                  <th scope="col">Property</th>
                  <th scope="col">Room & Bed</th>
                  <th scope="col">Move-In Date</th>
                  <th scope="col">Rent Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div className="tenant-cell">
                        <div
                          className="avatar-initials"
                          aria-hidden="true"
                          style={{ background: getAvatarGradient(tenant.name), color: "#ffffff" }}
                        >
                          {tenant.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <strong
                            className="clickable-text"
                            onClick={() => setSelectedTenant(tenant)}
                            title="View resident profile"
                          >
                            {tenant.name}
                          </strong>
                          <span className="tenant-occupation">{tenant.occupation}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>📞 {tenant.phone}</div>
                      <small className="text-muted">✉ {tenant.email}</small>
                    </td>
                    <td>
                      <strong>{tenant.property}</strong>
                    </td>
                    <td>
                      <div>{tenant.room}</div>
                      <small className="text-muted">{tenant.bed}</small>
                    </td>
                    <td>{tenant.moveInDate}</td>
                    <td>
                      <StatusBadge status={tenant.rentStatus} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setSelectedTenant(tenant)}
                        aria-label={`View profile for ${tenant.name}`}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredTenants.length} of {tenantsList.length} tenants
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Tenant"
        subtitle="Onboard a new resident into HevenOps system"
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
              onClick={handleAddTenant}
            >
              Save Resident
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddTenant} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tenant-name-input">Full Name *</label>
              <input
                id="tenant-name-input"
                type="text"
                name="name"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-phone-input">Phone Number *</label>
              <input
                id="tenant-phone-input"
                type="text"
                name="phone"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tenant-email-input">Email Address</label>
              <input
                id="tenant-email-input"
                type="email"
                name="email"
                placeholder="e.g. rahul@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-occ-input">Occupation / College</label>
              <input
                id="tenant-occ-input"
                type="text"
                name="occupation"
                placeholder="e.g. Software Engineer / Student"
                value={formData.occupation}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tenant-property-select">Assigned Property</label>
              <select
                id="tenant-property-select"
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
              <label htmlFor="tenant-room-input">Room Number</label>
              <input
                id="tenant-room-input"
                type="text"
                name="room"
                placeholder="e.g. Room 101"
                value={formData.room}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-bed-input">Bed Number</label>
              <input
                id="tenant-bed-input"
                type="text"
                name="bed"
                placeholder="e.g. Bed B1"
                value={formData.bed}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tenant-movein-input">Move-In Date</label>
              <input
                id="tenant-movein-input"
                type="text"
                name="moveInDate"
                placeholder="e.g. 01 Oct 2026"
                value={formData.moveInDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-rent-input">Monthly Rent (₹)</label>
              <input
                id="tenant-rent-input"
                type="number"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant-deposit-input">Security Deposit (₹)</label>
              <input
                id="tenant-deposit-input"
                type="number"
                name="securityDeposit"
                value={formData.securityDeposit}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tenant-contact-input">Emergency Contact (Name, Relationship, Phone)</label>
            <input
              id="tenant-contact-input"
              type="text"
              name="emergencyContact"
              placeholder="e.g. Suresh Sharma (Father) - 9876500001"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>
        </form>
      </Modal>

      {/* Tenant Profile Modal */}
      {selectedTenant && (
        <Modal
          isOpen={Boolean(selectedTenant)}
          onClose={() => setSelectedTenant(null)}
          title={`Resident Profile: ${selectedTenant.name}`}
          subtitle={`${selectedTenant.property} • ${selectedTenant.room} (${selectedTenant.bed})`}
          footer={
            <div className="modal-actions-space-between">
              <button
                type="button"
                className="outline-btn link-action-btn"
                onClick={() => {
                  setSelectedTenant(null);
                  if (onNavigate) onNavigate("Rent Due");
                }}
              >
                <span>Check Rent Dues</span>
                <ArrowRightIcon size={13} />
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedTenant(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div className="tenant-modal-body">
            <div className="tenant-hero-card">
              <div
                className="avatar-initials lg"
                aria-hidden="true"
                style={{ background: getAvatarGradient(selectedTenant.name), color: "#ffffff" }}
              >
                {selectedTenant.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="tenant-hero-info">
                <h3>{selectedTenant.name}</h3>
                <p>{selectedTenant.occupation || "Resident"}</p>
                <div className="status-container">
                  <span className="info-label">Rent Status:</span>
                  <StatusBadge status={selectedTenant.rentStatus} />
                </div>
              </div>
            </div>

            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Monthly Rent</span>
                <strong>₹{selectedTenant.monthlyRent?.toLocaleString("en-IN")}</strong>
              </div>
              <div className="detail-box">
                <span>Security Deposit</span>
                <strong>₹{selectedTenant.securityDeposit?.toLocaleString("en-IN")}</strong>
              </div>
              <div className="detail-box">
                <span>Joined On</span>
                <strong>{selectedTenant.moveInDate}</strong>
              </div>
            </div>

            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Phone:</span>
                <span className="info-val">{selectedTenant.phone}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Email:</span>
                <span className="info-val">{selectedTenant.email}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Assigned Room:</span>
                <span className="info-val">{selectedTenant.room}, {selectedTenant.bed}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Property:</span>
                <span className="info-val">{selectedTenant.property}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Emergency Contact:</span>
                <span className="info-val">{selectedTenant.emergencyContact}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">ID Verification:</span>
                <span className="info-val">✓ {selectedTenant.idProof}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Tenants;
