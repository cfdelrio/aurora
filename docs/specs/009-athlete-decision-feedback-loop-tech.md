# Tech Spec 009A — AthleteDecision Feedback Loop Implementation Plan

> The smallest TypeScript-strict plan for Spec 009 — an athlete-owned, append-only `AthleteDecision` slice inside the existing `athlete` module, re-entering reasoning **only as an `Observation`** through a neutral harness adapter — **without compliance/obedience scoring, without `decision-support` owning the decision, and without skipping the ladder**.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 009 — AthleteDecision Feedback Loop](./009-athlete-decision-feedback-loop.md) |
| **Builds on** | Implementations 001–008 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) |
| **New module** | **None.** The `AthleteDecision` slice extends the existing `athlete` module. |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided. This slice adds an athlete-owned record + neutral re-entry adapters in the harness. It replaces the `AthleteDecisionRef` placeholder's referent with a real, athlete-owned decision — **the decision re-enters via `observation`, never by a downstream module reaching into the athlete's record**.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement `AthleteDecision` as athlete-owned feedback that can re-enter the reasoning loop as `Observation`, while preserving agency and preventing obedience scoring, outcome-based validation, or direct understanding updates?*

[FACT] **Borders to guard:** the decision is the athlete's (referenced, never owned) · re-enters as `Observation`, never `Evidence` · outcome ≠ proof of support · no obedience/compliance score · `athlete` imports nothing downstream.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–008: no constructor parameter properties (explicit fields + private constructor + props + `toProps()` for aggregates; frozen value objects for the rest); `import type` + explicit `.ts` extensions; smart constructors; branded opaque ids; immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` in domain (timestamps passed in). No new dependencies; reuse `typecheck`/`test`/`check`.

---

## 1. Implementation Scope & Key Architectural Decision

[DECISION] **Implement `AthleteDecision` inside the existing `athlete` module as an athlete-owned, append-only record. No new top-level module; not inside `decision-support`; no feedback engine.**

- **Decision:** add an `AthleteDecision` slice to `athlete` — `AthleteDecision`, `AthleteDecisionId`, an athlete-local `AthleteDecisionRef`, `DecisionChoice`, `DecisionRationale`, `DecisionContext`, `DecisionOutcomeRef`, `DecisionReportSource`, and an append-only `AthleteDecisionRecord` (with amend/supersede). Cross-module re-entry (decision → `Observation`) is proven through a **neutral test-harness adapter**.
- **Why:** the decision belongs to the athlete (Athlete Aggregate — the *given*); `decision-support` may *reference* it but must not own it; `observation` is the correct re-entry point into the epistemic ladder.
- **Consequence:** Aurora gains a real decision referent **without** compliance tracking or direct reasoning/understanding updates.
- **Risk:** `athlete` grows beyond Purpose — acceptable only because `AthleteDecision` is a **declared/recorded athlete-owned fact**, not inferred state.
- **Reversal Point:** if interaction history grows enough to warrant its own bounded context, extract a future feedback/interaction module while preserving these references and boundaries.

[DECISION] **Allowed:** extend `athlete` with the `AthleteDecision` slice; append-only record behavior + amend/supersede; a neutral `__tests__` adapter representing an `AthleteDecision` as an `Observation`; integration tests proving `DecisionSupportCase` records only a ref, that the decision enters as `Observation` (not `Evidence`), and the negative-capability + boundary tests.

[FACT] **Forbidden:** new top-level `athlete-decision`/`feedback`/`interaction` module; `AthleteDecision` inside `decision-support`; compliance/obedience/noncompliance score; shame marker; automatic correctness/outcome judgement; automatic training-plan change; direct `EvidenceCase` from a decision; direct `UnderstandingProfile` update from a decision; UI; API; DB; persistence; event bus; LLM; notification delivery.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout untouched elsewhere. The slice extends `athlete` (a pure upstream leaf — imports only `shared-kernel`).

