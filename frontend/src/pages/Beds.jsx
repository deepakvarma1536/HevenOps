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
    const name = [room.propertyName, room.floor, room.apartment, room.roomNumber].filter(Boolean).join(' — ');
    return {
      value: room.id,
      label: full ? `${name} (Full, ${count}/${room.bed_capacity} beds)` : name,
      disabled: full,
    };
  });
}

const availabilityFilter = {
  key: 'availability',
  label: 'Availability',
  all: 'All Availability',
  options: () => ['Vacant now', 'Upcoming vacancy', 'Checkout pending'],
};

function selectBeds(data) {
  return data.beds.map((bed) => {
    let availability = bed.status === 'Vacant' ? 'Vacant now' : null;
    if (bed.status === 'Occupied' && bed.stay?.planned_move_out_date) {
      availability = bed.stay.days_until_planned_move_out < 0 ? 'Checkout pending' : 'Upcoming vacancy';
    }
    return { ...bed, availability };
  });
}

function expectedAvailability(bed) {
  if (bed.availability === 'Vacant now') return 'Available now';
  if (!bed.availability) return '—';
  const days = bed.stay.days_until_planned_move_out;
  const date = formatDate(bed.stay.planned_move_out_date);
  const estimate = days < 0 ? 'Checkout pending' : days === 0 ? 'Expected today' : `Expected in ${days} ${days === 1 ? 'day' : 'days'}`;
  return <>{estimate}<small className="resource-secondary">{date}</small></>;
}

export default function Beds() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  return (
    <ApiResourcePage
      title="Beds"
      description="See beds available now and beds expected to open after checkout."
      loader={loadBedDirectory}
      addLabel="Add Bed"
      search={{ label: 'Search bed, room number or resident', values: (bed) => [bed.bedNumber, bed.roomNumber, bed.stay?.tenant_name] }}
      filters={[propertyFilter, statusFilter, availabilityFilter,
        { key: 'roomId', label: 'Room', all: 'All Rooms', options: (data) => data.rooms.map((room) => ({ value: room.id, label: `${room.roomNumber} · ${room.propertyName}` })) }]}
      initialFilters={{ propertyId: params.get('propertyId') || '', roomId: params.get('roomId') || '' }}
      details={{ label: 'Details', title: (bed) => `Bed ${bed.bedNumber}` }}
      summary={(_data, beds) => (
        <div className="mini-stats-grid bed-stats">
          {[
            ['Total Tracked Beds', beds.length],
            ...['Occupied', 'Vacant', 'Maintenance'].map((status) => [status, beds.filter((bed) => bed.status === status).length]),
            ['Upcoming Vacancies', beds.filter((bed) => bed.availability === 'Upcoming vacancy').length],
          ].map(([label, count]) => (
            <div className="mini-stat-card" key={label}><span>{label}</span><strong>{count}</strong></div>
          ))}
        </div>
      )}
      selectRows={selectBeds}
      columns={[
        { key: 'bedNumber', label: 'Bed Number', render: (bed) => <strong>{bed.bedNumber}</strong> },
        { key: 'roomNumber', label: 'Room' },
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'apartment', label: 'Apartment' },
        { key: 'resident', label: 'Current Resident', render: (bed) => bed.stay?.tenant_name || '—' },
        { key: 'moveIn', label: 'Move-in Date', render: (bed) => formatDate(bed.stay?.move_in_date) },
        { key: 'rent', label: 'Monthly Rent', render: (bed) => {
          const rent = bed.stay?.monthly_rent_paise ?? bed.monthly_rent_paise;
          return money(rent == null ? null : Number(rent) / 100);
        } },
        { key: 'status', label: 'Status', render: (bed) => <StatusBadge status={bed.status} /> },
        { key: 'availability', label: 'Expected Availability', render: expectedAvailability },
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
