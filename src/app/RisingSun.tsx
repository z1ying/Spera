/**
 * A soft yellow half-ring on a horizon line, fixed to the bottom of the
 * screen behind the content, so it stays in view while the page scrolls.
 */
export default function RisingSun() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 print:hidden" aria-hidden>
      <div className="relative mx-auto h-44 max-w-6xl">
        <svg viewBox="0 0 400 200" className="absolute bottom-1 right-10 h-full w-[22rem]">
          <path d="M28 200A172 172 0 0 1 372 200" fill="none" stroke="#f6d77e" strokeWidth="26" opacity="0.55" />
        </svg>
        <div className="absolute bottom-0 right-0 h-1.5 w-[34rem] max-w-full rounded-full bg-slate-200/80" />
      </div>
    </div>
  );
}
