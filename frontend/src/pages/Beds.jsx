import { useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { formatDate, money, propertyFilter, statusFilter } from '../api/display';
import { useAuth } from '../context/useAuth';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadBedDirectory } from '../api/dataApi';

function roomOptions(data) {
  if (!data) return [];
  const bedCounts = new Map();
  for (const bed of data.beds) {
    bedCounts.set(bed.roomId, (bedCounts.get(bed.roomId) || 0) + 1);
  }
  return data.rooms.map((room) => {
    const count = bedCounts.get(room.id) || 0;
    const full = room.bed_capacity != null && count >= room.bed_capacity;
    const name = `${room.propertyName} — ${room.floor} — ${room.roomNumber}`;
    return {
      value: room.id,
      label: full ? `${name} (Full, ${count}/${room.bed_capacity} beds)` : name,
      disabled: full,
    };
  });
}

export default function Beds() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  return (
    <ApiResourcePage
      title="Beds"
      description="Use unique bed numbers across the property."
      loader={loadBedDirectory}
      addLabel="Add Bed"
      search={{ label: 'Search bed, room number or resident', values: (bed) => [bed.bedNumber, bed.roomNumber, bed.stay?.tenant_name] }}
      filters={[propertyFilter, statusFilter,
        { key: 'roomId', label: 'Room', all: 'All Rooms', options: (data) => data.rooms.map((room) => ({ value: room.id, label: `${room.roomNumber} · ${room.propertyName}` })) }]}
      initialFilters={{ propertyId: params.get('propertyId') || '', roomId: params.get('roomId') || '' }}
      details={{ label: 'Details', title: (bed) => `Bed ${bed.bedNumber}` }}
      summary={(_data, beds) => (
        <div className="mini-stats-grid">
          {[
            ['Total Tracked Beds', beds.length],
            ...['Occupied', 'Vacant', 'Maintenance'].map((status) => [status, beds.filter((bed) => bed.status === status).length]),
          ].map(([label, count]) => (
            <div className="mini-stat-card" key={label}><span>{label}</span><strong>{count}</strong></div>
          ))}
        </div>
      )}
      selectRows={(data) => data.beds}
      columns={[
        { key: 'bedNumber', label: 'Bed Number', render: (bed) => <strong>{bed.bedNumber}</strong> },
        { key: 'roomNumber', label: 'Room' },
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'resident', label: 'Current Resident', render: (bed) => bed.stay?.tenant_name || '—' },
        { key: 'moveIn', label: 'Move-in Date', render: (bed) => formatDate(bed.stay?.move_in_date) },
        { key: 'rent', label: 'Monthly Rent', render: (bed) => {
          const rent = bed.stay?.monthly_rent_paise ?? bed.monthly_rent_paise;
          return money(rent == null ? null : Number(rent) / 100);
        } },
        { key: 'status', label: 'Status', render: (bed) => <StatusBadge status={bed.status} /> },
      ]}
      fields={[
        {
          name: 'roomId',
          label: 'Room',
          type: 'select',
          options: roomOptions,
        },
        { name: 'bed_number', label: 'Bed number', maxLength: 20 },
      ]}
      createRecord={(values) => staffApi.post('/beds', {
        roomId: Number(values.roomId),
        bed_number: values.bed_number.trim(),
      })}
      deleteRecord={owner ? (bed) => staffApi.delete(`/beds/${bed.id}`) : undefined}
      deleteWarning={(bed) => `Permanently delete bed “${bed.bed_number}”? This cannot be undone.`}
    />
  );
}
