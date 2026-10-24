import { NextResponse } from "next/server";
import { SAMPLE_FILES } from "@/lib/importer";

export function GET() {
  return NextResponse.json(SAMPLE_FILES);
}
