# Aurora — Specification 044-F1 — Real Cycling Metric Vocabulary Boundary

> **Status (2026-07-05).** Specification phase, building on Manual Data Trial 044-F (`c0f4024`). It is
> **behavioral / docs-only**: it implements no code, edits no test, does not modify `RECOGNIZED_METRICS`, adds
> no dependency, no package/test change, adds no canonicalization/alias/sport-specific/unit-normalization/
> speed-pace-conversion infrastructure, no fuzzy/LLM matching, does not alter missing-value semantics, adds no
> parser (CSV/FIT/TCX), no Garmin API integration, creates no `Signal`/`EvidenceCase`/`RenderingRequest`,
> calls no `runOperatorSession`, adds no delivery, creates no `AthleteDecision` automatically, introduces no
> production whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1091/1091**.
> It decides whether/how `RECOGNIZED_METRICS` should grow from Trial 044-F's two newly-observed real cycling
> metric labels.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and, if warranted, routes toward a next slice. `RECOGNIZED_METRICS` is not edited here; no code is created
here.

---

## 1. Required grounding check (verified before writing anything)

`[FACT]` All seven preconditions re-verified true, directly against current source and current test output,
at authorship of this spec:

```text
1. RECOGNIZED_METRICS count is exactly 25       : TRUE (direct source inspection, manual-input-adapter.ts).
2. Catalog remains literal, flat, local, unexported : TRUE — unchanged since Impl 044-E1A.
3. Trial 044-F reports exactly 8 suspicious      : TRUE (re-run of 044-f-real-cycling-session-trial.test.ts,
                                                    test 044-F.5).
4. Those 8 are exactly max-speed ×4 + avg-moving-speed ×4 : TRUE (test 044-F.5's own assertions).
5. Trial 044-F remains accepted / 48 / []        : TRUE (test 044-F.2, re-run and confirmed).
6. Trial 044-E remains accepted / 78 / []        : TRUE (test 044-E.2, re-run and confirmed).
7. Baseline is 1091/1091                         : TRUE (full suite re-run at authorship).
```

No discrepancy exists; this spec proceeds exactly as the mission anticipated.

---

## 2. Context

`[FACT]` Manual Data Trial 044-F (`c0f4024`) ran the FIRST real third-sport (cycling) session
(`activity_11178669974.csv`, 4 real source rows) through the unmodified production intake path. Its findings
document (`docs/trials/044-F-first-real-cycling-session-intake-trial.md`) recorded, as directly observed
fact:

```text
real trial finding : 8 of 44 admitted MeasuredObservations were unfamiliar to the current metric
                      vocabulary.
observed labels     : max-speed ×4 · avg-moving-speed ×4
```

