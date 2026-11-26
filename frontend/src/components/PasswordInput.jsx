import { useState } from 'react';

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  maxLength = 128,
  required = true,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        className="form-input password-input"
      />
      <button
        type="button"
        className="password-visibility-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((current) => !current)}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          {visible ? (
            <path d="m3 3 18 18" />
          ) : (
            <circle cx="12" cy="12" r="3" />
          )}
        </svg>
      </button>
    </div>
  );
}
