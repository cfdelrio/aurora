# Tech Spec 002A — Signal Detection Implementation Plan

> The smallest safe TypeScript-strict plan for Spec 002 — turning observations into candidate `Signal`s or auditable `SignalRejection`s, while keeping Signal ≠ Evidence ≠ Hypothesis ≠ Impact ≠ DecisionSupport.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 002 — Signal Detection](./002-signal-detection.md) |
| **Builds on** | [Spec 001](./001-observation-set-intake.md) · [Tech Spec 001A](./001-observation-set-intake-tech.md) · Implementation 001 |
| **Module** | `observation` — a `signal` sub-boundary inside it ([Boundary Map §1](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md)) |
| **Language** | TypeScript strict (already established in Implementation 001 — no new decision) |

[FACT] The language is already decided and in use (TS strict, pure domain, no framework, native Node test runner). This slice adds to the existing toolchain; **no setup or language decision is reopened.**

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or from the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement signal detection so contextualized observations become candidate `Signal`s or auditable `SignalRejection`s without creating meaning, evidence, hypothesis, impact, or decision support?*

---

## 0. Technical Conventions Carried From Implementation 001

[FACT] Implementation 001 established these; this slice must follow them so it runs under native Node TS execution:
- **No constructor parameter properties** (`private readonly x` in the constructor signature). Native type-stripping only *erases*; parameter properties need *transformation* and throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Declare fields explicitly and assign in the body.
- **`import type` for all type-only imports** (`verbatimModuleSyntax` on); explicit **`.ts` extensions** on relative imports.
- **Value objects are frozen** (`Object.freeze`) and built by **smart constructors** that enforce invariants at construction (refuse partial/invalid input).
- **Branded opaque types** for identifiers; no bare strings as ids.
- Tests use `node:test` + `node:assert/strict`; casts go `as unknown as T`.

[ASSUMPTION] No new dependencies. `tsconfig` and `package.json` scripts (`typecheck`, `test`, `check`) are reused unchanged.

---

## 1. Implementation Scope

[DECISION] **Allowed:**
- `ContextualizedObservation` + `ContextualFrame` (+ explicit missing-context);
- `Signal`, `SignalDirection`, `SignalSalience` (qualitative), carried `quality`;
- `SignalRejection`, `SignalRejectionReason`;
- `SignalDetectionPolicy` (deterministic, rule-based);
- `TraceToObservation` (the bottom link back to `ObservationSet`/`Observation`);
- an application coordinator `detectSignals` (coordinates, never reasons);
- tests, including negative + dependency-boundary tests.

[FACT] **Forbidden (must not appear, by boundary and by test):**
- `Hypothesis`, `EvidenceCase`, `ImpactAssessment`, `UnderstandingProfile`, `DecisionSupportCase`;
- recommendation/warning/voice logic;
- fatigue/readiness/capacity inference;
- Garmin/FIT parser; database schema; API endpoint; UI; ML model; scoring formula.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout (unchanged by this slice):
```text
src/shared-kernel/{ids,time,provenance}.ts
src/modules/observation/domain/{observation,observation-quality,observation-set,index}.ts
src/modules/observation/application/record-observation-set.ts
src/modules/observation/index.ts
src/modules/observation/tests/*.test.ts
```

[DECISION] **Additive layout — `signal` as a sub-boundary inside `observation/domain`:**
```text
src/modules/observation/
  domain/
    observation.ts                 (existing, untouched)
    observation-quality.ts         (existing, untouched)
    observation-set.ts             (existing, untouched)
    index.ts                       (existing INTAKE surface, untouched)
    signal/
      contextual-frame.ts          # ContextualFrame, context inputs, missing-context
      contextualized-observation.ts# ContextualizedObservation + TraceToObservation
      signal.ts                    # Signal, SignalDirection, SignalSalience
      signal-rejection.ts          # SignalRejection, SignalRejectionReason
      signal-detection-policy.ts   # SignalDetectionPolicy (deterministic)
      index.ts                     # SIGNAL sub-boundary PUBLIC surface
  application/
    record-observation-set.ts      (existing, untouched)
    detect-signals.ts              # NEW coordinator
  tests/
    ... existing (untouched) ...
    signal/
      contextualization.test.ts
      signal-detection.test.ts
      signal-rejection.test.ts
      signal-negative-capability.test.ts
      signal-boundary.test.ts
  index.ts                         # module surface — ADD signal sub-boundary re-exports
```

