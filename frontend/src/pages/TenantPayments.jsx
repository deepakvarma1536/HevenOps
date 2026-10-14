import { useTenantAuth } from '../context/useTenantAuth';
import useApiResource from '../hooks/useApiResource';
import AsyncState from '../components/AsyncState';

function TenantPayments() {
  const { tenantApi } = useTenantAuth();
  const { data, loading, error, retry } = useApiResource(tenantApi, '/tenant-portal/my-payments');
  const payments = data?.data || [];

  return (
    <AsyncState loading={loading} error={error} onRetry={retry} loadingMessage="Loading your payment history...">
    <div className="tenant-payments page-content">
      <div className="table-header">
        <h2>My Payments</h2>
        <p>A ledger of all payments you have made.</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Rent Month</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>No payments found.</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td>{payment.due_month}</td>
                  <td>₹{(Number(payment.amount_paise || 0) / 100).toLocaleString('en-IN')}</td>
                  <td>{payment.payment_method}</td>
                  <td>{payment.transaction_reference || '-'}</td>
                  <td>{payment.notes || '-'}</td>
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

export default TenantPayments;
