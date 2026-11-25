import { useNavigate, useSearchParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { PaymentsIcon } from '../components/Icons';
import { formatDate, money, propertyFilter } from '../api/display';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadPayments } from '../api/dataApi';

export default function Payments() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dueId = params.get('rentDueId');
  return (
    <ApiResourcePage
      key={dueId || 'payments'}
      title="Payments"
      description="Record a payment against an outstanding rent due and review payment history."
      loader={loadPayments}
      addLabel="Record Payment"
      itemLabel="recorded payments"
      onFormComplete={dueId ? () => navigate('/payments', { replace: true }) : undefined}
      initialValues={dueId ? { rentDueId: dueId, amount: params.get('amount') || '' } : undefined}
      search={{ label: 'Search payment ID, tenant name or reference', values: (payment) => [`PAY-${payment.id}`, payment.tenant, payment.reference] }}
      filters={[
        { key: 'payment_method', label: 'Payment Method', all: 'All Methods',
          options: (_data, rows) => [...new Set(rows.map((row) => row.payment_method).filter(Boolean))].map((method) => ({ value: method, label: method.replaceAll('_', ' ') })) },
        propertyFilter,
      ]}
      details={{ label: 'Receipt', heading: 'Receipt', title: (payment) => `Payment receipt · PAY-${payment.id}`,
        subtitle: (payment) => payment.property }}
      summary={(_data, payments) => {
        const total = (methods) => payments.filter((payment) => !methods || methods.includes(payment.payment_method)).reduce((sum, payment) => sum + payment.netAmount, 0);
        return (
          <div className="stats-grid finance-stats">
            {[
              ['Total Collections', 'forest', total(), `Across ${payments.length} transactions`],
              ['UPI Collections', 'green', total(['UPI'])],
              ['Bank Transfers', 'terracotta', total(['BANK_TRANSFER'])],
              ['Cash & Card', 'amber', total(['CASH', 'CARD'])],
            ].map(([title, color, value, subtext]) => <StatCard key={title} title={title} value={money(value)} subtext={subtext} colorTheme={color} icon={<PaymentsIcon size={16} />} />)}
          </div>
        );
      }}
      selectRows={(data) => data.payments}
      columns={[
        { key: 'id', label: 'Payment ID', render: (payment) => <span className="code-badge">PAY-{payment.id}</span> },
        { key: 'tenant', label: 'Tenant', render: (payment) => <><strong>{payment.tenant}</strong><small className="resource-secondary">{payment.property}</small></> },
        { key: 'rentMonth', label: 'Rent Month' },
        { key: 'amount', label: 'Amount', render: (payment) => <strong>{money(payment.amount)}</strong> },
        { key: 'payment_date', label: 'Payment Date', render: (payment) => formatDate(payment.payment_date) },
        { key: 'payment_method', label: 'Method', render: (payment) => payment.payment_method ? <span className="code-badge">{payment.payment_method.replaceAll('_', ' ')}</span> : '—' },
        { key: 'reference', label: 'Reference' },
        { key: 'status', label: 'Status', render: (payment) => <StatusBadge status={payment.status} /> },
      ]}
      fields={[
        {
          name: 'rentDueId',
          label: 'Outstanding rent due',
          type: 'select',
          options: (data) => data?.dues
            .filter((due) => due.remainingAmount > 0)
            .map((due) => ({
              value: due.id,
              label: `${due.tenant} — ${due.dueMonth}${due.billing_cycle ? ` · Cycle ${due.billing_cycle}` : ''} — ₹${due.remainingAmount.toLocaleString('en-IN')} remaining`,
            })) || [],
        },
        {
          name: 'amount',
          label: 'Payment amount (₹)',
          type: 'number',
          min: 0.01,
          max: (data, values) => {
            const due = data?.dues.find((item) => String(item.id) === values.rentDueId);
            return due?.remainingAmount;
          },
          step: 0.01,
        },
        {
          name: 'payment_method',
          label: 'Payment method',
          type: 'select',
          options: ['UPI', 'CASH', 'BANK_TRANSFER', 'CARD'].map((method) => ({ value: method, label: method.replaceAll('_', ' ') })),
        },
        { name: 'reference', label: 'Reference (optional)', maxLength: 100, required: false },
      ]}
      requiresIdempotencyKey
      createRecord={(values, _data, idempotencyKey) => staffApi.post('/payments', {
        rentDueId: Number(values.rentDueId),
        amount_paise: Math.round(Number(values.amount) * 100),
        payment_method: values.payment_method,
        reference: values.reference?.trim() || null,
      }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })}
      validate={(values, data) => {
        const due = data?.dues.find((item) => String(item.id) === values.rentDueId);
        if (!due) return 'Select an outstanding rent due.';
        if (Number(values.amount) > due.remainingAmount) return `Payment cannot exceed the remaining balance of ₹${due.remainingAmount.toLocaleString('en-IN')}.`;
        return '';
      }}
    />
  );
}
