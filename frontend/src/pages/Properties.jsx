import { Link } from 'react-router-dom';
import ApiResourcePage from '../components/ApiResourcePage';
import InventoryCard from '../components/InventoryCard';
import StatusBadge from '../components/StatusBadge';
import { LocationPinIcon, PropertiesIcon } from '../components/Icons';
import { staffApi } from '../api/client';
import { loadBeds } from '../api/dataApi';
import { useAuth } from '../context/useAuth';

export default function Properties() {
  const { user } = useAuth();
  const owner = user?.role === 'owner';
  return (
    <ApiResourcePage
      title="Properties"
      description="Manage your PG properties, buildings and occupancy."
      loader={loadBeds}
      selectRows={(data) => data.properties.map((row) => ({ ...row, status: 'Active' }))}
      search={{ label: 'Search properties by name or location', values: (row) => [row.name, row.address] }}
      filters={[{ key: 'status', label: 'Status', all: 'All Statuses' }]}
      addLabel="Add Property"
      defaultView="cards"
      cardView={(property, data, actions) => {
        const floors = data.floors.filter((floor) => floor.propertyId === property.id);
        const rooms = data.rooms.filter((room) => room.propertyId === property.id);
        const beds = data.beds.filter((bed) => bed.propertyId === property.id);
        return <InventoryCard key={property.id} title={property.name} icon={<PropertiesIcon />}
          badge={<StatusBadge status={property.status} />}
          summary={<p className="property-location"><LocationPinIcon size={14} />{property.address || 'Location not set'}</p>}
          stats={[[ 'Floors', floors.length ], [ 'Rooms', rooms.length ], [ 'Beds', beds.length ]]}
          beds={beds} actions={actions} />;
      }}
      columns={[
        { key: 'name', label: 'Property' },
        { key: 'address', label: 'Location' },
      ]}
      details={{ label: 'View Property Details', title: (property) => property.name, render: (property) => (
        <div className="detail-info-list">
          <p>{property.address || 'Location not set'}</p>
          <Link className="outline-btn" to={`/floors?propertyId=${property.id}`}>View Floors →</Link>
          {owner && <Link className="outline-btn" to={`/managers?propertyId=${property.id}`}>Manage property managers</Link>}
        </div>
      ) }}
      fields={[
        { name: 'name', label: 'Property name', maxLength: 100 },
        { name: 'address', label: 'Location / campus area', maxLength: 500, required: false },
      ]}
      createRecord={user?.role === 'manager' ? undefined : (values) => staffApi.post('/properties', {
        name: values.name.trim(),
        address: values.address?.trim() || null,
      })}
      deleteRecord={owner ? (property) => staffApi.delete(`/properties/${property.id}`) : undefined}
      deleteWarning={(property) => `Permanently delete “${property.name}” and all its floors, rooms, and beds? This cannot be undone.`}
    />
  );
}
