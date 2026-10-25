import Link from "next/link";

export const metadata = { title: "About & Privacy — Spera" };

/**
 * One-screen, plain-language data-use promise (backlog 1c; design doc §23).
 * Each promise says how it is kept: by the software itself, or by agreement
 * with TPW. Nothing here claims more than the code enforces (design doc §28).
 */
const PROMISES: { promise: string; how: string; by: "software" | "agreement" }[] = [
  {
    promise: "We collect counts, never people.",
    how: "The form asks how many took part and how many completed — no names, ID numbers or birth dates, anywhere.",
    by: "software",
  },
  {
    promise: "Only TPW staff can see the network dashboard.",
    how: "It sits behind a TPW sign-in. Organizations submitting a program never see other organizations' numbers.",
    by: "software",
  },
  {
    promise: "Outside TPW, your numbers appear only as network totals.",
    how: "Anything TPW shares publicly adds up all organizations together.",
    by: "agreement",
  },
  {
    promise: "Nothing you send is changed or guessed.",
    how: "If a number is missing it stays missing and is flagged for a follow-up, instead of being filled in for you.",
    by: "software",
  },
  {
    promise: "Mistakes can be fixed.",
    how: "Contact TPW and they will correct a program you reported.",
    by: "agreement",
  },
];

export default function DataUse() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">About &amp; Privacy</h1>
      <p className="mt-2 text-slate-600">
        <strong>Spera</strong> — from attendance to evidence. Community organizations report the programs they run in California
        prisons; TPW turns those counts into evidence for funding. Here is what we promise about your data.
      </p>
      <ul className="mt-8 space-y-4">
        {PROMISES.map((p) => (
          <li key={p.promise} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium">{p.promise}</p>
            <p className="mt-1 text-sm text-slate-600">{p.how}</p>
            <p className="mt-2 text-xs text-slate-500">
              {p.by === "software" ? "Built into the software" : "Agreed with TPW"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-slate-600">
        Questions? Contact TPW.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900">
        Report a program
      </Link>
    </main>
  );
}
