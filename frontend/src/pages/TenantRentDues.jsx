import { useTenantAuth } from '../context/useTenantAuth';
import useApiResource from '../hooks/useApiResource';
import AsyncState from '../components/AsyncState';

function TenantRentDues() {
  const { tenantApi } = useTenantAuth();
  const { data, loading, error, retry } = useApiResource(tenantApi, '/tenant-portal/my-rent-dues');
  const dues = data?.data || [];

  return (
    <AsyncState loading={loading} error={error} onRetry={retry} loadingMessage="Loading your rent dues...">
    <div className="tenant-rent-dues page-content">
      <div className="table-header">
        <h2>My Rent & Dues</h2>
        <p>A history of your monthly rent obligations and current status.</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Due Date</th>
              <th>Amount Due</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>Property</th>
            </tr>
          </thead>
          <tbody>
            {dues.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>No rent dues found.</td>
              </tr>
            ) : (
              dues.map((due) => (
                <tr key={due.id}>
                  <td>{due.due_month}</td>
                  <td>{new Date(due.due_date).toLocaleDateString()}</td>
                  <td>₹{(Number(due.amount_due_paise || 0) / 100).toLocaleString('en-IN')}</td>
                  <td>₹{(Number(due.amount_paid_paise || 0) / 100).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`status-badge ${due.status.toLowerCase()}`}>
                      {due.status}
                    </span>
                  </td>
                  <td>{due.property_name} (Bed {due.bed_number})</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </AsyncState>
  );
}

export default TenantRentDues;