`[CORRECTION — required by this mission, stated precisely]` Trial 044-F's source contains **zero**
occurrences of the `"--"` missing-value placeholder. **Trial 044-F did NOT exercise
`MissingDataObservation` behavior at all** — it neither confirms nor weakens the prior generalization
evidence for that mechanism. What it DID demonstrate is a different, real, and useful fact: a source can omit
an entire metric COLUMN (cadence, power — no such column exists anywhere in this file's 13-column header),
which is a categorically different real shape of "absence" than a column that EXISTS but reports `"--"` on
every row (the shape Trials 044-C/044-D/044-E each exercised). `docs/trials/044-F-first-real-cycling-
session-intake-trial.md` §12 already states this distinction; this spec does not re-litigate it, and
explicitly does **not** claim `"--"` "generalized to cycling" anywhere below. The existing generalization
evidence for exact `"--"` handling remains exactly what it was before this trial:

```text
Trial 044-C : "--" exercised (145 real occurrences in the original source)
Trial 044-D : "--" exercised (129 real occurrences)
Trial 044-E : "--" exercised (61 real occurrences)
Trial 044-F : "--" NOT present (0 occurrences) — not exercised, neither confirming nor refuting anything
```

Every other real finding from Trial 044-F is **explicitly out of scope for this spec**, recorded only, not
solved here:
1. A real, third cross-sport UNIT variation (cycling: `"km"` / `"km/h"`, distinct from both swim's `"m"`/
   `"s/100m"` and running's `"km"`/`"s/km"`) — a candidate future *Unit Normalization Boundary*, gated on an
   actual observed functional conflict, not merely a difference.
2. The already-known, unresolved invented-absolute-timestamp provenance gap — unchanged, not re-opened here.
3. Cadence and power were never exercised by this file at all (no such columns exist) — zero evidence either
   confirming or refuting any cross-sport semantic question about either; no spec is opened for either.

This spec addresses **only** whether/how `RECOGNIZED_METRICS` should recognize `max-speed` and
`avg-moving-speed`, and whether any cycling evidence justifies canonical/alias/sport-partition/unit-
normalization/speed-pace-conversion infrastructure.

`[FACT]` Current mechanism, verified against exact source
(`src/modules/observation/application/manual-input-adapter.ts`, unchanged since Impl 044-E1A):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate",
  "power", "avg-power", "max-power",
  "pace", "avg-pace",
  "speed", "avg-speed",
  "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
  "swolf", "total-strokes", "calories",
  "optimal-pace", "avg-strokes-per-length",
  "elevation-loss", "max-cadence", "avg-stride-length",
  "moving-time", "avg-moving-pace",
]); // exactly 25 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`RECOGNIZED_METRICS` remains a flat, unexported `Set<string>` of 25 kebab-case names — notably already
containing `"speed"`/`"avg-speed"` (from the ORIGINAL 15-entry seed, Impl 044-A1) but no `"max-speed"`. No
production code changed in Trial 044-F; this count and mechanism are exactly as Impl 044-E1A left them.

---

## 3. Central Question

> Does Trial 044-F's real evidence justify recognizing `max-speed` and `avg-moving-speed` in the existing
> flat `RECOGNIZED_METRICS` catalog — and does any observed cycling evidence justify aliases, canonical
> identities, sport partitioning, unit normalization, or speed/pace semantic infrastructure?

```text
unfamiliar metric ≠ invalid metric · unfamiliar metric ≠ alias · same metric family ≠ same metric ·
different values ≠ canonical identity proof (but corroborating evidence toward distinctness) ·
recognized label ≠ universal semantic definition · cycling-specific label ≠ sport-specific registry
requirement · speed vocabulary ≠ pace vocabulary · unit variation ≠ normalization requirement ·
recognized metric ≠ truth · recognized metric ≠ Evidence ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Required inputs consulted

```text
docs/trials/044-F-first-real-cycling-session-intake-trial.md
docs/implementation-architecture/ROADMAP_STATUS_POST_044E1A.md
docs/specs/044-E1-real-running-metric-vocabulary-boundary.md
docs/specs/044-E1A-real-running-metric-vocabulary-implementation-plan.md
docs/specs/044-D1-additional-real-swim-metric-vocabulary-boundary.md
src/modules/observation/tests/044-f-real-cycling-session-fixture.ts
src/modules/observation/tests/044-f-real-cycling-session-trial.test.ts
src/modules/observation/tests/044-e-real-running-session-fixture.ts
src/modules/observation/tests/044-e-real-running-session-trial.test.ts
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, qualityForMetricLabel —
                                                                 exact source, §2)
