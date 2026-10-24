"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AUTO_ACCEPT, TARGET_FIELDS, fieldsFor, missingRequired, ruleMapping, type ColumnSuggestion, type ImportKind, type MappingSource } from "@/lib/mapping";
import { hashColumn, looksHashed } from "@/lib/browserHash";
import { parseCsvTable, toCsv } from "@/lib/csv";
import { DEMO_NETWORK_KEY } from "@/lib/normalize";
import { ISSUE_LABELS, REJECTING, type IssueCode, type Receipt } from "@/lib/clean";

interface SuggestResponse {
  headers: string[];
  sample: string[][];
  rowCount: number;
  suggestions: ColumnSuggestion[];
  source: MappingSource;
  kind: ImportKind;
  note?: string;
  template?: { fileName: string; createdAt: string };
  orgs: { id: string; name: string }[];
  programs: { id: string; name: string; orgId: string }[];
}

interface CommitResponse {
  jobId: string;
  fileName: string;
  receipt: Receipt;
  gradeChanges: { orgId: string; name: string; before: string; after: string }[];
  orgNames: Record<string, string>;
}

interface Sample {
  name: string;
  label: string;
  kind: ImportKind;
}

const SOURCE_TEXT: Record<MappingSource, string> = {
  template: "Mapping remembered",
  cache: "Suggested by Gemini (recorded)",
  gemini: "Suggested by Gemini",
  rules: "Suggested by header matching",
};

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const num = (x: number) => x.toLocaleString("en-US");

