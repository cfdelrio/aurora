# Aurora — Specification 044-D2 — Missing Value Semantics Boundary

> **Status (2026-07-05).** Specification phase, building on Manual Data Trial 044-D (`2f2c29e`) and Impl
> 044-D1A (`c563aa0`). It is **behavioral / docs-only**: it implements no code, edits no test, does not change
> `"--"` behavior, adds no missing-value domain object, adds no dependency, no package/test change, adds no
> parser (CSV/FIT/TCX), no Garmin API integration, creates no `Signal`/`EvidenceCase`/`RenderingRequest`, calls
> no `runOperatorSession`, adds no delivery, creates no `AthleteDecision` automatically, introduces no
> production whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1057/1057**.
> It decides the approved boundary for distinguishing source-declared absence from malformed numeric input.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary;
`"--"` is not fixed here, no code is created here.

---

## 1. Context

`[FACT]` Manual Data Trial 044-D's remaining real finding, unresolved by Impl 044-D1A's metric-vocabulary
extension: a real, literal Garmin placeholder, `"--"`, written by `csv-D-5`'s `avg-strokes-per-length` field,
fails `parseFiniteNumber` and becomes the trial's sole `"unparseable-numeric-value"` limitation — the one
remaining reason Trial 044-D is `"partially-accepted"` rather than `"accepted"`.

`[FACT]` Exact current source, re-verified at authorship
(`src/modules/observation/application/manual-input-adapter.ts`):

```ts
function parseFiniteNumber(rawValue: string): NumericParseResult {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return { status: "unparseable" };
  const strict = Number(rawValue);
  if (Number.isFinite(strict)) return { status: "parsed", value: strict, normalized: false };
  const trimmed = rawValue.trim();
  if (GROUPED_THOUSANDS.test(trimmed)) { /* ...grouped-thousands fallback, Impl 044-C2A... */ }
  return { status: "unparseable" };
}
```
`Number("--")` is `NaN`; `"--"` does not match `GROUPED_THOUSANDS`; it falls through both paths to
`{ status: "unparseable" }`, exactly as any other malformed text would. Aurora currently has **one** technical
category for numeric `rawValue`: parseable vs. unparseable — no distinction between "malformed" and
"source-declared absent."

`[FACT]` Aurora's domain **already has** a type built for exactly the concept "an expected field was absent":
`MissingDataObservation` (`src/modules/observation/domain/observation.ts`) — `{ kind: "missing-data",
provenance, quality, expected: string }` — and a corresponding `ManualInputEntry` variant (`src/modules/
observation/application/manual-input-submission.ts`) — `{ kind: "missing-data", expected: string, reason?:
string }`, already exercised (UC2) as an explicitly-reported "the reporter says this field is absent, and
here's why" case, already admitted (not rejected, not a limitation) and already counted in `acceptedCount`.
This spec evaluates whether that EXISTING mechanism — not a new one — can honestly represent `"--"`.

---

## 2. Empirical grounding — direct inspection of BOTH real source files

`[FACT]` This spec re-inspected the ORIGINAL raw CSV bytes for both Manual Data Trials directly (not just the
hand-transcribed fixtures), using a proper quote-aware CSV parse (not naive comma-splitting, which
mis-attributes columns whenever a grouped-thousands value like `"3,200"` appears):

```text
Trial 044-D source (activity_23358314497.csv) — 135 real data rows:
  "--" total occurrences        : 129
  column 2  ("Estilo de natación", stroke type — categorical, not numeric) : 1  (the "Resumen" row only)
  column 13 ("Promedio de brazadas" / avg-strokes-per-length)              : 64
  column 14 ("Calorías" / calories)                                        : 64

Trial 044-C source (activity_23459651624.csv) — 133 real data rows:
  "--" total occurrences        : 145
  column 2  ("Estilo de natación")                                         : 1  (the "Resumen" row only)
  column 13 ("Promedio de brazadas")                                       : 72
  column 14 ("Calorías")                                                   : 72

no other absence token appears in EITHER file: zero occurrences of "N/A", "NA", "null", or a bare single "-";
the CSV's own always-blank leading id column (quoted empty string on every row) is a structural artifact of
the export format itself, unrelated to any metric value, and is never reached by parseFiniteNumber (the
transcriber never emits a measured-value entry for it).
```

