import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { formatDate, propertyFilter } from '../api/display';
import StatusBadge from '../components/StatusBadge';
import { loadStayOptions, loadStays } from '../api/dataApi';

async function loadStayPage(signal) {
  const [stays, options] = await Promise.all([loadStays(signal), loadStayOptions(signal)]);
  return { stays, ...options };
}

export default function Stays() {
  return (
    <ApiResourcePage
      title="Stays"
      description="Assign a tenant to an available bed and track their stay."
      loader={loadStayPage}
      addLabel="Record New Stay"
      itemLabel="stays"
      search={{ label: 'Search tenant name, room or property', values: (stay) => [stay.tenant_name, stay.room_number, stay.property_name] }}
      filters={[propertyFilter, { key: 'status', label: 'Stay Status', all: 'All Stays' }]}
      details={{ label: 'Agreement', title: (stay) => `Stay #${stay.id}`, subtitle: (stay) => stay.tenant_name }}
      selectRows={(data) => data.stays}
      columns={[
        { key: 'id', label: 'Stay ID', render: (stay) => <span className="code-badge">stay-{stay.id}</span> },
        { key: 'tenant_name', label: 'Tenant', render: (stay) => <strong>{stay.tenant_name}</strong> },
        { key: 'property_name', label: 'Property' },
        { key: 'room_number', label: 'Room & Bed', render: (stay) => <>{stay.room_number}<small className="resource-secondary">{stay.bed_number}</small></> },
        { key: 'move_in_date', label: 'Move-in Date', render: (stay) => formatDate(stay.move_in_date) },
        { key: 'move_out_date', label: 'Move-out Date', render: (stay) => stay.move_out_date ? formatDate(stay.move_out_date) : 'Ongoing' },
        { key: 'status', label: 'Tenure Status', render: (stay) => <StatusBadge status={stay.status === 'Checked out' ? 'Completed' : stay.status} /> },
      ]}
      fields={[
        {
          name: 'tenantId',
          label: 'Tenant',
          type: 'select',
          options: (data) => data?.tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })) || [],
        },
        {
          name: 'bedId',
          label: 'Available bed',
          type: 'select',
          options: (data) => data?.beds
            .filter((bed) => bed.status === 'Vacant')
            .map((bed) => ({ value: bed.id, label: `${bed.propertyName} — ${bed.roomNumber} — ${bed.bedNumber}` })) || [],
        },
        { name: 'moveInDate', label: 'Move-in date', type: 'date' },
        { name: 'monthlyRent', label: 'Monthly rent (₹)', type: 'number', min: 0.01, step: 0.01 },
      ]}
      createRecord={(values) => staffApi.post('/stays', {
        tenantId: Number(values.tenantId),
        bedId: Number(values.bedId),
        moveInDate: values.moveInDate,
        monthly_rent_paise: Math.round(Number(values.monthlyRent) * 100),
      })}
      rowAction={{
        label: 'Check out',
        when: (stay) => !stay.move_out_date,
        run: (stay) => staffApi.patch(`/stays/${stay.id}/checkout`, {}),
      }}
    />
  );
}
