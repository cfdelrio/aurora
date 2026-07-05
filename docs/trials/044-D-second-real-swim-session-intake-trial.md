# Aurora — Manual Data Trial 044-D — A SECOND Real Swim Session Through Intake

> **Status (2026-07-05).** Evidence trial, not a spec, not a feature. It runs a SECOND real training session
> through the unmodified, already-approved production intake path (Impl 044-A1 + Impl 044-C1A + Impl
> 044-C2A) and records exactly what happened — no code was added to production, no bypass adapter was built,
> no data was fabricated. This trial tests **variation within the same sport** — it is explicitly not proof
> of universal swim coverage (`ROADMAP_STATUS_POST_044C2A.md` §8/§12).

---

## 1. Source and evidence qualification

**Source:** a real Garmin Connect swim-activity CSV export, `activity_23358314497.csv` — supplied directly
by the repository owner (uploaded to this conversation) specifically for this trial. `23358314497` is
Garmin's own activity id, embedded in the filename. The file has 136 lines: a header, 134 real interval/
lap/rest rows, and one "Resumen" (summary) row, covering a real ~84-minute, 3,200 m swim session (64 pool
lengths) with heart rate, SWOLF, stroke counts, and pace per interval — a different, independent session
from Trial 044-C's `activity_23459651624.csv`.

**Why this qualifies as real evidence:** it is an unaltered export from a real device/platform (Garmin
Connect), for a real training session, supplied by the athlete/operator themselves — not authored, invented,
or "made realistic" by this trial. It is readable and well-formed CSV text.

**What was NOT done:** the file was **not** parsed by any Aurora code — Aurora still has no CSV parser and
none was added. Per the mission's rule, five representative real lines were selected and **manually
transcribed, by hand, outside Aurora**, into plain `TrainingSummaryRow` data — exactly the "already-parsed
plain data" shape the existing production path already requires.

---

## 2. Source inspection summary

```text
total source lines (incl. header)  : 136
total real data rows               : 135
stroke-type ("Estilo de natación") distribution:
  Descanso (rest)      : 39
  Estilo libre (free)  : 38
  Braza (breaststroke) : 26
  Mariposa (butterfly) : 13
  Mixto (mixed)        : 17
  Espalda (backstroke) : 1
  "--" (summary row)   : 1

metric columns available          : Intervalos, Estilo de natación, Largos, Distancia, Tiempo,
                                     Tiempo acumulado, Ritmo medio, Ritmo óptimo, Swolf medio,
                                     Frecuencia cardiaca media, FC máxima, Brazadas totales,
                                     Promedio de brazadas, Calorías
units implied                     : m (distance/lengths), mm:ss[.s] / h:mm:ss (time), s/100m (pace,
                                     Garmin's own convention — corroborated: 58.2s/50m ≈ "1:56"/100m),
                                     bpm (heart rate), strokes (stroke counts), kcal (calories)
device/source labels               : none per-row (same as Trial 044-C — a session-level "Garmin Connect
                                     export" label was again applied by the transcriber as advisory
                                     metadata, not itself a CSV column)
blank/malformed-looking values     : the literal placeholder "--" appears 129 times — overwhelmingly on
                                     nested single-length sub-lap rows, in the "Promedio de brazadas" and
                                     "Calorías" columns specifically (not seen at all in Trial 044-C's
                                     3-line sample)
numeric punctuation patterns       : two real comma-grouped values, both on the "Resumen" row only:
                                     "3,200" (distance) and "1,125" (total strokes) — exactly the same
                                     shape (^[+-]?\d{1,3}(,\d{3})+$) Impl 044-C2A already supports
not seen in Trial 044-C            : (a) a second, distinct real pace metric ("Ritmo óptimo"/optimal pace,
                                     alongside "Ritmo medio"/avg pace); (b) a second, distinct real stroke
                                     metric ("Promedio de brazadas"/avg strokes per length, alongside
                                     "Brazadas totales"/total strokes); (c) the literal "--" blank
                                     placeholder; (d) an h:mm:ss (hour-inclusive) time format on the
                                     session summary; (e) near-duplicate interval-summary vs. single-length
                                     sub-lap rows with slightly differing values
```

