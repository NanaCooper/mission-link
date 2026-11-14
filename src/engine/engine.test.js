import { describe, it, expect } from 'vitest';
import {
  createGame,
  sendWarning,
  applyMove,
  getAstronautView,
  getMissionControlView,
  getStorm,
  getGameStorm,
  isValidStorm,
  tick
} from './index.js';
import { RADIATION_LIMIT, LEVELS, STORM_LIMITS, SIGNAL_SECONDS } from './balance.js';
import { MOVES, WAVES, initialState } from '../shared/contract.js';

const moon = () => createGame({ mode: 'split', world: 'moon' });
const mars = (moonStars = 0) => createGame({ mode: 'split', world: 'mars', moonStars });

// Play moves in order, stopping if the game ends.
function play(state, moves) {
  for (const m of moves) {
    if (state.status !== 'playing') break;
    state = applyMove(state, m);
  }
  return state;
}

// Jump to a given storm stage with full meters, to test a single move there.
// The turn is that stage's wave (WAVES), or 0 for a stage no wave plays.
const atStage = (state, stage) => ({ ...state, turn: Math.max(0, WAVES.indexOf(stage)), stormStage: stage });

const QUIET = 0; // incoming 0
const PEAK = 3; // incoming 40

describe('createGame', () => {
  it('starts a playing Moon game with full meters and a first log line', () => {
    const s = moon();
    expect(s.status).toBe('playing');
    expect(s.world).toBe('moon');
    expect(s.turn).toBe(0);
    expect(s.meters).toEqual({ power: 100, oxygen: 100, radiationDose: 0, crewHealth: 100 });
    expect(s.log).toHaveLength(1);
    expect(s.lastFact).toBeNull();
  });

  it('Mars starts 15 power lower with 0 stars and equal to the Moon with 3 stars', () => {
    expect(mars(0).meters.power).toBe(moon().meters.power - 15);
    expect(mars(3).meters.power).toBe(moon().meters.power);
  });

  it('Mars first log line mentions the supply crates', () => {
    expect(mars(2).log[0].text).toMatch(/2 supply crates/);
  });

  it('does not change the shared initialState', () => {
    const before = JSON.stringify(initialState);
    play(moon(), MOVES);
    expect(JSON.stringify(initialState)).toBe(before);
  });
});

describe('move effects', () => {
  it('raiseShield at a quiet stage and at the peak', () => {
    const q = applyMove(atStage(moon(), QUIET), 'raiseShield');
    expect(q.meters.power).toBe(70);
    expect(q.meters.radiationDose).toBe(0);

    const p = applyMove(atStage(moon(), PEAK), 'raiseShield');
    expect(p.meters.power).toBe(70);
    expect(p.meters.radiationDose).toBe(12); // round(40 * 0.3)
    expect(p.meters.crewHealth).toBe(97); // floor(12 / 4) = 3
  });

  it('raiseShield fails when power is below 20', () => {
    const low = atStage(moon(), PEAK);
    const s = applyMove({ ...low, meters: { ...low.meters, power: 15 } }, 'raiseShield');
    expect(s.meters.radiationDose).toBe(40);
    expect(s.meters.power).toBe(5); // no shield cost, only base use
    expect(s.log.at(-1).text).toMatch(/no power/);
  });

  it('shelter at a quiet stage and at the peak', () => {
    const q = applyMove(atStage(moon(), QUIET), 'shelter');
    expect(q.meters.power).toBe(85);
    expect(q.meters.crewHealth).toBe(85);
    expect(q.meters.radiationDose).toBe(0);

    const p = applyMove(atStage(moon(), PEAK), 'shelter');
    expect(p.meters.radiationDose).toBe(4);
    expect(p.meters.crewHealth).toBe(84); // -15 cramped, -1 radiation
  });

  it('savePower at a quiet stage and at the peak', () => {
    const start = moon();
    const half = { ...start, meters: { ...start.meters, power: 50 } };
    const q = applyMove(atStage(half, QUIET), 'savePower');
    expect(q.meters.power).toBe(55);
    expect(q.meters.radiationDose).toBe(0);

    const p = applyMove(atStage(half, PEAK), 'savePower');
    expect(p.meters.power).toBe(55);
    expect(p.meters.radiationDose).toBe(40);
    expect(p.status).toBe('lost');
  });

  it('doScience scores +2 at a quiet stage and +1 at the peak', () => {
    const q = applyMove(atStage(moon(), QUIET), 'doScience');
    expect(q.science).toBe(2);
    expect(q.meters.power).toBe(80);

    const p = applyMove(atStage(moon(), PEAK), 'doScience');
    expect(p.science).toBe(1);
    expect(p.meters.radiationDose).toBe(40);
  });

  it('no power means oxygen drops by 25', () => {
    const s = moon();
    const s2 = applyMove({ ...s, meters: { ...s.meters, power: 5 } }, 'doScience');
    expect(s2.meters.power).toBe(0);
    expect(s2.meters.oxygen).toBe(75);
  });

  it('ignores unknown moves and moves after the game ends', () => {
    const s = moon();
    expect(applyMove(s, 'dance')).toBe(s);
    const over = { ...s, status: 'won' };
    expect(applyMove(over, 'shelter')).toBe(over);
  });
});

