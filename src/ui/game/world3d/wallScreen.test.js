import { describe, it, expect } from 'vitest';
import { painter, paintStorm, paintWord, wordWidth, paintMonitor, healthColor, STORM_W, STORM_H, HEALTH_BAR } from './wallScreen.js';
import { PALETTE } from '../../components/pixel/sprites.js';

const LOOKS = ['quiet', 'flare', 'cloud', 'peak', 'fading', 'clear'];

// Records every filled rectangle: [x, y, w, h, colour]
function recorder() {
  const rects = [];
  return { rects, out: (x, y, w, h, color) => rects.push([x, y, w, h, color]) };
}

function draw(now, { box = { x: 10, y: 5, w: STORM_W, h: STORM_H }, k = 1, t = 0.6, small = false } = {}) {
  const { rects, out } = recorder();
  paintStorm(painter(out, box, k), now, t, { small });
  return rects;
}

const inside = (rects, box) =>
  rects.every(([x, y, w, h]) => x >= box.x && y >= box.y && x + w <= box.x + box.w && y + h <= box.y + box.h && w > 0 && h > 0);

describe('the storm pictures on the wall screen', () => {
  it('every picture stays inside its panel, big (NOW) and small (NEXT)', () => {
    const big = { x: 10, y: 5, w: STORM_W, h: STORM_H };
    const small = { x: 70, y: 9, w: 21, h: 11 };
    for (const look of LOOKS) {
      for (const world of ['moon', 'mars']) {
        for (const t of [0, 0.3, 1.7, 9.9]) {
          expect(inside(draw({ look, world, dust: world === 'mars', delayTurns: 1 }, { box: big, t }), big), look).toBe(true);
          expect(inside(draw({ look, world }, { box: small, k: small.w / STORM_W, t, small: true }), small), look).toBe(true);
        }
      }
    }
    expect(inside(draw({ look: 'fading', world: 'mars', blackout: true }, { box: big }), big)).toBe(true);
  });

  it('each look draws a different picture', () => {
    const pictures = LOOKS.filter((look) => look !== 'clear').map((look) => JSON.stringify(draw({ look, world: 'moon' })));
    expect(new Set(pictures).size).toBe(pictures.length);
  });

  it('moves: the same look at another time is another picture', () => {
    for (const look of ['flare', 'cloud', 'peak']) {
      expect(JSON.stringify(draw({ look, world: 'moon' }, { t: 0.1 }))).not.toBe(JSON.stringify(draw({ look, world: 'moon' }, { t: 0.9 })));
    }
  });

  it('the peak shows many more particles than the storm fading', () => {
    const particles = (look) => draw({ look, world: 'moon' }).filter(([, , w, h]) => w === 2 && h === 1).length;
    expect(particles('peak')).toBeGreaterThan(particles('fading') + 4);
  });

  it('Mars dust adds a haze, and only when dust is on', () => {
    // (the haze's other colour is the Sun's yellow, so only count this one)
    const haze = (rects) => rects.filter(([, , , , color]) => color === '#e8b07a').length;
    expect(haze(draw({ look: 'flare', world: 'mars', dust: true }))).toBeGreaterThan(0);
    expect(haze(draw({ look: 'flare', world: 'mars', dust: false }))).toBe(0);
  });

  it('the blackout puts the Sun between Earth and Mars and crosses out the signal', () => {
    const rects = draw({ look: 'fading', world: 'mars', blackout: true }, { t: 0 });
    expect(rects.some(([, , , , color]) => color === PALETTE.b)).toBe(true); // Earth
    expect(rects.filter(([, , , , color]) => color === PALETTE.r).length).toBeGreaterThanOrEqual(9); // the cross
  });
});

describe('the words NOW and NEXT', () => {
  it('knows how wide they are and draws every letter', () => {
    expect(wordWidth('NOW')).toBe(15);
    expect(wordWidth('NEXT')).toBe(16);
    const { rects, out } = recorder();
    paintWord(painter(out), 'NEXT', 0, 0, PALETTE.C);
    expect(Math.max(...rects.map(([x]) => x))).toBe(15);
  });
});

describe('the crew monitor', () => {
  const barFill = (health, icon = 'shield') => {
    const { rects, out } = recorder();
    paintMonitor(out, { icon, health });
    const bar = rects.find(([x, y, , h, color]) => x === HEALTH_BAR.x && y === HEALTH_BAR.y && h === HEALTH_BAR.h && color === healthColor(health));
    return { width: bar ? bar[2] : 0, rects };
  };

  it('the health bar gets shorter as health goes down, and changes colour', () => {
    expect(barFill(100).width).toBe(HEALTH_BAR.w);
    expect(barFill(50).width).toBeLessThan(HEALTH_BAR.w);
    expect(barFill(0).width).toBe(0);
    expect([healthColor(90), healthColor(45), healthColor(10)]).toEqual([PALETTE.L, PALETTE.Y, PALETTE.r]);
  });

  it("draws Nova's last move as a big icon, and dots before the first move", () => {
    const shield = barFill(80, 'shield').rects;
    expect(shield.some(([, , w, h, color]) => w === 2 && h === 2 && color === PALETTE.b)).toBe(true);
    const none = barFill(80, null).rects;
    expect(none.filter(([, y, w, h, color]) => y === 11 && w === 2 && h === 2 && color === PALETTE.g)).toHaveLength(3);
  });
});
