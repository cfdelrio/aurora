# Aurora — Roadmap Status Checkpoint (post Manual Data Trial 044-G)

> **Status (2026-07-06).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It records the **second independent real cycling intake trial** (Manual Data Trial 044-G,
> `d261d45`) and the within-cycling stability evidence it produced, and states, per lane, exactly what
> evidence is required before continuing. Validation at authorship: `tsc --noEmit` clean; `node --test`
> **1101/1101**. Prior checkpoint: `...POST_044F1A.md` (`c2ab2b8`).

---

## 1. The trial just closed

```text
Manual Data Trial 044-G  — Second Real Cycling Session Through Intake                  (d261d45)
```

`[FACT]` This trial continues directly from `ROADMAP_STATUS_POST_044F1A.md`, which closed the first real
third-sport (cycling) evidence arc and explicitly recommended, as one honest next step, "another real
cycling source — ideally one naturally containing cadence, power, missing values, or a different unit
structure — never fabricated." A second real cycling source was supplied. It did not naturally contain any of
those variations — it is structurally near-identical to Trial 044-F's source — and this checkpoint records
that fact plainly rather than inventing pressure that does not exist. **No production code was touched**:
`RECOGNIZED_METRICS` (27 entries, unchanged since Impl 044-F1A) was inspected, never edited. **1101/1101**
(1091 baseline + 10 new focused trial tests); `tsc --noEmit` clean; AC20 untouched.

---

## 2. All five real trials — current evidence state

```text
044-C  swimming  : accepted / 21 / [] / 0 unknown
044-D  swimming  : accepted / 41 / [] / 0 unknown
044-E  running   : accepted / 78 / [] / 0 unknown
044-F  cycling   : accepted / 48 / [] / 0 unknown   (after evidence-driven vocabulary extension, Impl 044-F1A)
044-G  cycling   : accepted / 48 / [] / 0 unknown   (on FIRST execution — no production change needed)
```

`[FACT]` Current evidence scope:
```text
5 real exports · 3 sports · 2 independent cycling sources · one shared observation-intake architecture
```
```text
5 successful trials ≠ universal multi-sport support
2 successful cycling trials ≠ universal cycling coverage
```

---

## 3. Trial 044-G source facts

```text
source                 : activity_10673340347.csv
activity id             : 10673340347
sport                   : cycling
source rows              : 4  (3 laps + 1 "Resumen" summary row)
header columns            : 13
TrainingSummaryRow count  : 44
ManualInputEntry count    : 48
admitted observations     : 48
MeasuredObservation count : 44
MissingDataObservation count : 0
subjective/context count  : 4
```

`[FACT]` Why it qualifies as independent evidence:
```text
different activity id from Trial 044-F  : 10673340347 vs. 11178669974
different real values                    : every numeric value in this file differs from Trial 044-F's file
separate real source artifact            : supplied directly by the athlete/operator for this trial
same Garmin export family                : same Spanish-header, lap+summary CSV convention as Trial 044-F
```

---

## 4. Trial 044-F versus Trial 044-G — direct comparison

`[FACT]` **Trial 044-F** (`c0f4024` -> Spec 044-F1 `346efaf` -> Tech Spec 044-F1A `1c95517` -> Impl 044-F1A
`a10a434`):
```text
source                : activity_11178669974.csv
initial unknown warnings : 8   (max-speed x4, avg-moving-speed x4)
after Impl 044-F1A       : accepted / 48 / [] / 0 unknown
```

`[FACT]` **Trial 044-G** (`d261d45`):
```text
source                : activity_10673340347.csv
initial execution       : accepted / 48 / [] / 0 unknown  — NO vocabulary gap, NO production change
```

`[FINDING]` The key evidence: **the vocabulary changes introduced from Trial 044-F (`max-speed`,
`avg-moving-speed`) generalized to a second, independent cycling source without any new production change.**
```text
044-G success ≠ proof that the 044-F implementation was universally correct
044-G success = stronger evidence that the current flat catalog was not overfit to one cycling artifact
```

---

## 5. Within-cycling stability — what repeated across both cycling files