`[FACT]` **The decisive structural finding**, established by row-category cross-tabulation (not by inspecting
the token in isolation):

```text
Trial 044-D (activity_23358314497.csv):
  sub-lap rows (Intervalos like "2.1", "2.2", ...)          : 64 total — ALL 64 (100%) carry "--" for BOTH
                                                                avg-strokes-per-length AND calories.
  interval-summary rows (Intervalos like "2", "8", ...)     : 31 total — ZERO (0%) carry "--" in either field
                                                                — always a real reported number.
  rest rows ("Descanso")                                    : 39 total — ZERO (0%) carry "--"; avg-strokes-
                                                                per-length is always a real, reported "0"
                                                                (genuinely zero strokes during rest — the SAME
                                                                real-zero pattern Trial 044-C/044-D already
                                                                established for distance); calories is always
                                                                a small real positive integer, never zero,
                                                                never "--".

Trial 044-C (activity_23459651624.csv) — the SAME cross-tabulation, independently:
  sub-lap rows                                              : 72 total — ALL 72 (100%) carry "--" in both
                                                                fields.
  interval-summary + rest rows                              : 61 total — ZERO carry "--" in either field.
```

This is **repeated, 100%-consistent, cross-session** evidence (274 combined real occurrences across two
independent real Garmin Connect exports, zero exceptions in either direction) that `"--"` here means: *this
per-length-aggregate statistic is not computed by the source at a single-length (sub-lap) row's granularity —
it is only computed at the interval-aggregate level.* This is a **structural non-applicability**, not a sensor
failure, not a random gap, and — critically — **not the same thing as zero**, since the SAME two files use a
real, literal `"0"` for genuinely-zero avg-strokes-per-length on rest rows, in the SAME column, elsewhere in
the SAME files. Conflating `"--"` with `0` would corrupt an already-real, already-distinct value this exact
file already reports honestly.

`[FACT]` Trial 044-C's own fixture (3 hand-transcribed lines: `csv-2`/rest, `csv-59`/interval-summary,
`csv-134`/`Resumen`) never happened to select a sub-lap row — which is why `"--"` never appeared in Trial
044-C's evidence. This was a **selection artifact of that trial's row choice**, not evidence that `"--"` is
specific to Trial 044-D's source; direct inspection of the original 044-C file (above) confirms the identical
convention was present there all along, unexercised by that trial's particular 3-line sample.

---

## 3. Central Question

> How should Aurora distinguish a real source-declared absence of a measurement from malformed numeric input,
> without silently dropping source information, inventing zero, or creating a false Observation?

```text
missing measurement ≠ zero · missing measurement ≠ malformed measurement ·
missing measurement ≠ Observation with magnitude 0 · missing measurement ≠ Evidence ·
missing source value ≠ source row does not exist · omitted Observation ≠ silently dropped source information ·
source placeholder ≠ universal missing-value token · accepted source row ≠ measurement exists ·
technical handling ≠ truth · Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Required inputs consulted

```text
docs/trials/044-D-second-real-swim-session-intake-trial.md
docs/implementation-architecture/ROADMAP_STATUS_POST_044C2A.md
docs/specs/044-D1-additional-real-swim-metric-vocabulary-boundary.md
docs/specs/044-D1A-additional-metric-vocabulary-implementation-plan.md
src/modules/observation/tests/044-d-real-swim-session-fixture.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
src/modules/observation/application/training-row-submission.ts (confirmed: pure row-shape mapper, no
                                                                 sourceFormat field survives into
                                                                 ManualInputSubmission except folded as text)
src/modules/observation/application/manual-input-adapter.ts   (parseFiniteNumber, mapEntry, exact source, §1)
src/modules/observation/application/manual-input-submission.ts (ManualInputEntry "missing-data" shape, §1)
src/modules/observation/application/manual-input-ingestion-outcome.ts (MANUAL_INPUT_LIMITATIONS — 9 entries,
                                                                 unchanged since Impl 044-A1)
