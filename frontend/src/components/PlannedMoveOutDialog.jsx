import { useState } from 'react';
import { staffApi } from '../api/client';
import Modal from './Modal';

export default function PlannedMoveOutDialog({ stay, onClose, onSaved }) {
  const [date, setDate] = useState(stay.planned_move_out_date || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(value) {
    setSaving(true);
    setError('');
    try {
      await staffApi.patch(`/stays/${stay.id}/planned-move-out`, { plannedMoveOutDate: value });
      await onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen title="Planned Move-out" subtitle={stay.tenant_name}
      onClose={() => { if (!saving) onClose(); }}
      footer={<div className="resource-header-actions">
        {stay.planned_move_out_date && (
          <button type="button" className="outline-btn" disabled={saving}
            onClick={() => save(null)}>Clear Notice</button>
        )}
        <button type="submit" form="planned-move-out-form" className="primary-btn" disabled={saving || !date}>
          {saving ? 'Saving…' : 'Save Move-out Date'}
        </button>
      </div>}>
      <form id="planned-move-out-form" className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        void save(date);
      }}>
        <label className="form-group">Expected move-out date
          <input className="form-input" type="date" value={date} min={stay.move_in_date} required disabled={saving}
            onChange={(event) => setDate(event.target.value)} />
        </label>
        <p>This date is an estimate. Confirm checkout when the tenant leaves to release the bed.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
