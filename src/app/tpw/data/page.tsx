import { loadRuns } from "@/lib/loadRuns";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import { toWire } from "../wire";
import LoginForm from "../LoginForm";
import Explorer from "./Explorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data explorer — Spera" };

// TPW data explorer — design doc §28. Data only after the passcode check.
export default async function DataExplorer() {
  if (!(await isTpwSignedIn())) return <LoginForm />;
  return <Explorer wire={toWire(await loadRuns())} />;
}
