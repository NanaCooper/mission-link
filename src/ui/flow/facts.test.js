import { describe, it, expect } from 'vitest';
import { MARS_FACT } from './facts.js';

describe('flow facts', () => {
  it('the Mars fact has text and a NASA source link', () => {
    expect(MARS_FACT.text.length).toBeGreaterThan(0);
    expect(MARS_FACT.source.name).toBeTruthy();
    expect(MARS_FACT.source.url).toMatch(/^https:\/\/([a-z]+\.)*nasa\.gov\//);
  });

  it('the Mars fact is short enough for a 9-year-old to read', () => {
    const words = MARS_FACT.text.split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(40);
  });
});
