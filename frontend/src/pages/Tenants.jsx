import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadTenants } from '../api/dataApi';

export default function Tenants() {
  return (
    <ApiResourcePage
      title="Tenants"
      description="Tenant contact records for your organization."
      loader={loadTenants}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'created_at', label: 'Created' },
      ]}
      fields={[
        { name: 'name', label: 'Full name', maxLength: 100 },
        { name: 'phone', label: 'Phone', type: 'tel', maxLength: 20 },
        { name: 'email', label: 'Email', type: 'email', maxLength: 150, required: false },
      ]}
      createRecord={(values) => staffApi.post('/tenants', {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim() || null,
      })}
      deleteRecord={(tenant) => staffApi.delete(`/tenants/${tenant.id}`)}
    />
  );
}
