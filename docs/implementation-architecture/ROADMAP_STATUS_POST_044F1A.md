# Aurora — Roadmap Status Checkpoint (post Implementation 044-F1A)

> **Status (2026-07-06).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It closes the **first real third-sport (cycling) evidence arc** (Manual Data Trial 044-F,
> Spec 044-F1, Tech Spec 044-F1A, Impl 044-F1A) and states, per lane, exactly what evidence is required before
> continuing. Validation at authorship: `tsc --noEmit` clean; `node --test` **1091/1091**. Prior checkpoint:
> `...POST_044E1A.md` (`a5f69e3`).

---

## 1. The arc just closed

```text
Manual Data Trial 044-F  — First Real Third-Sport (Cycling) Session Through Intake      (c0f4024)
  → Spec 044-F1          — Real Cycling Metric Vocabulary Boundary                      (346efaf)
  → Tech Spec 044-F1A    — Real Cycling Metric Vocabulary Implementation Plan           (1c95517)
  → Impl 044-F1A         — Extend Real Cycling Metric Vocabulary                        (a10a434)
```

`[FACT]` This arc continues directly from `ROADMAP_STATUS_POST_044E1A.md`, which closed the FIRST cross-sport
(running) real intake evidence arc and explicitly recommended, as the honest next step, either a second
running session or — for the strongest possible generalization test — a real session from a **third sport**.
This arc supplied exactly that: the FIRST real cycling Garmin export, run through the SAME unmodified
production chain used for both swim trials and the running trial, revealing one genuine, narrow,
evidence-driven gap (two unrecognized cycling-specific metric labels) and closing it with the smallest
possible fix — while the base architecture (metric recognition, numeric normalization, missing-value
handling) held completely unmodified across the sport change. **1091/1091**; `tsc --noEmit` clean; AC20
untouched throughout.

---

## 2. All four real trials — historical sequence

`[FACT]` **Trial 044-C — first real swim session** (`d14744f`):
```text
source              : activity_23459651624.csv
current rerun        : status accepted, acceptedCount 21, limitations [], unknown-metric warnings 0
evidence-driven changes from that arc :
  metric vocabulary   : + swolf, total-strokes, calories
  numeric lexical     : + grouped-thousands normalization rule
```

`[FACT]` **Trial 044-D — second real swim session** (`2f2c29e`):
```text
source              : activity_23358314497.csv
current rerun        : status accepted, acceptedCount 41, limitations [], unknown-metric warnings 0
evidence-driven changes from that arc :
  metric vocabulary   : + optimal-pace, avg-strokes-per-length
  missing-value       : exact "--" -> existing MissingDataObservation
```

`[FACT]` **Trial 044-E — first real running session** (`f572cdc`):
```text
source              : activity_17390160500.csv (sport: running)
current rerun        : status accepted, acceptedCount 78, limitations [], unknown-metric warnings 0
                        MeasuredObservation 69, MissingDataObservation 4, subjective/context observations 5
evidence-driven changes from that arc :
  metric vocabulary   : + elevation-loss, max-cadence, avg-stride-length, moving-time, avg-moving-pace
```

`[FACT]` **Trial 044-F — first real cycling session / third sport** (`c0f4024`):
```text
source                : activity_11178669974.csv (sport: cycling — the FIRST third-sport real source)
initial trial result  : status accepted, acceptedCount 48, limitations [], unknown-metric suspicious
                         observations 8 (2 new labels × 4 rows each)
new labels observed    : max-speed, avg-moving-speed
evidence-driven change (Spec 044-F1 -> Tech Spec 044-F1A -> Impl 044-F1A, `a10a434`) :
  RECOGNIZED_METRICS    : 25 -> 27
current rerun          : status accepted, acceptedCount 48, limitations [], unknown-metric warnings 0
                         MeasuredObservation 44, MissingDataObservation 0, subjective/context observations 4
```

---

## 3. Real cycling evidence — exact source facts (Trial 044-F)

```text
4 real data rows            : 3 laps + 1 "Resumen" (whole-session summary) — full source inspected, all 4
                               rows used (nothing cherry-picked out).
44 TrainingSummaryRow        : 11 real, populated metric columns transcribed on every one of the 4 rows.
48 ManualInputEntry          : 44 measured-value + 4 context-note.
48 admitted observations     : 44 measured + 0 missing-data + 4 subjective — nothing lost, nothing rejected.
```

