import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffApi } from '../api/client';
import { loadProperties } from '../api/dataApi';
import { useAuth } from '../context/useAuth';
import useAsyncResource from '../hooks/useAsyncResource';
import AsyncState from '../components/AsyncState';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/Icons';

async function loadManagers(signal) {
  const [properties, response] = await Promise.all([loadProperties(signal), staffApi.get('/managers', { signal })]);
  return { properties, managers: response.data };
}

export default function Managers() {
  const { user } = useAuth();
  if (user?.role !== 'owner') return <p className="page-content" role="alert">Only the owner can manage property assignments.</p>;
  return <ManagerDirectory />;
}

function ManagerDirectory() {
  const [params] = useSearchParams();
  const { data, loading, error, retry } = useAsyncResource(loadManagers);
  const [dialog, setDialog] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  function open(type, manager) {
    setAssigned(manager?.propertyIds?.map(String) || []);
    setFormError(null);
    setInvitationUrl('');
    setCopied(false);
    setDialog({ type, manager });
  }

  function close() {
    if (!saving) {
      setDialog(null);
      setInvitationUrl('');
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (dialog.type === 'invite') {
        const values = Object.fromEntries(new FormData(event.currentTarget));
        const { data } = await staffApi.post('/managers/invites', values);
        const url = new URL('/manager-invite', window.location.origin);
        url.hash = data.token;
        setInvitationUrl(url.href);
      } else {
        await staffApi.put(`/managers/${dialog.manager.id}/properties`, { propertyIds: assigned });
        setDialog(null);
        await retry();
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-content">
      <div className="page-header">
        <div><h2>Property Managers</h2><p>Invite managers and choose the properties they can manage.</p></div>
        <button type="button" className="primary-btn cta-btn" onClick={() => open('invite')} disabled={!data?.properties.length}>
          <PlusIcon size={16} /> Invite Manager
        </button>
      </div>
      <AsyncState loading={loading} error={error} onRetry={retry}>
        {data?.managers.length ? (
          <div className="table-card table-responsive">
            <table className="data-table">
              <thead><tr><th>Manager</th><th>Email</th><th>Assigned Properties</th><th>Actions</th></tr></thead>
              <tbody>
                {data.managers.map((manager) => (
                  <tr key={manager.id}>
                    <td><strong>{manager.name}</strong></td>
                    <td>{manager.email}</td>
                    <td>{data.properties.filter((property) => manager.propertyIds.map(String).includes(String(property.id))).map((property) => property.name).join(', ') || 'No access'}</td>
                    <td><button type="button" className="table-action-btn" onClick={() => open('assign', manager)}>Edit Assignments</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="card empty-state">{data?.properties.length ? 'No managers have accepted an invitation yet.' : 'Add a property before inviting its manager.'}</p>}
      </AsyncState>
      {dialog && (
        <Modal isOpen onClose={close} title={dialog.type === 'invite' ? 'Invite Property Manager' : `Assign Properties · ${dialog.manager.name}`}
          footer={<div className="resource-header-actions">
            <button type="button" className="outline-btn" onClick={close} disabled={saving}>{invitationUrl ? 'Done' : 'Cancel'}</button>
            {!invitationUrl && <button type="submit" form="manager-form" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : dialog.type === 'invite' ? 'Create Invite Link' : 'Save Assignments'}</button>}
          </div>}>
          {invitationUrl ? (
            <div className="modal-form">
              <p>Share this link with the manager. It expires in 24 hours and can be used once.</p>
              <label className="form-group">Invitation link<input className="form-input" value={invitationUrl} readOnly onFocus={(event) => event.target.select()} /></label>
              <button type="button" className="outline-btn" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invitationUrl);
                  setCopied(true);
                } catch {
                  setFormError('Select the invitation link to copy it manually.');
                }
              }}>{copied ? 'Copied' : 'Copy Link'}</button>
              {formError && <p role="alert" className="auth-error">{formError}</p>}
            </div>
          ) : (
            <form id="manager-form" className="modal-form" onSubmit={submit}>
              {dialog.type === 'invite' ? (
                <>
                  <label className="form-group">Full name<input className="form-input" name="name" required maxLength={100} /></label>
                  <label className="form-group">Email<input className="form-input" name="email" type="email" required maxLength={150} /></label>
                  <label className="form-group">Property
                    <select className="form-input" name="propertyId" required defaultValue={params.get('propertyId') || ''}>
                      <option value="">Select a property</option>
                      {data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <fieldset className="assignment-list">
                  <legend>Assigned properties</legend>
                  <p>Clear all selections to revoke access.</p>
                  {data.properties.map((property) => {
                    const id = String(property.id);
                    return <label key={id}><input type="checkbox" checked={assigned.includes(id)} onChange={(event) => {
                      setAssigned(event.target.checked ? [...assigned, id] : assigned.filter((item) => item !== id));
                    }} />{property.name}</label>;
                  })}
                </fieldset>
              )}
              {formError && <p role="alert" className="auth-error">{formError}</p>}
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
