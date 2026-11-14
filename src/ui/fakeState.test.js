import { describe, it, expect } from 'vitest';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsAstronautView,
  fakeMarsMissionControlView,
  fakeWonAstronautView,
  fakeLostAstronautView
} from './fakeState.js';

// The agreed view shapes from src/ui/DEV3_PLAN.md
const ASTRONAUT_KEYS = [
  'status', 'turn', 'maxTurns', 'world', 'meters', 'radiationLimit', 'science',
  'inbox', 'log', 'lastMove', 'lastFact', 'lostReason', 'stars'
];
const MISSION_CONTROL_KEYS = [
  'status', 'turn', 'maxTurns', 'world', 'delayTurns', 'stage', 'forecast',
  'lastMove', 'lastFact', 'crewHealth', 'warningThisTurn', 'lostReason', 'stars'
];
const METER_KEYS = ['power', 'oxygen', 'radiationDose', 'crewHealth'];
const STAGE_KEYS = ['label', 'missionControlSees', 'dust'];

const astronautViews = {
  fakeAstronautView,
  fakeMarsAstronautView,
  fakeWonAstronautView,
  fakeLostAstronautView
};
const missionControlViews = { fakeMissionControlView, fakeMarsMissionControlView };

const sorted = (obj) => Object.keys(obj).sort();

// Every key anywhere inside a value (objects and arrays)
function allKeys(value) {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)]);
  }
  return [];
}

describe('fake Astronaut views', () => {
  for (const [name, view] of Object.entries(astronautViews)) {
    it(`${name} has exactly the Astronaut view keys`, () => {
      expect(sorted(view)).toEqual([...ASTRONAUT_KEYS].sort());
      expect(sorted(view.meters)).toEqual([...METER_KEYS].sort());
    });

    it(`${name} never shows storm data (no stage or dust)`, () => {
      const keys = allKeys(view);
      expect(keys).not.toContain('stage');
      expect(keys).not.toContain('dust');
    });
  }

  it('the base view has the agreed numbers', () => {
    expect(fakeAstronautView).toMatchObject({
      status: 'playing', turn: 3, maxTurns: 6, world: 'moon', radiationLimit: 40, science: 2,
      lastMove: 'raiseShield', lostReason: null, stars: 0
    });
    expect(fakeAstronautView.meters).toEqual({ power: 45, oxygen: 90, radiationDose: 22, crewHealth: 81 });
    expect(fakeAstronautView.inbox).toEqual([{ turn: 3, warning: 'shelterNow' }]);
    expect(fakeAstronautView.log).toHaveLength(3);
  });

  it('the Mars inbox item says when it was sent', () => {
    expect(fakeMarsAstronautView.world).toBe('mars');
    expect(fakeMarsAstronautView.inbox).toEqual([{ turn: 3, turnSent: 2, warning: 'shelterNow' }]);
  });

  it('the won and lost views have their end states', () => {
    expect(fakeWonAstronautView).toMatchObject({ status: 'won', turn: 6, stars: 2 });
    expect(fakeLostAstronautView).toMatchObject({ status: 'lost', lostReason: 'radiation', stars: 0 });
    expect(fakeLostAstronautView.meters.radiationDose).toBe(40);
  });
});

describe('fake Mission Control views', () => {
  for (const [name, view] of Object.entries(missionControlViews)) {
    it(`${name} has exactly the Mission Control view keys`, () => {
      expect(sorted(view)).toEqual([...MISSION_CONTROL_KEYS].sort());
      expect(sorted(view.stage)).toEqual([...STAGE_KEYS].sort());
    });
  }

  it('the Moon view has no delay and no dust', () => {
    expect(fakeMissionControlView).toMatchObject({ world: 'moon', delayTurns: 0, warningThisTurn: 'shelterNow' });
    expect(fakeMissionControlView.stage.dust).toBe(false);
  });

  it('the Mars view has a one-turn delay and dust', () => {
    expect(fakeMarsMissionControlView).toMatchObject({ world: 'mars', delayTurns: 1 });
    expect(fakeMarsMissionControlView.stage).toEqual({
      label: 'Particles arrive',
      missionControlSees: 'Dust is covering the solar panels. Saving power gives less today.',
      dust: true
    });
  });
});

describe('variants do not change the base views', () => {
  it('base views keep their Moon values', () => {
    expect(fakeAstronautView.world).toBe('moon');
    expect(fakeAstronautView.status).toBe('playing');
    expect(fakeAstronautView.meters.radiationDose).toBe(22);
    expect(fakeMissionControlView.world).toBe('moon');
    expect(fakeMissionControlView.stage.dust).toBe(false);
  });

  it('variants have their own meters and stage objects', () => {
    expect(fakeLostAstronautView.meters).not.toBe(fakeAstronautView.meters);
    expect(fakeMarsMissionControlView.stage).not.toBe(fakeMissionControlView.stage);
  });
});
