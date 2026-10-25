"use client";

import { useState } from "react";

export interface OrgMatch {
  found: boolean;
  name: string;
  programs: string[];
}

export async function lookupOrg(name: string): Promise<OrgMatch> {
  const res = await fetch(`/api/org-lookup?name=${encodeURIComponent(name)}`);
  return res.ok ? res.json() : { found: false, name: name.trim(), programs: [] };
}

/**
 * Your organization, typed in full. No list or suggestions of other
 * organizations is ever shown; a name we don't know yet is treated as new
 * (forms) or as "nothing reported yet" (reports).
 */
export default function OrgEntry({
  value,
  onSet,
  onClear,
  unknownHint,
}: {
  value: string;
  onSet: (m: OrgMatch) => void;
  onClear: () => void;
  /** Shown under the chip when the typed name isn't on file yet. */
  unknownHint?: string | null;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      onSet(await lookupOrg(text));
      setText("");
    } finally {
      setBusy(false);
    }
  }

  if (value)
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-800 px-4 py-2 text-sm text-white">{value}</span>
          <button type="button" className="text-sm text-slate-600 underline" onClick={onClear}>
            Not your organization? Change
          </button>
        </div>
        {unknownHint && <p className="mt-2 text-sm text-slate-600">{unknownHint}</p>}
      </div>
    );
  return (
    <div className="flex max-w-md gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
        }}
        placeholder="Your organization's full name"
        aria-label="Your organization's full name"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
      />
      <button
        type="button"
        onClick={go}
        disabled={busy || !text.trim()}
        className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
