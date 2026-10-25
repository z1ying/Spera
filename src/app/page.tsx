import EntryTabs from "./EntryTabs";
import RecordSwitch from "./RecordSwitch";
import RisingSun from "./RisingSun";

// Home = submit data (design doc §28). Organizations are most of the users, so
// they land straight on it; no sign-in. TPW staff use the TPW switch top right.
// "Current records" | "Past records (retroactive)" sits at the top.
export default function Home() {
  return (
    <main>
      <RecordSwitch
        current={
          <>
            <section className="px-6 pb-6 pt-14 text-center">
              <p className="mx-auto max-w-4xl font-serif text-3xl italic leading-snug text-slate-900 sm:text-[2.5rem] sm:leading-[1.35]">
                Every hour of programming you log becomes evidence that rehabilitation works.
              </p>
              <figure className="mx-auto mt-8 max-w-2xl">
                <blockquote className="font-serif text-lg italic text-slate-700">
                  &ldquo;I began to experience hope, and rediscover something to live for.&rdquo;
                </blockquote>
                <figcaption className="mt-1 text-sm text-slate-500">— Participant in a TPW member program</figcaption>
              </figure>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">For program staff</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Log your program in under a minute</h1>
              <p className="mt-3 text-base text-slate-600">
                Tap the answers that fit. Estimates are fine. If you already keep a spreadsheet, upload it instead.
              </p>

              <div className="relative mt-6">
                <div className="relative z-10 -mb-3 inline-flex items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-100/80 px-4 py-2 text-sm text-slate-900">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-800" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Never upload names and case numbers.
                </div>
                {/* the sun on the horizon drifts with the page as you scroll */}
                <RisingSun />
              </div>

              <div className="mt-8">
                <EntryTabs />
              </div>
            </section>
          </>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pb-40 pt-12">
        <blockquote className="border-l-4 border-sun-400 pl-6">
          <p className="font-serif text-xl italic leading-relaxed text-slate-900 sm:text-2xl">
            &ldquo;The class gave me something to wake up for. I finished it, and I finished my GED the same year.&rdquo;
          </p>
          <footer className="mt-3 text-sm text-slate-600">
            A program participant (illustrative)
          </footer>
        </blockquote>
      </section>
    </main>
  );
}
