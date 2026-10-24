# Backlog (updated 2026-10-24, after the pivot to real data — design doc §28)

The site runs on TPW's real program-run data: organization form at `/`, TPW dashboard at `/tpw`.

## Most important open problem: records start on paper

Most organizations track attendance on **paper sign-in sheets**. Reporting means a staff member counts from paper and types totals in — extra unpaid work. Options to explore (none built yet):

| Idea | What it removes | Watch out for |
|---|---|---|
| A printable one-page tally sheet that mirrors the web form, kept with the class binder | Hunting for numbers at reporting time | Still typed in later |
| Report at the end of each run, not on a schedule; the form asks only for what changed | Re-entering the whole run | Needs the "update" flow (exists, per browser) |
| A phone-friendly form opened from a QR code on the tally sheet | Getting to a computer | Phone layout not yet verified |
| Photo of the *tally* (not the sign-in sheet) read into the form for confirmation | Typing | Sign-in sheets carry names — never send those to an AI service |
| TPW or a volunteer enters for small organizations during the pilot | All of it, for those orgs | Doesn't scale; good for the first months |

Status: the form reduces the work (totals only, hours from schedule, update later) but does not solve paper. Recommended first step, on hold until TPW describes its sheets: a printable tally card mirroring the form + a QR code that opens the form pre-filled (org, program, prison).

Ask TPW: what does a typical sheet look like, who fills it, and when?

Also noted: TPW's participant-hours formula (completed × course length) is an estimate — completers may miss sessions; non-completers' partial hours count as 0. Kept for consistency with TPW's own figures.

## Next

- [ ] Grant assistant: add GEMINI_API_KEY, test real Gemma answers, tune the prompt; consider streaming replies.

- [ ] UI pass the user will specify (visual spec: `docs/design-style.md`).
- [ ] Verify the form on a phone; date entry in non-English browser locales.
- [ ] Rewrite pitch, Devpost, handover memo and pilot plan for the real-data product (marked outdated).
- [ ] Organization's own summary (its submitted runs and totals) as the "give back".
- [ ] TPW can add or change collected fields without code (config).

## Future

- Per-organization private links (security), instead of no sign-in. **Biggest current gap**: `/grants` shows any organization's totals by name; postponed by the user (2026-10-24).
- Organization budget field for RIGHT budget points (1–3), program type — if TPW wants them.
- Background music toggle — deferred.
- Outcome (recidivism) linkage — only once TPW chooses how records would be linked.
