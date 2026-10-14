import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadRentDues } from '../api/dataApi';

export default function RentDue() {
  return (
    <ApiResourcePage
      title="Rent dues"
      description="Create and review rent dues for active tenant stays."
      loader={loadRentDues}
      selectRows={(data) => data.dues}
      columns={[
        { key: 'tenant', label: 'Tenant' },
        { key: 'property', label: 'Property' },
        { key: 'room', label: 'Room / bed' },
        { key: 'dueMonth', label: 'Month' },
        { key: 'dueDate', label: 'Due date' },
        { key: 'amount', label: 'Due (₹)', render: (due) => due.amount.toLocaleString('en-IN') },
        { key: 'amountPaid', label: 'Paid (₹)', render: (due) => due.amountPaid.toLocaleString('en-IN') },
        { key: 'status', label: 'Status' },
      ]}
      fields={[
        {
          name: 'stayId',
          label: 'Tenant stay',
          type: 'select',
          options: (data) => data?.stays
            .filter((stay) => stay.status === 'Active')
            .map((stay) => ({ value: stay.id, label: `${stay.tenant} — ${stay.property} — ${stay.room}` })) || [],
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