[FACT] **No** top-level `reasoning` module; **no** `evidence` / `hypothesis` / `impact` / `understanding` / `decision-support` modules in this slice.

[ASSUMPTION] **The existing intake `domain/index.ts` stays meaning-free and unchanged** — its "no signal here" comment remains true for the *intake* surface. The `signal` sub-boundary gets its **own** `signal/index.ts`. This preserves Spec 001's guarantee (intake records without interpreting) while adding interpretation as a distinct, additive surface that *reads* observations. The module-level `src/modules/observation/index.ts` re-exports both surfaces; that is acceptable because the *whole* `observation` module legitimately owns the `signal` sub-boundary (Boundary Map §1).

[DECISION] `TraceToObservation` lives in `signal/` but is built from `shared-kernel` id types. It is **the bottom link only** — not the full `TraceabilityChain` (which the future `decision-support` module owns). Naming it distinctly avoids implying this slice builds the chain.

---

## 3. Domain Objects

[FACT] Conceptual fields only — no DB schema, no over-modeling.

### `SignalDirection`
- **Responsibility:** how the observation sits relative to its context.
- **Fields:** closed union — `'above-expected' | 'below-expected' | 'deviates' | 'absent'` (`absent` for a meaningful missing-data signal).
- **Invariant:** directional relative to context only.
- **Must not:** express cause or impact ("above-expected" ≠ "fitter").

### `SignalSalience`
- **Responsibility:** how much the observation stands out — qualitative.
- **Fields:** closed union — `'weak' | 'notable' | 'strong'`.
- **Invariant:** qualitative; no numeric score (non-goal).
- **Must not:** imply confidence in a claim or any athlete state.

### `SignalRejectionReason`
- **Responsibility:** the enumerated, auditable reason a candidate did not become a Signal.
- **Fields:** closed union — `'insufficient-quality' | 'insufficient-context' | 'expected-normal-variation' | 'source-conflict-unresolved' | 'duplicate-redundant' | 'irrelevant-to-current-question' | 'missing-baseline' | 'missing-purpose' | 'noise' | 'stale-context'`.
- **Invariant:** drawn only from this set.
- **Must not:** be free-form-only (a reason code is required; an optional note may accompany it).

### `TraceToObservation`
- **Responsibility:** the bottom link back to the source.
- **Fields:** `observationSetId`, one or more `observationId`s, and the observation's provenance reference handle(s).
- **Invariant:** must reference observations that exist in the named set; immutable.
- **Must not:** be the full `TraceabilityChain`; must not be omittable from a Signal or Rejection.

### `ContextualFrame`
- **Responsibility:** the named context an observation could be interpreted against.
- **Fields (all optional read-only inputs, plus an explicit gap list):** `purpose?` (snapshot, may be "unknown"), `baselineRef?`, `expectedRange?` (`{ quantity, low, high, unit }`), `sessionContext?`, `constraints?`, and **`missingContext: string[]`** (which expected context was absent).
- **Invariant:** records *which* context was applied and *what was missing*; carries no verdict.
- **Must not:** own purpose/baseline/etc. (read-only snapshots passed in); must not infer.