[DECISION]
```text
src/modules/athlete/
  domain/
    athlete-decision-id.ts        # AthleteDecisionId (branded) + newAthleteDecisionId()
    decision-choice.ts            # DecisionChoice (chosen action + optional alternatives + modification)
    decision-rationale.ts         # DecisionRationale (athlete-stated reasons)
    decision-context.ts           # DecisionContext (refs: case/opportunity/purpose-version; limitations)
    decision-outcome-ref.ts       # DecisionOutcomeRef (handle to a later, separate outcome observation)
    athlete-decision.ts           # AthleteDecision (value record) + AthleteDecisionRef (athlete-local) + DecisionReportSource
    athlete-decision-record.ts    # AthleteDecisionRecord (append-only; amend/supersede)
    index.ts                      # extend the public surface
  application/
    decision-coordinator.ts       # recordAthleteDecision / amendAthleteDecision (thin; imports only own domain)
  tests/
    athlete-decision.test.ts
    athlete-decision-negative-capability.test.ts
    (athlete-boundary.test.ts already asserts no downstream import — extended coverage if needed)
```
[DECISION] **Cross-module re-entry lives in the neutral harness** (`athlete` must not import `observation`):
```text
src/modules/__tests__/
  athlete-decision-feedback-loop.test.ts  # the integration test (decision -> Observation; case records only a ref)
  decision-observation-adapter.ts          # (test helper) AthleteDecision -> SubjectiveObservation; AthleteDecision -> decision-support AthleteDecisionRef
```
[DECISION] **Do NOT create** `src/modules/athlete-decision/`, `.../feedback/`, or `.../interaction/`. Default position: a thin athlete-owned slice.

---

## 3. Required Surface Gap Analysis

[FACT] Inspected against the current code. Gaps surfaced explicitly.

| # | Question | Finding |
|---|---|---|
| 1 | Shape of `decision-support` `AthleteDecisionRef`? | `{ decisionId: string, at: Timestamp, divergedFromSupport?: boolean }` — `decisionId` is a **plain string**; `divergedFromSupport` is a **neutral factual flag**, not a score. |
| 2 | How does `recordAthleteDecisionRef` behave? | `DecisionSupportCase.recordAthleteDecisionRef(ref)` returns a **new** case with `athleteDecisionRef` set; it stores a reference, mutates/owns nothing of the decision. |
| 3 | Does the case own/mutate the decision today? | **No.** It holds only the optional `AthleteDecisionRef`; `SupportQuality` is integrity-not-outcome. |
| 4 | Does `athlete` have an `AthleteDecision` concept? | **No.** Only the Purpose-first slice exists. **Gap → add it.** |
| 5 | What observation types can represent a reported decision? | `SubjectiveObservation` (`words` verbatim + `provenance` {source, captureTime, recordingTime, reference} + `quality`) and `MissingDataObservation`/`MeasuredObservation`. |
| 6 | New observation subtype needed, or does subjective suffice? | **Subjective suffices for the first slice.** A `SubjectiveObservation` carries the reported choice/rationale as `words`, source `athlete-report`, and the `AthleteDecision` id in `provenance.reference` (e.g. `"athlete-decision:<id>"`). **No `observation` change.** A specialized `DecisionReport`/`DecisionOutcome` observation type is **deferred**. |
| 7 | Can `AthleteDecisionRef` be shared without `athlete → decision-support`? | **Yes.** `athlete` defines its **own** `AthleteDecisionRef` (athlete-local); the harness builds the decision-support ref from `String(decision.id)` + `at` (+ optional diverged). Since `recordAthleteDecisionRef` takes a plain string, **no cross-import** is needed. |
| 8 | Any path letting a decision become `Evidence` directly? | **No.** `EvidenceCase` is created only by `Hypothesis.attachEvidence(signal)`; `createEvidenceCase` is unexported and a `Signal` (not a decision/observation) is required. The ladder is intact. |
| 9 | Any path letting a decision update `Understanding` directly? | **No.** `updateUnderstandingFromOutcome` takes a `ReasoningOutcome` built from a `Hypothesis`; a decision cannot reach it. |
| 10 | Surfaces sufficient for Impl 009? | `athlete` (new slice) + existing `observation.subjectiveObservation` + existing `decision-support.athleteDecisionRef`/`recordAthleteDecisionRef`. **Purely additive.** |
| 11 | What must NOT change? | `decision-support`, `observation`, `reasoning`, `understanding` source. The decision re-enters via existing surfaces + harness adapters. |