```

---

## 5. Empirical grounding — exact source rows and values

From `044-f-real-cycling-session-fixture.ts` / the trial's actual run
(`044-f-real-cycling-session-trial.test.ts`, tests 044-F.6/044-F.7):

```text
source row  context           avg-speed   max-speed   avg-moving-speed   duration   moving-time
csv-F-2     lap 1             18.9 km/h   33.1 km/h   20.3 km/h          950 s      888 s
csv-F-3     lap 2             18.0 km/h   38.1 km/h   20.4 km/h          1002 s     884 s
csv-F-4     lap 3 (short)     13.9 km/h   29.7 km/h   19.8 km/h          337.6 s    236 s
csv-F-5     Resumen (summary) 17.8 km/h   38.1 km/h   20.3 km/h          2290 s     2008 s
```

Both `max-speed` and `avg-moving-speed` appeared **independently, on every one of the 4 real source rows** —
never in isolation, and always alongside the already-recognized `avg-speed` on the SAME row. `moving-time`/
`duration` (both already recognized, since Impl 044-E1A) are also present on every row, providing direct
corroborating evidence for `avg-moving-speed`'s distinctness. This finding is not generalized beyond this one
file — Trial 044-F's own document (§25) already states this one real cycling session cannot claim universal
cycling or three-sport coverage.

---

## 6. Required Analysis

```text
 1. Current RECOGNIZED_METRICS behavior : a flat, unexported Set<string> of 25 kebab-case names, consulted
                                     ONLY by qualityForMetricLabel (§2) — unchanged since Impl 044-E1A.
 2. Why max-speed becomes suspicious   : the string "max-speed" does not appear in the 25-entry Set;
                                     qualityForMetricLabel falls to its else-branch, exactly as designed for
                                     any unfamiliar name.
 3. Why avg-moving-speed becomes suspicious : same mechanism — "avg-moving-speed" is not in the Set.
 4. Are both still admitted            : YES — recognition affects ObservationQuality only; admission
                                     depends solely on non-empty label/unit and a parseable numeric value.
                                     All 8 observations were admitted with quality.status "suspicious", never
                                     rejected (Trial 044-F test 044-F.5).
 5. Exact real values/units for max-speed : 33.1, 38.1, 29.7, 38.1 (km/h) — real, present on every row; the
                                     session-wide peak (38.1) repeats identically on lap 2 and the summary, a
                                     real, internally-consistent cross-check (the summary's peak equals the
                                     single highest lap peak, exactly as a maximum-of-maximums should).
 6. Exact real values/units for avg-moving-speed : 20.3, 20.4, 19.8, 20.3 (km/h) — real, present on every
                                     row.
 7. Does max-speed coexist with avg-speed : YES, on every one of the 4 real rows (§5).
 8. Does avg-moving-speed coexist with avg-speed : YES, on every one of the 4 real rows (§5).
 9. Is max-speed genuinely distinct from avg-speed : YES. max-speed >= avg-speed on EVERY real row, without
                                     exception (33.1>=18.9; 38.1>=18.0; 29.7>=13.9; 38.1>=17.8) — the
                                     signature of a genuine maximum-of-a-mean relationship, exactly the SAME
                                     avg/max extremum pattern already established for avg-heart-rate/
                                     max-heart-rate, avg-pace/optimal-pace, and avg-cadence/max-cadence. Not
                                     an alias (values differ substantially every time, by roughly 2x).
10. Is avg-moving-speed genuinely distinct from avg-speed : YES, decisively — avg-moving-speed differs from
                                     avg-speed on EVERY SINGLE real row (20.3 vs 18.9; 20.4 vs 18.0; 19.8 vs
                                     13.9; 20.3 vs 17.8), directly explained by a real, non-trivial pause on
                                     every lap (moving-time is always less than duration — 888<950; 884<1002;
                                     236<337.6; 2008<2290, §5). This is STRONGER evidence than the running
                                     trial's single-paused-lap case (Spec 044-E1 §5 item 10-11) — here EVERY
                                     row diverges, not just one.
11. Is avg-moving-speed genuinely distinct from max-speed : YES, trivially — one is a mean (over moving time
                                     only), the other an extremum (of instantaneous readings); their real
                                     values never coincide and represent categorically different statistics
                                     (a mean vs. a peak).
12. Is either label an alias of an existing recognized metric : NO — both ruled out by real, differing
                                     values on the SAME rows (items 9-11), not by label wording.
