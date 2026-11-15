import { Meter, BigButton, Panel, WhyCard, SpeechBox, Portrait, PixelIcon } from '../components/index.js';
import SpaceScene from './scenes/SpaceScene.jsx';
import ControlRoomMap from './world/ControlRoomMap.jsx';
import MissionClock from './MissionClock.jsx';
import GameHud from './hud/GameHud.jsx';
import Vitals from './hud/Vitals.jsx';
import OptionsPanel from './hud/OptionsPanel.jsx';
import { useGameMenu } from './hud/useGameMenu.js';
import { usePopup, POPUP_LONG_MS } from './hud/usePopup.js';
import { stormLook, solaMoodForLook } from './scenes/stormLook.js';
import { useMeterDeltas } from './useMeterDeltas.js';
import { useGameSounds } from './sound.js';
import {
  CHARACTERS,
  MISSION_CONTROL_TABS,
  MISSION_CONTROL_TITLE,
  missionControlReadText,
  WARNING_INFO,
  MOVE_INFO,
  MARS_DELAY_NOTE,
  BLACKOUT_BADGE,
  BLACKOUT_NOTE,
  OPEN_MENU_HINT,
  LEVEL_END_TEXT,
  newStageText,
  sentText,
  warningCoachText,
  FUN_FACT_TITLE,
  novaMood,
  turnText,
} from './labels.js';
import './MissionControlScreen.css';

