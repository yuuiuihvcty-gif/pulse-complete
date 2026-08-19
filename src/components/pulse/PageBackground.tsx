/**
 * Shared atmospheric field. The `src` prop remains accepted for route compatibility,
 * but imagery is intentionally not rendered in the premium Pulse redesign.
 */
export function PageBackground({
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden pulse-field ${className}`}
    >
      <div className="pulse-grid absolute inset-0 opacity-40" />
      <span className="pulse-field-line left-[-8%] top-[22%]" />
      <span className="pulse-field-line right-[-12%] top-[52%] rotate-[18deg] opacity-25" />
      <span className="absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-lime/10 blur-3xl" />
      <span className="absolute -right-24 bottom-[-6rem] h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
    </div>
  );
}
