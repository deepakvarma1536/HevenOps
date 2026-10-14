import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadRooms } from '../api/dataApi';

export default function Rooms() {
  return (
    <ApiResourcePage
      title="Rooms"
      description="Manage rooms and their floor placement."
      loader={loadRooms}
      selectRows={(data) => data.rooms}
      columns={[
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'room_number', label: 'Room' },
        { key: 'room_type', label: 'Room type' },
      ]}
      fields={[
        {
          name: 'floorId',
          label: 'Floor',
          type: 'select',
          options: (data) => data?.floors.map((floor) => ({
            value: floor.id,
            label: `${floor.propertyName} — ${floor.name}`,
          })) || [],
        },
        { name: 'room_number', label: 'Room number', maxLength: 20 },
        { name: 'room_type', label: 'Room type', maxLength: 50, required: false },
      ]}
      createRecord={(values) => staffApi.post('/rooms', {
        floorId: Number(values.floorId),
        room_number: values.room_number.trim(),
        room_type: values.room_type.trim() || null,
      })}
      deleteRecord={(room) => staffApi.delete(`/rooms/${room.id}`)}
    />
  );
}