src/modules/observation/domain/observation.ts                  (MissingDataObservation — already exists, §1)
src/modules/observation/domain/observation-quality.ts
src/modules/observation/index.ts
the two original raw CSV files, re-inspected directly with a quote-aware parse (§2) — not assumed from the
                                                                 trial fixtures alone.
```

---

## 5. Required Analysis

```text
 1. Exactly where "--" appears  : columns 2 ("Estilo de natación"), 13 ("Promedio de brazadas"), 14
                                    ("Calorías") only, in BOTH real source files (§2).
 2. Which columns/metrics use it : only avg-strokes-per-length and calories among NUMERIC metric columns;
                                    column 2 is a categorical stroke-type field Aurora's measured-value path
                                    never touches (no measured-value entry is ever built from it).
 3. Other absence tokens present  : NONE — zero "N/A"/"NA"/"null"/bare "-" in either file; the CSV's own
                                    always-blank leading id column is a structural export artifact, not a
                                    metric-value placeholder, and is never passed to parseFiniteNumber.
 4. Does "--" consistently mean unavailable/not-applicable : YES, with 100% structural consistency across
                                    274 combined real occurrences in two independent files (§2) — always on
                                    sub-lap rows, never on interval-summary/rest rows.
 5. Does "--" ever occur where zero would be plausible : NO — the SAME column ("Promedio de brazadas") shows
                                    a real, literal "0" on every rest row (genuinely zero strokes during
                                    rest) — "--" and "0" are DIFFERENT, both real, both meaningful, in the
                                    SAME file. Conflating them would corrupt an already-honest real value.
 6. Does the source format distinguish missing from malformed : YES, structurally — sub-lap vs. interval-
                                    summary/rest row category perfectly predicts "--" vs. a real number, with
                                    zero exceptions in 274 observations. The token itself is ambiguous in
                                    isolation; the ROW CONTEXT (which this spec's evidence, not typography,
                                    establishes) removes that ambiguity.
 7. Do headers/context provide enough evidence to classify "--" as absence : YES — combined with the
                                    row-category cross-tabulation (item 6), this is sufficient; classifying
                                    from the token's typography ALONE would not have been (the mission's own
                                    required caution), but the STRUCTURAL evidence is decisive.
 8. What do the 129 occurrences represent : ONE formatting convention — a single, structurally-triggered
                                    "not computed at this row's aggregation level" marker — not multiple
                                    semantic meanings, not unresolved ambiguity.
 9. Did Trial 044-C's source also contain "--" : YES — 145 occurrences, the IDENTICAL structural pattern
                                    (100% of sub-lap rows, 0% of interval-summary/rest rows), independently
                                    confirmed (§2). Trial 044-C's fixture simply never selected a sub-lap row
                                    (a selection artifact, not counter-evidence, §2).
10. Does the current manual transcription path preserve the raw token : YES, today, only informally — the
                                    HUMAN transcriber can see and choose to preserve "--" as a fixture's
                                    literal rawValue string (as Trial 044-D's fixture already does for
                                    csv-D-5); but once it reaches ingestManualInput and fails to parse,
                                    NOTHING beyond the generic limitation code "unparseable-numeric-value"
                                    survives in the actual outcome object — no row/metric context, no raw
                                    text (confirmed by direct inspection of mapEntry's "unparseable" branch,
                                    §1 — a pre-existing gap, not introduced by this finding).
11. Can current provenance retain "field was present but unmeasured" : NOT on the failure path today (item
                                    10) — but on the SUCCESS path, the EXISTING "missing-data" branch of
                                    mapEntry already builds provenance/quality/expected for exactly this
                                    concept; it is simply never reached from a measured-value entry today.
12. Are current partially-accepted semantics honest for known absence : NO, arguably — treating a
                                    source-declared, structurally-consistent absence identically to a
                                    genuinely malformed/ambiguous value (both becoming
                                    "unparseable-numeric-value") conflates two different real situations
                                    this trial's own evidence now distinguishes cleanly.
