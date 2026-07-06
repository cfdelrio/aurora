# Aurora — Roadmap Status Checkpoint (post Implementation 044-D2A)

> **Status (2026-07-05).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It closes the **second real training intake evidence arc** (Manual Data Trial 044-D, Spec
> 044-D1, Tech Spec 044-D1A, Impl 044-D1A, Spec 044-D2, Tech Spec 044-D2A, Impl 044-D2A) and states, per lane,
> exactly what evidence is required before continuing. Validation at authorship: `tsc --noEmit` clean;
> `node --test` **1068/1068**. Prior checkpoint: `...POST_044C2A.md` (`0c34c97`).

---

## 1. The arc just closed

```text
Manual Data Trial 044-D  — Run Another Real Swim Session Through Intake                (2f2c29e)
  → Spec 044-D1          — Additional Real Swim Metric Vocabulary Boundary             (da8b4c7)
  → Tech Spec 044-D1A    — Additional Metric Vocabulary Implementation Plan            (3527e1b)
  → Impl 044-D1A         — Extend Additional Real Swim Metric Vocabulary               (c563aa0)
  → Spec 044-D2          — Missing Value Semantics Boundary                            (a335487)
  → Tech Spec 044-D2A    — Missing Value Handling Implementation Plan                  (21f847c)
  → Impl 044-D2A         — Exact Missing-Value Observation Intake                      (d9bcede)
```

`[FACT]` This arc continues directly from `ROADMAP_STATUS_POST_044C2A.md`, which closed the FIRST real
training intake evidence arc (Trial 044-C) and explicitly recommended, as the honest next step, "another
real training-data trial from a different session or sport... to test whether new metric/numeric/unit gaps
appear." This arc supplied exactly that: a SECOND, independent real Garmin Connect swim-session export, run
through the SAME unmodified production chain, revealing two more genuine, narrow, evidence-driven gaps — and
closing both with the smallest possible fix, reusing existing domain concepts throughout. **1068/1068**;
`tsc --noEmit` clean; AC20 untouched throughout.

---

## 2. The second real source and its initial trial

`[FACT]` **Source:** a real Garmin Connect swim-activity CSV export, `activity_23358314497.csv` — a
different, independent session from Trial 044-C's `activity_23459651624.csv`, supplied directly by the
repository owner. **135 real source rows** (134 interval/lap/rest rows + 1 "Resumen" summary), covering a
real ~84-minute, 3,200 m swim session.

`[FACT]` **Selection:** 5 representative real source lines (`csv-D-2`/rest, `csv-D-4`/interval-summary,
`csv-D-5`/sub-lap, `csv-D-7`/richest-interval, `csv-D-136`/`Resumen`) → **36 selected trial rows** → **41
mapped `ManualInputEntry`** (36 measured-value + 5 context-note).

`[FACT]` **Initial observed outcome** (Trial 044-D as originally run, before any fix):
```text
status                            : partially-accepted
acceptedCount                     : 40
limitations                       : ["unparseable-numeric-value"]
unknown-metric suspicious observations : 6
```

`[FACT]` **Real findings from that initial run:**
```text
new, previously-unseen metric labels : "optimal-pace" (×3), "avg-strokes-per-length" (×3)
repeated structural placeholder      : "--" (the real "avg-strokes-per-length" value on csv-D-5)
grouped-thousands numeric forms      : "3,200" (distance), "1,125" (total-strokes) — both on the Resumen row
```
The grouped-thousands rule (Impl 044-C2A) **generalized correctly** to both real values on first contact — no
new numeric-lexical gap appeared; this was confirmed, not assumed (Trial 044-D §10/§18).

---

## 3. Evidence-driven changes made in this arc

