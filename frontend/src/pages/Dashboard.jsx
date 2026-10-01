import {
  dashboardMetrics,
  properties,
  tenants,
  payments,
  rentDues,
} from "../data/mockData";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import {
  PropertiesIcon,
  RoomsIcon,
  BedsIcon,
  TenantsIcon,
  RentDueIcon,
  TrendingUpIcon,
  ArrowRightIcon,
} from "../components/Icons";

function Dashboard({ onNavigate }) {
  const recentTenants = tenants.slice(0, 5);
  const recentPayments = payments.slice(0, 5);
  const urgentDues = rentDues.filter((d) => d.status === "Overdue" || d.status === "Due").slice(0, 4);

  const getOccupancyColorClass = (rate) => {
    if (rate >= 80) return "fill-forest";
    if (rate >= 70) return "fill-green";
    if (rate >= 50) return "fill-amber";
    return "fill-terracotta";
  };

  return (
    <section className="page-content dashboard-page" aria-label="Dashboard Overview">
      {/* Top 8 Stat Cards with Warm + Forest SaaS Theme */}
      <div className="stats-grid">
        <StatCard
          title="Total Properties"
          value={dashboardMetrics.properties}
          subtext="3 Active PG branches"
          icon={<PropertiesIcon size={18} />}
          colorTheme="forest"
        />
        <StatCard
          title="Total Rooms"
          value={dashboardMetrics.rooms}
          subtext="Across all floors"
          icon={<RoomsIcon size={18} />}
          colorTheme="sage"
        />
        <StatCard
          title="Total Beds"
          value={dashboardMetrics.beds}
          subtext="Total bed capacity"
          icon={<BedsIcon size={18} />}
          colorTheme="terracotta"
        />
        <StatCard
          title="Occupied Beds"
          value={dashboardMetrics.occupied}
          subtext={`${dashboardMetrics.occupancyPercentage}% overall occupancy`}
          icon={<BedsIcon size={18} />}
          colorTheme="green"
        />
        <StatCard
          title="Vacant Beds"
          value={dashboardMetrics.vacant}
          subtext="Available for allocation"
          icon={<BedsIcon size={18} />}
          colorTheme="amber"
        />
        <StatCard
          title="Total Tenants"
          value={dashboardMetrics.tenants}
          subtext="Registered active residents"
          icon={<TenantsIcon size={18} />}
          colorTheme="terracotta"
        />
        <StatCard
          title="Pending Rent"
          value={dashboardMetrics.pendingRent}
          subtext="Awaiting collection"
          icon={<RentDueIcon size={18} />}
          colorTheme="amber"
        />
        <StatCard
          title="Monthly Revenue"
          value={dashboardMetrics.monthlyRevenue}
          subtext="Estimated October 2026"
          icon={<TrendingUpIcon size={18} />}
          trend={{ positive: true, text: "+8.4% vs last month" }}
          colorTheme="forest"
        />
      </div>

      {/* Occupancy Overview & Rent Due Summary Grid */}
      <div className="dashboard-grid">
        {/* Occupancy Overview Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Occupancy Overview</h3>
              <p>Live bed capacity and branch utilization</p>
            </div>
            <button
              type="button"
              className="outline-btn link-action-btn"
              onClick={() => onNavigate && onNavigate("Beds")}
              aria-label="Manage individual bed allocations"
            >
              <span>Manage Beds</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          <div className="occupancy-highlight-box">
            <div className="overall-rate">
              <span className="big-rate">{dashboardMetrics.occupancyPercentage}%</span>
              <div>
                <strong>Overall Occupancy Rate</strong>
                <p>{dashboardMetrics.occupied} occupied / {dashboardMetrics.vacant} vacant of {dashboardMetrics.beds} total beds</p>
              </div>
            </div>
            <div
              className="progress-bar lg"
              role="progressbar"
              aria-valuenow={dashboardMetrics.occupancyPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Overall occupancy rate"
            >
              <div
                className="progress-fill fill-gradient"
                style={{ width: `${dashboardMetrics.occupancyPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="property-occupancy-list">
            {properties.map((p) => {
              const occ = Math.round((p.occupied / p.beds) * 100);
              const colorClass = getOccupancyColorClass(occ);

              return (
                <div
                  key={p.id}
                  className="prop-occ-row clickable-prop-row"
                  onClick={() => onNavigate && onNavigate("Properties")}
                  title={`View details for ${p.name}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onNavigate) onNavigate("Properties");
                    }
                  }}
                >
                  <div className="prop-occ-header">
                    <strong>{p.name}</strong>
                    <span className="prop-occ-pct">
                      {p.occupied}/{p.beds} beds (<strong>{occ}%</strong>)
                    </span>
                  </div>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={occ}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${p.name} occupancy rate`}
                  >
                    <div
                      className={`progress-fill ${colorClass}`}
                      style={{ width: `${occ}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rent Dues Alert Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Rent Receivables & Dues</h3>
              <p>Upcoming and overdue collections</p>
            </div>
            <button
              type="button"
              className="outline-btn link-action-btn"
              onClick={() => onNavigate && onNavigate("Rent Due")}
              aria-label="View all rent receivables and dues"
            >
              <span>View All Dues</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          <div className="rent-summary-bars">
            <div className="rent-stat-box theme-forest">
              <span className="stat-muted">Total Due</span>
              <strong className="stat-num">₹2,85,000</strong>
            </div>
            <div className="rent-stat-box theme-green">
              <span className="stat-muted">Paid</span>
              <strong className="stat-num text-success">₹1,60,500</strong>
            </div>
            <div className="rent-stat-box theme-amber">
              <span className="stat-muted">Pending</span>
              <strong className="stat-num text-warning">₹78,000</strong>
            </div>
            <div className="rent-stat-box theme-terracotta">
              <span className="stat-muted">Overdue</span>
              <strong className="stat-num text-danger">₹46,500</strong>
            </div>
          </div>

          <div className="urgent-dues-list">
            <h4>Action Needed: Pending Collections</h4>
            {urgentDues.map((item) => (
              <div
                key={item.id}
                className="urgent-due-item clickable-due-item"
                onClick={() => onNavigate && onNavigate("Rent Due")}
                title={`Go to Rent Due for ${item.tenant}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (onNavigate) onNavigate("Rent Due");
                  }
                }}
              >
                <div>
                  <strong>{item.tenant}</strong>
                  <small>
                    {item.property} • {item.room}
                  </small>
                </div>
                <div className="due-amount-badge">
                  <span className="amount">₹{item.amount.toLocaleString("en-IN")}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Tables: Recent Tenants & Recent Payments */}
      <div className="dashboard-grid">
        {/* Recent Tenants */}
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Recent Tenants</h3>
              <p>Recently onboarded residents</p>
            </div>
            <button
              type="button"
              className="outline-btn link-action-btn"
              onClick={() => onNavigate && onNavigate("Tenants")}
              aria-label="View full tenants directory"
            >
              <span>All Tenants</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="compact-table" aria-label="Recent Tenants Table">
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  <th scope="col">Property / Room</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Rent</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => onNavigate && onNavigate("Tenants")}
                        title="View tenant profile"
                      >
                        {t.name}
                      </strong>
                      <small className="cell-sub">{t.phone}</small>
                    </td>
                    <td>
                      <div>{t.property}</div>
                      <small className="cell-sub">{t.room} • {t.bed}</small>
                    </td>
                    <td>{t.moveInDate}</td>
                    <td>
                      <StatusBadge status={t.rentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h3>Recent Payments</h3>
              <p>Latest payment receipts received</p>
            </div>
            <button
              type="button"
              className="outline-btn link-action-btn"
              onClick={() => onNavigate && onNavigate("Payments")}
              aria-label="View all payments ledger"
            >
              <span>All Payments</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="compact-table" aria-label="Recent Payments Table">
              <thead>
                <tr>
                  <th scope="col">Tenant</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Method</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong
                        className="clickable-text"
                        onClick={() => onNavigate && onNavigate("Payments")}
                        title="View payment record"
                      >
                        {p.tenant}
                      </strong>
                      <small className="cell-sub">{p.property}</small>
                    </td>
                    <td>
                      <strong className="rent-amount">₹{p.amount.toLocaleString("en-IN")}</strong>
                    </td>
                    <td>
                      <span className="method-pill">{p.paymentMethod}</span>
                    </td>
                    <td>{p.paymentDate}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
