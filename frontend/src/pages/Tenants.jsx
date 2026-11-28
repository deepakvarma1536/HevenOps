import { useCallback } from 'react';
import ApiResourcePage from '../components/ApiResourcePage';
import { staffApi } from '../api/client';
import { loadTenantDirectory } from '../api/dataApi';

import { useAuth } from '../context/useAuth';
import { formatDate, propertyFilter, propertyOptions, statusFilter } from '../api/display';
import StatusBadge from '../components/StatusBadge';

export default function Tenants() {
  const role = useAuth().user?.role;
  const loader = useCallback((signal) => loadTenantDirectory(signal, role !== 'staff'), [role]);
  return (
    <ApiResourcePage
      title="Tenants"
      description="Tenant contact records for your organization."
      loader={loader}
      selectRows={(data) => data.tenants}
      addLabel="Add Tenant"
      search={{ label: 'Search tenant name, phone, email or room', values: (tenant) => [tenant.name, tenant.phone, tenant.email, tenant.stay?.room_number] }}
      filters={[propertyFilter, { ...statusFilter, label: 'Rent Status' }]}
      details={{ label: 'View Profile', title: (tenant) => tenant.name }}
      columns={[
        { key: 'name', label: 'Tenant Name', render: (tenant) => (
          <div className="resident-cell"><span className="profile-avatar" aria-hidden="true">{tenant.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><strong>{tenant.name}</strong></div>
        ) },
        { key: 'contact', label: 'Phone & Email', render: (tenant) => <>{tenant.phone}<small className="resource-secondary">{tenant.email || '—'}</small></> },
        { key: 'property', label: 'Property' },
        { key: 'room', label: 'Room & Bed', render: (tenant) => tenant.stay ? <>{[tenant.stay.apartment_name, tenant.stay.room_number].filter(Boolean).join(' · ')}<small className="resource-secondary">{tenant.stay.bed_number}</small></> : '—' },
        { key: 'moveIn', label: 'Move-in Date', render: (tenant) => formatDate(tenant.stay?.move_in_date) },
        { key: 'status', label: 'Rent Status', render: (tenant) => tenant.status ? <StatusBadge status={tenant.status} /> : '—' },
      ]}
      fields={[
        { name: 'propertyId', label: 'Property', type: 'select', options: propertyOptions, required: role === 'manager' },
        { name: 'name', label: 'Full name', maxLength: 100 },
        { name: 'phone', label: 'Phone', type: 'tel', maxLength: 20 },
        { name: 'email', label: 'Email', type: 'email', maxLength: 150, required: false },
      ]}
      createRecord={(values) => staffApi.post('/tenants', {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || null,
        ...(values.propertyId && { propertyId: values.propertyId }),
      })}
      deleteRecord={role === 'owner' ? (tenant) => staffApi.delete(`/tenants/${tenant.id}`) : undefined}
    />
  );
}
