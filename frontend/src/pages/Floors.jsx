import { useState } from "react";
import { floors as initialFloors, properties } from "../data/mockData";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { FloorsIcon, SearchIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

function Floors({ onNavigate }) {
  const [floorsList, setFloorsList] = useState(initialFloors);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Floor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: properties[0]?.id || 1,
    floorName: "",
    floorNumber: "",
    rooms: "",
    beds: "",
    wing: "Main Wing",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddFloor = (e) => {
    e.preventDefault();
    const trimmedName = formData.floorName.trim();
    if (!trimmedName) return;

    const prop = properties.find((p) => p.id === Number(formData.propertyId)) || properties[0];
    const totalBeds = Number(formData.beds) || 24;
    const occupied = 0;
    const vacant = totalBeds;

    const newFloor = {
      id: `f-${Date.now()}`,
      propertyId: prop.id,
      propertyName: prop.name,
      floorNumber: Number(formData.floorNumber) || 1,
      floorName: trimmedName,
      rooms: Number(formData.rooms) || 8,
      beds: totalBeds,
      occupied: occupied,
      vacant: vacant,
      occupancyRate: 0,
      wing: formData.wing.trim() || "Main Wing",
    };

    setFloorsList([newFloor, ...floorsList]);
    setIsAddModalOpen(false);
    setFormData({
      propertyId: properties[0]?.id || 1,
      floorName: "",
      floorNumber: "",
      rooms: "",
      beds: "",
      wing: "Main Wing",
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedPropertyFilter("All");
  };

  const isFiltered = searchTerm.trim() !== "" || selectedPropertyFilter !== "All";

  // Filtered floors
  const filteredFloors = floorsList.filter((f) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesProperty =
      selectedPropertyFilter === "All" ||
      f.propertyName === selectedPropertyFilter;
    const matchesSearch =
      query === "" ||
      f.floorName.toLowerCase().includes(query) ||
      f.propertyName.toLowerCase().includes(query) ||
      (f.wing && f.wing.toLowerCase().includes(query));
    return matchesProperty && matchesSearch;
  });

  const getOccupancyColorClass = (rate) => {
    if (rate >= 80) return "fill-forest";
    if (rate >= 70) return "fill-green";
    if (rate >= 50) return "fill-amber";
    return "fill-terracotta";
  };

  return (
    <section className="page-content" aria-label="Floors Management">
      <div className="page-header">
        <div>
          <h2>Floors</h2>
          <p>Inspect floor wings, room capacities, and occupancy across properties.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add new floor level"
        >
          <PlusIcon size={16} />
          <span>Add Floor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="floors-search"
            type="text"
            placeholder="Search floor name or wing..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search floors"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="floors-property-filter">Filter by Property:</label>
          <select
            id="floors-property-filter"
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Properties ({floorsList.length} Floors)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
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
        <span>Showing {filteredFloors.length} of {floorsList.length} floors</span>
      </div>

      {/* Floors Cards Grid */}
      {filteredFloors.length === 0 ? (
        <EmptyState
          title="No floors match your filter"
          message="No floor matches your current search query or selected property."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="floors-grid">
          {filteredFloors.map((floor) => {
            const occ = floor.beds
              ? Math.round((floor.occupied / floor.beds) * 100)
              : 0;
            const occColorClass = getOccupancyColorClass(occ);

            return (
              <div key={floor.id} className="floor-card">
                <div className="floor-card-top">
                  <div>
                    <span className="floor-property-badge">{floor.propertyName}</span>
                    <h3 className="floor-name">{floor.floorName}</h3>
                    {floor.wing && <small className="floor-wing">📍 {floor.wing}</small>}
                  </div>
                  <div className="floor-icon-box" aria-hidden="true">
                    <FloorsIcon size={20} />
                  </div>
                </div>

                <div className="floor-stats-grid">
                  <div className="floor-stat-item">
                    <strong>{floor.rooms}</strong>
                    <span>Rooms</span>
                  </div>
                  <div className="floor-stat-item">
                    <strong>{floor.beds}</strong>
                    <span>Total Beds</span>
                  </div>
                  <div className="floor-stat-item success">
                    <strong className="text-success">{floor.occupied}</strong>
                    <span>Occupied</span>
                  </div>
                  <div className="floor-stat-item warning">
                    <strong className="text-warning">{floor.vacant}</strong>
                    <span>Vacant</span>
                  </div>
                </div>

                <div className="occupancy-section">
                  <div className="occupancy-header">
                    <span>Occupancy Rate</span>
                    <strong>{occ}%</strong>
                  </div>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={occ}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${floor.floorName} occupancy`}
                  >
                    <div
                      className={`progress-fill ${occColorClass}`}
                      style={{ width: `${occ}%` }}
                    ></div>
                  </div>
                  <small>
                    {floor.occupied} of {floor.beds} beds occupied
                  </small>
                </div>

                <div className="floor-card-actions">
                  <button
                    type="button"
                    className="view-btn link-action-btn"
                    onClick={() => onNavigate && onNavigate("Rooms")}
                    aria-label={`View rooms on ${floor.floorName}`}
                  >
                    <span>View Rooms</span>
                    <ArrowRightIcon size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Floor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Floor"
        subtitle="Configure a new floor level under a property"
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
              onClick={handleAddFloor}
            >
              Save Floor
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddFloor} className="modal-form">
          <div className="form-group">
            <label htmlFor="floor-prop-select">Select Property *</label>
            <select
              id="floor-prop-select"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleInputChange}
              className="form-input"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="floor-name-input">Floor Name *</label>
              <input
                id="floor-name-input"
                type="text"
                name="floorName"
                placeholder="e.g. Floor 3 or 3rd Floor"
                value={formData.floorName}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="floor-number-input">Floor Number</label>
              <input
                id="floor-number-input"
                type="number"
                name="floorNumber"
                placeholder="e.g. 3"
                value={formData.floorNumber}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="floor-rooms-input">Number of Rooms</label>
              <input
                id="floor-rooms-input"
                type="number"
                name="rooms"
                placeholder="e.g. 8"
                value={formData.rooms}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="floor-beds-input">Total Beds on Floor</label>
              <input
                id="floor-beds-input"
                type="number"
                name="beds"
                placeholder="e.g. 24"
                value={formData.beds}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="floor-wing-input">Wing / Section (Optional)</label>
            <input
              id="floor-wing-input"
              type="text"
              name="wing"
              placeholder="e.g. East Wing, Block B"
              value={formData.wing}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Floors;
