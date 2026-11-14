import { Meter, BigButton, Panel, WhyCard, SpeechBox, Portrait, PixelIcon } from '../components/index.js';
import SpaceScene from './scenes/SpaceScene.jsx';
import { stormLook, solaMoodForLook } from './scenes/stormLook.js';
import { useMeterDeltas } from './useMeterDeltas.js';
import {
  CHARACTERS,
  WARNING_INFO,
  MOVE_INFO,
  MARS_DELAY_NOTE,
  BLACKOUT_BADGE,
  BLACKOUT_NOTE,
  novaMood,
  turnText,
} from './labels.js';
import './MissionControlScreen.css';

// Mission Control on Earth: sees the storm, cannot act, can only send a warning.
// Props only (no session hook, no engine): { view, onWarn }
//   view    the Mission Control view (see src/ui/DEV3_PLAN.md)
//   onWarn  called with a warning key, e.g. onWarn('shelterNow')
// Mission Control must NOT see power, oxygen or radiation. Only crew health.
export default function MissionControlScreen({ view, onWarn }) {
  const { stage } = view;
  const playing = view.status === 'playing';
  // On a Mars blackout turn the Sun blocks the signal: no warning can be sent.
  const blackout = Boolean(stage.blackout);
  const canWarn = playing && !blackout;
  const director = CHARACTERS.director;

  return (
    <div className={`mission-control-screen world-${view.world}`}>
      <header className="mc-header">
        <h2 className="mc-header__title pixel-title">Mission Control, Earth</h2>
        <p className="mc-header__turn">{turnText(view)}</p>
      </header>

      <SpaceScene
        world={view.world}
        turn={view.turn}
        stageName={stage.label}
        dust={Boolean(stage.dust)}
        blackout={blackout}
        overlay={
          <div className="scene__top">
            <p className="scene__title">{stage.label}</p>
            {stage.dust && (
              <p className="scene__tag">
                <PixelIcon name="wind" size={14} /> Dust storm
              </p>
            )}
            {blackout && (
              <p className="scene__tag scene__tag--danger">
                <PixelIcon name="noSignal" size={14} /> {BLACKOUT_BADGE}
              </p>
            )}
          </div>
        }
      />

      <SpeechBox
        className="mc-brief"
        who={director.who}
        mood={solaMoodForLook(stormLook(view.turn))}
        name={director.name}
        text={stage.missionControlSees}
      >
        <p className="mc-brief__next">
          <PixelIcon name="next" size={16} />{' '}
          {view.forecast ? `Coming next: ${view.forecast}` : 'This is the last turn'}
        </p>
      </SpeechBox>

      <CrewStatus view={view} />

      <section className="mc-warn" aria-label="Send a warning">
        <h3 className="mc-warn__title pixel-title">Send a warning</h3>

        {blackout && (
          <p className="mc-note mc-note--blackout" role="status">
            <PixelIcon name="noSignal" size={28} />
            <span>{BLACKOUT_NOTE}</span>
          </p>
        )}

        {view.delayTurns === 1 && !blackout && (
          <p className="mc-note" role="note">
            <PixelIcon name="signal" size={28} />
            <span>{MARS_DELAY_NOTE}</span>
          </p>
        )}

        <div className="mc-warn__buttons">
          {Object.entries(WARNING_INFO).map(([warningKey, info]) => (
            <BigButton
              key={warningKey}
              icon={<PixelIcon name={info.sprite} size={30} />}
              label={info.label}
              onClick={() => onWarn(warningKey)}
              disabled={!canWarn}
              selected={warningKey === view.warningThisTurn}
            />
          ))}
        </div>
      </section>

      <WhyCard fact={view.lastFact} name={CHARACTERS.robot.name} />
    </div>
  );
}

// Nova's face, her last move and the crew's health. Mission Control sees nothing else of the base.
function CrewStatus({ view }) {
  const astronaut = CHARACTERS.astronaut;
  const lastMove = view.lastMove ? MOVE_INFO[view.lastMove] : null;
  const deltas = useMeterDeltas(view.turn, { crewHealth: view.crewHealth });
  const mood = novaMood({ crewHealth: view.crewHealth });

  return (
    <Panel className="mc-crew">
      <Portrait who={astronaut.who} mood={mood} size={48} label={`${astronaut.name} looks ${mood}`} />
      <div className="mc-crew__info">
        <p className="mc-crew__move">
          {lastMove ? (
            <>
              <PixelIcon name={lastMove.sprite} size={20} /> {astronaut.name}&apos;s last move: {lastMove.label}
            </>
          ) : (
            'No move yet'
          )}
        </p>
        <Meter
          icon={<PixelIcon name="health" size={20} />}
          label="Crew health"
          tone="health"
          value={view.crewHealth}
          max={100}
          showMax={false}
          delta={deltas?.crewHealth}
        />
      </div>
    </Panel>
  );
}
