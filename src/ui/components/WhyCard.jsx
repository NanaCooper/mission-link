import SpeechBox from './SpeechBox.jsx';

// The "Why?" card: BLIP the robot shares one real fact and where it comes from.
// Renders nothing when there is no fact yet (before the first move).
//
// Props:
//   fact   { text, source: { name, url } } or null
//   name   optional: the robot's name on the tag (default "BLIP")
export default function WhyCard({ fact, name = 'BLIP' }) {
  if (!fact || !fact.text) return null;
  const source = fact.source || {};

  return (
    <aside className="why-card" aria-label="Why?">
      <SpeechBox who="blip" name={name} title="Why?" text={fact.text} size={48}>
        {source.name && (
          <p className="why-card__source">
            Source:{' '}
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name}
              </a>
            ) : (
              source.name
            )}
          </p>
        )}
      </SpeechBox>
    </aside>
  );
}
