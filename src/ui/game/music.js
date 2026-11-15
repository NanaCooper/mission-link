// Background music: short, original chiptune loops made with the Web Audio API. No audio files.
// It builds on sound.js: the same AudioContext (made on the first tap or key press), and the
// Sound switch turns the music off too. The music has its own switch (Music on / off).
//
// The pure parts are tested (music.test.js): the note patterns (TRACKS, notesAt), which track
// plays for which screen and state (trackFor), and the setting (musicAllowed, readMusicOff).
// The music only follows what the player's own view shows. It never changes the game.
import { useEffect, useSyncExternalStore } from 'react';
import { getAudio, isSoundOn, onSoundChange, onAudioUnlock, listenForFirstTap } from './sound.js';

// How loud the music is, before each voice's own level. With every voice playing at once it
// stays below a sound effect (SOUND_VOLUME in sound.js), so warnings are always heard.
export const MUSIC_VOLUME = 0.03;

// Fading between two tracks (a new screen), and fading out to silence, in seconds
export const FADE_SECONDS = 1.2;
const QUICK_FADE_SECONDS = 0.35;

// A loop is 4 bars of 16 steps (sixteenth notes)
export const STEPS_PER_BAR = 16;
export const BARS = 4;
export const STEPS = STEPS_PER_BAR * BARS;

// ---------- Notes ----------

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 'A4' -> 69 (MIDI note number), 'C#4' -> 61, 'Bb3' -> 58. Anything else -> null.
export function noteToMidi(name) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name ?? '');
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  return LETTERS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + (Number(octave) + 1) * 12;
}

// MIDI note number -> pitch in Hz (69 = A4 = 440 Hz)
export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Drum hits (the 'drum' voice): x = a short hiss (hi-hat), k = a soft low thump
export const DRUMS = ['x', 'k'];

// One bar is 16 steps written with spaces: a note name, '.' for a rest, or a drum letter.
// Returns STEPS entries: a MIDI number, a drum letter, or null.
export function parsePattern(bars) {
  const steps = [];
  for (const bar of bars) {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== STEPS_PER_BAR) throw new Error(`A bar needs ${STEPS_PER_BAR} steps: "${bar}"`);
    for (const token of tokens) {
      if (token === '.') steps.push(null);
      else if (DRUMS.includes(token)) steps.push(token);
      else {
        const midi = noteToMidi(token);
        if (midi === null) throw new Error(`Not a note: "${token}"`);
        steps.push(midi);
      }
    }
  }
  if (steps.length !== STEPS) throw new Error(`A loop needs ${BARS} bars`);
  return steps;
}

// A voice: one instrument line. wave = the oscillator ('sine', 'triangle', 'square') or 'drum';
// level = its share of MUSIC_VOLUME (0..1); hold = how many steps each note lasts.
const voice = (name, wave, level, hold, bars) => ({ name, wave, level, hold, steps: parsePattern(bars) });

// ---------- The tracks (written for this game) ----------

// The base on the Moon or Mars: calm and spacey. D minor, then B flat, G minor and A.
// A slow arpeggio, a long low note under each bar, and a few far-away bell notes.
const BASE_VOICES = [
  voice('bass', 'triangle', 0.36, 15, [
    'D2 . . . . . . . . . . . . . . .',
    'Bb1 . . . . . . . . . . . . . . .',
    'G1 . . . . . . . . . . . . . . .',
    'A1 . . . . . . . . . . . . . . .'
  ]),
  voice('arpeggio', 'triangle', 0.24, 2, [
    'D4 . A4 . F5 . A4 . D5 . A4 . F4 . A4 .',
    'Bb3 . F4 . D5 . F4 . Bb4 . F4 . D4 . F4 .',
    'G3 . D4 . Bb4 . D4 . G4 . D4 . Bb3 . D4 .',
    'A3 . E4 . C#5 . E4 . A4 . E4 . C#4 . E4 .'
  ]),
  voice('bells', 'sine', 0.12, 4, [
    '. . . . . . A5 . . . . . . . . .',
    '. . . . . . . . . . . . F5 . . .',
    '. . . . D6 . . . . . . . . . . .',
    '. . . . . . . . . . E5 . . . C#6 .'
  ])
];

