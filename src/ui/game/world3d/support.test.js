import { describe, it, expect } from 'vitest';
import { canUse3D } from './support.js';

describe('canUse3D', () => {
  it('says no where there is no browser (tests, server rendering): the 2D map shows', () => {
    expect(canUse3D()).toBe(false);
  });
});
