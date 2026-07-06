# Aurora — Specification 044-C1 — Metric Normalization Boundary

> **Status (2026-07-02).** Specification phase, building on Manual Data Trial 044-C (`d14744f`). It is
> **behavioral / docs-only**: it implements no code, edits no test, does not modify `RECOGNIZED_METRICS`, adds
> no dependency, no package/test change, adds no parser (CSV/FIT/TCX), no Garmin API integration, creates no
> `Signal`/`EvidenceCase`/`RenderingRequest` directly, calls no `runOperatorSession`, adds no delivery, creates
> no `AthleteDecision` automatically, introduces no production whole-core composer, and amends no AC20. Base:
> `tsc --noEmit` clean; `node --test` **1027/1027**. It decides the approved boundary for recognizing and
> (eventually, if ever) normalizing real training-metric vocabulary.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and routes the build to a next slice. `RECOGNIZED_METRICS` is not edited here; no code is created here.

---

## 1. Context

`[FACT]` Manual Data Trial 044-C (`d14744f`) ran a real Garmin Connect swim-session CSV export
(`activity_23459651624.csv`, Garmin's own activity id) through the unmodified 044-A1 production intake path.
The trial's own findings document (`docs/trials/044-C-real-training-intake-trial.md`) recorded, as directly
observed fact:

```text
real trial finding : 6 of 17 admitted measured observations were unfamiliar to the current metric vocabulary.
observed labels     : SWOLF ×2 · total-strokes ×2 · calories ×2
```

`[FACT]` A second, SEPARATE finding from the same trial: Garmin's raw comma-grouped numeric text `"1,600"`
(the distance value for interval 8) failed `parseFiniteNumber` (`Number("1,600")` is `NaN` in JavaScript) and
became a row-level `"unparseable-numeric-value"` limitation. **This is a lexical-number-formatting problem,
categorically distinct from metric-NAME recognition** — one is about how a metric is spelled/labeled, the
other is about how a numeric value is typeset. This spec does not solve it (§4 item 20 / §6 Decision 8); it
stays tracked as a separate, un-bundled finding.

`[FACT]` Current mechanism, verified against exact source
(`src/modules/observation/application/manual-input-adapter.ts`):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate", "power", "avg-power", "max-power",
  "pace", "avg-pace", "speed", "avg-speed", "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
]);
function normalizeMetricLabel(label: string): string { /* trim, lowercase, spaces->hyphens */ }
function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`RECOGNIZED_METRICS` is a flat `Set<string>` of ~15 kebab-case names. `qualityForMetricLabel` is the **only**
consumer. It is explicitly documented, in its own code comment, as "a name-recognition aid only... never a
judgment of the value itself... Aurora owns no canonical metric catalog."

`[GAP]` No boundary yet decides: should `RECOGNIZED_METRICS` grow, and if so, how (flat list vs. canonical
identities with aliases vs. sport-partitioned vocabularies)? Should Aurora ever reconcile differently-spelled
labels for the same underlying quantity? This spec answers those questions from the trial's actual evidence —
no more, no less.

---

## 2. Central Question

> How should Aurora recognize and normalize real training metric vocabulary while preserving the original
> metric label, avoiding false certainty, and never turning normalization into Evidence, Signal,
> recommendation, or truth?

```text
raw metric label ≠ canonical metric identity · unknown metric ≠ invalid metric · unknown metric ≠ alias ·
normalized metric ≠ truth · recognized metric ≠ Evidence · metric normalization ≠ Signal detection ·
metric normalization ≠ recommendation · technical recognition ≠ device accuracy ·
canonical label ≠ source label replacement · manual/CSV row ≠ proof · Observation ≠ Signal · Signal ≠ Evidence ·
Evidence ≠ recommendation · Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/trials/044-C-real-training-intake-trial.md
src/modules/observation/tests/044-c-real-swim-session-fixture.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/application/training-row-submission.ts
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, qualityForMetricLabel)
src/modules/observation/domain/observation.ts                 (Measurement { quantity, magnitude, unit })
src/modules/observation/domain/observation-quality.ts         (ObservationQuality { status, reason })
src/shared-kernel/provenance.ts                                (Provenance)
src/modules/observation/index.ts
docs/specs/044-training-artifact-intake-boundary.md
docs/specs/044-A-manual-csv-candidate-observation-intake-plan.md
docs/specs/044-B-observation-review-admission-ux-boundary.md
```

