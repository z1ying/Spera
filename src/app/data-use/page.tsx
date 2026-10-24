import Link from "next/link";

export const metadata = { title: "How your data is used — ImpactLink" };

/**
 * One-screen, plain-language data-use promise (backlog 1c; design doc §23).
 * Each promise says how it is kept: by the software itself, or by the pilot
 * agreement with TPW. Nothing here claims more than the code enforces.
 */
const PROMISES: { promise: string; how: string; by: "software" | "agreement" }[] = [
  {
    promise: "We never receive names, birth dates or case numbers.",
    how: "The database has no place to store them.",
    by: "software",
  },
  {
    promise: "ID numbers are scrambled on your own computer before anything is sent.",
    how: "Your browser turns each ID into a code using a key from TPW. Only the codes are uploaded.",
    by: "software",
  },
  {
    promise: "No one is identified from a number we publish.",
    how: "Any group smaller than 10 people is shown as “<10”.",
    by: "software",
  },
  {
    promise: "Nothing you send is thrown away without telling you.",
    how: "Every upload gets a receipt listing each row that needs attention, and why.",
    by: "software",
  },
  {
    promise: "We measure programs, never people.",
    how: "There are no individual risk scores anywhere in ImpactLink.",
    by: "software",
  },
  {
    promise: "Your organization's own numbers are seen only by you and TPW.",
    how: "Anything shared outside is a total across the whole network.",
    by: "agreement",
  },
  {
    promise: "You get something back.",
    how: "A one-page report on your own program, ready for your grant applications.",
    by: "software",
  },
];

export default function DataUse() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">How your data is used</h1>
      <p className="mt-2 text-slate-600">In plain words — what ImpactLink promises every organization that shares data.</p>
      <ul className="mt-8 space-y-4">
        {PROMISES.map((p) => (
          <li key={p.promise} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium">{p.promise}</p>
            <p className="mt-1 text-sm text-slate-600">{p.how}</p>
            <p className="mt-2 text-xs text-slate-500">
              {p.by === "software" ? "Built into the software" : "Part of the pilot agreement with TPW"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-slate-600">
        Questions? Contact TPW. During the pilot, the ImpactLink team does your first upload with you.
      </p>
      <Link href="/import" className="mt-6 inline-block rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900">
        Bring in your data
      </Link>
    </main>
  );
}
