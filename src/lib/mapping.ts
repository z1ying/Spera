/**
 * Column mapping for the import wizard — design doc §6.1 steps 1–3.
 *
 * Suggestion sources, in priority order (the server picks; see importer.ts):
 *   1. template — a mapping a human already confirmed for a file with the
 *      same headers (next quarter's export maps itself, §26)
 *   2. cache    — DEMO_MODE replay of a recorded Gemini answer (§6.2)
 *   3. gemini   — Gemini proposes {target, confidence} per column (§2)
 *   4. rules    — synonym matching, always available, no network
 * Whatever the source, a human confirms before anything is imported.
 */

export type ImportKind = "enrollments" | "outcomes";

export interface TargetField {
  key: string;
  label: string;
  kind: ImportKind;
  required: boolean;
  description: string;
}

export const TARGET_FIELDS: TargetField[] = [
  { key: "participant_key", label: "Participant key", kind: "enrollments", required: true,
    description: "Hashed participant key (keyed hash of the shared identifier). Never a name or raw ID." },
  { key: "program", label: "Program name", kind: "enrollments", required: true,
    description: "The organization's own name for the program, e.g. 'GED Prep'." },
  { key: "enroll_date", label: "Start date", kind: "enrollments", required: true,
    description: "Date the participant enrolled / started." },
  { key: "completion_date", label: "End date", kind: "enrollments", required: false,
    description: "Date the participant completed or left the program." },
  { key: "completed", label: "Completed?", kind: "enrollments", required: true,
    description: "Whether the program was completed (yes/no)." },
  { key: "credits", label: "Credits earned", kind: "enrollments", required: false,
    description: "Program credit codes earned, e.g. 'MCC+RACC'." },
  { key: "event_type", label: "Event type", kind: "outcomes", required: true,
    description: "Outcome event: arrest, conviction, return to custody, parole violation, parole discharge." },
  { key: "event_date", label: "Event date", kind: "outcomes", required: true,
    description: "Date of the outcome event." },
  { key: "offense_level", label: "Offense level", kind: "outcomes", required: false,
    description: "Felony or misdemeanor." },
];

/** participant_key belongs to both kinds of file. */
export function fieldsFor(kind: ImportKind): TargetField[] {
  return TARGET_FIELDS.filter((f) => f.kind === kind || f.key === "participant_key");
}

export interface ColumnSuggestion {
  column: string;
  target: string | null;
  /** 0–1. ≥ AUTO_ACCEPT is preselected; below is flagged for review (§6.1). */
  confidence: number;
}

export type MappingSource = "template" | "cache" | "gemini" | "rules";

export const AUTO_ACCEPT = 0.8;

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

/** Identifies "the same export format": normalized headers, in order. */
export function headerSignature(headers: string[]): string {
  return headers.map(normalizeHeader).join("|");
}

/** Known header spellings (normalized) — English, abbreviated, Spanish, external systems. */
const SYNONYMS: Record<string, string[]> = {
  participant_key: ["participantkey", "participantid", "prtcpntid", "idparticipante", "subjectref", "personkey", "clientkey", "participante"],
  program: ["programname", "program", "prognm", "programa", "nombreprograma", "course", "class"],
  enroll_date: ["startdate", "strtdt", "fechainicio", "enrolldate", "enrollmentdate", "start", "inicio"],
  completion_date: ["enddate", "enddt", "fechafin", "completiondate", "exitdate", "end", "fin"],
  completed: ["completed", "done", "completado", "complete", "status", "estado"],
  credits: ["credits", "crdts", "creditos", "credit"],
  event_type: ["incidenttype", "eventtype", "event", "outcometype", "incident"],
  event_date: ["incidentdt", "incidentdate", "eventdate", "eventdt", "outcomedate", "date"],
  offense_level: ["severity", "offenselevel", "level", "offenseclass", "gravedad"],
};

/**
 * Rule-based suggestions: exact synonym = 0.95, partial overlap = 0.6.
 * Each target is used at most once (the strongest column wins).
 */