`[FACT]` No name in this spec conflicts with existing code: `RECOGNIZED_METRICS`, `qualityForMetricLabel`,
`normalizeMetricLabel`, `Measurement`, `MeasuredObservation`, `ObservationQuality`, `Provenance` are all cited
verbatim from the files above; no new type name is coined for anything decided here (§10 confirms no code).

---

## 4. Required Analysis

```text
 1. What RECOGNIZED_METRICS currently does : a flat Set<string> of ~15 kebab-case names, consulted ONLY by
                                        qualityForMetricLabel to choose between qualityComplete() and a
                                        "suspicious" ObservationQuality — nothing else reads it.
 2. Does recognition affect admission or only quality/warnings : ONLY quality/warnings. Admission depends
                                        solely on non-empty label, non-empty unit, and a parseable finite
                                        numeric value (mapEntry's measured-value case) — recognized and
                                        unrecognized metrics are admitted identically once those hold.
 3. Why unfamiliar metrics were still admitted : by explicit design — the code's own comment states
                                        "Aurora owns no canonical metric catalog"; rejecting a well-formed-
                                        but-unfamiliar metric would be Aurora judging whether a metric is
                                        "legitimate," which the faithful-scribe discipline (Spec 001/013)
                                        forbids.
 4. Is SWOLF an alias or a distinct metric : DISTINCT CANONICAL METRIC. SWOLF (stroke count + time per
                                        length) is a well-established, swim-specific composite metric with
                                        no equivalent in running/cycling vocabulary — it is not a rename of
                                        anything already in RECOGNIZED_METRICS.
 5. Is total-strokes an alias or a distinct metric : DISTINCT METRIC. It is a raw stroke COUNT, not a RATE —
                                        conceptually adjacent to "cadence" (already recognized, but a rate,
                                        typically strokes/steps/pedal-revolutions PER MINUTE) yet not the
                                        same quantity. Treating it as a "cadence" alias would be inaccurate.
 6. Is calories an alias or a distinct metric : DISTINCT, WIDELY CROSS-SPORT metric — not swim-specific at
                                        all (running/cycling/every activity type reports calories). Its
                                        absence from RECOGNIZED_METRICS looks like an incompleteness of the
                                        ORIGINAL list's scope (which focused on pace/physiological metrics),
                                        not evidence that Aurora needs sport-specific vocabulary handling.
 7. Which real labels are truly aliases, if any : NONE. All three observed labels (SWOLF, total-strokes,
                                        calories) are distinct concepts, not synonyms/renames of existing
                                        recognized entries. Critically, this trial's OWN METHODOLOGY (a human
                                        transcriber chose the exact label strings by hand) means it could
                                        NOT have produced genuine alias/spelling-variance evidence even if
                                        such variance exists in the wild (e.g. "hr" vs "heart-rate" across
                                        different real device exports) — that evidence is simply absent, not
                                        ruled out.
 8. Does Aurora need canonical metric identities : NOT YET, per real evidence. The observed gap is
                                        RECOGNITION COVERAGE (a name is unfamiliar), not IDENTITY
                                        RECONCILIATION (the same quantity reported under different spellings
                                        needing to be unified) — no evidence of the latter exists (item 7).
                                        Building canonical-identity/alias infrastructure now would solve an
                                        unevidenced problem.
 9. Must raw labels always be preserved : YES, unconditionally, regardless of any future normalization
                                        decision. `Measurement.quantity` already carries the label verbatim
                                        (unexamined, per the adapter's own comment); this must never become a
                                        canonical-label REPLACEMENT — only ever an additional, separate
                                        annotation alongside the untouched original.
10. Should canonicalization be global or sport-aware : NOT YET DECIDABLE from one sample. Two of the three
                                        unknowns (SWOLF, total-strokes) are swim-specific; one (calories) is
                                        generic — a sport-partitioned model would be premature and possibly
                                        mis-shaped without a second sport's evidence showing an actual
                                        cross-sport naming conflict (e.g. "power" meaning different things in
                                        cycling vs. rowing) — none has been observed.
11. Do units participate in metric identity : NOT TODAY, and the trial found no problem with that
                                        separation — "avg-pace" was recognized purely by label match despite
                                        an unusual unit ("s/100m"); recognition and unit remain independent
                                        fields, and that independence worked correctly in the real trial.
12. Is sport/context available at normalization time : NO. Neither `TrainingSummaryRow` nor `ManualInputEntry`
                                        carries a "sport"/"activity type" field. The real CSV DID have that
                                        context (stroke-type labels like "Estilo libre"/"Mixto") but the
                                        trial's transcriber deliberately routed it only into free-text
                                        `notes`, never a structured field — a genuine, real, evidenced gap IF
                                        sport-aware normalization is ever pursued, but not one this spec
                                        resolves.
13. Should aliases live in code, data, or configuration : NOT APPLICABLE YET — no alias evidence exists
                                        (item 7); this becomes a real implementation question only once real
                                        alias evidence appears.
14. Should the recognition catalog remain closed : YES, unchanged — closed-catalog-extended-deliberately is
                                        the discipline this entire arc has followed for every extension (see
                                        this very spec's own genesis); any future RECOGNIZED_METRICS growth
                                        must go through its own approval, never silently.
15. Should unknown metrics continue to be accepted with warnings : YES, unambiguously — the trial's own
                                        findings document classified this "works as designed"; no evidence
                                        suggests changing it.
16. Is fuzzy matching appropriate : NO. Fuzzy string matching (e.g. edit-distance) could silently misclassify
                                        a genuinely different metric as a near-match, creating FALSE
                                        confidence — directly conflicts with "unknown metric ≠ alias." The
                                        trial also found ZERO near-miss-spelling evidence needing reconciling
                                        (item 7) — nothing to fuzzy-match against yet.
17. Is LLM-based metric classification appropriate : NO, more strongly than fuzzy matching. An LLM classifier
                                        IS a form of inference about what a metric "really is," directly
                                        against "Aurora never presents inference as fact" and "metric
                                        normalization ≠ recommendation." It would also require a new
                                        dependency/external call — explicitly forbidden. Rejected outright.
18. Could normalization create Signal/Evidence/RenderingRequest : NO, must never — normalization is a
                                        label-recognition concern entirely within observation intake; it has
                                        no legitimate path to Signal/Evidence (which require the separate,
                                        later, deliberately-gated detectSignals/attachSignalAsEvidence steps)
                                        or RenderingRequest (caller-supplied, Spec 043F/035).
19. Could normalization trigger runtime or delivery : NO — normalization is a pure, synchronous, label-only
                                        concern with zero side effects beyond the ObservationQuality it
                                        already produces.
20. What evidence is still missing : (a) genuine alias/spelling-variance evidence across independently-
                                        sourced real exports (not producible by a hand-transcribed trial); (b)
                                        evidence from a SECOND real sport to know whether a flat global
                                        catalog actually collides across sports; (c) evidence that unit
                                        information is ever needed to disambiguate two same-named-but-
                                        different metrics; (d) evidence of real, SUSTAINED operator friction
                                        volume from "suspicious" warnings (this trial was one-time, not
                                        sustained real usage).
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — extend RECOGNIZED_METRICS only** | **Selected (decision-level only — the actual extension is a future, separately-approved Implementation).** Matches the trial's actual evidence exactly: a recognition-coverage gap, not an alias-reconciliation gap. |
| B — preserve raw label + map known aliases to a canonical metric identity | **Deferred, not selected.** No alias evidence exists (§4 item 7); building this now solves an unevidenced problem. (Raw-label preservation ITSELF is unconditional regardless — Decision 2 — independent of whether alias-mapping machinery is ever built.) |
| C — sport-specific metric vocabularies | **Deferred.** Only one sport evidenced; two of three unknowns are swim-specific but one (calories) is generic — premature and possibly wrong-shaped without a second sport's evidence. |
| D — canonical metric registry with aliases | **Deferred**, same reasoning as B at larger scale — a bigger unevidenced architecture. |
| E — accept every metric with no recognition warning | **Rejected.** Would remove a currently-useful, currently-"works as designed" signal for no evidenced reason. |
| F — fuzzy string matching | **Rejected.** No near-miss-spelling evidence to match against (§4 item 7); risks false confidence (§4 item 16). |
| G — LLM-based metric classification | **Rejected.** Inference presented as fact; new dependency/external call; violates central distinctions outright (§4 item 17). |
| H — normalization creates Signal/Evidence/RenderingRequest | **Rejected outright.** Direct architecture violation — normalization has no legitimate path to any of the three (§4 item 18). |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — Recognition vs. normalization → **recognition only, for now**
Aurora needs only `recognized` / `unknown` (the current model) — **not** raw-label→canonical-identity mapping.
No alias evidence exists (§4 items 7/8); building identity-reconciliation infrastructure now would be
speculative, not evidence-driven.

### `[DECISION]` Decision 2 — Raw label preservation → **unconditional, unchanged**
The source metric label (`Measurement.quantity`) must **always** be preserved verbatim — this holds
regardless of any future normalization decision. If canonicalization is ever built, it must **add** alongside
the untouched original label, **never replace** it.

### `[DECISION]` Decision 3 — Unknown metric behavior → **unchanged: accepted + suspicious warning**
Expected pressure confirmed: keep current behavior. Real evidence confirms it works as designed; nothing in
the trial suggests otherwise.

### `[DECISION]` Decision 4 — Canonical vocabulary shape → **not decided; flat catalog remains the only evidenced-sufficient shape**
`RECOGNIZED_METRICS` stays a **flat, non-partitioned catalog** if/when it is ever extended (a future,
separately-approved step). Sport-specific/hybrid shapes are **not justified** by one swim session's evidence
(§4 item 10) — deciding a shape now would be overengineering from a single sample.

### `[DECISION]` Decision 5 — Real swim vocabulary classification
```text
SWOLF          -> DISTINCT CANONICAL METRIC (swim-specific, no existing equivalent) — a genuine, real gap.
total-strokes  -> DISTINCT METRIC (a count, not a rate; not a "cadence" alias) — a genuine, real gap.
calories       -> DISTINCT, CROSS-SPORT metric — its absence looks like an omission in the ORIGINAL list's
                  scope, not evidence of a sport-specific vocabulary need.