### 3.1 Metric vocabulary (Spec 044-D1 → Tech Spec 044-D1A → Impl 044-D1A, `c563aa0`)
```text
RECOGNIZED_METRICS : 18 -> 20 entries — added "optimal-pace" and "avg-strokes-per-length"
```
Both were classified DISTINCT metrics (not aliases) from real, internally-consistent numeric evidence:
`optimal-pace ≤ avg-pace` without exception on every observed row (analogous to the catalog's existing
avg/max pairing pattern); `avg-strokes-per-length ≈ total-strokes ÷ lengths` on every observed row. The
central caution, preserved exactly:
```text
recognized "optimal-pace"        ≠ Garmin's exact formula known ≠ canonical semantic identity ≠ truth
recognized "avg-strokes-per-length" ≠ alias mapping ≠ runtime derivation (no total-strokes÷lengths
                                     computation was added to production — the arithmetic evidence
                                     justified recognition, never recalculation)
```
Still a flat, unexported, literal `Set<string>` — no canonical-identity/alias/sport-registry/fuzzy/LLM
infrastructure was introduced.

### 3.2 Missing value semantics (Spec 044-D2 → Tech Spec 044-D2A → Impl 044-D2A, `d9bcede`)
`[FACT]` **The decisive empirical grounding** — a direct, quote-aware re-parse of BOTH real source files
(not just the trial fixtures):
```text
Trial 044-C original source (activity_23459651624.csv) : 145 occurrences of "--"
Trial 044-D original source (activity_23358314497.csv) : 129 occurrences of "--"

in BOTH real sources, with zero exceptions:
  100% of sub-lap rows carry "--" (for avg-strokes-per-length / calories)
  0%   of interval-summary/rest rows ever do — they always carry a real reported number
  a real, genuine zero is represented separately, honestly, as literal "0" elsewhere in the SAME files
    (e.g. rest-row avg-strokes-per-length) — ruling out conflating "--" with 0
```
This is repeated, cross-session, 100%-consistent structural evidence — not a one-file quirk, not typography-
based guessing.

`[FACT]` **Decision and implementation:**
```text
entry.rawValue.trim() === "--"
  -> the EXISTING MissingDataObservation is constructed and admitted (kind "missing-data",
     expected: entry.label, quality: observationQuality("missing", a reason stating source-declared
     unavailability and preserving the raw token), provenance: the same sourceRowRef-folded provenance
     measured-value already builds)
  -> no numeric magnitude of any kind — no 0, no NaN, no null
  -> no "unparseable-numeric-value" limitation
  -> checked strictly BEFORE parseFiniteNumber, never inferred from a parse failure
```
No new domain type (`MissingDataObservation` already existed, built for exactly this purpose in Impl 013),
no new `ManualInputLimitation` catalog value, no missing-token registry/Set/family (a single string-equality
comparison against one literal constant), no source-format-specific branching, no zero substitution, no
silent omission.

---

## 4. Current rerun results

`[FACT]` **Trial 044-D, current (post-Impl 044-D2A):**
```text
status                             : accepted            (was: partially-accepted)
acceptedCount                      : 41                  (was: 40)
limitations                        : []                  (was: ["unparseable-numeric-value"])
unknown-metric suspicious observations : 0                (was: 6)

the real "--" placeholder row (csv-D-5's avg-strokes-per-length) now produces:
  kind             : "missing-data"
  quality.status   : "missing"
  measurement field: absent entirely (no MeasuredObservation, no invented numeric magnitude)
  quality.reason   : states source-declared unavailability, preserves the literal raw token '"--"'
```

`[FACT]` **Trial 044-C, explicitly re-run as a regression check (unaffected — its fixture contains no `"--"`
entry at all and predates both `"optimal-pace"`/`"avg-strokes-per-length"`):**
```text
status                             : accepted
acceptedCount                      : 21
limitations                        : []
unknown-metric suspicious observations : 0
```

`[FACT]` **Historical evidence rule, honored throughout:** `docs/trials/044-C-real-training-intake-trial.md`,
`docs/trials/044-D-second-real-swim-session-intake-trial.md`, and `ROADMAP_STATUS_POST_044C2A.md` were **not
modified** by any commit in this arc. Each remains the historical record of what its respective ORIGINAL run
actually found — only the LIVE test suite was updated to reflect current, improved behavior.
```text
historical failure ≠ current behavior · current success ≠ rewritten history
```

---

## 5. What is now proven

