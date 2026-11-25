import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadBeds } from '../api/dataApi';

import { Link, useSearchParams } from 'react-router-dom';
import { FloorsIcon } from '../components/Icons';
import InventoryCard from '../components/InventoryCard';
import { propertyFilter } from '../api/display';
import { useAuth } from '../context/useAuth';

export default function Floors() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  return (
    <ApiResourcePage
      title="Floors"
      description="Use a unique floor name within each property."
      loader={loadBeds}
      addLabel="Add Floor"
      search={{ label: 'Search floor name or property', values: (floor) => [floor.name, floor.propertyName] }}
      filters={[propertyFilter]}
      initialFilters={{ propertyId: params.get('propertyId') || '' }}
      defaultView="cards"
      cardGrid="floors-grid"
      actions={(floor) => <Link className="view-btn" to={`/rooms?floorId=${floor.id}&propertyId=${floor.propertyId}`}>View Rooms →</Link>}
      cardView={(floor, data, actions) => {
        const rooms = data.rooms.filter((room) => room.floorId === floor.id);
        const beds = data.beds.filter((bed) => bed.floorId === floor.id);
        return <InventoryCard key={floor.id} layout="floor" title={floor.name} icon={<FloorsIcon />}
          badge={<span className="floor-property-badge">{floor.propertyName}</span>}
          stats={[[ 'Rooms', rooms.length ], [ 'Total Beds', beds.length ], [ 'Occupied', beds.filter((bed) => bed.status === 'Occupied').length ], [ 'Vacant', beds.filter((bed) => bed.status === 'Vacant').length ]]}
          beds={beds} actions={actions} />;
      }}
      selectRows={(data) => data.floors}
      columns={[
        { key: 'propertyName', label: 'Property' },
        { key: 'name', label: 'Floor' },
        { key: 'created_at', label: 'Created' },
      ]}
      fields={[
        {
          name: 'propertyId',
          label: 'Property',
          type: 'select',
          options: (data) => data?.properties.map((property) => ({ value: property.id, label: property.name })) || [],
        },
        { name: 'name', label: 'Floor name', maxLength: 50 },
      ]}
      createRecord={(values) => staffApi.post('/floors', { propertyId: Number(values.propertyId), name: values.name.trim() })}
      deleteRecord={owner ? (floor) => staffApi.delete(`/floors/${floor.id}`) : undefined}
      deleteWarning={(floor) => `Permanently delete floor “${floor.name}” and all its rooms and beds? This cannot be undone.`}
    />
  );
}