```
None of the three is an alias of anything in `RECOGNIZED_METRICS` today (§4 item 7).

### `[DECISION]` Decision 6 — Units → **do not participate in metric-name recognition; no change**
Unit information stays a separate, independently-preserved field from metric-name recognition. The trial
found this separation worked correctly (`"avg-pace"` was recognized regardless of its unusual `"s/100m"`
unit) — no evidence supports mixing unit into identity/recognition logic.

### `[DECISION]` Decision 7 — Automation → **none**
Normalization/recognition triggers **no** automatic Signal detection, EvidenceCase creation, RenderingRequest
creation, `runOperatorSession`, delivery, or `AthleteDecision` — unchanged from every prior spec in this arc.

### `[DECISION]` Decision 8 — Numeric parsing gap ("1,600") → **tracked separately, not solved here**
The comma-grouped numeric-text parsing failure remains an **explicitly separate** finding — a lexical-NUMBER
problem, categorically distinct from lexical-NAME (metric) recognition. It is **not** bundled into this
spec's scope. A candidate future mission, `Spec 044-C2 — Numeric Lexical Normalization Boundary`, is named
(§10) but **not** recommended as immediate — it requires its own separate approval, exactly as this spec
required its own.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given a real unfamiliar metric label, when intake receives it, then it remains admissible with an explicit
  warning. ✅ (Decision 3; unchanged, confirmed by the 044-C trial.)
Given a known alias, when normalized, then the raw source label remains preserved. ✅ (Decision 2 — though no
  alias case has yet been evidenced, §4 item 7, the preservation rule holds unconditionally regardless.)
Given a canonical metric identity is assigned, when stored, then that assignment is not presented as truth
  about the device or athlete. ✅ (central distinction, §2; no identity assignment is built by this spec at
  all — Decision 1.)
Given a metric remains unknown, when admitted, then no Signal/Evidence/RenderingRequest is created
  automatically. ✅ (Decision 7; Option H rejected, §5.)
Given a recognized metric, when admitted, then recognition is not recommendation-quality proof. ✅ (central
  distinction, §2; unchanged — recognition only ever affects `ObservationQuality`, never truth/recommendation.)
Given a sport-specific metric exists, when vocabulary is evaluated, then it must not force unrelated sports
  into the same semantics. ✅ (Decision 4/10 — no sport-partitioned model is imposed; a flat catalog stays
  sport-neutral by construction, and no cross-sport conflict has been observed to force a change.)
Given the real Garmin value "1,600", when this spec is completed, then its parsing bug remains explicitly
  tracked as a separate finding. ✅ (Decision 8, §1/§6; not solved here, not lost.)
Given no automation boundary is approved, when normalization completes, then runOperatorSession/delivery/
  AthleteDecision do not occur. ✅ (Decision 7.)
Given AC20, when metric normalization is specified, then no production whole-core composer is
  introduced. ✅ (this spec is docs-only and adds no composer of any kind.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · RECOGNIZED_METRICS edit · new dependency · package changes · CSV parser · FIT parser ·
TCX parser · Garmin API · fuzzy/LLM inference implementation · automatic Signal · automatic EvidenceCase ·
automatic RenderingRequest · automatic runOperatorSession · delivery · automatic AthleteDecision ·
API/UI/server · scheduler/worker loop · registry/IaC/deploy · production whole-core composer ·
reflection-composition · AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Manual Data Trial 044-C** — this spec is its direct evidence-driven follow-up; every decision here traces
  to a specific, cited trial finding, not invented need.
- **Impl 044-A1** — `RECOGNIZED_METRICS`/`qualityForMetricLabel` remain exactly as implemented; this spec
  decides only whether/how they may eventually grow, never touching them itself.
- **Spec 001 / Impl 013** — the "faithful scribe, never interpreter" discipline directly grounds Decision 1
  (no unevidenced identity-reconciliation machinery) and Decision 2 (raw label always preserved).
- **Spec 044-B** — the review/admission boundary (technical acceptance ≠ truth) is unaffected; metric
  recognition remains one input an operator reads via `docs/runbooks/operator-observation-review-protocol.md`,
  never a truth claim.
- **AC20** — unchanged; this spec selects no new type, no composer, no code of any kind.

---

## 10. Decision & Next Mission

`[DECISION] Metric normalization boundary: Option A — extend RECOGNIZED_METRICS only (decision-level; the
actual extension is a future, separately-approved Implementation). The current "recognized/unknown + accepted
+ suspicious warning" model is kept; no canonical-identity/alias infrastructure, no sport-specific vocabulary
partitioning, no fuzzy/LLM matching. Raw source label preservation stays unconditional and unchanged. The
numeric "1,600" comma-parsing gap remains an explicitly separate, un-bundled finding.`

```text
selected recognition model        : recognized/unknown (unchanged) — no canonical-identity layer added.
selected canonicalization model   : none — Option A only; canonicalization (Option B/D) deferred, unevidenced.
raw-label preservation decision   : unconditional, unchanged — Measurement.quantity always verbatim.
unknown-metric behavior           : unchanged — accepted + "suspicious" ObservationQuality warning.
sport-specific vocabulary decision: deferred — a flat, sport-neutral catalog remains sufficient; no
                                     partitioning until a second sport's evidence justifies it.
