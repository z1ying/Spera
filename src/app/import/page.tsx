import { isTpwSignedIn } from "@/lib/tpwAuth";
import LoginForm from "@/app/tpw/LoginForm";
import Link from "next/link";
import ImportWizard from "./ImportWizard";

export const metadata = { title: "Import data — ImpactLink" };

export const dynamic = "force-dynamic";

// Future: person-level import for outcome linkage (synthetic demo) — TPW staff only (§28).
export default async function ImportPage() {
  if (!(await isTpwSignedIn())) return <LoginForm />;
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Future: import person-level records</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Upload the spreadsheet you already keep, or an outcome export from another system. We propose how its columns
        map; you confirm; the receipt shows what was linked and every row that needs attention.{" "}
        <Link href="/data-use" className="text-emerald-800 underline">
          How your data is used
        </Link>
      </p>
      <div className="mt-8">
        <ImportWizard />
      </div>
    </main>
  );
}
