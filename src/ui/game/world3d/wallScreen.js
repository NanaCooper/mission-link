// The moving pictures on the control room's big wall screen and on the crew monitor (3D only).
// Plain drawing code with no three.js and no canvas: everything is drawn through a painter
// ({ rect, disk, sprite }), so the tests can check what is drawn. scene.js gives it a canvas.
//
// The pictures follow the 2D SpaceScene: the Sun on the left, the Moon or Mars on the right,
// Earth and the message line between them. Only Mission Control ever sees them.
import { PALETTE, PIECES, ICONS } from '../../components/pixel/sprites.js';

// A storm picture is drawn in these units, then scaled into its panel
export const STORM_W = 48;
export const STORM_H = 24;

const SUN_CORE = '#ffe9a8';
const HAZE = ['#e8b07a', '#ffcd75'];
const MARS_SHADE = '#b0553a';

/**
 * A painter that draws in picture units into a box of the canvas.
 *   out(x, y, w, h, colour)  fills canvas pixels (a canvas fillRect, or a test recorder)
 *   box                      { x, y, w, h } canvas pixels to draw into; nothing goes outside it.
 *                            null: no box, no offset.
 *   k                        canvas pixels per picture unit
 */
export function painter(out, box = null, k = 1) {
  const ox = box ? box.x : 0;
  const oy = box ? box.y : 0;
  const fill = (x0, y0, x1, y1, color) => {
    if (box) {
      x0 = Math.max(x0, box.x);
      y0 = Math.max(y0, box.y);
      x1 = Math.min(x1, box.x + box.w);
      y1 = Math.min(y1, box.y + box.h);
    }
    if (x1 > x0 && y1 > y0) out(x0, y0, x1 - x0, y1 - y0, color);
  };
  const p = {
    rect(x, y, w, h, color) {
      const x0 = ox + Math.round(x * k);
      const y0 = oy + Math.round(y * k);
      fill(x0, y0, Math.max(x0 + 1, ox + Math.round((x + w) * k)), Math.max(y0 + 1, oy + Math.round((y + h) * k)), color);
    },
    // A round disk, drawn as rows of pixels (like diskRects in the 2D pictures)
    disk(cx, cy, r, color) {
      const radius = r * k;
      const x = ox + Math.round(cx * k);
      const y = oy + Math.round(cy * k);
      const reach = radius * radius + radius * 0.8;
      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy += 1) {
        const left = reach - dy * dy;
        if (left < 0) continue;
        const half = Math.floor(Math.sqrt(left));
        fill(x - half, y + dy, x + half + 1, y + dy + 1, color);
      }
    },
    sprite(rows, x, y, palette = PALETTE) {
      rows.forEach((row, r) => {
        [...row].forEach((letter, c) => {
          if (letter !== '.' && palette[letter]) p.rect(x + c, y + r, 1, 1, palette[letter]);
        });
      });
    }
  };
  return p;
}

// ---------- Tiny letters, just for NOW and NEXT ----------
const GLYPHS = {
  N: ['X..X', 'XX.X', 'X.XX', 'X..X', 'X..X'],
  O: ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'],
  W: ['X...X', 'X...X', 'X.X.X', 'X.X.X', '.X.X.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.']
};

/** Width of a word in pixels (letters 5 high, 1 pixel apart) */
export function wordWidth(word) {
  return [...word].reduce((sum, letter, i) => sum + (GLYPHS[letter]?.[0].length ?? 3) + (i > 0 ? 1 : 0), 0);
}

export function paintWord(p, word, x, y, color) {
  let at = x;
  for (const letter of word) {
    const glyph = GLYPHS[letter];
    if (glyph) {
      glyph.forEach((row, r) => [...row].forEach((cell, c) => cell === 'X' && p.rect(at + c, y + r, 1, 1, color)));
      at += glyph[0].length + 1;
    } else {
      at += 4;
    }
  }
}

// ---------- The storm pictures ----------
const STARS = [[15, 3, 'W'], [21, 21, 'G'], [27, 5, 'W'], [33, 2, 'G'], [30, 15, 'G'], [37, 4, 'W'], [18, 11, 'G']];
const PLANET = { moon: { fill: PALETTE.G, shade: PALETTE.g }, mars: { fill: PALETTE.O, shade: MARS_SHADE } };

const step = (t, perSecond) => Math.floor(t * perSecond);

function paintBlackout(p, t) {
  // The Sun sits between Earth and Mars, so the message cannot get through
  p.disk(6, 12, 4, PALETTE.b);
  p.rect(5, 10, 2, 2, PALETTE.N);
  p.rect(7, 13, 2, 1, PALETTE.N);
  p.disk(24, 12, 7, PALETTE.O);
  p.disk(24, 12, 5, PALETTE.Y);
  p.disk(23, 12, 3, SUN_CORE);
  p.disk(42, 12, 5, PALETTE.O);
  p.rect(40, 10, 2, 1, MARS_SHADE);
  p.rect(43, 14, 2, 1, MARS_SHADE);
  for (let x = 4; x <= 44; x += 2) p.rect(x, 21, 1, 1, PALETTE.R);
  // The signal, crossed out (it blinks bright and dark)
  const cross = step(t, 2) % 2 === 0 ? PALETTE.r : PALETTE.R;
  for (let i = -2; i <= 2; i += 1) {
    p.rect(24 + i, 21 + i, 1, 1, cross);
    p.rect(24 + i, 21 - i, 1, 1, cross);
  }
}

function paintParticles(p, t, count, speed, colors) {
  for (let i = 0; i < count; i += 1) {
    const y = 3 + ((i * 7) % 18);
    const pace = speed + ((i * 5) % 7) * 2;
    const x = 12 + ((t * pace + i * 9) % 27);
    p.rect(x, y, 2, 1, colors[i % colors.length]);
  }
}

