import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) setError(result.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Log in to your HevenOps account</p>
        </div>
        
        {error && <div id="login-error" className="auth-error" role="alert" aria-live="assertive">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@example.com"
              autoComplete="username"
              maxLength={150}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
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
            style={{ width: '100%', marginTop: '10px' }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
