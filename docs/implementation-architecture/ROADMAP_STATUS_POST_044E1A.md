# Aurora — Roadmap Status Checkpoint (post Implementation 044-E1A)

> **Status (2026-07-05).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It closes the **first cross-sport real training intake evidence arc** (Manual Data Trial
> 044-E, Spec 044-E1, Tech Spec 044-E1A, Impl 044-E1A) and states, per lane, exactly what evidence is
> required before continuing. Validation at authorship: `tsc --noEmit` clean; `node --test` **1080/1080**.
> Prior checkpoint: `...POST_044D2A.md` (`7206775`).

---

## 1. The arc just closed

```text
Manual Data Trial 044-E  — First Real Non-Swim (Running) Session Through Intake        (f572cdc)
  → Spec 044-E1          — Real Running Metric Vocabulary Boundary                     (6869fa5)
  → Tech Spec 044-E1A    — Real Running Metric Vocabulary Implementation Plan          (9c51a03)
  → Impl 044-E1A         — Extend Real Running Metric Vocabulary                       (944402a)
```

`[FACT]` This arc continues directly from `ROADMAP_STATUS_POST_044D2A.md`, which closed the SECOND real swim
intake evidence arc and explicitly recommended, as the honest next step, either a third swim session or —
for the strongest possible generalization test — a real session from a **different sport**. This arc
supplied exactly that: the FIRST real non-swim (running) Garmin export, run through the SAME unmodified
production chain used for both prior swim trials, revealing one genuine, narrow, evidence-driven gap (five
unrecognized running-specific metric labels) and closing it with the smallest possible fix — while the base
architecture (metric recognition, numeric normalization, missing-value handling) held completely unmodified
across the sport change. **1080/1080**; `tsc --noEmit` clean; AC20 untouched throughout.

---

## 2. All three real trials — historical sequence

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
source              : activity_17390160500.csv (sport: running — the FIRST non-swim real source)
initial trial result : status accepted, acceptedCount 78, limitations [], unknown-metric suspicious
                        observations 25 (5 new labels × 5 rows each)
new labels observed  : elevation-loss, max-cadence, avg-stride-length, moving-time, avg-moving-pace
evidence-driven change (Spec 044-E1 -> Tech Spec 044-E1A -> Impl 044-E1A, `944402a`) :
  RECOGNIZED_METRICS  : 20 -> 25
current rerun         : status accepted, acceptedCount 78, limitations [], unknown-metric warnings 0
                        MeasuredObservation 69, MissingDataObservation 4, subjective/context observations 5
```

---

## 3. Evidence-driven changes made in this arc

`[FACT]` Spec 044-E1 (`6869fa5`) → Tech Spec 044-E1A (`9c51a03`) → Impl 044-E1A (`944402a`) added exactly five
real, evidence-classified metric labels to `RECOGNIZED_METRICS` (20 → 25 entries). Each was proven a
DISTINCT metric — never an alias — by real, internally-consistent value relationships on the actual source
rows, most decisively by a real mid-lap pause (`csv-E-5`) where the "simple case" and "complex case" diverge
sharply, mirroring the exact same evidentiary pattern Spec 044-D1 established for `optimal-pace`/`avg-pace`.

```text
elevation-loss     : recognized source label ≠ canonical ascent/descent identity ≠ GPS-derived metric.
                     Pairs with the already-recognized elevation-gain as the source's own separate
                     ascent/descent columns — not the same field renamed.
max-cadence        : recognized metric ≠ a cadence aggregation model. An avg/max extremum pairing with
                     avg-cadence, analogous to the catalog's existing avg-heart-rate/max-heart-rate and
                     avg-pace/optimal-pace pattern.
avg-stride-length  : recognized metric ≠ runtime derivation ≠ a stride domain model. No comparable existing
                     entry; recognition only, no computation from distance/cadence/pace.
moving-time        : recognized metric ≠ temporal provenance solved ≠ canonical time semantics. Decisively
                     evidenced distinct from duration by the paused lap (145.5s elapsed vs. 24s moving) —
                     coincides on unpaused laps, diverges under the real complex case.