// Mission Control's warning says danger: the same music with a low pulse and a little beep,
// so the base feels tenser. It only follows the message on screen, never the storm data.
const TENSE_VOICES = [
  voice('pulse', 'square', 0.1, 1, [
    'D3 . D3 . D3 . D3 . D3 . D3 . D3 . D3 .',
    'Bb2 . Bb2 . Bb2 . Bb2 . Bb2 . Bb2 . Bb2 . Bb2 .',
    'G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .',
    'A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 .'
  ]),
  voice('beep', 'square', 0.06, 1, [
    '. . . . . . . . . . . . . . . .',
    '. . . . . . . . . . . . A5 . A5 .',
    '. . . . . . . . . . . . . . . .',
    '. . . . . . . . . . . . A5 . A5 .'
  ])
];

// The control room on Earth: busier, with a "mission" feel. E minor, then D, C and D.
// A bouncing bass, a short heroic tune, and a ticking beat.
const CONTROL_VOICES = [
  voice('bass', 'triangle', 0.32, 1, [
    'E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .',
    'D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .',
    'C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .',
    'D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .'
  ]),
  voice('tune', 'square', 0.14, 2, [
    'E4 . . . B4 . . . A4 . G4 . F#4 . . .',
    'F#4 . . . A4 . . . G4 . F#4 . E4 . . .',
    'E4 . . . G4 . . . C5 . B4 . A4 . . .',
    'A4 . . . F#4 . . . D4 . F#4 . A4 . B4 .'
  ]),
  voice('beat', 'drum', 0.16, 1, [
    'k . x . k . x . k . x . k . x .',
    'k . x . k . x . k . x . k . x x',
    'k . x . k . x . k . x . k . x .',
    'k . x . k . x . k k x . k . x x'
  ])
];

// bpm: beats a minute (4 steps a beat). The Moon is a little slower than Mars.
export const TRACKS = {
  moonBase: { bpm: 66, voices: BASE_VOICES },
  marsBase: { bpm: 76, voices: BASE_VOICES },
  moonBaseTense: { bpm: 66, voices: [...BASE_VOICES, ...TENSE_VOICES] },
  marsBaseTense: { bpm: 76, voices: [...BASE_VOICES, ...TENSE_VOICES] },
  control: { bpm: 112, voices: CONTROL_VOICES }
};

// Seconds per step of a track
export const stepSeconds = (track) => 60 / track.bpm / 4;

// The notes that start at this step (it loops): [{ voice, note, seconds }]
//   note: a MIDI number, or a drum letter; seconds: how long it lasts
export function notesAt(track, step) {
  const at = ((step % STEPS) + STEPS) % STEPS;
  const notes = [];
  for (const v of track.voices) {
    const note = v.steps[at];
    if (note !== null) notes.push({ voice: v, note, seconds: v.hold * stepSeconds(track) });
  }
  return notes;
}

// ---------- Which track plays ----------

const DANGER = ['stormComing', 'shelterNow'];

// Which track goes with what is on screen, or null for silence.
//   player   'astronaut' | 'missionControl' | null: whose game screen shows (null: no game screen,
//            e.g. the end screen, the lobby or the briefing)
//   world    'moon' | 'mars'
//   status   the game's status: only 'playing' has music (the end screen plays its own jingle)
//   inbox    the Astronaut's messages from Mission Control: the newest one can make the base
//            music tenser ("Storm coming", "Shelter now"). Nothing else: no storm data.
export function trackFor({ player, world, status, inbox = [] } = {}) {
  if (status !== 'playing') return null;
  if (player === 'missionControl') return 'control';
  if (player !== 'astronaut') return null;
  const newest = Array.isArray(inbox) && inbox.length > 0 ? inbox[inbox.length - 1] : null;
  const tense = Boolean(newest && DANGER.includes(newest.warning));
  return `${world === 'mars' ? 'mars' : 'moon'}Base${tense ? 'Tense' : ''}`;
}

// ---------- Music on / off, remembered on this device ----------

const STORAGE_KEY = 'missionLink.musicOff';

