# ImpactLink Data Standard v0.1

*How a network of community programs joins its records with outcome records — without centralizing identity — and measures impact it can defend.*

This standard is the framework. The ImpactLink software is one implementation of it; an organization can follow the standard with spreadsheets alone. Everything specific to one jurisdiction lives in a **framework file** (`config/frameworks/<id>.json`), so the same standard serves TPW's California network and any other nonprofit.

---

## 1. The two halves of the evidence

| Half | Who holds it | What it records | File type |
|---|---|---|---|
| **Process** | Each community organization | Who enrolled in which program, when, whether they completed, credits earned | Enrollment file |
| **Outcome** | State or county systems (corrections, parole, courts) | Arrests, convictions, returns to custody, parole violations, parole discharges | Outcome file |
| **Registry** | Network data steward (TPW) | One row per person: release year (cohort) and coarse demographics | Participant registry |

The registry is the join target: every enrollment and every outcome must link to a registry key. Nothing else links to anything.

## 2. The join key

```
participant_key = HMAC-SHA256(network_key, normalize(shared_identifier))
normalize(x)    = trim, upper-case, remove spaces and dashes
```

- **Shared identifier**: the one identifier *both* halves already record. For TPW it is the CDCR number (to be confirmed per organization). For another nonprofit it is whatever its records and its outcome source both carry (e.g. a county booking number).
- **Network key**: held by the network's data steward, given only to the hashing tool each data source runs locally, never stored centrally. A keyed hash is required because short, fixed-format identifiers can be reversed from a plain hash by enumeration.
- **What never leaves a data source**: names, dates of birth, case numbers, the raw shared identifier.

## 3. File formats

Any spreadsheet layout is accepted; columns are mapped to these fields once, and the mapping is reused for every later file with the same headers.

**Enrollment file** — one row per person per program.

| Field | Required | Meaning |
|---|---|---|
| `participant_key` | yes | Keyed hash (§2) |
| `program` | yes | The organization's own program name; resolved through its program dictionary |
| `enroll_date` | yes | Start date. Accepted: `MM/DD/YYYY`, `YYYY-MM-DD`, `DD-Mon-YY` |
| `completed` | yes | yes / no (English or Spanish) |
| `completion_date` | no | End date; must not precede the start date |
| `credits` | no | Credit codes from the framework file (TPW: MCC, RACC, EMC), joined by `+` |

**Outcome file** — one row per event.

| Field | Required | Meaning |
|---|---|---|
| `participant_key` | yes | Keyed hash (§2) |
| `event_type` | yes | `arrest`, `conviction`, `return_to_custody`, `parole_violation`, `parole_discharge` — the framework file chooses which are tracked |
| `event_date` | yes | Any accepted date format |
| `offense_level` | yes, except discharges | `felony` / `misdemeanor` |

## 4. Every import produces a receipt

Nothing is dropped silently. A receipt reports:

1. **Match rate** — distinct keys in the file that link to the registry, `matched / total`. For outcome files, split into *linked to a program participant* and *not linked to an enrollment*. Unmatched keys are listed, never guessed.
2. **Rows** — read, imported, duplicates merged (same person + same program, or same person + event + date), already on file, rejected.
3. **Every problem row**, by line number and reason (missing required field, unparseable date, end before start, unknown program name, unmatched key).
4. **Assumptions applied**, e.g. "a blank credits cell is read as no credits".

## 5. Data grade per organization

| Grade | Meaning |
|---|---|
| **A** | Process data present **and** outcomes linked to its participants |
| **B** | Process data only — outcomes not yet linked |
| **C** | No records yet, or more than 20% of rows rejected for critical fields |

Grades are shown next to every organization-level number.

## 6. Measuring impact

Defined in the framework file, never in code:

- **Primary measure** — event type and follow-up window. TPW: conviction within three years of release, CDCR's primary measure [1].
- **Cohort maturity** — release cohorts whose follow-up window is not complete are excluded from rates and counted separately, never averaged in.
- **Tiers** — participation depth from the credit system, highest-ranked credit wins. TPW: none → any credit → EMC → RACC, compared with CDCR's published rates [2].
- **Baselines** — switchable, each with its citation. TPW: no-credit tier 45.6% [2] (default) or statewide 39.1% [1].
- **Costs** — conservative (marginal) and capacity (average) per person-year, each cited. TPW: $21,534 and $127,788 (LAO 2025-26) [3].

```
rate        = people with the primary event inside the window / eligible cohort
gap         = (baseline − rate) × n
savings     = gap × return_years × cost          (return_years is printed on every report)
```

These numbers describe association plus a dose-response gradient, not proven causation. Reports say so.

## 7. Privacy rules

1. No identity fields exist in the central schema.
2. Any group of fewer than 10 people (framework `smallCellThreshold`) is shown as "<10" and never charted.
3. Organization-level data is visible to that organization and the data steward only; anything published is aggregated across the network.
4. Individuals are never scored. ImpactLink measures programs, not people.

## 8. Adopting the standard elsewhere

1. Copy `config/frameworks/example-county-reentry.json`.
2. Name your shared identifier and the outcome events your source provides.
3. Fill in baselines and costs **only from published sources, with citations** — the software refuses an uncited number.
4. Agree on who holds the network key.

---

References [1]–[3] are listed in the README. Version 0.1, 2026-10-24.