avg-moving-pace    : recognized metric ≠ Garmin formula known ≠ a derived moving-time/distance calculation.
                     Decisively evidenced distinct from avg-pace (and from optimal-pace) by the same paused
                     lap (1727 s/km overall vs. 285 s/km moving-only).
```

Still a flat, unexported, literal `Set<string>` — no canonical-identity/alias/sport-registry/fuzzy/LLM
infrastructure was introduced. No unit normalization, no cross-observation arithmetic, no temporal-semantics
model, no Garmin formula of any kind was encoded anywhere in this arc.

---

## 4. Cross-sport generalization — what repeated across swim and running

1. **Flat, explicit metric recognition worked across two sports** — no partitioning was ever needed, across
   three real files and 25 catalog entries.
2. **Unknown metrics remained admissible rather than rejected** — every one of the 25 running-specific
   "suspicious" observations was faithfully recorded before this arc's fix, exactly as every unfamiliar
   metric has been since Impl 044-A1.
3. **Evidence-driven catalog extension remained sufficient** — a third extension (following swolf/
   total-strokes/calories, then optimal-pace/avg-strokes-per-length), following the identical evaluation
   discipline, now confirmed across a genuinely different sport.
4. **No canonical metric identity was required** — every label across all three trials was classified
   distinct or unrecognized-but-honest; none needed identity reconciliation.
5. **No alias infrastructure was required** — zero alias evidence has appeared across three independent real
   trials.
6. **No sport-specific registry was required** — zero cross-sport semantic collisions have been observed;
   the fact that a metric is running-specific (or swim-specific) never by itself justified partitioning.
7. **Exact `"--"` missing-value semantics generalized** across three real files and two sports:
   ```text
   Trial 044-C original source : 145 occurrences of "--"
   Trial 044-D original source : 129 occurrences of "--"
   Trial 044-E original source : 61 occurrences of "--"
   ```
   all resolved identically, by the SAME exact-literal-match mechanism, with zero broadening required.
8. **The existing `MissingDataObservation` domain concept generalized outside swimming** — built for Impl
   013's reporter-declared case, extended by Impl 044-D2A for source-declared absence, and now confirmed
   correct for a running source with NO code change of any kind.
9. **`sourceRowId`/provenance/`deviceLabel` behavior generalized** identically across all three trials.
10. **The first non-swim trial succeeded without a running-specific adapter** — the exact same
    `TrainingRowSubmission → trainingRowSubmissionToManualInput → ingestManualInput` chain, unmodified.
11. **No parser/API/automation boundary became necessary** — Trial 044-E's small (5-row) file required LESS
    structural handling than the swim files' interval/sub-lap hierarchy, not more.
12. **Intake success remained entirely separate from Signal/Evidence/recommendation** — confirmed by all
    three trials' negative-capability tests, unaffected by every fix in this arc.

---

## 5. Unit variation — real evidence, current disposition

`[FACT]`
```text
distance     : swim -> "m"        running -> "km"
pace family  : swim -> "s/100m"   running -> "s/km"
```
`[DISPOSITION]` **Works as designed** — not a gap. Aurora's `Measurement` type already carries
`{quantity, magnitude, unit}` independently per observation; no current architecture performs
cross-observation unit arithmetic, comparison, or conversion of any kind. Variation without a functional
consequence is evidence, not (yet) a defect.
```text
unit variation ≠ current unit-normalization gap
```
This does **not** claim unit normalization is unnecessary forever — the lane remains open, explicitly gated:
```text
[EVIDENCE GATE] Open a Unit Normalization Boundary spec only when real incompatible-unit handling causes an
actual functional problem — not merely when a difference is observed.
```

---

## 6. Missing-value generalization — real evidence, current disposition

```text
Trial 044-C original source : 145 occurrences of "--"
Trial 044-D original source : 129 occurrences of "--"
Trial 044-E original source : 61 occurrences of "--"
```
Current behavior (`entry.rawValue.trim() === "--"` → the existing `MissingDataObservation`, Impl 044-D2A)
generalized across **three independent real exports, two sports, and both recognized and unrecognized
metric labels** — confirmed directly in Trial 044-E (test 044-E.4: identical handling for `avg-power`,
already recognized, and `avg-vertical-oscillation`, not recognized). No code change of any kind was needed
to achieve this generalization.
```text
"--" success ≠ broad missing-token support
```
No support has been added, or is proposed, for `"N/A"`, `"NA"`, `"null"`, `"-"`, or blank semantics — zero
real occurrences of any of these have appeared in any of the three files inspected so far.

---

## 7. Current usable path

```text
real/manual training source
  -> external already-parsed rows (TrainingSummaryRow[])
  -> TrainingRowSubmission
  -> trainingRowSubmissionToManualInput(...)    [pure mapper]
  -> ManualInputSubmission
  -> ingestManualInput(...)                     [Manual Input Adapter — known metric recognition, narrow
                                                  numeric normalization where evidenced, exact
                                                  MissingDataObservation handling for "--"]
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