[ASSUMPTION] The key finding: **the ladder already forbids the dangerous shortcuts** (no decision→Evidence, no decision→Understanding), and the existing `SubjectiveObservation` + string-keyed `AthleteDecisionRef` make the re-entry additive with **zero downstream edits**.

---

## 4. Domain Objects

[DECISION] Implementation-level objects (no DB schema, no over-modeling).

| Object | Responsibility | Required fields (conceptual) | Invariant | Must not |
|---|---|---|---|---|
| `AthleteDecisionId` | Opaque decision identity | branded string | unique, never parsed | encode attributes |
| `DecisionChoice` | What the athlete chose | `action`, `alternatives?`, `modification?` (free text) | a non-empty chosen action | carry a binary followed/not-followed flag |
| `DecisionRationale` | The athlete's stated reasons | `statements: string[]` (preference/risk/fatigue/purpose/emotion/constraint/uncertainty/disagreement) | athlete-sourced; may be empty (unreported) | be treated as final truth; carry a score |
| `DecisionContext` | Where the decision sits | `decisionSupportCaseRef?`, `decisionOpportunityRef?`, `purposeVersionRef?` (all string handles), `limitations?` | references only (no embedded downstream state) | import/own a `DecisionSupportCase` |
| `DecisionReportSource` | Where the report came from | `"athlete-declared" \| "athlete-reported"` | athlete source only | include `inferred`/`system` |
| `DecisionOutcomeRef` | Handle to a later, separate outcome | `outcomeObservationRef: string`, `at` | references a *separate, later* observation | embed the outcome; imply it grades support |
| `AthleteDecision` | One athlete-owned decision record (value) | `id`, `athleteRef`, `choice`, `rationale`, `context`, `source`, `at`, `reportConfidence?`, `divergedFromSupport?`, `outcomeRefs?` | athlete-owned; well-formed choice; source athlete-only | hold compliance/obedience/reward/moral/correctness/inferred-state |
| `AthleteDecisionRef` *(athlete-local)* | Reference to a decision | `decisionId: string`, `at`, `divergedFromSupport?` | reference only, never ownership | imply the case owns the decision |
| `AthleteDecisionRecord` | Append-only collection per athlete | ordered `AthleteDecision[]` + amendments | append-only; corrections amend/supersede, never overwrite | delete/overwrite a recorded decision |
| `AthleteDecisionAmendment` *(optional)* | A correction/addition to a prior decision | `supersedesId`, new `AthleteDecision`, `reason`, `at` | references the superseded; original retained | erase the original |

[FACT] `divergedFromSupport?` mirrors the existing decision-support flag: **neutral metadata** (the athlete chose differently than framed), valence-free, feeding no reward.

---

## 5. AthleteDecision Construction & Lifecycle Rules

[DECISION]
- `AthleteDecision` is **athlete-owned**. It may reference athlete id, a `DecisionSupportCase` ref, a `DecisionOpportunity` ref, a `PurposeVersionRef`, the chosen action, alternatives (if known), rationale (if reported), decision time, source, report confidence/uncertainty, and context limitations.
- It must **not** include a compliance/obedience/noncompliance score, a moral judgement, automatic correctness, a hidden reward, or inferred athlete state.
- It is **append-only** once recorded; corrections **amend or supersede**, never overwrite (mirrors `PurposeHistory` and observation supersession).
- **Not following Aurora is not failure; following is not obedience success.** A modified decision is **first-class**, captured as `choice.modification`, never collapsed to binary compliance.
- Construction requires a **well-formed `DecisionChoice`** (non-empty action) and an **athlete source** (runtime guard, mirroring `Purpose`).

