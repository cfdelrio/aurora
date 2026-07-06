# Aurora — Specification 044-D1 — Additional Real Swim Metric Vocabulary Boundary

> **Status (2026-07-05).** Specification phase, building on Manual Data Trial 044-D (`2f2c29e`). It is
> **behavioral / docs-only**: it implements no code, edits no test, does not modify `RECOGNIZED_METRICS`, adds
> no dependency, no package/test change, adds no canonicalization/alias/sport-specific/configuration/database/
> remote registry infrastructure, no fuzzy/LLM matching, does not fix the `"--"` placeholder finding or the
> timestamp/provenance finding, adds no parser (CSV/FIT/TCX), no Garmin API integration, creates no
> `Signal`/`EvidenceCase`/`RenderingRequest` directly, calls no `runOperatorSession`, adds no delivery, creates
> no `AthleteDecision` automatically, introduces no production whole-core composer, and amends no AC20. Base:
> `tsc --noEmit` clean; `node --test` **1057/1057**. It decides whether/how `RECOGNIZED_METRICS` should grow
> from Trial 044-D's two newly-observed real metric labels.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and, if warranted, routes toward a next slice. `RECOGNIZED_METRICS` is not edited here; no code is created
here.

---

## 1. Context

`[FACT]` Manual Data Trial 044-D (`2f2c29e`) ran a SECOND, independent real Garmin Connect swim-session CSV
export (`activity_23358314497.csv`) through the unmodified production intake path. Its findings document
(`docs/trials/044-D-second-real-swim-session-intake-trial.md`) recorded, as directly observed fact:

```text
real trial finding : 6 of 35 admitted measured observations were unfamiliar to the current metric vocabulary.
observed labels     : optimal-pace ×3 · avg-strokes-per-length ×3
```

`[FACT]` Three SEPARATE findings from the same trial are explicitly **out of scope for this spec** and are
only recorded, not solved, in §8:
1. The real, literal `"--"` blank-field placeholder (129 occurrences in the source file) that correctly
   fails `parseFiniteNumber` and becomes an `"unparseable-numeric-value"` limitation — a candidate future
   *Missing Value Semantics Boundary*, not a metric-vocabulary question.
2. The invented-absolute-timestamp / nested-sub-lap-relative-cumulative-time provenance finding — a candidate
   future *Provenance / Temporal Semantics Boundary*.
3. The real near-duplicate interval-summary vs. single-length sub-lap row structure — parser-structure
   pressure, not a metric-vocabulary question.

This spec addresses **only** whether/how `RECOGNIZED_METRICS` should recognize `optimal-pace` and
`avg-strokes-per-length`.

`[FACT]` Current mechanism, verified against exact source
(`src/modules/observation/application/manual-input-adapter.ts`, unchanged since Impl 044-C1A):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate",
  "power", "avg-power", "max-power",
  "pace", "avg-pace",
  "speed", "avg-speed",
  "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
  "swolf", "total-strokes", "calories",
]); // exactly 18 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`RECOGNIZED_METRICS` remains a flat, unexported `Set<string>` of 18 kebab-case names. `qualityForMetricLabel`
remains the **only** consumer — recognition affects `ObservationQuality` alone, never admission, never
`Measurement.quantity` (which continues to carry `entry.label` verbatim, unexamined).

`[GAP]` No boundary yet decides whether `optimal-pace`/`avg-strokes-per-length` are distinct metrics, aliases
of something already recognized, vendor-specific labels that should stay unresolved, or insufficiently
evidenced. This spec answers that from Trial 044-D's actual evidence — no more, no less — and, per Spec
044-C1's own established precedent, applies the same evaluation discipline (distinct-vs-alias classification
grounded in observed values, not label wording alone) to a second real sample.

---

## 2. Central Question

> Does Trial 044-D's real evidence justify recognizing `optimal-pace` and `avg-strokes-per-length` in the
> existing flat `RECOGNIZED_METRICS` catalog, and if so, should one, both, or neither be added — without
> introducing canonical-identity, alias, or sport-specific-registry infrastructure?

