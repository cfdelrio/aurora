# Tech Spec 004A — Understanding Update Implementation Plan

> The smallest safe TypeScript-strict plan for Spec 004 — a new `understanding` module that updates dimension-specific `UnderstandingProfile` from Hypothesis lifecycle outcomes, without confusing claim confidence, evidence volume, repetition, or population knowledge with personal understanding.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 004 — Understanding Update](./004-understanding-update.md) |
| **Builds on** | [Spec 003](./003-hypothesis-lifecycle.md)/[003A](./003-hypothesis-lifecycle-tech.md) + Implementation 003 (lifecycle outcomes are the input) |
| **New module** | `understanding` (consumes `reasoning` outcomes; never the reverse) |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided and in use. This slice adds a new module under the same setup.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement `UnderstandingProfile` so it learns from Hypothesis lifecycle outcomes without mistaking confidence, repetition, or population priors for athlete-specific understanding?*

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–003 (must follow for native Node TS execution):
- **No constructor parameter properties** (break native type-stripping). Explicit field declarations; assign in the body.
- **`import type`** for type-only imports; explicit **`.ts`** extensions.
- **Frozen value objects**; **smart constructors** enforce invariants at construction.
- **Branded opaque ids**; **aggregates immutable-by-operation** (methods return a new instance).
- Tests: `node:test` + `node:assert/strict`; casts go `as unknown as T`.

[ASSUMPTION] No new dependencies; reuse `tsconfig` and the `typecheck`/`test`/`check` scripts.

---

## 1. Implementation Scope

[DECISION] **Allowed:**
- new `understanding` module;
- `UnderstandingProfile` (aggregate root) + per-dimension records;
- `UnderstandingDimension`, `UnderstandingLevel`, `UnderstandingChange`, `UnderstandingChangeReason`;
- `SurvivedChallenge`, `Surprise`, `SurpriseKind`, `Staleness`, `Fragility`;
- `UnderstandingAssessment`, `SafeVoiceCeiling`;
- `ReasoningOutcome` + `TraceToHypothesisOutcome` (the consumed-outcome shape — see §3);
- update policies (promotion/demotion/surprise/staleness) as pure functions;
- a thin coordinator + a reasoning-outcome adapter;
- tests (positive, negative, boundary, no-regression).

[FACT] **Forbidden:** `DecisionSupportCase`; `VoiceMode`; recommendation; warning; `Inquiry`; `AthleteDecision`; `ImpactAssessment` projection *implementation*; DB; API; UI; event bus; ML model; scoring formula.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout (untouched): `src/shared-kernel/*`, `src/modules/observation/**`, `src/modules/reasoning/**`.

[DECISION] **New, additive `understanding` module:**
```text
src/modules/understanding/
  domain/
    ids.ts                       # UnderstandingProfileId (branded)
    understanding-level.ts       # UnderstandingLevel + ordering
    understanding-dimension.ts   # UnderstandingDimension
    reasoning-outcome.ts         # ReasoningOutcome, OutcomeKind, TraceToHypothesisOutcome (consumed shape)
    survived-challenge.ts        # SurvivedChallenge
    surprise.ts                  # Surprise, SurpriseKind
    staleness.ts                 # Staleness
    fragility.ts                 # Fragility
    understanding-change.ts      # UnderstandingChange, UnderstandingChangeReason
    update-policy.ts             # pure promotion/demotion/surprise/staleness rules
    understanding-assessment.ts  # UnderstandingAssessment, SafeVoiceCeiling
    understanding-profile.ts     # aggregate root + DimensionUnderstanding (per-dimension record)
    index.ts                     # understanding domain PUBLIC surface
  application/
    reasoning-outcome-adapter.ts # builds ReasoningOutcome from a reasoning Hypothesis snapshot (imports reasoning)
    understanding-coordinator.ts # updateUnderstandingFromOutcome / produceUnderstandingAssessment / markUnderstandingStale
  tests/
    ... (see §14)
  index.ts                       # module surface
```

