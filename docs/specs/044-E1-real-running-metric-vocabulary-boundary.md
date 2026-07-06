# Aurora — Specification 044-E1 — Real Running Metric Vocabulary Boundary

> **Status (2026-07-05).** Specification phase, building on Manual Data Trial 044-E (`f572cdc`). It is
> **behavioral / docs-only**: it implements no code, edits no test, does not modify `RECOGNIZED_METRICS`, adds
> no dependency, no package/test change, adds no canonicalization/alias/sport-specific/unit-normalization
> infrastructure, no fuzzy/LLM matching, adds no parser (CSV/FIT/TCX), no Garmin API integration, creates no
> `Signal`/`EvidenceCase`/`RenderingRequest`, calls no `runOperatorSession`, adds no delivery, creates no
> `AthleteDecision` automatically, introduces no production whole-core composer, and amends no AC20. Base:
> `tsc --noEmit` clean; `node --test` **1080/1080**. It decides whether/how `RECOGNIZED_METRICS` should grow
> from Trial 044-E's five newly-observed real running metric labels.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and, if warranted, routes toward a next slice. `RECOGNIZED_METRICS` is not edited here; no code is created
here.

---

## 1. Context

`[FACT]` Manual Data Trial 044-E (`f572cdc`) ran the FIRST real non-swim (running) session
(`activity_17390160500.csv`, 5 real source rows) through the unmodified production intake path. Its findings
document (`docs/trials/044-E-first-real-running-session-intake-trial.md`) recorded, as directly observed
fact:

```text
real trial finding : 25 of 69 admitted MeasuredObservations were unfamiliar to the current metric
                      vocabulary.
observed labels     : elevation-loss ×5 · max-cadence ×5 · avg-stride-length ×5 · moving-time ×5 ·
                      avg-moving-pace ×5
```

Every other real finding from that trial is **explicitly out of scope for this spec**, recorded only, not
solved here:
1. The real, literal `"--"` placeholder generalized successfully to a THIRD independent real file and a
   different sport (61 occurrences) — already handled by the existing `MissingDataObservation` mechanism
   (Impl 044-D2A); nothing further is needed or evaluated here.
2. A real cross-sport UNIT variation (`"distance"`: swim → `"m"`, running → `"km"`; pace family: swim →
   `"s/100m"`, running → `"s/km"`) — a candidate future *Unit Normalization Boundary*, gated on an actual
   observed functional conflict, not merely a difference (§8 below).
3. The already-known, unresolved invented-absolute-timestamp provenance gap — unchanged, not re-opened here.

This spec addresses **only** whether/how `RECOGNIZED_METRICS` should recognize `elevation-loss`,
`max-cadence`, `avg-stride-length`, `moving-time`, and `avg-moving-pace`.

`[FACT]` Current mechanism, verified against exact source
(`src/modules/observation/application/manual-input-adapter.ts`, unchanged since Impl 044-D1A):

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
]); // exactly 20 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`RECOGNIZED_METRICS` remains a flat, unexported `Set<string>` of 20 kebab-case names. `qualityForMetricLabel`
remains the **only** consumer — recognition affects `ObservationQuality` alone, never admission, never
`Measurement.quantity` (which continues to carry `entry.label` verbatim, unexamined). No production code
changed in Trial 044-E; this count and mechanism are exactly as Impl 044-D1A left them.

`[GAP]` No boundary yet decides whether the five running labels are distinct metrics, aliases of something
already recognized, or insufficiently evidenced — and whether ANY of this evidence justifies canonical
identity, alias, or sport-partitioning infrastructure. This spec answers that from Trial 044-E's actual
evidence — no more, no less — applying the identical evaluation discipline Spec 044-C1/044-D1 already
established (distinctness proven from observed VALUES, never from label wording alone).

---

## 2. Central Question

> Does Trial 044-E's real evidence justify recognizing `elevation-loss`, `max-cadence`, `avg-stride-length`,
> `moving-time`, and `avg-moving-pace` in the existing flat `RECOGNIZED_METRICS` catalog — and does any of
> this evidence justify aliases, canonical identities, sport partitioning, or unit-normalization
> infrastructure?

