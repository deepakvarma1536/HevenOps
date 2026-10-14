import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadPayments } from '../api/dataApi';

export default function Payments() {
  return (
    <ApiResourcePage
      title="Payments"
      description="Record a payment against an outstanding rent due and review payment history."
      loader={loadPayments}
      selectRows={(data) => data.payments}
      columns={[
        { key: 'tenant', label: 'Tenant' },
        { key: 'rentMonth', label: 'Rent month' },
        { key: 'payment_date', label: 'Payment date' },
        { key: 'amount', label: 'Amount (₹)', render: (payment) => payment.amount.toLocaleString('en-IN') },
        { key: 'payment_method', label: 'Method' },
        { key: 'reference', label: 'Reference' },
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
              label: `${due.tenant} — ${due.dueMonth} — ₹${due.remainingAmount.toLocaleString('en-IN')} remaining`,
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
        reference: values.reference.trim() || null,
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
