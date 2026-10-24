import RunForm from "./RunForm";

// Home = the organization form (design doc §28). Organizations are most of the
// users, so they land straight on it; no sign-in. TPW staff sign in top right.
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">Transformative Programming Works</p>
      <h1 className="mt-1 text-3xl font-semibold">Report a program</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        One program run at a time — about a minute. Your numbers help TPW show Sacramento how much programming community
        organizations deliver.
      </p>
      <div className="mt-8">
        <RunForm />
      </div>
    </main>
  );
}
