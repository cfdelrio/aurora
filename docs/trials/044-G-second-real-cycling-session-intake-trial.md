# Aurora — Manual Data Trial 044-G — Second Real Cycling Session Through Intake

> **Status (2026-07-06).** Manual Data Trial — an EVIDENCE TRIAL, not a new feature. Runs a SECOND,
> independent real Garmin cycling CSV export through the unmodified production intake chain
> (`TrainingRowSubmission -> trainingRowSubmissionToManualInput -> ingestManualInput -> outcome`) and records
> exactly what was empirically observed. No bypass adapter, no direct `Observation` construction, no CSV
> parser, no cycling-specific adapter of any kind. Base at authorship: Impl 044-F1A (`a10a434`), Roadmap
> checkpoint post-044F1A (`c2ab2b8`), `tsc --noEmit` clean, `node --test` **1091/1091**.

---

## 1. Source and evidence qualification

`[FACT]` Attached file: `activity_10673340347.csv` — a real Garmin Connect activity export, supplied directly
by the repository owner/athlete for this trial.

```text
exact attached filename    : activity_10673340347.csv
readability                : readable, well-formed CSV (quoted fields, comma-separated)
source format               : csv-summary (lap + summary rows, Spanish column headers — same convention as
                               Trial 044-F's source)
activity/session identifier : 10673340347 (Garmin's own activity id — genuinely DIFFERENT from Trial 044-F's
                               activity id, 11178669974)
actual activity type        : cycling (column set and value ranges — speed 16-35 km/h, no cadence/power/pace
                               columns — match Trial 044-F's cycling export exactly)
source row count             : 4 real data rows (header + 4 data lines = 5 total lines)
header/column count          : 13 columns
genuine activity export      : yes — real lap/summary structure, real device-style aggregate fields
                               (ascent/descent, calories, avg/max heart rate, avg/max/moving speed)
qualifies as independent
real evidence                : YES — a different real Garmin activity id, different real values throughout,
                               not the same source artifact already used in Trial 044-F
```

`[FACT]` The activity is not described as a race or structured workout. Per the standing qualification rule
carried through this arc: `real activity evidence ≠ formal workout requirement` — a real recreational
cycling activity qualifies as evidence exactly the same as a formal one. This trial makes no claim about
training intent; it only inspects what the source structurally and numerically contains.

`[DECISION] This file qualifies as a second, independent real cycling source. The trial proceeds.`

---

## 2. Source inspection summary

`[FACT]` The complete file was inspected. Exact real structure:

```text
total real rows       : 4 (3 lap rows + 1 "Resumen" summary row)
header (13 columns)   : Vueltas, Tiempo, Tiempo acumulado, Distancia, Velocidad media,
                         Frecuencia cardiaca media, FC máxima, Ascenso total, Descenso total, Calorías,
                         Velocidad máxima, Tiempo en movimiento, Velocidad media en movimiento
row types             : 3 lap rows ("Vueltas"=1,2,3) + 1 summary row ("Vueltas"="Resumen")
rest/pause rows       : none — no separate rest/pause row type exists in this file
segment rows          : none beyond the 3 laps
timestamps            : none as absolute clock times — "Tiempo" (elapsed per lap) and "Tiempo acumulado"
                        (cumulative elapsed time), both in mm:ss[.s] form
duration fields       : "Tiempo" (per-lap elapsed) — mm:ss[.s] form: 18:30, 15:04, 4:03.0, 37:38 (summary)
moving-time fields    : "Tiempo en movimiento" — mm:ss form: 15:06, 13:26, 3:58, 32:30 (summary)
distance fields       : "Distancia" — decimal km: 5.00, 5.00, 1.41, 11.41 (summary)
speed metrics         : "Velocidad media" (avg), "Velocidad máxima" (max), "Velocidad media en movimiento"
                        (avg moving) — all decimal km/h
pace metrics          : NONE — no pace/min-per-km/GAP column exists in this header
heart-rate metrics    : "Frecuencia cardiaca media" (avg, bpm), "FC máxima" (max, bpm)
cadence metrics       : NONE — no cadence column exists in this header (absent entirely, not blank)
power metrics         : NONE — no power column exists in this header (absent entirely, not blank)
elevation metrics     : "Ascenso total" (ascent, m), "Descenso total" (descent, m)
temperature           : NONE — no temperature column exists
calories              : "Calorías" — integer kcal
training effect       : NONE — no training-effect column exists
units                 : km (distance), km/h (all three speed metrics), bpm (heart rate), m (elevation),
                        kcal (calories) — the SAME units as Trial 044-F, no new unit form
missing-value tokens  : ZERO occurrences of "--" anywhere in the 4 data rows — every column is populated on
                        every row
blank fields          : none
numeric punctuation   : plain decimals only (e.g. "16.2", "34.6"); no comma-grouped thousands anywhere (no
                        value in this file reaches four digits in its raw source form)
device/source labels  : none present as an explicit column — same as Trial 044-F, "device" context is an
                        operator-added label, not a source field
duplicate/near-dup    : the summary row's values equal the sum (distance/elevation/calories/moving-time) or
structures             maximum (max-speed, max-heart-rate) of the 3 lap rows, exactly the same aggregate
                        relationship Trial 044-F's summary row exhibited
```