```text
different numeric values ≠ automatically different metric identity (by themselves) ·
same-row coexistence with an existing recognized metric + differing values + distinct semantic role =
  meaningful evidence toward distinctness (not proof alone) ·
unfamiliar metric ≠ invalid metric · unfamiliar metric ≠ alias ·
recognized metric ≠ truth · recognized metric ≠ Evidence · recognized metric ≠ recommendation quality ·
raw source label ≠ canonical identity · catalog coverage ≠ universal sport coverage ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/implementation-architecture/ROADMAP_STATUS_POST_044C2A.md
docs/trials/044-C-real-training-intake-trial.md
docs/trials/044-D-second-real-swim-session-intake-trial.md
docs/specs/044-C1-metric-normalization-boundary.md
docs/specs/044-C1A-metric-vocabulary-implementation-plan.md
src/modules/observation/tests/044-d-real-swim-session-fixture.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, normalizeMetricLabel,
                                                                 qualityForMetricLabel — exact source, §1)
src/modules/observation/application/training-row-submission.ts (confirmed: pure row-shape mapper, untouched)
```

`[FACT]` No name in this spec conflicts with existing code: `RECOGNIZED_METRICS`, `qualityForMetricLabel`,
`normalizeMetricLabel`, `Measurement.quantity`, `ObservationQuality` are all cited verbatim from the files
above; no new type name is coined for anything decided here (§10 confirms no code).

---

## 4. Empirical grounding — exact source rows and values

From `044-d-real-swim-session-fixture.ts` / the trial's actual run (`044-d-real-swim-session-trial.test.ts`,
tests 044-D.5/044-D.6):

```text
source row    context                              avg-pace   optimal-pace   total-strokes  avg-strokes-per-length
csv-D-4       interval 1, freestyle, 1 length       116 s/100m 116 s/100m     27 strokes     27 strokes/length
csv-D-7       interval 2, mixed, 8 lengths          115 s/100m  75 s/100m     215 strokes    27 strokes/length
csv-D-136     Resumen, whole session, 64 lengths     81 s/100m  28 s/100m     1,125 strokes  18 strokes/length
```

Both labels appeared **independently, in the same real source context**, on the SAME rows as an already-
recognized metric (`avg-pace`, `total-strokes` respectively) — never in isolation. All 6 suspicious
observations trace to exactly these two labels; no other unfamiliar label appeared in this trial. This
finding is not generalized beyond this one file — Trial 044-D's own document (§19) already states this two-
session sample cannot claim universal swim coverage.

---

## 5. Required Analysis

