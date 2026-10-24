import { NextResponse } from "next/server";
import { commitImport, ImportError, type CommitRequest } from "@/lib/importer";

export const runtime = "nodejs";

/** Step 2 → 3: clean, link and import with the confirmed mapping; returns the receipt. */
export async function POST(req: Request) {
  const body = (await req.json()) as CommitRequest;
  if (!body.text?.trim() || !body.mapping) {
    return NextResponse.json({ error: "Missing file or mapping." }, { status: 400 });
  }
  try {
    return NextResponse.json(await commitImport({ ...body, orgId: body.orgId || null }));
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
