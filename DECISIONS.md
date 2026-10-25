# DECISIONS.md — execution decision log (design doc §0/§11)

One line per milestone: time, acceptance result, deviations. Locked decisions
(design doc §2) are never changed silently — deviations go here first.

## 2026-10-23 (Fri evening) — M1 scaffold pulled forward from Saturday

Built ahead of the weekend at the user's request: repo scaffold, Prisma
schema (§4), seed from the validated M0 CSVs, metrics engine (§7) + unit
tests (§7.4), privacy module (§4.1/§7.3), placeholder home page.
UI beyond the placeholder is out of scope tonight (M3–M6 remain).

Deviations / adaptations from the design doc (all data-shape, no locked
stack, metric, or anchor changes):

1. **Seed source**: `scripts/seed.ts` loads the EXISTING validated CSVs in
   `../hsi-demo-data/` instead of regenerating. The §3 TypeScript generator
   (`generate_synthetic.ts` / `validate_synthetic.ts`) was NOT recreated:
   the M0 Python generator + `validation_report.md` (all §5.4 gates green)
   already exist and are the frozen artifacts.
2. **Enrollment credits**: `enrollments.csv` splits credits into
   `credits_mcc` / `credits_racc` / `credits_emc` columns; §4 stores a single
   JSON object `{"MCC","RACC","EMC"}`. The seed assembles the JSON.
3. **Program types**: CSVs use title-case labels ("Substance Use"); §4 locks
   a lowercase enum. The seed normalizes
   (Education→education, Vocational→vocational, Substance Use→sud,
   Restorative Justice→restorative, Reentry Support→reentry).
4. **Participants file**: `participants.csv` holds 7,000 rows = 5,000 program
   participants + the 2,000-person synthetic control group (§5.2). All are
   seeded; control members are exactly the participants with no enrollments.
   The headline cohort ("participants", §6/§15) is the enrolled 5,000.
   The §4 schema has no control flag — none was invented.
5. **Conviction window at year granularity**: participants carry only
   `release_year` (§4). The generator releases people in H1 of the release
   year and records events up to release + 1095 days, so the metrics engine
   operationalizes "within 3 years" (§7.1) as event year within
   releaseYear + 3. Documented in `src/lib/metrics.ts`.
6. **participant_key length**: §4.1 specifies full SHA-256 hex; the privacy
   module implements the full form. The M0 demo CSVs carry 16-hex-char
   truncated keys from the Python generator — seeded as-is.
7. **Enrollment status values**: source data uses only `completed` /
   `dropped`; the schema stays TEXT per §4, so `enrolled` remains valid
   for live imports.

Verification results are appended below as they land.

## 2026-10-23 — Verification results (all green)

- `npm install`: 178 packages. **next bumped 15.5.0 → 15.5.28** (15.5.0 and
  15.5.7 both carry deprecation warnings for CVE-2025-66478 and the
  2025-12-11 follow-up advisory; 15.5.28 is the latest patched 15.5.x and
  installs clean). Same major/minor line as the §2 lock — not a stack change.
- **Prisma engines**: Node in this sandbox cannot reach binaries.prisma.sh
  (TLS disconnect; curl via the egress proxy works). schema-engine +
  libquery_engine (commit 1c57fdc, debian-openssl-3.0.x) were downloaded with
  curl into `.prisma-engines/` (git-ignored) and used via
  `PRISMA_SCHEMA_ENGINE_BINARY` / `PRISMA_QUERY_ENGINE_LIBRARY`. On an
  unrestricted network, plain `npx prisma generate` needs none of this.
- `prisma generate` + `db push`: OK, `data/spera.db` created.
- `npm run seed`: organizations 8, programs 25, participants 7,000,
  enrollments 5,000, outcomes 8,068, cost_params 3 — matches source CSVs.
- `npm test`: 14/14 pass (12 metrics incl. the §7.2 worked example at 0.5%
  tolerance, empty-cohort null, follow-up exclusion, tier filtering,
  small-cell suppression; 2 privacy).
