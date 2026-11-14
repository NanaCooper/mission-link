// The text boxes the two maps open (WorldMap's `dialog` prop). Plain functions that return a
// description of the box, so they can be tested without a browser. They make no game rules:
// "Yes" calls the same onMove / onWarn the screens already pass in.

import { PixelIcon, SpeechBox, Portrait } from '../../components/index.js';
import { CHARACTERS, WARNING_INFO, MOVE_INFO, MARS_DELAY_NOTE, BLACKOUT_NOTE, novaMood } from '../labels.js';
import { PLACE_MOVES } from './baseMapData.js';

const OK = [{ id: 'ok', label: 'OK' }];

// Nova at a place: "Raise shield? Costs 20 power. Blocks most radiation. [Yes] [No]".
// The cost line is the move's hint from labels.js, so the player sees the trade-off every time.
// "Yes" is highlighted, so pressing the same key twice uses the place.
//   onYes(move)  make the move (and close the box)    onNo()  just close the box
export function moveConfirm(placeId, { turn, onYes, onNo }) {
  const move = PLACE_MOVES[placeId];
  const info = MOVE_INFO[move];
  return {
    id: `${placeId}-${turn}`,
    kind: 'confirm',
    title: `${info.label}?`,
    icon: <PixelIcon name={info.sprite} size={24} />,
    body: <p className="world__ask-hint">{info.hint}</p>,
    choices: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' }
    ],
    highlight: 0,
    onChoose: (choice) => (choice === 'yes' ? onYes(move) : onNo())
  };
}

// Sola at a place in the control room.
//   radio desk  the four warnings and "Not now". Picking one sends it (no extra Yes / No:
//               the menu is the choice, and the signal clock is running). In a blackout it
//               only says that no signal gets through.
//   telescope   what the storm is doing and what comes next, with OK
//   monitor     Nova's last move and the crew's health, with OK
// onWarn(warning) sends the warning and closes the box; close() just closes it.
export function roomDialog(placeId, view, { onWarn, close }) {
  const id = `${placeId}-${view.turn}`;

  if (placeId === 'telescope') {
    const director = CHARACTERS.director;
    return {
      id,
      kind: 'info',
      title: 'Telescope',
      body: (
        <SpeechBox who={director.who} mood="alert" name={director.name} size={40} text={view.stage.missionControlSees}>
          <p>
            <PixelIcon name="next" size={16} /> {view.forecast ? `Coming next: ${view.forecast}` : 'This is the last turn'}
          </p>
        </SpeechBox>
      ),
      choices: OK,
      onChoose: close
    };
  }

  if (placeId === 'monitor') {
    const astronaut = CHARACTERS.astronaut;
    const mood = novaMood({ crewHealth: view.crewHealth });
    const move = view.lastMove ? MOVE_INFO[view.lastMove] : null;
    return {
      id,
      kind: 'info',
      title: 'Crew monitor',
      body: (
        <div className="world__monitor">
          <Portrait who={astronaut.who} mood={mood} size={40} label={`${astronaut.name} looks ${mood}`} />
          <div>
            <p>{move ? `${astronaut.name}'s last move: ${move.label}` : `${astronaut.name} has not moved yet.`}</p>
            <p>Crew health: {view.crewHealth}</p>
          </div>
        </div>
      ),
      choices: OK,
      onChoose: close
    };
  }

  // The radio desk
  if (view.stage.blackout) {
    return { id, kind: 'info', title: 'Radio desk', body: <p>{BLACKOUT_NOTE}</p>, choices: OK, onChoose: close };
  }
  const warnings = Object.entries(WARNING_INFO);
  const sentAt = warnings.findIndex(([key]) => key === view.warningThisTurn);
  return {
    id,
    kind: 'menu',
    title: 'Radio desk',
    body: view.delayTurns === 1 ? <p>{MARS_DELAY_NOTE}</p> : null,
    choices: [
      ...warnings.map(([key, info]) => ({ id: key, label: info.label, icon: <PixelIcon name={info.sprite} size={20} /> })),
      { id: 'notNow', label: 'Not now' }
    ],
    // Already sent one this turn? Start on it (sending another replaces it).
    highlight: Math.max(0, sentAt),
    onChoose: (choice) => (choice === 'notNow' ? close() : onWarn(choice))
  };
}