export function readMusicOff(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Music plays only when both switches are on: Sound off means music off too.
export const musicAllowed = ({ soundOn, musicOn }) => Boolean(soundOn && musicOn);

let musicOff = typeof window === 'undefined' ? false : readMusicOff();
const listeners = new Set();

export function setMusicOn(on, storage = globalThis.localStorage) {
  musicOff = !on;
  try {
    storage?.setItem(STORAGE_KEY, musicOff ? '1' : '0');
  } catch {
    // Private window or blocked storage: the choice just is not remembered.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// true when the Music switch is on (the Sound switch may still silence it)
export function useMusicOn() {
  return useSyncExternalStore(subscribe, () => !musicOff, () => true);
}

// ---------- Playing ----------

let wanted = null; // the track the screen asks for
let playing = null; // { id, gain, timer, step, nextTime }
let noise = null; // a short buffer of hiss for the hi-hat
let watching = false;

const LOOKAHEAD_SECONDS = 0.25;
const TICK_MS = 60;

function noiseBuffer(ctx) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// One note: a soft start, then it fades away over its length (no clicks)
function playNote(ctx, out, { voice: v, note, seconds }, time) {
  const gain = ctx.createGain();
  gain.connect(out);
  if (v.wave === 'drum') {
    if (note === 'x') {
      const hiss = ctx.createBufferSource();
      hiss.buffer = noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      gain.gain.setValueAtTime(v.level * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      hiss.connect(filter).connect(gain);
      hiss.start(time);
      hiss.stop(time + 0.06);
    } else {
      const thump = ctx.createOscillator();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(140, time);
      thump.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      gain.gain.setValueAtTime(v.level, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
      thump.connect(gain);
      thump.start(time);
      thump.stop(time + 0.16);
    }
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = v.wave;
  osc.frequency.setValueAtTime(midiToHz(note), time);
  const end = time + Math.max(0.06, seconds);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(v.level, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  osc.start(time);
  osc.stop(end + 0.02);
}

function startTrack(ctx, id) {
  const track = TRACKS[id];
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + FADE_SECONDS);
  gain.connect(ctx.destination);
  const run = { id, gain, timer: 0, step: 0, nextTime: ctx.currentTime + 0.05 };
  // Notes are set a moment ahead on the audio clock, so a slow frame never makes them late
  const schedule = () => {
    try {
      while (run.nextTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
        for (const note of notesAt(track, run.step)) playNote(ctx, gain, note, run.nextTime);
        run.nextTime += stepSeconds(track);
        run.step = (run.step + 1) % STEPS;
      }
    } catch {
      clearInterval(run.timer); // music is a bonus: if it fails, the game carries on
    }
  };
  schedule();
  run.timer = setInterval(schedule, TICK_MS);
  return run;
}

// Fades a track out, then stops it (it keeps playing while it fades)
function stopTrack(ctx, run, seconds) {
  try {
    const now = ctx.currentTime;
    run.gain.gain.cancelScheduledValues(now);
    run.gain.gain.setValueAtTime(Math.max(0.0001, run.gain.gain.value), now);
    run.gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  } catch {
    // ignore: it is stopped below anyway
  }
  setTimeout(() => {
    clearInterval(run.timer);
    try {
      run.gain.disconnect();
    } catch {
      // already gone
    }
  }, seconds * 1000 + 100);
}

// Plays what should play now: the wanted track, unless sound or music is off, the tab is hidden,
// or no tap has made the AudioContext yet.
function apply() {
  const ctx = getAudio();
  const hidden = typeof document !== 'undefined' && document.hidden;
  const allowed = musicAllowed({ soundOn: isSoundOn(), musicOn: !musicOff });
  const id = ctx && allowed && !hidden && TRACKS[wanted] ? wanted : null;
  if ((playing?.id ?? null) === id) return;
  try {
    // A new screen crossfades; switching off, hiding the tab or the end of a game is quicker
    if (playing) stopTrack(ctx, playing, id ? FADE_SECONDS : wanted ? QUICK_FADE_SECONDS : FADE_SECONDS);
    playing = id ? startTrack(ctx, id) : null;
  } catch {
    playing = null;
  }
}

function watch() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  onSoundChange(apply);
  onAudioUnlock(apply);
  subscribe(apply);
  document.addEventListener('visibilitychange', apply);
}

// Asks for a track (an id from TRACKS), or null for silence
export function setMusic(id) {
  wanted = id ?? null;
  watch();
  apply();
}

// The game's music: call it once with the track for what is on screen (trackFor).
export function useBackgroundMusic(id) {
  useEffect(() => {
    listenForFirstTap();
    setMusic(id);
  }, [id]);
  useEffect(() => () => setMusic(null), []);
}
