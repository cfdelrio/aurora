# Aurora — Manual Data Trial 044-E — The FIRST Real Non-Swim (Running) Session Through Intake

> **Status (2026-07-05).** Evidence trial, not a spec, not a feature. It runs the FIRST real training
> session from a DIFFERENT SPORT (running) through the unmodified, already-approved production intake path
> (Impl 044-A1 + Impl 044-C1A + Impl 044-C2A + Impl 044-D1A + Impl 044-D2A) and records exactly what
> happened — no code was added to production, no bypass adapter was built, no data was fabricated. This is
> the first strong cross-sport generalization test this arc has run — explicitly not proof of universal
> multi-sport coverage (`ROADMAP_STATUS_POST_044D2A.md` §9/§13).

---

## 1. Source and evidence qualification

**Source:** a real Garmin Connect running-activity CSV export, `activity_17390160500.csv` — supplied
directly by the repository owner (uploaded to this conversation) specifically for this trial. `17390160500`
is Garmin's own activity id, embedded in the filename. The file has 6 lines: a header, 4 real lap rows, and
one "Resumen" (summary) row — a genuine, small (~17-minute, 3.08 km) real running session with per-lap heart
rate, cadence, pace, elevation, and stride data.

**Why this qualifies as real evidence:** it is an unaltered export from a real device/platform (Garmin
Connect), for a real training session, supplied by the athlete/operator themselves — not authored, invented,
or "made realistic" by this trial. It is readable, well-formed CSV text.

**What was NOT done:** the file was **not** parsed by any Aurora code — Aurora still has no CSV parser, no
FIT/TCX parser, and no running-specific adapter was added. Per the mission's rule, ALL 5 real data rows
(the entire real dataset — this file is tiny, so nothing was cherry-picked out) were manually transcribed, by
hand, outside Aurora, into plain `TrainingSummaryRow` data.

---

## 2. Source inspection summary

```text
total source lines (incl. header)   : 6
total real data rows                : 5 (4 laps + 1 "Resumen" summary)
activity type                       : running (inferred from column vocabulary — cadence, stride length,
                                       ground contact time, vertical oscillation — all running-specific
                                       biomechanical metrics; no "Estilo de natación"/stroke-type column
                                       exists at all, unlike the two swim files)

columns available (28 total)        : Vueltas (lap id), Tiempo, Tiempo acumulado, Distancia, Ritmo medio,
                                       GAP medio, Frecuencia cardiaca media, FC máxima, Ascenso total,
                                       Descenso total, Potencia media, Media de W/kg, Potencia máxima,
                                       Máximo de W/kg, Cadencia de carrera media, Tiempo medio de contacto
                                       con el suelo, Equilibrio de TCS medio, Longitud media de zancada,
                                       Oscilación vertical media, Relación vertical media, Calorías,
                                       Temperatura media, Ritmo óptimo, Cadencia de carrera máxima, Tiempo
                                       en movimiento, Ritmo medio en movimiento, Pérdida de velocidad de
                                       paso media, Porcentaje de pérdida de velocidad de paso media

"--" occurrences (direct re-parse)  : 61 of 140 total cells (5 rows × 28 fields minus the lap-id column,
                                       12 columns are "--" on EVERY row — GAP medio, Potencia media, Media
                                       de W/kg, Potencia máxima, Máximo de W/kg, ground-contact-time,
                                       GCT-balance, vertical oscillation, vertical ratio, temperature, and
                                       both stride-speed-loss columns — plus 1 occurrence on "Ascenso total"
                                       for lap 4 only (a real, naturally-occurring gap, not the same
                                       structural cause as the swim files' sub-lap pattern — see §11).
no other absence token               : zero occurrences of "N/A", "NA", "null", or a bare "-" — confirming,
                                       for a THIRD independent real file and a different sport, that "--" is
                                       the sole real placeholder convention observed to date.
numeric punctuation patterns         : all values in this file are small (max computed value: 1727, from
                                       converting "28:47" minutes:seconds pace to seconds) — no comma-grouped
                                       thousands form appears anywhere in the raw source; nothing exercised
                                       the grouped-thousands rule in this trial.
device/source labels                 : none per-row (same as both swim files) — a session-level "Garmin
                                       Connect export" label again applied by the transcriber as advisory
                                       metadata.
duplicate/near-duplicate structures  : none observed — unlike the swim files' interval-summary/sub-lap
                                       duplication, this file's 4 laps + 1 summary are structurally flat,
                                       with no nested repetition.
not seen in the two swim trials      : (a) running-specific biomechanical metrics (cadence, stride length,
                                       ground contact time, vertical oscillation, vertical ratio); (b) a
                                       "moving time"/"moving pace" pair distinct from elapsed
                                       time/overall-pace (evidencing a real athlete PAUSE mid-lap); (c) an
                                       elevation ascent/descent pair; (d) a "GAP" (Grade Adjusted Pace)
                                       field, always blank in this file; (e) distance/pace reported in
                                       km/s-per-km rather than the swim files' m/s-per-100m.
```

