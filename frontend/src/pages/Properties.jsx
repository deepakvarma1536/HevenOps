import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadProperties } from '../api/dataApi';

export default function Properties() {
  return (
    <ApiResourcePage
      title="Properties"
      description="Manage your organization's properties."
      loader={loadProperties}
      columns={[
        { key: 'name', label: 'Property' },
        { key: 'address', label: 'Address' },
        { key: 'created_at', label: 'Created' },
      ]}
      fields={[{ name: 'name', label: 'Property name', maxLength: 100 }]}
      createRecord={(values) => staffApi.post('/properties', { name: values.name.trim() })}
      deleteRecord={(property) => staffApi.delete(`/properties/${property.id}`)}
    />
  );
}
