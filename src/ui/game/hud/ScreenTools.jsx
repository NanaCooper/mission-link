import { useSoundOn, setSoundOn, unlockAudio } from '../sound.js';
import { useMusicOn, setMusicOn } from '../music.js';
import { useReadAloud } from '../useReadAloud.js';
import {
  SOUND_ON_LABEL, SOUND_OFF_LABEL, MUSIC_ON_LABEL, MUSIC_OFF_LABEL, MUSIC_NEEDS_SOUND, READ_ALOUD_LABEL, READ_ALOUD_STOP_LABEL
} from '../labels.js';

// "Sound on / off", "Music on / off" and "Read to me", in the Options tab of both players' menus.
// Sound off silences the music too: the Music switch then shows "Music off" and waits.
// Read to me is hidden when the browser cannot speak.
export default function ScreenTools({ readText }) {
  const soundOn = useSoundOn();
  const musicOn = useMusicOn();
  const voice = useReadAloud();
  const hearMusic = soundOn && musicOn;

  const toggleSound = () => {
    unlockAudio();
    setSoundOn(!soundOn);
  };
  const toggleMusic = () => {
    unlockAudio();
    setMusicOn(!musicOn);
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
      <button
        type="button"
        className={`screen-tools__button${hearMusic ? '' : ' is-off'}`}
        onClick={toggleMusic}
        disabled={!soundOn}
        title={soundOn ? undefined : MUSIC_NEEDS_SOUND}
      >
        <span aria-hidden="true">{hearMusic ? '🎵' : '🔕'}</span>
        <span>{hearMusic ? MUSIC_ON_LABEL : MUSIC_OFF_LABEL}</span>
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
