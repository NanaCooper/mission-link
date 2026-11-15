import { describe, it, expect } from 'vitest';
import {
  TRACKS, STEPS, STEPS_PER_BAR, MUSIC_VOLUME, noteToMidi, midiToHz, parsePattern, notesAt, stepSeconds, trackFor,
  readMusicOff, setMusicOn, musicAllowed, DRUMS
} from './music.js';
import { SOUND_VOLUME } from './sound.js';

// A pretend localStorage
function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

describe('notes', () => {
  it('reads note names', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('H2')).toBeNull();
    expect(noteToMidi('')).toBeNull();
  });

  it('turns notes into pitches (A4 is 440 Hz, an octave doubles it)', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });

  it('a pattern is 4 bars of 16 steps; anything else is an error', () => {
    const bar = 'C4 . . . . . . . . . . . . . . x';
    const steps = parsePattern([bar, bar, bar, bar]);
    expect(steps).toHaveLength(STEPS);
    expect(steps[0]).toBe(60);
    expect(steps[1]).toBeNull();
    expect(steps[15]).toBe('x');
    expect(() => parsePattern([bar, bar, bar])).toThrow();
    expect(() => parsePattern([bar, bar, bar, 'C4 . .'])).toThrow();
    expect(() => parsePattern([bar, bar, bar, bar.replace('C4', 'Q9')])).toThrow();
  });
});

