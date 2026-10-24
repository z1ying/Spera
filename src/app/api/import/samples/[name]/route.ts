import { readSample } from "@/lib/importer";

export const runtime = "nodejs";

/** Bundled synthetic demo files only (whitelisted in importer.ts). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const text = readSample((await params).name);
  if (text === null) return new Response("Not found", { status: 404 });
  return new Response(text, { headers: { "content-type": "text/csv; charset=utf-8" } });
}
