# Aurora — Specification 044-C2 — Numeric Lexical Normalization Boundary

> **Status (2026-07-02).** Specification phase, building on Manual Data Trial 044-C (`d14744f`) and Impl 044-C1A
> (`cc123ba`). It is **behavioral / docs-only**: it implements no code, modifies no test, does not fix `"1,600"`,
> adds no dependency, no package/test change, adds no CSV/FIT/TCX parser, no Garmin API integration, no metric
> canonicalization, creates no `Signal`/`EvidenceCase`/`RenderingRequest`, calls no `runOperatorSession`, adds no
> delivery, creates no `AthleteDecision` automatically, introduces no production whole-core composer, and amends
> no AC20. Base: `tsc --noEmit` clean; `node --test` **1032/1032**. It decides the approved boundary for
> interpreting numeric text found in real training data.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary;
`"1,600"` is not fixed here, no code is created here.

---

## 1. Context

`[FACT]` Manual Data Trial 044-C's one remaining genuine finding, unresolved by the metric-vocabulary work
(Spec 044-C1 / Tech Spec 044-C1A / Impl 044-C1A, `cc123ba`): a real Garmin swim-distance value, written by the
source export as `"1,600"`, fails `parseFiniteNumber` and becomes a `"unparseable-numeric-value"` row-level
limitation. This spec answers **only** how Aurora should interpret numeric TEXT — never metric names, units,
CSV/FIT/TCX file formats, or Garmin API access.

`[FACT]` Exact current source (`src/modules/observation/application/manual-input-adapter.ts`, verified at
authorship):

```ts
function parseFiniteNumber(rawValue: string): number | undefined {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return undefined;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}
```

`Number("1,600")` is `NaN` in JavaScript — the language's native numeric coercion has **no** locale/grouping
awareness at all. This is not a bug Impl 044-A1 introduced; `parseFiniteNumber` is a thin, faithful wrapper
around native `Number()`, inheriting this exactly.

`[FACT]` **A subtler finding, worth stating precisely rather than assumed away:** `activity_23459651624.csv`'s
own column headers are **Spanish** (`"Distancia"`, `"Frecuencia cardiaca media"`, …) — and in Spanish-language
numeric convention, comma is **conventionally the decimal separator**, not a thousands-grouping separator. A
naive "Spanish file ⇒ comma means decimal" assumption would suggest `"1,600"` might mean `1.6`. **But the same
file's own internal numeric formatting contradicts that assumption**: every decimal-bearing value observed
elsewhere in the file (lap-split seconds, e.g. `"0:14.5"`, `"1:07.5"`) uses a **period**, never a comma, for
its decimal point — and comma appears **only** on large integer-valued fields (distance, stroke totals) with
**exactly three trailing digits** each time (`"1,600"`, `"3,600"`, `"1,382"`). This is corroborated
domain-semantically too: the file's own `"Largos"` (lengths) column reports `32` lengths for the `"1,600"` row,
and `32 × 50 m = 1,600 m` — exactly consistent with a grouped-thousands reading, and physically implausible at
`1.6 m`. **This is in-file empirical evidence, not a locale guess** — and this spec treats that distinction as
load-bearing (§4 item 6, §6 Decision 1/2).

---

## 2. Central Question

> How should Aurora interpret numeric text found in real training data without silently guessing locale,
> corrupting values, or presenting lexical normalization as truth?

```text
raw numeric text ≠ numeric truth · lexical normalization ≠ device accuracy · successful parse ≠ Evidence ·
successful parse ≠ recommendation quality · comma ≠ always thousands separator ·
comma ≠ always decimal separator · locale inference ≠ fact · parsed value ≠ Signal ·
Observation ≠ Evidence · Signal ≠ Evidence · Evidence ≠ recommendation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/trials/044-C-real-training-intake-trial.md
docs/specs/044-C1-metric-normalization-boundary.md
docs/specs/044-C1A-metric-vocabulary-implementation-plan.md
src/modules/observation/tests/044-c-real-swim-session-fixture.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/application/training-row-submission.ts
src/modules/observation/application/manual-input-adapter.ts   (parseFiniteNumber, exact source, §1)
src/modules/observation/domain/observation.ts                  (Measurement { quantity, magnitude, unit })
```

---

## 4. Required Analysis