describe('Mars dust', () => {
  const dustStage = LEVELS.mars.dustStages[0];
  const halfPower = (s) => ({ ...s, meters: { ...s.meters, power: 50 } });

  it('savePower gives +5 on the Mars dust stage and +15 on the same Moon stage', () => {
    const m = applyMove(atStage(halfPower(mars()), dustStage), 'savePower');
    expect(m.meters.power).toBe(45);
    expect(m.log.at(-1).text).toMatch(/[Dd]ust/);

    const l = applyMove(atStage(halfPower(moon()), dustStage), 'savePower');
    expect(l.meters.power).toBe(55);
  });

  it('Mission Control sees dust only on the Mars dust stage, Astronaut never does', () => {
    for (let stage = 0; stage < 6; stage++) {
      expect(getMissionControlView(atStage(mars(), stage)).stage.dust).toBe(stage === dustStage);
      expect(getMissionControlView(atStage(moon(), stage)).stage.dust).toBe(false);
      expect(getAstronautView(atStage(mars(), stage))).not.toHaveProperty('dust');
    }
  });
});

describe('warnings', () => {
  it('Moon warnings arrive straight away', () => {
    const s = sendWarning(moon(), 'stormComing');
    expect(s.inbox).toEqual([{ turn: 0, warning: 'stormComing' }]);
    expect(getMissionControlView(s).warningThisTurn).toBe('stormComing');
  });

  it('Mars warnings arrive one turn later', () => {
    const s = sendWarning(mars(), 'shelterNow');
    expect(s.inbox).toEqual([]);
    expect(s.outbox).toEqual([{ turnSent: 0, warning: 'shelterNow' }]);
    expect(getMissionControlView(s).warningThisTurn).toBe('shelterNow');

    const s2 = applyMove(s, 'doScience');
    expect(s2.outbox).toEqual([]);
    expect(s2.inbox).toEqual([{ turn: 1, turnSent: 0, warning: 'shelterNow' }]);
    expect(getMissionControlView(s2).delayTurns).toBe(1);
  });

  it('only one warning per turn: a new one replaces the old', () => {
    const m = sendWarning(sendWarning(moon(), 'stormComing'), 'shelterNow');
    expect(m.inbox).toEqual([{ turn: 0, warning: 'shelterNow' }]);

    const r = sendWarning(sendWarning(mars(), 'stormComing'), 'shelterNow');
    expect(r.outbox).toEqual([{ turnSent: 0, warning: 'shelterNow' }]);
  });

  it('ignores unknown warnings and warnings after the game ends', () => {
    const s = moon();
    expect(sendWarning(s, 'panic')).toBe(s);
    const over = { ...s, status: 'lost' };
    expect(sendWarning(over, 'allClear')).toBe(over);
  });
});

