import { useOutletContext } from 'react-router-dom';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadSpends, loadProperties } from '../api/dataApi';

import { propertyOptions, propertyFilter } from '../api/display';
import { useAuth } from '../context/useAuth';

async function loadSpending(signal) {
  const [properties, spends] = await Promise.all([loadProperties(signal), loadSpends(signal)]);
  return { properties, spends: spends.map((spend) => ({ ...spend, propertyId: spend.property_id, property: properties.find((property) => property.id === spend.property_id)?.name })) };
}

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
  const role = useAuth().user?.role;
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
      loader={loadSpending}
      selectRows={(data) => data.spends}
      addLabel="Add Spend"
      search={{ label: 'Search spend descriptions', values: (spend) => [spend.description, spend.property] }}
      filters={[propertyFilter]}
      columns={[
        { key: 'property', label: 'Property', render: (spend) => spend.property || 'Organization' },
        { key: 'description', label: 'Description', render: (spend) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{spend.description}</span> },
        { key: 'amount_paise', label: 'Amount', render: (spend) => formatAmount(spend.amount_paise) },
        { key: 'created_at', label: 'Recorded on', render: (spend) => recordedDate.format(new Date(spend.created_at)) },
      ]}
      fields={[
        { name: 'propertyId', label: 'Property', type: 'select', options: propertyOptions, required: role === 'manager' },
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
        ...(values.propertyId && { propertyId: values.propertyId }),
      }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })}
    />
  );
}