```text
 1. Current RECOGNIZED_METRICS behavior : a flat, unexported Set<string> of 18 kebab-case names, consulted
                                     ONLY by qualityForMetricLabel (§1) — unchanged since Impl 044-C1A.
 2. Why these two labels become suspicious : neither string appears in the 18-entry Set; qualityForMetricLabel
                                     falls to its else-branch, exactly as designed for any unfamiliar name.
 3. Are they still admitted           : YES — recognition affects ObservationQuality only; admission depends
                                     solely on non-empty label/unit and a parseable numeric value (unchanged
                                     mapEntry logic). Both labels' values parsed cleanly; both were admitted
                                     with quality.status "suspicious", never rejected.
 4. Exact units/values accompanying each label : optimal-pace — "s/100m" (same unit convention as avg-pace,
                                     values 116/75/28, §4). avg-strokes-per-length — "strokes/length" (a
                                     transcriber judgment call, mirroring how SWOLF/pace previously needed
                                     one), values 27/27/18, §4.
 5. Independent same-source-context appearance : YES, both — each appeared on 3 separate real rows, each row
                                     ALSO carrying an existing recognized metric (avg-pace alongside
                                     optimal-pace; total-strokes alongside avg-strokes-per-length) — never as
                                     the row's only metric.
 6. Is optimal-pace distinct or vendor-specific : the REAL VALUES establish this, not the English label alone
                                     (per this spec's own required caution). optimal-pace is LESS THAN OR
                                     EQUAL TO avg-pace on every observed row (75≤115; 28≤81; 116=116 when the
                                     interval has exactly one length, where a "best" and an "average" of one
                                     value are trivially identical). This is a real, internally-consistent,
                                     domain-plausible pattern for "the fastest single length's pace within
                                     the interval" — mathematically the MINIMUM of a set whose MEAN is
                                     avg-pace, which can never exceed that mean. It is not an alias of
                                     avg-pace (the values differ whenever the interval has >1 length); it
                                     directly parallels an ALREADY-RECOGNIZED pattern in this exact catalog —
                                     avg-heart-rate + max-heart-rate (a mean/extremum pairing for the same
                                     underlying quantity) — except pace's "extremum of interest" is a MINIMUM
                                     (faster = lower number), not a maximum. This is real evidence, not label
                                     inference: the numeric relationship (optimal ≤ avg, always) is the
                                     evidence, and it holds without exception across all 3 observed rows.
 7. Is avg-strokes-per-length distinct or an alias : the REAL VALUES again establish this. In every row,
                                     avg-strokes-per-length ≈ total-strokes ÷ lengths (27÷1=27 exactly;
                                     215÷8=26.875≈27; 1,125÷64≈17.58≈18) — a real, internally-consistent
                                     arithmetic relationship confirming it is a DERIVED AVERAGE of the SAME
                                     underlying count total-strokes already represents, normalized per
                                     length. This is not an alias of total-strokes (a raw sum, not an
                                     average) and not an alias of avg-cadence (a RATE PER TIME — strokes per
                                     minute — a different normalization denominator entirely from "per
                                     length," a distance-based unit). It is a distinct derived quantity.
 8. Semantic collision with an existing recognized metric : NO, for either label. Neither optimal-pace nor
                                     avg-strokes-per-length is mathematically or semantically identical to
                                     any of the 18 existing entries (item 6/7 rules out avg-pace/avg-cadence/
                                     total-strokes as the "same thing under a different name").
 9. Do existing labels already represent these concepts :
                                       pace                -> YES (pace, avg-pace) — but neither is a
                                                                minimum/best-of-interval statistic.
                                       average pace         -> YES (avg-pace) — already recognized, unaffected.
                                       stroke count          -> YES (total-strokes) — a raw sum, not an average.
                                       stroke rate           -> YES (cadence, avg-cadence) — per TIME, not per
                                                                LENGTH; a different denominator.
                                       strokes per length    -> NO existing entry represents this specific
                                                                per-length-normalized average.
                                     Conclusion: no existing entry already covers either new label.
10. Is raw-label preservation sufficient : YES, unconditionally, unchanged from Spec 044-C1 Decision 2 —
                                     Measurement.quantity already carries entry.label verbatim regardless of
                                     recognition outcome; nothing about this trial's evidence changes that.
11. Does adding these labels require canonical-identity infrastructure : NO — exactly as Spec 044-C1 §4 item 8
                                     found for swolf/total-strokes/calories, the observed gap here is again
                                     RECOGNITION COVERAGE (two unfamiliar names), not IDENTITY RECONCILIATION
                                     (no evidence any existing recognized label is secretly the SAME quantity
                                     under a different spelling — item 8 rules that out for both).
12. Does adding these labels require alias mapping : NO — neither label is an alias of anything already
                                     recognized (items 6/7/8); a flat-catalog addition, exactly like Impl
                                     044-C1A's, requires no alias-resolution machinery.
13. Does adding these labels require sport-specific partitioning : NO — both labels are swim-specific in this
                                     trial's context, but so were 2 of the 3 previous additions (swolf,
                                     total-strokes) and no cross-sport naming COLLISION has ever been
                                     observed (still zero evidence of e.g. "cadence" meaning something
                                     different in running vs. cycling vs. swimming that would force
                                     partitioning) — the flat, sport-neutral catalog remains sufficient,
                                     unchanged from Spec 044-C1 Decision 4/10.
14. Does one second swim trial change the previous flat-catalog decision : NO — it reinforces it. The SAME
                                     evidentiary shape (one real session, a handful of repeated unfamiliar-
                                     but-legitimate labels, no alias/collision evidence) that justified Option
                                     A for swolf/total-strokes/calories recurs here, on an independent second
                                     sample, for two DIFFERENT labels — consistent generalization, not a
                                     reason to change architecture.
15. Should either label remain unknown pending another source : this is the crux decision (§7 Decision area
                                     3). Trial 044-C's own precedent set the evidentiary bar at "one real
                                     session, a label observed at least twice, corroborated by domain
                                     reasoning from the observed values (not label wording alone)" — swolf/
                                     total-strokes/calories were each observed exactly twice in ONE session
                                     and that was judged sufficient (Spec 044-C1 Decision 5, Tech Spec
                                     044-C1A). Both new labels here meet or exceed that same bar: each
                                     observed 3 times, each corroborated by an internally-consistent
                                     arithmetic/statistical relationship to an existing recognized metric on
                                     the SAME rows (items 6/7) — not weaker evidence than the precedent, and
                                     in fact stronger (an explicit numeric relationship, not just co-
                                     occurrence). Holding these to a stricter bar than swolf/total-strokes/
                                     calories were held to would be inconsistent, not more rigorous.
16. What evidence is still missing : (a) a THIRD independent real swim session (or a different Garmin
                                     export/device model) corroborating that optimal-pace/avg-strokes-per-
                                     length are Garmin Connect's OWN stable naming convention rather than a
                                     one-export quirk; (b) any real alias/spelling-variance evidence (still
                                     entirely absent, exactly as Spec 044-C1 §4 item 20(a) found — a hand-
                                     transcribed trial still cannot produce this by its own methodology); (c)
                                     evidence from a non-swim sport establishing whether "optimal-X"/"avg-X-
                                     per-Y" naming patterns recur elsewhere (would inform, not require, a
                                     naming convention for FUTURE additions — not a decision this spec needs
                                     to make); (d) confirmation that "óptimo" specifically means "fastest
                                     single length" rather than some other Garmin-internal statistic
                                     (e.g. a rolling personal-best) — the numeric evidence (item 6) is
                                     consistent with "fastest length in this interval" and inconsistent with
                                     alternatives that would exceed avg-pace, but Garmin's own internal
                                     definition was never read or confirmed from outside this file.
```

