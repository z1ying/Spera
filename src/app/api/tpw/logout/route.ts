import { NextResponse } from "next/server";
import { TPW_COOKIE } from "@/lib/tpwAuth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(TPW_COOKIE);
  return res;
}