## 8. What is now proven

1. The same observation-intake architecture handles **three independent real Garmin exports**.
2. The same intake architecture handles **two sports** — swimming and running — with zero code branching by
   sport.
3. A running-specific adapter was **not** needed to admit a real running session correctly.
4. Flat metric recognition remains sufficient for every real label observed across three trials and two
   sports.
5. Cross-sport vocabulary does **not** yet require sport partitioning — zero semantic collisions observed.
6. Real metric labels can be added without canonical identities — three extensions now, identical
   discipline each time.
7. Real metric labels can be recognized without encoding vendor formulas — `optimal-pace`/`avg-moving-pace`
   are recognized as NAMES only; Garmin's exact internal computation was never read or assumed.
8. Unknown labels remain admitted honestly — never rejected merely for being unfamiliar, across every trial.
9. Exact structural-absence semantics (`"--"`) generalized across sports, unmodified.
10. `MissingDataObservation` generalized outside swimming with zero code change.
11. Real unit variation can be preserved without immediate normalization infrastructure.
12. Different units alone do **not** constitute a functional gap — confirmed by direct architectural
    inspection (no cross-observation arithmetic exists anywhere).
13. No parser/API/automation architecture was required for the first running trial.
14. Historical failures (or, here, historical "suspicious" counts) remain valid evidence after current
    behavior improves — `docs/trials/044-E-first-real-running-session-intake-trial.md`'s original 25-warning
    finding stays historically true even though the live test suite now asserts zero.
15. Fully accepted intake still creates no `Signal`, `EvidenceCase`, `RenderingRequest`, delivery, or
    `AthleteDecision` — confirmed by all three trials' negative-capability tests, unaffected by every fix.
16. **Three** successful trials across **two** sports still do not prove universal multi-sport coverage (§10).

---

## 9. What remains intentionally unselected

```text
no CSV parser · no CSV dependency · no FIT parser · no TCX parser · no Garmin API · no Garmin OAuth ·
no automatic sync ·
no sport-specific intake adapter · no running module · no sport-specific vocabulary registry ·
no canonical metric identity · no alias infrastructure · no fuzzy matching · no LLM metric classification ·
no unit normalization · no unit conversion · no canonical unit field · no cross-observation arithmetic ·
no generic locale parser · no broad numeric coercion ·
no missing-token registry · no broad missing-token family ·
no temporal provenance fix · no elapsed-vs-moving time semantic model ·
no row deduplication ·
no automatic Signal creation · no automatic EvidenceCase creation · no automatic RenderingRequest creation ·
no automatic runOperatorSession · no delivery · no automatic AthleteDecision ·
no athlete-facing review UI · no API/server · no scheduler/worker loop · no production whole-core composer
```
Each of these was evaluated at least once across Specs 044-E1/044-E1A and explicitly deferred for lack of
evidence — not overlooked.

