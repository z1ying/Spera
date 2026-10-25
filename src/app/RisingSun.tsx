"use client";

import { useEffect, useRef } from "react";

/**
 * The sun behind the privacy note rises and drifts as the page scrolls, set
 * against a horizon line. Scroll-linked (not timed), updated once per frame;
 * stays still under prefers-reduced-motion.
 */
export default function RisingSun() {
  const sun = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, window.scrollY / 500); // 0 at the top → 1 after 500px
      if (sun.current) sun.current.style.transform = `translate(${p * 60}px, ${(1 - p) * 34}px)`;
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
    <div className="relative h-14 overflow-hidden" aria-hidden>
      <svg
        ref={sun}
        viewBox="0 0 520 260"
        className="absolute left-[34%] top-2 h-24 w-[26rem] will-change-transform"
        style={{ transform: "translate(0px, 34px)" }}
      >
        <circle cx="260" cy="260" r="240" fill="#f6d77e" opacity="0.5" />
      </svg>
      <div className="absolute bottom-0 right-0 h-1.5 w-3/4 rounded-full bg-slate-200" />
    </div>
  );
}
