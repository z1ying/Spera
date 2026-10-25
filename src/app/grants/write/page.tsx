"use client";

import { OrgPicker, useOrgSummary } from "../../useOrg";
import ChatPanel from "../ChatPanel";

// "Write our application" — the grant-writing assistant, full page.
export default function GrantWrite() {
  const { org, found, setOrg, summary } = useOrgSummary();
  return (
    <>
      <h1 className="text-3xl font-semibold">Write our application</h1>
      <div className="mt-4">
        <OrgPicker org={org} found={found} setOrg={setOrg} />
      </div>
      <div className="mt-6">
        {summary ? <ChatPanel org={summary.org} /> : <p className="text-slate-500">Choose your organization to start.</p>}
      </div>
    </>
  );
}