---

## 10. Unresolved findings — recorded, not opened as missions

```text
Temporal provenance  : an absolute observedAt instant remains operator-supplied/invented in every trial's
                       manual representation. Trial 044-E added no new blocking evidence (its flat lap
                       structure, unlike Trial 044-D's nested sub-laps, introduced no new temporal nuance).
  disposition         : known, not operationally blocking, no spec opened.

Unit variation       : real cross-sport variation exists (distance m vs km, pace s/100m vs s/km) but no
                       functional conflict exists — Aurora performs no cross-observation unit arithmetic.
  disposition         : evidence recorded, lane remains gated on an actual functional conflict.

Universal vocabulary  : NOT proven — future evidence (another running session, a third sport) may reveal
  coverage             more unrecognized metrics; three extensions across three trials is a track record,
                       not a ceiling.

Parser pressure       : no new actionable pressure — Trial 044-E's file required less structural handling
                       than either swim file, not more.
```
None of these is turned into a recommended next mission by this checkpoint.

---

## 11. What must NOT be inferred from three real trials across two sports

```text
NOT proven: all Garmin exports are supported · all swim sessions are supported · all running sessions are
supported · all sports are supported · all metric labels are known · all aliases are resolved ·
all units are interoperable · all numeric forms are supported · all missing-value tokens are supported ·
"--" universally means missing in every source · Garmin formulas are known · temporal provenance is solved ·
CSV parsing is unnecessary forever · FIT/TCX parsing is unnecessary forever ·
Garmin API is unnecessary forever · recommendation quality is proven · device accuracy is proven ·
training causality is proven · athlete decision is proven
```
```text
three successful trials + two sports = stronger cross-sport evidence, not universal product completeness
```

---

## 12. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **Another real running session** | Real export, representative selection, rerun through current production intake — tests variation WITHIN running. |
| **A third sport (the strongest future generalization test)** | Real source, actual metric/unit variation, current intake rerun. |
| **New metric vocabulary** | Real unfamiliar labels, frequency/context, semantic-distinction evidence (from values, not label wording). |
| **Alias/canonical identity** | Real DIFFERENT labels demonstrably referring to the SAME semantic metric — still zero evidence across three trials. |
| **Sport-specific vocabulary** | An actual observed cross-sport semantic collision — a sport-specific label alone is insufficient (confirmed again this arc: five running-specific labels created zero collision). |
| **Unit normalization** | A real functional conflict caused by incompatible units — variation alone is insufficient (§5). |
| **Broader numeric normalization** | A real lexical form outside the current strict + grouped-thousands support. |
| **Broader missing-value semantics** | Real tokens OTHER than the exact `"--"`, with source-context evidence of their own — zero occurrences of any alternative token across three real files. |
| **Temporal provenance** | An operational consequence, or a real interpretation-changing ambiguity — not yet observed. |
| **Parser boundary (CSV)** | Repeated operator burden, transcription errors, important source structure genuinely lost, representative real files. |
| **TCX/FIT** | Real source files, demonstrated structure unavailable in the current summary-row representation. |
| **Garmin API** | A product/operational reason, an OAuth/privacy/rate-limit handling plan, a source-of-truth decision. |
| **Downstream automation** | Each of Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/delivery requires its own separate, approved boundary spec. |
| **AthleteDecision automation** | Remains **forbidden** — stays athlete-declared, never created automatically from intake success. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec. |

---

## 13. Allowed future missions — only if evidence appears