13. Does any source evidence justify speed/pace canonicalization : NO — cycling simply uses a DIFFERENT
                                     vocabulary family (speed) than swim/running (pace); nothing in the real
                                     data creates a need to RECONCILE the two families into one canonical
                                     concept. Different labels in different sports, without any observed need
                                     to compare or convert between them, do not by themselves justify
                                     canonicalization (exactly the caution this spec was required to apply).
14. Does any source evidence justify speed/pace conversion : NO — no real product behavior in this trial (or
                                     any prior trial) ever compares a speed observation against a pace
                                     observation; Aurora performs no cross-observation arithmetic of any kind
                                     today. Building conversion infrastructure now would solve an unevidenced
                                     problem.
15. Did any same-label semantic collision appear across sports : NO. Every label shared with a prior sport
                                     (avg-speed, elevation-gain, elevation-loss, moving-time, distance,
                                     duration, avg-heart-rate, max-heart-rate, calories) behaves with the SAME
                                     semantic role in cycling as before (Trial 044-F §9). Cadence and power
                                     were never exercised at all by this file (no such columns exist) — zero
                                     evidence either way for those two labels specifically.
16. Does any evidence justify sport-specific vocabulary : NO — no cross-sport semantic collision has been
                                     observed across FOUR real trials and THREE sports (item 15); the fact
                                     that max-speed/avg-moving-speed are cycling-evidenced does not, by
                                     itself, constitute a collision — exactly the same reasoning Spec 044-E1
                                     already applied to running-specific labels.
17. Is raw-label preservation sufficient : YES, unconditionally, unchanged — Measurement.quantity already
                                     carries entry.label verbatim regardless of recognition outcome; nothing
                                     about this trial's evidence changes that.
18. Does unit variation now create a functional conflict : NO. Cycling's real units (km, km/h) are a THIRD
                                     distinct convention (alongside swim's m/s-per-100m and running's
                                     km/s-per-km) — Aurora performs no cross-observation unit arithmetic
                                     anywhere in current architecture, so a third convention is more of the
                                     SAME kind of variation already recorded as "works as designed" by Spec
                                     044-E1 §7 Decision area 8, not a new category of problem.
19. Were missing-value semantics exercised in Trial 044-F : NO — the source contains ZERO occurrences of
                                     "--" (Trial 044-F §12, confirmed by direct grep of the raw source: 0
                                     matches). This trial neither confirms nor weakens the existing
                                     generalization evidence (Trials 044-C/044-D/044-E, 145/129/61 real
                                     occurrences respectively) — it demonstrates a DIFFERENT real fact: an
                                     entire metric column (cadence, power) can be ABSENT from a source's
                                     header entirely, which is categorically different from a column that
                                     EXISTS and reports "--" on every row. `column absent ≠ column present
                                     with "--"`. No claim is made here that "--" generalized to cycling —
                                     it was simply never exercised by this evidence.
20. Does the previous flat-catalog decision still hold : YES — reinforced by a FOURTH extension (following
                                     swolf/total-strokes/calories; optimal-pace/avg-strokes-per-length;
                                     elevation-loss/max-cadence/avg-stride-length/moving-time/
                                     avg-moving-pace), now confirmed across a THIRD sport with zero collision,
                                     using the identical evidentiary discipline every time.
