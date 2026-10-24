"use client";

import { useState } from "react";

/**
 * Type-to-search picker for long lists (120 organizations, 31 prisons): shows
 * the chosen item with "Change", otherwise a search box with up to 8 matches.
 * With `onAdd`, a name that isn't in the list can be added as new.
 */
export default function SearchPick<T>({
  items,
  label,
  toText,
  selected,
  onPick,
  onClear,
  onAdd,
  placeholder,
  badge,
  addLabel = "new",
}: {
  items: T[];
  label: (item: T) => string;
  toText: (item: T) => string;
  selected: T | null;
  onPick: (item: T) => void;
  onClear: () => void;
  onAdd?: (name: string) => void;
  placeholder: string;
  badge?: (item: T) => React.ReactNode;
  /** Words after "Add …" e.g. "a new organization". */
  addLabel?: string;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = items.filter((i) => !query || toText(i).toLowerCase().includes(query)).slice(0, 8);
  const exact = items.some((i) => label(i).toLowerCase() === query);

  if (selected)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-emerald-800 px-4 py-2 text-sm text-white">{label(selected)}</span>
        {badge?.(selected)}
        <button type="button" className="text-sm text-slate-600 underline" onClick={() => { setQ(""); onClear(); }}>
          Change
        </button>
      </div>
    );
  return (
    <div className="max-w-md">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches.length === 1) onPick(matches[0]);
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <ul className="mt-1 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {matches.map((i) => (
          <li key={label(i)}>
            <button type="button" onClick={() => { setQ(""); onPick(i); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50">
              <span>{label(i)}</span>
              {badge?.(i)}
            </button>
          </li>
        ))}
        {matches.length === 0 && !onAdd && <li className="px-3 py-2 text-sm text-slate-500">No match — try another spelling.</li>}
        {onAdd && query && !exact && (
          <li>
            <button type="button" onClick={() => { onAdd(q.trim()); setQ(""); }} className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-50">
              + Add &ldquo;{q.trim()}&rdquo; as {addLabel}
            </button>
          </li>
        )}
      </ul>
      {!query && items.length > 8 && <p className="mt-1 text-xs text-slate-500">Showing 8 of {items.length} — type to narrow.</p>}
    </div>
  );
}