---

## 6. AthleteDecisionRef Rules

[DECISION]
- A ref **identifies the decision without implying ownership**.
- `DecisionSupportCase` may record an `AthleteDecisionRef`; it must **not** own or mutate the `AthleteDecision`.
- **`athlete` must not import `decision-support`** to make a ref.
- **Recommendation (resolving the mission's choice):** define an **athlete-local `AthleteDecisionRef`** (shape-compatible with decision-support's `{ decisionId, at, divergedFromSupport? }`). The **harness** converts a `String(decision.id)` into the decision-support ref via the existing `athleteDecisionRef(decisionId, at, diverged?)` and passes it to `recordAthleteDecisionRef`. Integration tests prove the athlete value can drive the existing case API **with no cross-module import**.

---

## 7. DecisionRationale Rules

[DECISION] Rationale is **athlete-reported context**: it may contain disagreement with Aurora, purpose conflict, risk concern, external constraint, fatigue concern, preference, uncertainty. It **is not truth by itself**; it **may become `Observation`** (via the harness adapter), **must not become `Evidence` directly**, **must not overwrite `Purpose` directly**, and **must not create shame/compliance markers**.

---

## 8. DecisionOutcome Rules

[DECISION] An outcome is **later than** and **separate from** the decision; **"no outcome" is a valid state**; it may be **represented as an `Observation`**; it **does not prove support correct/incorrect by itself**; it may later support/weaken hypotheses **only through an `EvidenceCase`**.

[DECISION] **For Implementation 009: implement only `DecisionOutcomeRef`** (a handle to a separate, later outcome observation) — **do not** implement a full `DecisionOutcome` object. Prove separation (decision ≠ outcome; outcome optional/absent) via tests.

---

## 9. Re-Entry To Observation

[DECISION] The first technical re-entry path:
- An `AthleteDecision` may be **represented for future reasoning as an `Observation`** — specifically a **`SubjectiveObservation`** built by the **neutral harness adapter** (`athlete` must not import `observation`).
- The `Observation` preserves: the decision id/ref (in `provenance.reference`, e.g. `"athlete-decision:<id>"`), decision time (`captureTime`), the reported choice + rationale (in `words`), the source (`athlete-report`), an explicit `quality`, and the relation to the support case if known (also encoded in the reference/words).
- **The result is `Observation` — not `Signal`, not `Evidence`.** Signal detection and reasoning happen later through the existing modules.

[FACT] **No direct `AthleteDecision → EvidenceCase`; no direct `AthleteDecision → UnderstandingProfile`.** Both are already impossible on the public surfaces (§3 Q8/Q9); the adapter only produces an `Observation`.

---

## 10. SupportQuality Review

[DECISION] `SupportQuality` **stays inside `decision-support`** and evaluates **integrity at the time of support**. An `AthleteDecision`/outcome **may trigger a review but does not decide its result alone**; a **good outcome does not mark support correct**, a **bad outcome does not mark it incorrect**; **no automatic score**, **no athlete judgement**. [DECISION] Implementation 009 **only tests the existing `SupportQuality` boundary** (it is already integrity-not-outcome) — no additive value unless a real blocker appears.

---

## 11. Decision Pattern Rules

[DECISION] Repeated decisions may become observations/signals, but a **pattern must become a falsifiable `Hypothesis` before `Understanding` changes** — **no fixed athlete label, no personality tag, no compliance profile, no direct `UnderstandingProfile` update**. [DECISION] Implementation 009 **does not implement a pattern engine**; it only **guards the path** (a negative test that a decision cannot reach `Understanding` without a hypothesis).

---

## 12. Purpose Interaction