---

## 6. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — add both labels to the existing flat catalog** | **Selected.** Both labels meet or exceed the exact evidentiary bar Spec 044-C1/Impl 044-C1A already established and applied successfully; neither collides with or aliases an existing entry (§5 items 6–9). |
| B — add only avg-strokes-per-length | **Rejected.** optimal-pace's evidence (§5 item 6) is equally strong (a real, exceptionless numeric relationship across all 3 observations) — there is no principled reason to add one and withhold the other. |
| C — add only optimal-pace | **Rejected**, same reasoning in reverse — avg-strokes-per-length's evidence (§5 item 7) is equally strong. |
| D — add neither; retain unknown-metric warnings pending more evidence | **Rejected as inconsistent.** Applying a stricter evidentiary bar here than was applied to swolf/total-strokes/calories (§5 item 15) would not be more rigorous — it would be arbitrary, since the evidence here is at least as strong (an explicit numeric relationship, not mere co-occurrence). |
| E — introduce alias/canonical identity infrastructure | **Rejected.** No alias evidence exists for either label (§5 items 8/12) — building identity-reconciliation infrastructure now would solve an unevidenced problem, exactly as Spec 044-C1 §5 rejected Options B/D for the same reason. |
| F — introduce swim-specific vocabulary partitioning | **Rejected.** No cross-sport semantic collision has ever been observed (§5 item 13); a flat, sport-neutral catalog remains sufficient. |

---

## 7. Required Decision Areas

