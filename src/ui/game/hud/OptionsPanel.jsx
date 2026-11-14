import { PixelIcon } from '../../components/index.js';
import ScreenTools from './ScreenTools.jsx';
import { OPTIONS_TITLE, BARS_TITLE, BARS_TEXT, RADIATION_EXPLAINER } from '../labels.js';

// The Options tab of the menu: sound, read-aloud, and what the bars in the top bar mean.
//
// Props:
//   readText  what "Read to me" reads
//   meters    which bars this player has, e.g. ['crewHealth', 'power', 'oxygen', 'radiationDose'].
//             Mission Control has ['crewHealth'] only, so it only explains that one.
const EXPLAIN = [
  ['crewHealth', 'health', BARS_TEXT.health],
  ['power', 'power', BARS_TEXT.power],
  ['oxygen', 'oxygen', BARS_TEXT.oxygen],
  ['radiationDose', 'radiation', RADIATION_EXPLAINER]
];

export default function OptionsPanel({ readText, meters }) {
  const rows = EXPLAIN.filter(([key]) => meters.includes(key));

  return (
    <div className="options-panel">
      <h2 className="options-panel__title pixel-title">{OPTIONS_TITLE}</h2>
      <ScreenTools readText={readText} />

      <h3 className="options-panel__subtitle">{BARS_TITLE}</h3>
      <ul className="options-panel__bars">
        {rows.map(([key, icon, text]) => (
          <li key={key}>
            <PixelIcon name={icon} size={18} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
