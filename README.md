# ImpactLink — program reporting for TPW's network

*A minute to report a program. One place for TPW to see it all.*

Built for **Hack for Social Impact 2026** (Oct 24–25, Wefunder HQ, San Francisco),
Justice Reform track, with **Transformative Programming Works (TPW)**.

## The problem

California's corrections department spends under one percent of its budget on
rehabilitation [1]. TPW advocates for 120 community-based organizations that
run programs inside California prisons [2]. To make that case — and to apply
for state grants — TPW needs to know how much programming its members deliver:
programming hours, participants, completions. Today those numbers arrive in a
shared spreadsheet, mostly copied from paper sign-in sheets, by organizations
that are not paid to report.

## What ImpactLink does

- **Organizations report a program run in about a minute** — no sign-in, mostly
  clicks: organization, program, prison, status, dates, hours (or let it work
  them out from the schedule), how many took part and completed. It never asks
  for names or ID numbers.
- **TPW sees the network** (staff sign-in): TPW's five core fields — total
  programming hours, participants, participants completed, total participant
  programming hours (completed × hours) and program year — by year,
  organization and prison, plus a follow-up list of runs with missing numbers.
- **Grants page for organizations**: CDCR's open RIGHT Grant 4.0 (due
  Nov 30, 2026) — eligibility and points checked against the organization's
  own reported programs, plus the numbers it can cite in its application [3].
  Prisons are flagged when RIGHT 4.0 lists them as underserved.
- **Nothing guessed**: a missing number stays missing and is flagged.

## Data

The data are **real**: TPW's *Collective Impact Report* workbook — one row per
program run, aggregate counts only, no individuals and no identifiers —
converted with `scripts/convert_tpw_xlsx.py` into `data/real/`. Published with
TPW's permission. The workbook itself is not committed.

## Run it locally

```bash
npm install
cp .env.example .env     # then set TPW_PASSCODE
npm run db:generate
npm run db:push          # creates data/impactlink.db
npm run seed             # loads data/real (also clears form submissions)
npm test
npm run dev              # http://localhost:3000      organization form
                         # http://localhost:3000/tpw  TPW dashboard
```

To refresh from a new copy of TPW's workbook:

```bash
python3 -I scripts/convert_tpw_xlsx.py "TPW - Collective Impact Report.xlsx"
```

> **Prisma engine note:** if `prisma generate` cannot download engines on a
> restricted network, see DECISIONS.md (2026-10-23).

## Project docs

- Design document: `docs/design-doc.md` (current direction: §28)
- Data standard: `docs/data-standard.md`
- Backlog: `docs/backlog.md` · Decision log: `DECISIONS.md`
- UX and visual specs: `docs/ux-spec.md`, `docs/design-style.md`
- Pilot plan / handover memo: `docs/pilot-plan.md`, `docs/handover-memo.md`

## References

[1] Hack for Social Impact 2026. Event and Justice Reform track description. https://luma.com/59t8euck
[2] Transformative Programming Works. Official website. https://www.thetpw.org/
[3] California Department of Corrections and Rehabilitation. *Request for Applications: Rehabilitative Investment Grants for Healing and Transformation (RIGHT) Grant 4.0*, released 2026-10-01. https://www.cdcr.ca.gov/rehabilitation/wp-content/uploads/sites/173/2026/09/RIGHT-4.0-RFA.pdf

## License

MIT.
