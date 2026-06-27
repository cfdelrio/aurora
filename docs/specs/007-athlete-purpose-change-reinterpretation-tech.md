# Tech Spec 007A — Athlete Purpose Change & Reinterpretation Implementation Plan

> The smallest TypeScript-strict plan for Spec 007 — a thin, **Purpose-first** `athlete` module (declared, versioned purpose + append-only history + `PurposeChanged`), consumed by `decision-support` and `understanding` through neutral adapters, **without inferred state, without rewriting reasoning, and without `athlete` ever importing a downstream module**.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 007 — Athlete Purpose Change & Reinterpretation](./007-athlete-purpose-change-reinterpretation.md) |
| **Builds on** | Implementations 001–006 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) |
| **New module** | **`athlete`** (Purpose-only slice; upstream leaf — read by `reasoning`/`understanding`/`decision-support`, imports none of them) |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided and in use. This slice adds **one new, thin module** plus neutral adapters in the harness layer. It introduces the first real *given* context (purpose) and begins retiring the `decision-support` purpose placeholder.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement declared Purpose as versioned, Athlete-owned context so future reasoning and decision-support use the current purpose, while prior reasoning remains historically traceable to the purpose version under which it occurred?*

[FACT] **Borders to guard:** `athlete` is the *given*, never the *inferred* (no state/capacity/readiness) · `athlete ⇏ understanding/reasoning/decision-support` · declared purpose ≠ revealed behavior · purpose history is append-only · `PurposeChanged` never rewrites the past.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–006: no constructor parameter properties (native type-strip can't transform them) — explicit field declarations + private constructor + props object + `toProps()`; `import type` + explicit `.ts` extensions; frozen value objects; smart constructors; branded opaque ids (`declare const brand: unique symbol`); aggregates immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`; conditional spreads for `exactOptionalPropertyTypes`. No new dependencies; reuse the `typecheck` / `test` / `check` scripts.

---

## 1. Implementation Scope & Key Architectural Decision

[DECISION] **Implement a thin first `athlete` module focused on Purpose only.**
- **Decision:** create a new top-level `athlete` module with a minimal Athlete/Purpose slice — `AthleteId`, a thin `Athlete` root owning a `PurposeHistory` of immutable `PurposeVersion`s, `Purpose`, `PurposeVersionRef`, `PurposeChanged`, `PurposeChangeReason`, `PurposeSource`, `PurposeStatus`. Plus neutral adapters (in the harness layer) that convert current purpose → decision-support `PurposeContext`, and a `PurposeChanged` → selective `markUnderstandingStale` call.
- **Why:** purpose belongs to `Athlete` (Athlete Aggregate, Decisions 3–4) and must become a real source of context before `decision-support` can stop relying on its placeholder. The other six Athlete dimensions (state, capacity, constraints, path-dependent memory, identity detail, reports) have different sources of truth and are not needed to prove purpose-change behavior.
- **Consequence:** Aurora gains declared, versioned purpose and the purpose-change loop *without* implementing any inferred athlete state — the most dangerous reduction (Athlete Aggregate, Final Reflection) is never introduced.
- **Risk:** the first `athlete` module may feel too thin (only purpose).
- **Reversal Point:** when constraints, path-dependent memory, accepted declarations, or projected state/capacity need implementation, expand the `Athlete` aggregate per `ATHLETE_AGGREGATE.md` (the thin root is designed to grow).

[DECISION] **Allowed:** the new `athlete` module; a thin `Athlete` root (or purpose-owned root) as justified below; `AthleteId`, `Purpose`, `PurposeVersion`, `PurposeVersionRef`, `PurposeHistory`, `PurposeChanged`, `PurposeChangeReason`, `PurposeSource`, `PurposeStatus`, `DeclaredPurpose`; the declared-vs-revealed distinction; a neutral helper exposing current purpose as `PurposeContext`; a neutral helper applying `PurposeChanged` → `markUnderstandingStale`; tests (positive, negative, boundary).

[FACT] **Forbidden:** inferred athlete state; readiness; capacity; fatigue; performance profile; `UnderstandingProfile` ownership; `DecisionSupport` ownership; automatic purpose inference; UI; API; DB; event bus; LLM output; training-plan generation.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout untouched: `src/shared-kernel/*`, `src/modules/{observation,reasoning,understanding,decision-support}/**`, `src/modules/__tests__/*`.

[DECISION] **New, additive `athlete` module — pure upstream leaf (imports only `shared-kernel`):**
```text
src/modules/athlete/
  domain/
    ids.ts                 # AthleteId, PurposeVersionId (branded) + new*() ; PurposeVersionRef
    purpose.ts             # Purpose, DeclaredPurpose, PurposeStatus, PurposeSource, PurposeChangeReason
    purpose-version.ts     # PurposeVersion (immutable) + purposeVersionRefOf()
    purpose-changed.ts     # PurposeChanged (domain outcome value)
    athlete.ts             # Athlete (thin aggregate root): id + identityRef + PurposeHistory; declarePurpose / changePurpose
    reinterpretation.ts    # PurposeReinterpretationStatus + PurposeReinterpretationResult (TYPES + tiny ctor only; no pipeline)
    index.ts               # public surface
  application/             # may import ONLY shared-kernel (no downstream) — coordinators over the aggregate
    purpose-coordinator.ts # declarePurpose / changePurpose thin coordinators (optional; aggregate may suffice)
  tests/
    purpose-history.test.ts
    purpose-changed.test.ts
    declared-vs-revealed.test.ts
    athlete-boundary.test.ts
    negative-capability.test.ts
```

[DECISION] **The cross-module adapters do NOT live in `athlete`.** Converting purpose → `PurposeContext` requires the `decision-support` type; applying staleness requires the `understanding` surface. If those lived in `athlete`, it would import downstream — forbidden (Boundary Map §2). So, following the Impl 006 precedent (seam = test harness, no production service yet), they live in the **neutral cross-module test root**:
```text
src/modules/__tests__/
  purpose-integration.test.ts        # the integration test for UC6/UC8 + staleness wiring
  purpose-adapters.ts                # (test helper, not a .test file) currentPurpose -> PurposeContext;
                                     #   applyPurposeChangeToUnderstanding(...) -> markUnderstandingStale
```
- **Why here:** `__tests__` already imports multiple module surfaces and belongs to no module. The adapters are *coordination*, not domain reasoning (Boundary Map §9). When a real production application/entrypoint is specified, they graduate into it (reversal point inherited from 006A §1).
- **`athlete` exposes a neutral descriptor** (`currentPurposeView()` → `{ status, statement? }`) so the adapter can map to `PurposeContext` without `athlete` knowing the decision-support vocabulary.

[QUESTION] Whether a tiny production `application` orchestration module should exist instead of the harness adapters — deferred; the harness keeps this slice honest about "no production entrypoint yet."

---

## 3. Required Surface Gap Analysis

[FACT] Inspected against the current code. Gaps surfaced explicitly — none decided silently.

| # | Question | Finding |
|---|---|---|
| 1 | How does `decision-support` currently receive purpose? | As a value on `OpenCaseInput.purpose: PurposeContext`, passed into `DecisionSupportCase.open(...)`. It is **already an injected input** — the seam exists. |
| 2 | What shape does `purposeContext(status, purpose?)` expect? | `purposeContext(status: "declared"\|"unknown"\|"ambiguous", purpose?)` → `PurposeContext { status, purpose? }`; **`declared` requires a non-empty `purpose`**. |
| 3 | How does `purposeGate` behave for current/missing/ambiguous? | `declared` → `pass`; `unknown` → `needs-inquiry`; `ambiguous` → `needs-inquiry`. In `VoiceSelectionPolicy`, `needs-inquiry` is a hard stop → `Inquiry`. **No change needed.** |
| 4 | How does `understanding.markUnderstandingStale` accept `purpose-change`? | `markUnderstandingStale({ profile, dimensionKey, reason, at })`; `StaleReason` **already includes `"purpose-change"`**; it is **selective per `dimensionKey`** and **throws on an unknown dimension**; staleness lowers the `SafeVoiceCeiling` via the assessment. **No change needed.** |
| 5 | Does `reasoning.Hypothesis` reference a purpose version? | **Yes, already** — `OpenHypothesisInput.purposeContextRef?: string` and `Hypothesis.purposeContextRef` exist. A `PurposeVersionRef` (string handle) can be passed in **with no reasoning refactor**. |
| 6 | Is a `PurposeVersionRef` needed now, or only later? | **Introduce it now** in `athlete` (an opaque string handle). Reasoning can *adopt* it today via the existing `purposeContextRef` slot; making reasoning *version-aware* (reinterpretation over past hypotheses) is a later spec. |
| 7 | What current surfaces are sufficient for Implementation 007? | `purposeContext`, `purposeGate`, `markUnderstandingStale`, and `Hypothesis.purposeContextRef` — **all already present**. Impl 007 is **purely additive**: a new `athlete` module + harness adapters. |
| 8 | What current surfaces must NOT change yet? | `decision-support`, `understanding`, `reasoning`, `observation` source — all consumed **read-only**. No edits to 001–006 modules. |

[ASSUMPTION] The single most useful finding: **the downstream seams already exist** (`PurposeContext` is injected, `"purpose-change"` staleness is selective, `Hypothesis.purposeContextRef` is present). So this slice adds the *source* of purpose, not new plumbing in the consumers.

---

## 4. Domain Objects

[DECISION] Implementation-level objects (no DB schema, no over-modeling).

| Object | Responsibility | Required fields (conceptual) | Invariant | Must not |
|---|---|---|---|---|
| `AthleteId` | Opaque athlete identity handle | branded string | unique, never parsed for meaning | encode any attribute |
| `Athlete` | Thin aggregate root over the *given* (this slice: purpose only) | `id`, `identityRef` (string), `purposeHistory` | always has a `PurposeHistory` (possibly with an explicit "unknown" current); immutable-by-operation | own inferred state/capacity/understanding/decisions |
| `Purpose` | The current declared orientation | `statement`, `status`, `source`, `effectiveAt`, `rationale?`, `ambiguityNote?` | a `declared` purpose has a non-empty statement; `unknown`/`ambiguous` are first-class | hold readiness/capacity/state or a system objective |
| `PurposeStatus` | Declared / unknown / ambiguous | `"declared" \| "unknown" \| "ambiguous"` | mirrors decision-support `PurposeStatus` vocabulary | add a fourth silent state |
| `PurposeSource` | Where the purpose came from | `"athlete-declared" \| "athlete-accepted"` (this slice) | a purpose only exists if declared or accepted by the athlete | include `inferred` / `system` |
| `PurposeChangeReason` | Why purpose changed (if known) | `"new-goal" \| "injury" \| "life-change" \| "exploration" \| "clarification" \| "unspecified"` | optional, never required | imply Aurora chose the change |
| `PurposeVersion` | One immutable entry in the timeline | `id` (`PurposeVersionId`), `purpose`, `version` (n), `effectiveAt`, `source`, `reason?`, `supersedesRef?` | immutable; `version` strictly increasing; references the prior version it supersedes | be edited after creation |
| `PurposeVersionRef` | Stable handle to a `PurposeVersion` | branded/opaque string from a version id | resolvable to a past version | be a copy of the purpose value |
| `PurposeHistory` | Append-only sequence of versions | ordered `PurposeVersion[]` | append-only; never overwrite/delete as normal behavior; current = latest active | drop or reorder a substantive change |
| `PurposeChanged` | Domain outcome of a change | `previousRef`, `newRef`, `previous`, `next`, `at`, `source`, `reason?` | records prior + new versions and time | rewrite reasoning, falsify hypotheses, infer state, or recommend |
| `DeclaredPurpose` | The athlete-sourced declaration input | `statement`, `source`, `effectiveAt`, `rationale?` | requires a non-empty statement + an athlete source | originate from behavior/inference |
| `PurposeReinterpretationResult` *(type + tiny ctor only)* | The first representation of a reinterpretation verdict | `hypothesisRef`, `fromPurposeRef`, `toPurposeRef`, `status`, `note?` | references the hypothesis + both purpose versions; never mutates the hypothesis | run any pipeline this slice (status placeholder only — §6) |
| `RevealedPurposeSignal` *(optional placeholder)* | Marks a possible declared-vs-revealed mismatch | `note`, `at` | is *evidence/inquiry material*, not a purpose | ever become a `PurposeVersion` automatically |

[ASSUMPTION] `Athlete` is the root (per Athlete Aggregate Decision 1), even though it owns only purpose now — so the thin root can grow later without relocating purpose. `identityRef` is a plain string placeholder; full `AthleteIdentity` is out of scope.

---

## 5. Construction & History Rules

### 5.1 Purpose construction
[DECISION] To create a `Purpose`: the statement is **declared by or accepted by the athlete**; it carries a **version**, an **effective time**, and a **source**; it may carry a **rationale** and **uncertainty/ambiguity**; it may be **current, ambiguous, or absent**. It must **not** contain inferred state, capacity, or readiness. A `declared` status requires a non-empty statement (mirrors `purposeContext`).

### 5.2 PurposeHistory (append-only)
[DECISION] The initial purpose creates the **first version**. A change **appends** a new version; previous versions remain traceable; **no overwrite, no deletion** as normal behavior. The **current purpose is derived from the latest active version**. Historical queries can reference prior versions (by `PurposeVersionRef`). A change **returns a `PurposeChanged`** domain outcome. (No event bus — `PurposeChanged` is a value returned from the aggregate operation.)

### 5.3 PurposeChanged
[DECISION] A `PurposeChanged` **records** the previous version, the new version, the time, the source, and the reason if known. It **does not** rewrite prior reasoning, auto-falsify hypotheses, infer state, or generate a recommendation. It **may be consumed later** to mark understanding stale and by the decision-support purpose gate.

---

## 6. Purpose Reinterpretation (first representation only)

[DECISION] **This slice does not implement a reinterpretation pipeline.** It implements purpose versioning + the `PurposeChanged` outcome, and provides `PurposeReinterpretationStatus` + a tiny `PurposeReinterpretationResult` **value type** (constructor + validation only) so future work has a stable shape to populate.

[DECISION] Statuses defined now (as a type): `unchanged` · `limited` · `stale` · `needs-new-hypothesis` · `needs-inquiry` · `not-relevant-under-current-purpose`. A `PurposeReinterpretationResult` **references** the hypothesis and both purpose versions and is **never** produced by mutating a hypothesis.

[ASSUMPTION] Clarification the mission asks for: **implement the statuses as a type + value constructor now; do NOT implement the engine that decides them.** Deciding *which* status a given hypothesis gets under a new purpose (and how deep to walk) is deferred to a later spec — it depends on reasoning becoming version-aware (§9).

---

## 7. Decision-Support Integration

[DECISION] How current purpose becomes decision-support input, without coupling:
- `athlete` **does not import `decision-support`.**
- The harness adapter (`purpose-adapters.ts`) reads `athlete.currentPurposeView()` → `{ status, statement? }` and builds a `PurposeContext` via the existing `purposeContext(...)`:
  - **missing/absent** purpose → `purposeContext("unknown")`;
  - **ambiguous** purpose → `purposeContext("ambiguous")`;
  - **current declared** purpose → `purposeContext("declared", statement)`.
- `DecisionSupportCase` still **owns gate evaluation**; the `PurposeGate` already turns `unknown`/`ambiguous` into `Inquiry`. The `athlete` module never chooses a `VoiceMode`.

[FACT] **No change to `decision-support`** is required — its purpose input is already injected and its gate already handles all three statuses (§3).

---

## 8. Understanding Integration

[DECISION] How `PurposeChanged` affects understanding, without coupling:
- `athlete` **does not import `understanding`.**
- The harness adapter applies a `PurposeChanged` by calling `markUnderstandingStale({ profile, dimensionKey, reason: "purpose-change", at })` **for the affected dimension(s) only** — staleness is **selective, not global by default**.
- `UnderstandingProfile` **owns** the staleness state; `PurposeChanged` **does not mutate it directly**. A purpose change may lower the `SafeVoiceCeiling` **indirectly**, through staleness.

[FACT] **No change to `understanding`** is required — `markUnderstandingStale` + `StaleReason: "purpose-change"` already exist and are per-dimension (§3). Determining *which* dimensions are affected is the adapter's input for this slice (passed in), not an inference engine (deferred — §11).

---

## 9. Reasoning Integration

[DECISION] How a purpose version relates to a hypothesis:
- Prior reasoning **remains traceable to the purpose version under which it occurred** via the existing `Hypothesis.purposeContextRef: string` slot — a `PurposeVersionRef` can be passed there at `openHypothesis` time. **No reasoning refactor in this slice.**
- Existing hypotheses are **not rewritten**; no reasoning behavior changes.
- A purpose change does **not** force any reasoning transition.

[QUESTION] Whether `purposeContextRef` should become a typed `PurposeVersionRef` (vs. plain string) is a **future reasoning spec** — flagged, not forced. For now it stays a string handle; `athlete` produces the handle, reasoning stores it opaquely.

---

## 10. Declared vs Revealed Purpose (guardrails)

[DECISION] Technical guardrails:
- declared purpose is **authoritative** athlete-owned context;
- behavior may indicate a **mismatch** but must **not** silently replace declared purpose;
- any revealed-purpose signal becomes an **`Inquiry` or a hypothesis elsewhere**, never a purpose overwrite;
- **automatic purpose inference is forbidden.**

[DECISION] Enforcement: the only ways to create/append a `PurposeVersion` require an **athlete `PurposeSource`** (`athlete-declared`/`athlete-accepted`). A `RevealedPurposeSignal` carries **no** path to `changePurpose`. A **negative test** proves a revealed-behavior value cannot be passed where a declaration is required (type-level), and that no API accepts an `inferred`/`system` source.

---

## 11. Negative Capability — what must remain impossible

[DECISION] The implementation (and the unchanged downstream surfaces) must keep these unrepresentable or test-failing:

| Must remain impossible | How |
|---|---|
| Overwriting purpose history | `PurposeHistory` is append-only; `Athlete` is immutable-by-operation; no setter on a `PurposeVersion` |
| Deleting prior versions as normal update | no delete operation on the public surface |
| Rewriting prior reasoning on purpose change | `athlete` cannot import/mutate `reasoning`; `PurposeChanged` carries no hypothesis mutation |
| `PurposeChanged` directly mutating `UnderstandingProfile` | `athlete ⇏ understanding`; staleness applied only by the harness adapter via the owning module |
| `Athlete` importing `reasoning`/`understanding`/`decision-support`/`observation` | dependency-boundary test over the import graph |
| `Athlete` owning inferred state/capacity | no such field; negative test asserts the surface exposes no readiness/capacity/state symbol |
| Automatic purpose inference from behavior | only athlete-sourced declarations create versions; `RevealedPurposeSignal` has no change path |
| Revealed behavior replacing declared purpose | type-level: `changePurpose` requires a `DeclaredPurpose` with an athlete source |
| `Recommendation` without current-purpose alignment | unchanged `purposeGate` + the decision-support Recommendation guard; integration test |
| Global understanding reset after a purpose change | adapter marks only named dimension(s); test asserts unaffected dimensions untouched |
| UI/API/DB/LLM/training-plan behavior | no such files; structural guard in tests |

---

## 12. Validation Strategy (the gate)

[ASSUMPTION] Tests written to the acceptance criteria; **negative + boundary tests are defining.**

**Positive:**
- creates an initial `Purpose` version; appends a version on change; preserves the previous version; exposes the current purpose;
- returns/records a `PurposeChanged` referencing previous **and** new versions; no overwrite of `PurposeHistory`;
- `currentPurposeView()` maps to `purposeContext`: missing → `unknown`, ambiguous → `ambiguous`, declared → `declared(statement)`;
- a `PurposeChanged` drives the harness adapter to `markUnderstandingStale("purpose-change")` for an affected dimension; selective (unaffected dimension untouched);
- integration: a `DecisionSupportCase` opened with a missing/ambiguous purpose context yields `Inquiry`/`Withholding`; with a current declared purpose + stale understanding, voice is constrained (no Recommendation unless confident+complete+aligned).

**Negative (must prove absence):**
- no inferred state/capacity/readiness on `Athlete`/`Purpose`;
- declared purpose cannot be replaced by revealed behavior; no `inferred`/`system` source;
- `PurposeChanged` does not mutate `UnderstandingProfile` directly;
- no global understanding reset;
- no UI/API/DB/LLM/training-plan artifact.

**Dependency-boundary:**
- `athlete` imports **only** `shared-kernel` (no `reasoning`/`understanding`/`decision-support`/`observation`) — checked over the import graph;
- existing `observation`/`reasoning`/`understanding ⇏ decision-support` boundary tests stay green;
- **all Implementation 001–006 tests continue to pass.**

**Gate before commit:** `typecheck` strict clean · full suite green incl. new tests · no forbidden top-level module beyond `athlete` · no UI/API/DB/LLM/event-bus file · `git status` clean except intended additions.

---

## 13. Relationship To Existing Core

[FACT] Implementation 007 builds on, and does not redefine, the core:
- `Purpose` **replaces the decision-support placeholder source over time** — decision-support still evaluates the `PurposeGate`;
- `understanding` still **owns** staleness; `athlete` only supplies the trigger via the adapter;
- `reasoning` may carry a `PurposeVersionRef` via its existing `purposeContextRef` slot; deeper version-awareness is later;
- `observation` may capture a self-report *about* purpose (existing `SubjectiveObservation` path) but does **not** own `Purpose`;
- `Athlete` owns declared `Purpose` + `PurposeHistory`; it does **not** own inferred state or capacity.

[DECISION] No edits to 001–006 module source. The `athlete` module and the harness adapters are **additive**.

---

## 14. Open Questions (do not block implementation)

[QUESTION]
- whether the full `Athlete` aggregate ships now or after the Purpose slice (this plan: **after**);
- how `Hypothesis` should reference `PurposeVersion` (typed ref vs. string — future reasoning spec);
- how deep reinterpretation should go (all history vs. bounded window);
- whether reinterpretation is synchronous or queued;
- how affected dimensions are determined (passed-in now; inferred later);
- how purpose ambiguity is represented beyond a status + note;
- how revealed behavior should trigger an `Inquiry`;
- how purpose changes interact with the future persistence/event surface;
- how `PurposeChanged` becomes a public domain event later.

[ASSUMPTION] None blocks the slice: Aurora can record a versioned purpose, append a change, expose current purpose to decision-support, and selectively stale understanding — regardless of how these resolve.

---

## 15. Implementation Task Preview

[DECISION] **Implementation 007 — Build Athlete PurposeHistory, PurposeChanged, and Purpose context adapters.**

**Scope:** add the thin `athlete` module (§2 domain + optional application) and the neutral harness adapters/tests; consume existing downstream surfaces read-only.

**Acceptance criteria:**
- a versioned, append-only `PurposeHistory` with current-purpose derivation;
- `PurposeChanged` returned on change, referencing previous + new versions;
- current purpose exposed to decision-support as `PurposeContext` (missing→unknown, ambiguous→ambiguous, declared→declared);
- `PurposeChanged` usable by the adapter to selectively `markUnderstandingStale("purpose-change")`, never mutating understanding directly, never globally;
- declared purpose never replaced by revealed behavior; no automatic purpose inference;
- `athlete` imports no downstream module; the validation gate (§12) passes; all 001–006 tests stay green.

**The preview explicitly states this slice introduces:**
- **no** inferred athlete state · **no** capacity/readiness · **no** reasoning rewrite · **no** direct understanding mutation · **no** UI · **no** API · **no** DB · **no** LLM · **no** training-plan generation.

---

## 16. Technical Constraints

[FACT] TypeScript strict · Node native test runner (`node:test` + `node:assert/strict`) · no external test framework · no framework · no DB · no event bus · no LLM. No constructor parameter properties. `import type` where appropriate; explicit `.ts` extensions; explicit field declarations; pure domain objects (frozen value objects, immutable-by-operation aggregate).

---

## 17. Success Criteria

[ASSUMPTION] After this tech spec, Implementation 007 can be written **without deciding any new domain question in code** — the domain objects, history rules, change outcome, and the three integration adapters are specified, and every downstream seam already exists. The future implementation answers:

> **"Can Aurora preserve purpose as athlete-owned, versioned context while letting future interpretation change without rewriting history?"**

Provable: a thin `Athlete` owns an append-only `PurposeHistory`; a change appends a `PurposeVersion` and returns a `PurposeChanged` (prior version intact, traceable); the current purpose flows into `decision-support` as a `PurposeContext` and a `PurposeChanged` selectively stales the affected understanding dimension — all while `athlete` imports nothing downstream, owns no inferred state, and never decides or infers the purpose.

---

*This is the seventh Technical Specification. It translates Spec 007 into a thin Purpose-first `athlete` module plus neutral adapters, consuming existing downstream seams read-only; it defers the full Athlete aggregate, reasoning version-awareness, the reinterpretation engine, persistence, and the public event surface to later specs.*

*Inputs: [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
