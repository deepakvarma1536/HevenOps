import { useState } from "react";
import { rooms as initialRooms, properties, beds } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

function Rooms({ onNavigate }) {
  const [roomsList, setRoomsList] = useState(initialRooms);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // New room state
  const [formData, setFormData] = useState({
    roomNumber: "",
    propertyName: properties[0]?.name || "Heaven Heights",
    floor: "Floor 1",
    roomType: "Double",
    rentPerBed: 8500,
    ac: true,
    attachedBath: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    const trimmedNumber = formData.roomNumber.trim();
    if (!trimmedNumber) return;

    let bedCount = 2;
    if (formData.roomType === "Single") bedCount = 1;
    if (formData.roomType === "Triple") bedCount = 3;
    if (formData.roomType === "Four Sharing") bedCount = 4;

    const prop = properties.find((p) => p.name === formData.propertyName) || properties[0];

    const newRoom = {
      id: `r-${Date.now()}`,
      roomNumber: trimmedNumber.startsWith("Room") ? trimmedNumber : `Room ${trimmedNumber}`,
      propertyId: prop.id,
      propertyName: prop.name,
      floor: formData.floor,
      roomType: formData.roomType,
      totalBeds: bedCount,
      occupiedBeds: 0,
      vacantBeds: bedCount,
      status: "Vacant",
      rentPerBed: Number(formData.rentPerBed) || 7500,
      attachedBath: Boolean(formData.attachedBath),
      ac: Boolean(formData.ac),
    };

    setRoomsList([newRoom, ...roomsList]);
    setIsAddModalOpen(false);
    setFormData({
      roomNumber: "",
      propertyName: properties[0]?.name || "Heaven Heights",
      floor: "Floor 1",
      roomType: "Double",
      rentPerBed: 8500,
      ac: true,
      attachedBath: true,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setPropertyFilter("All");
    setFloorFilter("All");
    setTypeFilter("All");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    propertyFilter !== "All" ||
    floorFilter !== "All" ||
    typeFilter !== "All";

  // Unique floors available based on current selection
  const availableFloors = Array.from(new Set(roomsList.map((r) => r.floor))).sort();

  // Filtered rooms
  const filteredRooms = roomsList.filter((room) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      room.roomNumber.toLowerCase().includes(query) ||
      room.propertyName.toLowerCase().includes(query);
    const matchesProperty =
      propertyFilter === "All" || room.propertyName === propertyFilter;
    const matchesFloor =
      floorFilter === "All" || room.floor === floorFilter;
    const matchesType =
      typeFilter === "All" || room.roomType === typeFilter;

    return matchesSearch && matchesProperty && matchesFloor && matchesType;
  });

  // Get beds for selected room
  const getRoomBeds = (room) => {
    if (!room) return [];
    return beds.filter(
      (b) =>
        b.roomNumber === room.roomNumber &&
        b.propertyName === room.propertyName
    );
  };

  const getOccupancyColorClass = (rate) => {
    if (rate >= 80) return "fill-forest";
    if (rate >= 70) return "fill-green";
    if (rate >= 50) return "fill-amber";
    return "fill-terracotta";
  };

  return (
    <section className="page-content" aria-label="Rooms Management">
      <div className="page-header">
        <div>
          <h2>Rooms</h2>
          <p>Monitor room sharing categories, occupancy and bed availability.</p>
        </div>

        <div className="header-actions">
          <div className="view-toggle" role="group" aria-label="View toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              title="Table View"
            >
              ☰ Table
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              title="Card Grid View"
            >
              ▦ Cards
            </button>
          </div>

          <button
            type="button"
            className="primary-btn cta-btn"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add new room"
          >
            <PlusIcon size={16} />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar multi-filter">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="rooms-search"
            type="text"
            placeholder="Search room (e.g. Room 101)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search rooms"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="room-prop-filter">Property:</label>
          <select
            id="room-prop-filter"
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
          <label htmlFor="room-floor-filter">Floor:</label>
          <select
            id="room-floor-filter"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Floors</option>
            {availableFloors.map((fl) => (
              <option key={fl} value={fl}>
                {fl}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="room-type-filter">Room Type:</label>
          <select
            id="room-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Room Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Triple">Triple</option>
            <option value="Four Sharing">Four Sharing</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all room filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredRooms.length} of {roomsList.length} rooms</span>
      </div>

      {/* Room Content */}
      {filteredRooms.length === 0 ? (
        <EmptyState
          title="No rooms match your filter"
          message="No room matches your current search term or filter selection."
          onReset={handleResetFilters}
        />
      ) : viewMode === "table" ? (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Rooms Inventory Table">
              <thead>
                <tr>
                  <th scope="col">Room No</th>
                  <th scope="col">Property</th>
                  <th scope="col">Floor</th>
                  <th scope="col">Room Type</th>
                  <th scope="col">Total Beds</th>
                  <th scope="col">Occupied</th>
                  <th scope="col">Vacant</th>
                  <th scope="col">Rent / Bed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => setSelectedRoom(room)}
                        title="View room details"
                      >
                        {room.roomNumber}
                      </strong>
                    </td>
                    <td>{room.propertyName}</td>
                    <td>{room.floor}</td>
                    <td>
                      <span className="room-type-pill">{room.roomType}</span>
                    </td>
                    <td><strong>{room.totalBeds}</strong></td>
                    <td className="text-emerald font-medium">{room.occupiedBeds}</td>
                    <td className="text-muted">{room.vacantBeds}</td>
                    <td>
                      <strong className="rent-amount">₹{room.rentPerBed?.toLocaleString("en-IN") || "—"}</strong>
                    </td>
                    <td>
                      <StatusBadge status={room.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn link-action-btn"
                        onClick={() => setSelectedRoom(room)}
                        aria-label={`View beds in ${room.roomNumber}`}
                      >
                        <span>View Beds</span>
                        <ArrowRightIcon size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredRooms.length} of {roomsList.length} rooms
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="rooms-grid">
          {filteredRooms.map((room) => {
            const occRate = Math.round(
              (room.occupiedBeds / room.totalBeds) * 100
            );
            const occColorClass = getOccupancyColorClass(occRate);

            return (
              <div key={room.id} className="room-card">
                <div className="room-card-header">
                  <div>
                    <h3>{room.roomNumber}</h3>
                    <span className="room-prop-name">{room.propertyName}</span>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                <div className="room-details-row">
                  <span className="room-type-badge">{room.roomType}</span>
                  <span className="room-floor-tag">{room.floor}</span>
                  {room.ac && <span className="feature-pill">AC</span>}
                  {room.attachedBath && <span className="feature-pill">Bath</span>}
                </div>

                <div className="room-bed-stat-bar">
                  <div className="bed-stat-text">
                    <span>Bed Allocation</span>
                    <strong>{room.occupiedBeds}/{room.totalBeds} Occupied</strong>
                  </div>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={occRate}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${room.roomNumber} occupancy`}
                  >
                    <div
                      className={`progress-fill ${occColorClass}`}
                      style={{ width: `${occRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="room-pricing">
                  <span>Rent / Bed:</span>
                  <strong>₹{room.rentPerBed?.toLocaleString("en-IN") || "—"}<small>/mo</small></strong>
                </div>

                <button
                  type="button"
                  className="view-btn link-action-btn"
                  onClick={() => setSelectedRoom(room)}
                  aria-label={`View details and beds for ${room.roomNumber}`}
                >
                  <span>View Details & Beds</span>
                  <ArrowRightIcon size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Room"
        subtitle="Configure room number, type and bed capacity"
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
              onClick={handleAddRoom}
            >
              Create Room
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddRoom} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="room-no-input">Room Number *</label>
              <input
                id="room-no-input"
                type="text"
                name="roomNumber"
                placeholder="e.g. 106 or Room 106"
                value={formData.roomNumber}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="room-prop-select">Property *</label>
              <select
                id="room-prop-select"
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="room-floor-select">Floor Level</label>
              <select
                id="room-floor-select"
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

            <div className="form-group">
              <label htmlFor="room-type-select">Room Type (Sharing)</label>
              <select
                id="room-type-select"
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="Single">Single (1 Bed)</option>
                <option value="Double">Double (2 Beds)</option>
                <option value="Triple">Triple (3 Beds)</option>
                <option value="Four Sharing">Four Sharing (4 Beds)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="room-rent-input">Rent Per Bed (₹ / Month)</label>
            <input
              id="room-rent-input"
              type="number"
              name="rentPerBed"
              value={formData.rentPerBed}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="checkbox-row">
            <label className="checkbox-label" htmlFor="room-ac-input">
              <input
                id="room-ac-input"
                type="checkbox"
                name="ac"
                checked={formData.ac}
                onChange={handleInputChange}
              />
              Air Conditioned (AC)
            </label>
            <label className="checkbox-label" htmlFor="room-bath-input">
              <input
                id="room-bath-input"
                type="checkbox"
                name="attachedBath"
                checked={formData.attachedBath}
                onChange={handleInputChange}
              />
              Attached Bathroom
            </label>
          </div>
        </form>
      </Modal>

      {/* View Room & Beds Modal */}
      {selectedRoom && (
        <Modal
          isOpen={Boolean(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          title={`${selectedRoom.roomNumber} - ${selectedRoom.propertyName}`}
          subtitle={`${selectedRoom.floor} • ${selectedRoom.roomType} Sharing`}
          footer={
            <div className="modal-actions-space-between">
              <button
                type="button"
                className="outline-btn link-action-btn"
                onClick={() => {
                  setSelectedRoom(null);
                  if (onNavigate) onNavigate("Beds");
                }}
              >
                <span>Go to Beds Management</span>
                <ArrowRightIcon size={13} />
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedRoom(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="room-detail-modal">
            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Room Type</span>
                <strong>{selectedRoom.roomType}</strong>
              </div>
              <div className="detail-box">
                <span>Total Beds</span>
                <strong>{selectedRoom.totalBeds}</strong>
              </div>
              <div className="detail-box">
                <span>Occupied</span>
                <strong>{selectedRoom.occupiedBeds}</strong>
              </div>
              <div className="detail-box">
                <span>Vacant</span>
                <strong>{selectedRoom.vacantBeds}</strong>
              </div>
              <div className="detail-box">
                <span>Monthly Rent</span>
                <strong>₹{selectedRoom.rentPerBed?.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div className="room-bed-list">
              <h4>Assigned Beds & Current Tenants</h4>
              {getRoomBeds(selectedRoom).length === 0 ? (
                <p className="text-muted">No individual bed assignments logged yet for this room.</p>
              ) : (
                <div className="bed-assignment-cards">
                  {getRoomBeds(selectedRoom).map((bed) => (
                    <div key={bed.id} className="bed-mini-card">
                      <div className="bed-mini-header">
                        <strong>{bed.bedNumber}</strong>
                        <StatusBadge status={bed.status} />
                      </div>
                      <p><strong>Resident:</strong> {bed.tenant}</p>
                      <small className="text-muted">Move-in: {bed.moveInDate}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Rooms;