1. The current intake path handles **two independent real Garmin swim-session exports**, end to end, through
   the unmodified production chain.
2. One successful real trial was **not** universal coverage — the second, independent trial found genuine
   additional variation (two new metric labels, a repeated structural placeholder) that the first trial's
   own 3-line sample never happened to exercise.
3. Real unfamiliar metric labels can be discovered through evidence and added to `RECOGNIZED_METRICS` without
   canonical-identity or alias infrastructure — twice now, with the identical discipline both times.
4. A flat, explicit, unexported metric catalog remains sufficient for every evidence observed across two
   independent real sessions.
5. `"optimal-pace"` can be recognized as a real source label without claiming knowledge of Garmin's exact
   internal formula — recognition is a name-recognition aid, never a semantic-identity claim.
6. `"avg-strokes-per-length"` can be recognized without runtime derivation or alias mapping to
   `total-strokes`/`avg-cadence` — the arithmetic relationship that evidenced its distinctness never became
   production recalculation.
7. The existing grouped-thousands numeric normalization (Impl 044-C2A) generalized, unmodified, to two real
   values from an entirely independent session — `"3,200"` and, for the first time, a non-distance metric,
   `"1,125"` (total-strokes).
8. No broader locale parser was needed to handle either of this session's real numeric forms.
9. A repeated real source placeholder (`"--"`, 274 combined occurrences across two files) can be reliably
   distinguished from malformed numeric text — by structural, cross-session evidence, never by typography
   alone.
10. A known, source-declared structural absence can reuse the EXISTING `MissingDataObservation` domain
    concept — no new type was needed or built.
11. Missing data can be admitted without inventing zero, NaN, a null numeric Measurement, or a
    `MeasuredObservation` of any kind.
12. `acceptedCount` may include an admitted `MissingDataObservation` without implying a numeric measurement
    exists — the existing count already means "faithfully recorded material," not "a number was measured."
13. Malformed values (`"abc"`, ambiguous comma forms, `"-"`, `"---"`, `"N/A"`, `"NA"`, `"null"`) remain fully
    distinguishable from the one known, evidenced missing-value token — none of them was reclassified.
14. Historical trial failures remain valid, unmodified evidence even after current behavior improves — proven
    twice now (Impl 044-C2A's numeric fix, Impl 044-D2A's missing-value fix), both times without touching the
    original findings documents.
15. Intake success still creates no `Signal`, `EvidenceCase`, `RenderingRequest`, delivery, or
    `AthleteDecision` — confirmed by both trials' negative-capability tests, unaffected by either fix.
16. **Two** successful swim trials still do not prove universal swim coverage, let alone universal sport
    coverage (§8).

---

## 6. Current usable path

```text
real/manual training source
  -> external already-parsed rows (TrainingSummaryRow[])
  -> TrainingRowSubmission
  -> trainingRowSubmissionToManualInput(...)    [pure mapper]
  -> ManualInputSubmission
  -> ingestManualInput(...)                     [Manual Input Adapter — metric recognition, numeric
                                                  normalization where narrowly supported, missing-value
                                                  recognition where exactly evidenced]
  -> accepted / partially-accepted / rejected
  -> Observation material (MeasuredObservation / SubjectiveObservation / MissingDataObservation)
  -> operator review protocol (docs/runbooks/operator-observation-review-protocol.md)
  -> correction via supersession (ObservationSet.supersede(...), never overwrite)
```
`[FACT]` This is explicitly **NOT**:
```text
a CSV parser · a FIT parser · a TCX parser · Garmin API integration of any kind ·
an automated training-analysis pipeline (no Signal/Evidence/RenderingRequest/session is ever automatic)
```

---

## 7. What remains intentionally unselected

