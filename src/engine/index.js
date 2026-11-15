// Game engine. Pure functions: same input, same output. Never changes the input state.
import { initialState, MOVES, WARNINGS, WAVES } from '../shared/contract.js';
import {
  RADIATION_LIMIT,
  BASE_POWER_USE,
  NO_POWER_OXYGEN_LOSS,
  HEALTH_DIVISOR,
  METER_MIN,
  METER_MAX,
  MOVE_EFFECTS,
  STARS,
  LEVELS,
  STORM_LIMITS,
  SIGNAL_SECONDS,
  SOLO_WARNING
} from './balance.js';
import { getStorm, DEFAULT_STORM_ID } from './storms/index.js';

export { getStorm };

const clamp = (n) => Math.min(METER_MAX, Math.max(METER_MIN, n));

const levelOf = (state) => LEVELS[state.world] ?? LEVELS.moon;

const isText = (v) => typeof v === 'string' && v.length > 0;

// True if a ready-made storm is safe to play: an id, a title, and 6 stages with a
// label, missionControlSees text and incoming radiation inside STORM_LIMITS.
export function isValidStorm(storm) {
  if (!storm || typeof storm !== 'object' || !isText(storm.id) || !isText(storm.title)) return false;
  const { stages } = storm;
  if (!Array.isArray(stages) || stages.length !== STORM_LIMITS.stages) return false;
  return stages.every(
    (s, i) =>
      s &&
      isText(s.label) &&
      isText(s.missionControlSees) &&
      Number.isInteger(s.incoming) &&
      s.incoming >= STORM_LIMITS.minIncoming[i] &&
      s.incoming <= STORM_LIMITS.maxIncoming[i]
  );
}

// The storm this game is playing: the ready-made one in the state, or the saved one by id.
export function getGameStorm(state) {
  return state.storm ?? getStorm(state.stormId);
}

// The stage being played now. After the last turn it stays on the last stage.
function currentStage(state) {
  const { stages } = getGameStorm(state);
  return stages[Math.min(state.stormStage, stages.length - 1)];
}

function isDustStage(state) {
  return levelOf(state).dustStages.includes(state.stormStage);
}

function isBlackoutStage(state) {
  return levelOf(state).blackoutStages.includes(state.stormStage);
}

const BLACKOUT_TEXT = 'The Sun is blocking the signal. Your message could not get through!';
const TIME_UP_TEXT = 'Mission Control did not send a message in time. The crew could not stay safe.';

// The warning Mission Control sent this turn, or undefined.
// Moon: it is already in the inbox. Mars: it waits in the outbox until next turn.
function warningSentThisTurn(state) {
  return levelOf(state).delayTurns === 0
    ? state.inbox.find((w) => w.turn === state.turn)
    : state.outbox.find((w) => w.turnSent === state.turn);
}

// The signal clock runs while the game is on, no warning has been sent this turn,
// and the Sun is not blocking the signal (nobody can send one then).
function isClockRunning(state) {
  // Play alone: Commander Sola warns by herself, so there is no clock to beat.
  if (state.solo) return false;
  return state.status === 'playing' && !isBlackoutStage(state) && !warningSentThisTurn(state);
}

// Two players: the Astronaut moves once Mission Control has had its say this wave: a warning
// sent (on Mars it is on its way), or the Sun blocking the signal. Never in Play alone (Sola warns
// at the start of every wave). The session refuses moves while this is true, so each wave is one
// warning, then one move (applyMove itself stays usable on its own, for tests and balance checks).
export function waitingForMissionControl(state) {
  return state.status === 'playing' && !state.solo && !isBlackoutStage(state) && !warningSentThisTurn(state);
}

// Play alone: the warning Commander Sola sends now, or null. Pure: it only reads the state.
// She warns about the wave her message arrives in: this wave on the Moon, the next one on Mars.
// Nothing during a blackout (the signal cannot get through) or when no wave is left to warn about.
export function autoWarning(state) {
  if (state.status !== 'playing' || isBlackoutStage(state)) return null;
  const delay = levelOf(state).delayTurns;
  const target = delay === 0 ? state.stormStage : WAVES[state.turn + delay];
  if (target === undefined) return null;
  const incoming = getGameStorm(state).stages[target]?.incoming ?? 0;
  if (incoming >= SOLO_WARNING.shelterAt) return 'shelterNow';
  if (incoming > 0) return 'stormComing';
  if (state.meters.power < SOLO_WARNING.lowPower) return 'savePower';
  return 'allClear';
}

// In solo mode, Sola's warning goes out at the start of every wave, through the same
// sendWarning as a human Mission Control (so the Mars delay and the blackout work the same).
function withAutoWarning(state) {
  if (!state.solo) return state;
  const warning = autoWarning(state);
  return warning ? sendWarning(state, warning) : state;
}