`[FACT]` This header is **structurally identical** to Trial 044-F's source header (same 13 column names, same
order, same language). No field exists in this file that did not already exist in Trial 044-F's file, and no
field from Trial 044-F's file is missing here.

---

## 3. Why it qualifies as independent second cycling evidence

```text
different Garmin activity id : 10673340347 (vs. 11178669974 in Trial 044-F)
different real values        : every numeric value in this file differs from Trial 044-F's file (distances,
                                speeds, heart rates, elevations, calories, durations all distinct)
different lap structure      : 3 laps of 5.00/5.00/1.41 km (vs. Trial 044-F's 5.00/5.00/1.30 km) — similar
                                shape, genuinely different real numbers
same source convention       : same Garmin Connect CSV export format, same Spanish column headers, same
                                cycling-specific column set
```
This is a genuinely separate real training session, not a re-use, re-derivation, or restatement of Trial
044-F's source artifact.

---

## 4. Comparison with Trial 044-F source structure

| Aspect | Trial 044-F (`activity_11178669974.csv`) | Trial 044-G (`activity_10673340347.csv`) |
| --- | --- | --- |
| Data rows | 4 (3 laps + Resumen) | 4 (3 laps + Resumen) — **same row count** |
| Header (13 columns) | Vueltas/Tiempo/.../Velocidad media en movimiento | **identical** column set, same order |
| Cadence column | absent | absent — **same** |
| Power column | absent | absent — **same** |
| `"--"` occurrences | 0 | 0 — **same** |
| Distance unit | km | km — **same** |
| Speed unit | km/h | km/h — **same** |
| New metric labels vs. prior catalog | 2 (`max-speed`, `avg-moving-speed`) | **0** — all 11 labels already recognized |
| Numeric lexical forms | plain decimals, no grouped thousands | plain decimals, no grouped thousands — **same** |
| Every-lap pause evidence (moving-time < duration) | yes, every lap | yes, every lap — **same pattern repeats** |

`[FINDING]` **Structurally, this second cycling source is near-identical to Trial 044-F's** — same header,
same column absence pattern, same missing-value absence, same unit convention. The only real difference is
the numeric content (different real activity, different real values). This makes Trial 044-G primarily a
**within-cycling stability test**, exactly as the mission anticipated: it confirms Impl 044-F1A's fix holds
on a second, independent real source rather than revealing new architecture pressure.

---

## 5. Representative-subset rationale

`[DECISION]` The file is tiny (4 real data rows total) — **the complete file is used**, exactly as Trial
044-F's rationale: preferring the full source over any subset when the source is already small. All 3 laps
and the summary row are transcribed; nothing is cherry-picked. Naturally present categories in this file:
ordinary lap (lap 1, lap 2), short/different-pace lap (lap 3, 1.41 km), summary/aggregate row. Naturally
ABSENT categories (not fabricated): cadence variation, power variation, missing-value row, new unit form,
unfamiliar metric, device/source context beyond the operator-supplied label already used in Trial 044-F.

---

## 6. Fixture provenance

`src/modules/observation/tests/044-g-second-real-cycling-session-fixture.ts` — a manual, structured
representation of all 4 rows of `activity_10673340347.csv`, prepared OUTSIDE Aurora (Aurora has no CSV
parser). Explicitly documented in the fixture file itself:

```text
This fixture is a manual structured representation of selected rows from the attached second real cycling
source.

It is not the original artifact.
It is not truth.
It is not Evidence.
```

