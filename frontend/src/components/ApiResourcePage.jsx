import { useState } from 'react';
import Modal from './Modal';
import { PlusIcon, SearchIcon } from './Icons';
import AsyncState from './AsyncState';
import useAsyncResource from '../hooks/useAsyncResource';

export default function ApiResourcePage({
  title,
  description,
  loader,
  selectRows = (data) => data,
  columns,
  fields,
  createRecord,
  deleteRecord,
  deleteWarning,
  rowAction,
  validate,
  requiresIdempotencyKey = false,
  addLabel,
  initialValues,
  onFormComplete,
  search,
  filters = [],
  initialFilters = {},
  summary,
  cardView,
  cardGrid = 'property-grid',
  defaultView = 'table',
  actions,
  details,
  headerAction,
  itemLabel = title.toLowerCase(),
}) {
  const { data, loading, error, retry } = useAsyncResource(loader);
  const [formValues, setFormValues] = useState(initialValues || {});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [isAdding, setIsAdding] = useState(Boolean(initialValues));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState(initialFilters);
  const [view, setView] = useState(defaultView);
  const [selected, setSelected] = useState(null);
  const allRows = data ? selectRows(data) : [];
  const rows = allRows.filter((row) => {
    const text = search?.values(row).filter((value) => value != null).join(' ').toLowerCase();
    return (!search || text.includes(searchTerm.trim().toLowerCase())) &&
      filters.every((filter) => !filterValues[filter.key] || String(row[filter.key]) === filterValues[filter.key]);
  });

  function openForm() {
    setFormError(null);
    setValidationError('');
    setIsAdding(true);
  }

  function closeForm() {
    if (saving) return;
    setIsAdding(false);
    onFormComplete?.();
  }

  const actionCell = (row) => {
    const action = rowAction?.when(row) ? rowAction : null;
    const deleteAvailable = deleteRecord && !action;
    return (
      <div className="table-actions">
        {actions?.(row)}
        {details && <button type="button" className="table-action-btn" onClick={() => setSelected(row)}>{details.label}</button>}
        {(action || deleteAvailable) && (
          <button
            type="button"
            className={deleteWarning ? 'table-action-btn text-danger' : 'table-action-btn'}
            onClick={async () => {
              const prompt = deleteAvailable && deleteWarning
                ? deleteWarning(row)
                : `${action?.label || 'Archive'} this ${title.toLowerCase().replace(/s$/, '')} record?`;
              if (!window.confirm(prompt)) return;
              setActionError(null);
              try {
                if (action) await action.run(row);
                else await deleteRecord(row);
                await retry();
              } catch (requestError) {
                setActionError(requestError);
              }
            }}
          >
            {action?.label || (deleteWarning ? 'Delete' : 'Archive')}
          </button>
        )}
      </div>
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setValidationError('');
    for (const field of fields) {
      const value = formValues[field.name];
      if (field.required !== false && (value === undefined || String(value).trim() === '')) {
        setValidationError(`${field.label} is required.`);
        return;
      }
      if (field.type === 'number' && value !== undefined && value !== '') {
        const number = Number(value);
        const minimum = typeof field.min === 'function' ? field.min(data, formValues) : field.min;
        const maximum = typeof field.max === 'function' ? field.max(data, formValues) : field.max;
        if (!Number.isFinite(number) || (minimum !== undefined && number < minimum) || (maximum !== undefined && number > maximum)) {
          setValidationError(`${field.label} must be between ${minimum ?? 'the minimum'} and ${maximum ?? 'the maximum'}.`);
          return;
        }
      }
    }
    const customValidationError = validate?.(formValues, data);
    if (customValidationError) {
      setValidationError(customValidationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const requestKey = requiresIdempotencyKey ? idempotencyKey || crypto.randomUUID() : null;
      if (requiresIdempotencyKey && !idempotencyKey) setIdempotencyKey(requestKey);
      await createRecord(formValues, data, requestKey);
      setFormValues({});
      setIdempotencyKey(null);
      setIsAdding(false);
      if (onFormComplete) onFormComplete();
      else await retry();
    } catch (requestError) {
      setFormError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const form = createRecord && (
        <form className={addLabel ? "modal-form" : "card auth-form api-resource-form"} id="resource-form" onSubmit={submit} aria-label={`Add ${title.toLowerCase()} record`}>
          {!addLabel && <h3>Add {title.replace(/s$/, '')}</h3>}
          {fields.map((field) => {
            const options = typeof field.options === 'function' ? field.options(data) : field.options;
            const inputProps = {
              id: `${title.toLowerCase().replaceAll(' ', '-')}-${field.name}`,
              name: field.name,
              className: 'form-input',
              required: field.required !== false,
              value: formValues[field.name] || '',
              onChange(event) {
                const { value } = event.target;
                setIdempotencyKey(null);
                setFormValues((current) => ({ ...current, [field.name]: value }));
              },
            };
            return (
              <div className="form-group" key={field.name}>
                <label htmlFor={inputProps.id}>{field.label}</label>
                {field.type === 'select' ? (
                  <select {...inputProps}>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(options || []).map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea {...inputProps} maxLength={field.maxLength} rows={3} />
                ) : (
                  <input
                    {...inputProps}
                    type={field.type || 'text'}
                    inputMode={field.inputMode}
                    min={typeof field.min === 'function' ? field.min(data, formValues) : field.min}
                    max={typeof field.max === 'function' ? field.max(data, formValues) : field.max}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    step={field.step}
                  />
                )}
              </div>
            );
          })}
          {validationError && <div className="auth-error" role="alert">{validationError}</div>}
          {formError && (
            <div className="auth-error" role="alert" aria-live="assertive">
              {formError.status === 401 ? 'Your session has expired. Sign in again to continue.' : formError.message}
            </div>
          )}
          {!addLabel && <button type="submit" className="primary-btn" disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save'}
          </button>}
        </form>
  );

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="resource-header-actions">
          {headerAction}
          {cardView && defaultView === 'table' && (
            <div className="view-toggle" aria-label="Layout">
              {['table', 'cards'].map((layout) => (
                <button type="button" key={layout} className={`toggle-btn ${view === layout ? 'active' : ''}`}
                  aria-pressed={view === layout} onClick={() => setView(layout)}>
                  {layout === 'table' ? 'Table' : 'Cards'}
                </button>
              ))}
            </div>
          )}
          {addLabel && createRecord && (
            <button type="button" className="primary-btn cta-btn" onClick={openForm}>
              <PlusIcon size={16} />{addLabel}
            </button>
          )}
        </div>
      </div>

      {!addLabel && form}
      {addLabel && createRecord && (
        <Modal isOpen={isAdding} onClose={closeForm} title={addLabel} footer={
          <div className="modal-actions-space-between">
            <button type="button" className="outline-btn" onClick={closeForm} disabled={saving}>Cancel</button>
            <button type="submit" form="resource-form" className="primary-btn" disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }>
          {form}
        </Modal>
      )}

      <AsyncState loading={loading} error={error} onRetry={retry}>
        {data && summary?.(data, allRows)}
        {(search || filters.length > 0) && (
          <>
            <div className="filter-bar">
              {search && (
                <div className="search-input-wrapper">
                  <span className="search-icon" aria-hidden="true"><SearchIcon size={16} /></span>
                  <input className="search-input" type="search" aria-label={search.label} placeholder={search.label}
                    value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                </div>
              )}
              {filters.map((filter) => (
                <label className="filter-group" key={filter.key}>
                  {filter.label}
                  <select className="filter-select" value={filterValues[filter.key] || ''}
                    onChange={(event) => setFilterValues({ ...filterValues, [filter.key]: event.target.value })}>
                    <option value="">{filter.all || 'All'}</option>
                    {((data ? filter.options?.(data, allRows) : undefined) ?? [...new Set(allRows.map((row) => row[filter.key]).filter(Boolean))]).map((option) => (
                      <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="content-meta-bar">Showing {rows.length} of {allRows.length} {itemLabel}</p>
          </>
        )}

        {rows.length === 0 ? (
          <div className="card empty-state" role="status">
            <h3>{allRows.length ? 'No matching records' : `No ${title.toLowerCase()} yet`}</h3>
            <p>{allRows.length ? 'Try a different search or filter.' : 'Records will appear here after they are added.'}</p>
          </div>
        ) : view === 'cards' && cardView ? (
          <div className={cardGrid}>
            {rows.map((row) => cardView(row, data, actionCell(row)))}
          </div>
        ) : (
          <div className="table-card table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                  {(deleteRecord || rowAction || actions || details) && <th scope="col">{details?.heading || 'Actions'}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
                    ))}
                    {(deleteRecord || rowAction || actions || details) && <td>{actionCell(row)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {actionError && <div className="auth-error" role="alert">{actionError.message}</div>}
      </AsyncState>
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={details.title(selected)} subtitle={details.subtitle?.(selected)}
          footer={<button type="button" className="primary-btn" onClick={() => setSelected(null)}>Close</button>}>
          {details.render ? details.render(selected) : (
            <dl className="detail-info-list">
              {columns.map((column) => (
                <div key={column.key} className="detail-info-item">
                  <dt className="info-label">{column.label}</dt>
                  <dd className="info-val">{column.render ? column.render(selected) : selected[column.key] ?? '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </Modal>
      )}
    </section>
  );
}
