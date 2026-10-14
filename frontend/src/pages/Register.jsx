import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.organizationName
      );
      if (!result.success) setError(result.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Sign up to start managing with HevenOps</p>
        </div>
        
        {error && <div id="register-error" className="auth-error" role="alert" aria-live="assertive">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              autoComplete="name"
              maxLength={100}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'register-error' : undefined}
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              autoComplete="email"
              maxLength={150}
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
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              className="form-input"
              minLength={8}
              maxLength={128}
            />
          </div>

          <div className="form-group">
            <label htmlFor="organizationName">Organization Name</label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Heaven Heights PG"
              autoComplete="organization"
              maxLength={100}
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Register;
