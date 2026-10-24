# Teammate Brief — ImpactLink (read this first, 3 minutes)

**The project in one line:** TPW advocates for 120 community organizations but can only track process data. We join program records (enrollment → completion → credits) with outcome records (arrest → conviction → return to custody) using privacy-safe keys, compute impact with CDCR's own metrics, and generate a one-page report funders and legislators can trust.

**Why it matters:** California spends under 1% of its corrections budget on rehabilitation [5]. Programs cut reincarceration from 44% to 21% [4] — but nobody can prove it in a budget hearing, because the two halves of the data never meet.

**What we can and can't claim:** CDCR's published gradient (no credits 45.6% → rehabilitation credits 21.1% [2]) says deeper participation goes with lower conviction rates. Our demo data is synthetic and calibrated to that gradient, so patterns in it (e.g. "dropouts ≈ never enrolled") are calibration artifacts, not findings — never pitch them as discoveries. The product's job is to let TPW test the gradient on its own network's real records.

## What is already done (homework before the event — research & foundation)

- Data research: all figures sourced from CDCR and the LAO, cited paper-style (design doc §18)
- Synthetic demo dataset: 5,000 participants, 8 orgs, 3 cohorts + 2,000 control, statistically validated against published CDCR rates (docs/analysis-01.md)
- Backend scaffold: database schema, seed, metrics engine, privacy module — tests passing (14/14)
- Design doc: full spec, API contracts, formulas, demo script, cut list (docs/design-doc.md)
- Pitch script: 4-minute Round 1 + 5-minute final version (docs/pitch-script.md)

## What we build together today

- M3 — Import wizard: any messy spreadsheet in (even Spanish headers), mapping confirmed by a human, validation receipt out
- M4 — Dashboard: the credit gradient chart, the completion funnel, cohort maturity labels
- M5 — Report page: one printable page, dual cost calibers, methodology footnote, sources on the page
- Tomorrow: polish + rehearsal only. Feature freeze Sunday 12:00, Devpost due 15:00 sharp.

## Roles we need

- Frontend (the big one today): import wizard + dashboard + report page
- Presenter: pitch is 4 min + 1 min Q&A on Sunday; script is written, delivery is the job
- Grace: data pipeline, metrics correctness, report numbers

## House rules (non-negotiable, they are our edge)

1. Every number shown anywhere needs a published source. No invented statistics, ever.
2. Definitions are locked (e.g. "completion", CDCR's 3-year conviction rate). Changing one means editing the design doc first.
3. Honest framing: association + dose-response, not claimed causation. Marginal cost is the headline saving; average cost is labeled capacity caliber.
4. If we run out of time, cut in the design doc's order (§12) — never cut join correctness or metric definitions.

Questions, better ideas, disagreements: say them out loud. The design doc is a starting point, not a cage — but changes get written into it the same hour.
