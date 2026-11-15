import { describe, it, expect } from 'vitest';
import { getStorm, REAL_STORM_IDS, STORMS } from '../../engine/storms/index.js';
import { isValidStorm } from '../../engine/index.js';
import raw2025 from '../../../docs/data/donki-2025-05-31.json';
import raw2024 from '../../../docs/data/donki-2024-05-11.json';

// The second real storm must match the archived NASA DONKI records it was made from,
// exactly like the May 2024 storm (storm.test.js).
const storm = getStorm('storm-2025-05-31');
const bestCme = raw2025.cme.cmeAnalyses.find((a) => a.isMostAccurate && a.featureCode === 'LE');

// How a real storm's numbers are chosen (build guide, Dev 4 step 2): the strongest wave follows the
// flare class, the fading wave follows the cloud's speed. Inside STORM_LIMITS.
const peakFor = (flareClass) => {
  const letter = flareClass[0];
  const size = Number(flareClass.slice(1));
  if (letter === 'X') return size >= 10 ? 50 : 40;
  return 30; // M-class (or weaker)
};
const fadeFor = (kmPerSec) => (kmPerSec < 1000 ? 10 : kmPerSec < 2000 ? 20 : 24);

describe('the May 2025 storm', () => {
  it('is a real storm the game can pick, and a valid storm for the engine', () => {
    expect(REAL_STORM_IDS).toContain(storm.id);
    expect(storm.id).toBe('storm-2025-05-31');
    expect(isValidStorm(storm)).toBe(true);
  });

  it('says when the data was saved, so it is never shown as live', () => {
    expect(storm.savedOn).toBe(raw2025.savedOn);
  });

  it('uses the real flare, cloud and particle data from DONKI', () => {
    const [quiet, flare, cloud, particles, fading, clear] = storm.stages;
    expect(quiet.realData.activeRegionNum).toBe(raw2025.flr.activeRegionNum);
    expect(flare.realData.flareClass).toBe(raw2025.flr.classType);
    expect(flare.realData.flareBegin).toBe(raw2025.flr.beginTime);
    expect(flare.realData.flarePeak).toBe(raw2025.flr.peakTime);
    expect(flare.realData.flareEnd).toBe(raw2025.flr.endTime);
    expect(flare.fact.source.url).toBe(raw2025.flr.link);
    expect(cloud.realData.cmeStart).toBe(raw2025.cme.startTime);
    expect(cloud.realData.cmeSpeedKmPerSec).toBe(bestCme.speed);
    expect(particles.realData.particlesDetected).toBe(raw2025.sep.eventTime);
    expect(storm.source.url).toBe(raw2025.sep.link);
    // The second particle alert is one of the flare's linked DONKI events
    const second = fading.realData.secondParticleAlert.replace('Z', ':00-SEP-001');
    expect(raw2025.flr.linkedEvents.map((e) => e.activityID)).toContain(second);
    // NASA's model of the cloud reaching Mars (the leading-edge analysis)
    const marsArrivals = bestCme.enlilList.flatMap((e) => e.impactList ?? []).filter((i) => i.location === 'Mars').map((i) => i.arrivalTime);
    expect(marsArrivals).toContain(clear.realData.modelMarsArrival);
  });

  it('links the three DONKI records to each other', () => {
    const ids = raw2025.sep.linkedEvents.map((e) => e.activityID);
    expect(ids).toContain(raw2025.flr.flrID);
    expect(ids).toContain(raw2025.cme.activityID);
  });

  it('gives every stage a fact with a NASA link', () => {
    for (const stage of storm.stages) {
      expect(stage.fact.text.length).toBeGreaterThan(0);
      expect(stage.fact.source.url).toMatch(/^https:\/\/([a-z]+\.)*nasa\.gov\//);
    }
  });

  it('keeps kid-facing lines short', () => {
    const lines = [...storm.whatReallyHappened, ...storm.stages.flatMap((s) => [s.missionControlSees, s.fact.text])];
    for (const line of lines) expect(line.split(/\s+/).length).toBeLessThanOrEqual(25);
  });
});

describe('every real storm', () => {
  const cases = [
    [getStorm('storm-2024-05-11'), raw2024],
    [storm, raw2025]
  ];

  it('is listed once, and only real storms are listed', () => {
    expect(new Set(REAL_STORM_IDS).size).toBe(REAL_STORM_IDS.length);
    for (const id of REAL_STORM_IDS) expect(STORMS[id].savedOn).toBeTruthy();
  });

  it('has its strongest wave set by the real flare class and its fading wave by the cloud speed', () => {
    for (const [s, raw] of cases) {
      const le = raw.cme.cmeAnalyses.find((a) => a.isMostAccurate && a.featureCode === 'LE');
      expect(s.stages.map((x) => x.incoming)).toEqual([0, 5, 10, peakFor(raw.flr.classType), fadeFor(le.speed), 0]);
    }
  });

  it('plays differently from the others (a different strongest wave)', () => {
    const peaks = cases.map(([s]) => s.stages[3].incoming);
    expect(new Set(peaks).size).toBe(peaks.length);
  });
});