13. Should a known missing placeholder count as rejected : NO — Aurora's EXISTING "missing-data" mechanism
                                    (item 1) already treats an explicitly-reported absence as ADMITTED
                                    (accepted), not rejected, not a limitation — precedent already exists.
14. Should no Observation be created for missing measurement : more precisely: no MEASURED Observation (no
                                    Measurement, no magnitude) should be created — but Aurora already has an
                                    Observation KIND built for representing an absence honestly:
                                    MissingDataObservation. "No Observation at all" would be LESS honest than
                                    using the type built for exactly this.
15. Can source-row traceability remain without a Measurement : YES — MissingDataObservation carries
                                    Provenance (item 1) exactly like MeasuredObservation does; the existing
                                    sourceRowRef-folding mechanism (already used for measured-value's
                                    provenance) is not tied to the Measurement itself and can equally attach
                                    to a MissingDataObservation's provenance.
16. Is a context-note semantically appropriate : NO — a context-note is free-text narrative (the athlete's
                                    words or an operator's observation), not a structured "this specific
                                    expected field is absent" fact; using it here would blur athlete
                                    commentary with a technical absence marker, and would lose the
                                    structured `expected` field MissingDataObservation already provides.
17. Is a new limitation value needed : NO — if the selected direction routes a known-missing entry to an
                                    ADMITTED MissingDataObservation (not a limitation at all), no new
                                    ManualInputLimitation catalog value is needed; "unparseable-numeric-value"
                                    remains exactly as it is for anything NOT recognized as this one known
                                    token.
18. Is a new ingestion count needed : NO — MissingDataObservation already counts toward acceptedCount today
                                    (confirmed: UC2's existing "missing-data" entries are admitted, not a
                                    limitation) — no new count concept is required.
19. Is a new domain type needed : NO — MissingDataObservation / the "missing-data" ManualInputEntry kind
                                    already exist for exactly this purpose (item 1); building a parallel
                                    "MissingMeasurement" type would duplicate existing, already-approved
                                    domain semantics.
20. What evidence is still missing : (a) a real sample containing an absence token OTHER than the exact
                                    literal "--" (e.g. an explicit "N/A"), to know whether recognition should
                                    ever broaden beyond one string; (b) a real sample from a NON-swim sport or
                                    a non-Garmin source, to know whether this specific structural convention
                                    (sub-lap rows omitting aggregate-only fields) generalizes beyond Garmin
                                    Connect swim exports; (c) any real case where a genuinely malformed value
                                    (not a recognized absence token) needs to be distinguished from "--" in a
                                    single row, which has not yet occurred; (d) confirmation from outside
                                    these two files of Garmin's own documented convention (this spec's
                                    conclusion rests entirely on directly-observed, structurally-consistent
                                    real data, not on external documentation, which was never read).
```

---

## 6. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — keep current behavior (`"--"` stays `unparseable-numeric-value`) | **Considered, not selected.** Loses the classification opportunity this evidence supports; keeps the failing row anonymous (no row/metric traceability at all, §5 item 10) — strictly less honest than the alternative. |
| **B — recognize a narrow explicit missing token (`"--"`) → no MeasuredObservation → preserve source absence explicitly, never treated as malformed** | **Selected**, implemented by reusing the EXISTING `MissingDataObservation`/`"missing-data"` domain concept (§5 items 14/19) — not a new type. |
| C — convert known missing tokens into context-note entries | **Rejected** (§5 item 16) — a context-note is unstructured narrative; it would blur athlete commentary with a technical absence marker and discard the structured `expected` field the existing type already provides. |
| D — represent missing measurement as magnitude 0 | **Rejected outright** (§5 item 5) — the SAME real files use a genuine, literal `"0"` for a different, real, meaningful value in the SAME column; conflating them would corrupt already-honest data. |
| E — add a new domain `MissingMeasurement`/`MissingObservation` type | **Rejected** (§5 items 14/19) — existing domain semantics (`MissingDataObservation`) already suffice completely; a parallel type would duplicate, not extend, the domain. |
| F — add a configurable/global missing-token registry | **Rejected** (§5 item 20a) — evidence supports exactly ONE literal token so far; a registry/configuration layer would be infrastructure built for a generality that has not been observed. |
| G — source-format-specific preprocessing before the Manual Input Adapter | **Rejected** (§7 Decision area 8) — `ManualInputSubmission` carries no structured `sourceFormat` field today (it is folded into `submissionRef` as text only); adding one, and branching adapter behavior on it, would be new plumbing this one token does not justify, and risks becoming CSV-parser-shaped infrastructure by accident. |
| H — silently omit placeholder entries | **Rejected outright** — destroys traceability; directly violates "omitted Observation ≠ silently dropped source information" (§3). |

---

## 7. Required Decision Areas

### `[DECISION]` Decision area 1 — is `"--"` actually absence? → **YES, evidenced structurally, not by typography**
```text
classification : a known, source-declared, structural absence — "this aggregate statistic is not computed by
                  the source at this row's (sub-lap) level of granularity" — grounded in a 100%-consistent,
                  zero-exception, cross-session (274 combined real occurrences, two independent real Garmin
                  Connect exports) row-category pattern (§2/§5 items 4–9), never in the token's punctuation
                  alone.