### `[DECISION]` Decision area 1 — `avg-strokes-per-length` classification → **distinct metric**
```text
source values     : 27 (csv-D-4, 1 length), 27 (csv-D-7, 8 lengths), 18 (csv-D-136, 64 lengths)
unit               : "strokes/length" (judgment-called, no conventional unit exists — same category of
                     judgment call as SWOLF's dimensionless unit in Trial 044-C)
context            : co-occurs, every time, with total-strokes on the SAME row
same-row coexistence evidence : YES — total-strokes ÷ lengths ≈ avg-strokes-per-length in every observed row
                     (27÷1=27; 215÷8≈27; 1,125÷64≈18) — a real, internally-consistent derived-average
                     relationship, not label-wording inference
classification    : DISTINCT METRIC — a per-length-normalized average of the same count total-strokes
                     represents; not an alias of total-strokes (a sum) or avg-cadence (a per-TIME rate);
                     no existing entry already represents "strokes per length" (§5 item 9).
```

### `[DECISION]` Decision area 2 — `optimal-pace` classification → **distinct metric**
```text
source values     : 116 (csv-D-4, 1 length — trivially equal to avg-pace), 75 (csv-D-7, 8 lengths, vs.
                     avg-pace 115), 28 (csv-D-136, 64 lengths, vs. avg-pace 81)
unit               : "s/100m" — the SAME unit convention already used for avg-pace, no new judgment call.
neighboring fields : avg-pace ("Ritmo medio") appears on every one of these same rows.
does normal/average pace also appear : YES, always, on the same row.
what the source means : evaluated from VALUES, not the English label alone (per this spec's required
                     caution) — optimal-pace ≤ avg-pace WITHOUT EXCEPTION across all 3 observations, and
                     exactly equal only when the interval has a single length (where a minimum and a mean of
                     one value are identical by definition). This is the signature of a MINIMUM/best-of-
                     interval statistic — not a target/prescribed pace (nothing in the source or fixture
                     suggests a plan/target field), not a calculated theoretical pace, and not an alias of
                     avg-pace (values differ whenever lengths > 1).
residual uncertainty : Garmin's own internal definition of "Ritmo óptimo" was never read from outside this
                     file — the classification rests on the observed numeric PATTERN (real evidence), which
                     is sufficient to rule out "alias of avg-pace" and "target/prescribed pace," but cannot
                     with 100% certainty rule out every conceivable alternative Garmin-internal statistic.
                     This residual uncertainty is stated explicitly, not smoothed over.
classification    : DISTINCT METRIC — a best/fastest-observed-pace-within-interval statistic, directly
                     analogous to this catalog's EXISTING avg/extremum pairing pattern (avg-heart-rate +
                     max-heart-rate), except pace's extremum of interest is a minimum, not a maximum.
```

### `[DECISION]` Decision area 3 — repeated-evidence threshold → **met, for both labels**
```text
Recognizing a source label ≠ claiming universal semantic identity — the catalog answers only "known to
Aurora" vs. "unknown to Aurora," never "true" (central distinction, §2).

Threshold already established by Spec 044-C1/Impl 044-C1A: one real session + a label observed at least
twice + non-label-wording corroborating evidence (domain/arithmetic reasoning from the observed values) was
sufficient for swolf/total-strokes/calories. Both new labels here meet that SAME bar and exceed it slightly
(3 observations each, an explicit exceptionless numeric relationship on every occurrence, not mere co-
occurrence). Holding these two to a stricter standard than the precedent would be inconsistent, not more
careful — the decision is therefore: sufficient, for both.
```