```

---

## 7. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — add both labels to the existing flat catalog** | **Selected.** Both meet or exceed the exact evidentiary bar this arc's precedent already established (real, repeated, cross-referenced values proving distinctness); neither collides with or aliases an existing entry (§6 items 9–12). |
| B — add only max-speed | **Rejected as inconsistent.** avg-moving-speed's evidence (§6 item 10) is equally strong, in fact STRONGER (diverges on every row, not just some) — no principled basis to withhold it. |
| C — add only avg-moving-speed | **Rejected**, same reasoning in reverse — max-speed's evidence (§6 item 9) is equally strong. |
| D — add neither; wait for more cycling evidence | **Rejected as inconsistent.** The evidence already meets this arc's own established bar (repeated real observations, corroborated by same-row value relationships) — waiting further would apply a stricter standard than every prior extension received. |
| E — introduce canonical speed/pace identity infrastructure | **Rejected.** No identity-reconciliation evidence exists (§6 items 13/14) — cycling's speed vocabulary and swim/running's pace vocabulary never need to be compared or converted in any observed real scenario. |
| F — introduce alias infrastructure | **Rejected.** No alias evidence exists for either label (§6 item 12). |
| G — introduce sport-specific vocabulary partitioning | **Rejected.** No cross-sport semantic collision has been observed across four trials/three sports (§6 items 15/16). |
| H — introduce unit-normalization infrastructure | **Rejected.** No functional conflict has arisen from the observed unit variation (§6 item 18) — Aurora performs no cross-observation unit arithmetic. |
| I — introduce speed/pace conversion infrastructure | **Rejected.** No actual product behavior requires converting between speed and pace observations (§6 item 14). |

---

## 8. Required Decision Areas

### `[DECISION]` Decision area 1 — `max-speed` classification → **distinct metric**
```text
source values    : 33.1, 38.1, 29.7, 38.1 (km/h) — real, present on every row, coexisting with avg-speed
                   every time.
evidence         : max-speed >= avg-speed WITHOUT EXCEPTION on all 4 real rows — a genuine maximum-of-a-mean
                   relationship, exactly the avg/max extremum pairing pattern already established
                   (avg-heart-rate/max-heart-rate, avg-pace/optimal-pace, avg-cadence/max-cadence).
classification   : DISTINCT METRIC. Recognizing it means only "this source label is known" — it does NOT
                   mean Aurora computes, validates, or checks any device's maximum-speed calculation; no
                   aggregation semantics, no universal speed-extremum concept is introduced.
```

### `[DECISION]` Decision area 2 — `avg-moving-speed` classification → **distinct metric**
```text
source values    : 20.3, 20.4, 19.8, 20.3 (km/h) — real, present on every row, coexisting with avg-speed and
                   moving-time/duration every time.
evidence         : diverges from avg-speed on EVERY real row (§6 item 10), directly explained by a real,
                   non-trivial pause on every lap (moving-time < duration every time) — not by any invented
                   Garmin formula. This is STRONGER evidence than Trial 044-E's single-paused-lap case for
                   avg-moving-pace.
classification   : DISTINCT METRIC. Recognizing it means only "this source label is known" — Aurora does NOT
                   encode a distance-divided-by-moving-time formula, does NOT implement pause-detection
                   logic, and does NOT derive this value from any other observation.
