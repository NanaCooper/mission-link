// The "Why?" card: one real fact and where it comes from.
// Renders nothing when there is no fact yet (before the first move).
//
// Props: { fact }  where fact is { text, source: { name, url } } or null
export default function WhyCard({ fact }) {
  if (!fact || !fact.text) return null;
  const source = fact.source || {};

  return (
    <aside className="why-card" aria-label="Why?">
      <h3 className="why-card__title">
        <span aria-hidden="true">💡</span> Why?
      </h3>
      <p className="why-card__text">{fact.text}</p>
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
    </aside>
  );
}