```text
unfamiliar metric ≠ invalid metric · unfamiliar metric ≠ alias ·
different numeric values ≠ identity proof by themselves (but corroborating evidence toward distinctness) ·
recognized label ≠ canonical metric identity · recognized label ≠ universal semantic definition ·
running metric ≠ need for a running-specific registry · unit variation ≠ normalization requirement ·
recognized metric ≠ truth · recognized metric ≠ Evidence ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/trials/044-E-first-real-running-session-intake-trial.md
docs/implementation-architecture/ROADMAP_STATUS_POST_044D2A.md
docs/specs/044-C1-metric-normalization-boundary.md
docs/specs/044-D1-additional-real-swim-metric-vocabulary-boundary.md
src/modules/observation/tests/044-e-real-running-session-fixture.ts
src/modules/observation/tests/044-e-real-running-session-trial.test.ts
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, qualityForMetricLabel —
                                                                 exact source, §1)
src/modules/observation/application/training-row-submission.ts (confirmed: pure row-shape mapper, untouched)
```

---

## 4. Empirical grounding — exact source rows and values

From `044-e-real-running-session-fixture.ts` / the trial's actual run (`044-e-real-running-session-trial.test.ts`,
tests 044-E.7/044-E.8):

```text
source row  context               elevation-gain  elevation-loss  avg-cadence  max-cadence
csv-E-2     lap 1, no pause       12 m            14 m            166 spm      176 spm
csv-E-3     lap 2, no pause       11 m            9 m             166 spm      172 spm
csv-E-4     lap 3, no pause       12 m            13 m            165 spm      178 spm
csv-E-5     lap 4, MID-LAP PAUSE  -- (missing)    2 m              32 spm      171 spm
csv-E-6     Resumen (summary)     34 m            39 m            146 spm      178 spm

source row  context               duration     moving-time   avg-pace       avg-moving-pace
csv-E-2     lap 1, no pause       280.3 s      280.3 s       280 s/km       280 s/km
csv-E-3     lap 2, no pause       290.9 s      290.9 s       291 s/km       291 s/km
csv-E-4     lap 3, no pause       291.0 s      291 s         291 s/km       291 s/km
csv-E-5     lap 4, MID-LAP PAUSE  145.5 s      24 s          1727 s/km      285 s/km
csv-E-6     Resumen (summary)     1008 s       886 s         327 s/km       287 s/km

avg-stride-length (m), no directly-comparable existing recognized metric:
  csv-E-2: 1.29 · csv-E-3: 1.24 · csv-E-4: 1.25 · csv-E-5: 1.08 · csv-E-6: 1.23
```

All five labels appeared **independently, on every one of the 5 real source rows** — never in isolation, and
in every case alongside an already-recognized "sibling" metric (`elevation-gain` alongside
`elevation-loss`; `avg-cadence` alongside `max-cadence`; `duration` alongside `moving-time`; `avg-pace`
alongside `avg-moving-pace`). `avg-stride-length` has no directly-comparable existing entry. This finding is
not generalized beyond this one file — Trial 044-E's own document (§22) already states this one real running
session cannot claim universal running or multi-sport coverage.

---

## 5. Required Analysis

