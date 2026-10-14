import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadBeds } from '../api/dataApi';

export default function Beds() {
  return (
    <ApiResourcePage
      title="Beds"
      description="Manage beds and their current availability."
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
          options: (data) => data?.rooms.map((room) => ({
            value: room.id,
            label: `${room.propertyName} — ${room.floor} — ${room.roomNumber}`,
          })) || [],
        },
        { name: 'bed_number', label: 'Bed number', maxLength: 20 },
      ]}
      createRecord={(values) => staffApi.post('/beds', {
        roomId: Number(values.roomId),
        bed_number: values.bed_number.trim(),
      })}
      deleteRecord={(bed) => staffApi.delete(`/beds/${bed.id}`)}
    />
  );
}
