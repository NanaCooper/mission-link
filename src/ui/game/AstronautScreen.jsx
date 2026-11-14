import { useState } from 'react';
import { Meter, BigButton, Panel, WhyCard, InfoTip, SpeechBox, Portrait, PixelIcon } from '../components/index.js';
import BaseScene from './scenes/BaseScene.jsx';
import { useMeterDeltas } from './useMeterDeltas.js';
import { useGameSounds, useSoundOn, setSoundOn, unlockAudio } from './sound.js';
import { useReadAloud } from './useReadAloud.js';
import {
  CHARACTERS,
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
  novaMood,
  solaMoodForWarning,
  turnText,
} from './labels.js';
import './AstronautScreen.css';

// The Astronaut's screen: a picture of the base, the newest message from
// Mission Control, the base meters, the four move buttons, and what happened last turn.
// It only shows the view it is given. The engine decides everything.
//
// Props: { view, onMove }  view = getAstronautView(state), onMove(moveKey)
export default function AstronautScreen({ view, onMove }) {
  const isPlaying = view.status === 'playing';
  const lastLog = view.log.length > 0 ? view.log[view.log.length - 1] : null;
  const robot = CHARACTERS.robot;
  const moveTag = MOVE_SCENE_TAG[view.lastMove];
  const guess = usePrediction(view);

  useGameSounds(view);

  return (
    <div className={`astronaut-screen world-${view.world}`}>
      <BaseScene
        world={view.world}
        lastMove={view.lastMove}
        lowPower={view.meters.power < 25}
        turn={view.turn}
        overlay={
          <>
            <header className="scene__top scene__top--spread">
              <h1 className="scene__title astronaut-screen__title">{WORLD_NAMES[view.world]}</h1>
              <p className="scene__title astronaut-screen__turn">{turnText(view)}</p>
            </header>
            {moveTag && (
              <p key={view.turn} className="scene__tag scene__tag--move scene__corner">
                {moveTag}
              </p>
            )}
          </>
        }
      />

      <ScreenTools readText={astronautReadText(view)} />

      <MissionControlMessage view={view} />

      <StatusPanel view={view} />

      {guess.asking && <PredictionQuestion onAnswer={guess.answer} />}

      <MoveButtons disabled={!isPlaying} onMove={onMove} />

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
  );
}

// The four move buttons.
export function MoveButtons({ disabled, onMove }) {
  return (
    <section className="astronaut-screen__moves" aria-label="Pick your move">
      <h2 className="astronaut-screen__moves-title pixel-title">Pick your move</h2>
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

// "Sound on / off" and "Read to me", shown on both player screens.
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

// The newest message from Mission Control, spoken by Commander Sola.
// A message that arrived this turn is "new". An older one is shown quietly,
// so the Astronaut never mistakes last turn's warning for a fresh one.
function MissionControlMessage({ view }) {
  const director = CHARACTERS.director;
  const newest = view.inbox.length > 0 ? view.inbox[view.inbox.length - 1] : null;
  const warning = newest ? WARNING_INFO[newest.warning] : null;
  const isNew = Boolean(warning) && newest.turn === view.turn;

  let box;
  if (isNew) {
    box = (
      <SpeechBox
        who={director.who}
        mood={solaMoodForWarning(newest.warning)}
        name={director.name}
        title="Mission Control says:"
        tag="New"
        tone="alert"
        size={48}
        big
        icon={<PixelIcon name={warning.sprite} size={28} />}
        text={`${warning.label}!`}
      />
    );
  } else if (warning) {
    box = (
      <SpeechBox who={director.who} mood="calm" name={director.name} tone="quiet" size={48} text={NO_NEW_MESSAGE_TEXT}>
        <p>Last message: {warning.label}</p>
      </SpeechBox>
    );
  } else {
    box = (
      <SpeechBox who={director.who} mood="calm" name={director.name} tone="quiet" size={48} text={NO_MESSAGE_TEXT}>
        <p>{NO_MESSAGE_HINT}</p>
      </SpeechBox>
    );
  }

  return (
    <section className="astronaut-screen__message" role="status" aria-live="polite">
      {box}
    </section>
  );
}

// Nova's face and the four base meters. After a move, each meter shows how much it changed.
function StatusPanel({ view }) {
  const { meters } = view;
  const deltas = useMeterDeltas(view.turn, meters);
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
