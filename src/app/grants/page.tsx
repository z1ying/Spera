import { daysUntil, GRANTS, roundsOf } from "@/lib/grants";
import GrantExplorer from "./GrantExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grants — Spera" };

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// Grants overview (design doc §28): CDCR's five grant programs as cards; the
// selected one (RIGHT by default, which has the open RIGHT 4.0 round) below.
export default function GrantsOverview() {
  const items = GRANTS.types.map((type) => ({
    type,
    rounds: roundsOf(type.id).map((r) => ({
      ...r,
      daysLeft: r.dueDate ? daysUntil(r.dueDate) : null,
      dueLabel: r.dueDate ? longDate(r.dueDate) : null,
    })),
  }));
  const open = GRANTS.grants.find((g) => g.status === "open");

  return (
    <>
      <GrantExplorer items={items} />
      <p className="mt-8 text-xs text-slate-500">
        Checked against{" "}
        <a href={GRANTS.sourceUrl} className="underline" target="_blank" rel="noreferrer">
          CDCR&apos;s grant programs page
        </a>{" "}
        on {longDate(GRANTS.verifiedOn)}. The official RFA always decides.
        {open?.links?.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ml-2 underline">
            {l.label}
          </a>
        ))}
      </p>
    </>
  );
}