```text
 1. Exact current parsing behavior : parseFiniteNumber trims/checks non-empty, calls native Number(rawValue),
                                     returns the value iff Number.isFinite — no locale/grouping/punctuation
                                     handling of any kind.
 2. Why "1,600" fails today       : native JS Number() has zero locale awareness — it does not strip or
                                     interpret grouping punctuation; this is a language-level limitation
                                     parseFiniteNumber faithfully inherits, not a defect introduced by 044-A1.
 3. Is rawValue preserved anywhere : NO, on either path. On FAILURE, only the limitation CODE
                                     "unparseable-numeric-value" survives in the outcome (a flat list of codes
                                     — no per-value text); the row is simply absent from the ObservationSet. On
                                     SUCCESS, only the parsed Measurement.magnitude (a number) is stored — the
                                     original text form (was it "42", "42.0", "+42"?) is discarded once parsed.
 4. Does source format provide locale metadata : NO — neither TrainingSummaryRow nor TrainingRowSubmission
                                     (Impl 044-A1) has any locale/numeric-format field. `sourceFormat` describes
                                     the INTAKE MECHANISM ("manual-summary"/"csv-summary"), not a punctuation
                                     convention.
 5. Can source/platform metadata safely influence parsing : NOT TODAY — `deviceLabel`/`artifactRef` carry no
                                     reliable locale signal (e.g. "Garmin Connect export" says nothing about
                                     which language/region setting produced the punctuation). Would require a
                                     new, deliberately-added explicit field — out of scope here.
 6. Is a comma with 3 trailing digits sufficient evidence for grouping : for THIS TRIAL'S specific values, YES —
                                     corroborated by (a) the same file's OWN internal consistency (every
                                     decimal value elsewhere uses a period, never a comma) and (b) a
                                     domain-semantic cross-check (32 lengths × 50 m = 1,600 m, matching the
                                     file's own "Largos" column). This is IN-FILE empirical corroboration, not
                                     a universal locale guarantee — treated as the narrowest defensible rule,
                                     not a general locale inference (§1, §6 Decision 1/2).
 7. Should "1,6" mean 1.6 or 16   : AMBIGUOUS — could be a European decimal-comma (1.6) or a malformed/
                                     truncated grouping (a true thousands-group needs exactly 3 digits, not 1).
                                     NOT supported; stays rejected.
 8. Should "1.600" mean 1600 or 1.6 : UNCHANGED from today — native Number("1.600") already parses as 1.6
                                     (period = decimal, standard, unambiguous under existing JS behavior). This
                                     spec does not alter that interpretation.
 9. Should mixed separators ("1,600.5") be supported : NOT in this first slice — not observed in the real
                                     trial, not evidenced, explicitly deferred.
10. Should spaces/non-breaking spaces be supported : NOT in this first slice — not observed, not evidenced,
                                     deferred.
11. Are signs supported            : ALREADY, unchanged — native Number() already parses a leading sign (e.g.
                                     Number("-5") === -5); no gap exists here, no change needed.
12. Are percentages numeric values or unit-bearing text : a UNIT concern (value "45" + unit "%"), not a
                                     numeric-lexical-FORM concern — entirely out of scope for this spec; the
                                     numeral itself parses under whatever rule already applies to it.
13. Do time-like values ("1:23.4") belong here : NO, explicitly out of scope — per the 044-C trial's own
                                     methodology, colon-formatted mm:ss(.s) values are converted to seconds
                                     BEFORE reaching Aurora (an external, manual, one-time transcription step);
                                     parseFiniteNumber never sees colon-formatted text, and this stays true.
14. Does scientific notation belong here : NOT observed, not plausible for any encountered training metric
                                     (heart rate, distance, pace, SWOLF, strokes, calories are all plain small-
                                     to-moderate numbers) — deferred, unevidenced.
15. Should locale be explicit rather than inferred : YES, as a GENERAL PRINCIPLE beyond the one narrow pattern
                                     selected (§6 Decision 1/2). Aurora must never silently guess a broader
                                     locale convention; the one supported pattern is a narrow LEXICAL SHAPE
                                     recognition (exact grouped-thousands, no decimal point present), not a
                                     locale inference — everything else stays rejected pending either explicit
                                     locale metadata (not built) or further real evidence.
16. Must normalization warnings be preserved : YES — a successfully grouped-thousands value must carry a
                                     `quality.reason` annotation documenting that lexical normalization
                                     occurred, without downgrading `quality.status` to "suspicious" for a case
                                     that is, under the narrow rule, unambiguous (§6 Decision 4).
17. Should ambiguous values be rejected : YES, unconditionally — any comma-bearing value NOT matching the
                                     narrow grouped-thousands pattern (§6 Decision 2) remains rejected
                                     ("unparseable-numeric-value"), exactly as today. Aurora never guesses
                                     between two plausible interpretations.
18. Does this belong in training-row-submission or manual-input-adapter : manual-input-adapter.ts, extending
                                     the existing parseFiniteNumber (or a small adjacent helper) — NOT
                                     training-row-submission.ts, which Tech Spec 044-A deliberately scoped as a
                                     PURE row-shape mapper; blending numeric-lexical validation into it would
                                     blur that boundary.
19. Is a new dependency needed     : NO — the narrow grouped-thousands rule (match a fixed regex shape, strip
                                     the grouping commas, then call the existing Number()) is a few lines of
                                     native JS/TS; no locale library (Intl.NumberFormat, numeral.js, etc.) is
                                     justified by one sample.
20. What evidence is still missing : (a) a real sample containing a genuinely ambiguous comma-decimal value
                                     (e.g. "1,6") to inform how Aurora should ever handle explicit non-US-style
                                     data; (b) a second real export corroborating (or contradicting) that
                                     comma-grouping is this platform's/locale's actual convention, not a
                                     one-file coincidence; (c) evidence that a real caller would ever supply an
                                     explicit locale/format field; (d) any real mixed thousands+decimal value.
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — keep current strict numeric parsing; reject `"1,600"` | **Considered, not selected.** The genuinely safe fallback if the in-file evidence (§4 item 6) were weaker; respected as the default absent that corroboration. |
| **B — normalize only unambiguous grouped-thousands forms** | **Selected.** A narrow, precisely-bounded LEXICAL SHAPE match (§6 Decision 1/2) — not a locale inference — justified by in-file internal consistency + domain-semantic cross-check, and nothing broader. |
| C — support explicit locale-aware parsing | **Deferred.** Would require a locale/format field `TrainingSummaryRow`/`TrainingRowSubmission` does not have; one sample doesn't justify building that plumbing yet. |
| D — infer locale from punctuation heuristics | **Rejected as a general strategy.** Would violate "locale inference ≠ fact" for genuinely ambiguous shapes (e.g. `"1,6"`). The narrow rule selected under B is deliberately NOT this — it recognizes one unambiguous shape and rejects everything else, rather than guessing a locale and reinterpreting broadly. |
| E — support a broad numeric parser library | **Rejected.** No dependency is justified by one observed value (§4 item 19). |
| F — accept ambiguous numeric forms with warnings | **Rejected.** A flagged guess is still a guess between two plausible interpretations — Aurora should reject and let the existing operator review/correction protocol (Spec 044-B / Docs 044-B1) resolve it, not silently pick one. |
| G — silently coerce all punctuation | **Rejected outright.** Direct violation of "Aurora never presents inference as fact." |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — Supported lexical forms (first implementation)
```text
plain integer                  -> SUPPORTED (unchanged, native Number()).
plain decimal with dot         -> SUPPORTED (unchanged, native Number()).
leading sign                   -> SUPPORTED (unchanged, already works via native Number()).
grouped-thousands comma        -> NEWLY SUPPORTED — ONLY the exact shape defined in Decision 2.
decimal comma (e.g. "1,6")     -> NOT supported — genuinely ambiguous, stays rejected.
mixed thousands + decimal      -> NOT supported — not observed, not evidenced.
spaces / non-breaking spaces   -> NOT supported — not observed, not evidenced.
scientific notation            -> NOT supported — not observed, not plausible for current metrics.
time-like values ("1:23.4")    -> OUT OF SCOPE ENTIRELY — handled by external transcription, never reaches
                                   parseFiniteNumber.
