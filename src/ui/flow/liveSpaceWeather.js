// Live space weather from NASA DONKI, for the "The Sun right now" panel.
// Only a side panel: the game storm is always the archived one, so play never depends on this.
// DONKI's own web service needs no key and allows browser calls (CORS *). Checked 14 Nov 2026.
// (api.nasa.gov/DONKI/FLR returns 404, so we use the CCMC address.)

export const DONKI_BASE = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get';
export const DONKI_HOME = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
export const DAYS = 30;
const TIMEOUT_MS = 8000;
const CACHE_KEY = 'missionlink:spaceWeather';
const CACHE_MS = 30 * 60 * 1000;

const isoDay = (date) => date.toISOString().slice(0, 10);

/** The last `days` days up to today (UTC), as DONKI wants them. */
export function dateRange(now = new Date(), days = DAYS) {
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate: isoDay(start), endDate: isoDay(now) };
}

const CLASS_ORDER = 'ABCMX';

/** 'M3.5' -> a number to compare flares by. Unknown classes rank lowest. */
export function flareRank(classType) {
  const match = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(String(classType ?? '').trim().toUpperCase());
  if (!match) return -1;
  return CLASS_ORDER.indexOf(match[1]) * 1000 + Number(match[2]);
}

const list = (value) => (Array.isArray(value) ? value : []);

/** Boil DONKI's three lists down to what the panel shows. Pure, so it is easy to test. */
export function summarize({ flares, cmes, storms }) {
  const flareList = list(flares);
  let biggest = null;
  for (const flare of flareList) {
    if (!biggest || flareRank(flare.classType) > flareRank(biggest.classType)) biggest = flare;
  }
  let strongestKp = null;
  for (const storm of list(storms)) {
    for (const reading of list(storm.allKpIndex)) {
      if (typeof reading.kpIndex === 'number' && (strongestKp === null || reading.kpIndex > strongestKp)) {
        strongestKp = reading.kpIndex;
      }
    }
  }
  return {
    flareCount: flareList.length,
    biggestFlare:
      biggest && flareRank(biggest.classType) >= 0
        ? {
            classType: biggest.classType,
            day: String(biggest.peakTime ?? biggest.beginTime ?? '').slice(0, 10),
            region: biggest.activeRegionNum ?? null,
            link: biggest.link ?? null,
          }
        : null,
    cmeCount: list(cmes).length,
    stormCount: list(storms).length,
    strongestKp,
  };
}

async function getJson(fetchFn, type, range, signal) {
  const url = `${DONKI_BASE}/${type}?startDate=${range.startDate}&endDate=${range.endDate}`;
  const response = await fetchFn(url, { signal });
  if (!response.ok) throw new Error(`DONKI ${type}: ${response.status}`);
  const text = await response.text();
  return text.trim() ? JSON.parse(text) : []; // DONKI sends an empty body when there is nothing
}

function readCache(storage, now) {
  try {
    const saved = JSON.parse(storage.getItem(CACHE_KEY));
    if (saved?.summary && now - saved.checkedAt < CACHE_MS) return saved;
  } catch {
    // No storage or bad data: fetch again.
  }
  return null;
}

function writeCache(storage, value) {
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: we just ask NASA again next time.
  }
}

/**
 * Ask DONKI for the last 30 days. Resolves { summary, checkedAt, range } or rejects
 * (offline, NASA down, timeout). Cached for 30 minutes per tab.
 */
export async function fetchSpaceWeather({
  fetchFn = globalThis.fetch,
  now = Date.now(),
  storage = globalThis.sessionStorage,
  timeoutMs = TIMEOUT_MS,
} = {}) {
  const cached = readCache(storage, now);
  if (cached) return cached;

  const range = dateRange(new Date(now));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [flares, cmes, storms] = await Promise.all([
      getJson(fetchFn, 'FLR', range, controller.signal),
      getJson(fetchFn, 'CME', range, controller.signal),
      getJson(fetchFn, 'GST', range, controller.signal),
    ]);
    const value = { summary: summarize({ flares, cmes, storms }), checkedAt: now, range };
    writeCache(storage, value);
    return value;
  } finally {
    clearTimeout(timer);
  }
}