- `npm run sanity`: ALL PASS — participants overall 3-yr conviction 38.5%
  (n=5,000) < 39.1% statewide; tiers none 46.0% / any 38.2% / emc 25.3% /
  racc 21.7% vs anchors 45.6 / 39.2 / 26.1 / 21.1 (deviations 0.4–1.0pp,
  inside the ±2pp gate); control group 46.9% (info only, uncalibrated).
- `npm run build`: OK — placeholder home page prerenders statically.

Remaining for Saturday (unchanged from §11): M3 import wizard + Gemini
mapping, M4 dashboard, M5 report page, M6 polish + §17 anti-graveyard list.

- 2026-10-23: Demo data vendored into `data/demo-data/` so the repo is self-contained; seed default path updated (SEED_DATA_DIR still overrides). Docs (design doc v1.3, prep, analysis brief #01) added under `docs/`. First push to github.com/z1ying/impacklink via repo deploy key.

## 2026-10-24 (Sat) — v1.6 join credibility, v1.7 framework, M3 import wizard

Design changes (written into the design doc first: §4.1, §6.1, §25, §26 — renumbered after merging the teammate's §23–§24):
- participant_key = HMAC-SHA256(network key, normalized CDCR number). The old
  org-local-ID + org-salt key could never match outcome systems.
- Every import receipt shows the match rate; outcome files split it into
  "linked to a program participant" vs "no enrollment on file".
- Pitch/briefs: synthetic calibration patterns ("dropouts ≈ never enrolled")
  are no longer presented as findings.
- Framework config (`config/frameworks/*.json`): identifier, events (adds
  parole_violation / parole_discharge), measure, credits, anchors, baselines,
  costs. Validator rejects any number without a citation. `docs/data-standard.md` added.

M3 acceptance (§11: "3 sample sheets import and receipt lists issues") — PASS:
- Q1 (Spanish, half of C) → 824 rows, 221 new, 14 dupes merged, 510 already on
  file (org-01), 79 held back and listed; 100% match; Comunidad Fuerte and
  Liberty Learning Lab C → B.
- D (external outcomes) → 2,863 rows, 192 new, 2,671 already on file; 100%
  match (1,823 participants / 1,040 no enrollment on file); both orgs B → A.
- Q2 (same headers) → mapping source "template"; 259 new, 83 held back; grades A.
- A (English) and B (abbreviated) map fully by rules; 0 unresolved program
  names, 0 unparseable dates.
- `npm test` 31/31, `npm run sanity` ALL PASS, `npm run build` OK.

Deviations / decisions:
1. **Schema**: added `ProgramAlias(org_id, label, program_id)` (§6.1 step 4 per-org
   dictionary); `ImportJob.org_id` optional (multi-org and outcome files) plus
   `kind`; `Outcome.offense_level` optional (parole discharges carry none).
2. **Rejected rows**: rows missing start date or completion status, or ending
   before they start, are held back and listed (no guessing). ~10% of each
   sample's rows. Consequence for M4: after the live demo, ~54 of the 534
   held-out participants have no enrollment on file, so "no enrollments" can
   no longer define the comparison group — M4 must define it explicitly.
3. **Blank credits** read as "no credits" (indistinguishable from missing);
   printed on every receipt as an assumption.
4. **Grade C threshold**: > 20% of an org's rows rejected for critical fields,
   or no records. Grades are recomputed only for orgs an import touches.
   Seeded CSV grades (some B) disagree with the rule because synthetic
   outcomes exist for every org; importing A/B flips those orgs to A.
5. **Match rate is 100%** on all demo files because the synthetic outcome file
   was generated from the same keys. Real data will be lower; say so if asked.
6. **Gemini**: wired (REST, `x-goog-api-key` header, JSON response, sample keys
   masked) but NOT verified — no key yet. Without a key the wizard uses rules
   and says so. Successful Gemini answers are written to data/mapping_cache.json
   for DEMO_MODE replay.
7. Vitest config renamed `.mts` (Node 22.7 cannot require() ESM vite).

## 2026-10-24 (Sat) — M4 overview + M5 report

- `/` overview: headline cards, credit-tier gradient (network vs CDCR published
  [2]), person-level funnel, release-cohort maturity table, impact panel
  (baseline switch + return_years 0.5–2.5), organization table (alphabetical,
  not ranked; small-cell suppression; per-org report link).
- `/report`: one page, §9 footnote verbatim, assumptions printed (baseline,
  return_years), dual calibers, data grades, references [1]–[3]. `?org=` gives
  one organization a report on its own program (incentive to share data).
- After the live demo (seed:demo → Q1 → D → Q2): 4,946 participants, 38.6%
  three-year conviction (full seed: 5,000 / 38.5%; 54 held back as problem rows).
- `npm test` 36/36, sanity ALL PASS, build OK.

Decisions:
1. **No comparison group on screen.** Comparisons use the cited baselines only
   (no-credit tier 45.6% [2] default, statewide 39.1% [1]); the synthetic
   control group is uncalibrated. This also resolves the M3 note about
   rejected rows contaminating "no enrollments".
2. **"Avoided returns" is labelled "fewer convictions than the baseline rate
   predicts"** with an association-not-causation note; formula unchanged (§7.1).
3. **Seed computes data grades by the §6.1 rule** instead of the CSV presets,
   which contradicted the records (B orgs with linked outcomes). All seeded
   orgs are A; in seed:demo, org-07/08 are C until imported.
4. Org conviction rate is shown only for grade A ("needs outcomes" otherwise).
5. Not verified: that the report fits on one printed page in every browser
   (checked on screen only); Gemini path (no key yet).

## 2026-10-24 (Sat afternoon) — merge + adoption items 1b / 1c / 2b

- Merged teammate commits (design doc §23–§24, data standard draft, TPW
  questions v2). Ours renumbered §25–§26. Join key reconciled: keyed hash of a
  shared identifier = CDCR number, or a TPW-issued ID if orgs don't record it.
- 1b: the wizard detects raw identifiers before anything is uploaded and hashes
  them with Web Crypto HMAC-SHA256 (identical to the server's participantKey —
  tested). Demo: `demo_raw_ids_english.csv` + 12 registry entries keyed with
  the synthetic DEMO_NETWORK_KEY (seeded; no effect on metrics until imported).
  Its "Victim Dialogue" rows land in the manual program-name queue (org-01
  has no restorative program) — useful to show the queue.
- 1c: `/data-use` plain-language promises, each marked "built into the
  software" or "pilot agreement" (the org-visibility rule is an agreement, not
  yet enforced by code).
- 2b: blank CSV templates (English / Spanish headers, BOM for Excel).
- Report chart uses a fixed width so printing is reliable; verified one page
  with headless Chrome PDF.
- Docs: pilot plan, handover memo, Devpost draft; question sheet items 8–13.

## 2026-10-24 (Sat evening) — pivot to real data (design doc §28)

- TPW's real workbook converted to `data/real/facilities.csv` (31 CDCR
  institutions, RIGHT 3.0 target + women's flags) and `data/real/program_runs.csv`
  (36 runs; 1 "SAMPLE DATA" row skipped). Workbook (*.xlsx) git-ignored.
- New tables: PartnerOrg, PartnerProgram, Facility, ProgramRun (aggregate,
  no individuals). Seeded by `npm run seed` / `seed:demo` alongside the
  synthetic tables (which now only back the Future pages).
- Home `/` = organization form (no sign-in); `/tpw` = TPW dashboard behind
  TPW_PASSCODE (fails closed). Future pages gated to TPW too.
- Real totals (seeded, before any form entries): 36 runs, 2 organizations,
  14 prisons, 1,441 participants, 739 completed, 103,064 participant
  programming hours; 5 runs flagged for follow-up (TBD / blanks).
- A workbook row with no status would be stored as "Planned" (none occur).
- Org edit rights without login: random edit token kept in the submitting
  browser (localStorage); lose the browser storage → TPW must correct it.
- Verified in the browser: form submission, thank-you, "submitted from this
  browser", TPW sign-in, dashboard tables, export 401 without sign-in.
  Not verified: date entry by keyboard in a zh-locale browser (picker works
  for users; automated typing did not) and phone layout.

## 2026-10-24 (Sat night) — real data only

- Merged teammate docs (design doc §27, ux-spec, design-style, data-standard
  §8); our real-data section renumbered §28 and wins where they differ.
- Removed everything synthetic (user: "use my data, no sample data"):
  data/demo-data, config/frameworks, the outcome demo pages and APIs, the
  metrics/privacy/mapping/cleaning libraries and their tests, sanity script,
  synthetic Prisma models, `seed:demo`. Recoverable from git history.
- No language field / Spanish demo (English-only delivery; no RIGHT points).
- Data standard rewritten as v0.2 (program-run reporting); README rewritten.
- Outdated planning docs (pitch, Devpost, handover, pilot, idea, brief,
  analysis) carry a banner instead of being deleted.
- Paper records recorded as the main open problem (backlog).

## 2026-10-24 (Sat night) — RIGHT 4.0, organization grants page

- RIGHT 4.0 is open (due 2026-11-30, $19.4M). It adds +0.5 for programs in a
  language other than English — correcting the earlier "no language points"
  (that was RIGHT 3.0). Optional language field restored on the form.
- Prison flag switched from RIGHT 3.0 targets to RIGHT 4.0 underserved
  institutions (ASP, CCWF, CIW, CTF, KVSP, NKSP, SAC), read from the red font
  in Attachment A. Column renamed right4_underserved.
- `/grants` for organizations; grant content in `data/grants.json`
  (hand-checked against CDCR pages on 2026-10-24).
- Readiness and "numbers you can cite" are reachable by organization name
  without sign-in (per-org private links remain on the roadmap).
- Org header shows no dashboard; small "TPW staff" link only.

## 2026-10-24 (late) — grant-writing assistant

- `/grants` is now centred on a chat assistant (Gemma via the Gemini API,
  default model `gemma-4-31b-it`, env `GEMINI_API_KEY` / `GEMMA_MODEL`).
  Local Gemma ruled out: this Mac has 8 GB RAM and ~5.5 GB free disk.
- Grounding: the server recomputes the organization's facts from its runs;
  the prompt forbids other numbers, uses [ADD: …] placeholders, and reminds
  users of RIGHT 4.0's GenAI disclosure. History capped at 12 turns × 4,000
  chars. Instructions go in the first user turn (Gemma has no system role).
- NOT verified against the real API: no key yet. Unit tests cover the
  prompt, history trimming, request shape and reply parsing with a fake fetch.

## 2026-10-24 (late night) — organization side: report, fewer words, more visuals

- Rebuilt the organization's one-page report on real data (`/report`,
  ReportView). It pops up right after each submission (ReportModal) with a
  link to My report for printing / PDF.
