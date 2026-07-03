# Aurora — Manual Data Trial 044-C — Real Training Rows Through Intake

> **Status (2026-07-02).** Evidence trial, not a spec, not a feature. It runs a REAL training session
> through the unmodified, already-approved 044-A1 production intake path and records exactly what happened
> — no code was added to production, no bypass adapter was built, no data was fabricated.

---

## 0. Evidence provenance

**Source:** a real Garmin Connect swim-activity CSV export, `activity_23459651624.csv` — supplied directly
by the repository owner (Slack/chat upload) specifically for this trial. `23459651624` is Garmin's own
activity id, embedded in the filename. The file has 134 lines: a header, 133 interval/lap/rest rows, and one
"Resumen" (summary) row, covering a ~80-minute, 3,600 m swim session with heart rate, SWOLF, stroke counts,
and pace per interval.

**Why this qualifies as real evidence:** it is an unaltered export from a real device/platform (Garmin
Connect), for a real training session, supplied by the athlete/operator themselves — not authored,
invented, or "made realistic" by this trial.

**What was NOT done:** the file was **not** parsed by any Aurora code. Aurora has no CSV parser and none
was added. Per the mission's rule, three representative real lines were selected and **manually
transcribed, by hand, outside Aurora**, into plain `TrainingSummaryRow` data — exactly the "already-parsed
plain data" shape the existing production path already requires.

**Selected source lines** (of 134): the CSV's own `Intervalos` column values are used verbatim as
`sourceRowId`:
- `csv-2` — an early rest interval (`Descanso`) — chosen to exercise a real, genuinely-reported **zero**
  distance value.
- `csv-59` — interval 8, the session's main set (`Mixto`, 32 lengths, 1,600 m) — the richest single
  interval, chosen for metric diversity.
- `csv-134` — `Resumen`, the whole-session summary row.

