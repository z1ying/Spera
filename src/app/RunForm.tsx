"use client";

import { useEffect, useMemo, useState } from "react";
import { hoursFromSchedule, STATUSES, type RunInput } from "@/lib/runs";
import SearchPick from "./SearchPick";
import ReportModal, { type SubmittedRun } from "@/components/ReportModal";
import type { OrgSummary } from "@/lib/orgSummary";

interface Options {
  orgs: { name: string; programs: string[] }[];
  facilities: { code: string; name: string; underserved: boolean; womens: boolean }[];
}

interface MyRun {
  id: string;
  orgName: string;
  programName: string;
  facilityCode: string;
  yard: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalHours: number | null;
  participants: number | null;
  completed: number | null;
  specialPopulations: boolean;
  nonEnglishLanguage: string | null;
  participantHours: number | null;
}

const STORE = "impactlink.myRuns";
const LAST = "impactlink.last";

// Browser storage is a convenience only (remembered choices, this browser's
// submissions); every read and write is guarded so the form works without it.
function readStore<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: nothing to remember, the form still works
  }
}

const EMPTY: RunInput = {
  orgName: "",
  programName: "",
  facilityCode: "",
  yard: "",
  status: "",
  startDate: "",
  endDate: "",
  totalHours: null,
  participants: null,
  completed: null,
  specialPopulations: false,
  nonEnglishLanguage: "",
};

const num = (v: string) => (v === "" ? null : Number(v));
const fmt = (n: number) => n.toLocaleString("en-US");
const STATUS_HELP: Record<string, string> = {
  Planned: "Scheduled, not started",
  "In Progress": "Running now",
  Completed: "Finished",
};

