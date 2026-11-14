// A big, easy-to-tap button with an icon, a label and a one-line hint.
// When selected, it changes colour AND shows a check mark, so colour is never the only signal.
//
// Props: { icon, label, hint, onClick, disabled, selected }
export default function BigButton({ icon, label, hint, onClick, disabled = false, selected = false }) {
  return (
    <button
      type="button"
      className={`big-button${selected ? ' is-selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected ? 'true' : undefined}
    >
      {icon && (
        <span className="big-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="big-button__text">
        <span className="big-button__label">{label}</span>
        {hint && <span className="big-button__hint">{hint}</span>}
      </span>
      {selected && (
        <span className="big-button__check">
          <span aria-hidden="true">✓</span>
          <span className="visually-hidden">Selected</span>
        </span>
      )}
    </button>
  );
}