```

### `[DECISION]` Decision area 3 — average vs. maximum → **recognition only, no aggregation model**
The source supports `avg-speed` and `max-speed` as two independently-reported real statistics. This spec
selects recognizing BOTH as separate, unrelated catalog strings — no shared canonical "speed object," no
runtime derivation of one from the other, exactly as every prior avg/max pairing in this catalog already
works.

### `[DECISION]` Decision area 4 — average vs. moving average → **recognition only, no formula**
Verified directly from the fixture/trial evidence (§5/§6 item 10): real pauses occurred on every one of the
4 real laps, and `avg-moving-speed` diverged from `avg-speed` on every one of them. This spec records that
evidence and selects recognition only — no Garmin formula, no moving/elapsed-time reconciliation model, no
runtime computation of any kind is introduced.

### `[DECISION]` Decision area 5 — speed vs. pace → **a vocabulary difference, not a canonical-identity issue**
Cycling's real vocabulary is speed-based (`km/h`); swim/running's is pace-based (`s/100m`/`s/km`). This is a
metric VOCABULARY difference (different sports naturally report different statistics), not evidence of a
CANONICAL IDENTITY problem (no observed need exists to reconcile "how fast" across the two vocabularies into
one shared concept). Different labels in different sports, with no observed need to compare or convert them,
do not justify canonicalization — no speed↔pace conversion, no inverse formula, no canonical velocity concept
is introduced.

### `[DECISION]` Decision area 6 — repeated-evidence threshold → **met**
```text
One real cycling session + 4 real source rows + 4 occurrences per label + same-row comparison against the
already-recognized avg-speed (and, for avg-moving-speed, against moving-time/duration too) meets or exceeds
the exact bar this arc's own precedent established for every prior catalog extension (Spec 044-C1/044-D1/
044-E1). Recognizing by Aurora ≠ universal standardization — the catalog answers only "known" vs. "unknown,"
never "true."
```

### `[DECISION]` Decision area 7 — flat catalog → **holds, unchanged**
`RECOGNIZED_METRICS` remains a flat, non-partitioned, unexported `Set<string>` if/when it is ever extended (a
future, separately-approved step). No cross-sport semantic collision was observed across FOUR real trials and
THREE sports (§6 items 15/16) — cycling-specific labels alone do not justify partitioning.

### `[DECISION]` Decision area 8 — unit variation → **works as designed; recorded, not solved**
```text
real evidence  : distance "km", speed family "km/h" — the EXACT strings the fixture preserves, verbatim, not
                 paraphrased. A third real cross-sport unit convention, alongside swim's "m"/"s/100m" and
                 running's "km"/"s/km".
disposition    : WORKS AS DESIGNED — Aurora's Measurement type already carries {quantity, magnitude, unit}
                 independently per observation; no current architecture performs cross-observation unit
                 arithmetic. A third convention is more evidence of the SAME already-recorded variation
                 (Spec 044-E1 §7 Decision area 8), not a new category of functional problem. The Unit
                 Normalization Boundary lane remains explicitly gated on an actual observed functional
                 conflict.
```

### `[DECISION]` Decision area 9 — missing-value evidence correction → **explicitly NOT exercised by this trial**
```text
Trial 044-F's source contains 0 occurrences of "--". Trial 044-F did NOT exercise MissingDataObservation
behavior — it is neither new evidence FOR nor AGAINST that mechanism's cross-sport generalization. What it
DID demonstrate, honestly and distinctly: a source may omit an entire metric column (cadence, power — no
such header entries exist in this file at all), which is a categorically different real shape of "no data"
than a column that EXISTS and reports "--" (the shape Trials 044-C/044-D/044-E each exercised, 145/129/61
real occurrences respectively). This spec does not claim "--" generalized to cycling; the existing
generalization evidence remains exactly what it was, resting on Trials 044-C/044-D/044-E alone. No broader
missing-value boundary is opened or implied by this spec.
```

### `[DECISION]` Decision area 10 — raw-label preservation → **unconditional, unchanged**
`Measurement.quantity` continues to carry `entry.label` verbatim regardless of recognition outcome — this
spec adds no canonical-id field, no alias-resolution field, and does not alter `mapEntry`'s existing behavior
in any way (it proposes no code at all).

### `[DECISION]` Decision area 11 — unknown-metric behavior → **unchanged**
Any label NOT selected for recognition (i.e., any future label other than these two, or either of these two
if a future Implementation does not act on this spec) remains **accepted**, with an explicit `"suspicious"`
`ObservationQuality` warning — never rejected. This spec proposes no change to that mechanism.

---

## 9. Separate findings — recorded, not solved here

```text
Unit variation (a third real cross-sport pattern: km/km-h)  : evidence recorded, no functional conflict, lane
    remains gated (§8 Decision area 8).
Temporal provenance                                          : unchanged, still open, not re-opened here.
    Cycling added real pauses on every lap but no new operational blocker beyond what running already
    evidenced.
Missing values                                               : no missing token occurred in Trial 044-F —
    absence of evidence, not evidence of absence; no inference is drawn either way (§8 Decision area 9).
Cadence and power                                            : both columns are entirely ABSENT from this
    cycling file's header (not present-but-blank) — zero cross-sport cadence evidence, zero cycling power
    evidence. No spec is opened for either; this remains an honest evidence gap, not a decision.
