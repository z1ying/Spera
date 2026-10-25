import Link from "next/link";

export const metadata = { title: "About & privacy — Spera" };

/**
 * About & privacy (design doc §28). Every privacy statement here describes
 * what the software does today, or says plainly where it doesn't yet.
 */

export default function AboutPrivacy() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">About</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Measuring programs, not people</h1>
      <div className="mt-6 space-y-6 text-base leading-relaxed text-slate-600">
        <p>
          <strong className="font-semibold text-slate-800">Spera</strong> (Latin for <em>hope</em>) helps the people who run
          rehabilitation programs collect their program data easily, apply for grants, and show lawmakers what those programs
          deliver. It turns attendance records into evidence that funders and lawmakers can use.
        </p>
        <figure className="border-l-4 border-sun-400 pl-5">
          <blockquote className="font-serif text-xl italic text-slate-800">
            &ldquo;I began to experience hope, and rediscover something to live for.&rdquo;
          </blockquote>
          <figcaption className="mt-1 text-sm text-slate-500">— Participant in a TPW member program. That hope is where Spera&apos;s name comes from.</figcaption>
        </figure>
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

      <h2 className="mt-14 text-2xl font-semibold">Privacy</h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
        <strong className="font-semibold text-slate-900">We count programs, not people:</strong> no names, birth dates, CDCR or case
        numbers — only hours, how many took part and finished, where and when. TPW shares network totals only; in this pilot anyone
        can still open an organization&apos;s report, and private links come next. Missing numbers stay missing, never guessed. The
        grant assistant sees only your totals, so review its drafts and disclose AI use to CDCR. To fix or remove anything, email{" "}
        <a href="mailto:info@thetpw.org" className="text-brand-800 underline">
          info@thetpw.org
        </a>
        .
      </p>

      <Link href="/" className="mt-12 inline-block rounded-lg bg-brand-800 px-6 py-3 font-medium text-white hover:bg-brand-900">
        Submit your program data
      </Link>
    </main>
  );
}
