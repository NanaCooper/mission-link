// "Read to me": reads screen text aloud with the browser's speechSynthesis. No library.
import { useCallback, useEffect, useState } from 'react';

// true if this browser can speak.
export function canReadAloud(win = typeof window === 'undefined' ? undefined : window) {
  return Boolean(win && win.speechSynthesis && typeof win.SpeechSynthesisUtterance === 'function');
}

// { supported, speaking, read(text), stop() }
export function useReadAloud() {
  const [supported] = useState(() => canReadAloud());
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const read = useCallback(
    (text) => {
      if (!supported || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // a little slower for young readers
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [supported]
  );

  // Stop talking when the screen goes away.
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, read, stop };
}