`[FACT]` The source was described by the athlete as a **recreational bicycle trip** — the trial did not
require, and does not claim, formal training-intent structure. `real activity evidence ≠ formal workout
requirement` — this is the same qualification standard already applied to Trials 044-C/044-D/044-E.

---

## 4. Cycling metric-vocabulary changes — what was proven, and what was NOT claimed

`[FACT]` Spec 044-F1 (`346efaf`) → Tech Spec 044-F1A (`1c95517`) → Impl 044-F1A (`a10a434`) added exactly two
real, evidence-classified metric labels to `RECOGNIZED_METRICS` (25 → 27 entries). Each was proven a DISTINCT
metric — never an alias — by real, internally-consistent same-row value relationships, following the same
avg/max-extremum-pairing and elapsed/moving-pairing discipline Impl 044-E1A already established.

```text
max-speed          : recognized source metric ≠ computed maximum ≠ GPS validation ≠ Garmin calculation
                     validation. Evidence: same-row coexistence with avg-speed; distinct real values on all
                     four rows; max-speed >= avg-speed holds without exception on every row
                     (33.1>=18.9, 38.1>=18.0, 29.7>=13.9, 38.1>=17.8).
avg-moving-speed   : recognized source metric ≠ moving-speed formula known ≠ pause-detection logic ≠
                     distance/moving-time runtime derivation. Evidence: same-row coexistence with avg-speed;
                     distinct real values on all four rows; moving-time < duration in EVERY lap — a real
                     pause on every single lap (888<950, 884<1002, 236<337.6, 2008<2290), stronger evidence
                     than Trial 044-E's single-paused-lap case.
```

No universal Garmin formula is claimed for either label — recognition is a name-recognition aid only. Still a
flat, unexported, literal `Set<string>` — no canonical-identity/alias/sport-registry/fuzzy/LLM infrastructure
was introduced. No unit normalization, no cross-observation arithmetic, no speed/pace conversion, no
temporal-semantics model, no Garmin formula of any kind was encoded anywhere in this arc.

---

## 5. Three-sport generalization — what repeated across swim, running, and cycling

1. **One observation-intake architecture handled four independent real Garmin exports** — two swim, one
   running, one cycling — with zero code branching by source file.
2. **The same architecture handled three sports** — swimming, running, cycling.
3. **No sport-specific intake adapter was required** — cycling ran through the exact same
   `TrainingRowSubmission → trainingRowSubmissionToManualInput → ingestManualInput` chain, unmodified.
4. **Flat, explicit metric recognition remained sufficient** — no partitioning was ever needed, across four
   real files and 27 catalog entries.
5. **Evidence-driven catalog extension remained sufficient** — a fourth extension (following swolf/
   total-strokes/calories, then optimal-pace/avg-strokes-per-length, then five running labels), following the
   identical evaluation discipline, now confirmed across a genuinely third sport.
6. **No canonical metric identity was required** — every label across all four trials was classified distinct
   or unrecognized-but-honest; none needed identity reconciliation.
7. **No alias infrastructure was required** — zero alias evidence has appeared across four independent real
   trials.
8. **No sport-specific vocabulary registry was required** — zero cross-sport semantic collisions have been
   observed; cycling introduced a wholly new statistic FAMILY (speed) without colliding with any existing
   pace-family label.
9. **Unknown metrics remained admissible rather than rejected** — all 8 cycling-specific "suspicious"
   observations were faithfully recorded before this arc's fix, exactly as every unfamiliar metric has been
   since Impl 044-A1.
10. **Raw source labels remained preserved** — `max-speed`/`avg-moving-speed` stay exactly those strings in
    `Measurement.quantity`, never rewritten.
11. **Raw source units remained preserved** — cycling's `km`/`km/h` stayed untouched, a third distinct unit
    convention alongside swim's `m`/`s/100m` and running's `km`/`s/km`.
12. **Provenance/`sourceRowId`/`deviceLabel` behavior generalized** identically across all four trials.
13. **No parser/API/automation boundary became necessary** — Trial 044-F's tiny (4-row) file required LESS
    structural handling than either swim file or the running file, not more.
