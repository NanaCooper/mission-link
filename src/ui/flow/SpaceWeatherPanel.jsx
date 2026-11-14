import { useEffect, useState } from 'react';
import { Panel } from '../components/index.js';
import { DONKI_HOME, DAYS, fetchSpaceWeather } from './liveSpaceWeather.js';
import { SPACE_WEATHER_WORDS } from './facts.js';
import { formatDate } from './text.js';
import './flow.css';

const clock = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Live NASA space weather for the last 30 days. Shows while you are on Home or Data sources.
// If NASA cannot be reached, it says so. The game itself never needs it.
//
// Props: { load }  only for tests: a function that returns the same promise as fetchSpaceWeather()
export default function SpaceWeatherPanel({ load = fetchSpaceWeather }) {
  const [result, setResult] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    load()
      .then((value) => alive && setResult({ status: 'ok', ...value }))
      .catch(() => alive && setResult({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [load]);

  return (
    <Panel title="The Sun right now">
      <SpaceWeatherBody result={result} />
      <p className="flow-small">
        Data:{' '}
        <a href={DONKI_HOME} target="_blank" rel="noopener noreferrer">
          NASA DONKI
        </a>
      </p>
    </Panel>
  );
}

// Split out so tests can render each state without a browser.
export function SpaceWeatherBody({ result }) {
  if (result.status === 'loading') {
    return (
      <p className="flow-waiting" role="status">
        <span className="flow-waiting__dot" aria-hidden="true" />
        Asking NASA about the Sun...
      </p>
    );
  }
  if (result.status === 'error') {
    return <p className="flow-note">We could not reach NASA right now. The game still works!</p>;
  }

  const { summary, checkedAt } = result;
  const big = summary.biggestFlare;
  return (
    <>
      <p className="flow-badge flow-badge--live">
        <span aria-hidden="true">📡</span> Live NASA data, checked at {clock(checkedAt)}
      </p>
      <p>In the last {DAYS} days, NASA saw:</p>
      <ul className="flow-list">
        <li>
          <strong>
            {summary.flareCount} solar flare{summary.flareCount === 1 ? '' : 's'}
          </strong>
          . {SPACE_WEATHER_WORDS.flare.text}
          {big && (
            <>
              {' '}
              The biggest was{' '}
              {big.link ? (
                <a href={big.link} target="_blank" rel="noopener noreferrer">
                  {big.classType}
                </a>
              ) : (
                big.classType
              )}
              {formatDate(big.day) ? ` on ${formatDate(big.day)}` : ''}
              {big.region ? `, from sunspot patch number ${big.region}` : ''}. {SPACE_WEATHER_WORDS.flareClass.text}
            </>
          )}
        </li>
        <li>
          <strong>
            {summary.cmeCount} giant cloud{summary.cmeCount === 1 ? '' : 's'}
          </strong>{' '}
          of gas thrown out by the Sun. {SPACE_WEATHER_WORDS.cme.text}
        </li>
        <li>
          <strong>
            {summary.stormCount} storm{summary.stormCount === 1 ? '' : 's'} on Earth
          </strong>
          . {SPACE_WEATHER_WORDS.geomagneticStorm.text}
        </li>
      </ul>
      <p className="flow-small">
        Our game storm is a real storm from May 2024. This box shows the Sun today.
      </p>
    </>
  );
}
