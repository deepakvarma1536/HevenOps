import { useState } from "react";
import { rentDues as initialRentDues, properties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, ArrowRightIcon, RentDueIcon } from "../components/Icons";

function RentDue({ onNavigate }) {
  const [rentList, setRentList] = useState(initialRentDues);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tenant: "",
    room: "Room 101",
    property: properties[0]?.name || "Heaven Heights",
    dueMonth: "October 2026",
    amount: 8000,
    dueDate: "05 Oct 2026",
    status: "Due",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDemand = (e) => {
    e.preventDefault();
    const trimmedTenant = formData.tenant.trim();
    if (!trimmedTenant || !formData.amount) return;

    const prop = properties.find((p) => p.name === formData.property) || properties[0];

    const newDemand = {
      id: `rd-${Date.now()}`,
      tenant: trimmedTenant,
      room: formData.room.trim().startsWith("Room") ? formData.room.trim() : `Room ${formData.room.trim()}`,
      property: prop.name,
      propertyId: prop.id,
      dueMonth: formData.dueMonth.trim() || "October 2026",
      amount: Number(formData.amount),
      dueDate: formData.dueDate.trim() || "05 Oct 2026",
      status: formData.status,
      phone: "+91 98765 00000",
    };

    setRentList([newDemand, ...rentList]);
    setIsAddModalOpen(false);
    setFormData({
      tenant: "",
      room: "Room 101",
      property: properties[0]?.name || "Heaven Heights",
      dueMonth: "October 2026",
      amount: 8000,
      dueDate: "05 Oct 2026",
      status: "Due",
    });
  };

  const handleMarkAsPaid = (dueId) => {
    setRentList((prev) =>
      prev.map((item) =>
        item.id === dueId ? { ...item, status: "Paid" } : item
      )
    );
    if (selectedDue && selectedDue.id === dueId) {
      setSelectedDue((prev) => ({ ...prev, status: "Paid" }));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setPropertyFilter("All");
    setStatusFilter("All");
    setMonthFilter("All");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    propertyFilter !== "All" ||
    statusFilter !== "All" ||
    monthFilter !== "All";

  // Metrics
  const totalDueAmount = rentList.reduce((acc, curr) => acc + curr.amount, 0);
  const paidAmount = rentList
    .filter((d) => d.status === "Paid")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = rentList
    .filter((d) => d.status === "Due" || d.status === "Partial")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const overdueAmount = rentList
    .filter((d) => d.status === "Overdue")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filtered
  const filteredRent = rentList.filter((d) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      d.tenant.toLowerCase().includes(query) ||
      d.room.toLowerCase().includes(query) ||
      d.property.toLowerCase().includes(query);
    const matchesProperty =
      propertyFilter === "All" || d.property === propertyFilter;
    const matchesStatus =
      statusFilter === "All" || d.status === statusFilter;
    const matchesMonth =
      monthFilter === "All" || d.dueMonth === monthFilter;

    return matchesSearch && matchesProperty && matchesStatus && matchesMonth;
  });

  return (
    <section className="page-content" aria-label="Rent Due Management">
      <div className="page-header">
        <div>
          <h2>Rent Due</h2>
          <p>Monitor upcoming, pending and overdue rent receivables with automated status tracking.</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="outline-btn link-action-btn"
            onClick={() => onNavigate && onNavigate("Payments")}
            aria-label="View payments ledger"
          >
            <span>View Payments Ledger</span>
            <ArrowRightIcon size={13} />
          </button>
          <button
            type="button"
            className="primary-btn cta-btn"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Create new rent demand"
          >
            <PlusIcon size={16} />
            <span>Add Rent Demand</span>
          </button>
        </div>
      </div>

      {/* 4 Themed Summary Cards */}
      <div className="stats-grid four-col">
        <div className="stat-card theme-forest">
          <div className="stat-card-header">
            <span className="stat-label">Total Due (All)</span>
            <div className="stat-icon-badge badge-forest" aria-hidden="true">
              <RentDueIcon size={16} />
            </div>
          </div>
          <h3 className="stat-value">₹{totalDueAmount.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">Cumulative demand for billing period</p>
        </div>

        <div className="stat-card theme-green highlight-success">
          <div className="stat-card-header">
            <span className="stat-label">Paid Received</span>
            <div className="stat-icon-badge badge-green" aria-hidden="true">
              ✓
            </div>
          </div>
          <h3 className="stat-value text-success">₹{paidAmount.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">
            {totalDueAmount > 0 ? Math.round((paidAmount / totalDueAmount) * 100) : 0}% collection efficiency
          </p>
        </div>

        <div className="stat-card theme-amber highlight-warning">
          <div className="stat-card-header">
            <span className="stat-label">Pending Collection</span>
            <div className="stat-icon-badge badge-amber" aria-hidden="true">
              ⏳
            </div>
          </div>
          <h3 className="stat-value text-warning">₹{pendingAmount.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">Due this current month</p>
        </div>

        <div className="stat-card theme-terracotta highlight-danger">
          <div className="stat-card-header">
            <span className="stat-label">Overdue Outstanding</span>
            <div className="stat-icon-badge badge-terracotta" aria-hidden="true">
              ⚠️
            </div>
          </div>
          <h3 className="stat-value text-danger">₹{overdueAmount.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">Past due date — reminder required</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar multi-filter">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="rent-search"
            type="text"
            placeholder="Search tenant name or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search rent dues"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="rent-prop-filter">Property:</label>
          <select
            id="rent-prop-filter"
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
          <label htmlFor="rent-status-filter">Status:</label>
          <select
            id="rent-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Due">Due</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="rent-month-filter">Month:</label>
          <select
            id="rent-month-filter"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Months</option>
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
          </select>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all rent filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredRent.length} of {rentList.length} rent demands</span>
      </div>

      {/* Rent Dues Table */}
      {filteredRent.length === 0 ? (
        <EmptyState
          title="No rent demands match your filter"
          message="No records found matching your search query or selected billing status."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Rent Receivables Ledger Table">
              <thead>
                <tr>
                  <th scope="col">Resident</th>
                  <th scope="col">Room</th>
                  <th scope="col">Property</th>
                  <th scope="col">Due Month</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Due Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRent.map((due) => (
                  <tr key={due.id}>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => setSelectedDue(due)}
                        title="View rent details"
                      >
                        {due.tenant}
                      </strong>
                      {due.phone && <small className="cell-sub">{due.phone}</small>}
                    </td>
                    <td>{due.room}</td>
                    <td>{due.property}</td>
                    <td>{due.dueMonth}</td>
                    <td>
                      <strong className="rent-amount">₹{due.amount.toLocaleString("en-IN")}</strong>
                    </td>
                    <td>
                      <span className={due.status === "Overdue" ? "text-danger font-medium" : ""}>
                        {due.dueDate}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={due.status} />
                    </td>
                    <td>
                      <div className="table-actions">
                        {due.status !== "Paid" ? (
                          <button
                            type="button"
                            className="table-action-btn success"
                            onClick={() => handleMarkAsPaid(due.id)}
                            title="Mark Rent as Paid"
                            aria-label={`Mark rent as paid for ${due.tenant}`}
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="badge-text-green">✓ Received</span>
                        )}
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => setSelectedDue(due)}
                          aria-label={`View details for ${due.tenant}`}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredRent.length} of {rentList.length} rent demands
          </div>
        </div>
      )}

      {/* Add Rent Demand Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Rent Demand"
        subtitle="Generate a rent bill or invoice for a resident"
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
              onClick={handleAddDemand}
            >
              Create Demand
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddDemand} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="demand-tenant-input">Tenant Name *</label>
              <input
                id="demand-tenant-input"
                type="text"
                name="tenant"
                placeholder="e.g. Sneha Verma"
                value={formData.tenant}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="demand-room-input">Room Number *</label>
              <input
                id="demand-room-input"
                type="text"
                name="room"
                placeholder="e.g. Room 201"
                value={formData.room}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="demand-prop-select">Property</label>
              <select
                id="demand-prop-select"
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
              <label htmlFor="demand-month-input">Billing Month</label>
              <input
                id="demand-month-input"
                type="text"
                name="dueMonth"
                placeholder="e.g. October 2026"
                value={formData.dueMonth}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="demand-amount-input">Rent Amount (₹) *</label>
              <input
                id="demand-amount-input"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="demand-date-input">Due Date</label>
              <input
                id="demand-date-input"
                type="text"
                name="dueDate"
                placeholder="e.g. 05 Oct 2026"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="demand-status-select">Initial Status</label>
            <select
              id="demand-status-select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-input"
            >
              <option value="Due">Due</option>
              <option value="Overdue">Overdue</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Due Details Modal */}
      {selectedDue && (
        <Modal
          isOpen={Boolean(selectedDue)}
          onClose={() => setSelectedDue(null)}
          title={`Rent Demand: ${selectedDue.tenant}`}
          subtitle={`${selectedDue.dueMonth} • ${selectedDue.property}`}
          footer={
            <div className="modal-actions-space-between">
              {selectedDue.status !== "Paid" && (
                <button
                  type="button"
                  className="primary-btn success-btn"
                  onClick={() => handleMarkAsPaid(selectedDue.id)}
                >
                  ✓ Mark as Paid
                </button>
              )}
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedDue(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="rent-modal-body">
            <div className="detail-stat-row">
              <div className="detail-box">
                <span>Amount Due</span>
                <strong>₹{selectedDue.amount.toLocaleString("en-IN")}</strong>
              </div>
              <div className="detail-box">
                <span>Due Date</span>
                <strong>{selectedDue.dueDate}</strong>
              </div>
              <div className="detail-box">
                <span>Current Status</span>
                <strong><StatusBadge status={selectedDue.status} /></strong>
              </div>
            </div>

            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Tenant:</span>
                <span className="info-val"><strong>{selectedDue.tenant}</strong></span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Property & Unit:</span>
                <span className="info-val">{selectedDue.property} — {selectedDue.room}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Billing Cycle:</span>
                <span className="info-val">{selectedDue.dueMonth}</span>
              </div>
              {selectedDue.phone && (
                <div className="detail-info-item">
                  <span className="info-label">Contact:</span>
                  <span className="info-val">{selectedDue.phone}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default RentDue;