- Grants split into /grants (overview), /grants/check, /grants/write; the old
  all-in-one GrantsView removed. `/api/grants/readiness` became
  `/api/org-summary` (report + readiness).
- Visuals: single brand hue, thin rounded bars with values at the tip,
  tooltips; compact axis numbers (6K, 12K).
- Not clicked through in the browser: the post-submit pop-up (the pane was
  in use). Report, overview and check pages were checked visually.

## 2026-10-25 — rename to Spera, month/year dates, TPW sign-in

- Product renamed Spera in the UI, README, data standard and package.json.
  Repo name and internal keys (cookie `impactlink_tpw`, localStorage
  `impactlink.*`) unchanged so existing sessions/remembered choices survive.
- Dates are month + year selects, stored as the 1st of the month.
- TPW sign-in already gated the dashboard; the user saw no prompt because
  this browser still held the 12-hour cookie from earlier testing. Cookie is
  now session-only, and the org-side link reads "TPW staff sign in".

## 2026-10-25 — removed "Submitted from this browser"

- User found the per-browser list confusing; removed it together with the edit
  flow (`/api/runs/[id]`, `/api/runs/mine`, `editToken` column). Corrections now
  go through TPW (data-use page updated). Form is a single centred column.
- Test submissions cleared with `npm run seed` (36 real runs, 0 form runs).
- The form restores the last organization/program only if they still exist.