14. **Intake success remained entirely separate from Signal/Evidence/recommendation** — confirmed by all four
    trials' negative-capability tests, unaffected by every fix in this arc.

---

## 6. Speed versus pace — real evidence, current disposition

`[FACT]`
```text
swimming  : pace-family vocabulary (avg-pace, optimal-pace)
running   : pace-family vocabulary (avg-pace, optimal-pace, avg-moving-pace)
cycling   : speed-family vocabulary (avg-speed, max-speed, avg-moving-speed)
```
`[DISPOSITION]` **Different sport vocabularies ≠ a canonical-identity problem.** Cycling naturally reports a
different statistic family than running/swimming — this alone never justifies speed↔pace conversion,
inverse formulas, a canonical velocity identity, or a shared speed/pace abstraction. No such infrastructure
was introduced or is proposed.
```text
[EVIDENCE GATE] Open a speed/pace identity or conversion boundary only when real product behavior requires
reconciliation or conversion between the two families — not merely because both exist.
```

---

## 7. Unit variation — real evidence, current disposition

`[FACT]`
```text
swimming  : distance -> "m"        pace  -> "s/100m"
running   : distance -> "km"       pace  -> "s/km"
cycling   : distance -> "km"       speed -> "km/h"   (the exact source unit found in the Trial 044-F fixture)
```
`[DISPOSITION]` **Works as designed** — not a gap. Aurora preserves `{quantity, magnitude, unit}` per
observation; no functional conflict was observed; no cross-observation arithmetic was required by cycling's
addition of a THIRD distinct unit convention.
```text
more unit variety ≠ current unit-normalization gap
```
This does **not** claim unit normalization is unnecessary forever — the lane remains open, explicitly gated:
```text
[EVIDENCE GATE] Open a Unit Normalization Boundary spec only when real incompatible-unit handling causes an
actual functional problem — not merely when a difference (or a third variant of a difference) is observed.
```

---

## 8. Missing-value evidence — correction, preserved exactly