describe('Mars signal blackout', () => {
  const blackoutStage = LEVELS.mars.blackoutStages[0];

  it('on the Mars blackout stage no warning is stored and the log says why', () => {
    const s = atStage(mars(), blackoutStage);
    const s2 = sendWarning(s, 'shelterNow');
    expect(s2.outbox).toEqual([]);
    expect(s2.inbox).toEqual([]);
    expect(s2.log.at(-1).text).toMatch(/blocking the signal/);
    expect(getMissionControlView(s2).warningThisTurn).toBeNull();
  });

  it('sending twice during a blackout adds only one log line', () => {
    const s = atStage(mars(), blackoutStage);
    const once = sendWarning(s, 'shelterNow');
    expect(sendWarning(once, 'allClear').log).toHaveLength(once.log.length);
  });

  it('the same stage on the Moon has no blackout', () => {
    const s = sendWarning(atStage(moon(), blackoutStage), 'shelterNow');
    expect(s.inbox).toEqual([{ turn: WAVES.indexOf(blackoutStage), warning: 'shelterNow' }]);
  });

  it('Mission Control sees blackout only on the Mars blackout stage', () => {
    for (let stage = 0; stage < 6; stage++) {
      expect(getMissionControlView(atStage(mars(), stage)).stage.blackout).toBe(stage === blackoutStage);
      expect(getMissionControlView(atStage(moon(), stage)).stage.blackout).toBe(false);
      expect(getAstronautView(atStage(mars(), stage))).not.toHaveProperty('blackout');
    }
  });

  it('a warning sent the turn before the blackout still arrives', () => {
    const s = sendWarning(atStage(mars(), blackoutStage - 1), 'shelterNow');
    const s2 = applyMove(s, 'raiseShield');
    expect(s2.inbox.at(-1).warning).toBe('shelterNow');
  });
});

