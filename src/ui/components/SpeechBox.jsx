import { useState } from 'react';
import Portrait from './Portrait.jsx';

// A character says something, like in an old adventure game: a face, a name
// tag, and words that "type" themselves. Tap the box to show all the words at once.
//
// Props:
//   who       'nova' | 'sola' | 'blip'  (whose face and colour)
//   mood      which face to show (see Portrait)
//   name      the name on the tag, e.g. "Commander Sola"
//   title     optional words next to the name, e.g. "Mission Control says:"
//   text      what they say (typed out)
//   icon      optional: a small picture before the words, e.g. <PixelIcon name="shelter" />
//   tag       optional small flashing tag, e.g. "NEW"
//   tone      optional: 'alert' (stands out) | 'quiet' (calm border)
//   big       optional: bigger words, for a short important message
//   size      optional: face size in screen pixels (default 56)
//   children  optional: extra lines under the words (not typed)
export default function SpeechBox({
  who,
  mood,
  name,
  title,
  text,
  icon,
  tag,
  tone,
  big = false,
  size = 56,
  className = '',
  children
}) {
  // Remember which text the player tapped, so a new text types again.
  const [tappedText, setTappedText] = useState(null);
  const done = tappedText === text;

  const classes = ['speech', `speech--${who}`];
  if (tone) classes.push(`speech--${tone}`);
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')} onPointerDown={() => setTappedText(text)}>
      <Portrait who={who} mood={mood} size={size} />
      <div className="speech__body">
        <p className="speech__head">
          {name && <span className="speech__name">{name}</span>}
          {title && <span className="speech__title">{title}</span>}
          {tag && <span className="speech__tag">{tag}</span>}
        </p>
        {text && (
          <p className={`speech__text${big ? ' speech__text--big' : ''}`}>
            {icon && <span className="speech__icon">{icon}</span>}
            {/* Screen readers get the whole sentence at once. */}
            <span className="visually-hidden">{text}</span>
            <TypedText key={text} text={text} done={done} />
          </p>
        )}
        {children && <div className="speech__extra">{children}</div>}
      </div>
    </div>
  );
}

// Each letter is its own piece and shows up a moment after the one before it.
// The timing is plain CSS (see .typed__char in index.css), so there are no timers here.
function TypedText({ text, done }) {
  return (
    <span className={`typed${done ? ' is-done' : ''}`} aria-hidden="true">
      {[...text].map((letter, index) =>
        letter === ' ' ? (
          ' '
        ) : (
          // The key is the position: the text never changes inside one TypedText.
          <span key={index} className="typed__char" style={{ '--i': index }}>
            {letter}
          </span>
        )
      )}
    </span>
  );
}