percentages                    -> OUT OF SCOPE — a unit concern, not a numeric-lexical-form concern.
```

### `[DECISION]` Decision 2 — Ambiguity rule (exact)
```text
UNAMBIGUOUS (supported)  : a string matching ^[+-]?\d{1,3}(,\d{3})+$ — one or more comma-separated groups of
                            EXACTLY three digits, no decimal point anywhere in the value (e.g. "1,600",
                            "3,600", "1,382", "12,345,678"). Interpreted by stripping the commas and parsing
                            the remaining digits as a plain integer.
AMBIGUOUS (rejected)     : any comma-bearing string NOT matching that exact shape — e.g. "1,6" (1 trailing
                            digit), "1,60" (2 trailing digits), "1,6789" (4 trailing digits), or any value
                            combining a comma with a decimal point (e.g. "1,600.5"). These remain
                            "unparseable-numeric-value" — Aurora does not guess between plausible readings.
INVALID (rejected, unchanged) : anything already failing native Number() today for reasons unrelated to
                            grouping (empty string, non-numeric text, multiple decimal points, etc.).
```

### `[DECISION]` Decision 3 — Raw text preservation → **required, in principle**
Whenever a value is lexically normalized (grouping commas stripped), the ORIGINAL raw text (e.g. `"1,600"`)
must be preserved somewhere in provenance context — mirroring the existing `sourceRowRef`-folding-into-
`Provenance.reference` mechanism (Impl 044-A1) — so a reviewer can always verify Aurora's interpretation
against the exact source text. The **exact mechanism** (where/how the raw string is folded in) is an
**implementation detail deferred to Tech Spec 044-C2A** — this spec decides only that it must happen, never
that the transformation may silently discard the original text.

### `[DECISION]` Decision 4 — Warnings → **a normalization note, not a "suspicious" downgrade**
A successfully grouped-thousands value keeps `quality.status: "complete"` (the interpretation is unambiguous
under Decision 2's narrow rule) — but its `quality.reason` must document that lexical normalization occurred
(e.g. something to the effect of "grouped-thousands normalized from raw source text"), avoiding both silent
transformation and unwarranted "suspicious" inflation for a genuinely unambiguous case.

### `[DECISION]` Decision 5 — Boundary location → **`manual-input-adapter.ts`, extending `parseFiniteNumber`**
Stays inside the SAME file and function Impl 044-A1/044-C1A already own for numeric/metric concerns — not
`training-row-submission.ts` (a deliberately pure row-shape mapper, per Tech Spec 044-A — mixing numeric-
lexical validation into it would blur that boundary), not shared-kernel (one use case does not justify a
cross-module utility — premature generalization), not a new module (AC20a).

### `[DECISION]` Decision 6 — Dependency → **none**
The narrow grouped-thousands rule (a fixed-shape regex match + comma-strip + the existing `Number()` call) is
a few lines of native JS/TS. No locale library is justified by one observed value.

### `[DECISION]` Decision 7 — Real-trial expected effect (for a FUTURE implementation)
```text
"1,600" -> 1600 (once implemented)

