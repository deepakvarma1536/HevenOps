import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import AsyncState from '../components/AsyncState';
import { BedsIcon, PaymentsIcon, PropertiesIcon, RentDueIcon, TenantsIcon } from '../components/Icons';
import { Occupancy } from '../components/InventoryCard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import useAsyncResource from '../hooks/useAsyncResource';
import { useAuth } from '../context/useAuth';
import { loadBeds, loadPayments, loadStays, loadTenants } from '../api/dataApi';
import { formatDate, money } from '../api/display';

function DashboardPanel({ title, subtitle, link, label, children }) {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div><h3>{title}</h3><p>{subtitle}</p></div>
        {link && <Link className="outline-btn" to={link}>{label} →</Link>}
      </div>
      {children}
    </section>
  );
}

function DashboardTable({ labels, rows, empty }) {
  if (!rows.length) return <p className="resource-secondary">{empty}</p>;
  return (
    <div className="table-responsive">
      <table className="compact-table">
        <thead><tr>{labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ id, cells }) => <tr key={id}>{cells.map((cell, index) => <td key={labels[index]}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const role = useAuth().user?.role;
  const finance = role === 'owner' || role === 'manager';
  const loader = useCallback(async (signal) => {
    const [{ properties, beds }, tenants, billing] = await Promise.all([
      loadBeds(signal),
      loadTenants(signal),
      finance ? loadPayments(signal) : loadStays(signal).then((stays) => ({ stays, dues: [], payments: [] })),
    ]);
    return { ...billing, properties, beds, tenants };
  }, [finance]);
  const { data, loading, error, retry } = useAsyncResource(loader);
  const { properties = [], beds = [], tenants = [], dues = [], payments = [], stays = [] } = data || {};
  const outstanding = dues.filter((due) => due.remainingAmount > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const latestStays = [...stays].sort((a, b) => (b.created_at || b.move_in_date).localeCompare(a.created_at || a.move_in_date));
  const latestPayments = [...payments].sort((a, b) => (b.created_at || b.payment_date).localeCompare(a.created_at || a.payment_date));
  const metrics = [
    ['Properties', properties.length, '/properties', PropertiesIcon, 'forest'],
    ['Occupied Beds', `${beds.filter((bed) => bed.status === 'Occupied').length} / ${beds.length}`, '/beds', BedsIcon, 'green'],
    ['Tenants', tenants.length, '/tenants', TenantsIcon, 'terracotta'],
  ];
  if (finance) metrics.push(
    ['Outstanding Rent', money(outstanding.reduce((sum, item) => sum + item.remainingAmount, 0)), '/rent-dues', RentDueIcon, 'amber'],
    ['Payments Received', money(payments.reduce((sum, item) => sum + item.netAmount, 0)), '/payments', PaymentsIcon, 'green'],
  );

  return (
    <section className="page-content dashboard-page" aria-label="Dashboard Overview">
      <div className="page-header"><div><h2>Dashboard</h2><p>Current occupancy, residents and rent collection.</p></div></div>
      <AsyncState loading={loading} error={error} onRetry={retry}>
        <div className="stats-grid dashboard-stats">
          {metrics.map(([title, value, link, Icon, color]) => (
            <Link className="dashboard-metric" key={title} to={link}><StatCard title={title} value={value} icon={<Icon />} colorTheme={color} /></Link>
          ))}
        </div>
        <div className="dashboard-grid">
          <DashboardPanel title="Property Occupancy" subtitle="Bed allocation across your properties" link="/properties" label="All Properties">
            {properties.map((property) => {
              const propertyBeds = beds.filter((bed) => bed.propertyId === property.id);
              return <Occupancy key={property.id} label={property.name} occupied={propertyBeds.filter((bed) => bed.status === 'Occupied').length} total={propertyBeds.length} />;
            })}
            {!properties.length && <p className="resource-secondary">No properties yet.</p>}
          </DashboardPanel>
          {finance && <DashboardPanel title="Outstanding Rent" subtitle="Balances by due date" link="/rent-dues" label="All Dues">
            <ul className="dashboard-dues">
              {outstanding.slice(0, 5).map((due) => (
                <li key={due.id}>
                  <div><strong>{due.tenant}</strong><small className="resource-secondary">{due.property} · {due.room}</small></div>
                  <strong>{money(due.remainingAmount)}</strong><StatusBadge status={due.status} />
                </li>
              ))}
            </ul>
            {!outstanding.length && <p className="resource-secondary">No outstanding rent.</p>}
          </DashboardPanel>}
          <DashboardPanel title="Recent Tenants" subtitle="Recently recorded stays" link="/tenants" label="All Tenants">
            <DashboardTable labels={['Tenant', 'Property / Room', 'Joined', ...(finance ? ['Rent'] : [])]} empty="No stays recorded yet." rows={
              latestStays.filter((stay, index, rows) => rows.findIndex((record) => record.tenant_id === stay.tenant_id) === index).slice(0, 5).map((stay) => {
                const statuses = dues.filter((due) => due.stayId === stay.id).map((due) => due.status);
                const status = ['Overdue', 'Partial', 'Due', 'Paid'].find((status) => statuses.includes(status));
                return { id: stay.id, cells: [
                  <><strong>{stay.tenant_name}</strong><small className="resource-secondary">{stay.tenant_phone}</small></>,
                  <>{stay.property_name}<small className="resource-secondary">{stay.room_number} · {stay.bed_number}</small></>,
                  formatDate(stay.move_in_date),
                  ...(finance ? [status ? <StatusBadge status={status} /> : '—'] : []),
                ] };
              })
            } />
          </DashboardPanel>
          {finance && <DashboardPanel title="Recent Payments" subtitle="Latest payment records" link="/payments" label="All Payments">
            <DashboardTable labels={['Tenant', 'Amount', 'Method', 'Date', 'Status']} empty="No payments recorded yet." rows={
              latestPayments.slice(0, 5).map((item) => ({ id: item.id, cells: [
                <><strong>{item.tenant}</strong><small className="resource-secondary">{item.property}</small></>,
                <strong>{money(item.amount)}</strong>, item.payment_method?.replaceAll('_', ' ') || '—',
                formatDate(item.payment_date), <StatusBadge status={item.status} />,
              ] }))
            } />
          </DashboardPanel>}
        </div>
      </AsyncState>
    </section>
  );
}