[DECISION] Decision behavior **may suggest a mismatch** with declared purpose but **must not overwrite `Purpose`**; a purpose change **still requires athlete declaration/acceptance** (Spec 007); rationale may create an `Inquiry` or a future hypothesis about the mismatch; a `PurposeVersionRef` **may be recorded on the `AthleteDecision`** for historical context. [DECISION] Implementation 009 **includes a negative test** preventing purpose overwrite from decision behavior.

---

## 13. Negative Capability — what must remain impossible

[DECISION] Enforced by types + tests:

| Must remain impossible | How |
|---|---|
| `DecisionSupportCase` owning `AthleteDecision` | the case holds only `AthleteDecisionRef`; the record lives in `athlete`; integration test |
| `AthleteDecision` stored inside `decision-support` | it is defined in `athlete`; boundary/structure test |
| `AthleteDecision` → `Evidence` directly | only `Hypothesis.attachEvidence(Signal)` makes evidence; the adapter yields an `Observation` only |
| `AthleteDecision` → `Understanding` directly | `updateUnderstandingFromOutcome` takes a `ReasoningOutcome`; no decision path |
| Outcome marking support correct/incorrect | `SupportQuality` is integrity-at-the-time; negative test that outcome doesn't set it |
| Obedience/noncompliance score; shame marker | no such field exists on `AthleteDecision`; negative test scans the surface |
| Modified decision collapsed to binary compliance | `choice.modification` is free-form; no boolean compliance field |
| Rationale overwritten/ignored, or overwriting `Purpose` | rationale retained on the record; no purpose-write path from `athlete` decision code |
| `athlete` importing `decision-support`/`observation`/`reasoning`/`understanding` | `athlete-boundary` test over the import graph |
| UI/API/DB/persistence/event-bus/LLM/training-plan | none created; structural guard |

---

## 14. Validation Strategy (the gate)

[ASSUMPTION] Tests to the acceptance criteria; **negative + boundary tests are defining.**

**Positive / integration:**
- records an `AthleteDecision` **separately** from `DecisionSupportCase`; the case records **only** an `AthleteDecisionRef`;
- preserves chosen action, rationale, and a **modified** choice without binary compliance;
- marks **neutral divergence** (`divergedFromSupport`) without scoring;
- append-only / amend-supersede (the original remains after a correction);
- `DecisionOutcomeRef` is **separate** from the `AthleteDecision`; "no outcome" is representable;
- the decision **converts to an `Observation`** through the neutral adapter — an `Observation`, **not** `Signal`/`Evidence`.

**Negative (must prove absence):**
- no obedience / noncompliance / shame / reward score anywhere on `AthleteDecision`;
- good/bad outcome **does not** set `SupportQuality`;
- a decision **cannot** update `UnderstandingProfile` directly; a pattern needs a `Hypothesis` first;
- rationale/behavior **cannot** overwrite declared `Purpose`;
- `DecisionSupportCase` never owns/mutates the decision;
- no UI/API/DB/event-bus/training-plan artifact.

**Dependency-boundary:**
- `athlete` imports **only `shared-kernel`** (still true after the slice); no `observation`/`reasoning`/`understanding`/`decision-support` import;
- existing boundaries stay green; **all Implementation 001–008 tests continue to pass.**

**Gate before commit:** `typecheck` strict clean · full suite green incl. new tests · no new top-level module · no UI/API/DB/LLM/event-bus/persistence file · `git status` clean except intended additions.

---

## 15. Relationship To Existing Core

[FACT] Implementation 009 builds on, and does not redefine, the core:
- `decision-support` already references `AthleteDecisionRef` but does not own the decision;
- `athlete` owns declared `Purpose` and can now own athlete-declared/recorded **decisions** (still the *given*, never inferred);
- `observation` is the **re-entry point** for future learning (a decision becomes a `SubjectiveObservation`);
- `reasoning` learns only from `EvidenceCase` inside a `Hypothesis`;
- `understanding` updates only from reasoning outcomes;
- projection freshness (Impl 008) may later react to decision/outcome observations (a `RefreshTrigger`), only toward caution;
- `SupportQuality` remains integrity-at-the-time.