function Field({ n, label, hint, children }: { n: number; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline gap-3 text-base font-semibold">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900">
          {n}
        </span>
        {label}
      </h2>
      {hint && <p className="ml-9 mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="ml-9 mt-3">{children}</div>
    </section>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        selected ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, label, disabled }: { value: number | null; onChange: (v: number | null) => void; label: string; disabled?: boolean }) {
  const v = value ?? 0;
  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-300 bg-white ${disabled ? "opacity-40" : ""}`}>
      <button type="button" aria-label={`Fewer ${label}`} disabled={disabled} onClick={() => onChange(Math.max(0, v - 1))} className="px-4 py-2 text-lg">
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        disabled={disabled}
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        className="w-16 border-x border-slate-200 py-2 text-center text-lg tabular-nums outline-none"
      />
      <button type="button" aria-label={`More ${label}`} disabled={disabled} onClick={() => onChange(v + 1)} className="px-4 py-2 text-lg">
        +
      </button>
    </div>
  );
}

export default function RunForm() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [form, setForm] = useState<RunInput>(EMPTY);
  /** Organizations typed in as new during this visit (not yet on the server). */
  const [addedOrgs, setAddedOrgs] = useState<string[]>([]);
  const [newProgram, setNewProgram] = useState(false);
  const [schedule, setSchedule] = useState<{ on: boolean; per: "week" | "month"; sessions: string; hours: string; count: string }>({
    on: false,
    per: "week",
    sessions: "1",
    hours: "2",
    count: "12",
  });
  const [editing, setEditing] = useState<{ id: string; editToken: string } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ summary: OrgSummary; run: SubmittedRun } | null>(null);
  const [mine, setMine] = useState<MyRun[]>([]);
  const [otherLanguage, setOtherLanguage] = useState(false);

  const set = (patch: Partial<RunInput>) => setForm((f) => ({ ...f, ...patch }));

  async function refreshMine() {
    const items = readStore<{ id: string; editToken: string }[]>(STORE, []);
    if (items.length === 0) return setMine([]);
    const res = await fetch("/api/runs/mine", { method: "POST", body: JSON.stringify({ items }) });
    if (res.ok) setMine(await res.json());
  }

  useEffect(() => {
    fetch("/api/form-options").then((r) => r.json()).then(setOpts).catch(() => setOpts({ orgs: [], facilities: [] }));
    const last = readStore<Partial<RunInput>>(LAST, {});
    if (last.orgName) setForm((f) => ({ ...f, orgName: last.orgName!, programName: last.programName ?? "" }));
    refreshMine();
  }, []);

  const orgPrograms = opts?.orgs.find((o) => o.name === form.orgName)?.programs ?? [];
  const facility = opts?.facilities.find((f) => f.code === form.facilityCode);
  const allOrgs = useMemo(
    () => [...(opts?.orgs ?? []), ...addedOrgs.filter((n) => !opts?.orgs.some((o) => o.name === n)).map((name) => ({ name, programs: [] }))],
    [opts, addedOrgs],
  );

  const scheduleHours = schedule.on
    ? hoursFromSchedule(Number(schedule.sessions) || 0, Number(schedule.hours) || 0, Number(schedule.count) || 0)
    : null;
  const hours = schedule.on ? scheduleHours : form.totalHours ?? null;
  const isCompleted = form.status === "Completed";
  const participantHours = isCompleted && hours !== null && form.completed != null ? hours * form.completed : null;
  const year = form.startDate ? form.startDate.slice(0, 4) : null;

  function copyRun(r: MyRun, asEdit: boolean) {
    setForm({
      orgName: r.orgName,
      programName: r.programName,
      facilityCode: r.facilityCode,
      yard: r.yard ?? "",
      status: asEdit ? r.status : "",
      startDate: asEdit ? r.startDate?.slice(0, 10) ?? "" : "",
      endDate: asEdit ? r.endDate?.slice(0, 10) ?? "" : "",
      totalHours: r.totalHours,
      participants: asEdit ? r.participants : null,
      completed: asEdit ? r.completed : null,
      specialPopulations: r.specialPopulations,
      nonEnglishLanguage: r.nonEnglishLanguage ?? "",
    });
    setOtherLanguage(!!r.nonEnglishLanguage);
    setSchedule((s) => ({ ...s, on: false }));
    setNewProgram(false);
    setProblems([]);
    const token = readStore<{ id: string; editToken: string }[]>(STORE, []).find((i) => i.id === r.id)?.editToken;
    setEditing(asEdit && token ? { id: r.id, editToken: token } : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblems([]);
    const body: RunInput = { ...form, totalHours: hours, nonEnglishLanguage: otherLanguage ? form.nonEnglishLanguage : "" };
    try {
      const res = editing
        ? await fetch(`/api/runs/${editing.id}`, { method: "PATCH", body: JSON.stringify({ ...body, editToken: editing.editToken }) })
        : await fetch("/api/runs", { method: "POST", body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) {
        setProblems(out.problems ?? ["Something went wrong. Please try again."]);
        return;
      }
      if (!editing) writeStore(STORE, [...readStore<{ id: string; editToken: string }[]>(STORE, []), { id: out.id, editToken: out.editToken }]);
      writeStore(LAST, { orgName: form.orgName, programName: form.programName });
      const summary = (await (await fetch(`/api/org-summary?org=${encodeURIComponent(form.orgName)}`)).json()) as OrgSummary;
      setReport({
        summary,
        run: {
          orgName: form.orgName,
          programName: form.programName,
          facilityName: facility?.name ?? form.facilityCode,
          underserved: !!facility?.underserved,
          status: form.status,
          programYear: year ? Number(year) : null,
          totalHours: hours,
          participants: form.participants ?? null,
          completed: isCompleted ? form.completed ?? null : null,
          participantHours,
          updated: !!editing,
        },
      });
      setForm({ ...EMPTY, orgName: form.orgName, programName: form.programName });
      setOtherLanguage(false);
      setEditing(null);
        setNewProgram(false);
      setOpts(await (await fetch("/api/form-options")).json());
      refreshMine();
    } finally {
      setBusy(false);
    }
  }

  if (!opts) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div>
        {report && <ReportModal s={report.summary} run={report.run} onClose={() => setReport(null)} />}

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {editing && (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Updating a program you submitted.{" "}
              <button type="button" className="underline" onClick={() => { setEditing(null); setForm({ ...EMPTY, orgName: form.orgName }); }}>
                Cancel
              </button>
            </p>
          )}

          <Field n={1} label="Your organization">
            <SearchPick
              items={allOrgs}
              label={(o) => o.name}
              toText={(o) => o.name}
              selected={allOrgs.find((o) => o.name === form.orgName) ?? null}
              onPick={(o) => { set({ orgName: o.name, programName: "" }); setNewProgram(false); }}
              onClear={() => set({ orgName: "", programName: "" })}
              onAdd={(name) => { setAddedOrgs((xs) => [...xs, name]); set({ orgName: name, programName: "" }); setNewProgram(true); }}
              placeholder="Type your organization's name"
              addLabel="a new organization"
            />
          </Field>

          {form.orgName && (
            <Field n={2} label="Program">
              {!newProgram && orgPrograms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {orgPrograms.map((p) => (
                    <Chip key={p} selected={form.programName === p} onClick={() => set({ programName: p })}>
                      {p}
                    </Chip>
                  ))}
                  <Chip selected={false} onClick={() => { setNewProgram(true); set({ programName: "" }); }}>
                    + New program
                  </Chip>
                </div>
              ) : (
                <input
                  value={form.programName}
                  onChange={(e) => set({ programName: e.target.value })}
                  placeholder="Program name"
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
                />
              )}
            </Field>
          )}

          {form.programName && (
            <>
              <Field n={3} label="Prison">
                <SearchPick
                  items={opts.facilities}
                  label={(f) => f.name}
                  toText={(f) => `${f.name} ${f.code}`}
                  selected={facility ?? null}
                  onPick={(f) => set({ facilityCode: f.code })}
                  onClear={() => set({ facilityCode: "" })}
                  placeholder="Type to search, e.g. San Quentin or SQ"
                  badge={(f) =>
                    f.underserved ? <span className="shrink-0 text-xs font-medium text-emerald-800">RIGHT 4.0 underserved prison</span> : null
                  }
                />
                <input
                  value={form.yard ?? ""}
                  onChange={(e) => set({ yard: e.target.value })}
                  placeholder="Yard (optional), e.g. B Yard"
                  className="mt-3 w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </Field>

              <Field n={4} label="Status">
                <div className="grid max-w-md grid-cols-3 gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={form.status === s}
                      onClick={() => set({ status: s })}
                      className={`rounded-lg border px-3 py-3 text-left text-sm ${
                        form.status === s ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white hover:border-emerald-700"
                      }`}
                    >
                      <span className="block font-medium">{s}</span>
                      <span className={`block text-xs ${form.status === s ? "text-emerald-100" : "text-slate-500"}`}>{STATUS_HELP[s]}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field n={5} label="Dates" hint="Leave the end date empty if you don't know it yet.">
                <div className="flex flex-wrap gap-4 text-sm">
                  <label>
                    <span className="block text-slate-600">Start</span>
                    <input type="date" value={form.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  <label>
                    <span className="block text-slate-600">End</span>
                    <input type="date" value={form.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                </div>
              </Field>

              <Field n={6} label="Course length in hours" hint="Hours ONE person gets if they attend the whole program — e.g. 176 for “CEO of Your New Life”.">
                <div className="flex gap-2 text-sm">
                  <Chip selected={!schedule.on} onClick={() => setSchedule({ ...schedule, on: false })}>
                    I know the total
                  </Chip>
                  <Chip selected={schedule.on} onClick={() => setSchedule({ ...schedule, on: true })}>
                    Work it out from the schedule
                  </Chip>
                </div>
                {schedule.on ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <input aria-label="Sessions" inputMode="decimal" value={schedule.sessions} onChange={(e) => setSchedule({ ...schedule, sessions: e.target.value })} className="w-14 rounded border border-slate-300 px-2 py-1.5 text-center" />
                    <span>session(s) a</span>
                    <select aria-label="Per" value={schedule.per} onChange={(e) => setSchedule({ ...schedule, per: e.target.value as "week" | "month" })} className="rounded border border-slate-300 px-2 py-1.5">
                      <option value="week">week</option>
                      <option value="month">month</option>
                    </select>
                    <span>×</span>
                    <input aria-label="Hours per session" inputMode="decimal" value={schedule.hours} onChange={(e) => setSchedule({ ...schedule, hours: e.target.value })} className="w-14 rounded border border-slate-300 px-2 py-1.5 text-center" />
                    <span>hours each, for</span>
                    <input aria-label="Number of weeks or months" inputMode="numeric" value={schedule.count} onChange={(e) => setSchedule({ ...schedule, count: e.target.value })} className="w-14 rounded border border-slate-300 px-2 py-1.5 text-center" />
                    <span>{schedule.per}s</span>
                    <span className="ml-2 font-semibold">= {fmt(scheduleHours ?? 0)} hours</span>
                  </div>
                ) : (
                  <input
                    aria-label="Total programming hours"
                    inputMode="decimal"
                    value={form.totalHours ?? ""}
                    onChange={(e) => set({ totalHours: num(e.target.value) })}
                    placeholder="e.g. 39"
                    className="mt-3 w-28 rounded-lg border border-slate-300 px-3 py-2 text-lg tabular-nums"
                  />
                )}
              </Field>

              <Field n={7} label="Number of people" hint="Head counts, not hours.">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="mb-1 block text-slate-600">Took part</span>
                    <Stepper label="participants" value={form.participants ?? null} onChange={(v) => set({ participants: v })} />
                  </div>
                  <div>
                    <span className="mb-1 block text-slate-600">Completed {!isCompleted && "(once finished)"}</span>
                    <Stepper label="completed" disabled={!isCompleted} value={isCompleted ? form.completed ?? null : null} onChange={(v) => set({ completed: v })} />
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={!!form.specialPopulations} onChange={(e) => set({ specialPopulations: e.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-800" />
                  <span>
                    Serves people in restricted housing or mental health programs (RHU, EOP or MHCB)
                    <span className="block text-xs text-slate-500">Optional. Programs for these groups earn an extra half point in CDCR&apos;s RIGHT grant.</span>
                  </span>
                </label>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={otherLanguage} onChange={(e) => setOtherLanguage(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-800" />
                  <span>
                    Taught in a language other than English
                    <span className="block text-xs text-slate-500">Optional. Also earns an extra half point in RIGHT 4.0.</span>
                  </span>
                </label>
                {otherLanguage && (
                  <input
                    aria-label="Which language?"
                    value={form.nonEnglishLanguage ?? ""}
                    onChange={(e) => set({ nonEnglishLanguage: e.target.value })}
                    placeholder="Which language? e.g. Spanish"
                    className="ml-6 mt-2 w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                )}
              </Field>

              {problems.length > 0 && (
                <ul className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div className="text-sm text-slate-600">
                  <span className="block text-xs uppercase tracking-wide text-slate-500">Total participant programming hours</span>
                  {participantHours !== null ? (
                    <span>
                      <strong className="text-xl tabular-nums text-slate-900">{fmt(participantHours)}</strong>{" "}
                      = {fmt(form.completed ?? 0)} completed × {fmt(hours ?? 0)} hours
                    </span>
                  ) : (
                    <span>Calculated for you: people completed × course length</span>
                  )}
                  {year && <span className="block text-xs text-slate-500">Program year {year}</span>}
                </div>
                <button
                  type="submit"
                  disabled={busy || !form.status || !form.facilityCode}
                  className="rounded-lg bg-emerald-800 px-6 py-3 font-medium text-white hover:bg-emerald-900 disabled:opacity-40"
                >
                  {busy ? "Saving…" : editing ? "Save changes" : "Submit program"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <aside>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Submitted from this browser</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Programs you submit appear here, so you can copy or update them later.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="font-medium">{r.programName}</div>
                <div className="text-xs text-slate-500">
                  {r.facilityCode} · {r.status}
                  {r.startDate ? ` · ${r.startDate.slice(0, 10)}` : ""}
                  {r.participantHours !== null ? ` · ${fmt(r.participantHours)} participant hours` : ""}
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" onClick={() => copyRun(r, true)} className="font-medium text-emerald-800 underline">
                    {r.status === "Completed" ? "Edit" : "Update"}
                  </button>
                  <button type="button" onClick={() => copyRun(r, false)} className="text-slate-600 underline">
                    New run like this
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-slate-500">
          ImpactLink collects counts only — never names or ID numbers.{" "}
          <a href="/data-use" className="underline">
            How your data is used
          </a>
        </p>
      </aside>
    </div>
  );
}