No label was normalized, no unit was converted, no missing token was inserted or replaced, no value was
repaired. Time-formatted values (`mm:ss[.s]`) were manually converted to seconds, exactly as Trial 044-F's
fixture did. `observedAt` per row is derived from the source's own "Tiempo acumulado" (cumulative elapsed
time) column added to an operator-supplied session start instant — the same convention Trial 044-F's fixture
used; this is a known, already-documented temporal-provenance gap (§14), not newly introduced here.

---

## 7. Execution path

```text
secondRealCyclingSessionSubmission044G   (TrainingRowSubmission)
  -> trainingRowSubmissionToManualInput(...)     [existing pure mapper, unmodified]
  -> ManualInputSubmission
  -> ingestManualInput({ submission, observationSetRepository })   [existing Manual Input Adapter, unmodified]
  -> ManualInputIngestionOutcome
```
No filesystem IO in production, no CSV library, no cycling-specific adapter, no sport dispatch, no
third-party parser. `RECOGNIZED_METRICS` was **not** touched before running this trial — the existing 27-entry
catalog (as of Impl 044-F1A) was used exactly as it stood.

---

## 8. Actual observed result

`[FACT]` A temporary, deleted probe script (`044-g-PROBE-temp.ts`, never committed) was run BEFORE any test
assertion was written, to observe true behavior:

```text
entries            : 48
status              : accepted
acceptedCount       : 48
limitations         : []
total observations  : 48
measured            : 44
missing-data        : 0
subjective          : 4
suspicious count    : 0
```

The trial is **fully accepted on first contact, with zero unknown-metric warnings** — unlike Trial 044-F
(which began with 8 suspicious observations before Impl 044-F1A), this second cycling source produces zero
suspicious observations from the start, because every one of its 11 real metric labels was already recognized
by the time this trial ran.

---

## 9. Row/entry/observation counts

```text
TrainingSummaryRow count        : 44  (11 metrics x 4 rows)
ManualInputEntry count           : 48  (44 measured-value + 4 context-note)
total admitted observations      : 48
MeasuredObservation count        : 44
MissingDataObservation count     : 0
subjective/context count         : 4
rejected entries                 : 0
limitations                      : []
```
Identical shape to Trial 044-F's counts (44/48/48/44/0/4/0/[]) — a second real cycling source with the same
row/entry/observation cardinality.

---

## 10. Metric-vocabulary findings

```text
unknown-metric observation count : 0
exact unfamiliar labels          : none
frequency per label              : n/a — no unfamiliar label appeared
labels already recognized        : all 11 (duration, distance, avg-speed, avg-heart-rate, max-heart-rate,
                                    elevation-gain, elevation-loss, calories, max-speed, moving-time,
                                    avg-moving-speed) — the last two were discovered by Trial 044-F and
                                    recognized by Impl 044-F1A; all 11 are now recognized (complete)
genuinely new labels             : NONE
alias candidates                 : NONE observed
same-label cross-sport collision : NONE — no label in this file collides semantically with any
                                    swim/running label
same-label intra-cycling         : NONE — max-speed/avg-speed/avg-moving-speed remain distinct, internally
  semantic conflict                consistent same-row relationships (§ Findings 11)
flat catalog sufficiency         : CONFIRMED sufficient again — zero catalog changes needed for this trial
```
`[FINDING]` **Classification: repeated known behavior / within-sport generalization.** This trial adds no new
metric-vocabulary evidence; it confirms Impl 044-F1A's fix generalizes to a second independent cycling
source.

---

## 11. Within-cycling variation findings

`[FACT]` What varies between Trial 044-F and Trial 044-G, within cycling:

```text
metric vocabulary   : IDENTICAL — same 11 labels, no new label, no missing label
units               : IDENTICAL — km / km-h throughout
missing values       : IDENTICAL — zero "--" occurrences in both files
cadence              : IDENTICAL — absent in both files
power                : IDENTICAL — absent in both files
row structure        : IDENTICAL — 3 laps + 1 summary in both files
pause structure      : SAME PATTERN — moving-time < duration on every lap in both files (a real pause every
                       lap), though the exact magnitudes differ (different real activity)
speed metrics        : SAME FAMILY — avg/max/avg-moving speed present in both, real values differ
elevation structure   : SAME FIELDS — ascent/descent totals present in both, real values differ
numeric lexical forms : IDENTICAL — plain decimals, no grouped-thousands form in either file
```
`[FINDING]` **Nothing varies structurally between the two cycling sources.** The only variation is in the
actual numeric content (a different real ride). Required distinction preserved: **a second cycling source ≠
automatic need for cycling architecture** — this trial supplies no evidence for any new cycling-specific
mechanism.

