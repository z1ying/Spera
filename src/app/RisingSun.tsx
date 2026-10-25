"use client";

import { useEffect, useRef } from "react";

/**
 * A soft yellow half-ring standing on a horizon line, behind the content. As
 * the page scrolls down, ring and line drift down with it — slower than the
 * content — so they keep the user company and come to rest at the bottom of
 * the page. Scroll-linked, updated once per frame; still under
 * prefers-reduced-motion.
 */
export default function RisingSun() {
  const box = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!box.current || !art.current) return;
      // How far the art may travel before it would pass the end of the page.
      const start = box.current.getBoundingClientRect().top + window.scrollY;
      const room = document.documentElement.scrollHeight - start - art.current.offsetHeight - 24;
      const y = Math.max(0, Math.min(window.scrollY * 0.7, room));
      art.current.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={box} className="relative h-10" aria-hidden>
      <div ref={art} className="pointer-events-none absolute bottom-0 right-0 -z-10 w-[36rem] max-w-full will-change-transform">
        <svg viewBox="0 0 400 210" className="ml-auto mr-[12%] block h-48 w-[22rem] max-w-[80%]">
          <path d="M33 210A167 167 0 0 1 367 210" fill="none" stroke="#f6d77e" strokeWidth="26" opacity="0.6" />
        </svg>
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
