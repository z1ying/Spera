"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 print:hidden"
    >
      Print / save as PDF
    </button>
  );
}