```text
same 13-column source structure               : YES (identical header, identical order)
same 4-row pattern                             : YES (3 laps + 1 summary in both)
same 3 laps + summary structure                : YES
same 11 populated metric labels                : YES (duration, distance, avg-speed, avg-heart-rate,
                                                  max-heart-rate, elevation-gain, elevation-loss, calories,
                                                  max-speed, moving-time, avg-moving-speed)
same unit convention                           : YES (km / km-h throughout)
same absence of cadence columns                 : YES (absent entirely in both, not blank)
same absence of power columns                   : YES (absent entirely in both, not blank)
same zero occurrences of "--"                   : YES (0 in both files)
same moving-time < duration pattern every lap   : YES (a real pause on every lap in both files)
same accepted result                            : YES (accepted / 48 / [] in both)
same observation partition                      : YES (44 measured / 0 missing-data / 4 subjective in both)
same provenance mechanism                       : YES (sourceRowId/artifactRef/deviceLabel generalized again)
```

`[FACT]` The two files differ ONLY in:
```text
activity id  ·  actual numeric values  ·  the real activity instance they represent
```

`[FINDING]` This is **structural replication across two cycling sources with different real values** — not
duplicate evidence. Two independently real, differently-valued activities producing the identical structural
and behavioral outcome is precisely the evidence needed to rule out overfitting to one artifact's specific
numbers.

---

## 6. What Trial 044-G actually proved

1. A second independent cycling source passed current intake on **first execution**.
2. No new metric vocabulary was needed.
3. The `max-speed` recognition added after Trial 044-F generalized to a second real source.
4. The `avg-moving-speed` recognition added after Trial 044-F generalized to a second real source.
5. Flat catalog recognition remained sufficient.
6. No cycling-specific adapter was needed.
7. No sport-specific registry was needed.
8. No canonical speed/pace identity was needed.
9. No unit normalization was needed.
10. No parser/API/automation boundary became necessary.
11. The current cycling path was **not** shown to depend on one exact set of numeric values.
12. A successful second source is **replication evidence**, not universal coverage.

---

## 7. What Trial 044-G did NOT exercise

```text
no cadence measurements
no power measurements
no missing-value token
no new unit convention
no new numeric lexical form
no new row structure
no new metric vocabulary
no new same-label cross-sport collision
no new parser pressure
no new operational provenance problem
```
```text
not exercised ≠ supported
not exercised ≠ unsupported
```

---

## 8. Cadence disposition

```text
Trial 044-F : cadence columns absent
Trial 044-G : cadence columns absent
```
Therefore: **cycling cadence remains unexercised** — across two independent real cycling sources now, not
one. Do not infer cycling cadence support, a cross-sport cadence identity, or a sport-specific cadence
collision from this absence. No mission is opened.

---

## 9. Power disposition

```text
Trial 044-F : power columns absent
Trial 044-G : power columns absent
```
Therefore: **cycling power remains unexercised** — across two independent real cycling sources now. Do not
infer power metric support, power vocabulary completeness, FTP semantics, normalized-power semantics, or
power recommendation capability from this absence. No mission is opened.

---

## 10. Cycling missing-value disposition

```text
Trial 044-F : "--" occurrences = 0
Trial 044-G : "--" occurrences = 0
```
Therefore: **cycling `MissingDataObservation` behavior remains unexercised** — across two independent real
cycling sources now. Existing missing-value evidence remains:
```text
Trial 044-C : exercised   Trial 044-D : exercised   Trial 044-E : exercised
```
```text
two cycling files without "--" ≠ "--" proven for cycling
column absent ≠ missing token observed
```
No synthetic evidence is added. No broader missing-value mission is opened.

---

## 11. Unit disposition

```text
Trial 044-F : km / km-h cycling unit convention
Trial 044-G : km / km-h cycling unit convention — IDENTICAL, repeated
```
No functional unit conflict appeared in either file. `[DISPOSITION]` Works as designed.
```text
repeated unit convention ≠ universal cycling unit coverage
unit variation ≠ unit-normalization requirement
```
No Unit Normalization Boundary is opened.

---

## 12. Temporal provenance disposition