```text
 1. Current RECOGNIZED_METRICS behavior : a flat, unexported Set<string> of 20 kebab-case names, consulted
                                     ONLY by qualityForMetricLabel (§1) — unchanged since Impl 044-D1A.
 2. Why the five labels become suspicious : none of the five strings appears in the 20-entry Set;
                                     qualityForMetricLabel falls to its else-branch, exactly as designed for
                                     any unfamiliar name.
 3. Are they still admitted           : YES — recognition affects ObservationQuality only; admission depends
                                     solely on non-empty label/unit and a parseable numeric value (or the
                                     known missing-value token, unaffected by this spec). All 25 observations
                                     were admitted with quality.status "suspicious", never rejected.
 4. Exact real values/units per label  : see §4 — elevation-loss (m), max-cadence (spm), avg-stride-length
                                     (m), moving-time (s), avg-moving-pace (s/km); every value is a real,
                                     plausible running biomechanical measurement, not a placeholder.
 5. Independent appearance across all 5 rows : YES, for all five labels — none appeared only once or only
                                     in isolation from a sibling recognized metric.
 6. Coexistence with a related recognized metric : YES for four of five (elevation-loss/elevation-gain;
                                     max-cadence/avg-cadence; moving-time/duration; avg-moving-pace/
                                     avg-pace); avg-stride-length has no directly-comparable sibling already
                                     in the catalog.
 7. Is elevation-loss distinct from elevation-gain/ascent/descent/total-descent : DISTINCT. The source
                                     itself reports BOTH "Ascenso total" (ascent, -> elevation-gain, already
                                     recognized) and "Descenso total" (descent) as two SEPARATE real columns
                                     with differing real values on every row (§4) — not the same quantity
                                     under a different name; a genuine ascent/descent pairing, analogous to
                                     how the catalog already pairs avg/max statistics for other quantities.
                                     No "elevation-loss"/"descent"/"total-descent" entry exists today.
 8. Is max-cadence distinct from avg-cadence : DISTINCT. Real values differ on every row (§4), most sharply
                                     on the paused lap (csv-E-5: 171 vs. 32 — a nearly 5x difference) — this
                                     is exactly the SAME avg/max extremum-pairing pattern the catalog already
                                     holds for heart-rate (avg-heart-rate/max-heart-rate) and, since Spec
                                     044-D1, pace (avg-pace/optimal-pace). Not an alias.
 9. Is avg-stride-length distinct from distance/cadence/pace/speed : DISTINCT. It is a per-stride linear
                                     measurement (meters per stride) — categorically different from distance
                                     (total km covered), cadence (strides per minute, a RATE), and pace
                                     (time per distance). No existing entry represents "length per stride."
10. Is moving-time distinct from duration/elapsed-time : DISTINCT, decisively evidenced by the paused lap
                                     (csv-E-5): duration (elapsed, including the pause) = 145.5s;
                                     moving-time (excluding the pause) = 24s — a 6x difference. On the
                                     UN-paused laps the two values coincide or nearly coincide (e.g.
                                     csv-E-2: 280.3s both), which alone might look like a trivial alias —
                                     but exactly as Spec 044-D1 found for optimal-pace/avg-pace (equal only
                                     when an interval has a single length), coincidence in the SIMPLE case
                                     and divergence in the COMPLEX case is precisely the signature of two
                                     genuinely different computed quantities, not the same field twice.
11. Is avg-moving-pace distinct from avg-pace/optimal-pace/pace : DISTINCT, evidenced the same way: on
                                     csv-E-5, avg-pace = 1727 s/km (skewed by the pause) vs. avg-moving-pace
                                     = 285 s/km (excluding it) — a 6x difference, directly explained by the
                                     moving-time finding (item 10) rather than any invented Garmin formula.
                                     Not an alias of avg-pace (differs whenever a pause occurs) and not the
                                     same concept as optimal-pace (a best/fastest-of-interval statistic,
                                     evidenced separately, §4 of Trial 044-E — avg-moving-pace is a MEAN
                                     over moving time, not an extremum).
12. Is any pair genuinely alias evidence : NO — every one of the five labels was ruled out as an alias of
                                     its coexisting sibling by real, differing values (items 7–11); none is
                                     the "same quantity under a different spelling."
13. Does any label create a cross-sport semantic collision : NO — none of the five labels appeared in either
                                     swim trial at all (they are running-specific vocabulary with no prior
                                     use to collide with); "avg-cadence" (already recognized, exercised by
                                     real data for the first time in Trial 044-E) showed no semantic conflict
                                     with any prior use either, since no swim trial ever exercised it with a
                                     real value.
14. Does evidence now justify sport-specific vocabulary : NO — no cross-sport collision exists (item 13); a
                                     flat, sport-neutral catalog remains sufficient for every label observed
                                     across three real trials and two sports.
15. Is raw-label preservation sufficient : YES, unconditionally, unchanged — Measurement.quantity already
                                     carries entry.label verbatim regardless of recognition outcome; nothing
                                     about this trial's evidence changes that.
16. Does adding these labels require canonical-identity infrastructure : NO — exactly as Spec 044-C1/044-D1
                                     found for their respective new labels, the observed gap here is again
                                     RECOGNITION COVERAGE (five unfamiliar names), not IDENTITY
                                     RECONCILIATION (no evidence any existing recognized label is secretly
                                     the SAME quantity under a different spelling — items 7–12 rule that out).
17. Does adding these labels require alias infrastructure : NO — none of the five is an alias of anything
                                     already recognized (item 12); a flat-catalog addition, exactly like
                                     Impl 044-C1A/044-D1A's, requires no alias-resolution machinery.
18. Does unit variation require a separate boundary now : NOT YET. Trial 044-E documented real, concrete
                                     unit variation (distance: m vs. km; pace: s/100m vs. s/km) across
                                     sports, but Aurora performs NO cross-observation unit arithmetic
                                     anywhere in current architecture — Measurement already carries
                                     {quantity, magnitude, unit} independently per observation, and nothing
                                     compares two observations' magnitudes across differing units. Variation
                                     without a functional consequence is evidence, not yet a gap (§8).
19. What evidence is still missing : (a) a THIRD independent real running session (or a different device/
                                     format) corroborating that these five labels are Garmin Connect's OWN
                                     stable running-export convention, not a one-export quirk; (b) any real
                                     alias/spelling-variance evidence (still entirely absent, exactly as
                                     every prior metric-vocabulary spec in this arc found — a hand-
                                     transcribed trial cannot produce this by its own methodology); (c)
                                     evidence from a real THIRD sport establishing whether any of these five
                                     labels, or any existing entry, ever means something different across
                                     sports (a genuine collision, not just a difference); (d) an actual
                                     functional consequence of the km/m or s/km/s-per-100m unit variation
                                     (item 18) — none has yet arisen because Aurora does no cross-observation
                                     unit arithmetic today.
20. Does the previous flat-catalog decision still hold : YES — it is reinforced by a THIRD extension
                                     (following swolf/total-strokes/calories, then optimal-pace/
                                     avg-strokes-per-length) following the identical evidentiary discipline,
                                     now confirmed across a genuinely different sport with zero collision.
```

