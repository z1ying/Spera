"use client";

import { useEffect, useRef } from "react";

/**
 * A long, low yellow sun-dome on the horizon line under the privacy note. It
 * drifts with the page as you scroll (a parallax: slower than the content),
 * so it moves along instead of sitting still. Updated once per frame; stays
 * put under prefers-reduced-motion.
 */
export default function RisingSun() {
  const sun = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY * 0.35, 420);
      if (sun.current) sun.current.style.transform = `translate3d(0, ${y}px, 0)`;
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
    <div className="relative h-12" aria-hidden>
      <svg
        ref={sun}
        viewBox="0 0 640 110"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-1 left-[30%] -z-10 h-16 w-[40rem] max-w-[70%] will-change-transform"
      >
        <path d="M0 110C120 8 520 8 640 110Z" fill="#f6d77e" opacity="0.5" />
      </svg>
      <div className="absolute bottom-0 right-0 h-1.5 w-3/4 rounded-full bg-slate-200" />
    </div>
  );
}
