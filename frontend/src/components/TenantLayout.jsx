import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTenantAuth } from "../context/useTenantAuth";

function TenantLayout() {
  const navigate = useNavigate();
  const { tenant, logout } = useTenantAuth();

  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="app tenant-app">
      {/* A simplified sidebar or top nav for tenants */}
      <aside className="sidebar open" style={{ width: '240px', backgroundColor: '#2d3748', color: 'white' }}>
        <div className="logo" style={{ padding: '20px', borderBottom: '1px solid #4a5568' }}>
          <h2>HevenOps</h2>
          <span style={{ color: '#a0aec0' }}>Tenant Portal</span>
        </div>
        
        <nav className="sidebar-nav" style={{ padding: '20px 0' }}>
          <button className={`nav-item ${path === '/tenant' ? 'active' : ''}`} onClick={() => navigate('/tenant')} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: path === '/tenant' ? '#4a5568' : 'transparent', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}>
            Dashboard
          </button>
          <button className={`nav-item ${path === '/tenant/rent' ? 'active' : ''}`} onClick={() => navigate('/tenant/rent')} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: path === '/tenant/rent' ? '#4a5568' : 'transparent', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}>
            My Rent & Dues
          </button>
          <button className={`nav-item ${path === '/tenant/payments' ? 'active' : ''}`} onClick={() => navigate('/tenant/payments')} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: path === '/tenant/payments' ? '#4a5568' : 'transparent', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}>
            My Payments
          </button>
          <button className={`nav-item ${path === '/tenant/profile' ? 'active' : ''}`} onClick={() => navigate('/tenant/profile')} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: path === '/tenant/profile' ? '#4a5568' : 'transparent', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}>
            My Profile
          </button>
        </nav>

        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
          <button onClick={logout} className="outline-btn" style={{ width: '100%', borderColor: '#fc8181', color: '#fc8181' }}>
            Log Out
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ padding: '30px' }}>
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Welcome, {tenant?.name || 'Tenant'}</h1>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default TenantLayout;