real trial (future, post-implementation):
  status         : "partially-accepted" -> "accepted"
  acceptedCount  : 20 -> 21
  limitations    : ["unparseable-numeric-value"] -> []
```
Verified against exact current `ingestManualInput` logic: `status = limitations.length > 0 ?
"partially-accepted" : "accepted"` — removing the one limitation flips status to `"accepted"` and
`acceptedCount` increases by exactly one (the previously-failed distance row now succeeds). **The ORIGINAL
Trial 044-C findings document (`docs/trials/044-C-real-training-intake-trial.md`) must NOT be silently
rewritten** to hide the original finding — a future implementation updates the LIVE test assertions (as
044-C1A did for the metric-vocabulary finding) while the findings document remains historical evidence of what
was originally observed, optionally gaining an explicit addendum noting the gap was later closed — never a
quiet retroactive edit.

### `[DECISION]` Decision 8 — Automation → **none**
Numeric lexical normalization triggers **no** automatic Signal, EvidenceCase, RenderingRequest,
`runOperatorSession`, delivery, or `AthleteDecision` — unchanged from every prior spec in this arc.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given the real raw value "1,600", when the selected normalization rule applies, then its interpretation must
  be explicit and deterministic. ✅ (Decision 1/2 — the exact regex shape, stripped and parsed, always yields
  1600, never a second possible reading.)
Given an ambiguous comma form, when locale is unknown, then Aurora must reject or preserve ambiguity rather
  than silently guess. ✅ (Decision 2 — "1,6"/"1,60"/"1,6789" and comma+decimal-point combinations all stay
  rejected.)
Given numeric normalization succeeds, when the observation is admitted, then it remains Observation material,
  not Evidence. ✅ (central distinction, §2; unchanged — normalization only ever affects Measurement.magnitude/
  ObservationQuality, never Signal/Evidence.)
Given raw numeric text exists, when normalization occurs, then source representation remains preserved where
  provenance allows. ✅ (Decision 3.)
Given an unrelated invalid numeric string, when parsed, then it remains rejected. ✅ (Decision 2's "INVALID"
  category, unchanged from today.)
Given no automation boundary is approved, when normalization succeeds, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs. ✅ (Decision 8.)
Given the original 044-C trial, when future implementation reruns it, then the original documented finding
  remains historically true even if the new behavior succeeds. ✅ (Decision 7 — the findings document is not
  silently rewritten.)
Given AC20, when numeric normalization is implemented, then no production whole-core composer is
  introduced. ✅ (this spec is docs-only and plans no composer of any kind.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · broad locale inference · silent coercion · numeric parser dependency without separate
approval · package changes · CSV parser · FIT parser · TCX parser · Garmin API · metric canonicalization ·
automatic Signal · automatic EvidenceCase · automatic RenderingRequest · automatic runOperatorSession ·
delivery · automatic AthleteDecision · API/UI/server · scheduler/worker loop · production whole-core composer ·
reflection-composition · AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Manual Data Trial 044-C** — this spec is its direct, final evidence-driven follow-up; the `"1,600"` finding
  is the sole trigger, cited precisely (§1).
- **Spec 044-C1 / Impl 044-C1A** — the sibling metric-vocabulary work; this spec is explicitly scoped to NOT
  touch metric names or units, only numeric-text lexical form, keeping the two concerns cleanly separated.
- **Impl 044-A1** — `parseFiniteNumber` is the exact, sole target of any future implementation; nothing else in
  `manual-input-adapter.ts` changes.
- **Spec 044-B / Docs 044-B1** — the operator review/correction protocol remains the resolution path for any
  value this spec's narrow rule still rejects (via `ObservationSet.supersede(...)`, unchanged).
- **AC20** — unchanged; this spec selects no new type, module, or composer.

---

## 10. Decision & Next Mission

`[DECISION] Numeric lexical normalization boundary: Option B — normalize only unambiguous grouped-thousands
forms (a fixed-shape regex match: one or more exact 3-digit comma groups, no decimal point present). No broad
locale inference, no locale-aware parser, no numeric parser dependency, no support for decimal-commas, mixed
separators, spaces, or scientific notation. Raw source text must be preserved wherever a value is normalized;
a normalization note (not a "suspicious" downgrade) documents the transformation.`

```text
selected lexical forms   : plain integer/decimal/sign (unchanged) + grouped-thousands comma (new, narrow
                            shape only) — nothing else.
