import { describe, it, expect } from 'vitest';
import {
  createGame,
  sendWarning,
  applyMove,
  getAstronautView,
  getMissionControlView,
  getStorm
} from './index.js';
import { RADIATION_LIMIT, LEVELS } from './balance.js';
import { MOVES, initialState } from '../shared/contract.js';

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

// Jump to a given stage with full meters, to test a single move there.
const atStage = (state, stage) => ({ ...state, turn: stage, stormStage: stage });

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
    expect(q.meters.crewHealth).toBe(90);
    expect(q.meters.radiationDose).toBe(0);

    const p = applyMove(atStage(moon(), PEAK), 'shelter');
    expect(p.meters.radiationDose).toBe(4);
    expect(p.meters.crewHealth).toBe(89); // -10 cramped, -1 radiation
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

describe('views', () => {
  it('after a move, both views carry lastFact from the stage just played', () => {
    const s = applyMove(moon(), 'doScience');
    const fact = getStorm(s.stormId).stages[0].fact;
    expect(getAstronautView(s).lastFact).toEqual(fact);
    expect(getMissionControlView(s).lastFact).toEqual(fact);
  });

  it('astronaut view has radiationLimit from balance.js and no storm data', () => {
    const v = getAstronautView(moon());
    expect(v.radiationLimit).toBe(RADIATION_LIMIT);
    expect(Object.keys(v).sort()).toEqual(
      ['status', 'turn', 'maxTurns', 'world', 'meters', 'radiationLimit', 'science', 'inbox',
        'log', 'lastMove', 'lastFact', 'lostReason', 'stars'].sort()
    );
  });

  it('mission control view shows the stage and forecast but no other meters', () => {
    const v = getMissionControlView(moon());
    expect(v.stage.label).toBe(getStorm(moon().stormId).stages[0].label);
    expect(v.forecast).toBe(getStorm(moon().stormId).stages[1].label);
    expect(v.delayTurns).toBe(0);
    expect(v).not.toHaveProperty('meters');
    expect(v.crewHealth).toBe(100);
  });

  it('forecast is null on the last turn', () => {
    expect(getMissionControlView(atStage(moon(), 5)).forecast).toBeNull();
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
    const last = atStage(moon(), 5);
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
  for (let i = 0; i < 6; i++) {
    const next = [];
    for (const p of plans) for (const m of MOVES) next.push([...p, m]);
    plans.splice(0, plans.length, ...next);
  }
  return plans;
}

describe('balance: full Moon games', () => {
  it('doScience every turn loses by radiation', () => {
    expect(play(moon(), Array(6).fill('doScience')).lostReason).toBe('radiation');
  });

  it('raiseShield every turn loses by radiation', () => {
    expect(play(moon(), Array(6).fill('raiseShield')).lostReason).toBe('radiation');
  });

  it('shelter every turn earns no more than 1 star', () => {
    expect(play(moon(), Array(6).fill('shelter')).stars).toBeLessThanOrEqual(1);
  });

  it('a smart plan wins with 3 stars', () => {
    const s = play(moon(), ['doScience', 'savePower', 'raiseShield', 'shelter', 'raiseShield', 'doScience']);
    expect(s.status).toBe('won');
    expect(s.stars).toBe(3);
  });
});

describe('balance: full Mars games (0 Moon stars)', () => {
  it('doScience every turn loses', () => {
    expect(play(mars(), Array(6).fill('doScience')).status).toBe('lost');
  });

  it('shelter every turn earns no more than 1 star', () => {
    expect(play(mars(), Array(6).fill('shelter')).stars).toBeLessThanOrEqual(1);
  });

  it('at least one of the 4096 plans wins with 3 stars', () => {
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
      `Balance: Moon ${m.won}/4096 plans win (${m.threeStars} with 3 stars). ` +
        `Mars ${r.won}/4096 win (${r.threeStars} with 3 stars).`
    );
    expect(r.threeStars).toBeGreaterThan(0);
  });
});