describe('the tracks', () => {
  const ids = Object.keys(TRACKS);

  it('every voice has a full loop of notes, rests or drum hits', () => {
    for (const id of ids) {
      for (const v of TRACKS[id].voices) {
        expect(v.steps).toHaveLength(STEPS);
        for (const note of v.steps) {
          if (note === null) continue;
          if (v.wave === 'drum') expect(DRUMS).toContain(note);
          else {
            expect(note).toBeGreaterThanOrEqual(24); // not too low for a small speaker
            expect(note).toBeLessThanOrEqual(96); // not shrill
          }
        }
        expect(v.level).toBeGreaterThan(0);
        expect(v.hold).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('the base is calm and a little slower on the Moon than on Mars; the control room is busier', () => {
    expect(TRACKS.moonBase.bpm).toBeLessThan(TRACKS.marsBase.bpm);
    expect(TRACKS.marsBase.bpm).toBeLessThan(TRACKS.control.bpm);
    const notesPerLoop = (track) => track.voices.reduce((n, v) => n + v.steps.filter((s) => s !== null).length, 0);
    expect(notesPerLoop(TRACKS.control)).toBeGreaterThan(notesPerLoop(TRACKS.moonBase) * 1.5);
    expect(TRACKS.control.voices.some((v) => v.wave === 'drum')).toBe(true);
    expect(TRACKS.moonBase.voices.some((v) => v.wave === 'drum')).toBe(false);
  });

  it('the tense base is the same music with more on top, at the same speed (so it can fade across)', () => {
    for (const world of ['moon', 'mars']) {
      const calm = TRACKS[`${world}Base`];
      const tense = TRACKS[`${world}BaseTense`];
      expect(tense.bpm).toBe(calm.bpm);
      for (const v of calm.voices) expect(tense.voices).toContain(v);
      expect(tense.voices.length).toBeGreaterThan(calm.voices.length);
    }
  });

  it('the bass plays lower than the tune', () => {
    for (const id of ids) {
      const voices = TRACKS[id].voices;
      const bass = voices.find((v) => v.name === 'bass');
      const highest = (v) => Math.max(...v.steps.filter((s) => typeof s === 'number'));
      const lowest = (v) => Math.min(...v.steps.filter((s) => typeof s === 'number'));
      for (const v of voices) {
        if (v === bass || v.wave === 'drum' || v.name === 'pulse') continue;
        expect(highest(bass)).toBeLessThan(lowest(v));
      }
    }
  });

  it('starts every loop with a chord, and loops round', () => {
    for (const id of ids) {
      const first = notesAt(TRACKS[id], 0);
      expect(first.length).toBeGreaterThanOrEqual(2);
      expect(notesAt(TRACKS[id], STEPS)).toEqual(first);
      expect(notesAt(TRACKS[id], -STEPS)).toEqual(first);
    }
  });

  it('each note lasts its voice hold, in seconds', () => {
    const track = TRACKS.moonBase;
    const bass = notesAt(track, 0).find((n) => n.voice.name === 'bass');
    expect(bass.seconds).toBeCloseTo(15 * stepSeconds(track));
    expect(stepSeconds(TRACKS.control)).toBeCloseTo(60 / 112 / 4);
    expect(STEPS).toBe(STEPS_PER_BAR * 4);
  });

  it('stays quieter than a sound effect, even with every voice playing at once', () => {
    for (const id of ids) {
      const loudest = TRACKS[id].voices.reduce((sum, v) => sum + v.level, 0) * MUSIC_VOLUME;
      expect(loudest).toBeLessThan(SOUND_VOLUME);
    }
  });
});

describe('which track plays (trackFor)', () => {
  const playing = { status: 'playing', world: 'moon' };

  it('the control room plays for Mission Control, the base for the Astronaut', () => {
    expect(trackFor({ ...playing, player: 'missionControl' })).toBe('control');
    expect(trackFor({ ...playing, player: 'astronaut' })).toBe('moonBase');
    expect(trackFor({ ...playing, world: 'mars', player: 'astronaut' })).toBe('marsBase');
    expect(trackFor({ ...playing, world: 'mars', player: 'missionControl' })).toBe('control');
  });

  it('the base gets tenser when the newest message says danger', () => {
    const inbox = (...warnings) => warnings.map((warning, turn) => ({ turn, warning }));
    expect(trackFor({ ...playing, player: 'astronaut', inbox: inbox('stormComing') })).toBe('moonBaseTense');
    expect(trackFor({ ...playing, player: 'astronaut', inbox: inbox('allClear', 'shelterNow') })).toBe('moonBaseTense');
    expect(trackFor({ ...playing, world: 'mars', player: 'astronaut', inbox: inbox('savePower') })).toBe('marsBase');
    // Only the newest message counts
    expect(trackFor({ ...playing, player: 'astronaut', inbox: inbox('shelterNow', 'allClear') })).toBe('moonBase');
    // Mission Control's music never changes with the messages
    expect(trackFor({ ...playing, player: 'missionControl', inbox: inbox('shelterNow') })).toBe('control');
  });

  it('silence when no game screen shows, and on the end screen (it plays its own jingle)', () => {
    expect(trackFor({ ...playing, player: null })).toBeNull();
    expect(trackFor({ status: 'won', world: 'moon', player: 'astronaut' })).toBeNull();
    expect(trackFor({ status: 'lost', world: 'moon', player: 'missionControl' })).toBeNull();
    expect(trackFor({ status: 'lobby', world: 'moon', player: 'astronaut' })).toBeNull();
    expect(trackFor()).toBeNull();
  });

  it('only ever names a real track', () => {
    for (const world of ['moon', 'mars']) {
      for (const player of ['astronaut', 'missionControl']) {
        for (const warning of ['stormComing', 'shelterNow', 'savePower', 'allClear']) {
          const id = trackFor({ ...playing, world, player, inbox: [{ turn: 0, warning }] });
          expect(TRACKS[id]).toBeDefined();
        }
      }
    }
  });
});

describe('the Music switch', () => {
  it('is on until it is switched off, and remembers the choice', () => {
    const storage = memoryStorage();
    expect(readMusicOff(storage)).toBe(false);
    setMusicOn(false, storage);
    expect(readMusicOff(storage)).toBe(true);
    setMusicOn(true, storage);
    expect(readMusicOff(storage)).toBe(false);
  });

  it('does not break when the device blocks storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(readMusicOff(blocked)).toBe(false);
    expect(() => setMusicOn(false, blocked)).not.toThrow();
    setMusicOn(true, memoryStorage());
  });

  it('Sound off means music off too', () => {
    expect(musicAllowed({ soundOn: true, musicOn: true })).toBe(true);
    expect(musicAllowed({ soundOn: true, musicOn: false })).toBe(false);
    expect(musicAllowed({ soundOn: false, musicOn: true })).toBe(false);
    expect(musicAllowed({ soundOn: false, musicOn: false })).toBe(false);
  });
});
