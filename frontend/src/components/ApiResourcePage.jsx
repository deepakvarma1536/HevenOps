import { useState } from 'react';
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
}) {
  const { data, loading, error, retry } = useAsyncResource(loader);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const rows = data ? selectRows(data) : [];

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
      await retry();
    } catch (requestError) {
      setFormError(requestError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {createRecord && (
        <form className="card auth-form api-resource-form" onSubmit={submit} aria-label={`Add ${title.toLowerCase()} record`}>
          <h3>Add {title.replace(/s$/, '')}</h3>
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
          <button type="submit" className="primary-btn" disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      )}

      <AsyncState loading={loading} error={error} onRetry={retry}>
        {rows.length === 0 ? (
          <div className="card empty-state" role="status">
            <h3>No {title.toLowerCase()} yet</h3>
            <p>Records will appear here after they are added.</p>
          </div>
        ) : (
          <div className="table-card table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                  {(deleteRecord || rowAction) && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>
                    ))}
                    {(deleteRecord || (rowAction && rowAction.when(row))) && (
                      <td>
                        <button
                          type="button"
                          className={deleteWarning ? 'outline-btn text-danger' : 'outline-btn'}
                          onClick={async () => {
                            const action = rowAction && rowAction.when(row) ? rowAction : null;
                            const prompt = !action && deleteWarning
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
                          {rowAction && rowAction.when(row) ? rowAction.label : deleteWarning ? 'Delete' : 'Archive'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {actionError && <div className="auth-error" role="alert">{actionError.message}</div>}
          </div>
        )}
      </AsyncState>
    </section>
  );
}
