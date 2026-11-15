import { describe, it, expect } from 'vitest';
import { moveReactionText, warningCoachText } from './labels.js';

const result = (extra) => ({ turn: 1, move: 'raiseShield', radiation: 0, shieldFailed: false, dust: false, powerOut: false, ...extra });
const words = (text) => text.split(/\s+/).length;

describe("BLIP's reaction to the Astronaut's move", () => {
  it('says what each move cost and what got through', () => {
    expect(moveReactionText(result({ radiation: 12 }))).toBe('Shield up! Only 12 radiation got through, but it cost 20 power. Safety costs energy.');
    expect(moveReactionText(result({ shieldFailed: true, radiation: 40 }))).toMatch(/^No power, no shield! All 40 radiation/);
    expect(moveReactionText(result({ move: 'shelter', radiation: 4 }))).toMatch(/lost 15 health/);
    expect(moveReactionText(result({ move: 'savePower', radiation: 20 }))).toMatch(/nothing blocked the storm: 20 radiation/);
    expect(moveReactionText(result({ move: 'savePower', radiation: 5, dust: true }))).toMatch(/^Dust on the panels/);
    expect(moveReactionText(result({ move: 'doScience', radiation: 40 }))).toMatch(/nobody was protected: 40 radiation/);
    expect(moveReactionText(result({ move: 'doScience', radiation: 0 }))).toMatch(/quiet Sun/);
  });

  it('adds the oxygen warning when the power ran out', () => {
    expect(moveReactionText(result({ powerOut: true }))).toMatch(/oxygen dropped!$/);
  });

  it('is nothing before the first move, and every line stays short', () => {
    expect(moveReactionText(null)).toBeNull();
    for (const move of ['raiseShield', 'shelter', 'savePower', 'doScience']) {
      for (const radiation of [0, 40]) {
        const line = moveReactionText(result({ move, radiation, powerOut: true }));
        expect(words(line)).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe("BLIP's coaching for Mission Control", () => {
  const check = (sent, best, delayTurns = 0) => ({ turn: 1, sent, best, delayTurns });

  it('praises the best warning, on Mars too', () => {
    expect(warningCoachText(check('shelterNow', 'shelterNow'))).toBe('Great call! "Shelter now" was just right.');
    expect(warningCoachText(check('stormComing', 'stormComing', 1))).toMatch(/next wave. You planned ahead!/);
  });

  it('says "close" when both warned of danger but not how strong', () => {
    expect(warningCoachText(check('stormComing', 'shelterNow'))).toMatch(/^Close! "Storm coming" helps/);
    expect(warningCoachText(check('shelterNow', 'stormComing'))).toMatch(/^Close! A smaller storm/);
  });

  it('kindly names the best warning when it was not quite right, with the Mars tip', () => {
    expect(warningCoachText(check('allClear', 'shelterNow'))).toBe(
      'Not quite. You sent "All clear", but radiation was on its way. The best warning was "Shelter now".'
    );
    expect(warningCoachText(check('savePower', 'stormComing', 1))).toMatch(/On Mars, warn about what comes next\.$/);
  });

  it('notices when no warning was sent, and says nothing without a check', () => {
    expect(warningCoachText(check(null, 'stormComing'))).toMatch(/^No warning this time, so Nova had to guess/);
    expect(warningCoachText(null)).toBeNull();
  });

  it('never scolds', () => {
    for (const sent of [null, 'stormComing', 'shelterNow', 'savePower', 'allClear']) {
      for (const best of ['stormComing', 'shelterNow']) {
        expect(warningCoachText(check(sent, best))).not.toMatch(/wrong|bad|fail/i);
      }
    }
  });
});
