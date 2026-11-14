// Filled and empty stars, plus a text label like "2 of 3 stars".
//
// Props: { count, max = 3 }
export default function Stars({ count, max = 3 }) {
  const filled = Math.max(0, Math.min(max, Math.round(Number(count) || 0)));
  const empty = max - filled;

  return (
    <p className="stars">
      <span className="stars__icons" aria-hidden="true">
        <span className="stars__on">{'★'.repeat(filled)}</span>
        <span className="stars__off">{'☆'.repeat(empty)}</span>
      </span>
      <span className="stars__label">
        {filled} of {max} stars
      </span>
    </p>
  );
}