`[FACT]` The same operator-supplied timestamp gap repeats: both files carry only relative elapsed/cumulative
time (never an absolute clock time), and both fixtures derive `observedAt` from an operator-assumed session
start instant, exactly as every prior trial in this arc. No new operational consequence appeared.
`disposition: known, not operationally blocking, no spec opened.`

---

## 13. Parser/API pressure disposition

`[FACT]` No important source structure was lost in either cycling file's manual transcription; no repeated
transcription burden beyond what Trial 044-F already established; no near-duplicate row pressure; no
CSV/FIT/TCX/Garmin-API pressure increased. `disposition: no new actionable pressure.`

---

## 14. Current usable path

```text
real/manual training source
  -> external already-parsed rows (TrainingSummaryRow[])
  -> TrainingRowSubmission
  -> trainingRowSubmissionToManualInput(...)    [pure mapper]
  -> ManualInputSubmission
  -> ingestManualInput(...)                     [Manual Input Adapter — known metric recognition, narrow
                                                  numeric normalization where evidenced, exact
                                                  MissingDataObservation handling only where "--" is
                                                  actually present]
  -> accepted / partially-accepted / rejected
  -> Observation material (MeasuredObservation / SubjectiveObservation / MissingDataObservation)
  -> operator review protocol (docs/runbooks/operator-observation-review-protocol.md)
  -> correction via supersession (ObservationSet.supersede(...), never overwrite)
```
`[FACT]` This is explicitly **NOT**:
```text
a CSV parser · a FIT parser · a TCX parser · Garmin API integration of any kind ·
an automated training-analysis pipeline · a cycling runtime
```

---

## 15. What is now proven

1. One intake architecture handled **five** independent real exports.
2. The same architecture handled **three** sports.
3. **Two** independent cycling activities succeeded.
4. The second cycling activity required **no production change**.
5. Evidence-driven vocabulary from the first cycling trial (Impl 044-F1A) generalized to the second.
6. Flat metric recognition remained sufficient.
7. No cycling adapter was needed.
8. No sport-specific vocabulary registry was needed.
9. No canonical speed/pace identity was needed.
10. No unit normalization was needed.
11. No parser/API/automation architecture was needed.
12. Real source variation can be tested without inventing architecture.
13. Replication evidence can strengthen confidence without creating a new implementation lane.
14. Fully accepted intake still creates no `Signal`, `EvidenceCase`, `RenderingRequest`, delivery, or
    `AthleteDecision` — confirmed by test 044-G.10.
15. **Five** successful trials across **three** sports still do not prove universal coverage (§17).

---

## 16. What remains intentionally unselected

```text
no CSV parser · no CSV dependency · no FIT parser · no TCX parser · no Garmin API · no Garmin OAuth ·
no automatic sync ·
no cycling-specific adapter · no cycling module · no sport dispatch ·
no sport-specific vocabulary registry ·
no canonical metric identity · no alias infrastructure · no canonical speed/pace identity ·
no speed↔pace conversion · no runtime speed derivation · no Garmin formulas ·
no unit normalization · no unit conversion · no canonical unit field ·
no cadence model · no cycling power model · no FTP model ·
no broader missing-value support ·
no temporal provenance fix ·
no automatic Signal creation · no automatic EvidenceCase creation · no automatic RenderingRequest creation ·
no automatic runOperatorSession · no delivery · no automatic AthleteDecision ·
no production whole-core composer
```
Each of these was evaluated against this trial's actual evidence and explicitly deferred for lack of
evidence — not overlooked.

---

## 17. Unresolved findings — recorded, not opened as missions

```text
Cycling cadence       : unexercised in both cycling sources.
  disposition          : no evidence, no action.

Cycling power         : unexercised in both cycling sources.
  disposition          : no evidence, no action.

Cycling missing values : unexercised in both cycling sources.
  disposition          : no evidence, no action.

Unit variation        : recorded, no functional conflict, lane remains gated.

Temporal provenance    : known operator-supplied timestamp gap, no new operational consequence.

Universal cycling      : NOT proven.
  coverage

Parser pressure        : no new actionable pressure.
```
None of these is turned into a recommended next mission by this checkpoint.

---

## 18. What must NOT be inferred from five real trials, two of them independent cycling sources

