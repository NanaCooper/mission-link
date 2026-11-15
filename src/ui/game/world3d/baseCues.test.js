import { describe, it, expect } from 'vitest';
import { baseCues } from './baseCues.js';
import { createGame, sendWarning, applyMove, getAstronautView, getMissionControlView } from '../../../realtime/engineAdapter.js';
import { WARNINGS } from '../../../shared/contract.js';

const game = (world) => createGame({ mode: 'split', world, moonStars: 3 });
const cues = (state) => baseCues(getAstronautView(state));

describe('baseCues: what Commander Sola said', () => {
  it('on the Moon, shows each warning as soon as it is sent', () => {
    for (const warning of WARNINGS) {
      const state = sendWarning(game('moon'), warning);
      expect(cues(state)).toMatchObject({ warning, warningKey: `0:${warning}` });
    }
  });

  it('shows nothing before Sola has said anything', () => {
    expect(cues(game('moon'))).toMatchObject({ warning: null, warningKey: null });
  });

  it("does not show last wave's message again on the next wave", () => {
    const after = applyMove(sendWarning(game('moon'), 'shelterNow'), 'shelter');
    expect(after.inbox.at(-1).warning).toBe('shelterNow');
    expect(cues(after).warning).toBeNull();
  });

  it('on Mars, shows the warning only when it arrives, one wave late', () => {
    const sent = sendWarning(game('mars'), 'stormComing');
    expect(cues(sent).warning).toBeNull(); // still on its way
    const arrived = applyMove(sent, 'raiseShield');
    expect(cues(arrived)).toMatchObject({ warning: 'stormComing', warningKey: '1:stormComing' });
  });

  it('shows what Sola said, even when it is the wrong warning', () => {
    // Wave 2 on the Moon is the peak of the storm, but Sola says "All clear"
    const peak = applyMove(sendWarning(game('moon'), 'stormComing'), 'raiseShield');
    expect(cues(sendWarning(peak, 'allClear')).warning).toBe('allClear');
  });
});

describe('baseCues: what really happened after the move', () => {
  it('the shield is up after Raise shield', () => {
    const state = applyMove(sendWarning(game('moon'), 'stormComing'), 'raiseShield');
    expect(cues(state)).toMatchObject({ shield: 'up', dust: false, powerOut: false });
  });

  it('the shield fails, and the power runs out, when there is no power', () => {
    const low = sendWarning({ ...game('moon'), meters: { power: 5, oxygen: 100, radiationDose: 0, crewHealth: 100 } }, 'stormComing');
    const state = applyMove(low, 'raiseShield');
    expect(state.lastResult.shieldFailed).toBe(true);
    expect(cues(state)).toMatchObject({ shield: 'failed', powerOut: true, lowPower: true });
  });

  it('dust covers the solar panel on the Mars dust wave', () => {
    const state = applyMove(sendWarning(game('mars'), 'savePower'), 'savePower');
    expect(cues(state)).toMatchObject({ dust: true, saving: true });
    const moon = applyMove(sendWarning(game('moon'), 'savePower'), 'savePower');
    expect(cues(moon).dust).toBe(false);
  });

  it('only counts the result until the next move', () => {
    const state = applyMove(sendWarning(game('mars'), 'savePower'), 'savePower');
    const stale = { ...getAstronautView(state), turn: state.turn + 1 };
    expect(baseCues(stale).dust).toBe(false);
  });

  it('keeps the last move for the pictures the 2D map also shows', () => {
    const state = applyMove(sendWarning(game('moon'), 'stormComing'), 'doScience');
    expect(cues(state)).toMatchObject({ science: true, saving: false, sheltering: false, shield: null });
  });
});

describe('baseCues uses only the Astronaut view', () => {
  // Every field the Astronaut view has, from the real engine
  const astronautKeys = new Set(Object.keys(getAstronautView(game('mars'))));

  // Records every field baseCues reads
  function spy(view) {
    const read = new Set();
    const proxy = new Proxy(view, {
      get(target, key) {
        if (typeof key === 'string') read.add(key);
        return target[key];
      },
      has(target, key) {
        if (typeof key === 'string') read.add(key);
        return key in target;
      }
    });
    return { proxy, read };
  }

  it('reads no field outside the Astronaut view', () => {
    let state = sendWarning(game('mars'), 'shelterNow');
    for (const move of ['savePower', 'raiseShield', 'shelter']) {
      const { proxy, read } = spy(getAstronautView(state));
      baseCues(proxy);
      for (const key of read) expect(astronautKeys.has(key), `baseCues read "${key}"`).toBe(true);
      state = applyMove(sendWarning(state, 'allClear'), move);
    }
  });

  it('gives the same cues when storm data is mixed in: it never looks at it', () => {
    let state = game('mars');
    for (const move of ['savePower', 'raiseShield', 'shelter']) {
      state = sendWarning(state, 'stormComing');
      const plain = getAstronautView(state);
      const mc = getMissionControlView(state);
      const mixed = { ...plain, stage: mc.stage, forecast: mc.forecast, dust: true, blackout: true, delayTurns: 1 };
      expect(baseCues(mixed)).toEqual(baseCues(plain));
      state = applyMove(state, move);
    }
  });

  it('returns nothing about the storm itself', () => {
    const out = cues(applyMove(sendWarning(game('mars'), 'savePower'), 'savePower'));
    for (const key of ['stage', 'forecast', 'blackout', 'look', 'incoming', 'stormStage']) expect(out).not.toHaveProperty(key);
  });
});
