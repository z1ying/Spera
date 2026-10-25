import { NextResponse } from "next/server";
import { TPW_COOKIE } from "@/lib/tpwAuth";

/**
 * Sign TPW staff out. A form post (the Sign out button) is sent home; a
 * background call (leaving the TPW pages, see SiteHeader) just gets 204.
 */
export async function POST(req: Request) {
  const res = req.headers.get("x-spera-silent")
    ? new NextResponse(null, { status: 204 })
    : NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(TPW_COOKIE);
  return res;
}
