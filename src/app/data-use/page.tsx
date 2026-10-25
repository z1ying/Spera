import Link from "next/link";

export const metadata = { title: "About & privacy — Spera" };

/**
 * About & privacy (design doc §28). Every privacy statement here describes
 * what the software does today, or says plainly where it doesn't yet.
 */
const PROMISES: { title: string; body: React.ReactNode }[] = [
  {
    title: "We count programs, not people.",
    body: <>No names, birth dates, CDCR or case numbers — ever. Only hours, how many took part and finished, where and when.</>,
  },
  {
    title: "Outside TPW, only totals.",
    body: <>TPW shares network totals only. In this pilot anyone can still open an organization&apos;s report; private links come next.</>,
  },
  {
    title: "We only report what you told us.",
    body: <>Missing numbers stay missing, never guessed. The grant assistant sees only your totals — review its drafts and disclose AI use to CDCR.</>,
  },
  {
    title: "You stay in control.",
    body: (
      <>
        To fix or remove anything, email{" "}
        <a href="mailto:info@thetpw.org" className="text-brand-800 underline">
          info@thetpw.org
        </a>
        .
      </>
    ),
  },
];

export default function AboutPrivacy() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">About</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Measuring programs, not people</h1>
      <div className="mt-6 space-y-6 text-lg leading-relaxed text-slate-600">
        <p>
          <strong className="font-semibold text-slate-800">Spera</strong> (Latin for <em>hope</em>) helps the people who run
          rehabilitation programs collect their program data easily, apply for grants, and show lawmakers what those programs
          deliver. It turns attendance records into evidence that funders and lawmakers can use.
        </p>
        <p>
          Spera was first designed for{" "}
          <a href="https://www.thetpw.org/" className="text-brand-800 underline" target="_blank" rel="noreferrer">
            Transformative Programming Works
          </a>
          , which advocates for about 120 community organizations running rehabilitation programs in California prisons. Spera
          helps TPW show who enrolled, who finished and how many hours of programming were delivered — and it is built so that
          outcome data can be linked later, to make the case for more rehabilitation funding and lower recidivism in California.
        </p>
      </div>

      <h2 className="mt-16 text-3xl font-semibold">Privacy</h2>
      <p className="mt-3 text-lg text-slate-600">Here is how we treat the information you share with us.</p>
      <ul className="mt-8 space-y-7">
        {PROMISES.map((p) => (
          <li key={p.title} className="border-l-4 border-sun-400 pl-5">
            <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
            <p className="mt-1 leading-relaxed text-slate-700">{p.body}</p>
          </li>
        ))}
      </ul>

      <Link href="/" className="mt-12 inline-block rounded-lg bg-brand-800 px-6 py-3 font-medium text-white hover:bg-brand-900">
        Submit your program data
      </Link>
    </main>
  );
}
