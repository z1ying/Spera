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
    // No maxAge: a session cookie, so closing the browser signs TPW staff out.
  });
  return res;
}
