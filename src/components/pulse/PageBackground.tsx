/** Full-bleed page background image, rendered untouched behind the UI. */
export function PageBackground({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