classification — SWOLF            : distinct canonical metric (swim-specific), not an alias.
classification — total-strokes    : distinct metric (a count, not a rate), not an alias.
classification — calories         : distinct, cross-sport metric; its absence looks like an original-list
                                     omission, not a sport-specific-vocabulary need.
unit participation decision       : units do not participate in metric-name recognition; unchanged.
numeric "1,600" gap disposition   : tracked separately (not solved here); candidate future
                                     Spec 044-C2 — Numeric Lexical Normalization Boundary, not recommended now.
automation decision               : none — no Signal/EvidenceCase/RenderingRequest/runOperatorSession/
                                     delivery/AthleteDecision.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-C1A — Metric Vocabulary Implementation Plan.` A technical spec
(still no implementation) naming the EXACT metric names to add to `RECOGNIZED_METRICS` (at minimum: `swolf`,
`total-strokes`, `calories`, informed by §6 Decision 5's classification) and the exact file/diff shape — only
then followed by `Implementation 044-C1A — Canonical Metric Recognition & Alias Mapping` (name notwithstanding
— per this spec's Decision 1, "alias mapping" is NOT actually in scope; the implementation is a flat-catalog
extension only). `Spec 044-C2 — Numeric Lexical Normalization Boundary` (the "1,600" comma-parsing gap) is a
**separate**, independently-approvable candidate mission, not bundled here. Neither is recommended as
*immediate* without its own explicit approval, following this exact spec's own precedent.

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1027/1027** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