Where applicable, the mission's suggested category list was checked directly: **present** — distance,
duration, elapsed vs. moving time, pace, best/optimal pace, heart rate, max heart rate, cadence, stride
length, elevation ascent/descent, calories, lap structure, a pause/rest-like lap. **Absent from this real
file** — speed (as a distinct field from pace), power (column exists but is always "--"), temperature
(always "--"), training effect (no such column at all), ground contact time / vertical oscillation (columns
exist but are always "--").

---

## 3. Representative-subset rationale

**All 5 real rows are used** — this file is small enough that the entire real dataset is the representative
subset; nothing was cherry-picked out:
- **`csv-E-2`** (lap 1) — a clean, steady interval with no pause; establishes the baseline for every core
  metric.
- **`csv-E-3`** (lap 2) — steady, rising heart rate; carries the one selected UNRECOGNIZED-metric-plus-
  missing-value example (`avg-vertical-oscillation`, always "--" in this file).
- **`csv-E-4`** (lap 3) — steady, the highest heart rate of the four laps.
- **`csv-E-5`** (lap 4) — a recovery/cooldown lap with a REAL mid-lap pause: elapsed time (2:25.5) vastly
  exceeds moving time (0:24) — the closest real analogue in this file to the swim trials' "Descanso" rows,
  and the row carrying the ONE naturally-occurring `"--"` for a RECOGNIZED metric that isn't always blank
  (`elevation-gain`/"Ascenso total") — not engineered, simply what the source reports.
- **`csv-E-6`** (`Resumen`) — the whole-session summary; carries the second `avg-power` `"--"` instance,
  confirming that pattern holds at both the lap and session-summary level.

Of the 28 real columns, 14 "core" metrics present on every row were transcribed on all 5 rows (duration,
distance, avg-pace, avg-heart-rate, max-heart-rate, elevation-gain, elevation-loss, calories, optimal-pace,
avg-cadence, max-cadence, avg-stride-length, moving-time, avg-moving-pace); two additional metrics
(`avg-power`, a RECOGNIZED label always `"--"` in this file, and `avg-vertical-oscillation`, an UNRECOGNIZED
label always `"--"`) were each transcribed once, on a representative row, specifically to test missing-value
recognition against both a recognized and an unrecognized metric name. The remaining 10 always-`"--"`
columns (GAP medio, Media de W/kg, Potencia máxima, Máximo de W/kg, ground-contact-time, GCT-balance,
vertical ratio, temperature, both stride-speed-loss columns) were **not** individually transcribed — they
would only duplicate the identical always-missing pattern already evidenced by `avg-power`/
`avg-vertical-oscillation`, adding bulk without new structural variation (documented here, not silently
dropped).

---

## 4. Fixture provenance

**Fixture path:** `src/modules/observation/tests/044-e-real-running-session-fixture.ts` (a data fixture, not
a `.test.ts` file, ignored by the test runner — mirrors `044-c`/`044-d-real-swim-session-fixture.ts`'s
convention). **Trial test path:**
`src/modules/observation/tests/044-e-real-running-session-trial.test.ts` (12 tests, all passing, asserting
exactly what was empirically observed via a temporary, deleted probe script).

The fixture carries an explicit header stating it is a manual structured representation of selected real
rows — **not** the original artifact, **not** truth, **not** Evidence — identical in spirit to Trials
044-C/044-D's fixture headers.

---

## 5. Execution path

