import { useState } from 'react';
import { useTenantAuth } from '../context/useTenantAuth';
import useApiResource from '../hooks/useApiResource';
import AsyncState from '../components/AsyncState';

function TenantProfile() {
  const { tenantApi } = useTenantAuth();
  const { data: profile, loading, error, retry, setData } = useApiResource(tenantApi, '/tenant-portal/me');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergency_contact: ''
  });
  const [message, setMessage] = useState({ text: '', isError: false });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setIsSaving(true);
    try {
      const response = await tenantApi.put('/tenant-portal/me', formData);
      if (response.data.profile) setData(response.data.profile);
      setMessage({ text: 'Profile updated successfully.', isError: false });
      setIsEditing(false);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update profile.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AsyncState loading={loading} error={error} onRetry={retry} loadingMessage="Loading your profile...">
    <div className="tenant-profile page-content">
      <div className="table-header">
        <h2>My Profile</h2>
        <p>Manage your personal details and emergency contact information.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', marginTop: '20px' }}>
        {message.text && (
          <div className={`alert ${message.isError ? 'alert-error' : 'alert-success'}`} role={message.isError ? 'alert' : 'status'} aria-live="polite" style={{ marginBottom: '20px', padding: '10px', borderRadius: '4px', backgroundColor: message.isError ? '#fed7d7' : '#c6f6d5', color: message.isError ? '#822727' : '#22543d' }}>
            {message.text}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="profile-name">Full Name</label>
              <input
                type="text"
                id="profile-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
                minLength={1}
                maxLength={100}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                type="tel"
                id="profile-phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                maxLength={20}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="profile-emergency-contact">Emergency Contact</label>
              <input
                type="text"
                id="profile-emergency-contact"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                className="form-input"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email Address</label>
              <input
                type="email"
                id="profile-email"
                value={profile?.email || ''}
                className="form-input"
                disabled
                title="Email cannot be changed"
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="outline-btn" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Full Name:</span>
                <span className="info-val"><strong>{profile?.name}</strong></span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Email:</span>
                <span className="info-val">{profile?.email}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Phone:</span>
                <span className="info-val">{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Emergency Contact:</span>
                <span className="info-val">{profile?.emergency_contact || 'Not provided'}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Government ID:</span>
                <span className="info-val">{profile?.government_id || 'Not provided'}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button className="primary-btn" type="button" onClick={() => {
                setFormData({
                  name: profile?.name || '',
                  phone: profile?.phone || '',
                  emergency_contact: profile?.emergency_contact || '',
                });
                setMessage({ text: '', isError: false });
                setIsEditing(true);
              }}>Edit Profile</button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AsyncState>
  );
}

export default TenantProfile;
