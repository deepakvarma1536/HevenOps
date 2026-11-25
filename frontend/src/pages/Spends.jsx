import { useOutletContext } from 'react-router-dom';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadSpends } from '../api/dataApi';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const recordedDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

function parsePaise(amount) {
  const parts = /^(\d*)(?:\.(\d{0,2}))?$/.exec(amount.trim());
  if (!parts) return NaN;
  const [, rupees, paise = ''] = parts;
  return Number(rupees + paise.padEnd(2, '0'));
}

function formatAmount(amountPaise) {
  const digits = String(amountPaise).padStart(3, '0');
  return currency.format(`${digits.slice(0, -2)}.${digits.slice(-2)}`);
}

export default function Spends() {
  const { canManageSpends } = useOutletContext();
  if (!canManageSpends) {
    return (
      <section className="page-content">
        <p role="alert">Only organization owners and managers can access spends.</p>
      </section>
    );
  }

  return (
    <ApiResourcePage
      title="Spends"
      description="Record expenses and review your organization's spending history."
      loader={loadSpends}
      columns={[
        { key: 'description', label: 'Description', render: (spend) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{spend.description}</span> },
        { key: 'amount_paise', label: 'Amount', render: (spend) => formatAmount(spend.amount_paise) },
        { key: 'created_at', label: 'Recorded on', render: (spend) => recordedDate.format(new Date(spend.created_at)) },
      ]}
      fields={[
        { name: 'amount', label: 'Amount (₹)', inputMode: 'decimal' },
        { name: 'description', label: 'Description', type: 'textarea', maxLength: 500 },
      ]}
      validate={(values) => {
        const amountPaise = parsePaise(values.amount);
        return Number.isSafeInteger(amountPaise) && amountPaise > 0
          ? ''
          : 'Enter a positive rupee amount with up to two decimal places.';
      }}
      requiresIdempotencyKey
      createRecord={(values, _data, idempotencyKey) => staffApi.post('/spends', {
        amount_paise: parsePaise(values.amount),
        description: values.description.trim(),
      }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })}
    />
  );
}
