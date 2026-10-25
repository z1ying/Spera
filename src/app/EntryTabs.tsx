"use client";

import { useState } from "react";
import RunForm from "./RunForm";
import UploadSheet from "./UploadSheet";

/** Two ways to submit: tap through one program, or upload the spreadsheet you keep. */
export default function EntryTabs() {
  const [tab, setTab] = useState<"quick" | "upload">("quick");
  const btn = (id: "quick" | "upload", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-xl px-5 py-2.5 text-base ${tab === id ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="How to submit" className="inline-flex gap-1 rounded-2xl bg-slate-200/60 p-1.5">
        {btn("quick", "Quick entry")}
        {btn("upload", "Upload a spreadsheet")}
      </div>
      <div className="mt-6">{tab === "quick" ? <RunForm /> : <UploadSheet />}</div>
    </div>
  );
}
