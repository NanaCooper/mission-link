// Game engine. Pure functions: same input, same output. Never changes the input state.
import { initialState, MOVES, WARNINGS } from '../shared/contract.js';
import {
  RADIATION_LIMIT,
  BASE_POWER_USE,
  NO_POWER_OXYGEN_LOSS,
  HEALTH_DIVISOR,
  METER_MIN,
  METER_MAX,
  MOVE_EFFECTS,
  STARS,
  LEVELS
} from './balance.js';
import { getStorm, DEFAULT_STORM_ID } from './storms/index.js';

export { getStorm };

const clamp = (n) => Math.min(METER_MAX, Math.max(METER_MIN, n));

const levelOf = (state) => LEVELS[state.world] ?? LEVELS.moon;

// The stage being played now. After the last turn it stays on the last stage.
function currentStage(state) {
  const { stages } = getStorm(state.stormId);
  return stages[Math.min(state.stormStage, stages.length - 1)];
}

function isDustStage(state) {
  return levelOf(state).dustStages.includes(state.stormStage);
}

function isBlackoutStage(state) {
  return levelOf(state).blackoutStages.includes(state.stormStage);
}

const BLACKOUT_TEXT = 'The Sun is blocking the signal. Your message could not get through!';

export function createGame({ mode = 'split', world = 'moon', stormId = DEFAULT_STORM_ID, moonStars = 0 } = {}) {
  const level = LEVELS[world] ?? LEVELS.moon;
  const stars = world === 'mars' ? moonStars : 0;
  const power = clamp(initialState.meters.power - level.powerPenalty + stars * level.powerPerStar);

  const firstLine =
    world === 'mars'
      ? `Welcome to the Mars base! ${stars} supply ${stars === 1 ? 'crate' : 'crates'} from the Moon ${stars === 1 ? 'was' : 'were'} waiting.`
      : 'Welcome to the Moon base! Listen to Mission Control to stay safe.';

  return {
    ...initialState,
    status: 'playing',
    mode,
    world,
    stormId: getStorm(stormId).id,
    moonStars,
    meters: { ...initialState.meters, power },
    inbox: [],
    outbox: [],
    lastFact: null,
    log: [{ turn: 0, text: firstLine }]
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
  let text = `${moveText} Radiation this turn: ${radiationThisTurn}.`;
  if (powerOut) text += ' Power ran out, so oxygen went down!';
  const log = [...state.log, { turn: state.turn + 1, text }];

  // 7. Next turn
  const turn = state.turn + 1;
  const stormStage = state.stormStage + 1;

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

  return {
    ...state,
    status,
    turn,
    stormStage,
    meters: { power, oxygen, radiationDose, crewHealth },
    science,
    inbox,
    outbox,
    lastMove: move,
    lastFact: stage.fact ?? null,
    log,
    lostReason,
    stars
  };
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
    lastFact: state.lastFact ?? null,
    lostReason: state.lostReason,
    stars: state.stars
  };
}

export function getMissionControlView(state) {
  const { stages } = getStorm(state.stormId);
  const stage = currentStage(state);
  const level = levelOf(state);
  const next = stages[state.stormStage + 1];

  const sentNow =
    level.delayTurns === 0
      ? state.inbox.find((w) => w.turn === state.turn)
      : state.outbox.find((w) => w.turnSent === state.turn);

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
    lostReason: state.lostReason,
    stars: state.stars
  };
}
