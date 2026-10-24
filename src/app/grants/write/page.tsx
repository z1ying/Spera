"use client";

import { OrgPicker, useOrgSummary } from "../../useOrg";
import ChatPanel from "../ChatPanel";

// "Write our application" — the grant-writing assistant, full page.
export default function GrantWrite() {
  const { orgs, org, setOrg, summary } = useOrgSummary();
  return (
    <>
      <h1 className="text-3xl font-semibold">Write our application</h1>
      <div className="mt-4">
        <OrgPicker orgs={orgs} org={org} setOrg={setOrg} />
      </div>
      <div className="mt-6">
        {summary ? <ChatPanel org={summary.org} /> : <p className="text-slate-500">Choose your organization to start.</p>}
      </div>
    </>
  );
}