---

## 6. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — add all five labels to the existing flat catalog** | **Selected.** All five meet or exceed the exact evidentiary bar Spec 044-C1/044-D1 already established (real, repeated, cross-referenced values proving distinctness); none collides with or aliases an existing entry (§5 items 7–12). |
| B — add only labels with clear distinct semantics; retain others as unknown | **Rejected as inconsistent.** All five pass the identical distinctness test (§5 items 7–11) — withholding some while approving others has no principled basis; the evidentiary bar is met uniformly. |
| C — add none; wait for more running evidence | **Rejected.** The evidence already meets this arc's own established bar (one real session, each label observed repeatedly, corroborated by real value relationships, not label wording) — waiting further would apply a stricter standard than every prior extension received. |
| D — add canonical metric identity infrastructure | **Rejected.** No identity-reconciliation evidence exists (§5 items 16) — every label is either distinct or has no sibling to reconcile with. |
| E — add alias infrastructure | **Rejected.** No alias evidence exists for any of the five (§5 items 12/17). |
| F — introduce sport-specific vocabulary partitioning | **Rejected.** No cross-sport semantic collision has been observed (§5 items 13/14) — a flat catalog remains sufficient. |
| G — introduce unit-normalization infrastructure in the same slice | **Rejected.** No actual functional conflict has arisen from the observed unit variation (§5 item 18) — Aurora performs no cross-observation unit arithmetic; building normalization now would solve an unevidenced problem, exactly the discipline this arc has followed throughout. |

---

## 7. Required Decision Areas

### `[DECISION]` Decision area 1 — `elevation-loss` classification → **distinct metric**
```text
source values   : 14, 9, 13, 2, 39 (m) — real, present on every row
coexists with   : elevation-gain (already recognized), real differing values every row (12,11,12,--,34)
classification  : DISTINCT METRIC — the source's own separate "Descenso total" column; an ascent/descent
                  pairing, not the same field under a different name; no existing entry represents descent.
```

### `[DECISION]` Decision area 2 — `max-cadence` classification → **distinct metric**
```text
source values   : 176, 172, 178, 171, 178 (spm) — real, present on every row
coexists with   : avg-cadence (already recognized, first real-data use in this arc), differing values every
                  row, most sharply on the paused lap (171 vs. 32)
classification  : DISTINCT METRIC — an avg/max extremum pairing exactly analogous to the catalog's existing
                  avg-heart-rate/max-heart-rate and avg-pace/optimal-pace pattern. Recognition does NOT imply
                  a universal cadence semantic — only that this specific source label is a known, distinct
                  statistic.
```

