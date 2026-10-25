# Spera Data Standard v0.2 — program-run reporting

*What a TPW member organization reports, and how TPW's numbers are calculated.*

This standard is the framework; the Spera software is one implementation of it. An organization can follow it on paper or in a spreadsheet. It replaces v0.1, which described person-level records: TPW confirmed (2026-10-24) that it does not need individual IDs.

## 1. The unit: one program run

A **program run** is one cohort of one program at one prison — for example, *Defy Ventures · CEO of Your New Life · CTF, C Yard, starting June 2024*. Organizations report counts for the run. No names, ID numbers, birth dates or any other information about individuals is collected.

## 2. Fields an organization reports

| Field | Required | Notes |
|---|---|---|
| Organization name | yes | Chosen from a list once, then remembered |
| Program name | yes | The organization's own name for it |
| CDCR facility | yes | One of CDCR's institutions (list maintained by TPW) |
| Yard | no | Free text, e.g. "B Yard" |
| Schedule status | yes | Planned · In Progress · Completed |
| Start date | for counting | Determines the program year |
| End date | no | Must not be before the start date |
| Total programming hours | for counting | Hours one participant receives over the whole run. May be worked out from the schedule: sessions per week or month × hours per session × number of weeks or months |
| Number of participants | for counting | |
| Number of participants completed | when Completed | Not more than the number of participants |
| Serves RHU / EOP / MHCB | no | RIGHT 4.0 special populations |
| Language other than English | no | Which language, if the program is taught in one (RIGHT 4.0 point) |

## 3. Calculated fields (TPW's formulas)

- **Total participant programming hours** = participants completed × total programming hours
- **Program year** = year of the start date

## 4. Flags joined from published sources (organizations don't enter these)

- **RIGHT 4.0 underserved institution** — red-font institutions in Attachment A of CDCR's RIGHT Grant 4.0 RFA (released 2026-10-01, due 2026-11-30): ASP, CCWF, CIW, CTF, KVSP, NKSP, SAC. Budget size gives 1–3 points; programming at an underserved institution, serving RHU/EOP/MHCB, and teaching in a language other than English each give +0.5, at most +1.0 in total (max 4 per organization).
- **Women's institution** — CCWF, CIW.

## 5. Missing values

A number that is not known (blank or "TBD") stays missing. It is left out of totals that need it and the run appears on TPW's follow-up list with what is missing. Nothing is estimated.

## 6. Who sees what

- Organizations submit without signing in and see only what they submitted from their own browser.
- TPW staff see every run, behind a sign-in.
- Outside TPW, figures are shared as network totals.

## 7. Open items

- **Most records start on paper.** Organizations count from paper sign-in sheets; the standard only needs the totals, but how to make that transfer easier is still open (see backlog).
- Organization budget (for RIGHT budget points) and program type are not collected yet; add them if TPW wants them.
- Person-level outcomes (recidivism) are out of scope until TPW chooses a linkage approach.

TPW owns the standard; Spera implements it. v0.2, 2026-10-24.
