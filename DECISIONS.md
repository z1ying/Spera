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
- `prisma generate` + `db push`: OK, `data/impactlink.db` created.
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
