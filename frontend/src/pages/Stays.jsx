import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadStayOptions, loadStays } from '../api/dataApi';

async function loadStayPage() {
  const [stays, options] = await Promise.all([loadStays(), loadStayOptions()]);
  return { stays, ...options };
}

export default function Stays() {
  return (
    <ApiResourcePage
      title="Stays"
      description="Assign a tenant to an available bed and track their stay."
      loader={loadStayPage}
      selectRows={(data) => data.stays}
      columns={[
        { key: 'tenant_name', label: 'Tenant' },
        { key: 'property_name', label: 'Property' },
        { key: 'room_number', label: 'Room' },
        { key: 'bed_number', label: 'Bed' },
        { key: 'move_in_date', label: 'Move-in' },
        { key: 'status', label: 'Status' },
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
