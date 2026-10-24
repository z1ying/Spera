> ⚠️ **Outdated (2026-10-24):** written for the earlier synthetic outcome-linkage demo, which has been removed. Current direction: design doc §28 (real TPW program-run data). Rewrite before use.

# ImpactLink — 90-day pilot plan (draft for TPW)

*Five organizations. Ninety days. One real cohort report TPW can take to Sacramento.*

Status: draft written at Hack for Social Impact 2026, before TPW's answers to our open questions. Items marked **[TPW]** depend on those answers.

## Goal

Produce the first impact report built from real records: program data from five TPW member organizations joined with outcome data, measured with CDCR's three-year conviction rate, with a published match rate.

## Success criteria

1. Five organizations complete their first upload, each with a receipt.
2. An outcome source is agreed and at least one outcome file is linked. **[TPW: which source]**
3. Match rate between program records and outcome records is reported (no target set in advance — the number itself is the finding).
4. Each pilot organization receives a one-page report on its own program.
5. TPW receives one network report for its policy work.

## Timeline

| Weeks | What happens | Who |
|---|---|---|
| 1–2 | Agree the shared identifier (CDCR number or TPW-issued ID) and who holds the network key **[TPW]**. Sign a one-page data-use agreement with each pilot org. Name a TPW contact. | TPW + team |
| 3–4 | **Concierge onboarding**: the team does each organization's first upload with them, on a call. Saved mappings make later uploads one click. | Team + each org |
| 5–8 | Request outcome records through the agreed channel **[TPW]**. Import them; publish the match rate; list unmatched records for follow-up. | TPW + team |
| 9–10 | Second upload from each organization (next quarter's records), using the remembered mapping. | Each org |
| 11–12 | Deliver per-organization reports and the network report. Review with TPW: what to change before scaling past five. | Team + TPW |

## What TPW needs to provide

- A named contact and five pilot organizations. **[TPW]**
- A decision on the shared identifier and who holds the network key. **[TPW]**
- An outcome data channel (e.g. a CDCR data request, parole reports, or organizations' own follow-up). **[TPW]**
- About two hours a week from one person acting as data steward.

## What the team provides

- Hosting of the pilot instance and the import wizard.
- First upload done with each organization.
- The data standard (`docs/data-standard.md`) and framework file, adjusted to what TPW decides.

## Risks and what we do about them

| Risk | Response |
|---|---|
| Organizations don't record CDCR numbers | TPW issues a shared ID and keeps the mapping (data standard §2) |
| Outcome data only available as totals | Report program-level process metrics and compare with published state rates; say plainly that individual linkage is not yet possible |
| Organizations keep paper records | Start with organizations that have spreadsheets; offer a blank template; paper capture stays on the roadmap |
| Participant consent | Agree a notice-and-objection process with TPW before any real records are imported |
| Low match rate | Publish it; it shows where data systems need work, which is itself useful evidence |

## Not in the pilot

Individual risk scores (never), live data feeds, case management.