export default function ImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [orgId, setOrgId] = useState<string>("");
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  /** A file whose identifier column holds raw IDs, waiting to be hashed locally. */
  const [raw, setRaw] = useState<{ name: string; headers: string[]; rows: string[][]; keyIndex: number } | null>(null);

  useEffect(() => {
    fetch("/api/import/samples")
      .then((r) => r.json())
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  /**
   * Before anything is sent: if the identifier column holds raw IDs (not
   * hashed keys), stop and hash them in this browser first (backlog 1b).
   */
  function receive(name: string, text: string) {
    setError(null);
    const { headers, rows } = parseCsvTable(text);
    const keyIndex = ruleMapping(headers).findIndex((s) => s.target === "participant_key");
    if (keyIndex >= 0 && !looksHashed(rows.slice(0, 50).map((r) => r[keyIndex]))) {
      setRaw({ name, headers, rows, keyIndex });
      return;
    }
    load(name, text);
  }

  async function protectAndLoad(networkKey: string) {
    if (!raw) return;
    setBusy("Hashing identifiers in your browser…");
    try {
      const hashed = await hashColumn(raw.rows, raw.keyIndex, networkKey);
      const r = raw;
      setRaw(null);
      await load(r.name, toCsv(r.headers, hashed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hashing failed.");
      setBusy(null);
    }
  }

  async function load(name: string, text: string) {
    setError(null);
    setBusy("Reading the file and proposing a mapping…");
    try {
      const res = await fetch("/api/import/suggest", { method: "POST", body: JSON.stringify({ fileName: name, text }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not read the file.");
      setFile({ name, text });
      setSuggest(body);
      setMapping(Object.fromEntries((body as SuggestResponse).suggestions.map((s) => [s.column, s.target])));
      setOrgId("");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    } finally {
      setBusy(null);
    }
  }

  async function commit(labelAssignments?: { label: string; programId: string }[]) {
    if (!file) return;
    setError(null);
    setBusy(labelAssignments ? "Saving program names and importing again…" : "Cleaning, linking and importing…");
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, text: file.text, mapping, orgId: orgId || null, labelAssignments }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed.");
      setResult(body);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setStep(1);
    setFile(null);
    setSuggest(null);
    setResult(null);
    setError(null);
  }

  return (
    <div>
      <Stepper step={step} />
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
      {busy && <p className="mt-6 text-sm text-slate-600" role="status">{busy}</p>}
      {step === 1 && !raw && <UploadStep samples={samples} disabled={!!busy} onFile={receive} />}
      {step === 1 && raw && (
        <ProtectStep
          fileName={raw.name}
          column={raw.headers[raw.keyIndex]}
          example={raw.rows.find((r) => r[raw.keyIndex])?.[raw.keyIndex] ?? ""}
          disabled={!!busy}
          onHash={protectAndLoad}
          onCancel={() => setRaw(null)}
        />
      )}
      {step === 2 && suggest && file && (
        <ConfirmStep
          fileName={file.name}
          suggest={suggest}
          mapping={mapping}
          setMapping={setMapping}
          orgId={orgId}
          setOrgId={setOrgId}
          disabled={!!busy}
          onBack={reset}
          onImport={() => commit()}
        />
      )}
      {step === 3 && result && suggest && (
        <ReceiptStep
          result={result}
          programs={suggest.programs}
          orgs={suggest.orgs}
          disabled={!!busy}
          onReimport={(a) => commit(a)}
          onNext={reset}
        />
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Upload", "Confirm mapping", "Receipt"];
  return (
    <ol className="flex gap-2 text-sm" aria-label="Import steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex-1 border-t-4 pt-2 ${
              state === "todo" ? "border-slate-200 text-slate-400" : "border-emerald-800 text-slate-900"
            }`}
          >
            <span className="font-medium">{n}.</span> {label}
          </li>
        );
      })}
    </ol>
  );
}

function ProtectStep({
  fileName,
  column,
  example,
  disabled,
  onHash,
  onCancel,
}: {
  fileName: string;
  column: string;
  example: string;
  disabled: boolean;
  onHash: (networkKey: string) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState("");
  return (
    <form
      className="mt-8 max-w-2xl rounded-lg border border-emerald-200 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onHash(key);
      }}
    >
      <h2 className="text-lg font-semibold">Protect identifiers before anything leaves this computer</h2>
      <p className="mt-2 text-sm text-slate-700">
        <strong>{fileName}</strong> has real identifiers in the column <span className="font-mono">{column}</span>{" "}
        (for example <span className="font-mono">{example}</span>). Nothing has been uploaded. Your browser will turn
        each one into a pseudonymous key using the network key from TPW; only the keys are sent.
      </p>
      <label className="mt-4 block text-sm">
        <span className="font-medium">Network key (from TPW)</span>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono"
        />
      </label>
      <button type="button" onClick={() => setKey(DEMO_NETWORK_KEY)} className="mt-2 text-xs text-emerald-800 underline">
        Use the demo key (synthetic demo data only)
      </button>
      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={disabled || !key}
          className="rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          Hash in my browser and continue
        </button>
        <button type="button" onClick={onCancel} disabled={disabled} className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">
          Choose another file
        </button>
      </div>
    </form>
  );
}

function UploadStep({
  samples,
  disabled,
  onFile,
}: {
  samples: Sample[];
  disabled: boolean;
  onFile: (name: string, text: string) => void;
}) {
  const [over, setOver] = useState(false);
  const read = (f: File | undefined) => f && f.text().then((t) => onFile(f.name, t));

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-[3fr_2fr]">
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
        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors ${
          over ? "border-emerald-700 bg-emerald-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <span className="text-lg font-medium">Drop the spreadsheet you already have</span>
        <span className="mt-2 text-sm text-slate-600">
          CSV · any column names, any language · enrollment sheets or outcome exports
        </span>
        <span className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white">Choose file</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" disabled={disabled} onChange={(e) => read(e.target.files?.[0])} />
        <span className="mt-4 text-xs text-slate-500">
          Starting from scratch? Blank template:{" "}
          <a href="/api/import/template?lang=en" className="text-emerald-800 underline" onClick={(e) => e.stopPropagation()}>
            English
          </a>{" "}
          ·{" "}
          <a href="/api/import/template?lang=es" className="text-emerald-800 underline" onClick={(e) => e.stopPropagation()}>
            Español
          </a>
        </span>
      </label>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Demo files</h2>
        <p className="mt-1 text-xs text-slate-500">Synthetic, calibrated to published CDCR statistics.</p>
        <ul className="mt-3 space-y-2">
          {samples.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                disabled={disabled}
                onClick={async () => onFile(s.name, await (await fetch(`/api/import/samples/${s.name}`)).text())}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-emerald-700 disabled:opacity-50"
              >
                <span className="font-medium">{s.label}</span>
                <span className="block text-xs text-slate-500">
                  {s.name} · {s.kind === "outcomes" ? "outcome records" : "program records"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConfirmStep({
  fileName,
  suggest,
  mapping,
  setMapping,
  orgId,
  setOrgId,
  disabled,
  onBack,
  onImport,
}: {
  fileName: string;
  suggest: SuggestResponse;
  mapping: Record<string, string | null>;
  setMapping: (m: Record<string, string | null>) => void;
  orgId: string;
  setOrgId: (id: string) => void;
  disabled: boolean;
  onBack: () => void;
  onImport: () => void;
}) {
  const targets = Object.values(mapping);
  const kind: ImportKind = targets.some((t) => t && TARGET_FIELDS.find((f) => f.key === t)?.kind === "outcomes")
    ? "outcomes"
    : "enrollments";
  const missing = missingRequired(kind, targets);
  const confidence = useMemo(
    () => Object.fromEntries(suggest.suggestions.map((s) => [s.column, s])),
    [suggest.suggestions],
  );
  const options = fieldsFor(kind);
  const isTemplate = suggest.source === "template";

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{fileName}</h2>
          <p className="text-sm text-slate-600">
            {num(suggest.rowCount)} rows · {kind === "outcomes" ? "Outcome records (the other half of the evidence)" : "Program records"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isTemplate ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-800"
          }`}
        >
          {SOURCE_TEXT[suggest.source]}
        </span>
      </div>

      {isTemplate && suggest.template && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Same format as <strong>{suggest.template.fileName}</strong>, confirmed on{" "}
          {new Date(suggest.template.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          The mapping is reused — review if anything changed, or import directly.
        </p>
      )}
      {suggest.note && <p className="mt-3 text-xs text-slate-500">{suggest.note}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">Column in file</th>
              <th className="px-4 py-2">Sample values</th>
              <th className="px-4 py-2">Maps to</th>
              <th className="px-4 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {suggest.headers.map((h, i) => {
              const s = confidence[h];
              const changed = (mapping[h] ?? null) !== (s?.target ?? null);
              const review = !changed && !!s?.target && s.confidence < AUTO_ACCEPT;
              return (
                <tr key={h} className={`border-t border-slate-100 ${review ? "bg-amber-50" : ""}`}>
                  <td className="px-4 py-2 font-mono text-xs">{h}</td>
                  <td className="max-w-56 truncate px-4 py-2 text-xs text-slate-600">
                    {suggest.sample
                      .slice(0, 3)
                      .map((r) => r[i] || "∅")
                      .join(" · ")}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      aria-label={`Target field for column ${h}`}
                      value={mapping[h] ?? ""}
                      disabled={disabled}
                      onChange={(e) => setMapping({ ...mapping, [h]: e.target.value || null })}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                    >
                      <option value="">— ignore this column —</option>
                      {options.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {changed ? (
                      <span className="text-slate-700">Set by you</span>
                    ) : !s?.target ? (
                      <span className="text-slate-400">—</span>
                    ) : review ? (
                      <span className="font-medium text-amber-800">{Math.round(s.confidence * 100)}% · please review</span>
                    ) : (
                      <span className="text-emerald-800">{Math.round(s.confidence * 100)}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {kind === "enrollments" && (
        <label className="mt-6 block max-w-md text-sm">
          <span className="font-medium">Which organization sent this file?</span>
          <select
            value={orgId}
            disabled={disabled}
            onChange={(e) => setOrgId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5"
          >
            <option value="">Several organizations — match by program name</option>
            {suggest.orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {missing.length > 0 && (
        <p className="mt-4 text-sm text-red-800">Still needed: {missing.map((f) => f.label).join(", ")}</p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onImport}
          disabled={disabled || missing.length > 0}
          className="rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {isTemplate ? "Import with remembered mapping" : "Confirm mapping and import"}
        </button>
        <button type="button" onClick={onBack} disabled={disabled} className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">
          Choose another file
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-amber-800" : ""}`}>{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  );
}

function ReceiptStep({
  result,
  programs,
  orgs,
  disabled,
  onReimport,
  onNext,
}: {
  result: CommitResponse;
  programs: SuggestResponse["programs"];
  orgs: SuggestResponse["orgs"];
  disabled: boolean;
  onReimport: (a: { label: string; programId: string }[]) => void;
  onNext: () => void;
}) {
  const { receipt: r, gradeChanges } = result;
  const [open, setOpen] = useState<IssueCode | null>(null);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
  const outcomes = r.kind === "outcomes";
  const codes = (Object.keys(r.issueCounts) as IssueCode[]).sort((a, b) => (r.issueCounts[b] ?? 0) - (r.issueCounts[a] ?? 0));

  return (
    <div className="mt-8 space-y-8">
      <section aria-labelledby="match-heading" className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 id="match-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {outcomes ? "The two halves, joined" : "Linked to the participant registry"}
        </h2>
        <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <div className="text-5xl font-semibold tabular-nums text-emerald-900">{pct(r.match.rate)}</div>
            <div className="text-sm text-slate-600">
              match rate · {num(r.match.matched)} of {num(r.match.keys)} people · {num(r.match.unmatched)} unmatched
              {r.match.unmatched > 0 ? " (listed below)" : ""}
            </div>
          </div>
          {outcomes && r.match.matchedToParticipants !== undefined && (
            <div className="text-sm text-slate-700">
              <div>
                <strong className="tabular-nums">{num(r.match.matchedToParticipants)}</strong> linked to a program participant
              </div>
              <div>
                <strong className="tabular-nums">{num(r.match.matchedToComparison ?? 0)}</strong> in the registry with no program
                enrollment on file
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Linked on a keyed hash of the shared identifier only. No names, birth dates or case numbers are stored.
        </p>
        {gradeChanges.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {gradeChanges.map((g) => (
              <li key={g.orgId} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                {g.name}: data grade{" "}
                {g.before === g.after ? (
                  <strong>{g.after}</strong>
                ) : (
                  <>
                    {g.before} → <strong className="text-emerald-900">{g.after}</strong>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Rows" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="rows read" value={num(r.rowsRead)} />
        <Stat label="new records imported" value={num(r.inserted)} />
        <Stat label="duplicates merged" value={num(r.duplicatesInFile)} />
        <Stat label="already on file" value={num(r.alreadyOnFile)} />
        <Stat label="problem rows held back" value={num(r.rejectedRows)} tone={r.rejectedRows ? "warn" : undefined} />
      </section>

      {r.unresolvedLabels.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold">Program names we don&apos;t recognize yet</h2>
          <p className="mt-1 text-sm text-slate-700">
            Tell us which program each name means. It is saved to that organization&apos;s dictionary, so next quarter it
            maps itself. Importing again adds only the rows that were held back.
          </p>
          <ul className="mt-4 space-y-2">
            {r.unresolvedLabels.map((u) => (
              <li key={u.label} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-48 font-mono">{u.label}</span>
                <span className="w-20 text-slate-600">{num(u.rows)} rows</span>
                <select
                  aria-label={`Program for ${u.label}`}
                  value={assign[u.label] ?? ""}
                  onChange={(e) => setAssign({ ...assign, [u.label]: e.target.value })}
                  className="rounded border border-slate-300 bg-white px-2 py-1"
                >
                  <option value="">Choose program…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {orgName[p.orgId]} — {p.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={disabled || Object.values(assign).filter(Boolean).length === 0}
            onClick={() =>
              onReimport(Object.entries(assign).filter(([, id]) => id).map(([label, programId]) => ({ label, programId })))
            }
            className="mt-4 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save names and import again
          </button>
        </section>
      )}

      {codes.length > 0 && (
        <section>
          <h2 className="font-semibold">Every problem, listed — nothing dropped silently</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {codes.map((code) => {
              const lines = r.issues.filter((i) => i.code === code);
              return (
                <li key={code}>
                  <button
                    type="button"
                    aria-expanded={open === code}
                    onClick={() => setOpen(open === code ? null : code)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>
                      {ISSUE_LABELS[code]}
                      <span className={`ml-2 text-xs ${REJECTING[code] ? "text-amber-800" : "text-slate-500"}`}>
                        {REJECTING[code] ? "row held back" : "row kept"}
                      </span>
                    </span>
                    <span className="tabular-nums text-slate-700">{num(r.issueCounts[code] ?? 0)}</span>
                  </button>
                  {open === code && (
                    <ul className="max-h-48 overflow-y-auto bg-slate-50 px-4 py-2 font-mono text-xs text-slate-700">
                      {lines.slice(0, 200).map((i, k) => (
                        <li key={k}>
                          line {i.line}
                          {i.value ? ` · ${i.value}` : ""}
                        </li>
                      ))}
                      {lines.length > 200 && <li>… and {num(lines.length - 200)} more</li>}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assumptions applied</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {r.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={onNext} className="rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900">
          Import the next file
        </button>
        <Link href="/future/overview" className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-200">
          Go to overview
        </Link>
      </div>
    </div>
  );
}
