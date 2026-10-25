> ⚠️ **Outdated (2026-10-24):** written for the earlier synthetic outcome-linkage demo, which has been removed. Current direction: design doc §28 (real TPW program-run data). Rewrite before use.

# Spera — The Idea (show this to your teammate)

## One line

TPW advocates for 120 community organizations, but it cannot prove their programs work — because the data that would prove it is split in two. Spera joins the two halves and turns them into evidence a legislator can trust.

## The problem

- California spends under 1% of its corrections budget on rehabilitation.
- It costs $127,788 a year to keep one person in prison (Legislative Analyst's Office).
- Community programs cut the return-to-prison rate from 44% to 21% (TPW's own figures).
- But when TPW goes to Sacramento to ask for funding, all it can show is attendance: who enrolled, how long a class ran.
- The reason is structural, not technical. Half the evidence lives in spreadsheets at 120 small organizations: enrollment, attendance, completion, credits. The other half lives in state systems: arrests, convictions, returns to custody. Those two halves never meet, so no one can answer the only question that matters: which programs actually keep people from going back?

## What the public evidence already says (and what it can't)

- CDCR's own published numbers show a dose-response gradient: the deeper the participation, the lower the three-year conviction rate — no credits 45.6%, any credit 39.2%, education credits 26.1%, rehabilitation credits 21.1% [2].
- What nobody can show today is whether that holds for TPW's network, organization by organization and program by program — because the process half and the outcome half of the data never meet.
- Our demo dataset is synthetic and calibrated to these published rates, so any pattern in it (for example, dropouts looking like non-participants) reflects the calibration, not a discovery. We never present it as a finding. With real records, Spera is how TPW would find out.

## The product (a website, three parts)

**1. Import wizard — for program staff at the 120 organizations.**
- They drag in whatever spreadsheet they already have — even Spanish headers, mixed date formats, duplicate rows.
- The system proposes how each column maps to the standard fields; a human confirms with one click.
- It then returns a receipt: rows accepted, duplicates merged, problem rows listed and explained — never silently dropped.
- Next quarter, the mapping is remembered, so importing gets easier every time.
- This is the key design decision: the system adapts to the organizations, not the other way around.

**2. Dashboard — for TPW's management and policy team.**
- Headline numbers: participants, completion rate, and the gap versus the statewide baseline.
- The credit gradient chart: the single most persuasive image in the product.
- The funnel: enrolled → completed → credited, so TPW can see exactly where people fall out.
- Cohort tables with maturity labels: a cohort whose three-year follow-up is not finished is marked "still maturing," so no one compares immature numbers with mature ones.

**3. One-page report — for legislators and funders.**
- One printable page: the conclusion, the gradient chart, the funnel summary, and the savings in two calibers.
- The conservative saving uses the marginal cost of incarceration ($21,534 per person-year) — the number next year's budget can actually save.
- The long-run capacity figure ($127,788) is shown too, clearly labeled as such.
- A methodology footnote and full source citations sit on the page itself, so a skeptical policy aide cannot poke a hole in it.

## Privacy and trust (the part that makes organizations willing to share)

- No names, dates of birth, or case numbers are ever stored. Participants are identified only by a hashed pseudonymous key that cannot be reversed.
- Each organization sees only its own data plus network-wide aggregates. No single organization's numbers are shown to outsiders.
- Small groups (fewer than 10 people) are suppressed, so no individual can be identified from a statistic.
- These rules are built into the system, not promised in a document — that is what earns the organizations' trust.

## Why this is honest (and why honesty is the edge)

- We report association plus a dose-response gradient, not claimed causation. The framework is designed so matched comparisons can be added later.
- We never present synthetic demo data as real data. Every demo number is labeled, and every real-world figure carries its published source.
- We do not build individual risk scores. This tool measures programs, not people.

## The weekend plan

- Today: build the three screens (import wizard, dashboard, report page) on top of an already-built and tested backend.
- Tomorrow: polish, rehearse, and submit. Feature freeze Sunday 12:00, Devpost submission by 15:00 sharp.
- Pitch: 4 minutes + 1 minute Q&A in Round 1; 5 minutes if we reach the finals.

## The ask (what we want from TPW)

Five pilot organizations, ninety days, one real cohort report — evidence TPW can take to Sacramento.

## Why this wins

- A real partner with a real, stated problem — not a solution looking for a problem.
- A working demo with a live messy-sheet import, not slides.
- Numbers that survive scrutiny, because they use the state's own definitions and the state's own cost figures.
- A deployment path that continues after the weekend, instead of ending in a GitHub graveyard.