// storm: an optional ready-made storm object (Level 3: Live Sun). If it is not valid,
// the game plays the saved storm from stormId instead, so a bad storm never breaks the game.
// solo: Play alone. Commander Sola sends the warnings herself (autoWarning) and there is no clock.
export function createGame({
  mode = 'split',
  world = 'moon',
  stormId = DEFAULT_STORM_ID,
  moonStars = 0,
  storm = null,
  solo = false
} = {}) {
  const liveStorm = isValidStorm(storm) ? storm : null;
  const level = LEVELS[world] ?? LEVELS.moon;
  const stars = world === 'mars' ? moonStars : 0;
  const power = clamp(initialState.meters.power - level.powerPenalty + stars * level.powerPerStar);

  const firstLine =
    world === 'mars'
      ? `Welcome to the Mars base! ${stars} supply ${stars === 1 ? 'crate' : 'crates'} from the Moon ${stars === 1 ? 'was' : 'were'} waiting.`
      : 'Welcome to the Moon base! Listen to Mission Control to stay safe.';

  return withAutoWarning({
    ...initialState,
    status: 'playing',
    solo: Boolean(solo),
    maxTurns: WAVES.length,
    stormStage: WAVES[0], // wave 1
    mode,
    world,
    stormId: liveStorm ? liveStorm.id : getStorm(stormId).id,
    storm: liveStorm,
    moonStars,
    meters: { ...initialState.meters, power },
    inbox: [],
    outbox: [],
    lastFact: null,
    signalSecondsLeft: SIGNAL_SECONDS,
    log: [{ turn: 0, text: firstLine }]
  });
}

// The signal clock. The caller says how many seconds passed (the engine never reads the time),
// e.g. tick(state, 1) once a second. Nothing happens when the clock is not running.
// At 0 the game is lost with lostReason 'time'.
export function tick(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0 || !isClockRunning(state)) return state;
  const left = Math.max(0, (state.signalSecondsLeft ?? SIGNAL_SECONDS) - seconds);
  if (left > 0) return { ...state, signalSecondsLeft: left };
  return {
    ...state,
    signalSecondsLeft: 0,
    status: 'lost',
    lostReason: 'time',
    stars: 0,
    log: [...state.log, { turn: state.turn, text: TIME_UP_TEXT }]
  };
}

export function sendWarning(state, warning) {
  if (state.status !== 'playing' || !WARNINGS.includes(warning)) return state;
  const { turn } = state;

  if (isBlackoutStage(state)) {
    const last = state.log.at(-1);
    if (last && last.turn === turn && last.text === BLACKOUT_TEXT) return state;
    return { ...state, log: [...state.log, { turn, text: BLACKOUT_TEXT }] };
  }

  if (levelOf(state).delayTurns === 0) {
    return {
      ...state,
      inbox: [...state.inbox.filter((w) => w.turn !== turn), { turn, warning }]
    };
  }
  return {
    ...state,
    outbox: [...state.outbox.filter((w) => w.turnSent !== turn), { turnSent: turn, warning }]
  };
}

