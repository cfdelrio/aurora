# Aurora — Manual Data Trial 044-F — The FIRST Real Third-Sport (Cycling) Session Through Intake

> **Status (2026-07-05).** Evidence trial, not a spec, not a feature. It runs the FIRST real training
> session from a THIRD SPORT (cycling) through the unmodified, already-approved production intake path
> (Impl 044-A1 + Impl 044-C1A + Impl 044-C2A + Impl 044-D1A + Impl 044-D2A + Impl 044-E1A) and records
> exactly what happened — no code was added to production, no bypass adapter was built, no data was
> fabricated. This is the strongest cross-sport generalization test this arc has run so far — explicitly not
> proof of universal multi-sport coverage (`ROADMAP_STATUS_POST_044E1A.md` §11/§15).

---

## 1. Source and evidence qualification

**Source:** a real Garmin Connect cycling-activity CSV export, `activity_11178669974.csv` — supplied
directly by the repository owner (uploaded to this conversation), described by the athlete as a recreational
bicycle trip. `11178669974` is Garmin's own activity id, embedded in the filename. The file has 5 lines: a
header, 3 real lap rows, and one "Resumen" (summary) row — a genuine, small (~38-minute, 11.30 km) real
cycling activity with per-lap speed, heart rate, and elevation data.

**Why this qualifies as real evidence:** it is an unaltered export from a real device/platform (Garmin
Connect), for a real activity, supplied by the athlete/operator themselves — not authored, invented, or
"made realistic" by this trial. Per the mission's explicit rule, a recreational trip qualifies exactly like
a structured workout — the trial does not require race data, intervals, or performance intent.