Time-formatted source values (Garmin's `mm:ss[.s]`) were manually converted to seconds (e.g. `15:05` → 905
s). Garmin's comma-grouped large numbers (e.g. `1,600`) were normalized to plain digits **except** for one
deliberately-left-raw value (`csv-59`'s distance), kept exactly as the source wrote it, specifically to see
how the existing intake path handles that real formatting.

**Fixture path:** `src/modules/observation/tests/044-c-real-swim-session-fixture.ts` (not a `.test.ts` file
— a data fixture, ignored by the test runner, mirroring `helpers.ts`'s convention).
**Trial test path:** `src/modules/observation/tests/044-c-real-swim-session-trial.test.ts` (8 tests, all
passing, asserting exactly what was empirically observed — see §2).

**Execution path used (unmodified, unbypassed):**
```text
TrainingRowSubmission (the real, hand-transcribed rows)
  → trainingRowSubmissionToManualInput(...)   [Impl 044-A1, pure mapper]
  → ManualInputSubmission
  → ingestManualInput(...)                     [Impl 013 / 044-A1, unmodified]
  → ManualInputIngestionOutcome
```
No `Observation` domain object was constructed directly. No parallel/bypass adapter was written.

---

## 1. Raw observations captured

```text
input row count           : 18   (3 rows from csv-2, 8 from csv-59, 7 from csv-134)
mapped ManualInputEntry    : 21   (18 measured-value + 3 context-note, one per row with a `notes` field)
outcome status             : partially-accepted
accepted observation count : 20
limitations                : ["unparseable-numeric-value"]   (exactly one)
outcome-level quality      : "partial"
```

**The one real failure.** The single limitation traces to `csv-59`'s distance value, deliberately left as
the RAW Garmin source string `"1,600"`. JavaScript's `Number("1,600")` is `NaN` — the comma thousands
separator is not handled. This is a genuine, organically-discovered real-data finding, not an injected test
case: it is the exact string Garmin's own CSV export writes.

**Quality flags on the 17 real measured observations** (excluding the 1 that failed and the 3 subjective/
context-note observations):
```text
"complete"   (11) : distance ×2 (csv-2:0, csv-134:3600), duration ×2, avg-pace ×1, avg-heart-rate ×3,
                    max-heart-rate ×3
"suspicious"  (6) : swolf ×2, total-strokes ×2, calories ×2
```

**Provenance preserved** — verified by test (044-C.5): `sourceRowId` (`row:csv-2`/`row:csv-59`/
`row:csv-134`) is present in `Provenance.reference` for every resulting observation from that row;
`artifactRef` (`artifact:garmin-activity-23459651624`) is present on **every** observation, not just some;
`deviceLabel` (`device:Garmin Connect export`) survives on the one observation where it was set on a row
that also succeeded (csv-134's distance — csv-59's device-labeled distance row is exactly the one that
failed to parse, so its device label never reaches a persisted observation).

**Notes preserved** — verified by test (044-C.6): all 3 row-level notes became separate, independent
subjective (`context-note`) observations, never merged into any measurement.

**Zero-value handling** — verified by test (044-C.7): the real, genuinely-reported zero-distance rest
interval (`csv-2`) is recorded as a valid `MeasuredObservation` with `magnitude: 0` and `quality: "complete"`
— `0` is a finite number, not treated as "missing."

**Negative capability** — verified by test (044-C.8): the outcome contains no `Signal`, `EvidenceCase`,
`RenderingRequest`, `runOperatorSession`/`invokeOperatorSession` call, `deliver`, or `AthleteDecision` — the
trial never leaves the intake/review boundary Spec 044-B approved.

---

## 2. Trial questions — answered from observed evidence only

| # | Question | Answer (observed) | Classification |
| --- | --- | --- | --- |
| 1 | Do real metric names fit current handling? | Distance/duration/avg-pace/heart-rate fit cleanly; swim-specific metrics (SWOLF, strokes, calories) do not match the current `RECOGNIZED_METRICS` allowlist. | normalization gap |
| 2 | How many metrics become unknown-metric warnings? | 6 of 17 admitted measured observations (35%) — every SWOLF/total-strokes/calories entry. | normalization gap |
| 3 | Are real units preserved correctly? | Yes, verbatim (`bpm`, `m`, `s`, `s/100m`, `strokes`, `kcal`, `swolf`) — no unit was altered or dropped. | works as designed |
| 4 | Are any real units missing? | No unit was missing in this trial (the human transcriber supplied one for every row), but SWOLF and pace have no conventional physical unit in the source — a unit string had to be judgment-called. | data-model limitation |
| 5 | Are timestamps sufficient? | The source CSV itself carries **no absolute clock time** — only elapsed/cumulative duration. A plausible session-start instant had to be invented by the transcriber to satisfy `Timestamp`'s requirement for an absolute instant. | provenance gap |
| 6 | Is `observedAt` sufficient for real training data? | Structurally yes (the field accepted every value), but its *accuracy* depends entirely on the transcriber's invented anchor time — not provably true to the source. | provenance gap |
| 7 | Is `sourceRowId` useful and sufficient? | Yes — the CSV's own `Intervalos` values made natural, meaningful row ids that traced cleanly into `Provenance.reference`. | works as designed |
| 8 | Is `artifactRef` provenance sufficient? | Yes — the Garmin activity id (from the filename) worked well as a durable artifact reference, present on every resulting observation. | works as designed |
| 9 | Is `deviceLabel` sufficient? | Adequate but generic (`"Garmin Connect export"`) — the CSV names no specific watch model. Fine as an advisory field. | no action needed |
| 10 | Are notes sufficient? | Yes — free-text row context mapped cleanly into separate observations with no friction. | works as designed |
| 11 | Does accepted/partially-accepted/rejected behave honestly? | Yes — the one genuinely malformed real value was excluded; nothing else was silently dropped or coerced. | works as designed |
| 12 | Are warnings understandable to an operator? | Yes — `"unparseable-numeric-value"` and `"unrecognized metric name"` are both self-explanatory against `docs/runbooks/operator-observation-review-protocol.md`. | works as designed |
| 13 | Is any important source context lost? | Only in the sense that this trial deliberately transcribed 18 of 134 real lines (the smallest sufficient evidence artifact) — the full interval/lap hierarchy of the real session is not represented, by design, not by defect. | future parser pressure |
| 14 | Is metric normalization needed? | Real swim vocabulary (SWOLF, stroke counts) is entirely absent from the current `RECOGNIZED_METRICS` allowlist — a real, repeatable gap. | normalization gap |
| 15 | Is unit normalization needed? | Mildly — pace (`s/100m`) and SWOLF (a dimensionless composite score) both required human judgment to label; no structural failure occurred. | normalization gap (minor) |
| 16 | Is post-hoc retraction needed? | Not encountered — no observation needed to be withdrawn after admission in this trial. | no action needed |
| 17 | Is supersession sufficient for corrections encountered? | Not exercised — no transcription error requiring correction occurred in this trial. | no action needed |
| 18 | Does the real sample create pressure for TCX/FIT parsing? | Mild, indirect pressure: the comma-formatting failure (§1) and the missing-absolute-timestamp gap (#5/6) are exactly what a binary FIT parse would avoid — but this is illustrative, not a trigger on its own. | future parser pressure (weak) |
| 19 | Does it create pressure for Garmin API integration? | No — the manually-supplied export was entirely sufficient for this trial; if anything, this success is evidence *against* needing an automatic API pull yet. | no action needed |
| 20 | Does it reveal any real need for downstream automation? | No — the trial exercised the full intake→review boundary and stopped exactly where Spec 044-B decided it should; no Signal/Evidence/RenderingRequest/session/delivery pressure surfaced. | no action needed |

---

## 3. What this trial does NOT prove

Consistent with `docs/runbooks/operator-observation-review-protocol.md` §14: this trial proves the intake
path handles one real session's transcribed rows correctly — it does **not** prove recommendation quality,
training causality, athlete decision quality, delivery success, device/Garmin accuracy, or Evidence/Signal
relevance. The transcribed fixture is **not** the original artifact, **not** truth, and **not** Evidence — it
is a manual, structured representation of a real source session, prepared outside Aurora for this trial only.

---

## 4. Evidence-gated recommendation

Two real, repeatable findings rise above "no action needed":

1. **Metric-name coverage (findings #1/#2/#14).** A full third of the real, admitted measured observations
   from an actual swim session were flagged `"suspicious"` purely because `RECOGNIZED_METRICS` was seeded
   with running/cycling assumptions and has no swim vocabulary. This is exactly the mission's own stated
   trigger condition ("if many real metric aliases appear") for `Spec 044-C1 — Metric Normalization
   Boundary`. It is **explicitly recommended**, scoped narrowly: a decision about whether/how to extend the
   existing, already-approved, non-authoritative `RECOGNIZED_METRICS` allowlist — not a new architectural
   boundary, not a parser, not automation.
2. **Absolute-timestamp provenance (findings #5/#6).** A real CSV summary export carries no absolute clock
   time per interval — only elapsed duration. This is **not** yet recommended as its own spec; it only
   matters if/when Aurora ever tries to *automate* row generation from a file (a parser), which remains
   explicitly out of scope. Noted here as a fact for whenever that lane reopens (per
   `ROADMAP_STATUS_POST_044B.md` §3's TCX/FIT evidence gate).

No other finding — unit handling, `sourceRowId`, `artifactRef`, notes, zero-value handling, review
outcomes, post-hoc retraction, supersession, TCX/FIT pressure, Garmin API pressure, or downstream automation
pressure — rose to a level warranting a new mission. Per the mission's own rule ("do not turn every
inconvenience into a new architecture mission"), none of those is recommended.

`[RECOMMENDATION]` The trial **succeeded**: real data flows through the unmodified 044-A1 path correctly,
faithfully, and honestly, with the review/correction posture from Spec 044-B holding throughout. The one
concrete, narrow, evidence-driven next step is `Spec 044-C1 — Metric Normalization Boundary` (decide whether
to extend `RECOGNIZED_METRICS` with real-world swim/other-sport vocabulary — nothing more). All other lanes
(TCX/FIT/Garmin API/athlete-facing review/post-hoc retraction/downstream automation) remain exactly where
`ROADMAP_STATUS_POST_044B.md` left them — unopened, pending their own evidence.

---

## 5. Validation & invariants at this trial

`tsc --noEmit` clean; `node --test` **1027/1027** (1019 baseline + 8 new trial tests). No production code
changed. No parser added. No dependency added. No package/lockfile change. No Signal/EvidenceCase/
RenderingRequest created. No `runOperatorSession`/delivery/AthleteDecision triggered. No production
whole-core composer. AC20 unchanged.
