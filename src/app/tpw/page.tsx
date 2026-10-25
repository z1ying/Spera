import { prisma } from "@/lib/db";
import { loadRuns } from "@/lib/loadRuns";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import Dashboard from "./Dashboard";
import LoginForm from "./LoginForm";
import { toWire } from "./wire";

export const dynamic = "force-dynamic";
export const metadata = { title: "TPW dashboard — Spera" };

// TPW dashboard — design doc §28. The data is loaded only after the passcode
// check; filtering and charts run in the browser (Dashboard).
export default async function TpwDashboard() {
  if (!(await isTpwSignedIn())) return <LoginForm />;
  const [runs, facilities] = await Promise.all([loadRuns(), prisma.facility.findMany({ orderBy: { code: "asc" } })]);
  return <Dashboard wire={toWire(runs)} facilities={facilities} />;
}
