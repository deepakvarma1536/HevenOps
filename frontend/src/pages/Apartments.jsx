import { Link, useSearchParams } from 'react-router-dom';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadApartments } from '../api/dataApi';
import { propertyFilter, floorOptions } from '../api/display';
import { useAuth } from '../context/useAuth';

export default function Apartments() {
  const [params] = useSearchParams();
  const owner = useAuth().user?.role === 'owner';
  const floorId = params.get('floorId') || '';

  return (
    <ApiResourcePage
      key={params.toString()}
      title="Apartments"
      description="Group rooms by apartment within a floor."
      loader={loadApartments}
      selectRows={(data) => data.apartments}
      addLabel="Add Apartment"
      formDefaults={{ floorId }}
      search={{ label: 'Search apartments', values: (row) => [row.name, row.floor, row.propertyName] }}
      filters={[propertyFilter, { key: 'floorId', label: 'Floor', all: 'All Floors', options: floorOptions }]}
      initialFilters={{ propertyId: params.get('propertyId') || '', floorId }}
      columns={[
        { key: 'name', label: 'Apartment' },
        { key: 'propertyName', label: 'Property' },
        { key: 'floor', label: 'Floor' },
      ]}
      fields={[
        { name: 'floorId', label: 'Floor', type: 'select', options: floorOptions },
        { name: 'name', label: 'Apartment name', maxLength: 50 },
      ]}
      createRecord={(values) => staffApi.post('/apartments', { floorId: Number(values.floorId), name: values.name.trim() })}
      actions={(apartment) => <Link className="table-action-btn"
        to={`/rooms?propertyId=${apartment.propertyId}&floorId=${apartment.floorId}&apartmentId=${apartment.id}`}>View Rooms →</Link>}
      deleteRecord={owner ? (row) => staffApi.delete(`/apartments/${row.id}`) : undefined}
      deleteWarning={(row) => `Permanently delete apartment “${row.name}” and all its rooms and beds? This cannot be undone.`}
    />
  );
}