### `[DECISION]` Decision area 3 — `avg-stride-length` classification → **distinct metric**
```text
source values   : 1.29, 1.24, 1.25, 1.08, 1.23 (m) — real, present on every row
coexists with   : no directly-comparable existing entry (distance/cadence/pace/speed are all categorically
                  different quantities — total distance, a rate per time, time per distance, distance per
                  time, respectively)
classification  : DISTINCT METRIC — recognition ONLY; no runtime derivation from cadence/distance/pace is
                  introduced or implied (Decision area 3's own caution, honored — this spec proposes no code
                  of any kind).
```

### `[DECISION]` Decision area 4 — `moving-time` classification → **distinct metric**
```text
source values   : 280.3, 290.9, 291, 24, 886 (s) — real, present on every row
coexists with   : duration (already recognized), nearly identical on un-paused laps, DECISIVELY different on
                  the paused lap (145.5s vs. 24s — a 6x difference)
classification  : DISTINCT METRIC — coincidence in the simple (no-pause) case and divergence in the complex
                  (paused) case is the signature of two genuinely different computed quantities, mirroring
                  exactly the optimal-pace/avg-pace precedent from Spec 044-D1 (equal only for a
                  single-length interval, distinct otherwise). No canonical time semantics are encoded —
                  only the label is recognized.
```

### `[DECISION]` Decision area 5 — `avg-moving-pace` classification → **distinct metric**
```text
source values   : 280, 291, 291, 285, 287 (s/km) — real, present on every row
coexists with   : avg-pace (already recognized), nearly identical on un-paused laps, decisively different on
                  the paused lap (1727 vs. 285 s/km — a 6x difference, directly explained by the moving-time
                  finding, Decision area 4)
classification  : DISTINCT METRIC — not an alias of avg-pace (differs whenever a pause occurs) and not the
                  same concept as optimal-pace (a best/fastest-of-interval extremum, evidenced separately);
                  avg-moving-pace is a MEAN over moving time only. No Garmin formula is encoded or derived —
                  recognition only.
```

### `[DECISION]` Decision area 6 — repeated-evidence threshold → **met, for all five labels**
```text
Recognizing a source label ≠ claiming universal semantic standardization — the catalog answers only "known
to Aurora" vs. "unknown to Aurora," never "true" (central distinction, §2).

Threshold already established by Spec 044-C1/044-D1: one real session + a label observed repeatedly,
corroborated by real value relationships (not label wording) was sufficient for swolf/total-strokes/calories
and, separately, optimal-pace/avg-strokes-per-length. All five labels here meet that SAME bar: each observed
5 times (once per every real source row, not a subset), each corroborated by an explicit real-value
relationship to a coexisting sibling metric — not weaker evidence than the precedent, comparable in kind and
scale. Holding these five to a stricter standard would be inconsistent, not more careful.
```

### `[DECISION]` Decision area 7 — flat catalog → **holds, unchanged**
`RECOGNIZED_METRICS` remains a flat, non-partitioned, unexported `Set<string>` if/when it is ever extended (a
future, separately-approved step). No cross-sport semantic collision was observed across THREE real trials
and TWO sports (§5 items 13/14) — the fact that a metric is running-specific does not, by itself, justify
partitioning; nothing in this trial's evidence justifies a sport registry, a metric registry service, a
configuration layer, a database vocabulary, or a remote vocabulary source. None of those is introduced or
implied.

### `[DECISION]` Decision area 8 — cross-sport unit variation → **works as designed; recorded, not solved**
```text
real evidence  : "distance" (swim: m, running: km), pace-family (swim: s/100m, running: s/km) — a genuine,
                 concrete difference across two independent real sports.
disposition    : WORKS AS DESIGNED, not a gap — Aurora's Measurement type already carries {quantity,
                 magnitude, unit} independently per observation, and no current architecture performs
                 cross-observation unit arithmetic or comparison of any kind. Variation without a functional
                 consequence is evidence, not (yet) a defect. This spec records the finding and keeps the
                 Unit Normalization Boundary lane explicitly gated on an actual observed functional conflict
                 — not merely a difference (per ROADMAP_STATUS_POST_044D2A.md §10's own evidence gate for
                 this exact lane).
```

### `[DECISION]` Decision area 9 — raw-label preservation → **unconditional, unchanged**
`Measurement.quantity` continues to carry `entry.label` verbatim regardless of recognition outcome — this
spec adds no canonical-id field, no alias-resolution field, and does not alter `mapEntry`'s existing behavior
in any way (it proposes no code at all).