### `ContextualizedObservation`
- **Responsibility:** an observation paired with a `ContextualFrame` — frame, not conclusion.
- **Fields:** a reference to the source `Observation` (frozen, safe to hold), the `ContextualFrame`, the carried `ObservationQuality`, and a `TraceToObservation`.
- **Invariant:** does **not** mutate the original; preserves provenance + quality; is **not** a Signal.
- **Must not:** carry relevance/direction/meaning (those are the policy's output, on a Signal).

### `Signal`
- **Responsibility:** a value object asserting a contextualized observation **may be relevant** to a future reasoning question.
- **Fields:** `trace: TraceToObservation`; `frameRef` (which `ContextualFrame`); `questionTopic: string` (a question *category*, e.g. `"aerobic-response"`, never an answer); `direction: SignalDirection`; `salience: SignalSalience`; carried `quality: ObservationQuality`; `limitation?: string` (uncertainty); `source`(s) (from provenance).
- **Invariant:** every Signal is traceable to `ObservationSet`/`Observation`; carries quality; immutable.
- **Must not:** have any field for `fatigue`, `readiness`, `capacity`, `cause`, `impact`, `evidence`, `recommendation`, `decision`, or athlete `state`. **This absence is the point.**

### `SignalRejection`
- **Responsibility:** the auditable outcome that a candidate did **not** become a Signal.
- **Fields:** `trace: TraceToObservation`; `frameRef`; `reason: SignalRejectionReason`; `note?: string`; carried `quality`.
- **Invariant:** original observation preserved and traceable; reason required; immutable.
- **Must not:** delete, mutate, or downgrade the original observation.

### `SignalDetectionPolicy`
- **Responsibility:** decide, deterministically, whether a `ContextualizedObservation` yields a `Signal` or a `SignalRejection`.
- **Shape:** a pure function (or small interface with one method) `evaluate(ctx: ContextualizedObservation): Signal | SignalRejection`.
- **May decide:** relevance, `direction`, `salience`, quality eligibility, `reason`.
- **Must not decide:** evidence, hypothesis, cause, impact, fatigue, readiness, capacity, recommendation, athlete decision.

---

## 4. Contextualization Rules

[DECISION]
- Contextualization **must not mutate** the original observation (observations are frozen anyway — defense in depth).
- It **must preserve provenance** and **quality** onto the `ContextualizedObservation`.
- It **must name the context used** and **list missing context explicitly** (`missingContext`).
- It **may include** purpose, baseline, expected range, session context, source-conflict awareness, known constraints.
- It **does not create a Signal automatically** — it only produces the `ContextualizedObservation` that the policy then evaluates.

[FACT] Context provides **frame, not conclusion**. A `ContextualizedObservation` with `missingContext: ['baseline']` is valid input; the policy will likely reject it (`missing-baseline`), but contextualization itself never fabricates the missing frame.

---

## 5. Signal Construction Rules

[DECISION] A `Signal` is constructible **only** with: `trace` (to set+observation), `frameRef`, `questionTopic`, `direction`, `salience`, carried `quality`, `source`(s); `limitation` optional. The smart constructor refuses if `trace` or `quality` is missing.

[FACT] A `Signal` **must not** include `fatigue`, `readiness`, `capacity`, `cause`, `impact`, `evidence`, `recommendation`, `decisionSupport`, or athlete `state`. Enforced by type shape (no such fields exist) + negative test.

---

## 6. SignalRejection Rules

[DECISION]
- Rejection is **explicit and auditable** — a `SignalRejection` value, not a silent filter.
- **Original observation remains preserved**; `trace` keeps it reachable.
- **Reason is required** (from `SignalRejectionReason`); optional `note`.
- Reasons include the ten enumerated in §3.
- Rejection **must not** delete, mutate, or downgrade the original observation (it has no access to do so — observations are frozen and owned by intake).

---

## 7. SignalDetectionPolicy

[DECISION] **First implementation: a single deterministic, rule-based policy. No ML, no statistical scoring.**

- **Why deterministic-only now:** [FACT] the slice must be *auditable* and *traceable*; a deterministic rule (e.g., "value outside expected range → Signal(direction, salience); inside → Reject(expected-normal-variation); no baseline → Reject(missing-baseline)") is fully explainable and testable. Statistical/ML detection would introduce opacity exactly where the system most needs honesty, and scoring formulas are a non-goal.
- **May decide:** Signal-vs-Rejection, relevance, `direction`, `salience`, `reason`.
- **Must not decide:** evidence, hypothesis, cause, impact, fatigue, readiness, capacity, recommendation, athlete decision.
- [ASSUMPTION] One built-in policy for the first slice (e.g., an "expected-range deviation" rule). Policy *registration/selection* mechanism is deferred (§12) — the type is shaped so multiple policies could exist later without changing callers.

---

## 8. Negative Capability

[DECISION] **Three structural layers make meaning-creation impossible, each backed by a test:**

1. **Boundary:** the `signal` sub-boundary imports only the `observation` intake domain (`observation.ts`, `observation-quality.ts`, `observation-set.ts`) and `shared-kernel`. It has **no import** of `reasoning` / `evidence` / `hypothesis` / `impact` / `understanding` / `decision-support` (none exist; a dependency test asserts the import graph). It therefore *cannot construct* those types.
2. **Type shape:** `Signal` and `SignalRejection` have **no field** that can hold meaning (fatigue/readiness/impact/cause/evidence/recommendation/state). In TS strict this makes "a Signal with a fatigue verdict" *unrepresentable*, not merely untested.
3. **Public surface:** `signal/index.ts` exports **only** contextualization + detection operations and their types — no hypothesis/evidence/impact/scoring symbol.

[FACT] Plus: contextualization **cannot mutate** raw observations (frozen + no mutation path), and **no rejected candidate is dropped** (rejection is a returned value, retained by the coordinator/caller).

---

## 9. Validation Strategy (tests before implementation)

[DECISION] Written to Spec 002's acceptance criteria; **negative + boundary tests are defining.**

**Positive:**
1. `ContextualizedObservation` created **without mutating** the original observation (assert original still frozen + unchanged).
2. Provenance from `ObservationSet`/`Observation` preserved on `ContextualizedObservation`, `Signal`, and `SignalRejection` (via `TraceToObservation`).
3. Quality limitations preserved through contextualization → Signal/Rejection.
4. Policy produces a `Signal` when context marks the observation relevant (e.g., outside expected range), with correct `direction` + `salience`.
5. Policy produces a `SignalRejection` with `insufficient-context` / `missing-baseline` when context is insufficient.
6. Source conflict preserved visibly (reject `source-conflict-unresolved`, or Signal marked conflicted via carried `source-conflicted` quality — never silently resolved).
7. `MissingDataObservation` → `Signal` (`direction: 'absent'`) **only when absence matters in context**; else `SignalRejection`.
8. `SubjectiveObservation` → `Signal` while the original verbatim wording stays traceable; ambiguous report → `SignalRejection` (no `Inquiry` created).

**Negative (must prove absence):**
9. `Signal` has **no** `fatigue`/`readiness`/`capacity`/`impact`/`cause`/`evidence`/`recommendation`/`state` field (structural test).
10. No `Hypothesis`/`EvidenceCase`/`ImpactAssessment`/`UnderstandingProfile`/`DecisionSupportCase` object is produced or exported.
11. `SignalRejection` is auditable and traceable; **no rejected candidate is deleted**.

**Boundary:**
12. The `signal` sub-boundary / `observation` module does **not import** `reasoning` or `decision-support` (import-graph test).
13. **All existing `ObservationSet` tests continue to pass** (no regression; intake untouched).

---

## 10. Persistence Decision

[DECISION] **Pure domain objects + a deterministic policy. No repository, no DB, no event bus.**

#### Why
- [FACT] This slice validates *the model and its negative capability*, not storage. Implementation 001 chose pure-domain-+-tests; signal detection is a transformation over already-recorded observations and needs no new persistence.
- An event bus would be premature — Spec 002 produces values returned to a caller; event publication is a deferred concern (§12).

#### Reversal Point
- When signals must outlive a single call (for reasoning across time), add persistence/eventing in a later architecture paper behind the same value shapes.

[FACT] No database tables, no message bus defined here.

---

## 11. Relationship To Implementation 001

[FACT] Implementation 002 **builds on, and does not change,** Implementation 001:
- **Consumes** observations (reads `ObservationSet.active()` / `activeAsOf()`); **does not mutate** them.
- **Preserves provenance** born in intake and **quality** limitations, forward onto contextualized observations and signals.
- **Respects supersession history** — detection reads active observations; it never alters history.
- **Keeps intake free of meaning** — the existing intake domain surface and source are untouched.
- **Keeps `observation ⇏ reasoning`** — the signal sub-boundary never imports reasoning/decision-support.

[DECISION] No edits to Spec 001 files or Implementation 001 source. The `signal` capability and the `detect-signals` coordinator are **additive**; the module-level `index.ts` gains signal re-exports only.

---

## 12. Open Questions (do not block implementation)

[QUESTION]
- Exact baseline representation (`baselineRef` shape) — minimal for first impl; real shape deferred.
- Exact purpose context shape (some signals purpose-independent, e.g. "HR far above expected range").
- Whether signal strength stays qualitative — [ASSUMPTION] yes for this slice (`SignalSalience`), no numeric score.
- Future policy registration/selection mechanism (type allows many; selection deferred).
- Duplicate-detection boundary (`duplicate-redundant` reason exists; depth deferred).
- Source-conflict strategy before reasoning (reject / mark-conflicted both allowed now).
- First real signal type from Garmin/FIT data (importer is out of scope; first built-in rule is "expected-range deviation").
- Compile-time vs. runtime enforcement depth (carried from Boundary Map §11).
- Future event-publication strategy (deferred — §10).

[ASSUMPTION] None require resolution to build deterministic, auditable, meaning-free signal detection.

---

## 13. Implementation Task Preview

[DECISION] The task that follows this tech spec **once approved**:

> **Implementation 002 — Build ContextualizedObservation, Signal, SignalRejection, and SignalDetectionPolicy**

**Scope:** the `signal` sub-boundary inside `observation/domain/signal/`, the `detect-signals` coordinator, and the full test suite (§9). Module `index.ts` gains signal re-exports. Nothing else.

**Acceptance criteria (gate to "done"):**
- [ ] All §9 positive tests pass (mapped to Spec 002 AC in the tests).
- [ ] All §9 negative tests pass — `Signal`/`SignalRejection` carry **no** meaning/impact/evidence/recommendation field.
- [ ] Boundary test passes — `observation` does **not** import `reasoning`/`decision-support`.
- [ ] Contextualization never mutates observations; provenance + quality travel onto Signal/Rejection.
- [ ] `SignalRejection` is auditable, reason-coded, and preserves the original.
- [ ] Missing-data → Signal only when absence matters; self-report → Signal with verbatim wording traceable.
- [ ] `typecheck` clean (strict) and `test` green, **including all existing Implementation 001 tests** (no regression).

**This task explicitly produces:**
- **no** `Hypothesis`,
- **no** `Evidence`,
- **no** `Impact`,
- **no** `Understanding`,
- **no** `DecisionSupport`,
- **no** DB,
- **no** API,
- **no** UI.

[FACT] **Implementation does not begin until the user explicitly approves this tech spec.**

---

## Success Criterion

> **"Can Aurora notice that something may matter without accidentally claiming what it means?"**

[ASSUMPTION] After this tech spec, an implementer can build signal detection **without deciding any domain question in code**: the objects, fields, invariants, contextualization/construction/rejection rules, the deterministic policy's bounds, the enforcement layers, and the full (especially negative + boundary) test suite are all specified. Meaning is made impossible by three structural layers, each backed by a test; provenance and quality travel from Implementation 001 untouched; rejection is auditable; the signal boundary cannot reach reasoning. Relevance can be noticed; meaning waits for Spec 003.

---

## Known Risks

[ASSUMPTION]
- **Risk:** `questionTopic` or `direction` drifts from *category/relative-to-context* into a verdict. **Defense:** §3 defines them as topic/relative-only; negative test forbids meaning fields; direction union is context-relative.
- **Risk:** the module `index.ts` re-export accidentally exposes a meaning symbol. **Defense:** surface regex test on the module index (as in Implementation 001's negative-capability test).
- **Risk:** a future second policy tempts statistical scoring into this slice. **Defense:** §7 fixes deterministic-only for the first implementation; reversal is a later decision.
- **Risk:** parameter-property / native-strip pitfall recurs. **Defense:** §0 carries the convention forward explicitly.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical spec for Spec 002. It defines the minimal implementation plan; it does not implement. Implementation awaits explicit approval.*

*Inputs: [Spec 002](./002-signal-detection.md) · [Spec 001](./001-observation-set-intake.md) · [Tech Spec 001A](./001-observation-set-intake-tech.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