describe('the signal clock', () => {
  const blackoutStage = LEVELS.mars.blackoutStages[0];

  it('starts full at the start of a game and of every turn', () => {
    expect(moon().signalSecondsLeft).toBe(SIGNAL_SECONDS);
    const later = applyMove(tick(moon(), 25), 'doScience');
    expect(later.signalSecondsLeft).toBe(SIGNAL_SECONDS);
  });

  it('counts down by the seconds it is given', () => {
    expect(tick(moon(), 1).signalSecondsLeft).toBe(SIGNAL_SECONDS - 1);
    expect(tick(tick(moon(), 10), 5).signalSecondsLeft).toBe(SIGNAL_SECONDS - 15);
  });

  it('ignores zero, negative and broken amounts of time', () => {
    const s = moon();
    for (const seconds of [0, -3, NaN, Infinity, undefined, '5']) expect(tick(s, seconds)).toBe(s);
  });

  it('stops once a warning is sent this turn, on the Moon and on Mars', () => {
    for (const start of [moon(), mars()]) {
      const sent = sendWarning(tick(start, 20), 'shelterNow');
      expect(tick(sent, 100)).toBe(sent);
      expect(getMissionControlView(sent).clockRunning).toBe(false);
      expect(getAstronautView(sent).clockRunning).toBe(false);
    }
  });

  it('runs again on the next turn, even after a warning was sent', () => {
    const next = applyMove(sendWarning(moon(), 'stormComing'), 'raiseShield');
    expect(getMissionControlView(next).clockRunning).toBe(true);
    expect(tick(next, 1).signalSecondsLeft).toBe(SIGNAL_SECONDS - 1);
  });

  it('on Mars, a warning that arrives this turn does not stop this turn\'s clock', () => {
    const next = applyMove(sendWarning(mars(), 'shelterNow'), 'raiseShield'); // it arrives now
    expect(next.inbox.at(-1).warning).toBe('shelterNow');
    expect(getMissionControlView(next).clockRunning).toBe(true);
  });

  it('pauses during the Mars signal blackout, but not on the same stage on the Moon', () => {
    const blocked = atStage(mars(), blackoutStage);
    expect(tick(blocked, 100)).toBe(blocked);
    expect(getMissionControlView(blocked).clockRunning).toBe(false);
    expect(tick(atStage(moon(), blackoutStage), 1).signalSecondsLeft).toBe(SIGNAL_SECONDS - 1);
  });

  it('loses the game with "time" when it reaches 0, and never goes below 0', () => {
    const lost = tick(moon(), SIGNAL_SECONDS + 30);
    expect(lost.status).toBe('lost');
    expect(lost.lostReason).toBe('time');
    expect(lost.stars).toBe(0);
    expect(lost.signalSecondsLeft).toBe(0);
    expect(lost.log.at(-1).text).toMatch(/did not send a message in time/);
    expect(getMissionControlView(lost).lostReason).toBe('time');
  });

  it('does nothing after the game ends, and moves and warnings are then ignored', () => {
    const lost = tick(moon(), SIGNAL_SECONDS);
    expect(tick(lost, 5)).toBe(lost);
    expect(applyMove(lost, 'shelter')).toBe(lost);
    expect(sendWarning(lost, 'allClear')).toBe(lost);
    const won = { ...moon(), status: 'won' };
    expect(tick(won, 5)).toBe(won);
  });

  it('never changes the state it is given', () => {
    const s = tick(mars(), 7);
    const before = JSON.stringify(s);
    tick(s, 3);
    tick(s, SIGNAL_SECONDS);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('shows the same clock to both players', () => {
    const s = tick(moon(), 12);
    for (const view of [getAstronautView(s), getMissionControlView(s)]) {
      expect(view.signalSecondsLeft).toBe(SIGNAL_SECONDS - 12);
      expect(view.signalLimit).toBe(SIGNAL_SECONDS);
      expect(view.clockRunning).toBe(true);
    }
  });
});

describe('views', () => {
  it('after a move, both views carry lastFact from the stage just played', () => {
    const s = applyMove(moon(), 'doScience');
    const fact = getStorm(s.stormId).stages[WAVES[0]].fact;
    expect(getAstronautView(s).lastFact).toEqual(fact);
    expect(getMissionControlView(s).lastFact).toEqual(fact);
  });

  it('astronaut view has radiationLimit from balance.js and no storm data', () => {
    const v = getAstronautView(moon());
    expect(v.radiationLimit).toBe(RADIATION_LIMIT);
    expect(Object.keys(v).sort()).toEqual(
      ['status', 'turn', 'maxTurns', 'world', 'meters', 'radiationLimit', 'science', 'inbox',
        'log', 'lastMove', 'lastFact', 'lostReason', 'stars',
        'signalSecondsLeft', 'signalLimit', 'clockRunning'].sort()
    );
  });

  it('mission control view shows the stage and forecast but no other meters', () => {
    const v = getMissionControlView(moon());
    expect(v.stage.label).toBe(getStorm(moon().stormId).stages[WAVES[0]].label);
    expect(v.forecast).toBe(getStorm(moon().stormId).stages[WAVES[1]].label);
    expect(v.delayTurns).toBe(0);
    expect(v).not.toHaveProperty('meters');
    expect(v.crewHealth).toBe(100);
  });

  it('forecast is null on the last wave', () => {
    expect(getMissionControlView(atStage(moon(), WAVES[WAVES.length - 1])).forecast).toBeNull();
  });
});

describe('end of game', () => {
  it('loses by oxygen', () => {
    const s = moon();
    const s2 = applyMove({ ...s, meters: { ...s.meters, power: 0, oxygen: 20 } }, 'shelter');
    expect(s2.status).toBe('lost');
    expect(s2.lostReason).toBe('oxygen');
    expect(s2.stars).toBe(0);
  });

  it('loses by health', () => {
    const s = moon();
    const s2 = applyMove({ ...s, meters: { ...s.meters, crewHealth: 5 } }, 'shelter');
    expect(s2.lostReason).toBe('health');
  });

  it('loses by radiation', () => {
    const s = play(moon(), Array(6).fill('doScience'));
    expect(s.lostReason).toBe('radiation');
    expect(s.meters.radiationDose).toBeGreaterThanOrEqual(RADIATION_LIMIT);
  });

  it('wins with 1, 2 and 3 stars', () => {
    const last = atStage(moon(), WAVES[WAVES.length - 1]); // the last wave
    const withMeters = (m, science) => ({ ...last, science, meters: { ...last.meters, ...m } });

    expect(applyMove(withMeters({ crewHealth: 40 }, 0), 'savePower').stars).toBe(1);
    expect(applyMove(withMeters({ crewHealth: 80 }, 0), 'savePower').stars).toBe(2);
    expect(applyMove(withMeters({ crewHealth: 80 }, 2), 'savePower').stars).toBe(3);
    expect(applyMove(withMeters({ crewHealth: 80 }, 2), 'savePower').status).toBe('won');
  });
});

describe('safety', () => {
  it('meters stay between 0 and 100 in every possible game', () => {
    for (const plan of allPlans()) {
      let s = moon();
      for (const m of plan) {
        s = applyMove(s, m);
        for (const v of [s.meters.power, s.meters.oxygen, s.meters.crewHealth]) {
          expect(v >= 0 && v <= 100).toBe(true);
        }
      }
    }
  });

  it('never changes the input state', () => {
    const s = sendWarning(mars(), 'shelterNow');
    const before = JSON.stringify(s);
    applyMove(s, 'raiseShield');
    sendWarning(s, 'allClear');
    getAstronautView(s);
    getMissionControlView(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});

// Every possible six-move plan: 4^6 = 4096.
function allPlans() {
  const plans = [[]];
  for (let i = 0; i < WAVES.length; i++) {
    const next = [];
    for (const p of plans) for (const m of MOVES) next.push([...p, m]);
    plans.splice(0, plans.length, ...next);
  }
  return plans;
}

// A ready-made storm (Level 3: Live Sun) with the given incoming radiation per stage.
function makeStorm(incoming, extra = {}) {
  return {
    id: 'live-test',
    title: 'Test Live Storm',
    realDates: 'Test',
    savedOn: null,
    source: { name: 'NASA DONKI', url: '' },
    scalingNote: 'Test',
    whatReallyHappened: ['Test'],
    stages: incoming.map((n, i) => ({
      label: `Live stage ${i}`,
      missionControlSees: `Live stage ${i} text`,
      incoming: n,
      realData: {},
      fact: { text: `Live fact ${i}`, source: { name: 'NASA', url: '' } }
    })),
    ...extra
  };
}

describe('ready-made storm (Level 3: Live Sun)', () => {
  const live = makeStorm([0, 5, 10, 45, 20, 0]);

  it('createGame keeps a valid storm in the state and uses its id', () => {
    const s = createGame({ world: 'mars', moonStars: 2, storm: live });
    expect(s.storm).toBe(live);
    expect(s.stormId).toBe('live-test');
    expect(getGameStorm(s)).toBe(live);
  });

  it('without a storm, nothing changes: storm is null and the saved storm plays', () => {
    const s = moon();
    expect(s.storm).toBeNull();
    expect(getGameStorm(s)).toBe(getStorm(s.stormId));
  });

  it('the storm drives radiation, the Mission Control view and lastFact', () => {
    const s = atStage(createGame({ storm: live }), PEAK);
    expect(getMissionControlView(s).stage.label).toBe('Live stage 3');
    expect(getMissionControlView(s).forecast).toBe('Live stage 4');
    const s2 = applyMove(s, 'raiseShield');
    expect(s2.meters.radiationDose).toBe(14); // round(45 * 0.3)
    expect(s2.lastFact.text).toBe('Live fact 3');
    expect(s2.storm).toBe(live);
  });

  it('an invalid storm falls back to the saved storm', () => {
    const bad = [
      null,
      'storm',
      { ...live, id: '' },
      { ...live, title: undefined },
      { ...live, stages: live.stages.slice(0, 5) },
      makeStorm([0, 5, 10, 60, 20, 0]), // peak too high
      makeStorm([0, 5, 10, 20, 20, 0]), // peak too low
      makeStorm([5, 5, 10, 40, 20, 0]), // first stage must be quiet
      makeStorm([0, 5, 10, 40.5, 20, 0]), // not a whole number
      { ...live, stages: live.stages.map((st, i) => (i === 2 ? { ...st, label: '' } : st)) }
    ];
    for (const storm of bad) {
      expect(isValidStorm(storm)).toBe(false);
      const s = createGame({ storm });
      expect(s.storm).toBeNull();
      expect(s.stormId).toBe(moon().stormId);
    }
  });

  it('the saved storms are valid storms too', () => {
    expect(isValidStorm(getStorm(moon().stormId))).toBe(true);
    expect(isValidStorm(getStorm('placeholder'))).toBe(true);
  });

  it('every corner of STORM_LIMITS stays fair on both levels', () => {
    const { minIncoming, maxIncoming } = STORM_LIMITS;
    const plans = allPlans();
    // Only stages 1-4 have a range, so 2^4 = 16 corners.
    const ranged = minIncoming.map((lo, i) => i).filter((i) => minIncoming[i] !== maxIncoming[i]);
    for (let mask = 0; mask < 1 << ranged.length; mask++) {
      const incoming = [...minIncoming];
      ranged.forEach((stage, bit) => {
        if ((mask >> bit) & 1) incoming[stage] = maxIncoming[stage];
      });
      const storm = makeStorm(incoming);
      expect(isValidStorm(storm)).toBe(true);
      for (const world of ['moon', 'mars']) {
        const start = createGame({ world, moonStars: 0, storm });
        expect(play(start, Array(WAVES.length).fill('doScience')).status).toBe('lost');
        expect(play(start, Array(WAVES.length).fill('shelter')).stars).toBeLessThanOrEqual(1);
        const threeStarPlan = plans.find((plan) => play(start, plan).stars === 3);
        expect(threeStarPlan, `${world} ${incoming} has no 3-star plan`).toBeDefined();
      }
    }
  }, 30000);
});

describe('3 waves', () => {
  it('a level is 3 waves: flare spotted, particles arrive (the peak), storm fading', () => {
    const s = moon();
    expect(s.maxTurns).toBe(3);
    expect(s.stormStage).toBe(WAVES[0]);
    const stages = getStorm(s.stormId).stages;
    expect(WAVES.map((i) => stages[i].label)).toEqual(['Flare spotted', 'Particles arrive', 'Storm fading']);
  });

  it('each move moves on to the next wave, and the third move ends the level', () => {
    let s = moon();
    s = applyMove(s, 'raiseShield');
    expect([s.turn, s.stormStage, s.status]).toEqual([1, WAVES[1], 'playing']);
    s = applyMove(s, 'raiseShield');
    expect([s.turn, s.stormStage, s.status]).toEqual([2, WAVES[2], 'playing']);
    s = applyMove(s, 'raiseShield');
    expect(s.turn).toBe(3);
    expect(s.status).toBe('won');
  });

  it('the Mars dust is on wave 1 and the Mars blackout on wave 3', () => {
    expect(LEVELS.mars.dustStages).toEqual([WAVES[0]]);
    expect(LEVELS.mars.blackoutStages).toEqual([WAVES[2]]);
  });
});

describe('balance: full Moon games', () => {
  it('doScience every turn loses by radiation', () => {
    expect(play(moon(), Array(3).fill('doScience')).lostReason).toBe('radiation');
  });

  it('not protecting the crew at the peak (wave 2) always loses', () => {
    for (const first of MOVES) {
      for (const peak of ['savePower', 'doScience']) {
        for (const last of MOVES) {
          expect(play(moon(), [first, peak, last]).status, `${first},${peak},${last}`).toBe('lost');
          expect(play(mars(), [first, peak, last]).status, `mars ${first},${peak},${last}`).toBe('lost');
        }
      }
    }
  });

  it('the same move every turn never earns 3 stars', () => {
    for (const move of MOVES) expect(play(moon(), Array(3).fill(move)).stars).toBeLessThan(3);
  });

  it('raiseShield every turn is safe but earns no science (2 stars)', () => {
    const s = play(moon(), Array(3).fill('raiseShield'));
    expect(s.status).toBe('won');
    expect(s.stars).toBe(2);
  });

  it('shelter every turn earns no more than 1 star', () => {
    expect(play(moon(), Array(3).fill('shelter')).stars).toBeLessThanOrEqual(1);
  });

  it('a smart plan wins with 3 stars: science, protect at the peak, science', () => {
    for (const protect of ['shelter', 'raiseShield']) {
      const s = play(moon(), ['doScience', protect, 'doScience']);
      expect(s.status).toBe('won');
      expect(s.stars).toBe(3);
    }
  });
});

describe('balance: full Mars games (0 Moon stars)', () => {
  it('doScience every turn loses', () => {
    expect(play(mars(), Array(3).fill('doScience')).status).toBe('lost');
  });

  it('shelter every turn earns no more than 1 star', () => {
    expect(play(mars(), Array(3).fill('shelter')).stars).toBeLessThanOrEqual(1);
  });

  it('at least one of the 64 plans wins with 3 stars', () => {
    const count = (world) => {
      const tally = { won: 0, threeStars: 0 };
      for (const plan of allPlans()) {
        const s = play(createGame({ world, moonStars: 0 }), plan);
        if (s.status === 'won') tally.won++;
        if (s.stars === 3) tally.threeStars++;
      }
      return tally;
    };
    const m = count('moon');
    const r = count('mars');
    console.log(
      `Balance: Moon ${m.won}/64 plans win (${m.threeStars} with 3 stars). ` +
        `Mars ${r.won}/64 win (${r.threeStars} with 3 stars).`
    );
    expect(r.threeStars).toBeGreaterThan(0);
  });
});
