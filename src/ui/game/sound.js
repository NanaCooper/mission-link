// Short beeps made with the Web Audio API. No audio files.
// soundFor() decides WHICH sounds to play (pure, tested). The rest just plays them.
// Sounds only react to what the view shows. They never change the game.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CLOCK_URGENT } from './clock.js';

// Radiation going up by at least this much in one turn plays the "hit" sound.
export const HIT_SOUND_MIN = 10;

// Each sound is a list of tones: f = start pitch (Hz), to = end pitch, d = length (s),
// at = start time (s), type = oscillator wave.
export const SOUNDS = {
  warning: [
    { f: 880, d: 0.12, at: 0, type: 'square' },
    { f: 660, d: 0.12, at: 0.16, type: 'square' },
    { f: 880, d: 0.12, at: 0.32, type: 'square' }
  ],
  move: [{ f: 520, d: 0.08, at: 0, type: 'triangle' }],
  shield: [{ f: 300, to: 900, d: 0.3, at: 0, type: 'triangle' }],
  hit: [{ f: 160, to: 70, d: 0.35, at: 0, type: 'sawtooth' }],
  win: [
    { f: 523, d: 0.12, at: 0, type: 'square' },
    { f: 659, d: 0.12, at: 0.14, type: 'square' },
    { f: 784, d: 0.12, at: 0.28, type: 'square' },
    { f: 1047, d: 0.3, at: 0.42, type: 'square' }
  ],
  lose: [
    { f: 392, d: 0.22, at: 0, type: 'triangle' },
    { f: 330, d: 0.22, at: 0.26, type: 'triangle' },
    { f: 247, d: 0.45, at: 0.52, type: 'triangle' }
  ],
  // The signal clock: a short tick each second near the end, and a buzz when time runs out
  tick: [{ f: 1200, d: 0.04, at: 0, type: 'square' }],
  timeUp: [
    { f: 220, d: 0.25, at: 0, type: 'sawtooth' },
    { f: 220, d: 0.25, at: 0.32, type: 'sawtooth' },
    { f: 165, d: 0.5, at: 0.64, type: 'sawtooth' }
  ]
};

const lastOf = (list) => (Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null);

// Which sounds to play when the view changes from `previous` to `view`, in order.
// Works with both the Astronaut view and the Mission Control view.
export function soundFor(previous, view) {
  if (!previous || !view) return [];
  if (view.turn < previous.turn) return []; // a new game started: stay quiet

  const sounds = [];

  if (view.turn > previous.turn) {
    sounds.push(view.lastMove === 'raiseShield' ? 'shield' : 'move');
    const before = previous.meters?.radiationDose;
    const after = view.meters?.radiationDose;
    if (typeof before === 'number' && typeof after === 'number' && after - before >= HIT_SOUND_MIN) {
      sounds.push('hit');
    }
  }

  // Astronaut only: a warning arrived for this turn that was not there before.
  if (Array.isArray(view.inbox)) {
    const was = lastOf(previous.inbox);
    const now = lastOf(view.inbox);
    const isNew = now && (!was || was.turn !== now.turn || was.warning !== now.warning);
    if (isNew && now.turn === view.turn) sounds.push('warning');
  }

  // The signal clock, near the end: one tick each second it goes down.
  const was = previous.signalSecondsLeft;
  const left = view.signalSecondsLeft;
  if (
    view.status === 'playing' &&
    view.clockRunning &&
    view.turn === previous.turn &&
    typeof was === 'number' &&
    typeof left === 'number' &&
    left < was &&
    left > 0 &&
    left <= CLOCK_URGENT
  ) {
    sounds.push('tick');
  }

  if (previous.status === 'playing' && view.status === 'lost' && view.lostReason === 'time') {
    sounds.push('timeUp');
    return sounds;
  }
  if (previous.status === 'playing' && view.status === 'won') sounds.push('win');
  if (previous.status === 'playing' && view.status === 'lost') sounds.push('lose');

  return sounds;
}

// ---------- Sound on / off, remembered on this device ----------

const STORAGE_KEY = 'missionLink.soundOff';

function readSoundOff() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let soundOff = typeof window === 'undefined' ? false : readSoundOff();
const listeners = new Set();

export function setSoundOn(on) {
  soundOff = !on;
  try {
    window.localStorage.setItem(STORAGE_KEY, soundOff ? '1' : '0');
  } catch {
    // Private window or blocked storage: the choice just is not remembered.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// true when sound is on. Both player screens share it, so split-screen stays in sync.
export function useSoundOn() {
  return useSyncExternalStore(subscribe, () => !soundOff, () => true);
}

// ---------- Playing ----------

let audio = null;

// Browsers only allow sound after a tap, so the AudioContext is made on the first tap.
export function unlockAudio() {
  try {
    if (!audio) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audio = new AudioContextClass();
    }
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

let listeningForTap = false;
function listenForFirstTap() {
  if (listeningForTap || typeof window === 'undefined') return;
  listeningForTap = true;
  const onTap = () => {
    unlockAudio();
    if (audio) {
      window.removeEventListener('pointerdown', onTap);
      window.removeEventListener('keydown', onTap);
    }
  };
  window.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', onTap);
}

// In split-screen both screens ask for the same sound at once: play it only once.
const lastPlayed = {};
const SAME_SOUND_GAP_MS = 250;

export function playSound(name) {
  const tones = SOUNDS[name];
  if (!tones || soundOff || !audio) return;
  const now = Date.now();
  if (lastPlayed[name] && now - lastPlayed[name] < SAME_SOUND_GAP_MS) return;
  lastPlayed[name] = now;

  try {
    const start = audio.currentTime;
    for (const tone of tones) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t0 = start + tone.at;
      const t1 = t0 + tone.d;
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.f, t0);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t1);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  } catch {
    // Sound is a bonus. If it fails, the game carries on.
  }
}

const SOUND_GAP_MS = 380;

// Plays the right sounds each time the view changes.
export function useGameSounds(view) {
  const previous = useRef(null);

  useEffect(() => {
    listenForFirstTap();
  }, []);

  useEffect(() => {
    const sounds = soundFor(previous.current, view);
    previous.current = view;
    const timers = sounds.map((name, i) => setTimeout(() => playSound(name), i * SOUND_GAP_MS));
    return () => timers.forEach(clearTimeout);
  }, [view]);
}
