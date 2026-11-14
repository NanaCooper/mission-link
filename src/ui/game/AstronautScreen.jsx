import { useState } from 'react';
import { Meter, BigButton, Panel, WhyCard, InfoTip, SpeechBox, Portrait, PixelIcon } from '../components/index.js';
import BaseMap from './world/BaseMap.jsx';
import MissionClock from './MissionClock.jsx';
import GameHud from './hud/GameHud.jsx';
import { useGameMenu } from './hud/useGameMenu.js';
import { usePopup } from './hud/usePopup.js';
import { useMeterDeltas } from './useMeterDeltas.js';
import { useGameSounds, useSoundOn, setSoundOn, unlockAudio } from './sound.js';
import { useReadAloud } from './useReadAloud.js';
import {
  CHARACTERS,
  ASTRONAUT_TABS,
  PREDICTION,
  predictionResultText,
  astronautReadText,
  SOUND_ON_LABEL,
  SOUND_OFF_LABEL,
  READ_ALOUD_LABEL,
  READ_ALOUD_STOP_LABEL,
  MOVE_INFO,
  MOVE_SCENE_TAG,
  WARNING_INFO,
  WORLD_NAMES,
  RADIATION_EXPLAINER,
  NO_MESSAGE_TEXT,
  NO_MESSAGE_HINT,
  NO_NEW_MESSAGE_TEXT,
  MESSAGE_TITLE,
  NEW_TAG,
  BLIP_QUESTION_TEXT,
  LEVEL_END_TEXT,
  radiationHitText,
  novaMood,
  solaMoodForWarning,
  turnText,
} from './labels.js';
import './AstronautScreen.css';

// The Astronaut's screen, full screen and held sideways (see hud/GameHud.jsx):
//   the map of the base fills the screen (Nova walks to a place and uses it to make her move),
//   a slim bar on top, pop-ups for what is new (Sola's message, a radiation hit, BLIP's line),
//   and a Menu with three tabs: Status (meters), Messages, Moves (the quick move buttons).
// It only shows the view it is given. The engine decides everything.
//
// Props:
//   view          getAstronautView(state)
//   onMove        onMove(moveKey)
//   active        false while this screen is hidden on one device (no keyboard, pop-ups wait)
//   switchButton  one device only: the top-bar button that hands the device to Mission Control
export default function AstronautScreen({ view, onMove, active = true, switchButton = null }) {
  const isPlaying = view.status === 'playing';
  const ended = view.status === 'won' || view.status === 'lost';
  const lastLog = view.log.length > 0 ? view.log[view.log.length - 1] : null;
  const moveTag = MOVE_SCENE_TAG[view.lastMove];
  const guess = usePrediction(view);
  // How much each meter changed this turn (null before the first move).
  const deltas = useMeterDeltas(view.turn, view.meters);
  const hit = Math.max(0, deltas?.radiationDose ?? 0);
  const message = newestMessage(view);
  const menu = useGameMenu('status');

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
      id: 'status',
      ...ASTRONAUT_TABS.status,
      content: <StatusPanel view={view} deltas={deltas} />,
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
        tools={<ScreenTools readText={astronautReadText(view)} />}
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

// "Sound on / off" and "Read to me", shown in the top bar of both player screens.
// Read to me is hidden when the browser cannot speak.
export function ScreenTools({ readText }) {
  const soundOn = useSoundOn();
  const voice = useReadAloud();

  const toggleSound = () => {
    unlockAudio();
    setSoundOn(!soundOn);
  };

  return (
    <div className="screen-tools" role="group" aria-label="Sound and reading">
      <button
        type="button"
        className={`screen-tools__button${soundOn ? '' : ' is-off'}`}
        onClick={toggleSound}
      >
        <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
        <span>{soundOn ? SOUND_ON_LABEL : SOUND_OFF_LABEL}</span>
      </button>
      {voice.supported && (
        <button
          type="button"
          className="screen-tools__button"
          onClick={() => (voice.speaking ? voice.stop() : voice.read(readText))}
        >
          <span aria-hidden="true">{voice.speaking ? '⏹️' : '🗣️'}</span>
          <span>{voice.speaking ? READ_ALOUD_STOP_LABEL : READ_ALOUD_LABEL}</span>
        </button>
      )}
    </div>
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

// Nova's face and the four base meters. After a move, each meter shows how much it changed.
function StatusPanel({ view, deltas }) {
  const { meters } = view;
  const mood = novaMood({ ...meters, radiationLimit: view.radiationLimit });
  const name = CHARACTERS.astronaut.name;

  return (
    <Panel className="astronaut-screen__status">
      <div className="astronaut-screen__crew">
        <Portrait who={CHARACTERS.astronaut.who} mood={mood} size={48} label={`${name} looks ${mood}`} />
        <Meter
          icon={<PixelIcon name="health" size={20} />}
          label="Crew health"
          tone="health"
          value={meters.crewHealth}
          max={100}
          showMax={false}
          delta={deltas?.crewHealth}
        />
      </div>
      <div className="astronaut-screen__pair">
        <Meter
          icon={<PixelIcon name="power" size={20} />}
          label="Power"
          tone="power"
          value={meters.power}
          max={100}
          showMax={false}
          delta={deltas?.power}
        />
        <Meter
          icon={<PixelIcon name="oxygen" size={20} />}
          label="Oxygen"
          tone="oxygen"
          value={meters.oxygen}
          max={100}
          showMax={false}
          delta={deltas?.oxygen}
        />
      </div>
      <div className="astronaut-screen__radiation">
        <Meter
          icon={<PixelIcon name="radiation" size={20} />}
          label="Storm radiation budget"
          tone="radiation"
          value={meters.radiationDose}
          max={view.radiationLimit}
          alertWhen="high"
          delta={deltas?.radiationDose}
        />
        <InfoTip>{RADIATION_EXPLAINER}</InfoTip>
      </div>
    </Panel>
  );
}