```text
TrainingRowSubmission (the real, hand-transcribed rows)
  → trainingRowSubmissionToManualInput(...)   [Impl 044-A1, unmodified]
  → ManualInputSubmission
  → ingestManualInput(...)                     [Impl 013/044-A1/044-C1A/044-C2A/044-D1A/044-D2A, unmodified]
  → ManualInputIngestionOutcome
```
No `Observation` domain object was constructed directly. No parallel/bypass adapter, no running-specific
adapter, was written. No production code was touched by this trial.

---

## 6. Actual observed result

```text
input row count             : 73   (15 rows from csv-E-2, 15 from csv-E-3, 14 from csv-E-4, 14 from csv-E-5,
                                     15 from csv-E-6)
mapped ManualInputEntry      : 78   (73 measured-value + 5 context-note)
outcome status               : accepted            (on FIRST contact — no fix was needed)
accepted observation count   : 78
limitations                  : []
outcome-level quality        : "complete"
```

## 7. Row/entry/observation counts

```text
measured-value entries attempted : 73
measured observations admitted   : 69
missing-data observations admitted : 4  (avg-power ×2, avg-vertical-oscillation ×1, elevation-gain ×1)
context-note entries             : 5   -> 5 subjective observations, all admitted
limitations                      : 0
no row silently dropped          : 73 attempted = 69 measured + 4 missing-data + 0 limitations (test 044-E.3)
```

---

## 8. Metric findings

```text
already-recognized metrics exercised, real values present (quality "complete"): duration, distance,
  avg-pace, avg-heart-rate, max-heart-rate, calories, optimal-pace — all behaved exactly as prior arcs left
  them; no regression.

"avg-cadence" — recognized (complete), exercised by REAL data for the FIRST time in this arc (neither swim
  fixture ever used it) — confirms a catalog entry that had been present since the ORIGINAL 15-entry seed
  list (Impl 044-A1), but never actually evidenced until now, genuinely applies to real running data.

"elevation-gain" — recognized (complete) on 4 of 5 rows; "--" (missing-data) on the 5th (csv-E-5, the paused
  lap) — a RECOGNIZED metric's real value can be a known-missing token too, exactly as the missing-value
  mechanism already allowed; the recognition/missingness axes are independent, confirmed on real data.

"avg-power" — recognized (in the catalog since the original 15-entry seed) but its real value is "--" on
  BOTH selected instances (a lap AND the summary) — this file never once populates it (no power meter
  attached to this run), so this trial provides zero NEW confirmatory evidence that "avg-power" behaves
  correctly on a real POPULATED value — only that recognition + missing-value handling compose correctly.

genuinely NEW, unrecognized metric labels (quality "suspicious", 25 observations = 5 labels × 5 rows each):
  "elevation-loss", "max-cadence", "avg-stride-length", "moving-time", "avg-moving-pace" — none previously
  seen in either swim trial. Each is admitted, honestly flagged, never rejected for being unfamiliar.

"avg-vertical-oscillation" — genuinely new AND its real value is "--" everywhere in this file — the SAME
  missing-data mechanism applies regardless of whether the metric name itself is recognized (confirmed: the
  MissingDataObservation path does not consult metric recognition at all, §11).

classification of the 5 new labels (per the mission's required classification):
  "elevation-loss"     : DISTINCT new metric — the counterpart to the already-recognized "elevation-gain";
                         not an alias (ascent and descent are different real quantities, both present with
                         different real values on every row).
  "max-cadence"        : DISTINCT new metric — analogous to the existing avg/max pairing pattern
                         (avg-heart-rate/max-heart-rate, avg-pace/optimal-pace); confirmed distinct from
                         "avg-cadence" by differing real values on every row (e.g. csv-E-2: 166 vs 176).
  "avg-stride-length"  : DISTINCT new metric — a biomechanical quantity (meters per stride) with no existing
                         analogue in RECOGNIZED_METRICS; real, populated values on every row.
  "moving-time"        : DISTINCT new metric — proven NOT an alias of "duration" by real, dramatically
                         differing values on the paused lap (145.5s elapsed vs. 24s actually moving, test
                         044-E.8).
  "avg-moving-pace"    : DISTINCT new metric — proven NOT an alias of "avg-pace" by the same paused-lap
                         evidence (1727 s/km overall vs. 285 s/km moving-only).
none of the 5 is an alias of anything already in RECOGNIZED_METRICS (checked against elevation-gain,
  avg-cadence, avg-pace/optimal-pace, duration — all ruled out by real differing values, not label wording).

no cross-sport semantic COLLISION appeared — no label means something different across swim vs. running in
  this evidence; "avg-cadence" is exercised by both sport TYPES conceptually (steps vs. strokes per minute)
  but was never actually observed with a real swim value in either swim trial, so there is no real conflict
  to report, only a first confirmatory running use.
```