## 2026-10-25 — grants overview: five CDCR grant programs as cards

- `/grants` starts with a horizontally scrolling strip of CDCR's five grant
  programs (RIGHT, Victim Impact, Innovative Programming, CARE, Restorative
  Justice), each with a simple line illustration of our own (CDCR's page has
  no images per grant). Selecting one shows it below; RIGHT is the default
  and shows the open RIGHT 4.0 round with the countdown and the three actions.
  Others show description, who can apply and their funded rounds with links.
  The separate "Other CDCR grants" list is gone.
- `data/grants.json` gains `types`; every round has a `typeId`.

## 2026-10-25 — new look (user's reference design) + spreadsheet upload

- Visual system: indigo-blue brand fading to sun-yellow on warm paper
  (`@theme` tokens brand-*/sun-*/paper in globals.css); Source Serif 4 for
  display, IBM Plex Sans for body (next/font). All former emerald classes now
  use the brand scale; hero blocks use a blue→yellow gradient.
- Header per reference: indigo banner with shield, sun-arc logo, serif
  "Spera" + mission, nav right (Submit data · One-page report · Grants ·
  About & privacy) + TPW switch, gradient wave band. No "Dashboard" for
  organizations. The reference banner said "Demonstration data are synthetic" —
  not true for Spera, so it states the privacy rule instead.
