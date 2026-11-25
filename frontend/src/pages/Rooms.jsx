import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadBeds } from '../api/dataApi';

import { Link, useSearchParams } from 'react-router-dom';
import InventoryCard from '../components/InventoryCard';
import StatusBadge from '../components/StatusBadge';
import { money, propertyFilter } from '../api/display';
import { useAuth } from '../context/useAuth';

function selectRooms(data) {
  return data.rooms.map((room) => {
    const beds = data.beds.filter((bed) => bed.roomId === room.id);
    const occupied = beds.filter((bed) => bed.status === 'Occupied').length;
    const vacant = beds.filter((bed) => bed.status === 'Vacant').length;
    return { ...room, beds, occupied, vacant, status: occupied ? (occupied === beds.length ? 'Occupied' : 'Partially occupied') : (beds.length && !vacant ? 'Maintenance' : 'Vacant') };
  });
}

export default function Rooms() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  return (
    <ApiResourcePage
      title="Rooms"
      description="Use unique room numbers across the property. A room type such as 3 Sharing sets the bed limit."
      loader={loadBeds}
      selectRows={selectRooms}
      addLabel="Add Room"
      search={{ label: 'Search room number, floor or property', values: (room) => [room.room_number, room.floor, room.propertyName] }}
      filters={[
        propertyFilter,
        { key: 'floorId', label: 'Floor', all: 'All Floors', options: (data) => data.floors.map((floor) => ({ value: floor.id, label: `${floor.name} · ${floor.propertyName}` })) },
        { key: 'room_type', label: 'Room Type', all: 'All Room Types' },
      ]}
      initialFilters={{ propertyId: params.get('propertyId') || '', floorId: params.get('floorId') || '' }}
      cardGrid="rooms-grid"
      actions={(room) => <Link className="table-action-btn" to={`/beds?roomId=${room.id}&propertyId=${room.propertyId}`}>View Beds →</Link>}
      cardView={(room, _data, actions) => (
        <InventoryCard key={room.id} layout="room" title={room.room_number} badge={<StatusBadge status={room.status} />}
          summary={<p className="property-location">{room.propertyName} · {room.floor} {room.room_type && `· ${room.room_type}`}</p>}
          stats={[[ 'Beds', room.beds.length ], [ 'Occupied', room.occupied ], [ 'Vacant', room.vacant ]]}
          beds={room.beds} actions={actions} />
      )}
      columns={[
        { key: 'room_number', label: 'Room No', render: (room) => <strong>{room.room_number}</strong> },
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'room_type', label: 'Room Type', render: (room) => room.room_type ? <span className="room-type-badge">{room.room_type}</span> : '—' },
        { key: 'total', label: 'Total Beds', render: (room) => room.beds.length },
        { key: 'occupied', label: 'Occupied' },
        { key: 'vacant', label: 'Vacant' },
        { key: 'rent', label: 'Rent / Bed', render: (room) => {
          const rates = room.beds.map((bed) => bed.monthly_rent_paise).filter((rate) => rate != null).map((rate) => Number(rate) / 100);
          return rates.length ? (Math.min(...rates) === Math.max(...rates) ? money(rates[0]) : `${money(Math.min(...rates))}–${money(Math.max(...rates))}`) : '—';
        } },
        { key: 'status', label: 'Status', render: (room) => <StatusBadge status={room.status} /> },
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
        room_type: values.room_type?.trim() || null,
      })}
      deleteRecord={owner ? (room) => staffApi.delete(`/rooms/${room.id}`) : undefined}
      deleteWarning={(room) => `Permanently delete room “${room.room_number}” and all its beds? This cannot be undone.`}
    />
  );
}