---

## 12. Cadence findings

`[FACT]` No cadence column exists in this source's header (13 columns total, none of them cadence-related) —
absent entirely, exactly as in Trial 044-F. **No actual cadence values exist in this source.** Therefore:
questions 21-27 (exact label, unit, values, avg/max, running-label overlap, semantic collision, sport
partitioning) are **not answerable from this evidence** — there is nothing to inspect. No cadence model, no
cadence vocabulary, and no cross-sport cadence identity is proposed. `[FINDING] Classification: no action
needed — column entirely absent, not evidence of anything.`

---

## 13. Power findings

`[FACT]` No power column exists in this source's header — absent entirely, exactly as in Trial 044-F. **No
actual power values exist in this source.** Therefore: questions 28-35 (exact labels, units, values, which
recognized/unknown, missing-placeholder frequency, narrow-spec justification) are **not answerable from this
evidence**. No power domain model, no FTP model, no zones, no normalized-power formula, and no narrow power
vocabulary spec is proposed. `[FINDING] Classification: no action needed — column entirely absent, not
evidence of anything.`

---

## 14. Cross-sport semantic findings

`[FACT]` This trial introduces no new label, so it introduces no new cross-sport semantic question beyond
what Trial 044-F and Impl 044-F1A already settled: `max-speed`/`avg-moving-speed` remain distinct from
`avg-speed`, and cycling's speed-family vocabulary remains distinct from running/swimming's pace-family
vocabulary, with zero collisions. `[FINDING] Classification: repeated known behavior — no new cross-sport
evidence.`

---

## 15. Unit findings

```text
exact units present         : km (distance), km/h (avg-speed, max-speed, avg-moving-speed), bpm (heart rate),
                               m (elevation), kcal (calories)
same as Trial 044-F          : YES — identical unit set
new cycling units            : NONE
same semantic metric,
  different units             : NONE observed
actual functional conflict    : NONE observed — Aurora performs no cross-observation unit arithmetic
intake behavior incorrect
  because of units             : NO
```
`[FINDING]` **Unit variety ≠ unit-normalization gap** — confirmed again, with zero new evidence for or
against the existing disposition (works as designed). `Classification: repeated known behavior.`

---

## 16. Numeric lexical findings

```text
grouped-thousands forms    : NONE — no raw source value reaches four digits (largest raw value: "37:38" as a
                             time string, "300" as a plain integer)
decimal punctuation         : plain periods only ("16.2", "34.6", "4:03.0") — same convention as every prior
                             trial
new lexical numeric form    : NONE
parsing limitation           : NONE observed
```
`[FINDING] Classification: no action needed.` The existing strict + grouped-thousands numeric normalization
(Impl 044-C2A) was never exercised by any value in this file beyond ordinary decimal parsing.

---

## 17. Missing-value findings

```text
"--" appears                : NO — zero occurrences in the 4 data rows
frequency                    : 0
metrics affected             : none
existing behavior honesty    : the exact "--" check (entry.rawValue.trim() === "--") was simply never
                               triggered — it was not exercised, positively or negatively, by this source
another missing token         : NONE observed (no "N/A", "NA", "null", "-", or blank field anywhere)
new token repeated with
  source-context evidence      : NONE
```
`[CORRECTION — preserved exactly, per this arc's standing discipline]` **This trial does NOT provide cycling
evidence for `MissingDataObservation` behavior.** Exactly like Trial 044-F, Trial 044-G's source has ZERO
occurrences of `"--"`. Two independent real cycling sources now, and neither has exercised the missing-value
mechanism. `column absent ≠ column present with "--"` remains the only real cycling-adjacent finding on this
topic; `"--"` generalization to cycling is still **not claimed** and still rests on zero real cycling
evidence — the existing generalization remains sustained only by Trials 044-C/044-D/044-E (swim/swim/running).
`[FINDING] Classification: missing-value gap remains unexercised in cycling — no action.`

---

## 18. Provenance findings

```text
sourceRowId sufficient    : YES — csv-G-2 through csv-G-5, one per real row, unambiguous
artifactRef sufficient     : YES — "garmin-activity-10673340347" attached to every observation
deviceLabel sufficient     : YES, where set — "Garmin Connect export" on csv-G-2's and csv-G-5's duration
                            entries (mirroring Trial 044-F's convention), absent elsewhere by design
```
`[FINDING] Classification: repeated known behavior — provenance mechanism generalizes again, unchanged.`

