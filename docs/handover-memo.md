> ⚠️ **Outdated (2026-10-24):** written for the earlier synthetic outcome-linkage demo, which has been removed. Current direction: design doc §28 (real TPW program-run data). Rewrite before use.

# Handover memo — Spera for TPW

**To:** Transformative Programming Works · **From:** the Spera team (Hack for Social Impact 2026) · **Date:** October 2026

## What it is

Spera joins the two halves of the evidence TPW needs: **program records** from member organizations (who enrolled, who completed, credits earned) and **outcome records** from other systems (convictions, returns to custody, parole events). It measures impact with CDCR's own three-year conviction rate and produces a one-page report with both a conservative and a long-run cost figure, every number sourced.

## How an organization submits data (three steps)

1. **Upload** the spreadsheet it already keeps — any column names, English or Spanish. If the sheet holds CDCR numbers, the browser scrambles them before anything is sent.
2. **Confirm** the suggested column mapping (once; next quarter it is remembered).
3. **Read the receipt**: match rate, rows imported, every problem row with its reason.

Each organization can then print a one-page report on its own program.

## What TPW gets

- A network overview: participation funnel, the credit-tier gradient next to CDCR's published rates, release cohorts with follow-up status, data quality grade per organization.
- A one-page report for legislators and funders, with methodology and sources printed on the page.

## What is decided vs. open

| Decided | Open — needs TPW |
|---|---|
| No names, birth dates or case numbers stored | Which identifier links records (CDCR number or a TPW-issued ID) |
| Groups under 10 people never shown | Who holds the network key |
| Conservative cost figure leads | Where outcome data comes from |
| Measures programs, never individuals | Whether TPW reports conviction or return-to-prison as its headline |

## Where things are

- Code and setup: the GitHub repository README.
- The rules, usable without our code: `docs/data-standard.md`.
- Jurisdiction settings (measures, baselines, costs — each cited): `config/frameworks/`.
- Pilot plan: `docs/pilot-plan.md`.

## Important

Everything in the demo is **synthetic data**, calibrated to published CDCR statistics. No real personal data has been used.
