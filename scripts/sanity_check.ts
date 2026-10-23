/**
 * Post-seed sanity check (design doc §15, second criterion):
 *  - program participants' overall 3-year conviction rate < 0.391 (statewide)
 *  - credit-tier gradient within ±2pp of the CDCR anchors (§5.4)
 *
 *   npm run sanity
 *
 * "Participants" = people with >= 1 enrollment (the 5,000). The 2,000-person
 * control group has no enrollments and is reported separately.
 */
import { PrismaClient } from "@prisma/client";
import {
  BASELINES,
  CREDIT_TIERS,
  TIER_ANCHORS,
  convictionRate,
  creditTier,
  type Credits,
  type OutcomeRecord,
  type ParticipantRecord,
} from "../src/lib/metrics";

const prisma = new PrismaClient();
const TOLERANCE_PP = 2.0;

async function main() {
  const [participants, enrollments, outcomes] = await Promise.all([
    prisma.participant.findMany(),
    prisma.enrollment.findMany(),
    prisma.outcome.findMany(),
  ]);

  // Merge credits across a participant's enrollments (one per person in the
  // demo data, but the engine contract allows several).
  const creditsByKey = new Map<string, Credits>();
  for (const e of enrollments) {
    const c = JSON.parse(e.credits) as Credits;
    const prev = creditsByKey.get(e.participantKey) ?? { MCC: false, RACC: false, EMC: false };
    creditsByKey.set(e.participantKey, {
      MCC: prev.MCC || c.MCC,
      RACC: prev.RACC || c.RACC,
      EMC: prev.EMC || c.EMC,
    });
  }

  const toRecord = (p: (typeof participants)[number]): ParticipantRecord => ({
    participantKey: p.participantKey,
    releaseYear: p.releaseYear,
    credits: creditsByKey.get(p.participantKey) ?? { MCC: false, RACC: false, EMC: false },
  });

  const programParticipants = participants.filter((p) => creditsByKey.has(p.participantKey)).map(toRecord);
  const controlGroup = participants.filter((p) => !creditsByKey.has(p.participantKey)).map(toRecord);
  const outcomeRecords: OutcomeRecord[] = outcomes.map((o) => ({
    participantKey: o.participantKey,
    eventType: o.eventType,
    eventDate: o.eventDate,
  }));

  let allPass = true;
  const pct = (r: number | null) => (r === null ? "  n/a " : `${(r * 100).toFixed(1)}%`);

  const overall = convictionRate(programParticipants, outcomeRecords);
  const overallPass = overall.rate !== null && overall.rate < BASELINES.statewide;
  allPass &&= overallPass;
  console.log(
    `participants overall 3yr conviction: ${pct(overall.rate)} (n=${overall.n}) ` +
      `vs statewide ${pct(BASELINES.statewide)} -> ${overallPass ? "PASS" : "FAIL"}`,
  );

  for (const tier of CREDIT_TIERS) {
    const res = convictionRate(programParticipants, outcomeRecords, { tier });
    const anchor = TIER_ANCHORS[tier];
    const devPp = res.rate === null ? Infinity : Math.abs(res.rate - anchor) * 100;
    const pass = res.rate !== null && devPp <= TOLERANCE_PP;
    allPass &&= pass;
    console.log(
      `tier=${tier.padEnd(5)} rate=${pct(res.rate)} anchor=${pct(anchor)} ` +
        `dev=${devPp.toFixed(1)}pp (n=${res.n}, tier example=${creditTier(
          programParticipants.find((p) => creditTier(p.credits) === tier)?.credits ?? {
            MCC: false,
            RACC: false,
            EMC: false,
          },
        )}) -> ${pass ? "PASS" : "FAIL"}`,
    );
  }

  const control = convictionRate(controlGroup, outcomeRecords);
  console.log(`control group 3yr conviction (info): ${pct(control.rate)} (n=${control.n})`);

  console.log(allPass ? "\nSANITY: ALL PASS" : "\nSANITY: FAILURES PRESENT");
  process.exit(allPass ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
