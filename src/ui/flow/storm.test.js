import { describe, it, expect } from 'vitest';
import { getStorm, DEFAULT_STORM_ID } from '../../engine/storms/index.js';
import raw from '../../../docs/data/donki-2024-05-11.json';

// The real storm must match the archived NASA DONKI records it was made from.
const storm = getStorm('storm-2024-05-11');
const bestCme = raw.cme.cmeAnalyses.find(a => a.isMostAccurate && a.featureCode === 'LE');

describe('the May 2024 storm', () => {
  it('is the default storm', () => {
    expect(DEFAULT_STORM_ID).toBe('storm-2024-05-11');
  });

  it('keeps the balance pattern of 6 stages', () => {
    expect(storm.stages.map(s => s.incoming)).toEqual([0, 5, 10, 40, 20, 0]);
  });

  it('says when the data was saved, so it is never shown as live', () => {
    expect(storm.savedOn).toBe(raw.savedOn);
  });

  it('uses the real flare, cloud and particle data from DONKI', () => {
    const [, flare, cloud, particles] = storm.stages;
    expect(flare.realData.flareClass).toBe(raw.flr.classType);
    expect(flare.realData.flareBegin).toBe(raw.flr.beginTime);
    expect(cloud.realData.cmeStart).toBe(raw.cme.startTime);
    expect(cloud.realData.cmeSpeedKmPerSec).toBe(bestCme.speed);
    expect(particles.realData.particlesDetected).toBe(raw.sep.eventTime);
    expect(storm.source.url).toBe(raw.sep.link);
  });

  it('links the three DONKI records to each other', () => {
    const ids = raw.sep.linkedEvents.map(e => e.activityID);
    expect(ids).toContain(raw.flr.flrID);
    expect(ids).toContain(raw.cme.activityID);
  });

  it('gives every stage a fact with a NASA link', () => {
    for (const stage of storm.stages) {
      expect(stage.fact.text.length).toBeGreaterThan(0);
      expect(stage.fact.source.url).toMatch(/^https:\/\/([a-z]+\.)*nasa\.gov\//);
    }
  });

  it('keeps kid-facing lines short', () => {
    const lines = [
      ...storm.whatReallyHappened,
      ...storm.stages.flatMap(s => [s.missionControlSees, s.fact.text])
    ];
    for (const line of lines) {
      expect(line.split(/\s+/).length).toBeLessThanOrEqual(25);
    }
  });
});
