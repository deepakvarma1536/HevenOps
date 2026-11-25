import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { RentDueIcon } from '../components/Icons';
import { formatDate, money, propertyFilter, statusFilter } from '../api/display';
import ApiResourcePage from '../components/ApiResourcePage';
import StatusBadge from '../components/StatusBadge';
import { staffApi } from '../api/client';
import { loadRentDues } from '../api/dataApi';

export default function RentDue() {
  return (
    <ApiResourcePage
      title="Rent Due"
      addLabel="Add Rent Demand"
      itemLabel="rent demands"
      headerAction={<Link className="outline-btn" to="/payments">View Payments Ledger →</Link>}
      search={{ label: 'Search tenant name or room number', values: (due) => [due.tenant, due.room, due.phone] }}
      filters={[propertyFilter, statusFilter, { key: 'dueMonth', label: 'Month', all: 'All Months' }]}
      details={{ label: 'Details', title: (due) => `${due.tenant} · ${due.dueMonth}`, render: (due) => (
        <dl className="detail-info-list">
          {[
            ['Property', due.property], ['Room / bed', due.room], ['Due date', formatDate(due.dueDate)],
            ['Amount', money(due.amount)], ['Paid', money(due.amountPaid)], ['Outstanding', money(due.remainingAmount)],
            ['Status', due.status],
          ].map(([label, value]) => <div className="detail-info-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      ) }}
      actions={(due) => due.remainingAmount > 0 && (
        <Link className="table-action-btn payment-action" to={`/payments?rentDueId=${due.id}&amount=${due.remainingAmount}`}>Mark Paid</Link>
      )}
      summary={(_data, dues) => (
        <div className="stats-grid finance-stats">
          {[
            ['Total Due (All)', 'forest', dues.reduce((sum, due) => sum + due.amount, 0)],
            ['Paid Received', 'green', dues.reduce((sum, due) => sum + due.amountPaid, 0)],
            ['Pending Collection', 'amber', dues.filter((due) => due.status !== 'Overdue').reduce((sum, due) => sum + due.remainingAmount, 0)],
            ['Overdue Outstanding', 'red', dues.filter((due) => due.status === 'Overdue').reduce((sum, due) => sum + due.remainingAmount, 0)],
          ].map(([title, color, value]) => <StatCard key={title} title={title} value={money(value)} colorTheme={color} icon={<RentDueIcon size={16} />} />)}
        </div>
      )}
      description="Rent is charged every 30 days from move-in. Unpaid balances become overdue after the due date."
      loader={loadRentDues}
      selectRows={(data) => data.dues}
      columns={[
        { key: 'tenant', label: 'Resident', render: (due) => <><strong>{due.tenant}</strong><small className="resource-secondary">{due.phone}</small></> },
        { key: 'roomNumber', label: 'Room' },
        { key: 'property', label: 'Property' },
        { key: 'dueMonth', label: 'Due Month', render: (due) => <>{due.dueMonth}{due.billing_cycle && <small className="resource-secondary">Cycle {due.billing_cycle}</small>}</> },
        { key: 'amount', label: 'Amount', render: (due) => <strong>{money(due.amount)}</strong> },
        { key: 'dueDate', label: 'Due Date', render: (due) => formatDate(due.dueDate) },
        { key: 'status', label: 'Status', render: (due) => <StatusBadge status={due.status} /> },
      ]}
      fields={[
        {
          name: 'stayId',
          label: 'Tenant stay',
          type: 'select',
          options: (data) => data?.stays
            .filter((stay) => stay.status === 'Active')
            .map((stay) => ({ value: stay.id, label: `${stay.tenant_name} — ${stay.property_name} — ${stay.room_number}` })) || [],
        },
        { name: 'dueMonth', label: 'Rent month', type: 'month' },
        { name: 'amount', label: 'Amount (₹)', type: 'number', min: 0.01, step: 0.01 },
        { name: 'dueDate', label: 'Due date', type: 'date' },
      ]}
      createRecord={(values) => staffApi.post('/rent-dues', {
        stayId: Number(values.stayId),
        dueMonth: `${values.dueMonth}-01`,
        amount_paise: Math.round(Number(values.amount) * 100),
        dueDate: values.dueDate,
      })}
    />
  );
}
