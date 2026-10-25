import Link from "next/link";

export const metadata = { title: "About & privacy — Spera" };

/**
 * About & privacy (design doc §28). Every privacy statement here describes
 * what the software does today, or says plainly where it doesn't yet.
 */
const PROMISES: { title: string; body: React.ReactNode }[] = [
  {
    title: "We count programs, not people.",
    body: (
      <>
        We never ask for names, birth dates, CDCR numbers or case numbers — not even in scrambled or hashed form, and there is
        no place in Spera to store them. We only ask for the shape of your program: hours, how many took part and finished,
        and where and when. Every result describes a program, never a person — there are no individual risk scores.
      </>
    ),
  },
  {
    title: "Anything shared outside the network is a total.",
    body: (
      <>
        TPW staff sign in to see the whole network, and anything TPW shares publicly adds up all organizations together. One
        honest note while Spera is a pilot: organization reports are open, so any visitor can view any organization&apos;s
        one-page report. Our next step is a private link for each organization, so only you and TPW see your numbers.
      </>
    ),
  },
  {
    title: "We only report what you told us.",
    body: (
      <>
        If a number is missing, it stays missing and is flagged for a follow-up — we never estimate it. The grant writing
        assistant sees only your program totals and the grant&apos;s rules; its drafts are a starting point that your team
        reviews, and CDCR asks you to disclose AI-assisted text.
      </>
    ),
  },
  {
    title: "You stay in control.",
    body: (
      <>
        If something you reported is wrong, or you&apos;d like it removed, TPW will correct or delete it. Just reach out at{" "}
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
