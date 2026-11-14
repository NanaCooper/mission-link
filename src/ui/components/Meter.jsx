// A labelled meter bar: icon, label, number and a coloured bar.
// Colour is never the only signal: a word ("Low!" or "High!") shows too.
//
// Props:
//   icon, label, value, max  (from the Dev 3 guide)
//   tone       optional: 'power' | 'oxygen' | 'radiation' | 'health' (picks the bar colour)
//   alertWhen  optional: 'low' (default, warns under 25%) or 'high' (warns at 75% or more).
//              Use 'high' for the radiation budget, where a full bar is the danger.
export default function Meter({ icon, label, value, max, tone, alertWhen = 'low' }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const alert = alertWhen === 'high' ? percent >= 75 : percent < 25;
  const alertText = alertWhen === 'high' ? 'High!' : 'Low!';

  const classes = ['meter'];
  if (tone) classes.push(`meter--${tone}`);
  if (alert) classes.push('meter--alert');

  return (
    <div className={classes.join(' ')}>
      <div className="meter__head">
        <span className="meter__icon" aria-hidden="true">{icon}</span>
        <span className="meter__label">{label}</span>
        {alert && <span className="meter__alert">{alertText}</span>}
        <span className="meter__value">
          {value} / {max}
        </span>
      </div>
      <div
        className="meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}${alert ? `, ${alertText}` : ''}`}
      >
        <div className="meter__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