---

## 19. Temporal findings

```text
same operator-supplied
  timestamp gap              : YES — occurredAt/observedAt remain operator-invented instants (an assumed
                               session start time), exactly as in every prior trial; the source itself
                               carries only relative elapsed/cumulative time, never an absolute clock time
new elapsed/moving-time
  ambiguity                   : NONE — the same elapsed-vs-moving-time relationship (moving-time < duration
                               on every lap) repeats from Trial 044-F, evidenced again, not newly discovered
operational interpretation
  problem                     : NONE observed
```
`[FINDING] Classification: temporal semantics gap remains known, not newly blocking — no action.`

---

## 20. Review findings

`[FACT]` This trial exercises no operator review step — it stops at `ManualInputIngestionOutcome`, exactly
as every prior trial in this arc. No athlete-facing review pressure was introduced or observed.
`[FINDING] Classification: no action needed.`

---

## 21. Correction/retraction findings

`[FACT]` No correction or retraction scenario is exercised by this trial — `ObservationSet.supersede(...)` is
not invoked. No new evidence on this topic. `[FINDING] Classification: no action needed.`

---

## 22. Parser pressure

```text
important structure lost
  in manual rows                : NO — all 13 real columns' populated content (11 metrics) transcribed;
                                  only the lap-index ("Vueltas") and cumulative-time ("Tiempo acumulado")
                                  columns are used for context/provenance rather than as metrics, exactly as
                                  in Trial 044-F
repeated transcription burden   : the SAME burden as Trial 044-F — a tiny (4-row) file, less burden than
                                  either swim file's interval/sub-lap hierarchy
near-duplicate row pressure     : NONE — 4 distinct rows, no duplication
CSV parser pressure              : NOT increased — if anything, decreased (structurally identical, smaller
                                  than the swim files)
```
`[FINDING] Classification: no action needed — no new parser pressure.`

---

## 23. TCX/FIT pressure

`[FACT]` No structure in this source is unavailable in the current `TrainingSummaryRow` representation — the
same conclusion as every prior trial. `[FINDING] Classification: no action needed.`

---

## 24. Garmin API pressure

`[FACT]` No new product/operational/OAuth/rate-limit pressure appeared. `[FINDING] Classification: no action
needed.`

---

## 25. Downstream automation pressure

```text
athlete-facing review pressure     : none
Signal automation pressure          : none
EvidenceCase pressure               : none
RenderingRequest pressure           : none
operator-runtime triggering pressure : none
delivery pressure                   : none
AthleteDecision pressure            : none
```
Confirmed directly by test 044-G.10 (negative-capability check on the actual JSON outcome).
`[FINDING] Classification: no action needed.`

---

## 26. Comparison with Trials 044-C, 044-D, 044-E, and 044-F

| Trial | Source | Sport | Status | acceptedCount | Limitations | Unknown metrics | Missing-value behavior | Unit variation | Provenance gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 044-C | activity_23459651624.csv | swimming | accepted | 21 | [] | 0 (post-fix) | exercised (145 "--") | m / s-per-100m | operator-supplied timestamps |
| 044-D | activity_23358314497.csv | swimming | accepted | 41 | [] | 0 (post-fix) | exercised (129 "--") | m / s-per-100m | operator-supplied timestamps |
| 044-E | activity_17390160500.csv | running | accepted | 78 | [] | 0 (post-fix) | exercised (61 "--") | km / s-per-km | operator-supplied timestamps |
| 044-F | activity_11178669974.csv | cycling (1st) | accepted | 48 | [] | 0 (post-fix, was 8) | NOT exercised (0 "--") | km / km-h (3rd convention) | operator-supplied timestamps |
| 044-G | activity_10673340347.csv | cycling (2nd) | accepted | 48 | [] | **0 (from first run)** | NOT exercised (0 "--") | km / km-h (same as 044-F) | operator-supplied timestamps |

`[FACT]` What repeated across all five trials: flat metric recognition sufficiency, unknown-metric admission
honesty (until evidence justified recognition), exact `"--"` handling where actually present, provenance
mechanism generalization, zero downstream automation. What repeated across three sports (swim/running/
cycling): one shared intake architecture, no sport-specific adapter, no canonical identity, no alias
infrastructure. What varied within cycling specifically (044-F vs. 044-G): **nothing structural** — same
header, same column-absence pattern, same missing-value absence, same units; only the real numeric content
differs.