`[FACT]` Prior generalization evidence:
```text
Trial 044-C original source : 145 occurrences of "--"  (exercised)
Trial 044-D original source : 129 occurrences of "--"  (exercised)
Trial 044-E original source : 61 occurrences of "--"   (exercised)
```
`[CORRECTION]` **Trial 044-F's source contains ZERO occurrences of `"--"`.** Therefore **Trial 044-F did NOT
exercise `MissingDataObservation` behavior** — it neither confirms nor weakens the prior generalization
evidence for that mechanism. This checkpoint does **NOT** write `"--" generalized to cycling`. What Trial
044-F actually demonstrated is different and real: a source can omit an entire metric COLUMN (cadence,
power — absent from this file's header entirely) — `column absent ≠ column present with "--"`.

Current exact `"--"` behavior (`entry.rawValue.trim() === "--"` → the existing `MissingDataObservation`, Impl
044-D2A) remains generalized across **three real exports, two sports** — swimming and running — **not**
cycling. No broader missing-token support has been selected.

---

## 9. Cadence and power — non-evidence

`[FACT]` Trial 044-F's source has no cadence column and no power column at all — absent from the 13-column
header entirely, not present-but-blank. Therefore **no cycling cadence semantics and no cycling power
semantics were exercised**. No cycling cadence support, no cycling power support, no cross-sport cadence
identity, and no power-vocabulary completeness may be inferred from this. No mission is opened.

---

## 10. Current usable path

```text
real/manual training source
  -> external already-parsed rows (TrainingSummaryRow[])
  -> TrainingRowSubmission
  -> trainingRowSubmissionToManualInput(...)    [pure mapper]
  -> ManualInputSubmission
  -> ingestManualInput(...)                     [Manual Input Adapter — known metric recognition, narrow
                                                  numeric normalization where evidenced, exact
                                                  MissingDataObservation handling for "--" when present]
  -> accepted / partially-accepted / rejected
  -> Observation material (MeasuredObservation / SubjectiveObservation / MissingDataObservation)
  -> operator review protocol (docs/runbooks/operator-observation-review-protocol.md)
  -> correction via supersession (ObservationSet.supersede(...), never overwrite)
```
`[FACT]` This is explicitly **NOT**:
```text
a CSV parser · a FIT parser · a TCX parser · Garmin API integration of any kind ·
an automated training-analysis pipeline · a sport-specific runtime
```

---

## 11. What is now proven

1. The same observation-intake architecture handles **four independent real Garmin exports**.
2. The same intake architecture handles **three sports**: swimming, running, cycling.
3. A cycling-specific adapter was **not** needed.
4. A running-specific adapter was **not** needed.
5. Flat metric recognition remains sufficient for every real label observed across all four trials.
6. Cross-sport vocabulary does **not** yet require sport partitioning — zero semantic collisions observed,
   even across a whole new statistic family (speed vs. pace).
7. Real metric labels can be added without canonical identities — four extensions now, identical discipline
   each time.
8. Related average/maximum metrics (`avg-speed`/`max-speed`) can remain distinct recognized labels without
   aggregation infrastructure.
9. Related average/moving-average metrics (`avg-speed`/`avg-moving-speed`) can remain distinct recognized
   labels without runtime formulas.
10. Cycling's speed vocabulary did **not** create a speed/pace identity requirement.
11. Real unit variation — now a THIRD distinct convention — can remain verbatim without immediate
    normalization infrastructure.
12. No functional unit conflict has yet appeared.
13. Unknown labels can remain admitted honestly until evidence supports recognition.
14. Missing-value semantics must only be claimed where the token was actually observed — Trial 044-F is
    explicit proof this discipline holds even when it would be convenient to overstate.
15. Column absence is semantically distinct from a missing token.
16. No parser/API/automation architecture was required for the cycling trial.
17. Historical trial findings remain valid evidence after current behavior improves —
    `docs/trials/044-F-first-real-cycling-session-intake-trial.md`'s original 8-warning finding stays
    historically true even though the live test suite now asserts zero.
18. Fully accepted intake still creates no `Signal`, `EvidenceCase`, `RenderingRequest`, delivery, or
    `AthleteDecision` — confirmed by all four trials' negative-capability tests, unaffected by every fix.
19. **Four** successful trials across **three** sports still do not prove universal multi-sport coverage
    (§13).

---

## 12. What remains intentionally unselected

```text
no CSV parser · no CSV dependency · no FIT parser · no TCX parser · no Garmin API · no Garmin OAuth ·
no automatic sync ·
no sport-specific intake adapter · no cycling module · no running module · no sport dispatch ·
no sport-specific vocabulary registry ·
no canonical metric identity · no alias infrastructure · no canonical speed/pace identity ·
no speed↔pace conversion · no runtime speed derivation · no Garmin formulas ·
no unit normalization · no unit conversion · no canonical unit field · no cross-observation arithmetic ·
no cadence model · no cycling power model ·
no generic locale parser · no broad numeric coercion ·
no missing-token registry · no broad missing-token family ·
no temporal provenance fix · no elapsed-vs-moving time semantic model ·
no row deduplication ·
no automatic Signal creation · no automatic EvidenceCase creation · no automatic RenderingRequest creation ·
no automatic runOperatorSession · no delivery · no automatic AthleteDecision ·
no athlete-facing review UI · no API/server · no scheduler/worker loop · no production whole-core composer
```
Each of these was evaluated at least once across Specs 044-F1/044-F1A and explicitly deferred for lack of
evidence — not overlooked.

---

## 13. Unresolved findings — recorded, not opened as missions

```text
Temporal provenance  : an absolute observedAt instant remains operator-supplied/invented in every trial's
                       manual representation. Cycling added real pause evidence (moving-time < duration on
                       every lap) but no new operational blocker.
  disposition         : known, not operationally blocking, no spec opened.

Unit variation       : three real sport patterns now exist (swim m/s-per-100m, running km/s-per-km, cycling
                       km/km-per-hour) but no functional conflict exists — Aurora performs no
                       cross-observation unit arithmetic.
  disposition         : evidence recorded, no functional conflict, lane remains gated.

Cycling cadence/power : not exercised — both columns entirely absent from the Trial 044-F source.
  disposition          : no evidence, no action.

Missing values in     : not exercised — Trial 044-F's source has zero "--" occurrences.
cycling
  disposition          : no evidence, no action.

Universal vocabulary  : NOT proven — future evidence (another cycling session, another sport) may reveal
  coverage             more unrecognized metrics; four extensions across four trials is a track record, not
                       a ceiling.

Parser pressure       : no new actionable pressure — Trial 044-F's file required less structural handling
                       than any prior trial's file, not more.
```
None of these is turned into a recommended next mission by this checkpoint.

---

## 14. What must NOT be inferred from four real trials across three sports

```text
NOT proven: all Garmin exports are supported · all swim sessions are supported · all running sessions are
supported · all cycling sessions are supported · all sports are supported · all metric labels are known ·
all aliases are resolved · all units are interoperable · all speed/pace relationships are solved ·
all numeric forms are supported · all missing-value tokens are supported · "--" handling is proven for
cycling · cycling cadence is supported · cycling power is supported · Garmin formulas are known ·
temporal provenance is solved · CSV parsing is unnecessary forever · FIT/TCX parsing is unnecessary forever ·
Garmin API is unnecessary forever · recommendation quality is proven · device accuracy is proven ·
training causality is proven · athlete decision is proven
```
```text
four successful trials + three sports = stronger cross-sport evidence, not universal product completeness
```

---

## 15. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **Another real cycling session** | Real export, representative selection, rerun through current production intake — highest-value evidence would naturally include cadence, power, missing-value tokens, or a different speed/unit structure, but none of this may be fabricated. |
| **Second real running session** | Real export, within-running variation, current intake rerun. |
| **A fourth sport** | Real source, actual metric/unit variation, current intake rerun. |
| **New metric vocabulary** | Real unfamiliar labels, frequency/context, semantic-distinction evidence (from values, not label wording). |
| **Alias/canonical identity** | Real DIFFERENT labels demonstrably referring to the SAME semantic metric, and an actual need to reconcile them — still zero evidence across four trials. |
| **Sport-specific vocabulary** | An actual observed cross-sport semantic collision — a sport-specific label alone is insufficient (confirmed again this arc: cycling's two speed labels created zero collision with the pace family). |
| **Speed/pace identity** | An actual product need to reconcile or convert speed and pace representations — different vocabulary alone is insufficient (§6). |
| **Unit normalization** | A real functional conflict caused by incompatible units — variation alone is insufficient, even a third variant of it (§7). |
| **Broader numeric normalization** | A real lexical form outside the current strict + grouped-thousands support. |
| **Broader missing-value semantics** | Real tokens OTHER than the exact `"--"`, with source-context evidence of their own. |
| **Missing value in cycling** | An actual cycling source containing a missing token — not inferred from absent columns (§8). |
| **Cadence/power** | A real cycling source containing actual measured cadence or power values — column names absent from a source provide no evidence (§9). |
| **Temporal provenance** | An operational consequence, or a real interpretation-changing ambiguity — not yet observed. |
| **Parser boundary (CSV)** | Repeated operator burden, transcription errors, important source structure genuinely lost, representative real files. |
| **TCX/FIT** | Real source files, demonstrated structure unavailable in the current summary-row representation. |
| **Garmin API** | A product/operational reason, an OAuth/privacy/rate-limit handling plan, a source-of-truth decision. |
| **Downstream automation** | Each of Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/delivery requires its own separate, approved boundary spec. |
| **AthleteDecision automation** | Remains **forbidden** — stays athlete-declared, never created automatically from intake success. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec. |

---

## 16. Allowed future missions — only if evidence appears

```text
Manual Data Trial 044-G  — A Second Real Cycling Session Through Intake        (needs: within-sport variation
                                                                                 evidence, §15)
Manual Data Trial 044-G  — A Second Real Running Session Through Intake        (needs: within-sport variation
                                                                                 evidence, §15)
Manual Data Trial 044-G  — A First Real Fourth-Sport Session Through Intake    (needs: fourth-sport evidence,
                                                                                 §15)
Spec [TBD]               — Metric Alias Boundary                               (needs: alias evidence, §15)
Spec [TBD]               — Sport-Specific Vocabulary Boundary                  (needs: collision evidence,
                                                                                 §15)
Spec [TBD]               — Speed/Pace Identity Boundary                       (needs: reconciliation/
                                                                                 conversion-need evidence,
                                                                                 §15)
Spec [TBD]               — Unit Normalization Boundary                        (needs: functional-conflict
                                                                                 evidence, §15)
Spec [TBD]               — Broader Numeric Lexical Normalization Boundary     (needs: new numeric-form
                                                                                 evidence, §15)
Spec [TBD]               — Broader Missing Value Semantics Boundary           (needs: new-token evidence,
                                                                                 §15)
Spec [TBD]               — Temporal Provenance Boundary                       (needs: operational-consequence
                                                                                 evidence, §15)
Spec [TBD]               — CSV Parser Boundary                                (needs: CSV-lane evidence, §15)
Spec [TBD]               — TCX/FIT Intake Boundary                            (needs: TCX/FIT-lane evidence,
                                                                                 §15)
Spec [TBD]               — Garmin API Integration Boundary                    (needs: Garmin-lane evidence,
                                                                                 §15)
Spec [TBD]               — Athlete-Facing Observation Review Boundary         (needs: athlete-review
                                                                                 evidence, §15)
```
None of these is recommended **now** — each requires its own future evidence, documented in its own spec, per
the gates in §15. Listing them here is not a queue; it is a map of *where* re-entry is legible if and when
evidence appears.

---

## 17. Central distinctions (carried through the whole arc)

```text
real export ≠ truth · recreational activity ≠ invalid evidence · manual transcription ≠ original artifact ·
accepted intake ≠ truth · recognized metric ≠ Evidence · recognized max-speed ≠ computed maximum ·
recognized avg-moving-speed ≠ Garmin formula known · speed vocabulary ≠ pace canonical identity ·
unit variation ≠ normalization requirement · column absent ≠ missing token observed ·
MissingDataObservation count 0 ≠ missing-value behavior proven in 044-F ·
MissingDataObservation ≠ MeasuredObservation · accepted MissingDataObservation ≠ accepted numeric measurement ·
successful parse ≠ device accuracy · Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
fully accepted activity ≠ recommendation quality · review ≠ athlete decision · provenance ≠ proof ·
four successful trials ≠ universal coverage ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 18. Recommendation

`[RECOMMENDATION] Pause the 044-F implementation arc.`

- **Current confirmed state.** The first real third-sport (cycling) intake evidence arc — one real
  recreational cycling activity, run through the unmodified production chain, closing the one metric-
  vocabulary gap it organically revealed while every other mechanism (numeric normalization, missing-value
  handling, unit preservation, provenance) held completely unmodified — is **complete and proven**. The trial
  that opened this arc now runs fully `accepted` (`acceptedCount: 48`, `limitations: []`, zero unknown-metric
  warnings). All three prior trials (044-C, 044-D, 044-E) were explicitly re-verified unaffected. No parser,
  no Garmin integration, no automation, no unit normalization, no sport registry, no speed/pace
  canonicalization, no UI/API, no AC20 amendment exists or is implied. **1091/1091**; `tsc --noEmit` clean;
  AC20 intact.
- **No actionable third-sport intake gap remains.** Do not open another implementation mission from
  possibility alone.
- **Why pause, not another build.** Every remaining lane (§15) is gated on evidence that does not exist in
  this repository today. Building a unit-normalization layer, a sport registry, a speed/pace canonical
  identity, a CSV parser, or an athlete-facing surface now — merely because four trials succeeded — would
  repeat the premature-commitment mistake this Engineering Playbook discipline exists to prevent, and would
  violate §14's explicit non-inference rule.
- **What is NOT lost by pausing.** The row mapper, the extended adapter (metric vocabulary across three
  sports, numeric normalization, missing-value recognition, unit preservation), the review protocol, and the
  correction mechanism all keep working exactly as documented. Nothing here decays while idle.
- **Next work should begin only from:**
  1. **another real session/source** — preferably either a SECOND cycling session (ideally one naturally
     containing cadence, power, missing-value tokens, or a different unit/speed structure — never fabricated)
     or a FOURTH sport (for the broadest possible cross-sport generalization test), **or**
  2. **a concrete operational limitation** that appears in actual intake/review use — do not invent one.
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; technical acceptance never conflated with truth; corrections always via
  supersession, never overwrite; all four trials' historical findings documents and the prior roadmap
  checkpoint remain untouched, never rewritten.

---

## 19. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1091/1091**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no locale-parsing library, unit-normalization infrastructure, canonical speed/pace
infrastructure, or missing-token registry; no package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK
change. This checkpoint is docs-only.
