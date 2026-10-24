# ImpactLink — TPW Impact Framework

*From attendance sheets to evidence.*

Built for **Hack for Social Impact 2026** (Oct 24–25, Wefunder HQ, San Francisco),
Justice Reform track, with **Transformative Programming Works (TPW)**.

## The problem

California's corrections department spends under one percent of its budget on
rehabilitation [5]. TPW advocates for 120 community-based organizations (CBOs)
running programs in California prisons, but today those organizations can only
track **process data** — who enrolled, how long a class ran. The **outcome
data** — parole and recidivism records — lives in disjoint systems, so nobody
can prove the number that actually decides funding: *how many people did not
go back?* [5]

Meanwhile the published evidence is strong: people who earn rehabilitative
program credits are convicted again at far lower rates than people who earn
none — 45.6% with no credits, down to 21.1% for Rehabilitative Achievement
Credit earners [2] — against a statewide three-year conviction rate of 39.1%
[1]. Incarcerating one person in California costs $127,788 per year on
average ($21,534 at the margin) [3]. TPW reports its member organizations'
participants return to prison at 21% versus 44% statewide [4] — but without a
shared data framework, claims like these cannot be assembled, audited, or
compared across 120 organizations.

## What ImpactLink does

1. **Ingest** — each CBO uploads the spreadsheet it already has. An LLM
   proposes a mapping to a common schema; a human confirms it. Messy files
   are expected: three date formats, synonyms, duplicates, missing cells.
2. **Join without centralizing identity** — process records and outcome
   records are linked by a keyed hash (HMAC-SHA256) of the CDCR number — the
   one identifier both program sheets and state outcome systems record —
   computed locally by each data source with a network key TPW holds. Every
   import reports its match rate and lists unmatched records. The central
   database schema contains
   no name, birth-date, or case-number fields at all, and published
   aggregates suppress any group smaller than 10 people.
3. **Measure with the official yardstick** — rates follow CDCR's primary
   measure (conviction within three years of release) [1][2], so every
   number is directly comparable to the state's own reporting.
4. **Translate for funders** — impact is reported in two honest calibers:
   conservative savings at the LAO marginal cost ($21,534/person-year) and
   long-run capacity value at the average cost ($127,788/person-year) [3],
   with every assumption printed in the report footnote.
5. **Report in one click** — a one-page, funder-ready impact report a
   legislative staffer can read in two minutes.

## Run it locally

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push      # creates data/impactlink.db
npm run seed         # loads the validated synthetic demo dataset (full)
npm run seed:demo    # same, but holds out org-07/08 so the live demo can import them
npm run sanity       # verifies headline rate + credit-tier gradient vs anchors
npm test             # metrics engine unit tests (§7.2 worked example)
npm run dev          # http://localhost:3000  (organization form)
                     # http://localhost:3000/tpw  (TPW dashboard, passcode = TPW_PASSCODE in .env)
```

> **Prisma engine note:** if `prisma generate` fails to download engines
> (restricted network), download `schema-engine.gz` and
> `libquery_engine.so.node.gz` for your platform from
> `https://binaries.prisma.sh/all_commits/<commit>/<platform>/`, unpack them,
> and set `PRISMA_SCHEMA_ENGINE_BINARY` / `PRISMA_QUERY_ENGINE_LIBRARY` to
> the local paths before running generate / db push / seed. This sandbox's
> copies live in `.prisma-engines/` (git-ignored). See DECISIONS.md.

## Data disclosure

**Program-run data are real**: TPW's Collective Impact Report (aggregate counts per program run — no individuals, no identifiers), converted with `scripts/convert_tpw_xlsx.py` into `data/real/`. The outcome-linkage pages under "Future" use synthetic data, described below.


**All bundled data are synthetic.** Real individual-level recidivism records
cannot lawfully be handed out for a hackathon demo, so the demo dataset
(5,000 program participants across 8 fictional CBOs and 3 release cohorts,
plus a 2,000-person synthetic control group, seed = 42) is *calibrated* to
the published statistics cited below and validated against them
(see `../hsi-demo-data/validation_report.md`). Synthetic data is never
presented as real. In production, the same pipeline ingests organizations'
real records.

## References

All sources accessed 2026-10-23. Every headline number in the app and the
generated report carries one of these citation numbers (design doc §18).

[1] California Department of Corrections and Rehabilitation. *Recidivism Report for Individuals Released from CDCR in Fiscal Year 2019-20* (three-year conviction rate 39.1%; primary measure defined as conviction within a three-year follow-up). https://www.cdcr.ca.gov/research/offender-outcomes-characteristics/offender-recidivism/
[2] California Department of Corrections and Rehabilitation. *CDCR Recidivism Report Finds Recidivism Rates Drop* (FY2018-19 cohort 41.9%; any credit 39.2% vs no credit 45.6%; EMC 26.1%; RACC 21.1%). News release, 2024-02-13. https://www.cdcr.ca.gov/news/2024/02/13/cdcr-recidivism-report-finds-recidivism-rates-drop-2/
[3] California Legislative Analyst's Office. *How Much Does It Cost to Incarcerate a Person?* (average cost $127,788 per person-year; marginal cost $21,534 per person-year, 2025-26 budget). https://lao.ca.gov/policyareas/cj/6_cj_inmatecost
[4] Transformative Programming Works. Official website (120 organizations; CBO participant reincarceration 21% vs 44% statewide; $1 invested saves $5 in incarceration costs; 19,043 people reached). https://www.thetpw.org/
[5] Hack for Social Impact 2026. Event and track description (Justice Reform challenge text: under one percent of the corrections budget goes to rehabilitation; TPW can so far only track process data). https://luma.com/59t8euck
[6] Hack for Social Impact. Organizer website (past outcomes: Green Policy Agent presented at COP16; bild.ai accepted to YC and raised a $3M seed; Tenant Case Navigator grant-funded and deploying in legal clinics). https://www.hackforsocialimpact.com/

## Project docs

- Design document (frozen, agent-executable): `../hsi-tpw-design-doc.md`
- Strategy prep doc: `../hsi-tpw-prep.md`
- Data standard (the framework, usable without this software): `docs/data-standard.md`
- Framework files (measures, baselines, costs — every number cited): `config/frameworks/`
- Pilot plan / handover memo for TPW: `docs/pilot-plan.md`, `docs/handover-memo.md`
- Backlog: `docs/backlog.md`
- Decision log: `DECISIONS.md`
- Demo dataset + validation report: `../hsi-demo-data/`

## License

MIT (to be finalized with the M6 anti-graveyard checklist, design doc §17).