`[FACT]` What still cannot be claimed: `five trials + three sports ≠ universal multi-sport support` — no
cadence, no power, and no missing-value evidence exists for cycling after two independent real cycling
sources; a third real cycling source (or a fourth sport) remains needed to test any of those specifically.

---

## 27. What generalized again

1. One observation-intake architecture handled a **fifth** independent real Garmin export.
2. The metric vocabulary Impl 044-F1A extended (27 entries) proved sufficient for a second real cycling
   source with **zero** further catalog change.
3. `max-speed`/`avg-speed` and `avg-moving-speed`/`avg-speed` distinctness evidence repeats identically (real
   avg<=max relationship; real moving-time<duration pause on every lap).
4. Raw labels, real units, and provenance (`sourceRowId`/`artifactRef`/`deviceLabel`) all generalized again,
   unchanged.
5. Intake success remained entirely separate from Signal/Evidence/recommendation (test 044-G.10).

---

## 28. What changed within cycling

`[FACT]` **Nothing structural changed.** The only difference between Trial 044-F and Trial 044-G is the
actual numeric content of a different, real ride. No new metric, no new unit, no missing-value token, no
cadence, no power, no new lexical form, no increased parser pressure appeared.

---

## 29. What remains unexercised

```text
cycling cadence semantics       : still unexercised (2 real cycling sources now, cadence column absent in
                                  both)
cycling power semantics          : still unexercised (2 real cycling sources now, power column absent in
                                  both)
cycling missing-value semantics  : still unexercised (2 real cycling sources now, zero "--" in both)
a functional unit conflict        : still unobserved
a real alias/canonical-identity   : still zero evidence across five trials
  need
a genuine cross-sport semantic    : still zero evidence
  collision
```

---

## 30. What still cannot be claimed

```text
NOT proven by this trial: cycling cadence is supported · cycling power is supported · "--" handling is
proven for cycling · all cycling sessions are supported · all sports are supported · unit normalization is
unnecessary forever · a third sport or another source could not reveal anything new · five successful
trials = universal multi-sport coverage
```
```text
five trials + three sports = stronger within-cycling and cross-sport evidence, not universal product
completeness
```

---

## 31. Evidence-gated recommendation

`[FACT]` This trial revealed **no actionable gap**: status `accepted`, `acceptedCount: 48`, `limitations: []`,
zero unknown-metric warnings from the very first run, zero cadence/power/missing-value evidence (because none
of those exist in this source), zero new units, zero new lexical forms, zero new parser pressure.

`[RECOMMENDATION] No new implementation mission is justified by this trial's evidence.` Per the evidence-gated
next-step rule: no genuinely new metrics appeared (rule 2 does not apply); no alias evidence appeared (rule 3
does not apply); no cadence semantic collision appeared (rule 4 does not apply — cadence never appeared at
all); no power labels appeared (rule 5 does not apply); no unit conflict appeared (rule 6 does not apply); no
new numeric lexical failure appeared (rule 7 does not apply); no new missing token appeared (rule 8 does not
apply); no structure was lost (rule 9 does not apply). Per the rule's final clause: **"If none occurs: do not
invent implementation."**

This trial's primary value is **confirmatory**: it strengthens within-cycling stability evidence (Impl
044-F1A's fix holds on a second, independent real source) without adding new architectural pressure anywhere.
The honest next step remains exactly what the post-044F1A checkpoint already stated: a THIRD real cycling
source that naturally contains cadence, power, or a missing-value token would be the highest-value next
cycling evidence — or a fourth sport for the broadest cross-sport generalization test — or a concrete
operational limitation from actual use. None of those exists yet. This checkpoint does not fabricate them.

---

## 32. Validation & invariants at this trial

`tsc --noEmit` clean; `node --test` **1101/1101** (1091 baseline + 10 new focused 044-G tests). No production
code touched: `RECOGNIZED_METRICS` was inspected, never edited. No new dependency, no package/lockfile
change, no guard weakened. This trial creates no `Signal`/`EvidenceCase`/`RenderingRequest`, calls no
`runOperatorSession`/delivery/`AthleteDecision`, and introduces no production whole-core composer — confirmed
directly by test 044-G.10. AC20 untouched.
