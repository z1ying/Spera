"use client";

import { useEffect, useRef } from "react";

/**
 * A soft yellow half-ring standing on a horizon line, behind the content. It
 * rises as the page scrolls down and sinks back as it scrolls up — linked to
 * scroll position, updated once per frame, still under prefers-reduced-motion.
 */
export default function RisingSun() {
  const ring = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let frame = 0;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      frame = 0;
      const p = reduced ? 1 : Math.min(1, window.scrollY / 450); // 0 at the top → 1 after 450px
      if (ring.current) ring.current.style.transform = `translateY(${(1 - p) * 70}%)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative h-10" aria-hidden>
      {/* clipped at the horizon, so the ring sinks below it rather than over the content underneath */}
      <div className="pointer-events-none absolute bottom-0 left-[38%] -z-10 h-56 w-[28rem] overflow-hidden">
        <svg ref={ring} viewBox="0 0 400 200" className="absolute bottom-0 h-full w-full will-change-transform" style={{ transform: "translateY(70%)" }}>
          <path d="M28 200A172 172 0 0 1 372 200" fill="none" stroke="#f6d77e" strokeWidth="26" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 h-1.5 w-3/4 rounded-full bg-slate-200" />
    </div>
  );
}
