import { describe, it, expect } from 'vitest';
import { canReadAloud } from './useReadAloud.js';

describe('canReadAloud', () => {
  it('is false with no browser or no speechSynthesis', () => {
    expect(canReadAloud(undefined)).toBe(false);
    expect(canReadAloud({})).toBe(false);
    expect(canReadAloud({ speechSynthesis: {} })).toBe(false);
  });

  it('is true when the browser can speak', () => {
    expect(canReadAloud({ speechSynthesis: {}, SpeechSynthesisUtterance: function Utterance() {} })).toBe(true);
  });
});
