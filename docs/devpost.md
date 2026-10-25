> ⚠️ **Outdated (2026-10-24):** written for the earlier synthetic outcome-linkage demo, which has been removed. Current direction: design doc §28 (real TPW program-run data). Rewrite before use.

# Devpost draft — Spera

*Draft. Update numbers and the "Built with" list after the final run-through; remove Gemini if it was not verified live.*

**Name:** Spera

**Tagline:** From attendance sheets to evidence — joining program records with outcomes so TPW can prove what works.

**Track / partner:** Justice Reform · Transformative Programming Works (TPW)

## Inspiration

California spends under one percent of its corrections budget on rehabilitation [5]. TPW advocates for 120 community organizations whose programs inside prisons are associated with much lower reincarceration [4], but today TPW can only track process data — who enrolled, how long a class ran. The outcome half lives in other systems, so the two never meet.

## What it does

- **Joins disjoint records.** Program sheets and outcome exports are linked on a keyed hash of a shared identifier; raw IDs are hashed in the organization's own browser. Every import shows its match rate and lists every unmatched record.
- **Asks nothing new of organizations.** Upload the spreadsheet you already have — any headers, English or Spanish, three date formats. Confirm the mapping once; next quarter's file maps itself.
- **Measures with the state's yardstick.** CDCR's three-year conviction rate [1], with the credit-tier gradient shown next to CDCR's published rates [2].
- **Reports honestly.** A one-page report with a conservative (marginal cost) and a long-run (average cost) figure [3], printed assumptions, and association-not-causation language.
- **Gives back.** Every organization can print a report on its own program for its grant applications.
- **Is a framework, not just an app.** A written data standard and a framework file hold every jurisdiction-specific choice; the software refuses any number without a citation.

## How we built it

Next.js (App Router) + TypeScript, Prisma + SQLite, Recharts, Tailwind CSS. Web Crypto (HMAC-SHA256) for in-browser hashing. Gemini API for column-mapping suggestions, with a rule-based fallback.

## Challenges

The hard part was not the math: it was making a join that could work in the real world without centralizing identity, and making submission easy enough for small, unpaid organizations.

## What's next

A 90-day pilot with five TPW organizations (`docs/pilot-plan.md`), pending TPW's decisions on the shared identifier and the outcome data source.

## Data disclosure

All demo data are synthetic, calibrated to published CDCR and TPW statistics. No real personal data was used.

## References

[1] CDCR, Recidivism Report, FY2019-20 · [2] CDCR news release, 2024-02-13 · [3] LAO, cost to incarcerate, 2025-26 · [4] TPW website · [5] Hack for Social Impact 2026 track description. Full citations in the README.
