/**
 * Grant-writing assistant (design doc §28): helps an organization draft its
 * RIGHT 4.0 application text with Gemma (Google DeepMind's open model) via
 * the Gemini API. Called only from the server; the key never reaches the
 * browser.
 *
 * Grounding rules: the model sees the RFA's requirements and the
 * organization's numbers computed from its own reported runs, and is told to
 * use no other figures. Anything only the organization knows is left as an
 * [ADD: …] placeholder. It never writes about individuals or invents outcomes.
 */
import { GRANTS, type Grant } from "./grants";
import type { Run } from "./runs";
import { priorService, right4Signals, totals } from "./runs";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const MAX_MESSAGES = 12;
export const MAX_CHARS = 4000;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Facts about one organization, from its reported runs only. */
export function orgFacts(orgName: string, runs: Run[]): string {
  if (runs.length === 0) return `Organization: ${orgName}. No program runs reported in Spera yet.`;
  const t = totals(runs);
  const s = right4Signals(runs);
  const ps = priorService(runs, 2026);
  const byProgram = [...new Set(runs.map((r) => r.programName))].map((p) => {
    const rs = runs.filter((r) => r.programName === p);
    const hours = [...new Set(rs.map((r) => r.totalHours).filter((h): h is number => h !== null))];
    const prisons = [...new Set(rs.map((r) => r.facilityName))];
    return `- ${p}: ${rs.length} runs; course length ${hours.length ? hours.join(" / ") + " hours" : "not reported"}; at ${prisons.join("; ")}`;
  });
  return [
    `Organization: ${orgName}`,
    `Programs (from reported runs):`,
    ...byProgram,
    `Totals across reported runs: ${t.runs} runs (${t.completedRuns} completed, ${t.inProgressRuns} in progress); ${fmt(t.participants)} participants; ${fmt(t.completed)} completed${t.completionRate === null ? "" : ` (${(t.completionRate * 100).toFixed(1)}% of participants in finished runs)`}; ${fmt(t.participantHours)} total participant programming hours (TPW definition: participants completed × course length).`,
    `Years with programming in CDCR prisons within ${ps.window[0]}–${ps.window[4]}: ${ps.yearsWithProgramming.join(", ") || "none on file"} (RIGHT 4.0 needs at least 2).`,
    `RIGHT 4.0 underserved institutions already served: ${s.underservedInstitutions.join(", ") || "none"}.`,
    `Runs serving RHU/EOP/MHCB: ${s.specialPopulationRuns}. Languages other than English: ${s.languages.join(", ") || "none reported"}.`,
  ].join("\n");
}

function grantFacts(g: Grant): string {
  return [
    `${g.fullName ?? g.name} — ${g.funder}. Applications due ${g.dueDate} ${g.dueTime ?? ""}. Funding period ${g.fundingPeriod}. Total $${((g.totalFunding ?? 0) / 1e6).toFixed(1)} million. ${g.howAwarded ?? ""}`,
    `Eligibility: ${(g.eligibility ?? []).join("; ")}.`,
    `Points: ${(g.points ?? []).join("; ")}.`,
    g.programSummary
      ? `Program Summary (${g.programSummary.limit}) must include: ${g.programSummary.mustInclude.map((x, i) => `(${i + 1}) ${x}`).join("; ")}. If non-English: ${g.programSummary.ifNonEnglish}`
      : "",
    `Required documents: ${(g.documents ?? []).join("; ")}.`,
    `Notes: ${(g.notes ?? []).join(" ")}`,
  ].join("\n");
}

export function systemPrompt(g: Grant, facts: string): string {
  return `You help a small nonprofit that runs programs inside California prisons write its application for a CDCR grant. Write in plain, warm, professional English.

RULES
1. Use only the numbers in ORGANIZATION FACTS. Never invent statistics, outcomes, recidivism rates, quotes or stories.
1a. Never describe what a program teaches, its methods, or its effects on participants — you only know program names. Leave an [ADD: …] placeholder instead, even if the name suggests a topic.
1b. Use the grant terms exactly as written in GRANT; never expand an acronym the GRANT section doesn't spell out.
2. Where the application needs something only the organization knows (goals, schedule details, capacity, space and equipment, budget, staff), write a clear placeholder like [ADD: weekly schedule].
3. Never ask for or include information about individual participants (names, CDCR numbers, cases).
4. Follow the grant's requirements exactly; respect the 2-page Program Summary limit.
5. Points and eligibility are decided by CDCR; say "estimated" when you discuss them.
6. When you produce draft text for the application, end with one line reminding them that the RFA includes a GenAI reporting form, so AI-assisted text must be disclosed, and that a person must review every word.
7. Be concise. Use headings matching the RFA's items when drafting the Program Summary.

GRANT
${grantFacts(g)}

ORGANIZATION FACTS (from programs reported to TPW through Spera; the only numbers you may use)
${facts}`;
}

/** Keep the last MAX_MESSAGES turns, each trimmed to MAX_CHARS. */
export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
}

/**
 * Gemini API request body. Gemma models don't take a separate system
 * instruction, so the instructions open the conversation as the first user
 * turn, acknowledged by the model.
 */
export function requestBody(system: string, history: ChatMessage[], minimalThinking = true) {
  return {
    contents: [
      { role: "user", parts: [{ text: system }] },
      { role: "model", parts: [{ text: "Understood. I will follow these rules and use only the facts provided." }] },
      ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      // Gemma 4 thinks before answering; "minimal" keeps replies fast.
      ...(minimalThinking ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
    },
  };
}

export class AssistantUnavailable extends Error {}

/** Default: Gemma 4 26B mixture-of-experts — ~1 s with minimal thinking (31B took 13–21 s in testing). */
export const DEFAULT_MODEL = "gemma-4-26b-a4b-it";

type Part = { text?: string; thought?: boolean };

/** The answer only: Gemma returns its reasoning as separate parts marked `thought`. */
export function answerText(body: { candidates?: { content?: { parts?: Part[] } }[] }): string {
  return (body.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

export async function askGemma(
  system: string,
  history: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
  retryDelayMs = 1500,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AssistantUnavailable("The writing assistant is not set up yet (no API key).");
  const model = process.env.GEMMA_MODEL || DEFAULT_MODEL;
  const call = (minimalThinking: boolean) =>
    fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(requestBody(system, history, minimalThinking)),
      signal: AbortSignal.timeout(60_000),
    });

  let res = await call(true);
  // A model that doesn't accept the thinking setting: ask again without it.
  if (res.status === 400) res = await call(false);
  // The service is briefly busy (503) or rate-limited (429): one retry.
  if (res.status === 503 || res.status === 429) {
    await new Promise((r) => setTimeout(r, retryDelayMs));
    res = await call(true);
  }
  if (!res.ok) {
    throw new AssistantUnavailable(
      res.status === 503 || res.status === 429
        ? "The writing assistant is busy right now. Please try again in a moment."
        : `The model service returned an error (HTTP ${res.status}).`,
    );
  }
  const text = answerText(await res.json());
  if (!text) throw new AssistantUnavailable("The model returned an empty answer. Please try again.");
  return text;
}

export const OPEN_GRANT = GRANTS.grants.find((g) => g.status === "open")!;
