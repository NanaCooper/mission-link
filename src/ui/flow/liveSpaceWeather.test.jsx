import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DONKI_BASE, dateRange, fetchSpaceWeather, flareRank, summarize } from './liveSpaceWeather.js';
import { SpaceWeatherBody } from './SpaceWeatherPanel.jsx';

// Shapes copied from real DONKI replies (14 Nov 2026), trimmed.
const flares = [
  { flrID: '2026-10-16T15:38:00-FLR-001', classType: 'M1.3', peakTime: '2026-10-16T15:42Z', activeRegionNum: 14551, link: 'https://example.test/flr1' },
  { flrID: '2026-11-05T18:21:00-FLR-001', classType: 'M3.5', peakTime: '2026-11-05T18:33Z', activeRegionNum: 14566, link: 'https://example.test/flr2' },
  { flrID: '2026-10-26T18:17:00-FLR-001', classType: 'C2.8', peakTime: '2026-10-26T18:40Z', activeRegionNum: 14561 },
];
const cmes = [{ activityID: 'a' }, { activityID: 'b' }];
const storms = [{ gstID: '2026-10-31T18:00:00-GST-001', allKpIndex: [{ kpIndex: 5 }, { kpIndex: 6 }] }];

describe('liveSpaceWeather', () => {
  it('ranks flares by letter, then number', () => {
    expect(flareRank('X1.0')).toBeGreaterThan(flareRank('M9.9'));
    expect(flareRank('M3.5')).toBeGreaterThan(flareRank('M1.3'));
    expect(flareRank('C2.8')).toBeGreaterThan(flareRank('B9'));
    expect(flareRank('')).toBe(-1);
  });

  it('asks for the last 30 days in UTC', () => {
    expect(dateRange(new Date('2026-11-14T13:00:00Z'))).toEqual({ startDate: '2026-10-15', endDate: '2026-11-14' });
  });

  it('summarises the three lists', () => {
    expect(summarize({ flares, cmes, storms })).toEqual({
      flareCount: 3,
      biggestFlare: { classType: 'M3.5', day: '2026-11-05', region: 14566, link: 'https://example.test/flr2' },
      cmeCount: 2,
      stormCount: 1,
      strongestKp: 6,
    });
    expect(summarize({ flares: null, cmes: undefined, storms: [] })).toEqual({
      flareCount: 0, biggestFlare: null, cmeCount: 0, stormCount: 0, strongestKp: null,
    });
  });

  const memory = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) };
  };
  const reply = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, text: () => Promise.resolve(body) });

  it('fetches FLR, CME and GST from DONKI and caches the answer', async () => {
    const urls = [];
    const fetchFn = (url) => {
      urls.push(url);
      if (url.includes('/FLR?')) return reply(JSON.stringify(flares));
      if (url.includes('/CME?')) return reply(JSON.stringify(cmes));
      return reply(''); // DONKI sends an empty body when there is nothing
    };
    const storage = memory();
    const now = Date.parse('2026-11-14T13:00:00Z');
    const first = await fetchSpaceWeather({ fetchFn, now, storage });
    expect(urls).toHaveLength(3);
    expect(urls[0]).toBe(`${DONKI_BASE}/FLR?startDate=2026-10-15&endDate=2026-11-14`);
    expect(first.summary.flareCount).toBe(3);
    expect(first.summary.stormCount).toBe(0);

    const again = await fetchSpaceWeather({ fetchFn, now: now + 60_000, storage });
    expect(urls).toHaveLength(3); // from the cache
    expect(again.summary).toEqual(first.summary);
  });

  it('rejects when NASA fails, so the panel can say so', async () => {
    await expect(fetchSpaceWeather({ fetchFn: () => reply('', false), storage: memory() })).rejects.toThrow();
    await expect(fetchSpaceWeather({ fetchFn: () => Promise.reject(new Error('offline')), storage: memory() })).rejects.toThrow();
  });
});

describe('SpaceWeatherBody', () => {
  const html = (result) => renderToStaticMarkup(<SpaceWeatherBody result={result} />);

  it('says it is asking, or that NASA could not be reached', () => {
    expect(html({ status: 'loading' })).toContain('Asking NASA');
    expect(html({ status: 'error' })).toContain('The game still works');
  });

  it('labels live data as live and explains each space word', () => {
    const out = html({ status: 'ok', checkedAt: Date.now(), summary: summarize({ flares, cmes, storms }) });
    expect(out).toContain('Live NASA data, checked at');
    expect(out).not.toContain('Archived');
    expect(out).toContain('3 solar flares');
    expect(out).toContain('M3.5');
    expect(out).toContain('5 Nov 2026');
    expect(out).toContain('2 giant clouds');
    expect(out).toContain('1 storm on Earth');
    expect(out).toContain('X flares are the strongest');
  });
});
