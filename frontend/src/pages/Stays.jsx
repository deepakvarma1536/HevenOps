import { useState } from 'react';
import PlannedMoveOutDialog from '../components/PlannedMoveOutDialog';
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
  const [notice, setNotice] = useState(null);

  return (
    <>
    <ApiResourcePage
      title="Stays"
      description="Assign beds, track stays, and record upcoming move-outs."
      loader={loadStayPage}
      addLabel="Record New Stay"
      itemLabel="stays"
      search={{ label: 'Search tenant name, room or property', values: (stay) => [stay.tenant_name, stay.room_number, stay.property_name] }}
      filters={[propertyFilter, { key: 'status', label: 'Stay Status', all: 'All Stays' }]}
      details={{ label: 'Agreement', title: (stay) => `Stay #${stay.id}`, subtitle: (stay) => stay.tenant_name }}
      selectRows={(data) => data.stays}
      actions={(stay, _data, retry) => stay.status === 'Active' && (
        <button type="button" className="table-action-btn" onClick={() => setNotice({ stay, retry })}>
          {stay.planned_move_out_date ? 'Edit Move-out Notice' : 'Plan Move-out'}
        </button>
      )}
      columns={[
        { key: 'id', label: 'Stay ID', render: (stay) => <span className="code-badge">stay-{stay.id}</span> },
        { key: 'tenant_name', label: 'Tenant', render: (stay) => <strong>{stay.tenant_name}</strong> },
        { key: 'property_name', label: 'Property' },
        { key: 'room_number', label: 'Room & Bed', render: (stay) => <>{[stay.apartment_name, stay.room_number].filter(Boolean).join(' · ')}<small className="resource-secondary">{stay.bed_number}</small></> },
        { key: 'move_in_date', label: 'Move-in Date', render: (stay) => formatDate(stay.move_in_date) },
        { key: 'planned_move_out_date', label: 'Planned Move-out', render: (stay) => formatDate(stay.planned_move_out_date) },
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
            .map((bed) => ({ value: bed.id, label: [bed.propertyName, bed.apartment && bed.floor, bed.apartment, bed.roomNumber, bed.bedNumber].filter(Boolean).join(' — ') })) || [],
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
    {notice && <PlannedMoveOutDialog stay={notice.stay} onClose={() => setNotice(null)}
      onSaved={async () => {
        await notice.retry();
        setNotice(null);
      }} />}
    </>
  );
}
