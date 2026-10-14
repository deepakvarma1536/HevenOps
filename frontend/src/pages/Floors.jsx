import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadFloors } from '../api/dataApi';

export default function Floors() {
  return (
    <ApiResourcePage
      title="Floors"
      description="Manage floors within each property."
      loader={loadFloors}
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
      deleteRecord={(floor) => staffApi.delete(`/floors/${floor.id}`)}
    />
  );
}
