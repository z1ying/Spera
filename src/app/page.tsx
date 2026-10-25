import EntryTabs from "./EntryTabs";

// Home = submit data (design doc §28). Organizations are most of the users, so
// they land straight on it; no sign-in. TPW staff use the TPW switch top right.
export default function Home() {
  return (
    <main>
      <section className="px-6 pb-6 pt-24 text-center">
        <p className="mx-auto max-w-5xl font-serif text-4xl italic leading-snug text-slate-900 sm:text-[3.4rem] sm:leading-[1.4]">
          Every hour of programming you log becomes evidence that rehabilitation works.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">For program staff</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">Log your program in under a minute</h1>
        <p className="mt-4 text-lg text-slate-600">
          Tap the answers that fit. Estimates are fine. If you already keep a spreadsheet, upload it instead.
        </p>

        <div className="relative mt-10">
          <div className="relative z-10 -mb-3 flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-100/70 px-6 py-5 text-lg text-slate-900">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-brand-800" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Never upload names and case numbers.
          </div>
          {/* the sun rising from a horizon line, just under the callout */}
          <div className="relative h-12" aria-hidden>
            <svg viewBox="0 0 520 100" preserveAspectRatio="none" className="absolute bottom-1 left-[38%] h-12 w-[30rem]">
              <path d="M60 100A260 260 0 0 1 460 100Z" fill="#f6d77e" opacity="0.5" />
            </svg>
            <div className="absolute bottom-0 right-0 h-1.5 w-3/4 rounded-full bg-slate-200" />
          </div>
        </div>

        <div className="mt-8">
          <EntryTabs />
        </div>
      </section>
    </main>
  );
}