Parser/API pressure                                          : none newly observed — no parser/Garmin work is
    opened here.
```

---

## 10. Required Acceptance Criteria (Given / When / Then)

```text
Given a real max-speed row, when semantics are evaluated against avg-speed, then its classification is
  explicit. ✅ (§8 Decision area 1 — classified DISTINCT METRIC.)
Given a real avg-moving-speed row, when evaluated against avg-speed, then the decision is grounded in actual
  same-row values. ✅ (§8 Decision area 2 — grounded in the real pause-on-every-lap evidence.)
Given max-speed is recognized, when admitted, then Aurora does not compute or validate a maximum. ✅ (§8
  Decision area 3 — recognition only, no aggregation semantics.)
Given avg-moving-speed is recognized, when admitted, then Aurora does not encode a Garmin moving-speed
  formula. ✅ (§8 Decision area 4 — recognition only, no runtime derivation.)
Given cycling uses speed vocabulary, when compared with pace-family metrics from other sports, then no
  canonical speed/pace identity is introduced without reconciliation need. ✅ (§8 Decision area 5; §7 Option
  E/I rejected.)
Given a cycling-specific label, when vocabulary is evaluated, then sport specificity alone does not create
  a sport-specific registry. ✅ (§6 items 15/16; §7 Option G rejected; §8 Decision area 7.)
Given real unit variation, when no functional conflict exists, then no unit-normalization infrastructure is
  introduced. ✅ (§8 Decision area 8; §7 Option H rejected.)
Given Trial 044-F contains zero "--" tokens, when missing-value evidence is documented, then the trial is
  not claimed to exercise MissingDataObservation. ✅ (§8 Decision area 9.)
Given a label is recognized, when Observation material is admitted, then recognition does not make it truth
  or Evidence. ✅ (central distinction, §3; unchanged.)
Given a label remains unknown, when admitted, then it remains accepted with a suspicious warning. ✅ (§8
  Decision area 11; unchanged mechanism.)
Given no downstream boundary is approved, when recognition succeeds, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs. ✅ (unchanged from every prior spec in
  this arc.)
Given AC20, when vocabulary decisions are made, then no production whole-core composer is introduced. ✅
  (this spec is docs-only and adds no composer of any kind.)
```

---

## 11. Required Forbidden Behaviors (this spec)

```text
implementation code · RECOGNIZED_METRICS edit · test changes · canonical metric identity · alias
infrastructure · sport-specific registry · unit normalization · unit conversion · speed/pace conversion ·
inverse formulas · runtime speed derivation · runtime pace derivation · Garmin formulas · pause-detection
logic · broader missing-value handling · timestamp/provenance fix · CSV parser · FIT parser · TCX parser ·
Garmin API · automatic Signal · automatic EvidenceCase · automatic RenderingRequest · automatic
runOperatorSession · delivery · automatic AthleteDecision · API/UI/server · production whole-core composer ·
reflection-composition · AC20 amendment
```

---

## 12. Relationship to Existing Architecture

- **Manual Data Trial 044-F** — this spec is its direct evidence-driven follow-up; every decision here traces
  to a specific, cited trial finding (§5), not invented need.
- **Spec 044-C1 / Spec 044-D1 / Spec 044-E1** — this spec applies the EXACT same evaluation discipline
  (distinct-vs-alias classification from observed values, flat-catalog-only, no alias/registry/canonical-
  identity infrastructure) to a FOURTH independent real sample and a THIRD sport, reinforcing rather than
  revising that precedent.
- **Impl 044-A1** — `RECOGNIZED_METRICS`/`qualityForMetricLabel` remain exactly as implemented; this spec
  decides only whether/how they may eventually grow again, never touching them itself.
- **Spec 044-D2 / Impl 044-D2A** — the missing-value mechanism and its generalization evidence remain
  entirely resting on Trials 044-C/044-D/044-E; this spec makes no addition to, and no subtraction from,
  that evidence base (§8 Decision area 9).
- **AC20** — unchanged; this spec selects no new type, module, or composer.

---

## 13. Decision & Next Mission

`[DECISION] Real cycling metric vocabulary boundary: Option A — add both "max-speed" and
"avg-moving-speed" to the existing flat RECOGNIZED_METRICS catalog (decision-level only; the actual
extension is a future, separately-approved Implementation). Both labels are classified DISTINCT METRICS, not
aliases of anything already recognized, evidenced by real, internally-consistent value relationships on
every one of the 4 real source rows — max-speed >= avg-speed without exception; avg-moving-speed diverges
from avg-speed on every single row, explained by a real pause on every lap. No canonical speed/pace
identity, no alias infrastructure, no sport-specific vocabulary partitioning, no unit-normalization or
speed/pace-conversion infrastructure. Trial 044-F's zero "--" occurrences are explicitly NOT claimed as
missing-value generalization evidence — that evidence remains resting on Trials 044-C/044-D/044-E alone.`

```text
classification — max-speed          : DISTINCT METRIC (avg/max extremum pairing with avg-speed, analogous to
                                        the catalog's existing avg-heart-rate/max-heart-rate,
                                        avg-pace/optimal-pace, and avg-cadence/max-cadence pattern).
