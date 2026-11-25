import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadRentDues } from '../api/dataApi';
import { money } from '../api/display';
import useAsyncResource from '../hooks/useAsyncResource';
import { BellIcon } from './Icons';

async function loadOverdue(signal) {
  const { dues } = await loadRentDues(signal);
  return dues.filter((due) => due.status === 'Overdue' && due.remainingAmount > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export default function RentNotifications() {
  const [open, setOpen] = useState(false);
  const { data, error, loading, retry } = useAsyncResource(loadOverdue);
  const count = data?.length || 0;
  return (
    <div className="notification-wrapper" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) setOpen(false);
    }}>
      <button type="button" className="notification-btn" aria-label={`Rent notifications${count ? `, ${count} overdue` : ''}`}
        aria-expanded={open} onClick={() => {
          if (!open && !loading) void retry();
          setOpen(!open);
        }}>
        <BellIcon size={18} />
        {count > 0 && <span className="notification-badge">{count}</span>}
      </button>
      {open && <div className="notification-dropdown">
        <div className="notification-header"><strong>Overdue Rent</strong></div>
        {error && <p className="notification-item" role="alert">{error.message}</p>}
        {!data && loading && <p className="notification-item">Loading overdue rent…</p>}
        {data && !count && <p className="notification-item">No overdue rent.</p>}
        {count > 0 && (
          <ul className="notification-list">
            {data.slice(0, 5).map((due) => <li className="notification-item" key={due.id}>{due.tenant} · {money(due.remainingAmount)}</li>)}
            <li className="notification-item"><Link to="/rent-dues" onClick={() => setOpen(false)}>View Rent Due →</Link></li>
          </ul>
        )}
      </div>}
    </div>
  );
}