```text
no CSV parser · no CSV dependency · no FIT parser · no TCX parser · no Garmin API · no Garmin OAuth ·
no automatic sync ·
no generic locale parser · no broad numeric coercion ·
no canonical metric identity · no alias infrastructure · no sport-specific vocabulary registry ·
no fuzzy metric matching · no LLM metric classification ·
no missing-token registry · no broad family of missing tokens · no source-format-specific placeholder
  framework ·
no timestamp/provenance fix · no nested elapsed-time semantic model · no row deduplication ·
no automatic Signal creation · no automatic EvidenceCase creation · no automatic RenderingRequest creation ·
no automatic runOperatorSession · no delivery · no automatic AthleteDecision ·
no athlete-facing review UI · no API/server · no scheduler/worker loop · no production whole-core composer
```
Each of these was evaluated at least once across Specs 044-D1/044-D1A/044-D2/044-D2A and explicitly deferred
for lack of evidence — not overlooked.

---

## 8. Separate unresolved findings (recorded, not opened as missions)

```text
Temporal provenance : an absolute session-start instant remains operator-supplied/invented in the trial's
                       own manual representation; Trial 044-D additionally observed that a nested sub-lap
                       row's own cumulative-time field is relative to its PARENT interval's start, not the
                       whole session.
  disposition        : known finding, not currently operationally blocking, no spec opened.

Near-duplicate rows  : the real Trial 044-D source contains near-duplicate row structures (an interval-level
                       summary and a single-length sub-lap reporting slightly different values for the SAME
                       physical length) — recorded faithfully as two separate observations, never merged.
  disposition        : mild parser-structure pressure, not enough evidence for a parser/deduplication
                       architecture, no spec opened.
```
Neither is turned into a recommended next mission by this checkpoint.

---

## 9. What must NOT be inferred from two successful real swim trials

```text
NOT proven: all Garmin exports are supported · all swim sessions are supported · all sports are supported ·
all metric labels are known · all units are normalized · all numeric lexical forms are supported ·
all missing-value tokens are supported · "--" universally means missing outside the observed evidence ·
Garmin's internal optimal-pace formula is known · timestamp semantics are solved ·
CSV parsing is unnecessary forever · FIT/TCX parsing is unnecessary forever ·
Garmin API is unnecessary forever · recommendation quality is proven · device accuracy is proven ·
training causality is proven · athlete decision is proven
```
```text
two successful trials = stronger evidence for ONE current path, not universal product completeness
```

---

## 10. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **A third real session** | Another real export, honest provenance, representative selection, rerun through the current production intake path. |
| **Another sport (the strongest future generalization test)** | A real non-swim session, actual metric/unit variation, rerun through the current intake path. |
| **New metric vocabulary** | Real unfamiliar labels, observed frequency/context, semantic-distinction evidence (from values, not label wording). |
| **Alias/canonical identity** | Real DIFFERENT source labels demonstrably referring to the SAME semantic metric — hand-normalized transcription alone remains insufficient (it cannot, by its own methodology, produce this evidence). |
| **Sport-specific vocabulary** | A real cross-sport semantic collision, or a demonstrated need for partitioned vocabulary — still zero evidence of either across three trials' worth of catalog extensions. |
| **Unit normalization** | Real incompatible/conflicting unit forms for the same metric, actually observed. |
| **Broader numeric normalization** | Real lexical forms outside the current strict + grouped-thousands support (e.g. a genuine decimal-comma sample). |
| **Broader missing-value semantics** | Real source tokens OTHER than the exact `"--"`, with source-context evidence of their own — `"N/A"`/`"NA"`/`"null"`/`"-"`/blank semantics must NOT be added speculatively; zero occurrences of any of them exist in either real file inspected so far. |
| **Temporal provenance** | An operational consequence, or a real ambiguity that materially changes interpretation — not yet observed. |
| **Parser boundary (CSV)** | Repeated operator burden, transcription errors, important source structure genuinely lost, representative real source files. |
| **TCX/FIT** | Real source files, demonstrated structure unavailable in the current summary-row representation. |
| **Garmin API** | A product/operational reason, an OAuth/privacy/rate-limit handling plan, a source-of-truth decision. |
| **Downstream automation (Signal/EvidenceCase/RenderingRequest/runOperatorSession/delivery)** | Each requires its own separate, approved boundary spec. |
| **AthleteDecision automation** | Remains **forbidden** — stays athlete-declared, never created automatically from successful intake. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec. |

---

## 11. Allowed future missions — only if evidence appears

