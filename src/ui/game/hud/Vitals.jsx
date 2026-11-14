import { Portrait, PixelIcon } from '../../components/index.js';
import { CHARACTERS, VITALS_LABEL, VITALS_SHORT, novaMood } from '../labels.js';

// The crew's meters in the top bar: always in view, never hidden in the menu.
// Nova's face, then one small bar per meter it is given.
//
// Props:
//   meters          the meters this player may see, e.g. { crewHealth, power, oxygen, radiationDose }.
//                   Mission Control passes { crewHealth } only: it must not see the others.
//   radiationLimit  the radiation budget (from the view). Needed when radiationDose is given.
//   deltas          optional: change since last turn, e.g. { power: -20 }. Shows a small arrow.
const ORDER = ['crewHealth', 'power', 'oxygen', 'radiationDose'];
const ICON = { crewHealth: 'health', power: 'power', oxygen: 'oxygen', radiationDose: 'radiation' };
const TONE = { crewHealth: 'health', power: 'power', oxygen: 'oxygen', radiationDose: 'radiation' };
const FULL_NAME = {
  crewHealth: 'Crew health',
  power: 'Power',
  oxygen: 'Oxygen',
  radiationDose: 'Storm radiation budget'
};

export default function Vitals({ meters, radiationLimit = 0, deltas = null }) {
  const keys = ORDER.filter((key) => typeof meters[key] === 'number');
  const mood = novaMood({ ...meters, crewHealth: meters.crewHealth ?? 100, radiationLimit });
  const name = CHARACTERS.astronaut.name;

  return (
    <div className={`vitals vitals--${keys.length}`} role="group" aria-label={VITALS_LABEL}>
      <Portrait who={CHARACTERS.astronaut.who} mood={mood} size={28} label={`${name} looks ${mood}`} />
      {keys.map((key) => (
        <MiniMeter
          key={key}
          kind={key}
          value={meters[key]}
          max={key === 'radiationDose' ? radiationLimit : 100}
          delta={deltas ? deltas[key] : null}
        />
      ))}
    </div>
  );
}

// One small bar. Colour is never the only signal: a "!" shows when it is low (or high, for radiation).
function MiniMeter({ kind, value, max, delta }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const highIsBad = kind === 'radiationDose';
  const alert = highIsBad ? percent >= 75 : percent < 25;
  const alertWord = highIsBad ? 'High!' : 'Low!';
  const changed = typeof delta === 'number' && delta !== 0;
  const changeIsGood = highIsBad ? delta < 0 : delta > 0;

  return (
    <div className={`vitals__meter vitals__meter--${TONE[kind]}${alert ? ' is-alert' : ''}`}>
      <span className="vitals__icon">
        <PixelIcon name={ICON[kind]} size={16} />
      </span>
      <span className="vitals__name" aria-hidden="true">{VITALS_SHORT[kind]}</span>
      <span
        className="vitals__track"
        role="meter"
        aria-label={FULL_NAME[kind]}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}${alert ? `, ${alertWord}` : ''}`}
      >
        <span className="vitals__fill" style={{ width: `${percent}%` }} />
      </span>
      <span className="vitals__value" aria-hidden="true">{value}</span>
      {alert && (
        <span className="vitals__alert" aria-hidden="true">
          !
        </span>
      )}
      {changed && (
        <span key={`${kind}:${value}`} className={`vitals__delta${changeIsGood ? '' : ' is-bad'}`} aria-hidden="true">
          {delta > 0 ? '▲' : '▼'}
        </span>
      )}
    </div>
  );
}
