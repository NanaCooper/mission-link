import { useId, useState } from 'react';

// A small "What is this?" button that shows or hides a short explanation.
//
// Props: { label = 'What is this?', children }  children = the explanation text
export default function InfoTip({ label = 'What is this?', children }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="info-tip">
      <button
        type="button"
        className="info-tip__button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span aria-hidden="true">❓</span> {label}
      </button>
      <p id={id} className="info-tip__text" hidden={!open}>
        {children}
      </p>
    </div>
  );
}