---

## 3. Representative-subset rationale

Five real source lines (of 135) were selected — **not** chosen because they were known to pass:

- **`csv-D-2`** (line 2, `Descanso`/rest) — a real, genuinely-reported **zero**-distance value, exactly
  mirroring Trial 044-C's `csv-2` selection, to re-test zero-value handling on a second session.
- **`csv-D-4`** (line 4, interval `"1"`, `Estilo libre`/freestyle, a single 50 m length) — the
  interval-level summary row for the session's first timed interval; exercises every recognized metric
  plus both genuinely new metric labels in one row.
- **`csv-D-5`** (line 5, sub-lap `"1.1"`) — a real near-duplicate of `csv-D-4` for the identical single
  length, chosen specifically because it carries the real, literal `"--"` placeholder for "Promedio de
  brazadas" — the missing/blank-field category the mission required, where the source genuinely contains
  one.
- **`csv-D-7`** (line 7, interval `"2"`, `Mixto`/mixed strokes, 8 lengths, 400 m) — the session's richest
  single interval; the first row where "Ritmo óptimo" (75 s/100m) is real-evidenced as numerically
  **distinct** from "Ritmo medio" (115 s/100m) on the same row, proving it is a separate metric, not a
  duplicate column.
- **`csv-D-136`** (line 136, `Resumen`/summary) — the whole-session totals, carrying both real
  comma-grouped values (`"3,200"`, `"1,125"`) and the session's own h:mm:ss duration (`"1:24:38"`).

This selection covers every category the mission required, where the source actually contained it: a
common recognized metric (distance/heart-rate), a previously-added swim metric (swolf/total-strokes/
calories), distance, a duration/time metric, a pace metric, a stroke metric, calories, a device-labeled row,
a grouped numeric form, two genuinely unfamiliar metrics, an unusual/judgment-called unit (`s/100m`,
`strokes/length`), a real missing/blank field (`"--"`), and context notes. No category was invented that the
source did not actually contain.

---

## 4. Fixture provenance