```text
NOT proven: all Garmin cycling exports are supported · all cycling sessions are supported · all cycling
metric labels are known · cycling cadence is supported · cycling power is supported · cycling missing-value
behavior is proven · all unit variants are supported · all row structures are supported · all Garmin exports
are supported · all sports are supported · Garmin formulas are known · temporal provenance is solved ·
CSV/FIT/TCX will never be needed · Garmin API will never be needed · recommendation quality is proven ·
device accuracy is proven · training causality is proven · athlete decision is proven
```
```text
two independent cycling successes = stronger within-cycling evidence, not universal cycling completeness
```

---

## 19. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **Third real cycling source** | Highest value only if it naturally contains variation such as cadence, power, a missing-value token, a different unit convention, a different row structure, or new metric vocabulary — do not search for or fabricate failure. |
| **Fourth sport** | Real source, actual metric/unit variation, current intake rerun. |
| **New metric vocabulary** | Real unfamiliar labels, frequency/context, semantic-distinction evidence. |
| **Cadence semantics** | Actual cycling cadence measurements. |
| **Power semantics** | Actual cycling power measurements. |
| **Missing value in cycling** | An actual cycling source containing a missing token. |
| **Unit normalization** | A real functional conflict caused by incompatible units. |
| **Sport-specific vocabulary** | An actual same-label cross-sport semantic collision. |
| **Parser boundary** | Repeated operator burden, transcription errors, important source structure lost. |
| **TCX/FIT** | Real files, demonstrated structure unavailable in the current row representation. |
| **Garmin API** | A product/operational reason, an OAuth/privacy/rate-limit handling plan, a source-of-truth decision. |
| **Downstream automation** | Each of Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/delivery requires its own separate, approved boundary spec. |
| **AthleteDecision automation** | Remains **forbidden** — stays athlete-declared, never created automatically from intake success. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec. |

---

## 20. Central distinctions (carried through the whole arc)

```text
real export ≠ truth · manual fixture ≠ original artifact · accepted intake ≠ truth ·
replication evidence ≠ universal proof · recognized metric ≠ Evidence ·
same cycling structure twice ≠ all cycling structures supported ·
column absent ≠ missing token observed · MissingDataObservation count 0 ≠ missing-value behavior proven ·
unit repetition ≠ universal unit coverage · Observation ≠ Signal · Signal ≠ Evidence ·
Evidence ≠ recommendation · fully accepted session ≠ recommendation quality · review ≠ athlete decision ·
provenance ≠ proof · five successful trials ≠ universal coverage ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 21. Recommendation

`[RECOMMENDATION] Pause after Trial 044-G.`

- **Current confirmed state.** The second independent real cycling source passed current intake on first
  execution — `accepted`, `acceptedCount: 48`, `limitations: []`, zero unknown-metric warnings, no production
  change of any kind. **1101/1101**; `tsc --noEmit` clean; AC20 intact.
- **No new vocabulary, unit, missing-value, cadence, power, parser, API, or automation gap appeared.**
- **Do not open another implementation mission from replication alone.** Trial 044-G's value is
  confirmatory — it strengthens confidence that Impl 044-F1A's fix was not overfit to one artifact — not a
  new architectural signal.
- **What is NOT lost by pausing.** The row mapper, the extended adapter (metric vocabulary across three
  sports, numeric normalization, missing-value recognition, unit preservation), the review protocol, and the
  correction mechanism all keep working exactly as documented. Nothing here decays while idle.
- **Resume only from:**
  1. a real source containing genuinely new variation — preferably cadence, power, a real missing token, a
     different unit structure, or a different row structure, **or**
  2. a fourth sport, **or**
  3. a concrete operational limitation that appears in actual intake/review use — do not invent one.
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; technical acceptance never conflated with truth; corrections always via
  supersession, never overwrite; all five trials' historical findings documents and the prior roadmap
  checkpoint remain untouched, never rewritten.

---

## 22. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1101/1101**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no locale-parsing library, unit-normalization infrastructure, canonical speed/pace
infrastructure, cadence/power model, or missing-token registry; no package/dependency/runtime/API/UI/CLI/
worker/deployment/CI/SDK change. This checkpoint is docs-only.
