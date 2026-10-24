import ImportWizard from "./ImportWizard";

export const metadata = { title: "Import data — ImpactLink" };

// Import wizard — design doc §6 / §8 (M3): upload → confirm mapping → receipt.
export default function ImportPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Bring in your data</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Upload the spreadsheet you already keep, or an outcome export from another system. We propose how its columns
        map; you confirm; the receipt shows what was linked and every row that needs attention.
      </p>
      <div className="mt-8">
        <ImportWizard />
      </div>
    </main>
  );
}
