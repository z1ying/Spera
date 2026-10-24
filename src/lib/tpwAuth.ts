/**
 * TPW staff sign-in (design doc §27). Organizations never sign in; only TPW
 * staff, with a passcode from the TPW_PASSCODE environment variable, can see
 * the dashboard. Fails closed: with no passcode configured, nobody can sign in.
 * A real account system replaces this after the pilot starts.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const TPW_COOKIE = "impactlink_tpw";

const sessionValue = (passcode: string) => createHash("sha256").update(`impactlink-tpw:${passcode}`).digest("hex");

export function passcodeMatches(attempt: string): boolean {
  const passcode = process.env.TPW_PASSCODE;
  if (!passcode) return false;
  const a = Buffer.from(sessionValue(attempt));
  const b = Buffer.from(sessionValue(passcode));
  return timingSafeEqual(a, b);
}

export function sessionCookieValue(): string | null {
  const passcode = process.env.TPW_PASSCODE;
  return passcode ? sessionValue(passcode) : null;
}

export async function isTpwSignedIn(): Promise<boolean> {
  const expected = sessionCookieValue();
  const got = (await cookies()).get(TPW_COOKIE)?.value;
  if (!expected || !got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
