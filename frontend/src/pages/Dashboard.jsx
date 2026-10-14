import { Link } from 'react-router-dom';
import AsyncState from '../components/AsyncState';
import useAsyncResource from '../hooks/useAsyncResource';
import { loadBeds, loadPayments, loadProperties, loadTenants } from '../api/dataApi';

async function loadDashboard() {
  const [properties, { beds }, tenants, billing] = await Promise.all([
    loadProperties(),
    loadBeds(),
    loadTenants(),
    loadPayments(),
  ]);
  const occupied = beds.filter((bed) => bed.status === 'Occupied').length;
  const totalRentDue = billing.dues.reduce((total, due) => total + due.amount, 0);
  const outstanding = billing.dues.reduce((total, due) => total + due.remainingAmount, 0);
  const collections = billing.payments.reduce((total, payment) => total + payment.amount, 0);
  return {
    propertyCount: properties.length,
    bedCount: beds.length,
    occupiedCount: occupied,
    tenantCount: tenants.length,
    totalRentDue,
    outstanding,
    collections,
  };
}

function Dashboard() {
  const { data, loading, error, retry } = useAsyncResource(loadDashboard);

  return (
    <section className="page-content dashboard-page" aria-label="Dashboard Overview">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Current organization activity and rent collection summary.</p>
        </div>
      </div>
      <AsyncState loading={loading} error={error} onRetry={retry} loadingMessage="Loading organization summary...">
        <div className="stats-grid">
          <Metric title="Properties" value={data?.propertyCount ?? 0} link="/properties" />
          <Metric title="Beds" value={data?.bedCount ?? 0} link="/beds" />
          <Metric title="Occupied beds" value={data?.occupiedCount ?? 0} link="/beds" />
          <Metric title="Tenants" value={data?.tenantCount ?? 0} link="/tenants" />
          <Metric title="Rent due" value={formatCurrency(data?.totalRentDue)} link="/rent-dues" />
          <Metric title="Outstanding" value={formatCurrency(data?.outstanding)} link="/rent-dues" />
          <Metric title="Payments received" value={formatCurrency(data?.collections)} link="/payments" />
        </div>
      </AsyncState>
    </section>
  );
}

function Metric({ title, value, link }) {
  return (
    <Link className="card dashboard-metric" to={link}>
      <h3>{title}</h3>
      <p className="big-value">{value}</p>
    </Link>
  );
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export default Dashboard;