export function applyMove(state, move) {
  if (state.status !== 'playing' || !MOVES.includes(move)) return state;

  // How Mission Control's warning for this wave compares with Commander Sola's pick (autoWarning),
  // so BLIP can coach. Not in Play alone (Sola sent it) or when the signal could not get through.
  const best = state.solo ? null : autoWarning(state);
  const sentNow = warningSentThisTurn(state);

  const stage = currentStage(state);
  const effect = MOVE_EFFECTS[move];
  let { power, oxygen, radiationDose, crewHealth } = state.meters;
  let science = state.science;
  let multiplier = effect.multiplier;
  let moveText;

  // 1. Move effect
  if (move === 'raiseShield') {
    if (power >= effect.minPower) {
      power += effect.power;
      moveText = 'You raised the shield. It blocked most of the radiation.';
    } else {
      multiplier = effect.failedMultiplier;
      moveText = 'The shield had no power, so it could not block anything!';
    }
  } else if (move === 'shelter') {
    power += effect.power;
    crewHealth += effect.crewHealth;
    moveText = 'The crew hid in the shelter. Safe, but cramped.';
  } else if (move === 'savePower') {
    if (isDustStage(state)) {
      power += effect.dustPower;
      moveText = 'Dust covered the solar panels, so you only saved a little power.';
    } else {
      power += effect.power;
      moveText = 'You saved power. The batteries filled up.';
    }
  } else {
    power += effect.power;
    const points = stage.incoming === 0 ? effect.quietScience : effect.science;
    science += points;
    moveText = `You did science and earned ${points} ${points === 1 ? 'point' : 'points'}!`;
  }

  // 2. Storm radiation
  const radiationThisTurn = Math.round(stage.incoming * multiplier);
  radiationDose += radiationThisTurn;

  // 3. Base needs
  power -= BASE_POWER_USE;
  const powerOut = power <= 0;
  if (powerOut) oxygen -= NO_POWER_OXYGEN_LOSS;

  // 4. Radiation hurts the crew
  crewHealth -= Math.floor(radiationThisTurn / HEALTH_DIVISOR);

  // 5. Clamp
  power = clamp(power);
  oxygen = clamp(oxygen);
  crewHealth = clamp(crewHealth);

  // 6. Log line and fact
  let text = `${moveText} Radiation this wave: ${radiationThisTurn}.`;
  if (powerOut) text += ' Power ran out, so oxygen went down!';
  const log = [...state.log, { turn: state.turn + 1, text }];

  const lastResult = {
    turn: state.turn + 1,
    move,
    radiation: radiationThisTurn,
    shieldFailed: move === 'raiseShield' && multiplier === effect.failedMultiplier,
    dust: move === 'savePower' && isDustStage(state),
    powerOut
  };
  const lastWarningCheck = best
    ? { turn: state.turn + 1, sent: sentNow ? sentNow.warning : null, best, delayTurns: levelOf(state).delayTurns }
    : null;

  // 7. Next turn: the next wave's storm stage (after the last wave it stays on the last one)
  const turn = state.turn + 1;
  const stormStage = WAVES[turn] ?? state.stormStage;

  // 8. Mars: warnings sent last turn arrive now
  let { inbox, outbox } = state;
  if (levelOf(state).delayTurns > 0) {
    inbox = [...inbox, ...outbox.map((w) => ({ turn, turnSent: w.turnSent, warning: w.warning }))];
    outbox = [];
  }

  // 9. End check
  let status = 'playing';
  let lostReason = null;
  let stars = 0;
  if (oxygen <= 0) lostReason = 'oxygen';
  else if (crewHealth <= 0) lostReason = 'health';
  else if (radiationDose >= RADIATION_LIMIT) lostReason = 'radiation';

  if (lostReason) {
    status = 'lost';
  } else if (turn >= state.maxTurns) {
    status = 'won';
    stars = 1;
    if (crewHealth >= STARS.healthForTwo) {
      stars = 2;
      if (science >= STARS.scienceForThree) stars = 3;
    }
  }

  // Play alone: Commander Sola sends the next wave's warning straight away.
  return withAutoWarning({
    ...state,
    status,
    turn,
    stormStage,
    meters: { power, oxygen, radiationDose, crewHealth },
    science,
    inbox,
    outbox,
    lastMove: move,
    lastResult,
    lastWarningCheck,
    // The whole level, for the end screen (older saved games may not have these lists yet)
    moveResults: [...(state.moveResults ?? []), lastResult],
    warningChecks: lastWarningCheck ? [...(state.warningChecks ?? []), lastWarningCheck] : (state.warningChecks ?? []),
    lastFact: stage.fact ?? null,
    signalSecondsLeft: SIGNAL_SECONDS, // a new turn: the clock starts again
    log,
    lostReason,
    stars
  });
}

export function getAstronautView(state) {
  return {
    status: state.status,
    turn: state.turn,
    maxTurns: state.maxTurns,
    world: state.world,
    meters: { ...state.meters },
    radiationLimit: RADIATION_LIMIT,
    science: state.science,
    inbox: state.inbox,
    log: state.log,
    lastMove: state.lastMove,
    lastResult: state.lastResult ?? null,
    moveResults: state.moveResults ?? [],
    lastFact: state.lastFact ?? null,
    lostReason: state.lostReason,
    stars: state.stars,
    solo: Boolean(state.solo),
    waitingForMissionControl: waitingForMissionControl(state),
    ...clockView(state)
  };
}

// The signal clock, as both players see it.
function clockView(state) {
  return {
    signalSecondsLeft: state.signalSecondsLeft ?? SIGNAL_SECONDS,
    signalLimit: SIGNAL_SECONDS,
    clockRunning: isClockRunning(state)
  };
}

export function getMissionControlView(state) {
  const { stages } = getGameStorm(state);
  const stage = currentStage(state);
  const level = levelOf(state);
  const nextStage = WAVES[state.turn + 1];
  const next = nextStage === undefined ? null : stages[nextStage];
  const sentNow = warningSentThisTurn(state);

  return {
    status: state.status,
    turn: state.turn,
    maxTurns: state.maxTurns,
    world: state.world,
    delayTurns: level.delayTurns,
    stage: {
      label: stage.label,
      missionControlSees: stage.missionControlSees,
      dust: isDustStage(state),
      blackout: isBlackoutStage(state)
    },
    forecast: next ? next.label : null,
    lastMove: state.lastMove,
    lastFact: state.lastFact ?? null,
    crewHealth: state.meters.crewHealth,
    warningThisTurn: sentNow ? sentNow.warning : null,
    lastWarningCheck: state.lastWarningCheck ?? null,
    warningChecks: state.warningChecks ?? [],
    lostReason: state.lostReason,
    stars: state.stars,
    solo: Boolean(state.solo),
    ...clockView(state)
  };
}