export function ruleMapping(headers: string[]): ColumnSuggestion[] {
  const scored = headers.map((column) => {
    const n = normalizeHeader(column);
    let best: { target: string | null; confidence: number } = { target: null, confidence: 0 };
    for (const [target, syns] of Object.entries(SYNONYMS)) {
      const conf = syns.includes(n)
        ? 0.95
        : n.length >= 3 && syns.some((s) => s.length >= 3 && (s.includes(n) || n.includes(s)))
          ? 0.6
          : 0;
      if (conf > best.confidence) best = { target, confidence: conf };
    }
    return { column, ...best };
  });
  return dedupeTargets(scored);
}

function dedupeTargets(suggestions: ColumnSuggestion[]): ColumnSuggestion[] {
  const winner = new Map<string, number>();
  suggestions.forEach((s, i) => {
    if (!s.target) return;
    const j = winner.get(s.target);
    if (j === undefined || suggestions[j].confidence < s.confidence) winner.set(s.target, i);
  });
  return suggestions.map((s, i) =>
    s.target && winner.get(s.target) !== i ? { column: s.column, target: null, confidence: 0 } : s,
  );
}

/** An outcome file is one whose mapping includes outcome-only fields. */
export function detectKind(suggestions: { target: string | null }[]): ImportKind {
  const outcomeKeys = new Set(TARGET_FIELDS.filter((f) => f.kind === "outcomes").map((f) => f.key));
  return suggestions.some((s) => s.target && outcomeKeys.has(s.target)) ? "outcomes" : "enrollments";
}

/** Required fields of `kind` that no column maps to. */
export function missingRequired(kind: ImportKind, targets: (string | null)[]): TargetField[] {
  return fieldsFor(kind).filter((f) => f.required && !targets.includes(f.key));
}

// ---------- Gemini ----------

/**
 * Sample values sent to the LLM are masked when they look like hashed keys,
 * so even pseudonymous keys never leave the server (§4.1).
 */
export function maskSampleValue(v: string): string {
  return /^[0-9a-f]{12,}$/i.test(v.trim()) ? "<hashed key>" : v;
}

export function buildGeminiPrompt(headers: string[], samples: string[][]): string {
  const fields = TARGET_FIELDS.map((f) => `- ${f.key}: ${f.description}`).join("\n");
  const sample = samples
    .slice(0, 3)
    .map((r) => headers.map((h, i) => `${h}=${maskSampleValue(r[i] ?? "")}`).join("; "))
    .join("\n");
  return [
    "You map spreadsheet columns from community organizations and outcome systems to a fixed schema.",
    "Target fields:",
    fields,
    "",
    `Columns: ${JSON.stringify(headers)}`,
    "Sample rows:",
    sample,
    "",
    'Reply with JSON only: {"mappings":[{"column":"<exact column name>","target":"<target field key or null>","confidence":<0..1>}]}',
    "Use each target at most once. Use null when no target fits. Headers may be in English, Spanish, or abbreviated.",
  ].join("\n");
}

/** Validate an LLM answer against the real headers and target list. */
export function parseGeminiAnswer(text: string, headers: string[]): ColumnSuggestion[] {
  const parsed = JSON.parse(text) as { mappings?: { column?: unknown; target?: unknown; confidence?: unknown }[] };
  const valid = new Set(TARGET_FIELDS.map((f) => f.key));
  const byColumn = new Map<string, ColumnSuggestion>();
  for (const m of parsed.mappings ?? []) {
    if (typeof m.column !== "string" || !headers.includes(m.column)) continue;
    const target = typeof m.target === "string" && valid.has(m.target) ? m.target : null;
    const confidence = typeof m.confidence === "number" ? Math.max(0, Math.min(1, m.confidence)) : 0;
    byColumn.set(m.column, { column: m.column, target, confidence: target ? confidence : 0 });
  }
  return dedupeTargets(headers.map((h) => byColumn.get(h) ?? { column: h, target: null, confidence: 0 }));
}

export async function geminiMapping(
  headers: string[],
  samples: string[][],
  opts: { apiKey: string; model: string; fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<ColumnSuggestion[]> {
  const res = await (opts.fetchImpl ?? fetch)(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildGeminiPrompt(headers, samples) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    },
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseGeminiAnswer(text, headers);
}
