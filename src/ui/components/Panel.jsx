// A simple card. Optional title shows as a heading at the top.
//
// Props: { title, children, className }
export default function Panel({ title, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title && <h2 className="panel__title">{title}</h2>}
      {children}
    </section>
  );
}
