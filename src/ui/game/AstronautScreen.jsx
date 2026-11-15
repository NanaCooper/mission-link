import { useState } from 'react';
import { BigButton, WhyCard, SpeechBox, PixelIcon } from '../components/index.js';
import BaseMap from './world/BaseMap.jsx';
import MissionClock from './MissionClock.jsx';
import GameHud from './hud/GameHud.jsx';
import Vitals from './hud/Vitals.jsx';
import OptionsPanel from './hud/OptionsPanel.jsx';
import ScreenTools from './hud/ScreenTools.jsx';
import { useGameMenu } from './hud/useGameMenu.js';
import { usePopup, POPUP_LONG_MS } from './hud/usePopup.js';
import { useMeterDeltas } from './useMeterDeltas.js';
import { useGameSounds } from './sound.js';
import {
  CHARACTERS,
  ASTRONAUT_TABS,
  PREDICTION,
  PREDICTION_THANKS,
  predictionResultText,
  moveReactionText,
  FUN_FACT_TITLE,
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
  SOLO_TAG,
  LEVEL_END_TEXT,
  radiationHitText,
  solaMoodForWarning,
  turnText,
} from './labels.js';
import './AstronautScreen.css';

// The Astronaut's screen, full screen and held sideways (see hud/GameHud.jsx):
//   the map of the base fills the screen (Nova walks to a place and uses it to make her move),
//   a slim bar on top with the four meters (always in view), pop-ups for what is new (Sola's
//   message, a radiation hit, BLIP's coaching line, question and fun fact), and a Menu with three tabs: Options (sound, read-aloud,
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
  // BLIP talks in turns: first what the move did (or the newest log line), then the question on the
  // peak wave, or else the fun fact. One BLIP pop-up at a time, so nothing is pushed off a phone screen.
  const reaction = view.lastResult?.turn === view.turn ? moveReactionText(view.lastResult) : null;
  const blipText = reaction ?? lastLog?.text ?? null;
  const blipKey = blipText ? `blip:${view.turn}:${reaction ? 'move' : view.log.length}` : null;
  const showBlip = usePopup(blipKey, active, POPUP_LONG_MS);
  const blipDone = blipKey == null || !showBlip;
  const showQuestion = guess.asking && blipDone && active;
  const showThanks = usePopup(guess.answeredNow ? `thanks:${view.turn}` : null, active);
  // After the peak wave: the answer to BLIP's question, then the fun fact.
  const answerKey = guess.result && blipDone ? `answer:${view.turn}` : null;
  const showAnswer = usePopup(answerKey, active, POPUP_LONG_MS);
  const answerDone = !guess.result || (answerKey != null && !showAnswer);
  const factKey = view.lastFact?.text && reaction && blipDone && answerDone && !guess.asking ? `fact:${view.turn}` : null;
  const showFact = usePopup(factKey, active, POPUP_LONG_MS) && !showThanks;
  const showEnd = usePopup(ended ? `end:${view.status}` : null, active);
  // Commander Sola's new message folds to one line while BLIP is talking.
  const solaBig = messageFresh && !showBlip;

  // A quick move closes the menu, so the player sees what happens on the map.
  const moveFromMenu = (move) => {
    menu.close();
    onMove(move);
  };

  const { director, robot } = CHARACTERS;

  const popups = (
    <>
      {message?.isNew && (
        <div className={`hud-popup hud-popup--message ${solaBig ? 'is-fresh' : 'is-folded'}`}>
          <SpeechBox
            who={director.who}
            mood={solaMoodForWarning(message.warning)}
            name={director.name}
            title={solaBig ? MESSAGE_TITLE : undefined}
            tag={view.solo ? SOLO_TAG : NEW_TAG}
            tone="alert"
            size={solaBig ? 48 : 32}
            big={solaBig}
            icon={<PixelIcon name={message.info.sprite} size={solaBig ? 28 : 20} />}
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
      {showBlip && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={blipText} />
        </div>
      )}
      {showAnswer && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={guess.result} />
        </div>
      )}
      {showQuestion && (
        <div className="hud-popup hud-popup--blip hud-popup--ask">
          <PredictionQuestion onAnswer={guess.answer} size={32} />
        </div>
      )}
      {showThanks && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={PREDICTION_THANKS} />
        </div>
      )}
      {showFact && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} title={FUN_FACT_TITLE} size={32} text={view.lastFact.text} />
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
          <MissionControlMessage message={message} solo={view.solo} />
          {guess.asking && <PredictionQuestion onAnswer={guess.answer} />}
          <div className="astronaut-screen__result">
            {guess.result && (
              <p className="astronaut-screen__guess" role="status">
                {guess.result}
              </p>
            )}
            {blipText && (
              <SpeechBox
                className="astronaut-screen__log"
                who={robot.who}
                name={robot.name}
                text={blipText}
                size={48}
              />
            )}
            <WhyCard fact={view.lastFact} name={robot.name} title={FUN_FACT_TITLE} />
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
        // Play alone: no signal clock (Commander Sola sends the warnings herself)
        clock={view.solo ? null : <MissionClock view={view} who="astronaut" />}
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
  const answeredNow = Boolean(guess && view.turn === guess.turn);

  return { asking, result, answeredNow, answer: (answer) => setGuess({ turn: view.turn, answer }) };
}

function PredictionQuestion({ onAnswer, size = 48 }) {
  const robot = CHARACTERS.robot;
  return (
    <section className="astronaut-screen__predict" aria-label="Make a guess">
      <SpeechBox who={robot.who} name={robot.name} size={size} text={PREDICTION.question}>
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
function MissionControlMessage({ message, solo = false }) {
  const director = CHARACTERS.director;

  let box;
  if (message?.isNew) {
    box = (
      <SpeechBox
        who={director.who}
        mood={solaMoodForWarning(message.warning)}
        name={director.name}
        title={MESSAGE_TITLE}
        tag={solo ? SOLO_TAG : NEW_TAG}
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
