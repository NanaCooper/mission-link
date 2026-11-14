import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatClock, clockFace, clockSentence, CLOCK_HURRY, CLOCK_URGENT } from './clock.js';
import MissionClock from './MissionClock.jsx';
import { soundFor } from './sound.js';
import { astronautReadText, missionControlReadText } from './labels.js';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsBlackoutMissionControlView,
  fakeWonAstronautView
} from '../fakeState.js';

const running = (view, seconds) => ({ ...view, clockRunning: true, signalSecondsLeft: seconds, warningThisTurn: null });

describe('formatClock', () => {
  it('shows minutes and seconds', () => {
    expect(formatClock(60)).toBe('1:00');
    expect(formatClock(42)).toBe('0:42');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(0)).toBe('0:00');
  });

  it('never shows a negative or broken time', () => {
    expect(formatClock(-4)).toBe('0:00');
    expect(formatClock(undefined)).toBe('0:00');
    expect(formatClock(4.2)).toBe('0:05');
  });
});

describe('clockFace: what the clock shows', () => {
  it('counts down calmly with plenty of time', () => {
    expect(clockFace(running(fakeMissionControlView, 45), 'missionControl')).toEqual({
      mode: 'running',
      time: '0:45',
      title: 'Time to send a signal',
      note: null
    });
  });

  it('says "Hurry!" in yellow, then in red, never with colour alone', () => {
    const hurry = clockFace(running(fakeMissionControlView, CLOCK_HURRY), 'missionControl');
    expect(hurry.mode).toBe('hurry');
    expect(hurry.note).toBe('Hurry!');
    const urgent = clockFace(running(fakeMissionControlView, CLOCK_URGENT), 'missionControl');
    expect(urgent.mode).toBe('urgent');
    expect(urgent.note).toBe('Hurry!');
  });

  it('tells Mission Control when the signal is sent or blocked', () => {
    expect(clockFace(fakeMissionControlView, 'missionControl')).toMatchObject({ mode: 'sent', note: 'Signal sent' });
    expect(clockFace(fakeMarsBlackoutMissionControlView, 'missionControl').mode).toBe('blocked');
  });

  it('keeps the Astronaut\'s words neutral when the clock stops (it cannot see a blackout)', () => {
    expect(clockFace(fakeAstronautView, 'astronaut')).toMatchObject({ mode: 'stopped', note: 'Clock stopped' });
    expect(clockFace(running(fakeAstronautView, 30), 'astronaut').title).toBe("Time for Mission Control's signal");
  });

  it('shows no clock when no game is being played, or on an older view without one', () => {
    expect(clockFace(fakeWonAstronautView, 'astronaut')).toBeNull();
    const { signalSecondsLeft: _, ...old } = fakeAstronautView;
    expect(clockFace(old, 'astronaut')).toBeNull();
  });
});

describe('MissionClock', () => {
  const render = (view, who) => renderToStaticMarkup(<MissionClock view={view} who={who} />);

  it('shows the time and the words, as a timer for screen readers', () => {
    const html = render(running(fakeMissionControlView, 42), 'missionControl');
    expect(html).toContain('role="timer"');
    expect(html).toContain('0:42');
    expect(html).toContain('Time to send a signal');
    expect(html).toContain('mission-clock--running');
  });

  it('uses a different look for each state', () => {
    expect(render(running(fakeMissionControlView, 15), 'missionControl')).toContain('mission-clock--hurry');
    expect(render(running(fakeMissionControlView, 5), 'missionControl')).toContain('mission-clock--urgent');
    expect(render(fakeMissionControlView, 'missionControl')).toContain('Signal sent');
    expect(render(fakeMarsBlackoutMissionControlView, 'missionControl')).toContain('Signal blocked');
  });

  it('shows nothing after the game', () => {
    expect(render(fakeWonAstronautView, 'astronaut')).toBe('');
  });
});

describe('the clock in sounds and Read to me', () => {
  it('ticks each second near the end, but not before', () => {
    const at = (s) => running(fakeAstronautView, s);
    expect(soundFor(at(CLOCK_URGENT + 1), at(CLOCK_URGENT))).toEqual(['tick']);
    expect(soundFor(at(CLOCK_URGENT + 2), at(CLOCK_URGENT + 1))).toEqual([]);
  });

  it('buzzes (not the usual lose sound) when time runs out', () => {
    const before = running(fakeAstronautView, 1);
    const after = { ...before, signalSecondsLeft: 0, clockRunning: false, status: 'lost', lostReason: 'time' };
    expect(soundFor(before, after)).toEqual(['timeUp']);
  });

  it('reads the time left aloud', () => {
    expect(clockSentence(running(fakeMissionControlView, 30), 'missionControl')).toBe('You have 30 seconds to send a signal.');
    expect(missionControlReadText(running(fakeMissionControlView, 30))).toContain('You have 30 seconds to send a signal.');
    expect(astronautReadText(running(fakeAstronautView, 30))).toContain('Mission Control has 30 seconds to send a signal.');
    expect(missionControlReadText(fakeMissionControlView)).toContain('The signal is sent.');
  });
});
