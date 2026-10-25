import { NextResponse } from "next/server";
import { passcodeMatches, sessionCookieValue, TPW_COOKIE } from "@/lib/tpwAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { passcode } = (await req.json()) as { passcode?: string };
  if (!passcode || !passcodeMatches(passcode)) {
    return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TPW_COOKIE, sessionCookieValue()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Short-lived: leaving the TPW pages signs out (SiteHeader); this caps a
    // forgotten tab at 30 minutes.
    maxAge: 60 * 30,
  });
  return res;
}
