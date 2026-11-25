import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const focusable = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

export default function Modal({ isOpen, onClose, title, subtitle, children, footer }) {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstField = dialog.current?.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
    (firstField || dialog.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key !== 'Tab') return;

    const elements = Array.from(dialog.current.querySelectorAll(focusable));
    const current = elements.indexOf(document.activeElement);
    if (event.shiftKey && current <= 0) {
      event.preventDefault();
      elements.at(-1)?.focus();
    } else if (!event.shiftKey && (current < 0 || current === elements.length - 1)) {
      event.preventDefault();
      elements[0]?.focus();
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-container" ref={dialog} tabIndex={-1} onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <div>
            <h3 id={titleId} className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