```

### `[DECISION]` Decision area 2 — Observation creation → **no MeasuredObservation; a MissingDataObservation instead (existing type, reused)**
```text
No numeric Measurement of any kind is created for a recognized "--" entry — no magnitude 0, no NaN, no null
numeric Measurement, no "suspicious" Observation pretending a measurement exists. Instead, the ALREADY-
EXISTING MissingDataObservation domain concept represents it: the source field was OBSERVED to be present in
the row, and OBSERVED to be explicitly declared absent by the source itself — a genuinely different fact from
"the athlete's value is unknown to Aurora" (the "suspicious"/unrecognized-metric case) and a genuinely
different fact from "a measured athlete value was observed" (MeasuredObservation).
```

### `[DECISION]` Decision area 3 — traceability → **preserved via the EXISTING provenance-folding mechanism, no new surface**
```text
Evaluated existing surfaces first, per the mission's requirement:
  ManualInputIngestionOutcome  : the missing-data entry is ADMITTED (item below), so it appears in
                                 observationSet.observations, not merely a limitation code — a genuine
                                 improvement over today's anonymous-limitation failure path (§5 item 10).
  provenance / row reference   : the SAME sourceRowRef-folding mechanism already used for measured-value's
                                 Provenance.reference (Impl 044-A1/044-C2A precedent) is not tied to
                                 Measurement — it can equally attach to a MissingDataObservation's
                                 Provenance, preserving exactly which source row/field declared the absence.
  context notes                : NOT used for this purpose (Decision area — rejected, §5 item 16); notes stay
                                 reserved for free-text commentary.
  a new domain type             : NOT needed (§5 items 14/19) — MissingDataObservation already carries
                                 Provenance + quality + `expected`, sufficient to state which metric label was
                                 expected and where it came from.