**Fixture path:** `src/modules/observation/tests/044-d-real-swim-session-fixture.ts` (a data fixture, not a
`.test.ts` file, ignored by the test runner — mirrors `044-c-real-swim-session-fixture.ts`'s convention).
**Trial test path:** `src/modules/observation/tests/044-d-real-swim-session-trial.test.ts` (12 tests, all
passing, asserting exactly what was empirically observed via a temporary, deleted probe script — assertions
were written to match observed behavior, never the reverse).

The fixture carries an explicit header stating it is a manual structured representation of selected real
rows — **not** the original artifact, **not** truth, **not** Evidence — identical in spirit to Trial 044-C's
fixture header.

---

## 5. Execution path

```text
TrainingRowSubmission (the real, hand-transcribed rows)
  → trainingRowSubmissionToManualInput(...)   [Impl 044-A1, unmodified]
  → ManualInputSubmission
  → ingestManualInput(...)                     [Impl 013 / 044-A1 / 044-C1A / 044-C2A, unmodified]
  → ManualInputIngestionOutcome
```
No `Observation` domain object was constructed directly. No parallel/bypass adapter was written. No
production code was touched by this trial.

---

## 6. Actual observed result

```text
input row count            : 36   (3 rows from csv-D-2, 10 from csv-D-4, 3 from csv-D-5, 10 from csv-D-7,
                                    10 from csv-D-136)
mapped ManualInputEntry     : 41   (36 measured-value + 5 context-note)
outcome status              : partially-accepted
accepted observation count  : 40
limitations                 : ["unparseable-numeric-value"]   (exactly one — the real "--" placeholder)
outcome-level quality       : "partial"
```

## 7. Row/entry/observation counts

```text
measured-value entries attempted : 36
measured observations admitted   : 35
context-note entries             : 5   -> 5 subjective observations, all admitted
one limitation                   : csv-D-5's "avg-strokes-per-length" = "--" (not a number in any form)
no row silently dropped          : 36 attempted measured entries = 35 admitted + 1 limitation (proven by test)
```

---

## 8. Metric findings

```text
recognized metrics exercised (quality: "complete", 29 observations): distance, duration, avg-pace, swolf,
  avg-heart-rate, max-heart-rate, total-strokes, calories — all behaved exactly as Impl 044-C1A left them;
  no regression.

genuinely NEW, unrecognized metric labels (quality: "suspicious", 6 observations): "optimal-pace" (×3:
  116/75/28 s/100m) and "avg-strokes-per-length" (×3: 27/27/18 strokes/length) — neither appeared in Trial
  044-C. Both are admitted, honestly flagged, never rejected for being unfamiliar.

proof these are DISTINCT metrics, not aliases: "optimal-pace" carries real values genuinely different from
  the same row's "avg-pace" (csv-D-7: 115 vs 75; csv-D-136: 81 vs 28) — this is exactly the kind of evidence
  Spec 044-C1 anticipated ("do not assume all of these are aliases; some may be distinct canonical
  metrics") and confirms it again on a second session.
```

---

## 9. Unit findings

All real units were preserved verbatim; none was altered or dropped. As in Trial 044-C, two labels
(`avg-strokes-per-length`, and the pre-existing `swolf`) have no conventional physical unit — a unit string
(`"strokes/length"`) was again a transcriber judgment call, not a structural failure. No conflicting or
incompatible real unit form was observed.

---

## 10. Numeric lexical findings

The grouped-thousands rule (Impl 044-C2A) **generalizes**: it correctly normalizes both real comma-grouped
values in this file — `"3,200"` (distance) → `3200`, and, for the first time, `"1,125"` (total-strokes) →
`1125` — proving the rule applies across sessions AND across metrics, not just the one distance value it
was built from. Both normalized observations keep `quality.status: "complete"` and preserve the original raw
text in `Provenance.reference` (`raw-numeric:"3,200"` / `raw-numeric:"1,125"`).

The real `"--"` placeholder is **not** a numeric-lexical-ambiguity case — it is not a plausible number in any
form, grouped or otherwise. It correctly falls through both the strict parse and the grouped-thousands
grammar and is rejected as `"unparseable-numeric-value"`, exactly as the existing catalog value already
covers. No ambiguous comma-decimal form (e.g. a genuine `"1,6"`-shaped value) appeared in this file either.

---

## 11. Provenance findings

`sourceRowId`/`artifactRef` are preserved on every observation, exactly as in Trial 044-C. `deviceLabel`
survives on both rows it was set on (`csv-D-7`, `csv-D-136`) since both succeeded — unlike Trial 044-C,
where the device-labeled row was exactly the one that originally failed.

**A reinforced, still-open gap:** an absolute session-start instant again had to be invented by the
transcriber (the source carries no absolute clock time, only elapsed/cumulative duration) — the same
open gap Trial 044-C found (`docs/trials/044-C-real-training-intake-trial.md` findings #5/#6), not a new
one.

**A new observed nuance of the same gap:** nested single-length sub-lap rows (like `csv-D-5`) carry a
"Tiempo acumulado" that is relative to the PARENT interval's own start, not the whole session — so deriving
`observedAt` mechanically from that field alone produces a timestamp that is not session-monotonic with the
parent interval's own row (`csv-D-5`'s derived instant is earlier than `csv-D-4`'s, even though `csv-D-5` is
a sub-component of the same interval). This was transcribed literally and honestly (per Rule 2 — no manual
"fixing" of source semantics) and documented directly in the fixture's own comments; `ingestManualInput`
does not require or enforce cross-row chronological ordering, so it caused no intake failure. It is
evidence, not a defect, for whenever the invented-timestamp gap is ever revisited.

---

## 12. Review findings

`"unparseable-numeric-value"` and `"unrecognized metric name"` remain self-explanatory against
`docs/runbooks/operator-observation-review-protocol.md` — no new warning vocabulary was needed to
understand this session's outcome.

---

## 13. Correction/retraction findings

Not exercised — no transcription error requiring correction occurred, and no admitted observation needed
withdrawal without replacement. Same as Trial 044-C: this remains an unencountered, still-open gap
(`ROADMAP_STATUS_POST_044B.md` §3), not newly evidenced here.

---

## 14. Parser pressure

**A new, real, structural observation:** the source contains near-duplicate rows — an interval-level
summary (`csv-D-4`) and a single-length sub-lap (`csv-D-5`) for the SAME physical length, with a real
differing `avg-heart-rate` (108 vs. 99). Aurora recorded both, faithfully, as two separate provenance-tagged
observations — exactly correct faithful-scribe behavior; no deduplication or reconciliation was needed or
attempted. This is mild, indirect evidence of the kind of structural richness a real parser would need to
model explicitly (which row is authoritative, whether sub-laps nest under intervals) — but it caused no
intake failure and is not, on its own, a trigger for building one (consistent with Trial 044-C's own "mild,
indirect pressure... illustrative, not a trigger on its own" finding for FIT/TCX).

---

## 15. Garmin API pressure

None — the manually-supplied export was again entirely sufficient for this trial. No new pressure beyond
Trial 044-C's finding.

---

## 16. Downstream automation pressure

None — the trial exercised only the same intake→review boundary Spec 044-B already decided on; no
Signal/Evidence/RenderingRequest/session/delivery pressure surfaced (test 044-D.12).

---

## 17. Comparison with Trial 044-C

| | Trial 044-C | Trial 044-D |
| --- | --- | --- |
| Source | `activity_23459651624.csv` | `activity_23358314497.csv` |
| Selected rows | 18 (3 source lines) | 36 (5 source lines) |
| Status (as originally run) | partially-accepted | partially-accepted |
| Status (current, after fixes) | **accepted** (post-044-C2A) | partially-accepted (unfixed, this trial) |
| Accepted count | 21 (post-fix) | 40 |
| Limitations | `[]` (post-fix) | `["unparseable-numeric-value"]` (real `"--"` value) |
| Unknown metrics | 0 (post-044-C1A) | 6 observations / 2 new labels (`optimal-pace`, `avg-strokes-per-length`) |
| Numeric gaps | fixed (grouped-thousands, Impl 044-C2A) | **none new** — the fixed rule generalized correctly |
| Provenance gaps | invented absolute-timestamp anchor | same gap, reinforced + a new sub-lap-relative-time nuance |
| Review gaps | none | none |

**What repeated:** zero-distance handling; `sourceRowId`/`artifactRef` provenance; notes-as-separate-
observations; accepted/partially-accepted honesty; the invented-absolute-timestamp gap (still open, still
not spec'd); the grouped-thousands numeric rule (now proven on a SECOND session and a SECOND metric).

**What was new:** two genuinely distinct, previously-unseen real metric labels (`optimal-pace`,
`avg-strokes-per-length`), each proven not to be an alias by differing real values; a new, common (129
occurrences), correctly-handled real failure mode (the literal `"--"` blank-field placeholder); a real
near-duplicate row structure (interval-summary vs. single-length sub-lap); a real h:mm:ss time format for a
>60-minute session total; a new nuance on the timestamp gap (parent-relative cumulative time on nested
sub-laps).

**What did NOT recur:** `swolf`/`total-strokes`/`calories` were NOT flagged suspicious this time — Impl
044-C1A's fix held stable on an independent second session; no comma-decimal or other genuinely ambiguous
numeric form appeared in either file.

**What generalizes across both sessions:** the grouped-thousands numeric rule (two sessions, two metrics);
the recognized/unrecognized metric-quality split (never rejects for unfamiliarity, never silently trusts);
`sourceRowRef`/`raw-numeric` provenance folding; faithful, non-deduplicating recording of near-duplicate
source rows; accepted/partially-accepted/rejected honesty.

**What still cannot be claimed from only two swim sessions:** universal swim metric-vocabulary coverage (a
third session could reveal yet more distinct metrics); universal numeric-lexical coverage (no decimal-comma
or mixed thousands+decimal sample has appeared in either file); that `"--"` is the only real malformed value
form Garmin ever emits; that the invented-timestamp limitation is acceptable in every future context;
coverage of any sport besides swimming; device accuracy of any reported value; training causality;
recommendation quality; athlete decision quality.

---

## 18. What generalizes

See §17. Most importantly: the TWO evidence-driven fixes from the 044-C arc (metric vocabulary extension,
grouped-thousands numeric normalization) both held up, unmodified, against an entirely independent second
real session — meaningful confirmation that neither fix was overfit to the one sample that produced it.

---

## 19. What still cannot be claimed

Consistent with `docs/runbooks/operator-observation-review-protocol.md` §14 and
`ROADMAP_STATUS_POST_044C2A.md` §8: two real swim sessions prove the intake path handles THOSE two sessions'
transcribed rows correctly. They do not prove universal swim coverage, any other sport, recommendation
quality, training causality, athlete decision quality, delivery success, or device/Garmin accuracy. The
transcribed fixtures are **not** the original artifacts, **not** truth, and **not** Evidence.

---

## 20. Evidence-gated recommendation

Findings classified:

| Finding | Classification |
| --- | --- |
| Grouped-thousands rule generalizes to a 2nd session/2nd metric | repeated known behavior |
| Real `"--"` blank placeholder correctly rejected | works as designed |
| `"optimal-pace"` — genuinely new, distinct real metric | **metric vocabulary gap** |
| `"avg-strokes-per-length"` — genuinely new, distinct real metric | **metric vocabulary gap** |
| Near-duplicate interval/sub-lap rows, faithfully recorded separately | no action needed |
| h:mm:ss time format on a >60-minute summary | no action needed (existing external-transcription methodology already covers it) |
| Nested sub-lap cumulative time is parent-relative, not session-relative | provenance gap (reinforces the already-known, still-unspec'd timestamp gap) |
| No ambiguous numeric form appeared | no action needed |
| No correction/retraction pressure | no action needed |
| Mild parser-structure pressure (duplicate rows) | parser pressure (weak, not a trigger) |
| No Garmin API / downstream automation pressure | no action needed |

One real, repeatable, actionable finding rises above "no action needed": **two genuinely new, real,
distinct swim metric labels** (`"optimal-pace"`, `"avg-strokes-per-length"`) were observed, each proven
distinct (not an alias) by real differing values on the same row as an existing recognized metric. This is
the same evidence shape, at the same scale, that triggered `Spec 044-C1 — Metric Normalization Boundary`
originally — a single real session surfacing a handful of unrecognized-but-legitimate metric names.

`[RECOMMENDATION]` The trial **succeeded**: a second, independent real swim session flows through the
unmodified production chain correctly, faithfully, and honestly; both prior evidence-driven fixes
(metric vocabulary, grouped-thousands normalization) generalized without modification. The one concrete,
narrow, evidence-driven next step — mirroring the 044-C1/044-C1A precedent exactly — is a **Spec deciding
whether/how to extend `RECOGNIZED_METRICS`** with `"optimal-pace"` and `"avg-strokes-per-length"` — nothing
more, no alias infrastructure, no sport-specific registry. The reinforced timestamp/provenance gap remains
noted, not spec'd, exactly as it was left after Trial 044-C (it only matters if/when an automated parser
lane ever reopens). No CSV/FIT/TCX/Garmin API/downstream-automation lane gained enough evidence to justify
opening.

---

## 21. Validation & invariants at this trial

`tsc --noEmit` clean; `node --test` **1057/1057** (1045 baseline + 12 new trial tests). No production code
changed. No parser added. No dependency added. No package/lockfile change. No Signal/EvidenceCase/
RenderingRequest created. No `runOperatorSession`/delivery/AthleteDecision triggered. No production
whole-core composer. AC20 unchanged. `docs/trials/044-C-real-training-intake-trial.md` and
`docs/implementation-architecture/ROADMAP_STATUS_POST_044C2A.md` were not modified by this trial.