classification — avg-moving-speed   : DISTINCT METRIC (diverges from avg-speed on every real row, explained
                                        by a real pause on every lap — stronger evidence than the running
                                        trial's single-paused-lap case).
selected catalog additions          : both "max-speed" and "avg-moving-speed" — Option A; neither withheld
                                        (Options B/C rejected as inconsistent).
flat-catalog decision               : holds, unchanged — no sport-specific partitioning justified across
                                        four real trials / three sports.
canonical-identity decision         : none — no identity-reconciliation evidence exists for speed vs. pace.
alias-infrastructure decision       : none — no alias evidence exists for either label.
sport-specific-vocabulary decision  : none — no cross-sport semantic collision has been observed.
speed/pace semantic disposition     : a vocabulary difference between sports, not a canonical-identity
                                        issue — no conversion, no inverse formula, no canonical velocity
                                        concept introduced.
unit-variation disposition          : works as designed — a third real convention (km/km-h), recorded, not
                                        solved; Unit Normalization Boundary remains gated on an actual
                                        functional conflict.
raw-label preservation decision     : unconditional, unchanged — Measurement.quantity stays verbatim.
unknown-metric behavior             : unchanged — accepted + "suspicious" ObservationQuality warning for any
                                        label not (yet) recognized.
missing-value evidence correction   : Trial 044-F did NOT exercise MissingDataObservation (0 real "--"
                                        occurrences) — column-absent ≠ column-present-with-"--"; the existing
                                        generalization evidence rests only on Trials 044-C/044-D/044-E,
                                        unchanged and unexpanded by this trial.
temporal-provenance disposition     : unchanged, still open, not re-opened by this spec.
cadence/power disposition           : neither exercised by this file at all (columns entirely absent) — zero
                                        cross-sport evidence either way; no spec opened for either.
parser/API disposition              : none opened — no new evidence for CSV/FIT/TCX/Garmin API work.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-F1A — Real Cycling Metric Vocabulary Implementation Plan.` A
technical spec (still no implementation) naming the exact two strings to add to `RECOGNIZED_METRICS` (25 →
27 entries), the exact file/diff shape, and the exact real-044-F-trial assertion updates — mirroring Tech
Spec 044-E1A's precedent exactly — only then followed by `Implementation 044-F1A — Extend Real Cycling
Metric Vocabulary`. No CSV/FIT/TCX/Garmin API/unit-normalization/sport-registry/downstream-automation lane
gained enough evidence to justify opening; none is recommended as immediate without its own future evidence.

---

## 14. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1091/1091** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
