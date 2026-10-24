import { NextResponse } from "next/server";
import { askGemma, AssistantUnavailable, OPEN_GRANT, orgFacts, systemPrompt, trimHistory, type ChatMessage } from "@/lib/grantAssistant";
import { loadRuns } from "@/lib/loadRuns";

export const runtime = "nodejs";

/**
 * Grant-writing assistant. The organization's facts are recomputed here from
 * its reported runs — never taken from the browser — so drafts can only cite
 * numbers that are on file.
 */
export async function POST(req: Request) {
  const { org, messages } = (await req.json()) as { org?: string; messages?: ChatMessage[] };
  const history = trimHistory(messages ?? []);
  if (!org?.trim() || history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Choose your organization and write a message." }, { status: 400 });
  }
  const runs = (await loadRuns()).filter((r) => r.orgName.toLowerCase() === org.trim().toLowerCase());
  try {
    const reply = await askGemma(systemPrompt(OPEN_GRANT, orgFacts(org.trim(), runs)), history);
    return NextResponse.json({ reply });
  } catch (e) {
    if (e instanceof AssistantUnavailable) return NextResponse.json({ error: e.message }, { status: 503 });
    throw e;
  }
}
