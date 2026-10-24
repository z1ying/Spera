# ImpactLink Data Standard v0.1 (draft — for TPW review)

This document is the framework. The software is one implementation of it.
Any nonprofit can adopt this standard without adopting our code.

## 1. Entities and fields

**Organization**: org_id, name, region. One row per member organization.

**Program**: program_id, org_id, name, program_type
(education, vocational, substance use, restorative justice, reentry support, other).

**Participant**: participant_key ONLY. No name, date of birth, case number,
or any other identifying field exists anywhere in the central store.

**Enrollment**: participant_key, program_id, enroll_date, end_date,
completion_status (completed / dropped / in_progress),
credit_type (none / any / education / rehabilitative / other),
program_hours.

**Outcome**: participant_key, event_type, event_date, source.
Event types: arrest, conviction, return_to_custody,
parole_violation, parole_discharge (parole types pending TPW confirmation).

## 2. The shared identifier (join key)

participant_key = SHA-256(org_local_id + ":" + salt).

- The salt is generated and held by the organization. It is never sent
  to the central database.
- The central store therefore cannot reverse a key back to a person.
- Joining works only if both sides derive the key from the same
  org_local_id basis. Who issues and governs that basis — TPW-issued
  crosswalk or org-held mapping — is the one governance question that
  must be confirmed with TPW before real deployment (see §6).

## 3. Match rate and data grades

match_rate = matched enrollments / total enrollments in the outcome window.

- Unmatched records are listed individually with a reason code.
  Nothing is silently dropped.
- Grade A: all required fields present, key matched, no exceptions.
- Grade B: matched with minor exceptions (date format normalized,
  duplicate merged, synonym resolved).
- Grade C: unmatched or failing validation — listed for correction.
- A report always prints its match rate and grade mix next to its headline
  number, so the reader can judge how much to trust it.

## 4. Metric definitions (locked)

- Primary measure: conviction within 3 years of release (CDCR's measure).
- Cohort maturity: a cohort is "mature" only when its 3-year window has
  closed; otherwise it is labeled "still maturing" and never compared
  directly with mature cohorts.
- Credit tiers: none / any / education / rehabilitative (configurable
  per adopter; see §5).
- Cost calibers: conservative = marginal cost per person-year;
  capacity = average cost per person-year. Both are always shown,
  conservative first, with the source printed.
- Small-cell suppression: any group smaller than 10 people is shown
  as "<10", never as an exact number.

## 5. Configurability (the "nonprofits generally" clause)

The following are configuration, not code, for each adopter:
baseline rate, cost figures, credit-type list, primary metric,
and the display name of the shared identifier ("CDCR number" is
TPW's value; another adopter supplies its own).
Changing configuration never changes the join, privacy, or
grade rules above.

## 6. Open questions for TPW (to be resolved in the pilot)

1. What identifier do organizations actually hold that can link to
   outcome records, and who governs the crosswalk?
2. Which parole event types matter most for the report?
3. Which configuration values would another organization need to change first?
4. What is the simplest first submission an organization can realistically make?
5. What submission cadence fits — quarterly?

## 7. Version

v0.1, drafted at Hack for Social Impact 2026 for TPW review.
TPW owns the standard; ImpactLink implements it.
