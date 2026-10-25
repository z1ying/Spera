import { NextResponse } from "next/server";
import { filterRuns, NO_FILTERS, type Filters } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { askGemma, AssistantUnavailable } from "@/lib/grantAssistant";
import { loadRuns } from "@/lib/loadRuns";
import { insightsPrompt, networkFacts, parseSummary } from "@/lib/networkInsights";
import { isTpwSignedIn } from "@/lib/tpwAuth";

export const runtime = "nodejs";

const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : []);

/**
 * AI summary of the dashboard's current view (TPW staff only). Only the
 * filters come from the browser; the numbers are recomputed here.
 */
export async function POST(req: Request) {
  if (!(await isTpwSignedIn())) return NextResponse.json({ error: "Sign in as TPW staff first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Filters>;
  const f: Filters = { ...NO_FILTERS, facilities: list(body.facilities), orgs: list(body.orgs), programs: list(body.programs), years: list(body.years) };
  const scope =
    [
      f.orgs.length && `organizations ${f.orgs.join(", ")}`,
      f.facilities.length && `prisons ${f.facilities.join(", ")}`,
      f.programs.length && `programs ${f.programs.join(", ")}`,
      f.years.length && `program years ${f.years.join(", ")}`,
    ]
      .filter(Boolean)
      .join("; ") || "the whole network, all years";
  const [runs, facilities] = await Promise.all([loadRuns(), prisma.facility.findMany()]);
  const facts = networkFacts(filterRuns(runs, f), facilities, scope);
  try {
    const text = await askGemma(insightsPrompt(facts), [{ role: "user", content: "Write the summary now." }]);
    const summary = parseSummary(text);
    if (!summary) return NextResponse.json({ error: "The summary came back in an unexpected shape. Please try again." }, { status: 502 });
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof AssistantUnavailable) return NextResponse.json({ error: e.message }, { status: 503 });
    throw e;
  }
}
