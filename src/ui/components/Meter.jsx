// A labelled meter bar: icon, label, number and a coloured bar cut into blocks.
// Colour is never the only signal: a word ("Low!" or "High!") shows too.
//
// Props:
//   icon, label, value, max  (from the Dev 3 guide). icon can be an emoji or a <PixelIcon />.
//   tone       optional: 'power' | 'oxygen' | 'radiation' | 'health' (picks the bar colour)
//   alertWhen  optional: 'low' (default, warns under 25%) or 'high' (warns at 75% or more).
//              Use 'high' for the radiation budget, where a full bar is the danger.
//   delta      optional: how much the value changed since last turn, e.g. -20 or 15.
//              Shows a small "+15" / "-20" tag with an arrow.
//   showMax    optional: false shows "45" instead of "45 / 100" (for narrow places)
export default function Meter({ icon, label, value, max, tone, alertWhen = 'low', delta = null, showMax = true }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const alert = alertWhen === 'high' ? percent >= 75 : percent < 25;
  const alertText = alertWhen === 'high' ? 'High!' : 'Low!';

  const showDelta = typeof delta === 'number' && delta !== 0;
  // Going up is good for power, oxygen and health. For radiation, going up is bad.
  const deltaIsGood = alertWhen === 'high' ? delta < 0 : delta > 0;

  const classes = ['meter'];
  if (tone) classes.push(`meter--${tone}`);
  if (alert) classes.push('meter--alert');

  return (
    <div className={classes.join(' ')}>
      <div className="meter__head">
        <span className="meter__icon" aria-hidden="true">{icon}</span>
        <span className="meter__label">{label}</span>
        {alert && <span className="meter__alert">{alertText}</span>}
        {showDelta && (
          <span className={`meter__delta${deltaIsGood ? '' : ' is-bad'}`}>
            <span aria-hidden="true">{delta > 0 ? '▲' : '▼'}</span>
            {delta > 0 ? `+${delta}` : `-${Math.abs(delta)}`}
            <span className="visually-hidden"> since last turn</span>
          </span>
        )}
        <span className="meter__value">
          {value}
          {showMax ? ` / ${max}` : <span className="visually-hidden"> of {max}</span>}
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
