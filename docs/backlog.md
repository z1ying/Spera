# Backlog — the two adoption pain points (2026-10-24)

Main flow (import → overview → one-page report) is built: M3–M5 done.
These items make it easier for small, unpaid organizations to take part.
Order = recommended build order. ✅ = done.

## Blocking first

- [x] **Merge with the teammate's commits on origin/main and push.** Done 2026-10-24 (key reconciled: CDCR number or TPW-issued ID).

## Pain point 1 — why would a small organization share its data?

| # | Item | Type | Size |
|---|---|---|---|
| 1a | ✅ Per-organization report (`/report?org=`): an org gets a funder-ready report on its own program | code | done |
| 1b | ✅ Hash the identifier column **in the browser** before upload, so raw IDs never leave the org's computer and no separate tool is needed | code | ~1.5 h |
| 1c | ✅ One-screen, plain-language "How your data is used" promise, linked from the import page | code + copy | ~30 min |
| 1d | Visibility rule in the product: an org view that shows only its own data plus network aggregates | code | ~1.5 h |
| 1e | Concierge onboarding: the team does each pilot org's first import with them | pilot plan / pitch | — |
| 1f | Say honestly that the network benchmark starts from CDCR anchors + 5 pilot orgs and grows | pitch | — |

## Pain point 2 — input must be very easy

| # | Item | Type | Size |
|---|---|---|---|
| 2a | Spanish toggle for the import wizard UI | code | ~1 h |
| 2b | ✅ "Download a blank template" (English / Spanish headers) for orgs starting from scratch | code | ~20 min |
| 2c | Type-it-in grid for orgs with no spreadsheet — **only if TPW confirms paper sign-in sheets** | code | ~2 h |
| 2d | Usability check: someone new to the system finishes the Spanish import in under 3 minutes | test | ~15 min |
| 2e | Verify Gemini mapping once a key is available; record the offline cache | code | ~10 min |
| 2f | Photo/paper capture | roadmap only (names on paper must not reach an LLM) | — |

## Waiting on TPW answers

- Do organizations record the CDCR number? If not, who would issue a shared ID? (decides the join key)
- Excel, Google Sheets, or paper? (decides 2c)
- What would organizations most want back from TPW? (sharpens 1a)

## Other open checks

- ✅ Report fits on one printed page (verified with headless Chrome PDF, chart included).
- Report prints the match rate next to the headline (teammate's data-standard proposal).
- ✅ Pilot plan, handover memo, Devpost draft written (`docs/pilot-plan.md`, `docs/handover-memo.md`, `docs/devpost.md`).
- Pitch: add the per-org report line ("every organization gets back a report on its own program").