// Mission Control on Earth, full screen and held sideways (see hud/GameHud.jsx):
// sees the storm, cannot act, can only send a warning.
//   The control room map fills the screen (Commander Sola walks to the radio desk, the telescope
//   or the crew monitor). A slim bar on top. Pop-ups for what is new (the storm stage, a blackout,
//   the warning just sent). The Menu has three tabs: Big screen (the space picture and Sola's
//   briefing), Crew, and Warnings (the quick warning buttons), plus Options (sound, read-aloud).
//   Nova's face and crew health stay in the top bar, always in view.
// Props only (no session hook, no engine):
//   view          the Mission Control view (see src/ui/DEV3_PLAN.md)
//   onWarn        called with a warning key, e.g. onWarn('shelterNow')
//   active        false while this screen is hidden on one device (no keyboard, pop-ups wait)
//   switchButton  one device only: the top-bar button that hands the device to the Astronaut
//   pauses        true on one device (the menu pauses the game), false online. See hud/GameHud.jsx.
//   onMenuChange  (open) => ..., told when the menu opens or closes (to pause the signal clock)
// Mission Control must NOT see power, oxygen or radiation. Only crew health.
export default function MissionControlScreen({
  view,
  onWarn,
  active = true,
  switchButton = null,
  pauses = null,
  onMenuChange,
}) {
  const { stage } = view;
  const playing = view.status === 'playing';
  const ended = view.status === 'won' || view.status === 'lost';
  // On a Mars blackout turn the Sun blocks the signal: no warning can be sent.
  const blackout = Boolean(stage.blackout);
  const canWarn = playing && !blackout;
  const sent = view.warningThisTurn ? WARNING_INFO[view.warningThisTurn] : null;
  const director = CHARACTERS.director;
  const menu = useGameMenu('bigScreen');
  const healthDelta = useMeterDeltas(view.turn, { crewHealth: view.crewHealth });

  useGameSounds(view);

  // Pop-ups show on their own for a few seconds, then fold away (only while this screen shows).
  const showStage = usePopup(playing ? `stage:${view.turn}:${stage.label}` : null, active);
  const showSent = usePopup(sent ? `sent:${view.turn}:${view.warningThisTurn}` : null, active);
  const showEnd = usePopup(ended ? `end:${view.status}` : null, active);
  // BLIP coaches after each wave (how the warning compares with the best one), then shares the fun fact.
  const coach = view.lastWarningCheck?.turn === view.turn ? warningCoachText(view.lastWarningCheck) : null;
  const coachKey = coach ? `coach:${view.turn}` : null;
  const showCoach = usePopup(coachKey, active, POPUP_LONG_MS);
  const factKey = view.lastFact?.text && (coachKey == null || !showCoach) && view.turn > 0 ? `fact:${view.turn}` : null;
  const showFact = usePopup(playing ? factKey : null, active, POPUP_LONG_MS);
  const robot = CHARACTERS.robot;

  const popups = (
    <>
      {showCoach && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} size={32} text={coach} />
        </div>
      )}
      {showFact && (
        <div className="hud-popup hud-popup--blip">
          <SpeechBox who={robot.who} name={robot.name} title={FUN_FACT_TITLE} size={32} text={view.lastFact.text} />
        </div>
      )}
      {showStage && (
        <div className="hud-popup">
          <SpeechBox
            who={director.who}
            mood={blackout ? 'alert' : solaMoodForLook(stormLook(view.turn))}
            name={director.name}
            tone={blackout ? 'alert' : undefined}
            size={32}
            icon={<PixelIcon name={blackout ? 'noSignal' : 'storm'} size={20} />}
            text={blackout ? BLACKOUT_NOTE : newStageText(stage.label)}
          >
            <p>{OPEN_MENU_HINT}</p>
          </SpeechBox>
        </div>
      )}
      {showSent && (
        <p className="hud-popup hud-popup--line">
          <PixelIcon name={sent.sprite} size={24} />
          <span>{sentText(sent.label, view.delayTurns)}</span>
        </p>
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
      ...MISSION_CONTROL_TABS.options,
      content: <OptionsPanel readText={missionControlReadText(view)} meters={['crewHealth']} />,
    },
    {
      id: 'bigScreen',
      ...MISSION_CONTROL_TABS.bigScreen,
      content: (
        <>
          <SpaceScene
            world={view.world}
            turn={view.turn}
            stageName={stage.label}
            dust={Boolean(stage.dust)}
            blackout={blackout}
            messageSent={Boolean(view.warningThisTurn)}
            overlay={
              <>
                <div className="scene__top">
                  <p className="scene__title">{stage.label}</p>
                </div>
                {/* Tags sit in the bottom corner: at the top they would wrap over the picture. */}
                {(stage.dust || blackout) && (
                  <div className="scene__corner scene__corner--stack">
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
                )}
              </>
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
              {view.forecast ? `Coming next: ${view.forecast}` : 'This is the last wave'}
            </p>
          </SpeechBox>
          {coach && <SpeechBox className="mc-coach" who={robot.who} name={robot.name} size={48} text={coach} />}
          <WhyCard fact={view.lastFact} name={robot.name} title={FUN_FACT_TITLE} />
        </>
      ),
    },
    {
      id: 'crew',
      ...MISSION_CONTROL_TABS.crew,
      content: <CrewStatus view={view} />,
    },
    {
      id: 'warnings',
      ...MISSION_CONTROL_TABS.warnings,
      content: (
        <section className="mc-warn" aria-label="Quick warnings">
          <h2 className="mc-warn__title pixel-title">Quick warnings</h2>
          <p className="mc-warn__hint">No time to walk to the radio? Tap a warning here.</p>

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
      ),
    },
  ];

  return (
    <div className={`mission-control-screen world-${view.world}`}>
      <GameHud
        label={`${director.name}'s screen: Mission Control`}
        active={active}
        title={MISSION_CONTROL_TITLE}
        turn={turnText(view)}
        clock={<MissionClock view={view} who="missionControl" />}
        vitals={<Vitals meters={{ crewHealth: view.crewHealth }} deltas={healthDelta} />}
        pauses={pauses}
        onMenuChange={onMenuChange}
        switchButton={switchButton}
        popups={popups}
        menu={menu}
        tabs={tabs}
        menuLabel="Mission Control menu"
        map={
          <ControlRoomMap
            view={view}
            onWarn={onWarn}
            // Only the screen that shows, with its menu closed, takes the arrow keys.
            active={active && !menu.isOpen}
          />
        }
      />
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