---

## 9. Unit findings

```text
"distance" now carries a real unit of "km" (this file) vs. "m" (both swim files) — the SAME metric label,
  two different real units, for two different sports. Aurora's Measurement type already carries {quantity,
  magnitude, unit} independently per observation — no cross-observation unit arithmetic exists anywhere in
  current architecture, so this is not (yet) a functional gap, but it IS the first real, concrete evidence
  that "distance" is not unit-uniform across sources. No unit normalization was built or needed for this
  trial to pass.
"avg-pace"/"optimal-pace"/"avg-moving-pace" now carry "s/km" vs. the swim files' "s/100m" — the same
  pattern: same metric label, different real per-sport unit convention, no conflict WITHIN a single sport's
  data, no normalization performed.
"avg-heart-rate"/"max-heart-rate"/"calories" units (bpm/kcal) are IDENTICAL across all three real files —
  the first evidence of genuine cross-sport unit CONSISTENCY for physiologically-universal metrics.
No incompatible/conflicting units were observed WITHIN this file (each metric has exactly one real unit
  throughout) — the variation is cross-FILE (swim vs. running), not an internal contradiction.
```

---

## 10. Numeric lexical findings

```text
No comma-grouped thousands value appears anywhere in this real file (every raw numeric value is small) — the
  grouped-thousands rule (Impl 044-C2A) was simply never exercised by this trial; this is a fact about the
  file, not a regression or a gap.
No ambiguous or unsupported numeric form appeared — every populated numeric field parsed cleanly under the
  existing strict path.
```

---

## 11. Missing-value findings

```text
The exact literal "--" generalizes to a THIRD independent real file and a DIFFERENT sport: 61 real
  occurrences in this file (12 columns always-blank across all 5 rows, plus 1 naturally-occurring instance
  on "Ascenso total"/elevation-gain for the paused lap) — zero occurrences of any other absence token.

A structural difference from the swim files, worth stating precisely: the swim files' "--" pattern was tied
  to ROW HIERARCHY (100% of sub-lap rows, 0% of summary/rest rows). This running file has NO sub-lap/
  interval-nesting structure at all — its "--" pattern is instead tied to WHICH COLUMNS this particular
  device/sensor configuration never populated (no power meter, no HRM-Run/running-dynamics pod, no
  temperature sensor) — a different real-world CAUSE for the same token, not evidence that Aurora's
  recognition mechanism needs to know or distinguish the cause. The exact-string-match mechanism (Spec
  044-D2 Decision 1/7) is correctly agnostic to WHY a value is "--" — it only recognizes THAT it is.

Recognition composes correctly and independently of metric-name recognition: a RECOGNIZED metric
  (avg-power, elevation-gain) and an UNRECOGNIZED one (avg-vertical-oscillation) both produce an identical
  MissingDataObservation shape when their value is "--" — confirmed directly (test 044-E.4). The
  MissingDataObservation's `expected` field carries whatever label the entry had, recognized or not;
  quality.status is uniformly "missing" in both cases, never varying by recognition status.
```

---

## 12. Provenance findings

`sourceRowId`/`artifactRef` are preserved on every observation, exactly as in both swim trials. `deviceLabel`
survives on both rows it was set on (`csv-E-2`, `csv-E-6`).

---

## 13. Temporal findings

