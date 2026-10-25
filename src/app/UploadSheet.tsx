"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/orgSummary";
import { participantHours } from "@/lib/runs";
import { readSheet, type Facility, type SheetResult } from "@/lib/sheetImport";

/**
 * "Upload a spreadsheet" (design doc §28): drop the CSV you already keep —
 * TPW's Collective Impact Report layout works as is — check the preview,
 * import the good rows. Problem rows are listed, never guessed at.
 */
export default function UploadSheet() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ created: number; failed: { line: number; problems: string[] }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((o: { facilities: Facility[] }) => setFacilities(o.facilities))
      .catch(() => setFacilities([]));
  }, []);

  async function read(f: File | undefined) {
    if (!f) return;
    setDone(null);
    setError(null);
    if (!/\.csv$/i.test(f.name)) {
      setError("Please upload a CSV file. In Excel or Google Sheets: File → Download / Save as → CSV.");
      return;
    }
    setFile(f.name);
    setSheet(readSheet(await f.text(), facilities));
  }

  const good = sheet?.rows.filter((r) => r.problems.length === 0) ?? [];
  const bad = sheet?.rows.filter((r) => r.problems.length > 0) ?? [];

  async function importRows() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/runs/bulk", { method: "POST", body: JSON.stringify({ rows: good.map(({ line, input }) => ({ line, input })) }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Import failed.");
      setDone(out);
      setSheet(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          read(e.dataTransfer.files[0]);
        }}
        className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
          over ? "border-brand-700 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-300"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand-700" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="mt-3 text-lg font-medium">{file ?? "Drop your spreadsheet here"}</span>
        <span className="mt-1 text-sm text-slate-500">CSV, in TPW&apos;s Collective Impact Report columns</span>
        <span className="mt-4 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white">Choose file</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
      </label>
      <p className="text-sm text-slate-600">
        No spreadsheet yet?{" "}
        <a href="/api/runs/template" className="font-medium text-brand-800 underline">
          Download the template
        </a>
      </p>

      {error && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}

      {sheet && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {sheet.missingColumns.length > 0 && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Missing columns: {sheet.missingColumns.join(", ")}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <strong className="text-brand-900">{good.length}</strong> ready to import
              {bad.length > 0 && (
                <>
                  {" · "}
                  <strong className="text-amber-800">{bad.length}</strong> need a fix
                </>
              )}
            </p>
            <button
              type="button"
              onClick={importRows}
              disabled={busy || good.length === 0}
              className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-40"
            >
              {busy ? "Importing…" : `Import ${good.length} program${good.length === 1 ? "" : "s"}`}
            </button>
          </div>
          <div className="mt-4 max-h-80 overflow-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1 pr-2">Line</th>
                  <th className="py-1 pr-2">Program</th>
                  <th className="py-1 pr-2">Prison</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2 text-right">Hours</th>
                  <th className="py-1 pr-2 text-right">Took part</th>
                  <th className="py-1 pr-2 text-right">Completed</th>
                  <th className="py-1 pr-2 text-right">Participant hours</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((r) => {
                  const ph = participantHours({ completed: r.input.completed ?? null, totalHours: r.input.totalHours ?? null });
                  return (
                    <tr key={r.line} className={`border-t border-slate-100 ${r.problems.length ? "bg-amber-50" : ""}`}>
                      <td className="py-1.5 pr-2 tabular-nums text-slate-500">{r.line}</td>
                      <td className="py-1.5 pr-2">
                        {r.input.programName || "—"}
                        {r.problems.length > 0 && <span className="block text-xs text-amber-900">{r.problems.join(" ")}</span>}
                      </td>
                      <td className="py-1.5 pr-2">{r.input.facilityCode || "—"}</td>
                      <td className="py-1.5 pr-2">{r.input.status || "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.input.totalHours ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.input.participants ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.input.completed ?? "—"}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{ph === null ? "—" : fmt(ph)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {done && (
        <div role="status" className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <p className="text-lg font-semibold text-brand-900">✓ {done.created} program{done.created === 1 ? "" : "s"} imported.</p>
          {done.failed.length > 0 && (
            <p className="mt-1 text-sm text-amber-900">
              {done.failed.length} rows were not saved: {done.failed.map((f) => `line ${f.line}`).join(", ")}.
            </p>
          )}
          <Link href="/report" className="mt-3 inline-block font-medium text-brand-800 underline">
            See your one-page report →
          </Link>
        </div>
      )}
    </div>
  );
}
