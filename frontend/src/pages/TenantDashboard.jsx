import { useTenantAuth } from '../context/useTenantAuth';
import useApiResource from '../hooks/useApiResource';
import AsyncState from '../components/AsyncState';

function TenantDashboard() {
  const { tenantApi } = useTenantAuth();
  const { data, loading, error, retry } = useApiResource(tenantApi, '/tenant-portal/my-stay');
  const stay = data?.stay === null ? null : data;

  return (
    <AsyncState loading={loading} error={error} onRetry={retry} loadingMessage="Loading your stay details...">
    {!stay ? (
    <div className="tenant-dashboard page-content">
      <div className="card" role="status">
        <h2>No active stay</h2>
        <p>Your property manager can help with your current accommodation details.</p>
      </div>
    </div>
    ) : (
    <div className="tenant-dashboard">
      <div className="summary-cards">
        <div className="card">
          <h3>Current Property</h3>
          <p className="big-value">{stay?.property_name || 'N/A'}</p>
          <span className="sub-value">{stay?.property_address || 'No active stay'}</span>
        </div>
        <div className="card">
          <h3>Room & Bed</h3>
          <p className="big-value">Room {stay?.room_number || '-'} • Bed {stay?.bed_number || '-'}</p>
          <span className="sub-value">{stay?.room_type || 'N/A'}</span>
        </div>
        <div className="card">
          <h3>Monthly Rent</h3>
          <p className="big-value">₹{((stay?.monthly_rent_paise || 0) / 100).toLocaleString('en-IN')}</p>
          <span className="sub-value">Due every month</span>
        </div>
      </div>

      <div style={{ marginTop: '40px' }} className="card">
        <h3>Stay Information</h3>
        <p><strong>Move-in Date:</strong> {stay?.move_in_date ? new Date(stay.move_in_date).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Status:</strong> <span className={`status-badge ${stay?.stay_status?.toLowerCase()}`}>{stay?.stay_status || 'NONE'}</span></p>
      </div>
    </div>
    )}
    </AsyncState>
  );
}

export default TenantDashboard;