/**
 * One storm picture: what the storm is doing, as a moving picture.
 *   now     { look, world, dust, blackout, delayTurns } (roomScreen.js). The NEXT panel passes
 *           { look, world } only.
 *   t       seconds, for the movement (0 = a still picture)
 *   small   true for the small NEXT picture: fewer details
 */
export function paintStorm(p, now, t = 0, { small = false } = {}) {
  p.rect(0, 0, STORM_W, STORM_H, PALETTE.K);
  if (!small) {
    STARS.forEach(([x, y, letter], i) => {
      if (i !== step(t, 2) % STARS.length) p.rect(x, y, 1, 1, PALETTE[letter]);
    });
  }
  if (now.blackout) {
    paintBlackout(p, t);
    return;
  }

  // The Sun, and the Moon or Mars with the tiny base on its edge
  p.disk(-2, 12, 13, PALETTE.O);
  p.disk(-2, 12, 11, PALETTE.Y);
  p.disk(-3, 12, 7, SUN_CORE);
  const planet = PLANET[now.world] ?? PLANET.moon;
  p.disk(50, 12, 9, planet.fill);
  p.rect(44, 7, 2, 1, planet.shade);
  p.rect(45, 15, 2, 2, planet.shade);
  if (!small) {
    p.sprite(PIECES.tinyBase, 38, 10);
    // Earth, and the message line from Earth to the base. A message takes longer to reach Mars.
    p.disk(22, 20, 2, PALETTE.b);
    p.rect(21, 19, 1, 1, PALETTE.N);
    for (let x = 26; x <= 36; x += 2) p.rect(x, 20, 1, 1, PALETTE.g);
    const period = now.delayTurns > 0 ? 3.2 : 0.9;
    p.rect(26 + ((t % period) / period) * 10, 20, 2, 1, PALETTE.C);
  }

  const look = now.look;
  if (look === 'flare') {
    // A flare: a flash that bursts on the Sun's edge, bigger and smaller
    const size = step(t, 4) % 4;
    if (size >= 2) p.sprite(PIECES.flare, 7, 4);
    else {
      p.rect(10, 7, 3, 3, PALETTE.W);
      for (let d = 2; d <= size + 3; d += 1) {
        p.rect(11 + d, 8, 1, 1, PALETTE.Y);
        p.rect(11, 8 - d, 1, 1, PALETTE.Y);
        p.rect(11, 8 + d, 1, 1, PALETTE.Y);
        p.rect(11 + d, 8 - d, 1, 1, PALETTE.W);
        p.rect(11 + d, 8 + d, 1, 1, PALETTE.W);
      }
    }
  } else if (look === 'cloud') {
    // A cloud of hot gas on its way to the Moon or Mars
    p.sprite(PIECES.gasCloud, 12 + ((t * 5) % 16), 8);
  } else if (look === 'peak') {
    // The particles arrive: they stream in and hit the Moon or Mars
    p.sprite(PIECES.gasCloud, 25 + (step(t, 2) % 2), 8);
    paintParticles(p, t, small ? 6 : 12, 22, [PALETTE.W, PALETTE.Y, PALETTE.C]);
    const flash = step(t, 4) % 2;
    [[40, 5], [41, 17], [39, 13], [42, 9]].forEach(([x, y], i) => {
      p.rect(x, y, 1, 1, (i + flash) % 2 ? PALETTE.r : PALETTE.Y);
    });
  } else if (look === 'fading') {
    // The storm fades: only a few slow particles are left
    paintParticles(p, t, small ? 2 : 4, 9, [PALETTE.G, PALETTE.g]);
  }
  // 'quiet' and 'clear': a calm Sun, nothing else

  if (now.dust) {
    // Mars dust: a haze drifting over Mars
    const drift = Math.round(Math.sin(t * 1.5) * 2);
    [[4, 10], [8, 8], [12, 11], [16, 9], [20, 10]].forEach(([y, w], i) => {
      p.rect(STORM_W - w + drift - (i % 2), y, w, 1, HAZE[i % 2]);
    });
  }
}

// ---------- The crew monitor ----------
export const MONITOR_W = 40;
export const MONITOR_H = 24;
export const HEALTH_BAR = { x: 24, y: 16, w: 13, h: 4 };

export function healthColor(health) {
  if (health >= 60) return PALETTE.L;
  if (health >= 30) return PALETTE.Y;
  return PALETTE.r;
}

/**
 * The crew monitor: Nova's last move as a big icon, and crew health as a bar.
 *   out   out(x, y, w, h, colour) fills canvas pixels
 *   crew  { icon, health } (roomScreen.js)
 */
export function paintMonitor(out, crew) {
  const p = painter(out);
  p.rect(0, 0, MONITOR_W, MONITOR_H, PALETTE.K);
  p.rect(0, 0, MONITOR_W, 1, PALETTE.D);
  p.rect(0, MONITOR_H - 1, MONITOR_W, 1, PALETTE.D);
  const icon = crew.icon ? ICONS[crew.icon] : null;
  if (icon) painter(out, null, 2).sprite(icon, 1, 1);
  else [6, 11, 16].forEach((x) => p.rect(x, 11, 2, 2, PALETTE.g)); // no move yet: "..."

  p.sprite(ICONS.health, 26, 3);
  const { x, y, w, h } = HEALTH_BAR;
  p.rect(x - 1, y - 1, w + 2, h + 2, PALETTE.g);
  p.rect(x, y, w, h, PALETTE.k);
  const filled = Math.round((w * Math.max(0, Math.min(100, crew.health))) / 100);
  if (filled > 0) p.rect(x, y, filled, h, healthColor(crew.health));
}
