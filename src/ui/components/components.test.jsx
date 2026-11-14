import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Meter, BigButton, Panel, Stars, WhyCard, InfoTip, Portrait, PixelIcon, SpeechBox } from './index.js';

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
  it('shows filled and empty pixel stars with a text label', () => {
    const html = renderToStaticMarkup(<Stars count={2} />);
    expect(html).toContain('2 of 3 stars');
    expect(html.match(/stars__star is-on/g)).toHaveLength(2);
    expect(html.match(/stars__star is-off/g)).toHaveLength(1);
  });

  it('never shows more stars than max', () => {
    const html = renderToStaticMarkup(<Stars count={5} max={3} />);
    expect(html).toContain('3 of 3 stars');
    expect(html.match(/stars__star is-on/g)).toHaveLength(3);
  });
});

describe('Meter: change since last turn', () => {
  it('shows "+15" with an up arrow, and no tag when nothing changed', () => {
    const up = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={60} max={100} delta={15} />);
    expect(up).toContain('+15');
    expect(up).toContain('▲');
    const same = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={60} max={100} delta={0} />);
    expect(same).not.toContain('meter__delta');
    const none = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={60} max={100} />);
    expect(none).not.toContain('meter__delta');
  });

  it('marks a drop in power as bad, and a rise in radiation as bad', () => {
    const power = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={40} max={100} delta={-20} />);
    expect(power).toContain('-20');
    expect(power).toContain('▼');
    expect(power).toContain('meter__delta is-bad');
    const radiation = renderToStaticMarkup(
      <Meter icon="☢️" label="Radiation" value={12} max={40} alertWhen="high" delta={12} />
    );
    expect(radiation).toContain('meter__delta is-bad');
    const healed = renderToStaticMarkup(<Meter icon="❤️" label="Crew health" value={90} max={100} delta={5} />);
    expect(healed).not.toContain('is-bad');
  });

  it('can hide the "/ 100" part but still tells screen readers the max', () => {
    const html = renderToStaticMarkup(<Meter icon="⚡" label="Power" value={45} max={100} showMax={false} />);
    expect(html).not.toContain('/ 100');
    expect(html).toContain('of 100');
    expect(html).toContain('aria-valuemax="100"');
  });
});

describe('Portrait', () => {
  it('draws the character in a frame with its own colour class', () => {
    const html = renderToStaticMarkup(<Portrait who="nova" mood="happy" label="Nova looks happy" />);
    expect(html).toContain('portrait portrait--nova');
    expect(html).toContain('aria-label="Nova looks happy"');
    expect(html).toContain('<rect');
  });

  it('draws a different face for a different mood', () => {
    const happy = renderToStaticMarkup(<Portrait who="nova" mood="happy" />);
    const hurt = renderToStaticMarkup(<Portrait who="nova" mood="hurt" />);
    expect(hurt).not.toBe(happy);
  });

  it('falls back to the usual face for an unknown mood, and draws nothing for an unknown character', () => {
    const usual = renderToStaticMarkup(<Portrait who="sola" mood="calm" />);
    expect(renderToStaticMarkup(<Portrait who="sola" mood="dancing" />)).toBe(usual);
    expect(renderToStaticMarkup(<Portrait who="nobody" />)).toBe('');
  });

  it('is hidden from screen readers when it has no label', () => {
    expect(renderToStaticMarkup(<Portrait who="blip" />)).toContain('aria-hidden="true"');
  });
});

describe('PixelIcon', () => {
  it('draws a known icon and nothing for an unknown one', () => {
    expect(renderToStaticMarkup(<PixelIcon name="shield" />)).toContain('pixel-icon');
    expect(renderToStaticMarkup(<PixelIcon name="banana" />)).toBe('');
  });

  it('uses the size it is given', () => {
    expect(renderToStaticMarkup(<PixelIcon name="shield" size={20} />)).toContain('height="20"');
  });
});

describe('SpeechBox', () => {
  it('shows the face, the name and the whole sentence for screen readers', () => {
    const html = renderToStaticMarkup(
      <SpeechBox who="sola" name="Commander Sola" title="Mission Control says:" text="Shelter now!" tag="New" />
    );
    expect(html).toContain('portrait--sola');
    expect(html).toContain('Commander Sola');
    expect(html).toContain('Mission Control says:');
    expect(html).toContain('<span class="visually-hidden">Shelter now!</span>');
    expect(html).toContain('New');
  });

  it('types the words one letter at a time, hidden from screen readers', () => {
    const html = renderToStaticMarkup(<SpeechBox who="blip" name="BLIP" text="Hi you" />);
    expect(html.match(/class="typed__char"/g)).toHaveLength(5); // H, i, y, o, u (the space is not a letter)
    expect(html).toContain('<span class="typed" aria-hidden="true">');
  });

  it('shows extra lines under the words', () => {
    const html = renderToStaticMarkup(
      <SpeechBox who="blip" name="BLIP" text="A fact.">
        <p>Source: NASA</p>
      </SpeechBox>
    );
    expect(html).toContain('Source: NASA');
  });
});
