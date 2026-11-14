import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Meter, BigButton, Panel, Stars, WhyCard, InfoTip } from './index.js';

describe('WhyCard', () => {
  it('renders nothing when there is no fact', () => {
    expect(renderToStaticMarkup(<WhyCard fact={null} />)).toBe('');
  });

  it('shows the fact and links the source', () => {
    const fact = { text: 'Radiation adds up.', source: { name: 'NASA', url: 'https://www.nasa.gov' } };
    const html = renderToStaticMarkup(<WhyCard fact={fact} />);
    expect(html).toContain('Why?');
    expect(html).toContain('Radiation adds up.');
    expect(html).toContain('href="https://www.nasa.gov"');
  });

  it('shows the source name as plain text when there is no url', () => {
    const fact = { text: 'Placeholder fact', source: { name: 'TODO', url: '' } };
    const html = renderToStaticMarkup(<WhyCard fact={fact} />);
    expect(html).toContain('TODO');
    expect(html).not.toContain('href');
  });
});

describe('InfoTip', () => {
  it('starts closed, with the explanation hidden', () => {
    const html = renderToStaticMarkup(<InfoTip>Invisible energy from the Sun.</InfoTip>);
    expect(html).toContain('What is this?');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden');
  });
});

describe('Meter', () => {
  it('shows "Low!" under 25%', () => {
    const html = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={20} max={100} />);
    expect(html).toContain('Low!');
  });

  it('does not show "Low!" at 25% or more', () => {
    const html = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={25} max={100} />);
    expect(html).not.toContain('Low!');
  });

  it('shows "High!" for a high-is-bad meter at 75% or more', () => {
    const html = renderToStaticMarkup(
      <Meter icon="☢️" label="Radiation" value={30} max={40} alertWhen="high" />
    );
    expect(html).toContain('High!');
    expect(html).not.toContain('Low!');
  });

  it('shows the number and keeps the bar inside 0-100%', () => {
    const html = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={150} max={100} />);
    expect(html).toContain('150');
    expect(html).toContain('width:100%');
  });

  it('uses the max it is given, not a hard-coded 100', () => {
    const html = renderToStaticMarkup(
      <Meter icon="☢️" label="Radiation" value={10} max={40} alertWhen="high" />
    );
    expect(html).toContain('aria-valuemax="40"');
    expect(html).toContain('width:25%');
  });
});

describe('BigButton', () => {
  it('shows label and hint', () => {
    const html = renderToStaticMarkup(<BigButton icon="🛡️" label="Raise shield" hint="Costs 20 power" />);
    expect(html).toContain('Raise shield');
    expect(html).toContain('Costs 20 power');
  });

  it('can be disabled', () => {
    const html = renderToStaticMarkup(<BigButton label="Shelter" disabled />);
    expect(html).toContain('disabled');
  });

  it('marks the selected button with more than colour', () => {
    const html = renderToStaticMarkup(<BigButton label="Shelter now" selected />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('✓');
  });
});

describe('Panel', () => {
  it('renders its title and children', () => {
    const html = renderToStaticMarkup(<Panel title="Base">Hello</Panel>);
    expect(html).toContain('Base');
    expect(html).toContain('Hello');
  });
});

describe('Stars', () => {
  it('shows filled and empty stars with a text label', () => {
    const html = renderToStaticMarkup(<Stars count={2} />);
    expect(html).toContain('2 of 3 stars');
    expect(html).toContain('★★');
    expect(html).toContain('☆');
  });

  it('never shows more stars than max', () => {
    const html = renderToStaticMarkup(<Stars count={5} max={3} />);
    expect(html).toContain('3 of 3 stars');
  });
});
