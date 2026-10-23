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
