import { useState } from "react";
import { properties as initialProperties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import {
  PropertiesIcon,
  SearchIcon,
  PlusIcon,
  LocationPinIcon,
  ArrowRightIcon,
} from "../components/Icons";

function Properties({ onNavigate }) {
  const [propertiesList, setPropertiesList] = useState(initialProperties);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // New property form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    floors: "",
    rooms: "",
    beds: "",
    manager: "",
    phone: "",
    status: "Active",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProperty = (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedLocation = formData.location.trim();
    if (!trimmedName || !trimmedLocation) return;

    const totalBeds = Number(formData.beds) || 0;
    const newProperty = {
      id: Date.now(),
      name: trimmedName,
      location: trimmedLocation,
      floors: Number(formData.floors) || 1,
      rooms: Number(formData.rooms) || 0,
      beds: totalBeds,
      occupied: 0,
      vacant: totalBeds,
      status: formData.status,
      type: "Co-Living PG",
      manager: formData.manager.trim() || "Unassigned",
      phone: formData.phone.trim() || "—",
      amenities: ["Wi-Fi", "Daily Cleaning", "Security"],
      address: `${trimmedLocation}, Bengaluru`,
      monthlyRevenue: "₹0",
    };

    setPropertiesList([newProperty, ...propertiesList]);
    setIsAddModalOpen(false);
    setFormData({
      name: "",
      location: "",
      floors: "",
      rooms: "",
      beds: "",
      manager: "",
      phone: "",
      status: "Active",
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  const isFiltered = searchTerm.trim() !== "" || statusFilter !== "All";

  // Filtered properties
  const filteredProperties = propertiesList.filter((prop) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      prop.name.toLowerCase().includes(query) ||
      prop.location.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "All" || prop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPropertyThemeClass = (index) => {
    const themes = ["theme-forest", "theme-green", "theme-terracotta"];
    return themes[index % themes.length];
  };

  const getOccupancyColorClass = (rate) => {
    if (rate >= 80) return "fill-forest";
    if (rate >= 70) return "fill-green";
    if (rate >= 50) return "fill-amber";
    return "fill-terracotta";
  };

  return (
    <section className="page-content" aria-label="Properties Management">
      <div className="page-header">
        <div>
          <h2>Properties</h2>
          <p>Manage all your PG properties, buildings and premise capacities.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add new property"
        >
          <PlusIcon size={16} />
          <span>Add Property</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="properties-search"
            type="text"
            placeholder="Search properties by name or campus location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search properties"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="property-status-filter">Status:</label>
          <select
            id="property-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredProperties.length} of {propertiesList.length} properties</span>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <EmptyState
          title="No properties match your filter"
          message="No property found for your current search term or status selection."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="property-grid">
          {filteredProperties.map((property, idx) => {
            const occupancy = property.beds
              ? Math.round((property.occupied / property.beds) * 100)
              : 0;
            const themeClass = getPropertyThemeClass(idx);
            const occColorClass = getOccupancyColorClass(occupancy);

            return (
              <div className={`property-card ${themeClass}`} key={property.id}>
                <div className="property-card-top">
                  <div className="property-icon-box" aria-hidden="true">
                    <PropertiesIcon size={20} />
                  </div>
                  <StatusBadge status={property.status} />
                </div>

                <h3>{property.name}</h3>
                <p className="property-location">
                  <LocationPinIcon size={13} className="pin-icon" />
                  <span>{property.location}</span>
                </p>

                <div className="property-stats">
                  <div>
                    <strong>{property.floors}</strong>
                    <span>Floors</span>
                  </div>
                  <div>
                    <strong>{property.rooms}</strong>
                    <span>Rooms</span>
                  </div>
                  <div>
                    <strong>{property.beds}</strong>
                    <span>Beds</span>
                  </div>
                </div>

                <div className="occupancy-section">
                  <div className="occupancy-header">
                    <span>Occupancy Rate</span>
                    <strong>{occupancy}%</strong>
                  </div>

                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={occupancy}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${property.name} occupancy`}
                  >
                    <div
                      className={`progress-fill ${occColorClass}`}
                      style={{ width: `${occupancy}%` }}
                    ></div>
                  </div>

                  <small>
                    {property.occupied} of {property.beds} beds occupied ({property.beds - property.occupied} vacant)
                  </small>
                </div>

                <div className="property-card-actions">
                  <button
                    type="button"
                    className="view-btn link-action-btn"
                    onClick={() => setSelectedProperty(property)}
                    aria-label={`View details for ${property.name}`}
                  >
                    <span>View Property Details</span>
                    <ArrowRightIcon size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property"
        subtitle="Register a new building or PG branch to HevenOps"
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
              onClick={handleAddProperty}
            >
              Save Property
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddProperty} className="modal-form">
          <div className="form-group">
            <label htmlFor="prop-name-input">Property Name *</label>
            <input
              id="prop-name-input"
              type="text"
              name="name"
              required
              placeholder="e.g. Royal Palms PG"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prop-location-input">Location / Campus Area *</label>
            <input
              id="prop-location-input"
              type="text"
              name="location"
              required
              placeholder="e.g. South Campus / Tech Zone"
              value={formData.location}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prop-floors-input">Number of Floors</label>
              <input
                id="prop-floors-input"
                type="number"
                name="floors"
                placeholder="e.g. 3"
                value={formData.floors}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prop-rooms-input">Total Rooms</label>
              <input
                id="prop-rooms-input"
                type="number"
                name="rooms"
                placeholder="e.g. 24"
                value={formData.rooms}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prop-beds-input">Total Beds</label>
              <input
                id="prop-beds-input"
                type="number"
                name="beds"
                placeholder="e.g. 72"
                value={formData.beds}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prop-manager-input">Branch Manager</label>
              <input
                id="prop-manager-input"
                type="text"
                name="manager"
                placeholder="e.g. Suresh Gowda"
                value={formData.manager}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prop-phone-input">Manager Phone</label>
              <input
                id="prop-phone-input"
                type="text"
                name="phone"
                placeholder="e.g. +91 98450 11223"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Property Details Modal */}
      {selectedProperty && (
        <Modal
          isOpen={Boolean(selectedProperty)}
          onClose={() => setSelectedProperty(null)}
          title={selectedProperty.name}
          subtitle={`Located at ${selectedProperty.location}`}
          footer={
            <div className="modal-actions-space-between">
              <div className="modal-quick-links">
                <button
                  type="button"
                  className="outline-btn"
                  onClick={() => {
                    setSelectedProperty(null);
                    if (onNavigate) onNavigate("Floors");
                  }}
                >
                  View Floors →
                </button>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={() => {
                    setSelectedProperty(null);
                    if (onNavigate) onNavigate("Rooms");
                  }}
                >
                  View Rooms →
                </button>
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedProperty(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div className="property-detail-body">
            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Floors</span>
                <strong>{selectedProperty.floors}</strong>
              </div>
              <div className="detail-box">
                <span>Rooms</span>
                <strong>{selectedProperty.rooms}</strong>
              </div>
              <div className="detail-box">
                <span>Beds</span>
                <strong>{selectedProperty.beds}</strong>
              </div>
              <div className="detail-box">
                <span>Occupied</span>
                <strong>{selectedProperty.occupied}</strong>
              </div>
              <div className="detail-box">
                <span>Vacant</span>
                <strong>{selectedProperty.beds - selectedProperty.occupied}</strong>
              </div>
            </div>

            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Full Address:</span>
                <span className="info-val">{selectedProperty.address || selectedProperty.location}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Property Manager:</span>
                <span className="info-val">{selectedProperty.manager} ({selectedProperty.phone})</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Operational Status:</span>
                <span className="info-val"><StatusBadge status={selectedProperty.status} /></span>
              </div>
              {selectedProperty.monthlyRevenue && (
                <div className="detail-info-item">
                  <span className="info-label">Monthly Revenue:</span>
                  <span className="info-val"><strong>{selectedProperty.monthlyRevenue}</strong></span>
                </div>
              )}
            </div>

            {selectedProperty.amenities && (
              <div className="detail-amenities">
                <h4>Included Amenities & Facilities:</h4>
                <div className="amenity-tags">
                  {selectedProperty.amenities.map((item, idx) => (
                    <span key={idx} className="amenity-tag">✓ {item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Properties;