### `[DECISION]` Decision area 10 — unknown-metric behavior → **unchanged**
Any label NOT selected for recognition (i.e., any future label other than these five, or any of these five
if a future Implementation does not act on this spec) remains **accepted**, with an explicit `"suspicious"`
`ObservationQuality` warning — never rejected. This spec proposes no change to that mechanism.

---

## 8. Separate findings — recorded, not solved here

```text
Unit variation ("distance": m vs. km; pace family: s/100m vs. s/km) : recorded (§7 Decision area 8) — WORKS
    AS DESIGNED today; no normalization infrastructure until an actual functional conflict appears (e.g. a
    real need to compare or convert between two differently-unit'd observations of the "same" metric).

Temporal provenance (invented absolute timestamp) : unchanged, still open, not re-opened here — no new
    evidence from Trial 044-E materially changes this gap's status.

Missing values (exact "--") : generalized successfully to a THIRD real source and a SECOND sport (Trial
    044-E §11) — no new evidence for broadening the recognized token beyond the exact literal "--"; no
    broader missing-value boundary is opened here.

Parser/API pressure : none newly observed (Trial 044-E §16–19) — no CSV/FIT/TCX parser or Garmin API work is
    opened here.
```

---

## 9. Required Acceptance Criteria (Given / When / Then)

```text
Given a real elevation-loss row, when its semantics are evaluated, then its classification is explicit. ✅
  (§7 Decision area 1 — classified DISTINCT METRIC.)
Given a real max-cadence row, when evaluated against avg-cadence, then recognition does not imply
  aliasing. ✅ (§7 Decision area 2 — distinct, avg/max extremum pairing, not an alias.)
Given a real avg-stride-length row, when recognized, then Aurora does not derive it from cadence/distance/
  pace. ✅ (§7 Decision area 3 — recognition only, no runtime derivation proposed anywhere.)
Given a real moving-time row, when evaluated against duration, then the decision is grounded in actual
  source values. ✅ (§7 Decision area 4 — the paused-lap divergence, not label wording, grounds the
  classification.)
Given a real avg-moving-pace row, when evaluated against avg-pace, then no Garmin formula is invented. ✅
  (§7 Decision area 5 — the divergence is explained by the moving-time finding, not an invented formula.)
Given a label is recognized, when admitted, then recognition does not make it truth or Evidence. ✅ (central
  distinction, §2; unchanged — recognition only ever selects an ObservationQuality.)
Given a label remains unknown, when admitted, then it remains accepted with a suspicious warning. ✅ (§7
  Decision area 10; unchanged mechanism.)
Given real unit variation across sports, when no functional conflict exists, then no normalization
  infrastructure is introduced. ✅ (§7 Decision area 8; §6 Option G rejected.)
Given no cross-sport semantic collision exists, when vocabulary is updated, then no sport-specific registry
  is introduced. ✅ (§5 items 13/14; §6 Option F rejected; §7 Decision area 7.)
Given no alias evidence exists, when vocabulary is updated, then no alias infrastructure is introduced. ✅
  (§5 items 12/17; §6 Option E rejected.)
Given raw source labels, when recognition succeeds, then they remain preserved. ✅ (§7 Decision area 9;
  unconditional, unchanged.)
Given no downstream boundary is approved, when recognition succeeds, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs. ✅ (unchanged from every prior spec in
  this arc — this spec proposes no new call site of any kind.)
Given AC20, when vocabulary decisions are made, then no production whole-core composer is introduced. ✅
  (this spec is docs-only and adds no composer of any kind.)
```

---

## 10. Required Forbidden Behaviors (this spec)

