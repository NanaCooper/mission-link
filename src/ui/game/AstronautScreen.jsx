import { useState } from 'react';
import { BigButton, WhyCard, SpeechBox, PixelIcon } from '../components/index.js';
import BaseMap from './world/BaseMap.jsx';
import MissionClock from './MissionClock.jsx';
import GameHud from './hud/GameHud.jsx';
import Vitals from './hud/Vitals.jsx';
import OptionsPanel from './hud/OptionsPanel.jsx';
import ScreenTools from './hud/ScreenTools.jsx';
import { useGameMenu } from './hud/useGameMenu.js';
import { usePopup } from './hud/usePopup.js';
import { useMeterDeltas } from './useMeterDeltas.js';
import { useGameSounds } from './sound.js';
import {
  CHARACTERS,
  ASTRONAUT_TABS,
  PREDICTION,
  predictionResultText,
  astronautReadText,
  MOVE_INFO,
  MOVE_SCENE_TAG,
  WARNING_INFO,
  WORLD_NAMES,
  NO_MESSAGE_TEXT,
  NO_MESSAGE_HINT,
  NO_NEW_MESSAGE_TEXT,
  MESSAGE_TITLE,
  NEW_TAG,
  BLIP_QUESTION_TEXT,
  LEVEL_END_TEXT,
  radiationHitText,
  solaMoodForWarning,
  turnText,
} from './labels.js';
import './AstronautScreen.css';

// The Astronaut's screen, full screen and held sideways (see hud/GameHud.jsx):
//   the map of the base fills the screen (Nova walks to a place and uses it to make her move),
//   a slim bar on top with the four meters (always in view), pop-ups for what is new (Sola's
//   message, a radiation hit, BLIP's line), and a Menu with three tabs: Options (sound, read-aloud,
//   what the bars mean), Messages, Moves (the quick move buttons).
// It only shows the view it is given. The engine decides everything.
//
// Props:
//   view          getAstronautView(state)
//   onMove        onMove(moveKey)
//   active        false while this screen is hidden on one device (no keyboard, pop-ups wait)
//   switchButton  one device only: the top-bar button that hands the device to Mission Control
//   pauses        true on one device (the menu pauses the game), false online. See hud/GameHud.jsx.
//   onMenuChange  (open) => ..., told when the menu opens or closes (to pause the signal clock)
export default function AstronautScreen({
  view,
  onMove,
  active = true,
  switchButton = null,
  pauses = null,
  onMenuChange,
}) {
  const isPlaying = view.status === 'playing';
  const ended = view.status === 'won' || view.status === 'lost';
  const lastLog = view.log.length > 0 ? view.log[view.log.length - 1] : null;
  const moveTag = MOVE_SCENE_TAG[view.lastMove];
  const guess = usePrediction(view);
  // How much each meter changed this turn (null before the first move).
  const deltas = useMeterDeltas(view.turn, view.meters);
  const hit = Math.max(0, deltas?.radiationDose ?? 0);
  const message = newestMessage(view);
  const menu = useGameMenu('messages');

  useGameSounds(view);

  // Pop-ups show on their own for a few seconds, then fold away. Their clock only runs while
  // this screen can be seen, so on one device nothing is missed while the other player looks.
  const messageFresh = usePopup(message?.isNew ? `message:${message.turn}:${message.warning}` : null, active);
  const showHit = usePopup(hit > 0 ? `hit:${view.turn}` : null, active);
  const showLog = usePopup(lastLog ? `log:${view.log.length}:${lastLog.text}` : null, active);
  const showQuestion = usePopup(guess.asking ? `question:${view.turn}` : null, active);
  const showEnd = usePopup(ended ? `end:${view.status}` : null, active);

  // A quick move closes the menu, so the player sees what happens on the map.
  const moveFromMenu = (move) => {
    menu.close();
    onMove(move);
  };

  const { director, robot } = CHARACTERS;

  const popups = (
    <>
      {message?.isNew && (
        <div className={`hud-popup hud-popup--message ${messageFresh ? 'is-fresh' : 'is-folded'}`}>
          <SpeechBox
            who={director.who}
            mood={solaMoodForWarning(message.warning)}
            name={director.name}
            title={messageFresh ? MESSAGE_TITLE : undefined}
            tag={NEW_TAG}
            tone="alert"
            size={messageFresh ? 48 : 32}
            big={messageFresh}
            icon={<PixelIcon name={message.info.sprite} size={messageFresh ? 28 : 20} />}
            text={`${message.info.label}!`}
          />
        </div>
      )}
      {showHit && (
        <p className="hud-popup hud-popup--line hud-popup--hit">
          <PixelIcon name="radiation" size={24} />
          <span>{radiationHitText(hit)}</span>
        </p>
      )}
      {showLog && (
        <div className="hud-popup">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={lastLog.text}>
            {guess.result && <p>{guess.result}</p>}
          </SpeechBox>
        </div>
      )}
      {showQuestion && (
        <div className="hud-popup">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={BLIP_QUESTION_TEXT} />
        </div>
      )}
      {showEnd && (
        <p className={`hud-popup hud-popup--line hud-popup--${view.status}`}>
          <PixelIcon name="star" size={24} />
          <span>{LEVEL_END_TEXT[view.status]}</span>
        </p>
      )}
    </>
  );

  const tabs = [
    {
      id: 'options',
      ...ASTRONAUT_TABS.options,
      content: (
        <OptionsPanel
          readText={astronautReadText(view)}
          meters={['crewHealth', 'power', 'oxygen', 'radiationDose']}
        />
      ),
    },
    {
      id: 'messages',
      ...ASTRONAUT_TABS.messages,
      badge: Boolean(message?.isNew) || guess.asking,
      content: (
        <div className="astronaut-screen__messages">
          <MissionControlMessage message={message} />
          {guess.asking && <PredictionQuestion onAnswer={guess.answer} />}
          <div className="astronaut-screen__result">
            {guess.result && (
              <p className="astronaut-screen__guess" role="status">
                {guess.result}
              </p>
            )}
            {lastLog && (
              <SpeechBox
                className="astronaut-screen__log"
                who={robot.who}
                name={robot.name}
                text={lastLog.text}
                size={48}
              />
            )}
            <WhyCard fact={view.lastFact} name={robot.name} />
          </div>
        </div>
      ),
    },
    {
      id: 'moves',
      ...ASTRONAUT_TABS.moves,
      content: <MoveButtons disabled={!isPlaying} onMove={moveFromMenu} />,
    },
  ];

  return (
    <div className={`astronaut-screen world-${view.world}`}>
      <GameHud
        label={`${CHARACTERS.astronaut.name}'s screen: the Astronaut`}
        active={active}
        title={WORLD_NAMES[view.world]}
        turn={turnText(view)}
        clock={<MissionClock view={view} who="astronaut" />}
        vitals={<Vitals meters={view.meters} radiationLimit={view.radiationLimit} deltas={deltas} />}
        pauses={pauses}
        onMenuChange={onMenuChange}
        switchButton={switchButton}
        popups={popups}
        menu={menu}
        tabs={tabs}
        menuLabel="Astronaut menu"
        map={
          <BaseMap
            view={view}
            onMove={onMove}
            hit={hit}
            // Only the screen that shows, with its menu closed, takes the arrow keys.
            active={active && !menu.isOpen}
            overlay={
              moveTag && (
                <p key={view.turn} className="scene__tag scene__tag--move scene__corner">
                  {moveTag}
                </p>
              )
            }
          />
        }
      />
    </div>
  );
}

