import { useEffect, useRef, useState } from 'react';
import { BigButton, Portrait, SpeechBox, PixelIcon } from '../../components/index.js';
import SpaceScene from '../scenes/SpaceScene.jsx';
import BasePostcard from './BasePostcard.jsx';
import { CHARACTERS } from '../labels.js';
import {
  BRIEFING_TITLE,
  BRIEFING_SKIP,
  BRIEFING_BACK,
  BRIEFING_NEXT,
  BRIEFING_START,
  BRIEFING_PAGES,
  WARNING_FACT,
  fillStorm
} from './briefingText.js';
import './briefing.css';

// The mission briefing: a short introduction before the first mission, like the opening of a game.
// Four pages: the danger (a real storm is coming), why it matters, the mission objective,
// and the two jobs. Commander Sola, BLIP and Nova explain it. Skip at any time.
//
// Props:
//   storm    the storm that will be played (for its name and date), e.g. getStorm(null)
//   onDone   called when the player starts the mission or skips
//   startLabel  optional: the words on the last button (default "Start the mission")
const NAMES = { sola: CHARACTERS.director.name, nova: CHARACTERS.astronaut.name, blip: CHARACTERS.robot.name };

export default function MissionBriefing({ storm, onDone, startLabel = BRIEFING_START }) {
  const [index, setIndex] = useState(0);
  const page = BRIEFING_PAGES[index];
  const last = index === BRIEFING_PAGES.length - 1;
  const heading = useRef(null);

  // A new page: put the keyboard and screen reader on its title.
  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  // Arrow keys turn the pages, Escape skips.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(BRIEFING_PAGES.length - 1, i + 1));
      else if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (event.key === 'Escape') onDone?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <main className="briefing" aria-label={BRIEFING_TITLE}>
      <header className="briefing__top">
        <p className="briefing__kicker">{BRIEFING_TITLE}</p>
        <ol className="briefing__dots" aria-label={`Page ${index + 1} of ${BRIEFING_PAGES.length}`}>
          {BRIEFING_PAGES.map((p, i) => (
            <li key={p.id} className={i === index ? 'is-on' : i < index ? 'is-done' : ''} aria-hidden="true" />
          ))}
        </ol>
        <button type="button" className="briefing__skip" onClick={() => onDone?.()}>
          {BRIEFING_SKIP}
        </button>
      </header>

      <section key={page.id} className="briefing__page" aria-labelledby="briefing-title">
        <div className="briefing__picture">
          <Picture kind={page.picture} />
        </div>

        <div className="briefing__words">
          <h1 id="briefing-title" className="briefing__title pixel-title" tabIndex={-1} ref={heading}>
            {page.title}
          </h1>

          <SpeechBox who={page.who} mood={page.mood} name={NAMES[page.who]} text={page.text} size={56}>
            {page.more && <p>{fillStorm(page.more, storm)}</p>}
          </SpeechBox>

          {page.fact && (
            <aside className="briefing__fact" aria-label="A NASA fact">
              <PixelIcon name="signal" size={22} />
              <div>
                <p className="briefing__fact-text">{WARNING_FACT.text}</p>
                <p className="briefing__fact-source">
                  Source:{' '}
                  <a href={WARNING_FACT.source.url} target="_blank" rel="noopener noreferrer">
                    {WARNING_FACT.source.name}
                  </a>
                </p>
              </div>
            </aside>
          )}

          {page.goals && (
            <ul className="briefing__goals">
              {page.goals.map((goal, i) => (
                <li key={goal}>
                  <span className="briefing__goal-stars" aria-hidden="true">
                    {Array.from({ length: i + 1 }, (_, n) => (
                      <PixelIcon key={n} name="star" size={16} />
                    ))}
                  </span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          )}

          {page.roles && (
            <ul className="briefing__roles">
              {page.roles.map((role) => (
                <li key={role.who}>
                  <Portrait who={role.who} size={44} />
                  <span>
                    <strong>{role.name}:</strong> {role.job}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {page.after && <p className="briefing__after">{page.after}</p>}
        </div>
      </section>

      <footer className="briefing__nav">
        <button
          type="button"
          className="briefing__back"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          {BRIEFING_BACK}
        </button>
        <div className="briefing__next">
          {last ? (
            <BigButton icon={<PixelIcon name="star" size={26} />} label={startLabel} onClick={() => onDone?.()} />
          ) : (
            <BigButton icon={<PixelIcon name="next" size={26} />} label={BRIEFING_NEXT} onClick={() => setIndex((i) => i + 1)} />
          )}
        </div>
      </footer>
    </main>
  );
}

// The pixel picture on each page
function Picture({ kind }) {
  if (kind === 'sun') return <SpaceScene world="moon" turn={1} stageName="The Sun throws a storm toward the base." />;
  if (kind === 'base') return <BasePostcard shield />;
  if (kind === 'waves') return <WavesPicture />;
  return <BasePostcard team />;
}

// Three waves as three bars, the middle one tallest (wave 2 is the strongest)
function WavesPicture() {
  const waves = [
    { name: 'Wave 1', height: 30, note: 'Flare' },
    { name: 'Wave 2', height: 90, note: 'Peak!' },
    { name: 'Wave 3', height: 55, note: 'Fading' }
  ];
  return (
    <div className="briefing-waves" role="img" aria-label="Three waves of the storm. Wave 2 is the strongest.">
      {waves.map((wave) => (
        <div key={wave.name} className="briefing-waves__wave">
          <span className="briefing-waves__note">{wave.note}</span>
          <span className="briefing-waves__bar" style={{ height: `${wave.height}%` }} />
          <span className="briefing-waves__name">{wave.name}</span>
        </div>
      ))}
    </div>
  );
}