Same, already-known, unresolved gap as both swim trials: an absolute session-start instant was invented by
the transcriber (the source carries no absolute clock time, only elapsed/cumulative duration per lap). No
new temporal-semantics issue was observed — this file has no nested-sub-lap-relative-time nuance (Trial
044-D's finding), since it has no nested lap structure at all.

---

## 14. Review findings

`"unparseable-numeric-value"` was never triggered in this trial (no limitation occurred at all) — the
`"unrecognized metric name"` warning (via `"suspicious"` quality) remains self-explanatory, unchanged.

---

## 15. Correction/retraction findings

Not exercised — no transcription error requiring correction occurred, and no admitted observation needed
withdrawal without replacement. Same as both prior trials: this remains an unencountered, still-open gap.

---

## 16. Parser pressure

No new pressure — the file's structure (flat laps + one summary, no nesting) required LESS structural
handling than the swim files' interval/sub-lap hierarchy, not more.

## 17. TCX/FIT pressure

None newly evidenced — the manually-supplied CSV export was entirely sufficient for this trial.

## 18. Garmin API pressure

None — same as both prior trials.

## 19. Downstream automation pressure

None — test 044-E.12 confirms no Signal/EvidenceCase/RenderingRequest/session/delivery/AthleteDecision
appears anywhere in the outcome.

---

## 20. Comparison with Trials 044-C and 044-D

| | Trial 044-C (swim) | Trial 044-D (swim) | Trial 044-E (running) |
| --- | --- | --- | --- |
| Source | `activity_23459651624.csv` | `activity_23358314497.csv` | `activity_17390160500.csv` |
| Status | accepted | accepted | **accepted (on first contact)** |
| acceptedCount | 21 | 41 | 78 |
| Limitations | [] | [] | **[] (none ever occurred)** |
| Unknown metrics | 0 (after fix) | 0 (after fix) | **25 observations / 5 new labels (unfixed — no fix attempted in a trial)** |
| Numeric gaps | fixed (grouped-thousands) | none new (generalized) | **none exercised — no comma-grouped values in this file** |
| Missing-value behavior | N/A (predates the fix) | fixed (exact "--") | **generalized correctly, unfixed-and-untouched, first contact** |
| Provenance gaps | invented absolute timestamp | same, + sub-lap-relative nuance | **same invented-timestamp gap; no sub-lap nuance (flat structure)** |

**What repeated across sports:** the exact `"--"` token (three independent files, two sports, 100%
consistent); the recognized/unrecognized metric-quality split (never rejects for unfamiliarity);
`sourceRowRef`/provenance folding; faithful, non-deduplicating recording; accepted/limitations honesty;
avg-heart-rate/max-heart-rate/calories units staying IDENTICAL across both sports.

**What was swim-specific:** SWOLF, total-strokes, stroke-rate-style metrics; the sub-lap/interval-summary row
nesting (and its associated "--" pattern); meters/s-per-100m units.

**What is running-specific:** cadence/stride-length/ground-contact/vertical-oscillation biomechanical
metrics; elevation ascent/descent; a moving-time/moving-pace pair evidencing real GPS-tracked pauses;
km/s-per-km units.

**What genuinely generalized:** the exact missing-value token; the flat-catalog recognition mechanism (no
sport-specific registry was needed); `"optimal-pace"` (recognized in swim, now confirmed with the IDENTICAL
`optimal-pace ≤ avg-pace` numeric pattern in running — 8 real observations across two sports, zero
exceptions); `"avg-cadence"` (present in the original catalog, now finally exercised by real data);
provenance folding; the faithful-scribe discipline generally.

**What new cross-sport pressure appeared:** the SAME metric label (`"distance"`, `"avg-pace"` family) now
has two real, different, per-sport UNITS — not a conflict within one sport's data, but the first concrete
evidence that unit values are not uniform across sources. Five genuinely new running-specific metric labels
appeared, at real, repeated (5×) frequency, each proven distinct from existing entries by differing real
values, not label wording.

**What still cannot be claimed:** universal running coverage (one file, one short session); universal
multi-sport coverage (two sports only); that `avg-power`/`avg-vertical-oscillation`/any always-"--" column
actually works correctly when POPULATED (never observed with a real value in this file); that the
km-vs-m/s-per-km-vs-s-per-100m unit variation will never need normalization (no functional conflict has yet
arisen, since Aurora performs no cross-observation unit arithmetic); device accuracy; training causality;
recommendation quality.

```text
first non-swim success = one new real cross-sport data point, not universal multi-sport coverage
```

---

## 21. What generalizes across sports

See §20. Most notably: three prior evidence-driven mechanisms (metric recognition, grouped-thousands
normalization not exercised here but structurally unaffected, and exact missing-value recognition) all held,
completely unmodified, against an entirely different sport's real data — meaningful confirmation that none
of them was overfit to swimming.

---

## 22. What does not yet generalize

Metric vocabulary breadth: running introduced 5 new real labels this trial did not add to the catalog (that
decision, per this arc's established discipline, belongs to a separate Spec, not this trial). Units are NOT
normalized across sports (distance/pace differ in unit convention between swim and running) — no functional
problem has arisen from this yet, but it is not "generalized" in the sense of being unified.

---

## 23. Evidence-gated recommendation

Findings classified:

| Finding | Classification |
| --- | --- |
| `"--"` generalizes to a 3rd file / 2nd sport, zero exceptions | cross-sport generalization |
| `"avg-cadence"` finally exercised by real data, works correctly | cross-sport generalization |
| `"optimal-pace"` pattern (≤ avg-pace) holds across sports | cross-sport generalization |
| 5 genuinely new running-specific metric labels | **metric vocabulary gap** |
| `"distance"`/pace-family units differ by sport (km/m, s/km/s/100m) | unit normalization pressure (not yet a functional gap — no cross-observation unit arithmetic exists) |
| No numeric lexical form exercised (no comma-grouped values in file) | no action needed |
| `avg-power`/other always-"--" columns never populated in this file | insufficient evidence (cannot confirm their populated behavior) |
| No cross-sport semantic collision | no action needed |
| No new temporal-semantics nuance (flat structure, no nesting) | no action needed |
| No correction/retraction pressure | no action needed |
| No parser/TCX/FIT/Garmin API/downstream-automation pressure | no action needed |

One real, repeatable, actionable finding rises above "no action needed": **five genuinely new, real,
distinct running-specific metric labels** were observed, each proven distinct (not an alias) by real
differing values, at real 5× frequency across every lap and the summary. This is the same evidence shape,
at comparable or greater scale, that has twice already justified a narrow `RECOGNIZED_METRICS` extension
(Spec 044-C1, Spec 044-D1).

The unit-variation finding (§9/§20) is real and worth recording explicitly, but does NOT yet rise to a
"gap requiring action" — Aurora performs no cross-observation unit arithmetic today, so no functional
consequence has been observed; it is noted as evidence for a possible FUTURE `Unit Normalization Boundary`
spec, gated on an actual observed CONFLICT (not merely a difference), per `ROADMAP_STATUS_POST_044D2A.md`
§10's own evidence gate for that lane.

`[RECOMMENDATION]` The trial **succeeded**: the first real non-swim session flows through the unmodified
production chain correctly, faithfully, and honestly, on FIRST contact (no limitation ever occurred). Every
prior evidence-driven fix (metric recognition, exact missing-value handling) generalized without
modification to a new sport. The one concrete, narrow, evidence-driven next step — mirroring the
044-C1/044-D1 precedent exactly — is a **Spec deciding whether/how to extend `RECOGNIZED_METRICS`** with
`"elevation-loss"`, `"max-cadence"`, `"avg-stride-length"`, `"moving-time"`, and `"avg-moving-pace"` — nothing
more, no alias infrastructure, no sport-specific registry (no collision evidence exists to justify one). The
unit-variation observation remains noted, not spec'd, pending an actual observed conflict. No CSV/FIT/TCX/
Garmin API/downstream-automation lane gained enough evidence to justify opening.

---

## 24. Validation & invariants at this trial

`tsc --noEmit` clean; `node --test` **1080/1080** (1068 baseline + 12 new trial tests). No production code
changed. No parser added. No dependency added. No package/lockfile change. No Signal/EvidenceCase/
RenderingRequest created. No `runOperatorSession`/delivery/AthleteDecision triggered. No production
whole-core composer. AC20 unchanged. `docs/trials/044-C-real-training-intake-trial.md`,
`docs/trials/044-D-second-real-swim-session-intake-trial.md`, and
`docs/implementation-architecture/ROADMAP_STATUS_POST_044D2A.md` were not modified by this trial.