- Home: italic serif quote, "For program staff" section, lock callout, sun arc,
  tabs "Quick entry" | "Upload a spreadsheet".
- Upload: CSV in TPW's Collective Impact Report columns (template at
  /api/runs/template); month/year parsed from common date styles; preview with
  per-row problems; good rows imported via /api/runs/bulk (re-validated).
  Excel/Sheets users save as CSV (no .xlsx parser added).

## 2026-10-25 — organizations never see other organizations' names

- `/api/form-options` returns prisons only; new `/api/org-lookup` answers an
  exact (case/space-insensitive) full-name lookup with that organization's own
  programs. Partial names reveal nothing.
- Form, one-page report and grants pages use `OrgEntry` (type your full name →
  Continue); the browser remembers its own organization. Unknown names are
  "new" on the form and "nothing reported yet" on reports.
- Still a pilot: someone who knows an organization's exact name can open its
  report. Privacy page says so; per-organization private links remain planned.
- Privacy section merged from seven points into four.

## 2026-10-25 — reverted exact-name entry and auto "My report"

- User preferred the earlier behaviour: the organization picker lists all
  organizations and any report can be opened (good for the demo). Reverted
  9757db7 and the code of cf6da47. Kept: "My report" naming and the
  four-point privacy section, with the visibility point reworded to say reports
  are open during the pilot and private per-organization links are the next step.

## 2026-10-25 — grant assistant tested against the real Gemma API

- Key works; available Gemma models: gemma-4-31b-it, gemma-4-26b-a4b-it.
- Gemma 4 returns its reasoning as parts marked `thought: true`; these were
  showing in replies. Now filtered (`answerText`).
- Default model switched to gemma-4-26b-a4b-it with thinkingLevel "minimal":
  ~1 s for a short reply vs 13–21 s on 31B; full drafts take 5–16 s.
  (31B rejects thinking levels other than "minimal"; a 400 retries without it.)
- One automatic retry on 503/429 (the service returned 503 once in testing).
- Content fixes after reviewing real drafts: budget points come from the
  organization's own budget (the model had said "request amount"); RHU/EOP/MHCB
  spelled out (it had guessed wrong expansions); prompt forbids describing
  what a program teaches or its effects (it had invented Defy's curriculum).

## 2026-10-25 — TPW passcode every time

- Leaving the TPW pages signs TPW staff out (SiteHeader calls the logout route
  silently), so the TPW switch asks for the passcode on every entry. Session
  cookie also capped at 30 minutes. Verified: sign in → Organization view →
  TPW shows the passcode form; export returns 401 after leaving.

## 2026-10-25 — old name removed everywhere

- Every "ImpactLink" is now "Spera": CSV download (`spera_program_runs.csv`),
  database file (`data/spera.db` — update `DATABASE_URL` in your `.env`),
  TPW cookie (`spera_tpw`), remembered-organization key (`spera.last`),
  schema comments and docs. Only the GitHub repo name stays `impactlink`.
- Side effect: TPW staff are signed out once and the form forgets the last
  organization once.
