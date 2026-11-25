import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { staffApi } from '../api/client';

export default function AcceptManagerInvite() {
  const { hash } = useLocation();
  const token = hash.slice(1);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await staffApi.post('/auth/manager-invite', { token, password }, { skipAuth: true });
      setPassword('');
      setAccepted(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-container">
      <section className="auth-card">
        <div className="auth-header"><h1>Accept Manager Invitation</h1></div>
        {accepted ? <p className="auth-footer">Your account is ready. <Link to="/login">Sign in</Link> with your invited email.</p> :
          !/^[a-f0-9]{64}$/.test(token) ? <p role="alert">Open the invitation link shared by the property owner.</p> : (
            <form className="auth-form" onSubmit={submit}>
              <label className="form-group">Choose a password
                <input className="form-input" type="password" minLength={8} maxLength={72} autoComplete="new-password"
                  required value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Creating account…' : 'Accept Invitation'}</button>
            </form>
          )}
      </section>
    </main>
  );
}
