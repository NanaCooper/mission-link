import { describe, it, expect } from 'vitest';
import * as engine from './engineAdapter.js';
import { nextLevel, splitReducer } from './session.js';

// Play alone (solo): one device, Commander Sola sends the warnings. It must survive restarts.
describe('Play alone through restarts', () => {
  const reduce = splitReducer(engine);
  const solo = () => engine.createGame({ mode: 'split', world: 'moon', solo: true });

  it('nextLevel keeps solo for Play again and Fly to Mars, and adds nothing when it is off', () => {
    expect(nextLevel({ world: 'moon', solo: true }, {}).solo).toBe(true);
    expect(nextLevel({ world: 'moon', solo: true }, { world: 'mars', moonStars: 2 })).toMatchObject({ world: 'mars', moonStars: 2, solo: true });
    expect('solo' in nextLevel({ world: 'moon' }, {})).toBe(false);
  });

  it('a saved storm stays through Fly to Mars, and restart({ stormId }) changes it', () => {
    const may2025 = engine.createGame({ mode: 'split', world: 'moon', stormId: 'storm-2025-05-31' });
    expect(reduce(may2025, { type: 'restart', options: { world: 'mars', moonStars: 1 } }).stormId).toBe('storm-2025-05-31');
    expect(reduce(may2025, { type: 'restart', options: { stormId: 'storm-2024-05-11' } }).stormId).toBe('storm-2024-05-11');
    expect(nextLevel({ world: 'moon', stormId: 'a' }, { stormId: 'b' }).stormId).toBe('b');
  });

  it('restart() and restart({ world: "mars" }) keep Commander Sola sending the warnings', () => {
    const again = reduce(solo(), { type: 'restart' });
    expect(again.solo).toBe(true);
    expect(again.inbox).toHaveLength(1);
    const mars = reduce(solo(), { type: 'restart', options: { world: 'mars', moonStars: 3 } });
    expect(mars).toMatchObject({ world: 'mars', solo: true });
    expect(mars.outbox).toHaveLength(1); // on Mars her first warning is on its way
  });

});
