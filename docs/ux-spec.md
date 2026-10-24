# ImpactLink UX spec (v1, 2026-10-24 — org-first)

## Information architecture: orgs are the majority user

- Default landing view after entering the site = the ORGANIZATION upload
  view (the import wizard). This is the primary workflow and the first
  thing most users need.
- TPW is one user, not the majority. TPW access lives in the top-right
  header as a role switch: a segmented control `[ Organization | TPW ]`.
- TPW view = dashboard + one-page report (+ data-use page).
- Org view after a successful import = own-data summary + network
  benchmark (own numbers + aggregates only, never other orgs' data).
- Demo honesty note: the header switch is a role demo for the weekend.
  In production this becomes login-based permissions (org accounts see
  only their own data + aggregates; TPW sees the network view).

## Header (top-right, in order)

1. Role switch `[ Organization | TPW ]`.
2. Music toggle: a small speaker icon, OFF by default, user-initiated only.

## Music toggle (M6 polish only — after M3/M4/M5 work)

- NEVER autoplay. Browsers block it anyway, and it distracts from
  form-filling. The toggle starts OFF; music plays only after the user
  taps it.
- One gentle, low-volume loop (light / calm background music).
- Tapping again stops it. Keep the control tiny and quiet, never
  a banner or a popup.
- If time runs short, cut the music first. It is delight, not core.

## Org upload UX (make them WANT to come back)

- Max 5 steps, with a visible progress indicator ("Step 2 of 5").
- Plain language everywhere. No jargon on screen: no "schema",
  "pseudonymous key", "cohort" — those words live in docs, not UI.
- Big buttons and tap targets; usable on a phone, not just a laptop.
- Blank template download on step 1 (templates already in repo),
  plus the Spanish-header sample, so the first upload is trivial.
- Mapping memory: returning orgs skip the mapping step entirely
  ("Welcome back — we remembered your format. One click to import.").
- Instant receipt after import: rows accepted, duplicates merged,
  problem rows listed in plain words. Nothing silently dropped.
- Success state: one calm checkmark + "Your data joined the network."
  No confetti, no noise — this is a serious topic.
- Spanish column headers recognized (already in the demo data).

## TPW view UX (business fit — detail to follow from Grace)

- Dashboard first: headline numbers, gradient chart, funnel,
  cohort maturity labels.
- Report page second: one printable page, dual cost calibers,
  methodology footnote, sources on the page.
- TPW's detailed business requirements will be appended here after
  the TPW interview; do not invent TPW-side features beyond this list.
