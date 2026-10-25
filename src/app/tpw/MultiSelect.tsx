"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A filter dropdown that takes several values. Nothing ticked = "All".
 * Long lists get a search box.
 */
export default function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const summary =
    value.length === 0 ? "All" : value.length === 1 ? (options.find((o) => o.value === value[0])?.label ?? value[0]) : `${value.length} selected`;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={box} className="relative">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <button
        type="button"
        aria-label={`${label}: ${summary}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`mt-2 flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left text-lg shadow-sm ${
          value.length ? "border-brand-800 text-brand-900" : "border-slate-300 text-slate-900"
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full min-w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.length > 8 && (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label={`Search ${label}`}
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <ul role="listbox" aria-multiselectable className="max-h-72 overflow-y-auto">
            {shown.map((o) => (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">
                  <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 accent-brand-800" />
                  {o.label}
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No match</li>}
          </ul>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
              Clear — show all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