[DECISION] No edits to 001–008 source. The slice + adapters are additive.

---

## 16. Open Questions (do not block implementation)

[QUESTION] whether `AthleteDecision` stays in `athlete` or moves to a feedback/interaction context later; whether `DecisionOutcome` becomes a specialized `Observation` type; how decision/outcome histories persist; how UI collects rationale without biasing the athlete; how to distinguish intended vs. completed action; how repeated decisions influence understanding safely; how to avoid behavioral labeling; whether decision feedback becomes a domain event.

[ASSUMPTION] None blocks the slice: Aurora can record an athlete-owned, append-only decision, keep outcome separate, re-enter only via `observation`, and learn only via the ladder — regardless of how these resolve.

---

## 17. Implementation Task Preview

[DECISION] **Implementation 009 — Build AthleteDecision record and neutral Observation re-entry adapter.**

**Scope:** add the `AthleteDecision` slice to `athlete/domain` (+ thin coordinator); add the neutral harness adapter + integration tests; consume existing `observation`/`decision-support` surfaces read-only.

**Acceptance criteria:**
- an athlete-owned, append-only `AthleteDecision` (choice + rationale + context + source + time) with amend/supersede;
- `DecisionSupportCase` records only an `AthleteDecisionRef` (decision lives in `athlete`);
- the decision converts to a `SubjectiveObservation` via the neutral adapter — `Observation`, not `Signal`/`Evidence`;
- `DecisionOutcomeRef` separate from the decision; "no outcome" valid; outcome never grades `SupportQuality`;
- no obedience/compliance/shame score; following ≠ success, not-following ≠ failure; modification first-class;
- a decision cannot update `Understanding` directly; a pattern needs a hypothesis; purpose is never overwritten;
- the validation gate (§14) passes; all 001–008 tests stay green.

**The preview explicitly states this slice introduces:**
- **no** compliance tracking · **no** obedience score · **no** outcome-based validation · **no** direct `Evidence` · **no** direct `Understanding` update · **no** UI · **no** API · **no** DB · **no** event bus · **no** LLM · **no** training-plan generation.

---

## 18. Technical Constraints

[FACT] TypeScript strict · Node native test runner (`node:test` + `node:assert/strict`) · no external test framework · no framework · no DB · no event bus · no LLM. No constructor parameter properties. `import type` where appropriate; explicit `.ts` extensions; explicit field declarations; pure domain objects (frozen value objects; append-only record immutable-by-operation).

---

## 19. Success Criteria

[ASSUMPTION] After this tech spec, Implementation 009 can be written **without deciding any new domain question in code** — the objects, lifecycle, ref strategy, re-entry adapter, and the (zero-change) downstream integration are specified, and the ladder already forbids the dangerous shortcuts. The future implementation answers:

> **"Can the athlete's decision return to Aurora as learning material without becoming obedience tracking or proof that Aurora was right?"**

Provable: an athlete-owned, append-only `AthleteDecision` (choice, rationale, context, source) is **referenced — never owned** — by the `DecisionSupportCase`; it re-enters reasoning **only as a `SubjectiveObservation`** via a neutral adapter; a later `DecisionOutcomeRef` stays separate and never grades `SupportQuality`; following/not-following/ modifying carry **no score**; and a decision can reach `Understanding` **only through the ladder** (Observation → Signal → Evidence → Hypothesis) — with `athlete` importing nothing downstream and declared `Purpose` never overwritten.

---

*This is the ninth Technical Specification. It translates Spec 009 into a thin athlete-owned `AthleteDecision` slice plus neutral re-entry adapters, consuming existing downstream surfaces read-only; it defers a full `DecisionOutcome` object, a pattern engine, a feedback/interaction bounded context, persistence, events, and UI to later specs.*

*Inputs: [Spec 009](./009-athlete-decision-feedback-loop.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