```text
Manual Data Trial 044-F  — A Second Real Running Session Through Intake         (needs: within-sport
                                                                                  variation evidence, §12)
Manual Data Trial 044-F  — A First Real Third-Sport Session Through Intake     (needs: third-sport evidence,
                                                                                  §12)
Spec [TBD]               — Metric Alias Boundary                               (needs: alias evidence, §12)
Spec [TBD]               — Sport-Specific Vocabulary Boundary                  (needs: collision evidence,
                                                                                  §12)
Spec [TBD]               — Unit Normalization Boundary                        (needs: functional-conflict
                                                                                  evidence, §12)
Spec [TBD]               — Broader Numeric Lexical Normalization Boundary     (needs: new numeric-form
                                                                                  evidence, §12)
Spec [TBD]               — Broader Missing Value Semantics Boundary           (needs: new-token evidence,
                                                                                  §12)
Spec [TBD]               — Temporal Provenance Boundary                       (needs: operational-consequence
                                                                                  evidence, §12)
Spec [TBD]               — CSV Parser Boundary                                (needs: CSV-lane evidence, §12)
Spec [TBD]               — TCX/FIT Intake Boundary                            (needs: TCX/FIT-lane evidence,
                                                                                  §12)
Spec [TBD]               — Garmin API Integration Boundary                    (needs: Garmin-lane evidence,
                                                                                  §12)
Spec [TBD]               — Athlete-Facing Observation Review Boundary         (needs: athlete-review
                                                                                  evidence, §12)
```
None of these is recommended **now** — each requires its own future evidence, documented in its own spec,
per the gates in §12. Listing them here is not a queue; it is a map of *where* re-entry is legible if and
when evidence appears.

---

## 14. Central distinctions (carried through the whole arc)

```text
real export ≠ truth · manual transcription ≠ original artifact · accepted intake ≠ truth ·
recognized metric ≠ Evidence · recognized moving-time ≠ temporal provenance solved ·
recognized avg-moving-pace ≠ Garmin formula known · unit variation ≠ normalization requirement ·
MissingDataObservation ≠ MeasuredObservation · accepted MissingDataObservation ≠ accepted numeric measurement ·
successful parse ≠ device accuracy · Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
fully accepted session ≠ recommendation quality · review ≠ athlete decision · provenance ≠ proof ·
three successful trials ≠ universal coverage ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 15. Recommendation

`[RECOMMENDATION] Pause the 044-E implementation arc.`

- **Current confirmed state.** The first cross-sport real-training-intake evidence arc — one real running
  session, run through the unmodified production chain, closing the one metric-vocabulary gap it organically
  revealed while every other mechanism (numeric normalization, missing-value handling, provenance) held
  completely unmodified — is **complete and proven**. The trial that opened this arc now runs fully
  `accepted` (`acceptedCount: 78`, `limitations: []`, zero unknown-metric warnings). Both prior swim trials
  (044-C, 044-D) were explicitly re-verified unaffected. No parser, no Garmin integration, no automation, no
  unit normalization, no sport registry, no UI/API, no AC20 amendment exists or is implied. **1080/1080**;
  `tsc --noEmit` clean; AC20 intact.
- **No actionable cross-sport intake gap remains.** Do not open another implementation mission from
  possibility alone.
- **Why pause, not another build.** Every remaining lane (§12) is gated on evidence that does not exist in
  this repository today. Building a unit-normalization layer, a sport registry, a CSV parser, or an
  athlete-facing surface now — merely because three trials succeeded — would repeat the premature-commitment
  mistake this Engineering Playbook discipline exists to prevent, and would violate §11's explicit
  non-inference rule.
- **What is NOT lost by pausing.** The row mapper, the extended adapter (metric vocabulary across two
  sports, numeric normalization, missing-value recognition), the review protocol, and the correction
  mechanism all keep working exactly as documented. Nothing here decays while idle.
- **Next work should begin only from:**
  1. **another real session/source** — preferably either a SECOND running session (to test within-sport
     variation) or a THIRD sport (for the broadest possible cross-sport generalization test), **or**
  2. **a concrete operational limitation** that appears in actual intake/review use — do not invent one.
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; technical acceptance never conflated with truth; corrections always via
  supersession, never overwrite; all three trials' historical findings documents and the prior roadmap
  checkpoint remain untouched, never rewritten.

---

## 16. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1080/1080**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no locale-parsing library, unit-normalization infrastructure, or missing-token
registry; no package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK change. This checkpoint is
docs-only.
