// How the signal clock looks, from a view (getAstronautView or getMissionControlView).
// Pure, so every state is easy to test. It only shows the clock: the engine runs it.

// Under these many seconds the clock warns: yellow "Hurry!", then red, blinking "Hurry!".
export const CLOCK_HURRY = 20;
export const CLOCK_URGENT = 10;

// 42 -> "0:42", 75 -> "1:15"
export function formatClock(seconds) {
  const whole = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

// What the clock shows:
//   { mode, time, title, note }
//   mode: 'running' | 'hurry' | 'urgent' | 'sent' | 'blocked' | 'stopped'
//   time: "0:42"; title: the words next to it; note: an extra word or null ("Hurry!", "Signal sent")
// Returns null when there is no game being played (no clock to show).
//   who: 'missionControl' | 'astronaut' — the words differ a little.
export function clockFace(view, who) {
  if (!view || view.status !== 'playing' || typeof view.signalSecondsLeft !== 'number') return null;
  const seconds = view.signalSecondsLeft;
  const time = formatClock(seconds);
  const title = who === 'missionControl' ? 'Time to send a signal' : "Time for Mission Control's signal";

  if (!view.clockRunning) {
    if (who === 'missionControl') {
      if (view.stage?.blackout) return { mode: 'blocked', time, title, note: 'Signal blocked: the clock waits' };
      if (view.warningThisTurn) return { mode: 'sent', time, title, note: 'Signal sent' };
    }
    // The Astronaut cannot tell a sent signal from a blackout, so the words stay neutral.
    return { mode: 'stopped', time, title, note: 'Clock stopped' };
  }
  if (seconds <= CLOCK_URGENT) return { mode: 'urgent', time, title, note: 'Hurry!' };
  if (seconds <= CLOCK_HURRY) return { mode: 'hurry', time, title, note: 'Hurry!' };
  return { mode: 'running', time, title, note: null };
}

// For "Read to me": one sentence about the clock, or '' when there is none.
export function clockSentence(view, who) {
  const face = clockFace(view, who);
  if (!face) return '';
  if (face.mode === 'sent') return 'The signal is sent. The clock has stopped.';
  if (face.mode === 'blocked') return 'The signal is blocked this turn, so the clock waits.';
  if (face.mode === 'stopped') return 'The clock has stopped for this turn.';
  const seconds = Math.ceil(view.signalSecondsLeft);
  return who === 'missionControl'
    ? `You have ${seconds} seconds to send a signal.`
    : `Mission Control has ${seconds} seconds to send a signal.`;
}