ambiguity rule           : ^[+-]?\d{1,3}(,\d{3})+$, no decimal point in the value, = unambiguous; anything
                            else with a comma = ambiguous/rejected (Decision 2).
raw-text preservation    : required in principle — exact mechanism deferred to Tech Spec 044-C2A.
warning decision         : a normalization NOTE in quality.reason; quality.status stays "complete" (no
                            "suspicious" inflation for an unambiguous case).
boundary location        : manual-input-adapter.ts, extending parseFiniteNumber — not training-row-
                            submission.ts, not shared-kernel, not a new module.
dependency decision      : none — a few lines of native regex/string handling.
real-trial expected effect : "1,600" -> 1600; status partially-accepted -> accepted; acceptedCount 20 -> 21;
                            limitations ["unparseable-numeric-value"] -> [] — once a FUTURE implementation
                            exists. The original findings document is not silently rewritten (Decision 7).
automation decision      : none — no Signal/EvidenceCase/RenderingRequest/runOperatorSession/delivery/
                            AthleteDecision.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-C2A — Numeric Lexical Normalization Implementation Plan.` A
technical spec (still no implementation) naming the exact regex, the exact `parseFiniteNumber` extension shape,
the exact raw-text-preservation mechanism (§6 Decision 3), and the exact test/trial-assertion updates — only
then followed by `Implementation 044-C2A — Grouped-Thousands Numeric Intake`. No broader locale parsing is
recommended without further real evidence (§4 item 20).

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1032/1032** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