Where the missing-source fact remains inspectable, exactly: the resulting MissingDataObservation's
`expected` field (the metric label, e.g. "avg-strokes-per-length") and its Provenance.reference (carrying the
same sourceRowRef/artifactRef folding already used elsewhere) — the raw literal text "--" itself would live in
the observation's `quality.reason` (an existing free-text field, exactly the same mechanism Impl 044-C2A used
to record a numeric-normalization note), not a new field.
```

### `[DECISION]` Decision area 4 — admission status → **admitted (accepted), not rejected, not merely tolerated**
```text
A known, source-declared absence is NOT a technical failure — it is Aurora faithfully recording exactly what
the source said: "this statistic does not exist at this row." Precedent already exists: an explicitly-
reported "missing-data" ManualInputEntry is ALREADY admitted today (not a limitation, not rejected) — Trial
044-D's other 40 admitted observations already include this exact honesty standard for every OTHER field.
Choosing "accepted" here does not hide source loss — it is the more honest representation of what genuinely
happened (the source explicitly declared absence, which Aurora explicitly, faithfully records), compared to
today's behavior which anonymously discards the row/field context entirely (§5 item 10).
```

### `[DECISION]` Decision area 5 — counting → **counts as an admitted (non-measured) observation, no new count concept**
```text
A recognized "--" entry is neither a rejected entry nor a silently-ignored entry — it becomes one more
admitted observation (of kind "missing-data") and is included in acceptedCount, exactly as any other
"missing-data" entry already is today (§5 item 18). No new count/accounting concept is introduced; the
existing accepted/limitations/acceptedCount model already has room for this without dishonesty, because the
resulting Observation genuinely IS admitted material (a faithfully-recorded absence), not a fabricated
success.
```

### `[DECISION]` Decision area 6 — limitation/reason vocabulary → **no new limitation value; `"unparseable-numeric-value"` stays exactly as it is for anything else**
```text
A recognized "--" entry produces NO limitation at all (it is admitted, Decision area 4) — "missing-unit"/
"unparseable-numeric-value" and the other 7 existing ManualInputLimitation values are untouched, unrenamed,
and still apply, unchanged, to every value that is NOT this one recognized token. No new catalog value is
introduced; MANUAL_INPUT_LIMITATIONS stays at 9 entries.
```

### `[DECISION]` Decision area 7 — scope of recognized missing tokens → **exactly the one literal string `"--"`, nothing broader**
```text
Only "--" is supported by real evidence (§2/§5 item 3) — zero occurrences of "N/A", "NA", "null", or a bare
single "-" in either real source file. A broader family is explicitly NOT selected; recognizing tokens with
no observed real instance would be building ahead of evidence, exactly the discipline this entire arc has
followed for every prior extension.
```

### `[DECISION]` Decision area 8 — source specificity / boundary location → **generic Manual Input Adapter behavior, not source-format-specific**
```text
`ManualInputSubmission` carries no structured sourceFormat field today (Tech Spec 044-A's own row-mapper
scoping — `sourceFormat` is folded into `submissionRef` as opaque text only, never a field mapEntry can
branch on). Building source-format-conditional behavior now would require NEW plumbing not otherwise
justified by one token (rejecting Option G, §6). The recognition is therefore planned as GENERIC
Manual-Input-Adapter behavior (alongside parseFiniteNumber, in manual-input-adapter.ts — mirroring exactly
where Spec 044-C2 placed grouped-thousands recognition, for the identical reason: this is a raw-text-
interpretation concern, not a row-shape-mapping concern, per Tech Spec 044-A's boundary).

Residual risk, stated explicitly rather than smoothed over: a hypothetical MANUAL (non-CSV) submission
containing the literal text "--" as a measured-value's rawValue would ALSO be recognized as "missing" under
this generic rule, even though the evidence for this specific convention comes from CSV-format Garmin
exports. This is judged an acceptably narrow risk: a bare two-character dash pair is an implausible literal
numeric-value attempt from a human reporter (it already fails strict parsing today, exactly as any other
malformed text does) — recognizing it as a known-missing token instead of an anonymous parse failure is a
strictly MORE honest outcome in either case (CSV-sourced or manually-typed), not a regression.
```

### `[DECISION]` Decision area 9 — Trial 044-D expected future effect → **the one real "--" entry becomes an admitted MissingDataObservation; acceptedCount and status change HONESTLY, not to make the trial look clean**
```text
IF a future implementation exists exactly as specified above:
  csv-D-5's "avg-strokes-per-length" = "--" entry -> an admitted MissingDataObservation
    (expected: "avg-strokes-per-length", quality.reason noting the source token "--" and its structural
    context, provenance carrying csv-D-5's row reference)

  Trial 044-D (future, post-implementation):
    acceptedCount   : 40 -> 41   (one more genuinely-admitted, non-fabricated observation — a real
                                   MissingDataObservation, not a measured value with an invented magnitude)
    limitations     : ["unparseable-numeric-value"] -> []
    status          : "partially-accepted" -> "accepted"

This is NOT forcing the count to look clean — it is the HONEST consequence of the selected semantics
(Decision areas 2/4/5): a source-declared absence, once recognized, genuinely IS admitted material, exactly
parity with every other "missing-data" entry Aurora already admits today. No fake Observation is created; the
count increases because a genuinely different, already-real, already-approved domain concept now correctly
represents what the source said, instead of an anonymous failure representing nothing.
```

### `[DECISION]` Decision area 10 — historical evidence → **`docs/trials/044-D-second-real-swim-session-intake-trial.md` is NOT modified**
```text
The original trial remains historically true: "--" WAS treated as unparseable and DID cause partial
acceptance, under the code that existed at the time of that trial. Future semantics (if a future
Implementation 044-D2A is approved) do not rewrite that original finding — exactly the same discipline this
arc has followed for docs/trials/044-C-real-training-intake-trial.md since Spec 044-C2.
```

---

## 8. Separate findings — recorded, not solved here

```text
Timestamp / temporal provenance : unchanged from Trial 044-D's own findings — untouched by this spec.
Near-duplicate source rows      : unchanged from Trial 044-D's own findings — untouched by this spec; no
                                   deduplication, row-collapsing, or parser heuristics are introduced.
CSV/TCX/FIT parser pressure     : unaffected — this spec adds no parser of any kind (Option G rejected, §6).
Garmin API pressure             : unaffected — not evaluated here.
Downstream automation pressure  : unaffected — no Signal/Evidence/RenderingRequest/runOperatorSession/
                                   delivery/AthleteDecision path is touched by missing-value recognition.
```

---

## 9. Required Acceptance Criteria (Given / When / Then)

```text
Given the real source token "--", when its semantics are evaluated, then the decision is grounded in source
  context (the sub-lap-vs-summary row-category pattern) rather than punctuation alone. ✅ (§2/§7 Decision
  area 1.)
Given a source-declared missing measurement, when intake handles it, then Aurora must not create numeric
  magnitude 0. ✅ (§7 Decision area 2; §6 Option D rejected.)
Given no numeric measurement exists, when source traceability is preserved, then the system must not pretend
  a MeasuredObservation exists. ✅ (§7 Decision area 2 — a MissingDataObservation is used instead, never a
  MeasuredObservation with an invented magnitude.)
Given a known missing token, when admission status is determined, then missingness must not be silently
  conflated with malformed input. ✅ (§7 Decision areas 4/6 — a recognized "--" produces no limitation at
  all; an unrecognized malformed value still does.)
Given a malformed numeric string, when intake runs, then it must remain distinguishable from a known missing
  token. ✅ (§7 Decision area 7 — only the exact literal "--" is recognized; anything else still resolves to
  "unparseable-numeric-value.")
Given an unsupported absence token, when intake runs, then Aurora must not guess that it means missing. ✅
  (§7 Decision area 7 — no broader family is recognized without its own evidence.)
Given the original Trial 044-D findings, when future behavior changes, then the historical findings document
  remains unchanged. ✅ (§7 Decision area 10.)
Given missing-value handling succeeds, when intake completes, then no Signal/Evidence/RenderingRequest/
  runtime/delivery/AthleteDecision action occurs. ✅ (§8; unchanged from every prior spec in this arc.)
Given AC20, when missing-value semantics are specified, then no production whole-core composer is
  introduced. ✅ (this spec is docs-only and adds no composer of any kind.)
```

---

## 10. Required Forbidden Behaviors (this spec)

```text
implementation code · test changes · "--" behavior change · zero substitution · NaN Measurement ·
null numeric Measurement · silent omission · broad missing-token registry · configuration framework ·
new dependency · package changes · CSV parser · FIT parser · TCX parser · Garmin API ·
timestamp/provenance fix · row deduplication · automatic Signal · automatic EvidenceCase ·
automatic RenderingRequest · automatic runOperatorSession · delivery · automatic AthleteDecision ·
API/UI/server · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 11. Relationship to Existing Architecture

- **Manual Data Trial 044-D** — this spec is its direct evidence-driven follow-up for the one remaining real
  finding; every decision traces to a specific, re-verified, cross-session structural pattern (§2).
- **Manual Data Trial 044-C** — its original source file independently corroborates the identical structural
  pattern (§2/§5 item 9); its own historical findings document is untouched (Decision area 10).
- **Impl 013 / the existing "missing-data" mechanism** — this spec's entire selected direction is "reuse, do
  not invent": `MissingDataObservation` already exists precisely for this concept and already counts as
  admitted material; this spec extends WHEN it is reached (from a measured-value entry's known-missing raw
  text), never WHAT it is.
- **Spec 044-C2 / Impl 044-C2A** — the boundary-location precedent (raw-text-interpretation concerns live in
  `manual-input-adapter.ts`, not `training-row-submission.ts`) is followed identically here (§7 Decision
  area 8).
- **AC20** — unchanged; this spec selects no new type, module, or composer.

---

## 12. Decision & Next Mission

`[DECISION] Missing value semantics boundary: Option B — recognize the exact literal token "--" as a known,
source-declared, structurally-evidenced absence (never inferred from typography alone), implemented by
reusing Aurora's EXISTING MissingDataObservation/"missing-data" domain concept — no new domain type, no
alias/registry/configuration infrastructure, no zero-substitution, no silent omission.`

```text
classification of "--"          : a known, source-declared, structural absence — "not computed by the source
                                   at this row's (sub-lap) aggregation level" — evidenced by a 100%-consistent
                                   row-category pattern across 274 combined real occurrences in two
                                   independent real Garmin Connect exports (§2).
evidence supporting classification : sub-lap rows ALWAYS carry "--" (136/136 combined across both files);
                                   interval-summary/rest rows NEVER do; the SAME column reports a genuine,
                                   distinct real "0" elsewhere in the SAME files, ruling out zero-equivalence.
selected Observation-creation behavior : no MeasuredObservation, no magnitude of any kind — a
                                   MissingDataObservation instead (existing type, reused, §7 Decision area 2).
selected traceability mechanism  : the existing sourceRowRef/Provenance-folding mechanism (Impl 044-A1/
                                   044-C2A precedent), attached to the MissingDataObservation; the raw literal
                                   "--" text lives in quality.reason (existing free-text field, no new field).
selected admission-status behavior : admitted/accepted — not rejected, not a limitation (§7 Decision area 4).
selected counting behavior       : counts toward acceptedCount as one more genuinely-admitted observation; no
                                   new count concept introduced (§7 Decision area 5).
selected limitation/reason behavior : no new ManualInputLimitation value; "unparseable-numeric-value" stays
                                   exactly as it is for anything NOT this one recognized token (§7 Decision
                                   area 6).
selected missing-token scope     : exactly the literal string "--" — nothing broader, no registry (§7
                                   Decision area 7).
selected boundary location       : generic Manual Input Adapter behavior, in manual-input-adapter.ts alongside
                                   parseFiniteNumber — not source-format-specific, not a new plumbing field
                                   (§7 Decision area 8, with residual risk stated explicitly).
Trial 044-D expected future effect : acceptedCount 40 -> 41; limitations ["unparseable-numeric-value"] -> [];
                                   status "partially-accepted" -> "accepted" — an honest consequence of the
                                   selected semantics, not a forced cleanup (§7 Decision area 9).
historical-evidence decision     : docs/trials/044-D-second-real-swim-session-intake-trial.md is NOT modified
                                   (§7 Decision area 10).
timestamp/provenance disposition : untouched, separate, unresolved (§8).
near-duplicate-row disposition   : untouched, separate, unresolved (§8).
```

`[RECOMMENDATION] Next mission: Tech Spec 044-D2A — Missing Value Handling Implementation Plan.` The evidence
crosses the same bar this arc's own precedent already established for metric-vocabulary extensions (Spec
044-C1/044-D1) — a real, structurally-consistent, cross-session pattern, not an isolated or ambiguous
occurrence — and a technical spec naming the exact `mapEntry` diff shape (where the `"--"`-recognition check
sits relative to `parseFiniteNumber`, exactly which `quality.reason` text is used, exactly how
`sourceRowRef` folds into the resulting `MissingDataObservation`'s provenance) is the appropriate next step —
still no implementation. No CSV/FIT/TCX parser, Garmin API, or downstream-automation work is recommended
without its own separate, future evidence.

---

## 13. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1057/1057** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
