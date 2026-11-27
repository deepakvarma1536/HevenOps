import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadRoomsPage } from '../api/dataApi';

import { useState } from 'react';
import Modal from '../components/Modal';
import { Link, useSearchParams } from 'react-router-dom';
import InventoryCard from '../components/InventoryCard';
import StatusBadge from '../components/StatusBadge';
import { money, propertyFilter, floorOptions } from '../api/display';
import { useAuth } from '../context/useAuth';

function selectRooms(data) {
  return data.rooms.map((room) => {
    const beds = data.beds.filter((bed) => bed.roomId === room.id);
    const occupied = beds.filter((bed) => bed.status === 'Occupied').length;
    const vacant = beds.filter((bed) => bed.status === 'Vacant').length;
    return { ...room, beds, occupied, vacant, status: occupied ? (occupied === beds.length ? 'Occupied' : 'Partially occupied') : (beds.length && !vacant ? 'Maintenance' : 'Vacant') };
  });
}

function ApartmentAssignment({ room, apartments, onClose, onSaved }) {
  const [apartmentId, setApartmentId] = useState(String(room.apartmentId ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await staffApi.patch(`/rooms/${room.id}`, {
        room_number: room.roomNumber,
        apartmentId: apartmentId ? Number(apartmentId) : null,
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen title={`Apartment for room ${room.roomNumber}`} onClose={saving ? () => {} : onClose}>
      <form className="modal-form" onSubmit={save}>
        <label className="form-group">Apartment on {room.floor}
          <select className="form-input" value={apartmentId} onChange={(event) => setApartmentId(event.target.value)} disabled={saving}>
            <option value="">Directly on floor</option>
            {apartments.map((apartment) => <option key={apartment.id} value={apartment.id}>{apartment.name}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button type="submit" className="primary-btn" disabled={saving || apartmentId === String(room.apartmentId ?? '')}>
          {saving ? 'Saving…' : 'Save assignment'}
        </button>
      </form>
    </Modal>
  );
}

export default function Rooms() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  const [assignment, setAssignment] = useState(null);
  const floorId = params.get('floorId') || '';
  const apartmentId = params.get('apartmentId') || '';
  return (
    <>
    <ApiResourcePage
      key={params.toString()}
      title="Rooms"
      description="Use unique room numbers across the property. A room type such as 3 Sharing sets the bed limit."
      loader={loadRoomsPage}
      selectRows={selectRooms}
      addLabel="Add Room"
      formDefaults={{ floorId, apartmentId }}
      search={{ label: 'Search room number, floor, apartment or property', values: (room) => [room.room_number, room.floor, room.apartment, room.propertyName] }}
      filters={[
        propertyFilter,
        { key: 'floorId', label: 'Floor', all: 'All Floors', options: floorOptions },
        { key: 'apartmentId', label: 'Apartment', all: 'All Apartments', options: (data) => data.apartments.map((unit) => ({
          value: unit.id, label: `${unit.name} · ${unit.floor} · ${unit.propertyName}`,
        })) },
        { key: 'room_type', label: 'Room Type', all: 'All Room Types' },
      ]}
      initialFilters={{ propertyId: params.get('propertyId') || '', floorId, apartmentId }}
      cardGrid="rooms-grid"
      actions={(room, data, retry) => {
        const apartments = data.apartments.filter((unit) => unit.floorId === room.floorId);
        return (
          <>
            <Link className="table-action-btn" to={`/beds?roomId=${room.id}&propertyId=${room.propertyId}`}>View Beds →</Link>
            {apartments.length > 0 && <button type="button" className="table-action-btn"
              onClick={() => setAssignment({ room, apartments, retry })}>Set Apartment</button>}
          </>
        );
      }}
      cardView={(room, _data, actions) => (
        <InventoryCard key={room.id} layout="room" title={room.room_number} badge={<StatusBadge status={room.status} />}
          summary={<p className="property-location">{room.propertyName} · {room.floor} {room.apartment && `· ${room.apartment}`} {room.room_type && `· ${room.room_type}`}</p>}
          stats={[[ 'Beds', room.beds.length ], [ 'Occupied', room.occupied ], [ 'Vacant', room.vacant ]]}
          beds={room.beds} actions={actions} />
      )}
      columns={[
        { key: 'room_number', label: 'Room No', render: (room) => <strong>{room.room_number}</strong> },
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
        { key: 'apartment', label: 'Apartment' },
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
        {
          name: 'apartmentId',
          label: 'Apartment (optional)',
          type: 'select',
          required: false,
          dependsOn: 'floorId',
          placeholder: 'Directly on floor',
          options: (data, values) => data?.apartments
            .filter((unit) => String(unit.floorId) === values.floorId)
            .map((unit) => ({ value: unit.id, label: unit.name })),
        },
        { name: 'room_number', label: 'Room number', maxLength: 20 },
        { name: 'room_type', label: 'Room type', maxLength: 50, required: false },
      ]}
      createRecord={(values) => staffApi.post('/rooms', {
        floorId: Number(values.floorId),
        apartmentId: values.apartmentId ? Number(values.apartmentId) : null,
        room_number: values.room_number.trim(),
        room_type: values.room_type?.trim() || null,
      })}
      deleteRecord={owner ? (room) => staffApi.delete(`/rooms/${room.id}`) : undefined}
      deleteWarning={(room) => `Permanently delete room “${room.room_number}” and all its beds? This cannot be undone.`}
    />
    {assignment && <ApartmentAssignment room={assignment.room} apartments={assignment.apartments}
      onClose={() => setAssignment(null)} onSaved={async () => {
        await assignment.retry();
        setAssignment(null);
      }} />}
    </>
  );
}