```text
Manual Data Trial 044-E  — A Third Real Swim Session Through Intake            (needs: another-session evidence, §10)
Manual Data Trial 044-E  — A First Real Non-Swim Session Through Intake        (needs: another-sport evidence, §10)
Spec [TBD]               — Metric Alias Boundary                              (needs: alias evidence, §10)
Spec [TBD]               — Unit Normalization Boundary                        (needs: unit-conflict evidence, §10)
Spec [TBD]               — Broader Numeric Lexical Normalization Boundary     (needs: new numeric-form evidence, §10)
Spec [TBD]               — Broader Missing Value Semantics Boundary           (needs: new-token evidence, §10)
Spec [TBD]               — Temporal Provenance Boundary                       (needs: operational-consequence evidence, §10)
Spec [TBD]               — CSV Parser Boundary                                (needs: CSV-lane evidence, §10)
Spec [TBD]               — TCX/FIT Intake Boundary                            (needs: TCX/FIT-lane evidence, §10)
Spec [TBD]               — Garmin API Integration Boundary                    (needs: Garmin-lane evidence, §10)
Spec [TBD]               — Athlete-Facing Observation Review Boundary         (needs: athlete-review evidence, §10)
```
None of these is recommended **now** — each requires its own future evidence, documented in its own spec, per
the gates in §10. Listing them here is not a queue; it is a map of *where* re-entry is legible if and when
evidence appears.

---

## 12. Central distinctions (carried through the whole arc)

```text
real export ≠ truth · manual transcription ≠ original artifact · accepted intake ≠ truth ·
recognized metric ≠ Evidence · recognized "optimal-pace" ≠ Garmin's exact formula known ·
missing measurement ≠ zero · MissingDataObservation ≠ MeasuredObservation ·
accepted MissingDataObservation ≠ accepted numeric measurement ·
lexical normalization ≠ locale certainty · successful parse ≠ device accuracy ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
fully accepted session ≠ recommendation quality · review ≠ athlete decision · provenance ≠ proof ·
current success ≠ rewritten history · two successful trials ≠ universal coverage ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 13. Recommendation

`[RECOMMENDATION] Pause the 044-D implementation arc.`

- **Current confirmed state.** The second real-training-intake evidence arc — one independent real Garmin
  swim session, run through the unmodified production chain, closing both the metric-vocabulary gap and the
  missing-value gap it organically revealed — is **complete and proven**. The trial that opened this arc now
  runs fully `accepted` (`acceptedCount: 41`, `limitations: []`, zero unknown-metric warnings). The first
  trial (044-C) was explicitly re-verified unaffected. No parser, no Garmin integration, no automation, no
  UI/API, no AC20 amendment exists or is implied. **1068/1068**; `tsc --noEmit` clean; AC20 intact.
- **No known actionable intake gap remains in the second real swim trial.** Do not open another
  implementation mission from possibility alone.
- **Why pause, not another build.** Every remaining lane (§10) is gated on evidence that does not exist in
  this repository today. Building a CSV parser, a broader missing-token family, a locale parser, or an
  athlete-facing surface now — merely because two trials succeeded — would repeat the premature-commitment
  mistake this Engineering Playbook discipline exists to prevent, and would violate §9's explicit
  non-inference rule.
- **What is NOT lost by pausing.** The row mapper, the extended adapter (metric vocabulary + numeric
  normalization + missing-value recognition), the review protocol, and the correction mechanism all keep
  working exactly as documented. Nothing here decays while idle.
- **Next work should begin only from:**
  1. **another real session/source — preferably a different sport, for the broadest possible generalization
     test** (a genuinely new real export, of a different sport if available, re-run through this same
     unmodified production chain), **or**
  2. **a concrete operational limitation** that appears in actual intake/review use — do not invent one.
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; technical acceptance never conflated with truth; corrections always via
  supersession, never overwrite; both trials' historical findings documents and the prior roadmap checkpoint
  remain untouched, never rewritten.

---

## 14. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1068/1068**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no locale-parsing library, numeric-parsing dependency, or missing-token registry; no
package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
