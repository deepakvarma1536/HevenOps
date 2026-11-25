import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadBeds } from '../api/dataApi';

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
  return (
    <ApiResourcePage
      title="Beds"
      description="Use unique bed numbers across the property."
      loader={loadBeds}
      selectRows={(data) => data.beds}
      columns={[
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bed_number', label: 'Bed' },
        { key: 'status', label: 'Status' },
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
      deleteRecord={(bed) => staffApi.delete(`/beds/${bed.id}`)}
      deleteWarning={(bed) => `Permanently delete bed “${bed.bed_number}”? This cannot be undone.`}
    />
  );
}