```text
implementation code · RECOGNIZED_METRICS edit · test changes · canonical metric identity · alias
infrastructure · sport-specific registry · unit normalization · unit conversion · cross-observation
arithmetic · running module · running-specific adapter · fuzzy matching · LLM metric classification ·
timestamp/provenance fix · CSV parser · FIT parser · TCX parser · Garmin API · automatic Signal · automatic
EvidenceCase · automatic RenderingRequest · automatic runOperatorSession · delivery · automatic
AthleteDecision · API/UI/server · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 11. Relationship to Existing Architecture

- **Manual Data Trial 044-E** — this spec is its direct evidence-driven follow-up; every decision here traces
  to a specific, cited trial finding (§4), not invented need.
- **Spec 044-C1 / Spec 044-D1** — this spec applies the EXACT same evaluation discipline (distinct-vs-alias
  classification from observed values, flat-catalog-only, no alias/registry infrastructure) to a THIRD
  independent real sample and a genuinely different sport, reinforcing rather than revising that precedent.
- **Impl 044-A1** — `RECOGNIZED_METRICS`/`qualityForMetricLabel` remain exactly as implemented; this spec
  decides only whether/how they may eventually grow again, never touching them itself.
- **Spec 001 / Impl 013** — the "faithful scribe, never interpreter" discipline directly grounds the
  raw-label-preservation decision (§7 Decision area 9) and the refusal to build alias/identity/unit-
  normalization infrastructure from one session's worth of evidence (§7 Decision areas 6/7/8).
- **AC20** — unchanged; this spec selects no new type, module, or composer.

---

## 12. Decision & Next Mission

`[DECISION] Real running metric vocabulary boundary: Option A — add all five labels ("elevation-loss",
"max-cadence", "avg-stride-length", "moving-time", "avg-moving-pace") to the existing flat
RECOGNIZED_METRICS catalog (decision-level only; the actual extension is a future, separately-approved
Implementation). All five are classified DISTINCT METRICS, not aliases of anything already recognized,
evidenced by real, internally-consistent value relationships on the same source rows — most decisively by
the paused lap (csv-E-5), where moving-time/avg-moving-pace diverge sharply from duration/avg-pace, proving
distinctness rather than trivial equality. No canonical-identity/alias infrastructure, no sport-specific
vocabulary partitioning, no unit-normalization infrastructure. The real cross-sport unit variation is
recorded as WORKS AS DESIGNED, not a gap, pending an actual functional conflict.`

```text
classification — elevation-loss     : DISTINCT METRIC (the source's own separate "Descenso total" column;
                                        pairs with elevation-gain, not an alias).
classification — max-cadence        : DISTINCT METRIC (avg/max extremum pairing, analogous to
                                        avg-heart-rate/max-heart-rate and avg-pace/optimal-pace).
classification — avg-stride-length  : DISTINCT METRIC (no comparable existing entry; recognition only, no
                                        derivation).
classification — moving-time        : DISTINCT METRIC (decisively evidenced by the paused-lap divergence
                                        from duration).
classification — avg-moving-pace    : DISTINCT METRIC (decisively evidenced by the paused-lap divergence
                                        from avg-pace; distinct from optimal-pace too).
selected catalog additions          : all five — Option A; no label withheld (Option B rejected as
                                        inconsistent — §6).
flat-catalog decision               : holds, unchanged — no sport-specific partitioning justified across
                                        three real trials / two sports.
alias-infrastructure decision       : none — no alias evidence exists for any of the five.
sport-specific-vocabulary decision  : none — no cross-sport semantic collision has been observed.
unit-variation disposition          : works as designed — recorded, not solved; Unit Normalization Boundary
                                        remains gated on an actual functional conflict, not mere difference.
raw-label preservation decision     : unconditional, unchanged — Measurement.quantity stays verbatim.
unknown-metric behavior             : unchanged — accepted + "suspicious" ObservationQuality warning for any
                                        label not (yet) recognized.
temporal-provenance disposition     : unchanged, still open, not re-opened by this spec.
missing-value disposition           : unchanged — the exact "--" generalized successfully; no broadening.
parser/API disposition              : none opened — no new evidence for CSV/FIT/TCX/Garmin API work.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-E1A — Real Running Metric Vocabulary Implementation Plan.` A
technical spec (still no implementation) naming the exact five strings to add to `RECOGNIZED_METRICS` (20 →
25 entries), the exact file/diff shape, and the exact real-044-E-trial assertion updates — mirroring Tech
Spec 044-D1A's precedent exactly — only then followed by `Implementation 044-E1A — Extend Real Running
Metric Vocabulary`. The unit-variation finding, the temporal-provenance finding, and the missing-value
finding each remain **separate**, independently-approvable candidate missions — none is recommended as
immediate without its own future evidence, and no parser/Garmin-API/automation work is recommended without
new evidence of any kind.

---

## 13. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1080/1080** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