// The newest message from Mission Control, or null.
// "New" means it arrived this turn, so last turn's warning is never mistaken for a fresh one.
function newestMessage(view) {
  const newest = view.inbox.length > 0 ? view.inbox[view.inbox.length - 1] : null;
  const info = newest ? WARNING_INFO[newest.warning] : null;
  if (!info) return null;
  return { turn: newest.turn, warning: newest.warning, info, isNew: newest.turn === view.turn };
}

// The four move buttons: a quick way to move without walking on the map.
export function MoveButtons({ disabled, onMove }) {
  return (
    <section className="astronaut-screen__moves" aria-label="Quick moves">
      <h2 className="astronaut-screen__moves-title pixel-title">Quick moves</h2>
      <p className="astronaut-screen__moves-hint">No time to walk? Tap a move here.</p>
      <div className="astronaut-screen__buttons">
        {Object.entries(MOVE_INFO).map(([moveKey, info]) => (
          <BigButton
            key={moveKey}
            icon={<PixelIcon name={info.sprite} size={30} />}
            label={info.label}
            hint={info.hint}
            disabled={disabled}
            onClick={() => onMove(moveKey)}
          />
        ))}
      </div>
    </section>
  );
}

// The prediction prompt. Kept in this screen's state only: never sent to the session or the engine.
// Asked on PREDICTION.turn, answered or skipped (the move buttons always work),
// then "You guessed ..." shows with the result of that turn.
function usePrediction(view) {
  const [guess, setGuess] = useState(null); // { turn, answer }

  // A new game started: forget the old guess.
  if (guess && view.turn < guess.turn) setGuess(null);

  const asking = view.status !== 'lost' && view.status !== 'won' && view.turn === PREDICTION.turn && !guess;
  const result = guess && view.turn === guess.turn + 1 ? predictionResultText(guess.answer) : null;

  return { asking, result, answer: (answer) => setGuess({ turn: view.turn, answer }) };
}

function PredictionQuestion({ onAnswer }) {
  const robot = CHARACTERS.robot;
  return (
    <section className="astronaut-screen__predict" aria-label="Make a guess">
      <SpeechBox who={robot.who} name={robot.name} size={48} text={PREDICTION.question}>
        <div className="astronaut-screen__predict-answers">
          {PREDICTION.answers.map((answer) => (
            <button key={answer} type="button" className="screen-tools__button" onClick={() => onAnswer(answer)}>
              {answer}
            </button>
          ))}
        </div>
      </SpeechBox>
    </section>
  );
}

// The newest message from Mission Control, spoken by Commander Sola (in the Messages tab).
// A message that arrived this turn is "new". An older one is shown quietly.
function MissionControlMessage({ message }) {
  const director = CHARACTERS.director;

  let box;
  if (message?.isNew) {
    box = (
      <SpeechBox
        who={director.who}
        mood={solaMoodForWarning(message.warning)}
        name={director.name}
        title={MESSAGE_TITLE}
        tag={NEW_TAG}
        tone="alert"
        size={48}
        big
        icon={<PixelIcon name={message.info.sprite} size={28} />}
        text={`${message.info.label}!`}
      />
    );
  } else if (message) {
    box = (
      <SpeechBox who={director.who} mood="calm" name={director.name} tone="quiet" size={48} text={NO_NEW_MESSAGE_TEXT}>
        <p>Last message: {message.info.label}</p>
      </SpeechBox>
    );
  } else {
    box = (
      <SpeechBox who={director.who} mood="calm" name={director.name} tone="quiet" size={48} text={NO_MESSAGE_TEXT}>
        <p>{NO_MESSAGE_HINT}</p>
      </SpeechBox>
    );
  }

  return <section className="astronaut-screen__message">{box}</section>;
}

// Sound on/off and Read to me now live in hud/ScreenTools.jsx. Kept here so old imports still work.
export { ScreenTools };
