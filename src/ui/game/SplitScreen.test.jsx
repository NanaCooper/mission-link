import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SplitScreen from './SplitScreen.jsx';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsAstronautView,
  fakeMarsMissionControlView
} from '../fakeState.js';

const noop = () => {};

function render(astronautView, missionControlView) {
  return renderToStaticMarkup(
    <SplitScreen
      astronautView={astronautView}
      missionControlView={missionControlView}
      onMove={noop}
      onWarn={noop}
    />
  );
}

describe('SplitScreen', () => {
  it('shows both player screens', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('Mission Control, Earth');
    expect(html).toContain('Moon base');
  });

  it('puts Mission Control first, so it is on top on phones', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html.indexOf('Mission Control, Earth')).toBeLessThan(html.indexOf('Moon base'));
  });

  it('has a labelled divider so each kid knows their half', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('role="separator"');
    expect(html).toContain('👆 Mission Control');
    expect(html).toContain('👇 Astronaut');
  });

  it('works on Mars too', () => {
    const html = render(fakeMarsAstronautView, fakeMarsMissionControlView);
    expect(html).toContain('Mars base');
    expect(html).toContain('world-mars');
  });
});