**Why this qualifies as the first third-sport trial:** the source's own vocabulary (`Velocidad
media`/`Velocidad máxima` — average/maximum SPEED, not pace) and the complete ABSENCE of any pace/GAP/
stroke-count/cadence/power column confirms this is a genuinely different activity type from both prior
sports (swim: `Ritmo`/pace + stroke metrics; running: `Ritmo`/pace + cadence + stride-length metrics).
Cycling's natural vocabulary is speed-based, not pace-based — itself a real, notable cross-sport finding
(§9).

**What was NOT done:** the file was **not** parsed by any Aurora code — Aurora still has no CSV parser, no
FIT/TCX parser, and no cycling-specific adapter was added. Per the mission's rule, ALL 4 real data rows (the
entire real dataset — this file is tiny) were manually transcribed, by hand, outside Aurora.

---

## 2. Source inspection summary

```text
total source lines (incl. header)   : 5
total real data rows                : 4 (3 laps + 1 "Resumen" summary)
activity type                       : cycling (inferred from column vocabulary — "Velocidad media"/"Velocidad
                                       máxima" [avg/max SPEED], no pace/GAP field, no stroke or cadence
                                       column at all; consistent with the athlete's own description)

columns available (13 total)        : Vueltas (lap id), Tiempo, Tiempo acumulado, Distancia, Velocidad
                                       media, Frecuencia cardiaca media, FC máxima, Ascenso total, Descenso
                                       total, Calorías, Velocidad máxima, Tiempo en movimiento, Velocidad
                                       media en movimiento

"--" occurrences                    : ZERO — the first file in this entire arc with no missing-value
                                       placeholder anywhere. Every column is populated on every row.
no other absence token               : zero occurrences of "N/A", "NA", "null", or a bare "-" either.
numeric punctuation patterns         : all values are small plain decimals/integers — no comma-grouped
                                       thousands form appears anywhere in the raw source.
device/source labels                 : none per-row (same as all three prior files) — a session-level
                                       "Garmin Connect export" label again applied by the transcriber as
                                       advisory metadata.
duplicate/near-duplicate structures  : none observed — this file's 3 laps + 1 summary are structurally flat,
                                       like the running file, unlike the swim files' sub-lap nesting.
not seen in any prior trial          : (a) speed-family metrics (avg/max speed, avg moving speed) as the
                                       PRIMARY pace-equivalent vocabulary, rather than a secondary/absent
                                       field; (b) a real, non-trivial pause on EVERY SINGLE lap (unlike
                                       running, where only one lap out of four was paused) — consistent with
                                       a recreational trip with traffic stops; (c) a THIRD distinct real unit
                                       convention for distance/speed (km / km-per-hour, distinct from both
                                       swim's m/s-per-100m and running's km/s-per-km); (d) a file with NO
                                       cadence column and NO power column at all — not present-but-blank
                                       (the running file's pattern), but genuinely ABSENT from the header,
                                       a different real shape of "missing" than the "--" placeholder.
```

Per the mission's checklist, inspected directly against the real source: **present** — distance, duration,
elapsed vs. moving time, avg speed, max speed, moving speed, heart rate, max heart rate, elevation
ascent/descent, calories, lap structure. **Absent from this real file** — pace/GAP (cycling here reports
speed, not pace, at all), cadence (no rpm column of any kind), power/normalized power (no watts column of
any kind), temperature, training effect, left/right balance, pedal smoothness, torque effectiveness, grade/
slope (only cumulative ascent/descent totals, no per-point gradient).

---

## 3. Representative-subset rationale

**All 4 real rows are used** — this file is tiny enough that the entire real dataset is the representative
subset; nothing was cherry-picked out:
- **`csv-F-2`** (lap 1) — a steady early segment, moderate heart rate.
- **`csv-F-3`** (lap 2) — similar pace, slightly higher heart rate; the source's own peak max-speed value
  (38.1 km/h) first appears here.
- **`csv-F-4`** (lap 3) — a short (1.30 km), notably slower final segment — the lowest avg-speed (13.9 km/h)
  and lowest calories (31) of the three laps.
- **`csv-F-5`** (`Resumen`) — the whole-session summary; the same 38.1 km/h max-speed value repeats here
  (the session-wide peak equals lap 2's peak — a real, internally-consistent cross-check).

All 11 real, populated metric columns were transcribed on every one of the 4 rows (nothing was left
untranscribed for lack of relevance — this file, unlike the running file, has no always-blank columns to
selectively sample from, since it simply has no such columns at all).

---

## 4. Fixture provenance

**Fixture path:** `src/modules/observation/tests/044-f-real-cycling-session-fixture.ts` (a data fixture, not
a `.test.ts` file, ignored by the test runner — mirrors the `044-c`/`044-d`/`044-e` fixture convention).
**Trial test path:** `src/modules/observation/tests/044-f-real-cycling-session-trial.test.ts` (11 tests, all
passing, asserting exactly what was empirically observed via a temporary, deleted probe script).

The fixture carries an explicit header stating it is a manual structured representation of selected real
rows — **not** the original artifact, **not** truth, **not** Evidence.

---

## 5. Execution path

```text
TrainingRowSubmission (the real, hand-transcribed rows)
  → trainingRowSubmissionToManualInput(...)   [Impl 044-A1, unmodified]
  → ManualInputSubmission
  → ingestManualInput(...)                     [unmodified across all six prior implementation slices]
  → ManualInputIngestionOutcome
```
No `Observation` domain object was constructed directly. No parallel/bypass adapter, no cycling-specific
adapter, was written. No production code was touched by this trial.

---

## 6. Actual observed result

```text
input row count             : 44   (11 metrics × 4 rows — every real, populated column on every real row)
mapped ManualInputEntry      : 48   (44 measured-value + 4 context-note)
outcome status               : accepted            (on FIRST contact — no fix was needed)
accepted observation count   : 48
limitations                  : []
outcome-level quality        : "complete"
```

## 7. Row/entry/observation counts

```text
measured-value entries attempted : 44
measured observations admitted   : 44
missing-data observations admitted : 0   (the source has zero "--" — nothing to trigger this path)
context-note entries             : 4    -> 4 subjective observations, all admitted
limitations                      : 0
no row silently dropped          : 44 attempted = 44 measured + 0 missing-data + 0 limitations (test 044-F.3)
```

---

## 8. Metric-vocabulary findings

```text
already-recognized metrics exercised, real values present (quality "complete"): duration, distance,
  avg-heart-rate, max-heart-rate, calories — behaved exactly as every prior arc left them; no regression.

"elevation-gain"/"elevation-loss"/"moving-time" — recognized (complete), all three exercised by a THIRD sport
  for the first time (they entered the catalog via the running arc, Impl 044-E1A) — full cross-sport
  generalization, zero code change needed.

"avg-speed" — recognized (complete), exercised by REAL data for the FIRST time in this ENTIRE arc (neither
  swim nor running trial ever used it, despite it being present in the catalog since the ORIGINAL 15-entry
  seed list, Impl 044-A1). This confirms a speculatively-seeded catalog entry genuinely applies to real
  cycling data, three implementation arcs after it was first added.

genuinely NEW, unrecognized metric labels (quality "suspicious", 8 observations = 2 labels × 4 rows each):
  "max-speed", "avg-moving-speed" — neither previously seen in any swim or running trial. Each is admitted,
  honestly flagged, never rejected for being unfamiliar.

classification:
  "max-speed"        : DISTINCT new metric — an avg/max extremum pairing with "avg-speed", exactly analogous
                       to the catalog's existing avg-heart-rate/max-heart-rate, avg-pace/optimal-pace, and
                       avg-cadence/max-cadence pattern (test 044-F.6: max-speed >= avg-speed on every real
                       row, e.g. csv-F-2: 33.1 vs 18.9).
  "avg-moving-speed" : DISTINCT new metric — proven NOT an alias of "avg-speed" by a real pause on EVERY
                       SINGLE lap (test 044-F.7): duration always exceeds moving-time (e.g. csv-F-2: 950s
                       elapsed vs. 888s moving), and avg-speed always differs from avg-moving-speed as a
                       direct consequence (18.9 vs. 20.3 km/h). This is a STRONGER evidence base than the
                       running trial's single paused lap — cycling evidences the distinction on every row.
neither is an alias of anything already recognized — both ruled out by real, differing values, not label
  wording, mirroring this arc's established discipline exactly.
```

---

## 9. Cross-sport semantic findings

```text
No same-label cross-sport semantic collision was observed. Every label shared with a prior sport
  (elevation-gain/elevation-loss/moving-time from running; distance/duration/avg-heart-rate/max-heart-rate/
  calories from all prior trials) behaves with the SAME semantic role in cycling as before — an elevation
  gain is still a real ascent total, a moving-time is still elapsed-time-minus-pauses, regardless of sport.

Cadence: NOT exercised at all by this file — no cadence column exists in this cycling export (unlike
  running's "Cadencia de carrera media"/"máxima", already recognized as avg-cadence/max-cadence). This trial
  provides ZERO evidence, either confirming or refuting, whether cycling cadence (pedal revolutions per
  minute) would collide semantically with running cadence (steps per minute) if it ever appeared — a
  genuine evidence gap, honestly reported rather than assumed either way.

Power: NOT exercised at all — no power/watts column exists in this file (unlike running's "Potencia media"/
  "máxima", which existed but was always "--"). Column-absent and column-present-but-blank are two
  DIFFERENT real shapes of "no data" (§11) — this file exhibits the former for power, the latter never
  applies here since this file has no such columns to begin with.

Speed/pace: cycling's real vocabulary is speed-based (km/h), never pace-based — the source contains no
  "Ritmo"/pace/GAP field of any kind. This is real, direct evidence that NOT every sport touches every
  metric family; cycling simply does not report pace at all in this export.

No evidence justifies sport-specific vocabulary partitioning — the fact that "max-speed"/"avg-moving-speed"
  are cycling-evidenced does not, by itself, constitute a collision; per this arc's established discipline
  (Spec 044-D1/044-E1), a sport-specific label alone never justifies a registry.
```

---

## 10. Unit findings

```text
"distance" now carries a THIRD real unit convention: "km" (matches running's convention, differs from
  swim's "m"). "avg-speed"/"max-speed"/"avg-moving-speed" carry "km/h" — a genuinely NEW unit family not
  seen in either prior sport (swim used no speed metric at all; running used pace, "s/km", never speed).
"avg-heart-rate"/"max-heart-rate"/"calories" units (bpm/kcal) remain IDENTICAL across all three real sports
  — reinforcing the prior finding that physiologically-universal metrics share units consistently.
No functional unit conflict occurred — every metric in this file has exactly one real unit throughout; the
  variation is cross-SPORT (a third convention alongside the first two), not an internal contradiction.
Aurora performs no cross-observation unit arithmetic anywhere in current architecture, so three different
  real unit conventions for "distance" (m / km / km, effectively two conventions: swim's m vs. both
  running's and cycling's km) and two for the pace/speed family (s/100m, s/km, km/h) remain evidence of
  variation, not yet a functional gap.
```

---

## 11. Numeric lexical findings

```text
No comma-grouped thousands value appears anywhere in this real file — the grouped-thousands rule (Impl
  044-C2A) was not exercised. No ambiguous or unsupported numeric form appeared — every value parsed cleanly
  under the existing strict path.
```

---

## 12. Missing-value findings

```text
"--" did NOT appear anywhere in this file — a genuinely notable, first-of-its-kind real finding for this
  arc. This is not a failure of the missing-value mechanism; it simply means this particular device/export
  configuration reported every column it chose to include. The absence of a metric here manifests
  differently than in the swim/running files: those files' always-blank columns EXISTED in the header but
  reported "--" on every row; this cycling file's absent metrics (cadence, power, pace) have NO
  CORRESPONDING COLUMN AT ALL. Aurora's intake never "notices" a column that was never exported — there is
  no "--" to encounter because there is no header entry to prompt a transcriber to include it as a row in
  the first place. This is a real, worth-stating distinction: "column present but blank" and "column absent
  entirely" are two different real shapes an absent measurement can take, and only the former ever reaches
  Aurora's missing-value mechanism at all.
No other absence token ("N/A"/"NA"/"null"/bare "-") appeared either.
Because "--" never occurred, this trial provides NO new generalization evidence for the missing-value
  mechanism specifically (it was simply not exercised) — but it does NOT contradict or weaken the prior
  finding (three files, two sports, 335 combined occurrences in the swim/running files) either.
```

---

## 13. Provenance findings

`sourceRowId`/`artifactRef` are preserved on every observation, exactly as in all three prior trials.
`deviceLabel` survives on both rows it was set on (`csv-F-2`, `csv-F-5`).

---

## 14. Temporal findings

Same, already-known, unresolved gap as every prior trial: an absolute session-start instant was invented by
the transcriber (the source carries no absolute clock time, only elapsed/cumulative duration per lap). No
new temporal-semantics issue was observed — this file, like the running file, has a flat lap structure with
no nested sub-lap-relative-time nuance (that finding was specific to the swim files' interval hierarchy).
This trial does newly evidence a real, non-trivial pause on EVERY lap (not just one, as in running) —
reinforcing, not newly complicating, the existing `moving-time`/`duration` distinction.

---

## 15. Review findings

No new warning vocabulary was needed — `"unrecognized metric name"` (via `"suspicious"` quality) remains
self-explanatory for `max-speed`/`avg-moving-speed`, exactly as for every prior new-metric finding.

---

## 16. Correction/retraction findings

Not exercised — no transcription error requiring correction occurred, and no admitted observation needed
withdrawal without replacement. Same as every prior trial: this remains an unencountered, still-open gap.

---

## 17. Parser pressure

No new pressure — if anything, LESS structural handling was required than either swim file (no sub-lap
nesting) or the running file (no missing-value handling was even exercised); this file's flat, fully-populated
structure was the simplest of the four real trials so far.

## 18. TCX/FIT pressure

None newly evidenced — the manually-supplied CSV export was entirely sufficient for this trial.

## 19. Garmin API pressure

None — same as every prior trial.

## 20. Downstream automation pressure

None — test 044-F.11 confirms no Signal/EvidenceCase/RenderingRequest/session/delivery/AthleteDecision
appears anywhere in the outcome.

---

## 21. Comparison with Trials 044-C, 044-D, and 044-E

| | 044-C (swim) | 044-D (swim) | 044-E (running) | 044-F (cycling) |
| --- | --- | --- | --- | --- |
| Source | `activity_23459651624.csv` | `activity_23358314497.csv` | `activity_17390160500.csv` | `activity_11178669974.csv` |
| Status | accepted | accepted | accepted | **accepted (first contact)** |
| acceptedCount | 21 | 41 | 78 | 48 |
| Limitations | [] | [] | [] | **[] (nothing ever failed to parse)** |
| Unknown metrics | 0 (after fix) | 0 (after fix) | 0 (after fix) | **8 observations / 2 new labels (unfixed — no fix attempted in a trial)** |
| Numeric gaps | fixed | none new | none exercised | **none exercised (no comma-grouped values)** |
| Missing-value behavior | N/A (predates fix) | fixed (exact "--") | generalized (61 occurrences) | **NOT exercised — zero "--" in this file** |
| Unit variation | m / s-per-100m | m / s-per-100m | km / s-per-km | **km / km-per-h (a third convention)** |
| Provenance gaps | invented timestamp | same + sub-lap nuance | same, no sub-lap nuance | **same invented-timestamp gap; a real pause on every lap (not just one)** |

**What repeated across all four trials:** faithful, non-deduplicating recording; accepted/limitations
honesty; `sourceRowRef`/provenance folding; the invented-absolute-timestamp gap (still open, still not
spec'd).

**What repeated across all three sports:** the flat-catalog recognition mechanism (never partitioned); the
"unfamiliar but admitted" intake discipline; zero cross-sport semantic collisions across 25 total catalog
entries and three independent real sources.

**What remained swim-specific:** SWOLF, total-strokes/avg-strokes-per-length; sub-lap/interval-summary
nesting and its associated `"--"` pattern; meters/s-per-100m units.

**What remained running-specific:** cadence/stride-length/ground-contact/vertical-oscillation biomechanical
metrics; a pace-based (not speed-based) primary vocabulary.

**What is cycling-specific:** speed-based (not pace-based) primary vocabulary; `max-speed`/
`avg-moving-speed`; zero missing-value occurrences (a first for this arc); a real pause on EVERY lap rather
than an occasional one; no cadence/power columns present at all (absent, not blank).

**What genuinely generalized:** the flat catalog mechanism itself; `elevation-gain`/`elevation-loss`/
`moving-time` (running-origin labels now confirmed correct for cycling too); `avg-speed` (originally-seeded,
now finally evidenced); the avg/max and elapsed/moving pairing PATTERNS (not the specific labels) recur a
third time with `max-speed`/`avg-moving-speed`; `bpm`/`kcal` units stay identical across all three sports.

**What new cross-sport pressure appeared:** a third real unit convention for distance/speed; the first
real evidence that an entire metric FAMILY (missing-value placeholders) can be completely absent from a
real file rather than merely varied; the first real evidence that "absent column" and "present-but-blank
column" are two different real shapes of missing data.

**What still cannot be claimed:** universal cycling coverage (one file, one short recreational trip);
universal three-sport coverage; that cadence/power would behave correctly (or collide) if a cycling file
ever populated them (never observed here); that the three observed unit conventions exhaust all that exist;
device accuracy; training causality; recommendation quality.

```text
three sports = stronger cross-sport evidence for one shared path, not universal multi-sport support
```

---

## 22. What generalized to a third sport

See §21. Most notably: the ENTIRE metric-recognition, numeric-normalization, and missing-value mechanism
(the last simply unexercised here, not contradicted) held completely unmodified against a third,
structurally distinct sport — no cycling-specific code of any kind was needed for a real cycling activity to
be admitted correctly on first contact.

---

## 23. What does not yet generalize

Metric vocabulary breadth: cycling introduced 2 new real labels this trial did not add to the catalog (a
separate Spec decision, per this arc's established discipline). Units remain unnormalized across all three
sports — still no functional problem has arisen. Cadence/power's cross-sport behavior remains entirely
unevidenced (this file never populated either).

---

## 24. Evidence-gated recommendation

Findings classified:

| Finding | Classification |
| --- | --- |
| Metric recognition, elevation/moving-time labels generalize to a 3rd sport | third-sport generalization |
| `avg-speed` finally exercised by real data after 3 arcs | cross-sport generalization |
| `max-speed`/`avg-moving-speed` — 2 new, real, distinct labels | **metric vocabulary gap** |
| No same-label cross-sport semantic collision | no action needed |
| Cadence/power never exercised (absent columns) | insufficient evidence |
| Zero "--" in this file | no action needed (missing-value mechanism simply unexercised, not contradicted) |
| A third real unit convention (km/km-h) | unit variation (not yet a functional gap) |
| No numeric lexical form exercised | no action needed |
| No new temporal-semantics nuance | no action needed |
| No correction/retraction pressure | no action needed |
| No parser/TCX/FIT/Garmin API/downstream-automation pressure | no action needed |

One real, repeatable, actionable finding rises above "no action needed": **two genuinely new, real, distinct
cycling-specific metric labels** were observed, each proven distinct (not an alias) by real differing
values, at real 4× frequency across every lap and the summary — `max-speed` with STRONGER evidence than any
prior avg/max pairing (real values on every single row), and `avg-moving-speed` with STRONGER evidence than
the running trial's `avg-moving-pace` (a real pause on every lap, not just one).

`[RECOMMENDATION]` The trial **succeeded**: the first real third-sport session flows through the unmodified
production chain correctly, faithfully, and honestly, on FIRST contact (no limitation ever occurred, and the
whole metric-recognition/numeric-normalization/missing-value mechanism required zero changes). The one
concrete, narrow, evidence-driven next step — mirroring the 044-C1/044-D1/044-E1 precedent exactly — is a
**Spec deciding whether/how to extend `RECOGNIZED_METRICS`** with `"max-speed"` and `"avg-moving-speed"` —
nothing more, no alias infrastructure, no sport-specific registry (no collision evidence exists). No CSV/
FIT/TCX/Garmin API/downstream-automation lane gained enough evidence to justify opening. No unit-
normalization spec is justified (no functional conflict observed). No cadence/power cross-sport spec is
justified (neither was exercised by real data in this file).

---

## 25. Validation & invariants at this trial

`tsc --noEmit` clean; `node --test` **1091/1091** (1080 baseline + 11 new trial tests). No production code
changed. No parser added. No dependency added. No package/lockfile change. No Signal/EvidenceCase/
RenderingRequest created. No `runOperatorSession`/delivery/AthleteDecision triggered. No production
whole-core composer. AC20 unchanged. `docs/trials/044-C-real-training-intake-trial.md`,
`docs/trials/044-D-second-real-swim-session-intake-trial.md`,
`docs/trials/044-E-first-real-running-session-intake-trial.md`, and
`docs/implementation-architecture/ROADMAP_STATUS_POST_044E1A.md` were not modified by this trial.
