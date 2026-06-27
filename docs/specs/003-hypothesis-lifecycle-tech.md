# Tech Spec 003A — Hypothesis Lifecycle Implementation Plan

> The smallest safe TypeScript-strict plan for Spec 003 — attaching Signals to falsifiable Hypotheses as EvidenceCases, in a new `reasoning` module, without turning inference into fact, confidence into certainty, or evidence into decision support.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 003 — Hypothesis Lifecycle & EvidenceCase](./003-hypothesis-lifecycle.md) |
| **Builds on** | [Spec 002](./002-signal-detection.md)/[002A](./002-signal-detection-tech.md) + Implementation 002 (Signal is the input) |
| **New module** | `reasoning` (consumes `observation`; never the reverse) |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain are already decided and in use. This slice adds a new module under the same setup.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement `Hypothesis` and `EvidenceCase` so Signals become evidence only inside falsifiable, revisable claims — without creating Understanding, DecisionSupport, recommendations, or athlete-facing truth claims?*

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–002 (must follow for native Node TS execution):
- **No constructor parameter properties** (they break native type-stripping — `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Declare fields explicitly; assign in the body.
- **`import type`** for type-only imports (`verbatimModuleSyntax`); explicit **`.ts`** extensions.
- **Frozen value objects** via `Object.freeze`; **smart constructors** enforce invariants at construction.
- **Branded opaque ids**; no bare strings.
- **Aggregates are immutable-by-operation** (methods return a new instance; nothing mutated in place) — as `ObservationSet` does.
- Tests: `node:test` + `node:assert/strict`; casts go `as unknown as T`.

[ASSUMPTION] No new dependencies; reuse `tsconfig` and the `typecheck`/`test`/`check` scripts unchanged.

---

## 1. Implementation Scope

[DECISION] **Allowed:**
- new `reasoning` module;
- `Hypothesis` (aggregate root), `EvidenceCase` (entity inside it);
- `HypothesisId`, `EvidenceCaseId`;
- `HypothesisClaim`, `HypothesisScope`, `HypothesisLifecycleState`, `EvidenceDirection`, `ClaimConfidence`, `Falsifier`, `HypothesisRevision`, `TraceToSignal`;
- traceability `EvidenceCase → Signal → Observation → ObservationSet`;
- lifecycle transitions;
- a thin application coordinator;
- tests (positive, negative, boundary, no-regression).

[FACT] **Forbidden:** `UnderstandingProfile`; `DecisionSupportCase`; `VoiceMode`; recommendations; warnings; `AthleteDecision`; `ImpactAssessment` projection *implementation*; DB; API; UI; event bus; ML model; scoring formula.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout (untouched): `src/shared-kernel/*`, `src/modules/observation/**`.

[DECISION] **New, additive `reasoning` module:**
```text
src/modules/reasoning/
  domain/
    ids.ts                    # HypothesisId, EvidenceCaseId (branded)
    hypothesis-claim.ts       # HypothesisClaim, HypothesisScope, ClaimSubjectKind
    falsifier.ts              # Falsifier
    claim-confidence.ts       # ClaimConfidence, ConfidenceLevel
    evidence-direction.ts     # EvidenceDirection
    evidence-case.ts          # EvidenceCase (+ TraceToSignal) — constructed ONLY via Hypothesis
    hypothesis-lifecycle.ts   # HypothesisLifecycleState, allowed transitions, HypothesisRevision
    hypothesis.ts             # Hypothesis aggregate root (immutable-by-operation)
    index.ts                  # reasoning domain PUBLIC surface
  application/
    reasoning-coordinator.ts  # openHypothesis / attachSignalAsEvidence / transitionHypothesis
  tests/
    hypothesis-creation.test.ts
    evidence-attachment.test.ts
    evidence-direction.test.ts
    lifecycle.test.ts
    confidence.test.ts
    traceability.test.ts
    reasoning-negative-capability.test.ts
    reasoning-boundary.test.ts
  index.ts                    # module surface
```

[DECISION] **`reasoning` depends on `observation`** (imports the Signal surface, read-only) **and `shared-kernel`**. **`observation` must not depend on `reasoning`** (Boundary Map §2 — already enforced; re-checked). **`reasoning` must not import `understanding` or `decision-support`** (they don't exist; a boundary test asserts it stays that way).

[FACT] **No** `understanding`, `decision-support`, `impact`, or `athlete-decision` module is created in this slice.

[DECISION] **Ids live in `reasoning/domain/ids.ts` for now** (reasoning-local), *not* added to `shared-kernel`, so this slice touches **no existing file**.
- **Why:** the directive is "do not modify existing implementation"; reasoning-local branded ids keep the slice purely additive. Boundary Map §3 says the kernel owns cross-module identifiers, but no second module references `HypothesisId` yet.
- **Reversal Point:** when `understanding`/`decision-support` need to reference `HypothesisId`, promote these ids to `shared-kernel` (additive kernel export at that time).

---

## 3. Domain Objects

[FACT] Conceptual fields only — no DB schema, no over-modeling.

### `HypothesisId` / `EvidenceCaseId`
- **Responsibility:** opaque identity. **Fields:** branded opaque value. **Invariant:** unique, never reused, never parsed. **Must not:** encode meaning.

### `HypothesisClaim`
- **Responsibility:** what is asserted (defeasibly). **Fields:** `statement: string`, `subjectKind: ClaimSubjectKind` (`'impact' | 'state-relation' | 'response-pattern' | 'interpretation'`). **Invariant:** non-empty statement. **Must not:** assert certainty or a recommendation.

### `HypothesisScope`
- **Responsibility:** what the claim covers / does not. **Fields:** `statement: string`; optional `dimension?` / `timescale?` (from the impact model). **Invariant:** explicit. **Must not:** silently widen.

### `Falsifier`
- **Responsibility:** an explicit condition that would weaken/defeat/require revision. **Fields:** `condition: string`, `status: 'declared' | 'pending'`, `pendingReason?: string`. **Invariant:** if `pending`, `pendingReason` required. **Must not:** be absent from a hypothesis (see §4).

### `ClaimConfidence`
- **Responsibility:** claim-specific calibrated belief — never certainty, never global understanding. **Fields:** `level: ConfidenceLevel` (`'tentative' | 'limited' | 'moderate' | 'well-supported'` — **no `certain`**), `limitations: readonly string[]` (always present, may be empty only when truly none). **Invariant:** no `certain` level exists in the type; `limitations` always carried. **Must not:** represent certainty or athlete-understanding.

### `EvidenceDirection`
- **Responsibility:** how an `EvidenceCase` bears on **the claim**. **Fields:** union `'supports' | 'weakens' | 'contradicts' | 'falsifies' | 'contextualizes'`. **Invariant:** required on every case. **Must not:** be confused with `Signal.direction` — see the note below.

> [FACT] **Two different "directions" — do not conflate:** `Signal.direction` (`above-expected`/`below-expected`/`deviates`/`absent`) is *relative to context*. `EvidenceDirection` (`supports`/…/`falsifies`) is *relative to the claim*. The same Signal can be `above-expected` (vs context) and `supports` or `contradicts` (vs a given hypothesis) depending on the claim. The `EvidenceCase` records the claim-relative one; the Signal keeps the context-relative one.

### `TraceToSignal`
- **Responsibility:** the reasoning-level bottom link from an `EvidenceCase` down to its Signal and onward. **Fields:** the originating `Signal` (frozen) — which itself carries `TraceToObservation` (set + observation ids + references), quality, source, salience, `questionTopic`. **Invariant:** must reference a `Signal` (outcome `'signal'`), never a `SignalRejection`. **Must not:** be the full `TraceabilityChain` (that is decision-support's, recommendation-level).

### `HypothesisRevision`
- **Responsibility:** one recorded lifecycle/confidence change. **Fields:** `at: Timestamp`, `from: HypothesisLifecycleState`, `to: HypothesisLifecycleState`, `cause: string`. **Invariant:** appended on every transition; never edited. **Must not:** be omittable.

### `EvidenceCase` *(entity, inside Hypothesis)*
- **Responsibility:** why a Signal matters to **this** claim. **Fields:** `id`, `signal` (frozen), `trace: TraceToSignal`, `direction: EvidenceDirection`, `quality` (carried from signal), `limitations: readonly string[]`, `reasoningNote: string`, `at: Timestamp`. **Invariant:** created **only** inside a `Hypothesis`; references a `Signal` not a `SignalRejection`; preserves traceability + quality; direction and note required. **Must not:** exist as an independent aggregate; create Understanding/DecisionSupport.

### `Hypothesis` *(aggregate root)*
- **Responsibility:** a falsifiable, revisable claim; owns its evidence and lifecycle invariants.
- **Fields:** `id`, `claim`, `scope`, `athleteRef?`, `purposeContextRef?`, `state: HypothesisLifecycleState`, `evidenceCases: readonly EvidenceCase[]`, `confidence: ClaimConfidence`, `limitations: readonly string[]`, `falsifiers: readonly [Falsifier, ...Falsifier[]]` (non-empty tuple), `revisions: readonly HypothesisRevision[]`.
- **Invariant:** always ≥1 falsifier (or a `pending` one with reason); never `certain`; never a fact; immutable-by-operation; every transition recorded; falsified/retired preserved.
- **Must not:** be a fact/diagnosis/recommendation/Athlete attribute/global understanding/decision support; expose an in-place mutator.

---

## 4. Hypothesis Construction Rules

[DECISION] `Hypothesis.open({ claim, scope, athleteRef?, purposeContextRef?, falsifiers, confidence?, limitations? })`:
- `claim` and `scope` explicit (non-empty); `athleteRef` explicit if the claim is athlete-specific;
- initial `state = 'proposed'`;
- `confidence` defaults to `{ level: 'tentative', limitations }` — **never** certainty;
- **≥1 falsifier required**; if a falsifier is `pending`, its `pendingReason` is required;
- `limitations` visible;
- the hypothesis is not presentable as fact (no such field/flag exists).

[DECISION] **Unfalsifiable hypotheses are made unrepresentable where practical:** the `falsifiers` input is typed as a **non-empty tuple** `readonly [Falsifier, ...Falsifier[]]`, so "no falsifier" is a **compile error**; a runtime guard also rejects an empty list (defense in depth, for untyped boundaries). A *pending* falsifier is allowed but must carry a reason — so "no falsifier and no reason" cannot be constructed.

---

## 5. EvidenceCase Construction Rules

[DECISION] An `EvidenceCase` is created **only** by `Hypothesis.attachEvidence(...)` — there is **no exported standalone constructor**. Rules:
- it must reference a **`Signal`** (the parameter type is `Signal`, outcome `'signal'`); a **`SignalRejection` is a type error** (outcome `'rejection'`) — *unrepresentable*;
- it preserves traceability `→ Observation → ObservationSet` (via the Signal's `TraceToObservation`) and the Signal's **quality/limitations**;
- **`direction` (EvidenceDirection) is required**; **`reasoningNote` is required**;
- **source conflict remains visible** (carried from the signal's quality / source);
- it lives inside the `Hypothesis` consistency boundary (returned as part of a new `Hypothesis`);
- it creates **no** Understanding or DecisionSupport.

[ASSUMPTION] `attachEvidence` returns a **new `Hypothesis`** with the case appended, confidence re-derived, lifecycle possibly transitioned, and a `HypothesisRevision` recorded — nothing mutated in place.

---

## 6. Evidence Direction Rules

[DECISION] Allowed: `supports`, `weakens`, `contradicts`, `falsifies`, `contextualizes`.
- `supports` — may raise confidence, **never to certainty**.
- `weakens` — lowers/limits confidence.
- `contradicts` — challenges the claim; **remains visible** (recorded case, not dropped); may lower confidence/move to `contradicted`.
- `falsifies` — satisfies a **declared** falsifier → moves the hypothesis to `falsified`; **does not delete it**.
- `contextualizes` — adds relevant context without directly supporting/weakening.

[FACT] Contradiction is never hidden; falsification never deletes.

---

## 7. Lifecycle Rules

[DECISION] States and transitions (Spec 003 is source of truth):

| State | Meaning | Allowed → | Receives evidence? | Active support? |
|---|---|---|---|---|
| `proposed` | created, no evidence yet | `active`, `retired` | yes (first evidence → `active`) | no |
| `active` | has evidence, under evaluation | `supported`, `weakened`, `contradicted`, `falsified`, `promoted-to-working-knowledge`, `retired` | yes | constrained |
| `supported` | net-supporting evidence | `weakened`, `contradicted`, `falsified`, `promoted-to-working-knowledge`, `retired` | yes | yes |
| `weakened` | confidence lowered | `supported`, `contradicted`, `falsified`, `retired` | yes | constrained |
| `contradicted` | challenged; contradiction visible | `weakened`, `supported`, `falsified`, `retired` | yes | constrained / no |
| `falsified` | defeated by a declared falsifier | — (terminal; preserved) | no | **no** |
| `retired` | no longer useful/current | — (terminal; preserved) | no | **no** |
| `promoted-to-working-knowledge` | survived challenge; **reversible, not certainty** | `weakened`, `contradicted`, `falsified`, `retired` | yes | yes |

[FACT] Rules that hold across all: **falsified and retired remain traceable** (never deleted); **promotion is not certainty**; **promotion does not update `UnderstandingProfile`** in this slice (Spec 004 owns that). [ASSUMPTION] Forbidden transitions (e.g., `falsified → supported`, `retired → active`) throw, with the attempted transition explaining why it's illegal.

---

## 8. Confidence Rules

[DECISION] `ClaimConfidence` is **claim-specific, qualitative** (`tentative < limited < moderate < well-supported`; **no `certain`**), always carrying `limitations`. It may move up or down because of: stronger support; contradiction; source conflict; quality limitations; repeated survival of falsifiers; staleness; changed purpose/context. **Promoted knowledge remains reversible.**

[DECISION] **Qualitative, not numeric** for the first implementation (no scoring formula — non-goal). Confidence re-derivation is a deterministic, explainable rule over the evidence directions present (e.g., presence of `contradicts` caps the level; a `falsifies` forces the lifecycle, not a number). [QUESTION] Exact re-derivation rule deferred (§15) — but it is qualitative and rule-based, never a score.

---

## 9. Traceability Enforcement

[DECISION] An `EvidenceCase` is traceable to: `Signal` → (the Signal's `frame`/`ContextualizedObservation` context) → `Observation` → `ObservationSet` → `source` → `provenance` → `quality limitations`, by **holding the frozen Signal** (which already carries `TraceToObservation`, `quality`, `source`) plus a `TraceToSignal` wrapper.

[FACT] **This is reasoning-level traceability, not the full `TraceabilityChain`.** The decision-support `TraceabilityChain` (recommendation-level, verified at the speaking boundary) is a *later* construct that will build on these links. This slice needs only that every `EvidenceCase` can be walked back to its observation roots — not a verified complete chain.

---

## 10. Negative Capability

[DECISION] **Structural prevention, each backed by a test:**

1. **Boundary:** `reasoning` imports only the `observation` Signal surface (read-only) + `shared-kernel`. It does **not** import `understanding`/`decision-support` (they don't exist; a boundary test asserts the import graph). `observation` still does **not** import `reasoning` (re-checked).
2. **Type shape:**
   - `ClaimConfidence` has **no `certain`** level (unrepresentable).
   - `Hypothesis`/`EvidenceCase` have **no** field for understanding, decision, recommendation, voice, warning, or athlete-state.
   - `attachEvidence` takes a **`Signal`**, so a `SignalRejection` is a **type error** — rejection cannot become evidence.
   - `falsifiers` is a **non-empty tuple** — an unfalsifiable hypothesis is a **compile error**.
3. **Construction control:** `EvidenceCase` has **no exported standalone constructor** — it can only come from `Hypothesis.attachEvidence`, so it cannot exist outside a hypothesis.
4. **Public surface:** `reasoning/index.ts` exports only hypothesis/evidence/lifecycle operations and types — no understanding/decision/recommendation/voice symbol.

[FACT] Plus, by construction: a `Hypothesis` is never marked fact/certain; contradictions are recorded cases (never dropped); falsified/retired hypotheses are preserved.

---

## 11. Application Service / Coordinator

[DECISION] A thin `reasoning-coordinator.ts` that **coordinates, never reasons**:
- `openHypothesis(input) → Hypothesis`
- `attachSignalAsEvidence({ hypothesis, signal, direction, reasoningNote, at }) → Hypothesis`
- `transitionHypothesis({ hypothesis, to, cause, at }) → Hypothesis`

[FACT] The coordinator only sequences calls; **all lifecycle/confidence/falsification invariants live in the `Hypothesis` aggregate**, not the service.

---

## 12. Persistence Decision

[DECISION] **Pure domain objects. No repository (unless a test wants a trivial in-memory one), no DB, no event bus.**
- **Why:** this slice validates the model and its negative capability; reasoning operates over Signals passed in and returns hypotheses. Persistence and eventing are deferred (a hypothesis store across time is what Spec 004/understanding will motivate).
- **Reversal Point:** add an append-only hypothesis store + lifecycle events when reasoning must persist across sessions or feed understanding.

[FACT] No tables, no message bus defined here.

---

## 13. Validation Strategy (tests before implementation)

[DECISION] **Negative + boundary + no-regression tests are defining.**

**Positive:**
- creates a **falsifiable** `Hypothesis`; an unfalsifiable one is **rejected/flagged** (compile-level tuple + runtime guard).
- attaches a `Signal` as `EvidenceCase` **inside** a `Hypothesis`; traceability `Signal → Observation → ObservationSet` preserved; quality/limitations preserved.
- each `EvidenceDirection` (`supports`/`weakens`/`contradicts`/`falsifies`/`contextualizes`) recorded and behaves per §6.
- supporting evidence **raises confidence without certainty**; contradictory evidence **stays visible**.
- a satisfied **declared falsifier** moves to `falsified`; falsified **remains traceable** and **not active support**.
- **retired** remains traceable and **not active support**.
- **promotion** is not certainty; **revision history** records every transition's cause.
- **source conflict** visible; **missing-data origin** traceable; **self-report wording** traceable (through Signal → SubjectiveObservation).

**Negative:**
- `SignalRejection` **cannot** become an `EvidenceCase` (type-level; a runtime test confirms no such path).
- No `UnderstandingProfile`/`DecisionSupportCase`/`VoiceMode`/`Recommendation`/`Warning`/`AthleteDecision` object is created or exported.
- No `EvidenceCase` constructible outside a `Hypothesis`; no `certain` confidence; no falsified hypothesis deleted; no contradiction dropped.

**Boundary:**
- `reasoning` **may** import `observation`.
- `observation` **must not** import `reasoning`.
- `reasoning` **must not** import `understanding`/`decision-support`.

**No-regression:**
- **all Implementation 001 + 002 tests continue to pass.**

---

## 14. Relationship To Implementation 002

[FACT] Implementation 003 **builds on, does not change,** Implementation 002:
- `Signal` is the **input** to reasoning; it **remains not-evidence** until attached to a `Hypothesis`.
- Signal **traceability** is preserved into the `EvidenceCase`; Signal **quality and salience** travel in.
- A `SignalRejection` **does not enter** a hypothesis as evidence (type-enforced).
- `observation` **remains upstream** and **must not know about reasoning**.

[DECISION] No edits to any existing file. The `reasoning` module is **entirely additive**; it imports the `observation` Signal surface read-only.

---

## 15. Open Questions (do not block implementation)

[QUESTION] Exact confidence representation (qualitative confirmed; re-derivation rule deferred) · exact promotion threshold ("sufficient challenge") · whether working-knowledge stays a lifecycle state or becomes a projection · falsifier representation depth · how much purpose context lives in a `Hypothesis` (a ref vs. richer) · how stale hypotheses decay (and if automatic) · whether an `EvidenceCase` may aggregate multiple `Signal`s (first impl: one Signal per case) · event names for lifecycle transitions · first concrete hypothesis type · compile-time vs. runtime enforcement depth · future public event surface.

[ASSUMPTION] None block building a falsifiable, revisable, traceable hypothesis with directional evidence that refuses certainty/understanding/decision.

---

## 16. Implementation Task Preview

[DECISION] The task that follows **once approved**:

> **Implementation 003 — Build Hypothesis aggregate, EvidenceCase, lifecycle transitions, and reasoning tests**

**Scope:** the new `reasoning` module (§2), the thin coordinator (§11), the full test suite (§13). Nothing else.

**Acceptance criteria (gate to "done"):**
- [ ] All §13 positive tests pass.
- [ ] All §13 negative tests pass — no certainty, no rejection-as-evidence, no EvidenceCase outside a Hypothesis, no understanding/decision/recommendation object.
- [ ] All §13 boundary tests pass — `reasoning`→`observation` allowed; `observation`⇏`reasoning`; `reasoning`⇏`understanding`/`decision-support`.
- [ ] Falsifiability enforced (compile-level non-empty tuple + runtime guard).
- [ ] Traceability `EvidenceCase → Signal → Observation → ObservationSet` holds; quality/conflict/self-report wording preserved.
- [ ] Falsified/retired preserved and excluded from active support; promotion non-certain; revision history complete.
- [ ] `typecheck` clean (strict) and `test` green, **including all Implementation 001 + 002 tests** (no regression).

**This task explicitly produces:**
- **no** `UnderstandingProfile`, **no** `DecisionSupportCase`, **no** `VoiceMode`, **no** `Recommendation`, **no** `Warning`, **no** `AthleteDecision`, **no** DB, **no** API, **no** UI.

[FACT] **Implementation does not begin until the user explicitly approves this tech spec.**

---

## Success Criterion

> **"Can Aurora turn something that may matter into evidence for a falsifiable claim without pretending it has found truth?"**

[ASSUMPTION] After this tech spec, an implementer can build the reasoning slice **without deciding any domain question in code**: the objects, fields, invariants, construction/direction/lifecycle/confidence/traceability rules, the enforcement layers (non-empty-falsifier tuple, Signal-not-Rejection type gate, EvidenceCase-only-via-Hypothesis, no-`certain` confidence, dependency boundaries), and the full negative + boundary + no-regression test suite are all specified. A Signal becomes evidence only inside a falsifiable, revisable claim; certainty, understanding, decision, and recommendation are all unrepresentable here. A claim is reasoned toward; truth is never declared.

---

## Known Risks

[ASSUMPTION]
- **Risk:** `EvidenceDirection` (vs claim) gets conflated with `Signal.direction` (vs context). **Defense:** §3 note; distinct types; tests assert both are recorded independently.
- **Risk:** a `certain` confidence sneaks in. **Defense:** the level union has no `certain` (unrepresentable) + negative test.
- **Risk:** `EvidenceCase` leaks a public constructor. **Defense:** §10.3 — only `Hypothesis.attachEvidence` creates one; surface test on `reasoning/index.ts`.
- **Risk:** parameter-property / native-strip pitfall recurs in the `Hypothesis` class. **Defense:** §0 — explicit field declarations.
- **Risk:** reasoning reaches toward understanding/decision for convenience. **Defense:** dependency-boundary test over the import graph.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical spec for Spec 003 and the plan for the first `reasoning` module. It defines the minimal implementation plan; it does not implement. Implementation awaits explicit approval.*

*Inputs: [Spec 003](./003-hypothesis-lifecycle.md) · [Spec 002](./002-signal-detection.md) · [Tech Spec 002A](./002-signal-detection-tech.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
