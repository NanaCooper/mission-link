import { describe, it, expect } from 'vitest';
import { MOVES, WARNINGS, ROLES } from '../../shared/contract.js';
import { ICONS, PORTRAITS } from '../components/pixel/sprites.js';
import {
  CHARACTERS,
  MOVE_INFO,
  MOVE_SCENE_TAG,
  WARNING_INFO,
  WORLD_NAMES,
  RADIATION_EXPLAINER,
  MARS_DELAY_NOTE,
  novaMood,
  astronautReadText,
  missionControlReadText,
  PREDICTION,
  predictionResultText,
  solaMoodForWarning,
  turnText,
  ASTRONAUT_TABS,
  MISSION_CONTROL_TABS,
  ROLE_NAMES,
  passCardText,
  sentText,
  radiationHitText,
  newStageText,
  LEVEL_END_TEXT
} from './labels.js';
import { fakeAstronautView, fakeMissionControlView } from '../fakeState.js';

describe('characters and pixel icons', () => {
  it('has three characters, each with a name and a face that exists', () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual(['astronaut', 'director', 'robot']);
    for (const character of Object.values(CHARACTERS)) {
      expect(character.name).toBeTruthy();
      expect(PORTRAITS).toHaveProperty(character.who);
    }
  });

  it('gives every move and every warning a pixel icon that exists', () => {
    for (const info of [...Object.values(MOVE_INFO), ...Object.values(WARNING_INFO)]) {
      expect(ICONS).toHaveProperty(info.sprite);
    }
  });

  it('has short words for the picture after each move', () => {
    expect(Object.keys(MOVE_SCENE_TAG).sort()).toEqual([...MOVES].sort());
  });
});

describe('faces', () => {
  const healthy = { crewHealth: 100, radiationDose: 0, radiationLimit: 40, power: 100 };

  it('Nova is happy when all is well', () => {
    expect(novaMood(healthy)).toBe('happy');
  });

  it('Nova is worried when health, radiation or power is getting bad', () => {
    expect(novaMood({ ...healthy, crewHealth: 60 })).toBe('worried');
    expect(novaMood({ ...healthy, radiationDose: 25 })).toBe('worried');
    expect(novaMood({ ...healthy, power: 20 })).toBe('worried');
  });

  it('Nova is hurt when health is very low or the radiation budget is nearly used up', () => {
    expect(novaMood({ ...healthy, crewHealth: 30 })).toBe('hurt');
    expect(novaMood({ ...healthy, radiationDose: 36 })).toBe('hurt');
  });

  it('Nova works with crew health alone (all Mission Control can see)', () => {
    expect(novaMood({ crewHealth: 81 })).toBe('happy');
    expect(novaMood({ crewHealth: 50 })).toBe('worried');
    expect(novaMood({ crewHealth: 10 })).toBe('hurt');
  });

  it('every mood has a face to draw', () => {
    for (const mood of ['happy', 'worried', 'hurt']) expect(PORTRAITS.nova.frames).toHaveProperty(mood);
    for (const warning of WARNINGS) expect(PORTRAITS.sola.frames).toHaveProperty(solaMoodForWarning(warning));
  });

  it('Commander Sola smiles for "All clear" and looks alert for a storm warning', () => {
    expect(solaMoodForWarning('allClear')).toBe('happy');
    expect(solaMoodForWarning('shelterNow')).toBe('alert');
    expect(solaMoodForWarning('stormComing')).toBe('alert');
  });
});

describe('screen labels', () => {
  it('MOVE_INFO has exactly one entry per move in the contract', () => {
    expect(Object.keys(MOVE_INFO).sort()).toEqual([...MOVES].sort());
  });

  it('WARNING_INFO has exactly one entry per warning in the contract', () => {
    expect(Object.keys(WARNING_INFO).sort()).toEqual([...WARNINGS].sort());
  });

  it('every move has an icon, a label and a hint', () => {
    for (const info of Object.values(MOVE_INFO)) {
      expect(info.icon).toBeTruthy();
      expect(info.label).toBeTruthy();
      expect(info.hint).toBeTruthy();
    }
  });

  it('every warning has an icon and a label', () => {
    for (const info of Object.values(WARNING_INFO)) {
      expect(info.icon).toBeTruthy();
      expect(info.label).toBeTruthy();
    }
  });

  it('names both worlds and has the explainer texts', () => {
    expect(WORLD_NAMES).toEqual({ moon: 'Moon base', mars: 'Mars base' });
    expect(RADIATION_EXPLAINER).toMatch(/not a real dose/);
    expect(MARS_DELAY_NOTE).toMatch(/next turn/);
  });

  it('turnText says the wave, counts from 1 and never goes past maxTurns', () => {
    expect(turnText({ turn: 0, maxTurns: 3 })).toBe('Wave 1 of 3');
    expect(turnText({ turn: 1, maxTurns: 3 })).toBe('Wave 2 of 3');
    expect(turnText({ turn: 3, maxTurns: 3 })).toBe('Wave 3 of 3');
  });
});

