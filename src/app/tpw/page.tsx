import { loadRuns } from "@/lib/loadRuns";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import Dashboard, { type WireRun } from "./Dashboard";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "TPW dashboard — Spera" };

// TPW dashboard — design doc §28. The data is loaded only after the passcode
// check; filtering and charts run in the browser (Dashboard).
export default async function TpwDashboard() {
  if (!(await isTpwSignedIn())) return <LoginForm />;
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  const wire: WireRun[] = (await loadRuns()).map((r) => ({
    ...r,
    startDate: iso(r.startDate),
    endDate: iso(r.endDate),
    submittedAt: iso(r.submittedAt),
  }));
  return <Dashboard wire={wire} />;
}
