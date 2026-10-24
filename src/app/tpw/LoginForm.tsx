"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-16 max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/tpw/login", { method: "POST", body: JSON.stringify({ passcode }) });
        setBusy(false);
        if (res.ok) router.refresh();
        else setError((await res.json()).error ?? "Sign-in failed.");
      }}
    >
      <h1 className="text-xl font-semibold">TPW staff sign in</h1>
      <p className="mt-1 text-sm text-slate-600">The dashboard shows every organization&apos;s numbers, so it is for TPW staff only.</p>
      <label className="mt-5 block text-sm">
        <span className="font-medium">Passcode</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
      <button disabled={busy || !passcode} className="mt-5 w-full rounded-lg bg-emerald-800 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-40">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