describe('full-screen game words', () => {
  it('every menu tab has a word and a pixel icon that exists', () => {
    for (const tab of [...Object.values(ASTRONAUT_TABS), ...Object.values(MISSION_CONTROL_TABS)]) {
      expect(tab.label).toBeTruthy();
      expect(ICONS).toHaveProperty(tab.sprite);
    }
    // The meters are not a menu tab any more: they stay in the top bar. Options holds the sound.
    expect(Object.keys(ASTRONAUT_TABS)).toEqual(['options', 'messages', 'moves']);
    expect(Object.keys(MISSION_CONTROL_TABS)).toEqual(['options', 'bigScreen', 'crew', 'warnings']);
  });

  it('names both roles, with the same keys as ROLES in the contract', () => {
    expect(Object.keys(ROLE_NAMES).sort()).toEqual(Object.values(ROLES).sort());
  });

  it('the pass card names the next player and says what to do', () => {
    expect(passCardText('astronaut').title).toBe('Pass the device to Nova');
    expect(passCardText('missionControl').title).toBe('Pass the device to Commander Sola');
    expect(passCardText('astronaut').who).toBe('nova');
    expect(passCardText('missionControl').who).toBe('sola');
  });

  it('pop-up words', () => {
    expect(radiationHitText(12)).toBe('Radiation hit the base! +12');
    expect(newStageText('Particles arrive')).toBe('New on the big screen: Particles arrive.');
    expect(sentText('Shelter now', 0)).toBe('Sent: Shelter now! Nova gets it now.');
    expect(sentText('Shelter now', 1)).toBe('Sent: Shelter now! It reaches Nova next turn.');
    expect(Object.keys(LEVEL_END_TEXT).sort()).toEqual(['lost', 'won']);
  });
});

describe('read-aloud text and the prediction prompt', () => {
  it('Astronaut: reads a new message from Commander Sola, then BLIP\'s line', () => {
    const text = astronautReadText(fakeAstronautView); // shelterNow arrived on turn 3
    expect(text).toMatch(/^Commander Sola says: Shelter now!/);
    expect(text).toContain(`BLIP says: ${fakeAstronautView.log.at(-1).text}`);
  });

  it('Astronaut: says when there is no new message, or no message at all', () => {
    expect(astronautReadText({ ...fakeAstronautView, turn: 4 })).toContain('No new message this turn. Last message: Shelter now.');
    const none = astronautReadText({ ...fakeAstronautView, inbox: [], log: [] });
    expect(none).toContain('No message from Mission Control yet.');
    expect(none).not.toContain('BLIP');
  });

  it('Mission Control: reads the briefing, what comes next and BLIP\'s fact', () => {
    const text = missionControlReadText(fakeMissionControlView);
    expect(text).toContain(`Commander Sola says: ${fakeMissionControlView.stage.missionControlSees}`);
    expect(text).toContain(`Coming next: ${fakeMissionControlView.forecast}.`);
    expect(text).toContain(`BLIP says: ${fakeMissionControlView.lastFact.text}`);
  });

  it('Mission Control: mentions the blackout and the last turn', () => {
    const view = { ...fakeMissionControlView, forecast: null, stage: { ...fakeMissionControlView.stage, blackout: true } };
    const text = missionControlReadText(view);
    expect(text).toContain('This is the last turn.');
    expect(text).toContain('blocking the signal');
  });

  it('prediction prompt: asked on wave 2 (the peak, view.turn 1) with three answers', () => {
    expect(PREDICTION.turn).toBe(1);
    expect(PREDICTION.answers).toEqual(['Nothing much', 'The crew takes a lot of radiation', 'Not sure']);
    expect(predictionResultText('Not sure')).toBe('You guessed "Not sure". Here is what happened.');
  });
});
