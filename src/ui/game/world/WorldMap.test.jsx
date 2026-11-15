import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WorldMap from './WorldMap.jsx';
import { buildMap } from './worldMap.js';
import { NOVA } from './heroes.js';

// . floor   # wall   T is a place (a tower)
const MAP = buildMap(['#####', '#T..#', '#...#', '#####'], { blocked: '#', places: { T: 'tower' } });

const render = (props = {}) =>
  renderToStaticMarkup(
    <WorldMap
      map={MAP}
      label="Test map"
      hero={NOVA}
      start={{ x: 3, y: 2, facing: 'down' }}
      resetKey={1}
      placeNames={{ tower: 'Shield tower' }}
      describeUse={() => ({ label: 'Raise shield', hint: 'Blocks most radiation.', icon: null })}
      onUse={() => {}}
      {...props}
    />
  );
const nextToTower = { x: 1, y: 2, facing: 'up' }; // just below the tower, in the left third

describe('WorldMap', () => {
  it('keeps the whole map in view and fills the bars with the ground colour', () => {
    const html = render({ ground: '#566c86' });
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(html).toMatch(/class="world__view[^"]*"[^>]*style="background:#566c86"/);
  });

  it('hides the action button when nothing is near, and says where to walk', () => {
    const html = render();
    expect(html).not.toContain('world__action');
    expect(html).toContain('Walk Nova to a place, then press USE.');
  });

  it('shows the action button next to a place, with what it does, and the bouncing arrow', () => {
    const html = render({ start: nextToTower });
    expect(html).toMatch(/<button type="button" class="world__action">.*Raise shield.*USE/);
    expect(html).toContain('<strong>Shield tower:</strong> Blocks most radiation.');
    expect(html).toContain('px-bob');
  });

  it('hides the action button when the game is over, even next to a place', () => {
    const html = render({ start: nextToTower, canUse: false });
    expect(html).not.toContain('world__action');
    expect(html).toContain('Shield tower: the game is over.');
  });

  it('has a joystick for thumbs and four arrow buttons for keyboards and screen readers', () => {
    const html = render();
    expect(html).toMatch(/class="world__joystick" aria-hidden="true"/);
    for (const name of ['Walk up', 'Walk down', 'Walk left', 'Walk right']) expect(html).toContain(`aria-label="${name}"`);
    expect(html).toContain('Arrow keys to walk, Space to use');
  });

  // Changed on purpose: `dialog` describes the box; WorldMap draws it and keeps the highlight.
  const confirmBox = {
    id: 'tower-1',
    kind: 'confirm',
    title: 'Raise shield?',
    body: <p>Costs 20 power.</p>,
    choices: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' }
    ],
    onChoose: () => {}
  };

  it('opens the text box over the map and puts the controls away while it is open', () => {
    const html = render({ start: nextToTower, dialog: confirmBox });
    expect(html).toMatch(/class="world__textbox world__textbox--confirm pixel-box" role="dialog" aria-label="Raise shield\?"/);
    expect(html).toContain('Costs 20 power.');
    expect(html).not.toContain('world__controls');
    expect(html).not.toContain('world__bubble');
  });

  it('highlights the first choice (Yes) with an arrow, not only a colour', () => {
    const html = render({ dialog: confirmBox });
    expect(html).toMatch(/class="world__choice is-highlighted" aria-current="true">.*▶.*Yes/);
    expect(html).toMatch(/class="world__choice">.*No/);
  });

  it('can start on another choice', () => {
    expect(render({ dialog: { ...confirmBox, highlight: 1 } })).toMatch(/is-highlighted" aria-current="true">.*▶.*No/);
  });

  it('puts the speech bubble on the side away from the character', () => {
    expect(render({ start: nextToTower })).toContain('world__bubble--right'); // Nova in the left third
    expect(render({ start: { x: 3, y: 2, facing: 'down' } })).toContain('world__bubble--left'); // anywhere else
  });

  it('draws the same with active true or false (only the keyboard changes)', () => {
    expect(render({ active: false })).toBe(render({ active: true }));
  });
});

describe('the 3D picture', () => {
  it('with scene3d, the map still draws the 2D picture where 3D cannot run (tests, old devices)', () => {
    const html = render({ scene3d: { kind: 'base', world: 'moon' } });
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="Test map"');
    expect(html).not.toContain('world3d');
  });
});

describe('pace, celebration and the walk hint', () => {
  it('keeps the Earth pace by default: no slower slide', () => {
    expect(render()).not.toContain('transition-duration');
  });

  it('a slower pace slides the character more slowly', () => {
    expect(render({ stepMs: 400 })).toContain('transition-duration:360ms');
  });

  it('can say something else when nothing is near', () => {
    expect(render({ walkText: 'Low gravity here.' })).toContain('Low gravity here.');
    expect(render()).toContain('Walk Nova to a place, then press USE.');
  });

  it('draws the same before anything is used, celebrating or not', () => {
    expect(render({ celebrate: false })).toBe(render({ celebrate: true }));
  });
});