### `[DECISION]` Decision area 4 — flat catalog → **holds, unchanged**
`RECOGNIZED_METRICS` remains a flat, non-partitioned, unexported `Set<string>` if/when it is ever extended (a
future, separately-approved step, per this arc's established discipline). No semantic collision across
sports was observed (§5 items 8/13) — nothing in this trial's evidence justifies a sport registry, a metric
registry service, a configuration layer, a database vocabulary, or a remote vocabulary source. None of those
is introduced or implied.

### `[DECISION]` Decision area 5 — raw label preservation → **unconditional, unchanged**
`Measurement.quantity` continues to carry `entry.label` verbatim regardless of recognition outcome — this
spec adds no canonical-id field, no alias-resolution field, and does not alter `mapEntry`'s existing
behavior in any way (it proposes no code at all).

### `[DECISION]` Decision area 6 — unknown-metric behavior → **unchanged**
Any label NOT selected for recognition (i.e., any future label other than these two, or either of these two
if a future Implementation does not act on this spec) remains **accepted**, with an explicit `"suspicious"`
`ObservationQuality` warning — never rejected. This spec proposes no change to that mechanism.

---

## 8. Separate findings — recorded, not solved here

```text
Garmin "--" placeholder      : 129 real occurrences in activity_23358314497.csv, correctly resulting today
                                in "unparseable-numeric-value" (never a fabricated zero/number). Open
                                question for FUTURE evidence only: is this a missing-value placeholder
                                requiring its own Missing Value Semantics Boundary? NOT evaluated, NOT
                                spec'd, NOT implemented by this document.

Timestamp / provenance        : an absolute session-start instant remains operator-supplied/invented in the
                                trial's own manual representation (unchanged from Trial 044-C); Trial 044-D
                                additionally observed that a nested sub-lap's own cumulative-time field is
                                relative to its PARENT interval's start, not the whole session. Both remain
                                exactly as documented in the two trial findings documents — NOT solved,
                                NOT spec'd here.

Near-duplicate CSV rows       : the real source contains a near-duplicate interval-summary vs. single-length
                                sub-lap row structure (Trial 044-D §14), faithfully recorded as two separate
                                observations by the existing, unmodified adapter. This is NOT turned into a
                                parser-implementation question by this spec.
```

---

## 9. Required Acceptance Criteria (Given / When / Then)

```text
Given a real avg-strokes-per-length source row, when its semantics are evaluated, then the decision must
  state whether it is distinct, alias, vendor-specific unresolved, or insufficiently evidenced. ✅ (§7
  Decision area 1 — classified DISTINCT METRIC.)
Given a real optimal-pace source row, when its semantics are evaluated, then the decision must not rely on
  label wording alone. ✅ (§7 Decision area 2 — classification rests on the observed numeric pattern
  optimal-pace ≤ avg-pace, with residual uncertainty stated explicitly, not smoothed over.)
Given a metric is added to RECOGNIZED_METRICS, when admitted, then recognition does not make it truth or
  Evidence. ✅ (central distinction, §2; unchanged — recognition only ever selects an ObservationQuality.)
Given a metric remains unknown, when admitted, then it remains accepted with an explicit suspicious
  warning. ✅ (§7 Decision area 6; unchanged mechanism.)
Given raw source labels, when recognition succeeds, then they remain preserved. ✅ (§7 Decision area 5;
  unconditional, unchanged.)
Given no alias evidence exists, when the metric vocabulary is updated, then no alias infrastructure is
  introduced. ✅ (§5 items 8/12; §6 Option E rejected.)
Given no cross-sport collision exists, when the metric vocabulary is updated, then no sport-specific
  registry is introduced. ✅ (§5 item 13; §6 Option F rejected; §7 Decision area 4.)
Given the real "--" placeholder, when this spec closes, then that finding remains separate and
  unresolved. ✅ (§8.)
Given the timestamp/provenance issue, when this spec closes, then it remains separate and unresolved. ✅ (§8.)
Given no downstream boundary is approved, when metric recognition succeeds, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs. ✅ (unchanged from every prior spec in
  this arc — this spec proposes no new call site of any kind.)
Given AC20, when the vocabulary decision is made, then no production whole-core composer is
  introduced. ✅ (this spec is docs-only and adds no composer of any kind.)
```

---

## 10. Required Forbidden Behaviors (this spec)

```text
implementation code · RECOGNIZED_METRICS edit · test changes · package changes · new dependency ·
canonical metric identity · alias infrastructure · sport-specific registry · fuzzy matching ·
LLM metric classification · "--" placeholder fix · timestamp/provenance fix · CSV parser · FIT parser ·
TCX parser · Garmin API · automatic Signal · automatic EvidenceCase · automatic RenderingRequest ·
automatic runOperatorSession · delivery · automatic AthleteDecision · API/UI/server ·
production whole-core composer · reflection-composition · AC20 amendment
```

---

## 11. Relationship to Existing Architecture

- **Manual Data Trial 044-D** — this spec is its direct evidence-driven follow-up; every decision here traces
  to a specific, cited trial finding (§4), not invented need.
- **Spec 044-C1 / Tech Spec 044-C1A / Impl 044-C1A** — this spec applies the EXACT same evaluation discipline
  (distinct-vs-alias classification from observed values, flat-catalog-only, no alias/registry
  infrastructure) to a second independent real sample, reinforcing rather than revising that precedent.
- **Impl 044-A1** — `RECOGNIZED_METRICS`/`qualityForMetricLabel` remain exactly as implemented; this spec
  decides only whether/how they may eventually grow again, never touching them itself.
- **Spec 001 / Impl 013** — the "faithful scribe, never interpreter" discipline directly grounds the
  raw-label-preservation decision (§7 Decision area 5) and the refusal to build alias/identity infrastructure
  from two labels' worth of evidence (§7 Decision area 3/4).
- **AC20** — unchanged; this spec selects no new type, no composer, no code of any kind.

---

## 12. Decision & Next Mission

`[DECISION] Additional real swim metric vocabulary boundary: Option A — add both "optimal-pace" and
"avg-strokes-per-length" to the existing flat RECOGNIZED_METRICS catalog (decision-level only; the actual
extension is a future, separately-approved Implementation). Both labels are classified DISTINCT METRICS, not
aliases of anything already recognized, evidenced by real, internally-consistent numeric relationships on the
same source rows (optimal-pace ≤ avg-pace without exception; avg-strokes-per-length ≈ total-strokes ÷
lengths). No canonical-identity/alias infrastructure, no sport-specific vocabulary partitioning, no fuzzy/LLM
matching. Raw source label preservation stays unconditional and unchanged. The "--" placeholder, the
timestamp/provenance finding, and the near-duplicate-row observation all remain explicitly separate,
un-bundled findings.`

```text
classification — avg-strokes-per-length : DISTINCT METRIC (a per-length-normalized average of total-strokes;
                                            not an alias of total-strokes or avg-cadence).
classification — optimal-pace            : DISTINCT METRIC (a best/fastest-observed-pace-within-interval
                                            statistic, analogous to the existing avg/max pairing pattern;
                                            residual uncertainty about Garmin's exact internal definition
                                            stated explicitly, not resolved).
selected catalog additions               : both "optimal-pace" and "avg-strokes-per-length" — Option A;
                                            neither withheld (Options B/C rejected as inconsistent — §6).
flat-catalog decision                    : holds, unchanged — no sport-specific partitioning justified.
alias-infrastructure decision            : none — no alias evidence exists for either label.
sport-specific-vocabulary decision       : none — no cross-sport semantic collision has been observed.
raw-label preservation decision          : unconditional, unchanged — Measurement.quantity stays verbatim.
unknown-metric behavior                  : unchanged — accepted + "suspicious" ObservationQuality warning
                                            for any label not (yet) recognized.
"--" placeholder disposition             : separate, unresolved — candidate future Missing Value Semantics
                                            Boundary, not evaluated here.
timestamp/provenance disposition         : separate, unresolved — candidate future Provenance / Temporal
                                            Semantics Boundary, not evaluated here.
near-duplicate-row disposition           : separate, unresolved — recorded as mild parser-structure pressure
                                            only, not turned into implementation.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-D1A — Additional Metric Vocabulary Implementation Plan.` A
technical spec (still no implementation) naming the exact two strings to add to `RECOGNIZED_METRICS` (18 → 20
entries), the exact file/diff shape, and the exact real-044-D-trial assertion updates — mirroring Tech Spec
044-C1A's precedent exactly — only then followed by `Implementation 044-D1A — Extend Recognized Metric
Vocabulary (optimal-pace, avg-strokes-per-length)`. The `"--"` placeholder finding, the timestamp/provenance
finding, and the near-duplicate-row observation each remain **separate**, independently-approvable candidate
missions (a possible *Missing Value Semantics Boundary*, a possible *Provenance / Temporal Semantics
Boundary*, respectively) — none is recommended as immediate without its own future evidence and approval, and
no parser/Garmin-API/automation work is recommended without new evidence of any kind.

---

## 13. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1057/1057** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
