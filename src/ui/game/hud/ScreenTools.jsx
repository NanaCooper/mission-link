import { useSoundOn, setSoundOn, unlockAudio } from '../sound.js';
import { useReadAloud } from '../useReadAloud.js';
import { SOUND_ON_LABEL, SOUND_OFF_LABEL, READ_ALOUD_LABEL, READ_ALOUD_STOP_LABEL } from '../labels.js';

// "Sound on / off" and "Read to me", in the Options tab of both players' menus.
// Read to me is hidden when the browser cannot speak.
export default function ScreenTools({ readText }) {
  const soundOn = useSoundOn();
  const voice = useReadAloud();

  const toggleSound = () => {
    unlockAudio();
    setSoundOn(!soundOn);
  };

  return (
    <div className="screen-tools" role="group" aria-label="Sound and reading">
      <button
        type="button"
        className={`screen-tools__button${soundOn ? '' : ' is-off'}`}
        onClick={toggleSound}
      >
        <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
        <span>{soundOn ? SOUND_ON_LABEL : SOUND_OFF_LABEL}</span>
      </button>
      {voice.supported && (
        <button
          type="button"
          className="screen-tools__button"
          onClick={() => (voice.speaking ? voice.stop() : voice.read(readText))}
        >
          <span aria-hidden="true">{voice.speaking ? '⏹️' : '🗣️'}</span>
          <span>{voice.speaking ? READ_ALOUD_STOP_LABEL : READ_ALOUD_LABEL}</span>
        </button>
      )}
    </div>
  );
}
