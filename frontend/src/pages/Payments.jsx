import { useState } from "react";
import { payments as initialPayments, properties } from "../data/mockData";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SearchIcon, PlusIcon, PaymentsIcon } from "../components/Icons";

function Payments() {
  const [paymentsList, setPaymentsList] = useState(initialPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [propertyFilter, setPropertyFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tenant: "",
    property: properties[0]?.name || "Heaven Heights",
    rentMonth: "October 2026",
    amount: 8500,
    paymentDate: "03 Oct 2026",
    paymentMethod: "UPI",
    reference: "",
    status: "Successful",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    const trimmedTenant = formData.tenant.trim();
    if (!trimmedTenant || !formData.amount) return;

    const prop = properties.find((p) => p.name === formData.property) || properties[0];

    const newPayment = {
      id: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant: trimmedTenant,
      rentMonth: formData.rentMonth.trim() || "October 2026",
      amount: Number(formData.amount),
      paymentDate: formData.paymentDate.trim() || "03 Oct 2026",
      paymentMethod: formData.paymentMethod,
      reference: formData.reference.trim() || `TXN_${formData.paymentMethod.toUpperCase()}_${Date.now().toString().slice(-6)}`,
      property: prop.name,
      status: formData.status,
    };

    setPaymentsList([newPayment, ...paymentsList]);
    setIsAddModalOpen(false);
    setFormData({
      tenant: "",
      property: properties[0]?.name || "Heaven Heights",
      rentMonth: "October 2026",
      amount: 8500,
      paymentDate: "03 Oct 2026",
      paymentMethod: "UPI",
      reference: "",
      status: "Successful",
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setMethodFilter("All");
    setPropertyFilter("All");
  };

  const isFiltered =
    searchTerm.trim() !== "" ||
    methodFilter !== "All" ||
    propertyFilter !== "All";

  // Metrics
  const totalCollections = paymentsList.reduce((acc, curr) => acc + curr.amount, 0);
  const upiTotal = paymentsList
    .filter((p) => p.paymentMethod === "UPI")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const bankTotal = paymentsList
    .filter((p) => p.paymentMethod === "Bank Transfer")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const cashTotal = paymentsList
    .filter((p) => p.paymentMethod === "Cash" || p.paymentMethod === "Card")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Filtered Payments
  const filteredPayments = paymentsList.filter((p) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      p.tenant.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      (p.reference && p.reference.toLowerCase().includes(query));
    const matchesMethod =
      methodFilter === "All" || p.paymentMethod === methodFilter;
    const matchesProperty =
      propertyFilter === "All" || p.property === propertyFilter;

    return matchesSearch && matchesMethod && matchesProperty;
  });

  return (
    <section className="page-content" aria-label="Payments Ledger">
      <div className="page-header">
        <div>
          <h2>Payments</h2>
          <p>Transaction records, digital receipts and payment method auditing.</p>
        </div>

        <button
          type="button"
          className="primary-btn cta-btn"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Record new payment"
        >
          <PlusIcon size={16} />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Mini Stats Summary */}
      <div className="stats-grid four-col">
        <div className="stat-card theme-forest">
          <div className="stat-card-header">
            <span className="stat-label">Total Collections</span>
            <div className="stat-icon-badge badge-forest" aria-hidden="true">
              <PaymentsIcon size={16} />
            </div>
          </div>
          <h3 className="stat-value">₹{totalCollections.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">Across {paymentsList.length} transactions</p>
        </div>

        <div className="stat-card theme-green">
          <div className="stat-card-header">
            <span className="stat-label">UPI Collections</span>
            <div className="stat-icon-badge badge-green" aria-hidden="true">
              📱
            </div>
          </div>
          <h3 className="stat-value text-success">₹{upiTotal.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">Instant QR & VPA transfers</p>
        </div>

        <div className="stat-card theme-terracotta">
          <div className="stat-card-header">
            <span className="stat-label">Bank Transfers</span>
            <div className="stat-icon-badge badge-terracotta" aria-hidden="true">
              🏦
            </div>
          </div>
          <h3 className="stat-value text-terracotta">₹{bankTotal.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">NEFT / IMPS settlements</p>
        </div>

        <div className="stat-card theme-amber">
          <div className="stat-card-header">
            <span className="stat-label">Cash & Card</span>
            <div className="stat-icon-badge badge-amber" aria-hidden="true">
              💵
            </div>
          </div>
          <h3 className="stat-value text-warning">₹{cashTotal.toLocaleString("en-IN")}</h3>
          <p className="stat-subtext">POS & physical deposits</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar multi-filter">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            id="payments-search"
            type="text"
            placeholder="Search by Payment ID, tenant name, or transaction reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search payments"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="pay-method-filter">Payment Method:</label>
          <select
            id="pay-method-filter"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="pay-prop-filter">Property:</label>
          <select
            id="pay-prop-filter"
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

        {isFiltered && (
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            title="Reset filters"
            aria-label="Reset all payment filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div className="content-meta-bar">
        <span>Showing {filteredPayments.length} of {paymentsList.length} recorded payments</span>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="No payments match your filter"
          message="No payment transactions found matching your search term or method selection."
          onReset={handleResetFilters}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table" aria-label="Payments Transaction Ledger Table">
              <thead>
                <tr>
                  <th scope="col">Payment ID</th>
                  <th scope="col">Tenant</th>
                  <th scope="col">Rent Month</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment Date</th>
                  <th scope="col">Method</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Status</th>
                  <th scope="col">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code className="code-badge">{p.id}</code>
                    </td>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => setSelectedPayment(p)}
                        title="View receipt"
                      >
                        {p.tenant}
                      </strong>
                      <small className="cell-sub">{p.property}</small>
                    </td>
                    <td>{p.rentMonth}</td>
                    <td>
                      <strong className="rent-amount">₹{p.amount.toLocaleString("en-IN")}</strong>
                    </td>
                    <td>{p.paymentDate}</td>
                    <td>
                      <span className="method-pill">{p.paymentMethod}</span>
                    </td>
                    <td>
                      <small className="mono-ref">{p.reference}</small>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setSelectedPayment(p)}
                        aria-label={`View receipt for payment ${p.id}`}
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-meta">
            Showing {filteredPayments.length} of {paymentsList.length} recorded payments
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Payment"
        subtitle="Log a receipt of rent from a resident"
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
              onClick={handleAddPayment}
            >
              Save Payment
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddPayment} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pay-tenant-input">Tenant Name *</label>
              <input
                id="pay-tenant-input"
                type="text"
                name="tenant"
                placeholder="e.g. Rahul Sharma"
                value={formData.tenant}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pay-property-select">Property</label>
              <select
                id="pay-property-select"
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pay-month-input">Rent Month</label>
              <input
                id="pay-month-input"
                type="text"
                name="rentMonth"
                placeholder="e.g. October 2026"
                value={formData.rentMonth}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pay-amount-input">Amount Collected (₹) *</label>
              <input
                id="pay-amount-input"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pay-method-select">Payment Method</label>
              <select
                id="pay-method-select"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pay-date-input">Payment Date</label>
              <input
                id="pay-date-input"
                type="text"
                name="paymentDate"
                placeholder="e.g. 03 Oct 2026"
                value={formData.paymentDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pay-reference-input">Transaction / Reference ID</label>
            <input
              id="pay-reference-input"
              type="text"
              name="reference"
              placeholder="e.g. UPI/294829104821 or NEFT/SBIN004819"
              value={formData.reference}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>
        </form>
      </Modal>

      {/* Payment Receipt Modal */}
      {selectedPayment && (
        <Modal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          title="Payment Receipt"
          subtitle={`Receipt Reference: ${selectedPayment.id}`}
          footer={
            <div className="modal-actions-space-between">
              <button
                type="button"
                className="outline-btn"
                onClick={() => window.print && window.print()}
              >
                🖨 Print Receipt
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedPayment(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div className="receipt-box">
            <div className="receipt-header">
              <div>
                <h3>HevenOps Co-Living</h3>
                <p>Official Rent Receipt</p>
              </div>
              <StatusBadge status={selectedPayment.status} />
            </div>

            <div className="receipt-divider" />

            <div className="receipt-row">
              <span>Receipt No:</span>
              <strong>{selectedPayment.id}</strong>
            </div>
            <div className="receipt-row">
              <span>Received From:</span>
              <strong>{selectedPayment.tenant}</strong>
            </div>
            <div className="receipt-row">
              <span>Property:</span>
              <span>{selectedPayment.property}</span>
            </div>
            <div className="receipt-row">
              <span>Billing Period:</span>
              <span>{selectedPayment.rentMonth}</span>
            </div>
            <div className="receipt-row">
              <span>Payment Date:</span>
              <span>{selectedPayment.paymentDate}</span>
            </div>
            <div className="receipt-row">
              <span>Payment Mode:</span>
              <span>{selectedPayment.paymentMethod}</span>
            </div>
            <div className="receipt-row">
              <span>Reference / Txn:</span>
              <span className="mono-ref">{selectedPayment.reference}</span>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-total-row">
              <span>Total Amount Paid:</span>
              <strong className="receipt-amount">₹{selectedPayment.amount?.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Payments;
