import { useState } from 'react';
import { useTenantAuth } from '../context/useTenantAuth';

function TenantLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useTenantAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(identifier, password);
      if (!result.success) setError(result.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ borderTop: '4px solid #38a169' }}>
        <div className="auth-header">
          <h2>Tenant Portal</h2>
          <p>Sign in to manage your stay</p>
        </div>
        
        {error && <div id="tenant-login-error" className="auth-error" role="alert" aria-live="assertive">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="identifier">Email or Phone</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              placeholder="tenant@example.com"
              autoComplete="username"
              maxLength={150}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'tenant-login-error' : undefined}
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={128}
              required
              className="form-input"
            />
          </div>
          
          <button 
            type="submit" 
            className="primary-btn auth-submit-btn" 
            disabled={isLoading}
            style={{ width: '100%', marginTop: '10px', backgroundColor: '#38a169' }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have a password yet? Contact your property manager.</p>
        </div>
      </div>
    </div>
  );
}

export default TenantLogin;