[DECISION] **`understanding` depends on `reasoning`** (the adapter imports the `reasoning` surface; the domain imports only the `HypothesisId` *type*) **and `shared-kernel`**. **`reasoning` must not depend on `understanding`** (re-checked). **`understanding` must not depend on `decision-support`** (doesn't exist; boundary test asserts it stays that way).

[FACT] **No** `decision-support`, `impact`, or `athlete-decision` module is created in this slice. Ids are understanding-local (reversal: promote to `shared-kernel` when a second module references them) — keeping the slice purely additive.

---

## 3. Required Reasoning Outcome Surface *(gap analysis — surfaced, not decided silently)*

[FACT] **Inspection of the current `reasoning` module:** its public surface (`reasoning/index.ts`) exposes the `Hypothesis` aggregate snapshot, which carries `id`, `athleteRef`, `state` (`HypothesisLifecycleState`), `confidence` (`ClaimConfidence`), `falsifiers`, `evidence` (`EvidenceCase[]`), and `revisions` (`HypothesisRevision[]` with `from`/`to`/`cause`/`at`). **There is NO dedicated lifecycle-outcome type and NO outcome events.**

[ASSUMPTION] **Gap:** "lifecycle outcomes" (what Spec 004 says understanding consumes) are *implicit* in the snapshot — they are the `state` and the `revisions` (each transition is an outcome). The raw material is sufficient, **but** consuming the `Hypothesis` snapshot directly would drag `EvidenceCase`/`Signal`/`ClaimConfidence` into understanding's reach — exactly what invariants 3–4 forbid.

[DECISION] **Resolution — an anti-corruption adapter (Option 3 + adapter), no change to reasoning:**
- Define a `ReasoningOutcome` value type **in `understanding`** that captures only what understanding legitimately needs.
- A `reasoning-outcome-adapter` in `understanding/application` (allowed to import `reasoning`) builds `ReasoningOutcome` **from a `Hypothesis` snapshot**, deriving the outcome and **dropping raw `EvidenceCase`s, `Signal`s, and `ClaimConfidence`**.
- The understanding **domain** consumes only `ReasoningOutcome` — never `EvidenceCase`/`Signal`/`Observation`, never `ClaimConfidence`.

[DECISION] **`ReasoningOutcome` deliberately omits `ClaimConfidence`.** This makes "direct mapping from claim confidence to understanding level" **unrepresentable** — the level-deriving policy has no confidence field to read.

- **Why this is the honest choice:** it keeps "understanding consumes outcomes, not raw evidence volume" (invariant 3) *and* "claim confidence is not understanding level" (invariant 4) true **by construction**, without touching the reasoning module.
- **Reversal Point:** [QUESTION] a future slice could have `reasoning` emit explicit outcome events (Option 2); the adapter would then consume those instead of a snapshot — same `ReasoningOutcome` shape downstream.

[FACT] **Important:** understanding consumes lifecycle **outcomes**, never raw `Signals`, raw `EvidenceCases`, or raw `Observations`.

---

## 4. Domain Objects

[FACT] Conceptual fields only — no DB schema, no over-modeling.

### `UnderstandingProfileId`
- **Responsibility:** opaque identity. **Fields:** branded value. **Invariant:** unique, opaque. **Must not:** encode meaning.

### `UnderstandingLevel`
- **Responsibility:** how well Aurora understands a dimension. **Fields:** union `'Unknown' | 'Thin' | 'Working' | 'Trusted' | 'Mature'` + an ordering helper. **Invariant:** ordinal; `Unknown` valid. **Must not:** be a global score; map directly from `ClaimConfidence`.

### `UnderstandingDimension`
- **Responsibility:** an athlete-specific *(response × conditions)* pattern. **Fields:** `key: string` (stable identifier), `description: string`. **Invariant:** specific enough to avoid global profiling; traceable to why it exists. **Must not:** be a fixed taxonomy or an `Athlete` attribute.

### `ReasoningOutcome` *(the consumed shape — understanding-local)*
- **Responsibility:** the derived lifecycle outcome understanding consumes. **Fields:** `hypothesisId` (type from reasoning), `athleteRef: string`, `outcomeKind: OutcomeKind` (`'supported' | 'weakened' | 'contradicted' | 'falsified' | 'retired' | 'promoted-to-working-knowledge'`), `hadDeclaredFalsifier: boolean`, `conditions: readonly string[]` (opaque condition descriptors derived by the adapter), `dimensionKey: string`, `at: Timestamp`. **Invariant:** athlete-specific; carries **no** `ClaimConfidence`, **no** `EvidenceCase`/`Signal`. **Must not:** be built from population knowledge (only from an athlete's hypothesis snapshot).

### `TraceToHypothesisOutcome`
- **Responsibility:** reasoning-level traceability for an understanding change. **Fields:** `hypothesisId`, `outcomeKind`, `at`. **Invariant:** references a real hypothesis outcome. **Must not:** be the full TraceabilityChain.

### `SurvivedChallenge`
- **Responsibility:** record that a hypothesis survived a real challenge. **Fields:** `trace: TraceToHypothesisOutcome`, `conditions: readonly string[]`, `falsifierSurvived: boolean`, `at`. **Invariant:** athlete-specific and traceable; same-condition repetition does not count as a new distinct challenge. **Must not:** be inferred from evidence volume.

### `Surprise`
- **Responsibility:** a material inconsistency with current understanding. **Fields:** `kind: SurpriseKind` (`'positive' | 'negative' | 'ambiguous' | 'noise' | 'context-shift'`), `description: string`, `trace: TraceToHypothesisOutcome`, `at`. **Invariant:** recorded, never hidden. **Must not:** be silently dropped.

### `Staleness`
- **Responsibility:** how current the understanding is. **Fields:** `status: 'fresh' | 'stale'`, `reason?: string`, `since?: Timestamp`. **Invariant:** stale lowers the safe voice ceiling; history preserved. **Must not:** delete prior understanding.

### `Fragility`
- **Responsibility:** how exposed a level is. **Fields:** `level: 'low' | 'elevated' | 'high'`, `reasons: readonly string[]`. **Invariant:** travels into the assessment. **Must not:** be a numeric score.

### `UnderstandingChange`
- **Responsibility:** one recorded level/fragility/staleness change. **Fields:** `from: UnderstandingLevel`, `to: UnderstandingLevel`, `reason: UnderstandingChangeReason`, `trace: TraceToHypothesisOutcome | undefined`, `at`, `note?`. **Invariant:** appended on every change; never edited or deleted. **Must not:** be omittable.
- `UnderstandingChangeReason`: union `'initial' | 'survived-challenge' | 'contradiction' | 'falsification' | 'surprise' | 'staleness' | 'purpose-change' | 'constraint-change' | 'context-shift'`.

### `SafeVoiceCeiling`
- **Responsibility:** the maximum assertiveness future decision-support may use for a dimension. **Fields:** ordinal `'none' | 'tentative' | 'qualified' | 'confident'`. **Invariant:** derived from level × fragility × staleness; can only be *lowered* by staleness/fragility. **Must not:** be a `VoiceMode`; **must not** select or produce a voice — it is a ceiling, not an output.

### `UnderstandingAssessment` *(read-only)*
- **Responsibility:** how well Aurora understands a dimension, for future decision-support. **Fields:** `dimension`, `level`, `fragility`, `staleness`, `safeVoiceCeiling`, `reasons: readonly string[]`, `trace: readonly TraceToHypothesisOutcome[]`. **Invariant:** read-only. **Must not:** recommend, choose a `VoiceMode`, create a warning/inquiry, or own a decision.

### `UnderstandingProfile` *(aggregate root)*
- **Responsibility:** Aurora's per-dimension understanding of one athlete; owns promotion/demotion invariants.
- **Fields:** `id`, `athleteRef`, a map `dimensionKey → DimensionUnderstanding` (each holding level, fragility, staleness, survived challenges, surprises, and change history).
- **Invariant:** **no global score**; per-dimension; consumes only `ReasoningOutcome`; history never deleted; `Mature` never permanent; immutable-by-operation.
- **Must not:** own raw observations/signals/`EvidenceCase`s; own athlete state/capacity; produce decision support; expose an in-place mutator.

[ASSUMPTION] `DimensionUnderstanding` is an internal per-dimension record within the aggregate (not its own aggregate; no independent invariant beyond the profile's).

---

## 5. UnderstandingProfile Construction Rules

[DECISION] `UnderstandingProfile.initialize({ id?, athleteRef })`:
- for **one** athleteRef; **no global score**; dimensions start absent (each unobserved dimension reads `Unknown` on query);
- owns **no** raw observations, **no** raw signals, **no** `EvidenceCase`s, **no** athlete state/capacity, **no** decision support;
- a dimension begins at `Unknown`, advancing to `Thin` only when an athlete-specific outcome about it arrives.

---

## 6. Dimension Rules

[DECISION]
- a dimension is **response × conditions**, **athlete-specific**, **not a fixed taxonomy**, **not an `Athlete` attribute**;
- dimensions are **created or identified from `ReasoningOutcome`s** (via `dimensionKey`);
- dimensions **preserve traceability** to the outcomes that created/updated them;
- dimensions may be **merged or refined only with an explicit recorded reason**.

[ASSUMPTION] Naming/deduplication is **not over-solved** here — `dimensionKey` is provided by the adapter (derived from the hypothesis's scope/conditions); a richer naming/merge policy is deferred (§16).

---

## 7. UnderstandingLevel Rules

[DECISION] Levels `Unknown < Thin < Working < Trusted < Mature`:

| Level | Permits | Does not permit | Notes |
|---|---|---|---|
| `Unknown` | nothing personal; population fallback only (elsewhere) | any personal claim | valid, explicit |
| `Thin` | naming a tentative pattern | confident interpretation | sparse athlete-specific basis |
| `Working` | cautious interpretation | strong personal claims | partially confirmed, lightly held |
| `Trusted` | confident personal interpretation | treating as beyond challenge | earned by survived challenge across varied conditions |
| `Mature` | confident interpretation **with stated edges** | permanence | Trusted + demonstrated revisability; still demotable |

[FACT] **No direct mapping from `ClaimConfidence` to `UnderstandingLevel`** (structurally: `ReasoningOutcome` carries no confidence). **No automatic promotion from `promoted-to-working-knowledge`** — that outcome is one input, never by itself a level.

[DECISION] Level may carry **fragility** and **staleness** independently of its ordinal value (a `Trusted` level can be `high` fragility and `stale`, which lowers its ceiling).

---

## 8. Promotion Rules

[DECISION] Understanding may promote **only** from athlete-specific `ReasoningOutcome`s, and:
- **to `Thin`:** the first relevant outcome about the dimension;
- **to `Working`:** a `supported` outcome (athlete-specific), held lightly;
- **to `Trusted`:** a `SurvivedChallenge` with `falsifierSurvived: true` across **≥2 distinct conditions** (relevant condition variation);
- **to `Mature`:** `Trusted` **and** at least one recorded surprise/contradiction the understanding **survived/recovered from** (demonstrated revisability — "knows its edges").

[FACT] Promotion must **not** happen from: evidence volume alone; repetition alone (same-condition repeats never add a distinct challenge); population knowledge (no `ReasoningOutcome` exists for it); claim confidence alone (not in the input); a single unchallenged successful hypothesis; or a `promoted-to-working-knowledge` state by itself.

[DECISION] **Enforcement:** prefer runtime policy + tests; where TS helps, make it unrepresentable — e.g. `ReasoningOutcome` has no `ClaimConfidence` field (so confidence-to-level is impossible to write), and "distinct conditions" is computed from the `conditions` set (a `Set` of descriptors), so same-condition repetition cannot inflate the count.

---

## 9. Demotion, Surprise, and Staleness Rules

[DECISION] Understanding may **demote or become limited** from: a `falsified` outcome; a `contradicted` outcome; a **meaningful surprise**; **staleness**; **purpose change**; **constraint change**; **context shift**.

Rules:
- **demotion history is preserved** (append-only `UnderstandingChange`s);
- **demotion is not failure** — it is epistemic honesty;
- **surprise is first-class** and recorded/classified, never hidden;
- **`Mature` can demote** (no permanence);
- **staleness lowers the safe voice ceiling** (does not necessarily change the ordinal level, but caps assertiveness); strong/aged staleness may demote;
- **stale understanding is not deleted.**

[DECISION] **Surprise detection** is an **understanding-side** judgment in this slice: an incoming `ReasoningOutcome` of kind `falsified`/`contradicted` on a dimension currently at `Trusted`/`Mature` is a `Surprise` (the model expected stability). (A dedicated reasoning-side `SurpriseDetection` service is **deferred** — surfaced, not built here.)

[DECISION] **Purpose/constraint change is represented as an external input placeholder** in this slice: the coordinator accepts an explicit `markUnderstandingStale(dimensionKey, reason)` call (reason = `purpose-change` / `constraint-change` / `context-shift` / `staleness`). Wiring it to actual `Athlete` `PurposeChanged` events is **deferred** (Spec 007/008). [QUESTION] flagged.

---

## 10. UnderstandingAssessment Rules

[DECISION] `produceUnderstandingAssessment(profile, dimensionKey)` returns a **read-only** `UnderstandingAssessment` with `dimension`, `level`, `fragility`, `staleness`, `safeVoiceCeiling`, `reasons`, `trace`.

[FACT] It must **not**: generate a recommendation; choose a `VoiceMode`; create a warning/inquiry; own an `AthleteDecision`; or turn the `SafeVoiceCeiling` into an actual voice.

[FACT] **`SafeVoiceCeiling` is not `VoiceMode`.** It is a *ceiling* (max permitted assertiveness, in understanding's own vocabulary) that the future `decision-support` module will read and map to a `VoiceMode`. This slice defines and exposes the ceiling; it never selects a voice.

---

## 11. Negative Capability

[DECISION] **Structural prevention, each backed by a test:**
1. **Boundary:** `understanding` imports `reasoning` (adapter: values; domain: only the `HypothesisId` type) + `shared-kernel`. It does **not** import `decision-support`. `reasoning` does **not** import `understanding` (re-checked). `observation` imports neither.
2. **Type shape:** `ReasoningOutcome` has **no `ClaimConfidence`** field (confidence→level unrepresentable); the understanding domain has **no** import of `EvidenceCase`/`Signal`/`Observation` (raw consumption unrepresentable); `UnderstandingProfile` has **no** global-score field and **no** athlete-state/capacity field; `SafeVoiceCeiling` is its own ordinal, **not** a `VoiceMode`.
3. **Construction control:** distinct-condition counting uses a `Set` of descriptors, so repetition cannot inflate it; promotion to `Trusted` requires `falsifierSurvived` across ≥2 conditions.
4. **Public surface:** `understanding/index.ts` exports only understanding operations/types — no decision/recommendation/voice/warning/inquiry symbol.

[FACT] Plus, by construction: no global score; surprise recorded; demotion history append-only; `Mature` demotable.

---

## 12. Application Service / Coordinator

[DECISION] Thin coordinators that **coordinate, never reason**:
- `updateUnderstandingFromOutcome({ profile, outcome }) → UnderstandingProfile`
- `produceUnderstandingAssessment({ profile, dimensionKey }) → UnderstandingAssessment`
- `markUnderstandingStale({ profile, dimensionKey, reason, at }) → UnderstandingProfile`

Plus an **adapter** (application layer, imports `reasoning`):
- `reasoningOutcomeFrom(hypothesis, dimensionKey) → ReasoningOutcome` — derives the outcome, dropping raw evidence/signals/confidence.

[FACT] All promotion/demotion/staleness invariants live in `UnderstandingProfile` + the pure `update-policy`; the coordinator only sequences calls.

---

## 13. Persistence Decision

[DECISION] **Pure domain objects. No repository (unless a test wants a trivial in-memory one), no DB, no event bus.**
- **Why:** this slice validates the model and its negative capability; understanding operates over outcomes passed in and returns profiles/assessments. Persistence and eventing are deferred.
- **Reversal Point:** add an append-only profile store + outcome-event subscription when understanding must persist across sessions or react to live reasoning events.

[FACT] No tables, no message bus defined here.

---

## 14. Validation Strategy (tests before implementation)

[DECISION] **Negative + boundary + no-regression tests are defining.**

**Positive:**
- initializes `UnderstandingProfile` with **no global score**; unobserved dimension reads `Unknown`.
- creates/identifies a **dimension-specific** understanding from an outcome; updates **only** the relevant dimension.
- **promotes by survived challenge** across ≥2 conditions with traceable reason.
- **demotes** after `contradicted`/`falsified`, preserving history and contradiction.
- **records `Surprise`** (classified) on falsified/contradicted at Trusted/Mature.
- **marks stale**; stale **lowers the safe voice ceiling**; history preserved.
- **`Mature` demotes** on new contradictory outcome.
- produces a **read-only** `UnderstandingAssessment` with level/fragility/staleness/ceiling/reasons/trace.
- **exposes the safe voice ceiling without choosing a `VoiceMode`.**

**Negative (must prove absence):**
- **no promotion by repetition alone** (same-condition `supported` repeats stay capped at `Working`, do not reach `Trusted`).
- **no promotion by evidence volume alone** (many same-condition outcomes ≠ promotion).
- **no promotion from population knowledge** (no `ReasoningOutcome` ⇒ no promotion path; understanding stays `Unknown`/`Thin`).
- **no claim-confidence-to-level mapping** (`ReasoningOutcome` carries no confidence; identical outcomes differing only in the originating hypothesis's confidence yield identical levels).
- **`promoted-to-working-knowledge` alone does not yield `Mature`.**
- no `DecisionSupportCase`/`VoiceMode`/`Recommendation`/`Warning`/`Inquiry`/`AthleteDecision` created or exported; no global-score field; surprise never hidden; demotion history never deleted; no raw `Observation`/`Signal`/`EvidenceCase` consumed by the domain.

**Boundary:**
- `understanding` **may** import `reasoning`.
- `reasoning` **must not** import `understanding`.
- `understanding` **must not** import `decision-support`.

**No-regression:**
- **all Implementation 001 + 002 + 003 tests continue to pass.**

---

## 15. Relationship To Implementation 003

[FACT] Implementation 004 **builds on, does not change,** Implementation 003:
- **Hypothesis lifecycle outcomes** are the input (via the adapter over a `Hypothesis` snapshot).
- **Hypothesis confidence is not `UnderstandingLevel`** (`ReasoningOutcome` carries no confidence).
- **`EvidenceCase`s do not directly promote** understanding; **`Signal`s do not directly promote** understanding.
- **`promoted-to-working-knowledge` is not automatically `Mature`.**
- **`reasoning` remains independent of `understanding`.**
- understanding consumes **tested outcomes only**.

[DECISION] No edits to any existing file. The `understanding` module is **entirely additive**; the adapter imports the `reasoning` surface read-only.

---

## 16. Open Questions (do not block implementation)

[QUESTION] Exact representation of lifecycle outcomes (snapshot-adapter now; possible reasoning-side outcome events later) · dimension naming & deduplication · threshold for "varied relevant conditions" (≥2 chosen as a starting rule) · exact promotion/demotion thresholds · staleness decay strategy · how purpose changes map to affected dimensions (external placeholder now) · whether the safe voice ceiling is qualitative only ([ASSUMPTION] yes) · whether `UnderstandingAssessment` is a projection or value object ([ASSUMPTION] read-only value produced on demand) · first concrete dimension worth implementing · compile-time vs. runtime enforcement depth · future public event surface.

[ASSUMPTION] None block building per-dimension understanding that promotes only by survived challenge, demotes on surprise/contradiction/staleness, and exposes a read-only assessment.

---

## 17. Implementation Task Preview

[DECISION] The task that follows **once approved**:

> **Implementation 004 — Build UnderstandingProfile, dimension updates, Surprise, Staleness, and UnderstandingAssessment**

**Scope:** the new `understanding` module (§2), the adapter + thin coordinators (§12), the full test suite (§14). Nothing else.

**Acceptance criteria (gate to "done"):**
- [ ] All §14 positive tests pass.
- [ ] All §14 negative tests pass — no promotion by repetition/volume/population/confidence; no `promoted-to-working-knowledge`→`Mature`; no global score; surprise visible; demotion history preserved.
- [ ] All §14 boundary tests pass — `understanding`→`reasoning` allowed; `reasoning`⇏`understanding`; `understanding`⇏`decision-support`.
- [ ] Dimension-specific updates only; survived-challenge promotion across ≥2 conditions; `Mature` demotable.
- [ ] `UnderstandingAssessment` read-only; `SafeVoiceCeiling` exposed but **not** a `VoiceMode`.
- [ ] `typecheck` clean (strict) and `test` green, **including all Implementation 001 + 002 + 003 tests** (no regression).

**This task explicitly produces:**
- **no** `DecisionSupportCase`, **no** `VoiceMode`, **no** `Recommendation`, **no** `Warning`, **no** `Inquiry`, **no** `AthleteDecision`, **no** DB, **no** API, **no** UI.

[FACT] **Implementation does not begin until the user explicitly approves this tech spec.**

---

## Success Criterion

> **"Can Aurora learn the athlete from what its hypotheses survived, contradicted, or failed — without confusing confidence with understanding?"**

[ASSUMPTION] After this tech spec, an implementer can build the understanding slice **without deciding any domain question in code**: the objects, fields, invariants, the anti-corruption `ReasoningOutcome` adapter (which structurally drops confidence and raw evidence), the promotion rule (survived challenge across ≥2 conditions, never repetition/volume/priors/confidence), the demotion/surprise/staleness rules, the read-only assessment with a `SafeVoiceCeiling` that is explicitly not a `VoiceMode`, the enforcement layers, and the full negative + boundary + no-regression test suite are all specified. Aurora learns from what its hypotheses survived — not from what it piled up, and never by mistaking claim confidence for understanding.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the snapshot adapter drags evidence/confidence into the domain. **Defense:** §3 — adapter lives in application; `ReasoningOutcome` carries no confidence/evidence; domain imports no `EvidenceCase`/`Signal`.
- **Risk:** repetition inflates "distinct conditions." **Defense:** §11.3 — count via a `Set` of condition descriptors.
- **Risk:** `SafeVoiceCeiling` is mistaken for / coupled to `VoiceMode`. **Defense:** own ordinal type; negative test forbids a `VoiceMode` symbol.
- **Risk:** `promoted-to-working-knowledge` auto-promotes to `Mature`. **Defense:** §8 + a test that this outcome alone does not reach `Mature`.
- **Risk:** parameter-property / native-strip pitfall in the aggregate class. **Defense:** §0 — explicit field declarations.
- **Risk:** reasoning reaches toward understanding for convenience. **Defense:** dependency-boundary test over the import graph.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical spec for Spec 004 and the plan for the first `understanding` module. It defines the minimal implementation plan and surfaces the reasoning-outcome gap; it does not implement. Implementation awaits explicit approval.*

*Inputs: [Spec 004](./004-understanding-update.md) · [Spec 003](./003-hypothesis-lifecycle.md) · [Tech Spec 003A](./003-hypothesis-lifecycle-tech.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
