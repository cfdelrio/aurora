# Tech Spec 008A — Projection Freshness & Refresh Implementation Plan

> The smallest TypeScript-strict plan for Spec 008 — add **projection freshness** metadata and a **conservative refresh policy** to `UnderstandingAssessment` (the one concrete projection today), so consumers know whether it is `current`/`stale`/`partial`/`invalid`/`unknown` and are constrained when it is not — **without a generic projection engine, persistence, events, cache, or UI**.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 008 — Projection Refresh and Staleness Strategy](./008-projection-refresh-staleness-strategy.md) |
| **Builds on** | Implementations 001–007 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) |
| **New module** | **None.** Freshness lives in `understanding` (owner of the only projection). |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided. This slice extends one existing projection (`UnderstandingAssessment`) additively and adds pure freshness/refresh helpers in `understanding`. **The elegant property below is the spine of the plan: freshness flows to `decision-support` through the existing `safeVoiceCeiling`, so the consumer needs no change.**

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora represent projection freshness and refresh decisions so consumers know whether a projection is current/stale/partial/invalid/unknown — without treating the projection itself as domain truth?*

[FACT] **Borders to guard:** projection ≠ source of truth · non-current freshness can only **lower** the voice · refresh = **recompute**, never edit · staleness is **selective** · stale/invalid/unknown **never** buys a Recommendation.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–007: no constructor parameter properties (explicit fields + private constructor + props + `toProps()` for aggregates; frozen value objects for the rest); `import type` + explicit `.ts` extensions; smart constructors; branded ids; immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` in domain — timestamps are passed in via `timestamp(iso)`. No new dependencies; reuse `typecheck`/`test`/`check`.

---

## 1. Implementation Scope & Key Architectural Decision

[DECISION] **Introduce a minimal projection-freshness slice, applied first to `UnderstandingAssessment` — not a generic projection engine — and route freshness downstream entirely through the existing `safeVoiceCeiling`.**

- **Decision:** add freshness concepts where they are needed now (`ProjectionFreshness`, `ProjectionSourceRef`, `ProjectionTrace`, `RefreshTrigger`, `StalenessReason`, `ProjectionRefreshDecision`, `ProjectionRefreshPolicy`) **inside `understanding`**, attach freshness metadata to `UnderstandingAssessment`, and make non-`current` freshness **lower the safe voice ceiling** so `decision-support` is constrained **without any decision-support change**.
- **Why:** Aurora has exactly one concrete projection today, and `decision-support` already honors the ceiling. A generic engine (or persisted/event-driven refresh) would overfit before `ImpactAssessment`, persistence, and events exist. Routing through the ceiling reuses the proven conservative path and keeps the change additive.
- **Consequence:** freshness becomes explicit and testable; stale/partial degrade the voice, invalid/unknown collapse the ceiling to `none` (→ `Withholding`), and `Recommendation` is structurally impossible from non-current freshness — with **no edit to `decision-support`**.
- **Risk:** future projections may need a shared abstraction; and routing only through the ceiling yields **`Withholding` (not `Inquiry`)** for invalid/unknown (see the gap in §3/§7).
- **Reversal Point:** when `ImpactAssessment`, persisted projections, or event-driven refresh are specified, extract a shared projection kernel / projection service; if `Inquiry`-on-unknown is wanted, add an explicit freshness read in `decision-support` then.

[DECISION] **Allowed:** freshness value objects/types; source-reference metadata; a derived-at timestamp; refresh-trigger type; refresh-decision type; staleness-reason taxonomy; a minimal pure freshness/refresh policy; applying freshness to `UnderstandingAssessment`; tests proving non-current freshness constrains decision-support, that refresh recomputes (never edits), and that source trace remains available.

[FACT] **Forbidden:** generic projection engine; production scheduler; background jobs; persistence; cache infrastructure; event bus; DB; UI; API; LLM; notification delivery; Garmin/FIT import; **`ImpactAssessment` implementation**; training-plan generation.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout untouched elsewhere. Freshness lives **inside `understanding`** (it owns the projection). **No top-level `projection` module; no shared-kernel addition** (default position: keep local until a second concrete projection exists).

[DECISION]
```text
src/modules/understanding/
  domain/
    projection-freshness.ts     # ProjectionFreshness, ProjectionFreshnessStatus, StalenessReason, constructors
    projection-source-ref.ts    # ProjectionSourceRef, ProjectionSourceKind, ProjectionTrace, ProjectionLimitations
    refresh-trigger.ts          # RefreshTrigger, RefreshTriggerKind
    refresh-policy.ts           # ProjectionRefreshDecision(+Kind), projectionRefreshPolicy() (pure)
    understanding-assessment.ts  # EXTENDED: add freshness + sourceRefs + derivedAt; clamp ceiling by freshness
    understanding-profile.ts     # assess(): accept an `at`, populate freshness/sourceRefs/derivedAt
    index.ts                     # export the new surface
  tests/
    projection-freshness.test.ts
    refresh-policy.test.ts
  application/
    understanding-coordinator.ts # produceUnderstandingAssessment(): optional `at` passthrough
```
[DECISION] **Cross-module freshness tests** (proving stale/partial/invalid/unknown constrain `decision-support`) live in the **neutral harness** `src/modules/__tests__/` (e.g. `projection-freshness-integration.test.ts`), because `understanding` must not import `decision-support`. This mirrors the Impl 006/007 precedent.

[QUESTION] Whether freshness eventually belongs in `shared-kernel` — deferred until a second concrete projection (`ImpactAssessment`) exists.

---

## 3. Required Surface Gap Analysis

[FACT] Inspected against the current code. Gaps surfaced explicitly — no broad engine introduced silently.

| # | Question | Finding |
|---|---|---|
| 1 | What fields does `UnderstandingAssessment` expose? | `dimension`, `level`, `fragility`, `staleness`, `safeVoiceCeiling`, `reasons`, `trace` (`TraceToHypothesisOutcome[]`). |
| 2 | Does it expose `staleness`? | **Yes** — `Staleness { status: "fresh"\|"stale", reason?, since? }`. |
| 3 | Does it expose trace? | **Yes** — `trace: TraceToHypothesisOutcome[]` (`{hypothesisId, outcomeKind, at}`): real source references to hypothesis outcomes. |
| 4 | Does it expose a derived-at timestamp? | **No.** `assess()` takes no time and stamps none. **Gap → add `derivedAt`.** |
| 5 | Does it distinguish stale / partial / invalid / unknown? | **No** — only `fresh`/`stale`. **Gap → add `ProjectionFreshness` with five states.** |
| 6 | How does `deriveSafeVoiceCeiling` react to staleness? | Stale **lowers the ceiling one step** (and high fragility lowers one step); it never raises. |
| 7 | How does `decision-support` consume the assessment? | Via `VoiceSelectionInputs.assessment`; `understandingGate` reads **only `assessment.safeVoiceCeiling`**; the policy's Recommendation guard requires `safeVoiceCeiling === "confident"`. |
| 8 | Can decision-support already degrade from stale via the ceiling? | **Yes** — stale lowers the ceiling, which lowers `maxVoiceForCeiling`, which degrades the voice. **No decision-support change is needed for stale.** |
| 9 | What is missing for partial/invalid/unknown? | A representation (the new freshness states) **and** a mapping into the ceiling: `partial` → lower one step; `invalid`/`unknown` → `none` (→ `Withholding`). Done in `understanding` (ceiling clamp), so **decision-support still needs no change**. |
| 10 | What should NOT change in this slice? | `decision-support`, `reasoning`, `observation`, `athlete` source; the existing `Staleness` two-state value (kept; freshness *generalizes* it, see §5). |

[DECISION] **Documented gap / tradeoff:** because `decision-support` is left untouched and freshness rides the ceiling, `invalid`/`unknown` resolve to `Withholding` (ceiling `none` → `Silence` → `Withholding`), **not** `Inquiry`. Spec 008 permits "`Inquiry` *or* `Withholding`," so this is conformant; routing `unknown`→`Inquiry` specifically would require a small additive freshness read in `decision-support` and is **deferred** (reversal point, §1).

---

## 4. Domain / Technical Objects

[DECISION] Implementation-level objects (no DB schema, no over-modeling).

| Object | Responsibility | Required fields (conceptual) | Invariant | Must not |
|---|---|---|---|---|
| `ProjectionFreshnessStatus` | The five usability states | `"current"\|"stale"\|"partial"\|"invalid"\|"unknown"` | `current` is the only full-strength state | add a sixth silent state |
| `ProjectionFreshness` | A labeled freshness verdict | `status`, `reasons: StalenessReason[]`, `since?` | non-`current` carries ≥1 reason | be empty/anonymous when not current |
| `StalenessReason` | Why constrained | one of the §6 taxonomy | every non-`current` names a reason | be a free-form unexplained string |
| `ProjectionSourceKind` | What kind of source a ref points to | `"hypothesis"\|"evidence"\|"signal"\|"observation-set"\|"observation"\|"understanding-profile"\|"purpose-version"\|"provenance"` | references, never copies | embed source state |
| `ProjectionSourceRef` | A reference to one source artifact | `kind`, `id` (string) | resolvable handle | carry the artifact's data |
| `ProjectionTrace` | The set of source refs behind a projection | `refs: ProjectionSourceRef[]` | derived from real artifacts only | invent a reference |
| `ProjectionLimitations` | Explicit caveats | `notes: string[]` | always present (possibly empty) | hide a known limitation |
| `RefreshTriggerKind` | A candidate cause of refresh | the §6 taxonomy | — | mutate a source |
| `RefreshTrigger` | An occurrence that may require refresh | `kind`, `at`, optional scope refs (dimensionKey / hypothesisId / observationId / purposeVersionRef) | traceable; selective by scope | imply a global reset |
| `ProjectionRefreshDecisionKind` | The policy's verdict | `"keep-current"\|"mark-stale"\|"mark-partial"\|"mark-invalid"\|"recompute-required"\|"withhold-from-strong-output"` | — | recompute by itself (decision only) |
| `ProjectionRefreshDecision` | A verdict + why | `kind`, `reason: StalenessReason`, `appliesTo?` | references the trigger/source | edit any artifact |
| `ProjectionRefreshPolicy` | Pure fn: (freshness, trigger, sourceRefs, availability) → decision | — | deterministic; conservative under uncertainty | invent traceability; globally invalidate |

---

## 5. UnderstandingAssessment Changes

[DECISION] `UnderstandingAssessment` **remains a read model / projection** and gains:
- `freshness: ProjectionFreshness` — explicit five-state status.
- `sourceRefs: ProjectionTrace` — references to the artifacts it was derived from (from the existing `trace` hypothesis-outcomes + the `UnderstandingProfile` id + any `purpose-version` ref supplied).
- `derivedAt: Timestamp` — when it was produced (passed in via `assess({ at })`).
- existing `staleness`, `level`, `fragility`, `safeVoiceCeiling`, `reasons`, `trace` are **kept**.

[DECISION] **Staleness ↔ freshness mapping (no double-counting).** `Staleness` is the legacy two-state view; `ProjectionFreshness` generalizes it:
- `staleness.fresh` ⇒ baseline `freshness = current`.
- `staleness.stale` ⇒ `freshness = stale` (carrying the same reason).
- `partial`/`invalid`/`unknown` are **new** states set only when richer source information warrants (missing/degraded/contradicted/unresolvable sources).

[DECISION] **Ceiling clamp (the downstream mechanism).** The ceiling is computed as today (`deriveSafeVoiceCeiling(level, fragility, staleness)`), then **clamped by freshness** in a new pure helper `clampCeilingByFreshness(ceiling, freshness)`:
- `current` → unchanged;
- `stale` → unchanged here (already lowered once by `deriveSafeVoiceCeiling`'s staleness step — **no second lowering**);
- `partial` → lower one step;
- `invalid` / `unknown` → `none`.
The final `safeVoiceCeiling` on the assessment is the clamped value. **Non-current freshness can only lower the ceiling, never raise it.**

[DECISION] **Migration / compatibility:**
- `assess(dimensionKey, at?)` / `produceUnderstandingAssessment({ profile, dimensionKey, at? })` take an **optional** `at`; when omitted, `derivedAt` is omitted and time-decay simply cannot be evaluated (other triggers still work) — **existing 001–007 call sites keep compiling and passing**.
- For a dimension that is `fresh` with no trigger, `freshness = current` and the clamp is a no-op ⇒ **existing ceiling/voice behavior is byte-for-byte preserved** (the Impl 006 Reflection scenario is unchanged).
- Old assessments are plain immutable values; **refresh produces a new assessment**, never mutates an old one.

---

## 6. Freshness, Trigger & Staleness-Reason Taxonomies

[DECISION] **`ProjectionFreshnessStatus`** (safety ordering): `current` (full strength) > `partial` ≈ `stale` (constrain) > `invalid` ≈ `unknown` (forbid assertive use → ceiling `none`). Rules: `current` = sources known and no freshness-limiting trigger active; `stale` = a source changed or recency lapsed; `partial` = some required/confidence-supporting source missing or degraded; `invalid` = a depended-on source was contradicted/falsified/removed; `unknown` = freshness cannot be established. **No non-current status may raise voice.**

[DECISION] **`RefreshTriggerKind`:** `purpose-change` · `hypothesis-revised` · `hypothesis-falsified` · `observation-superseded` · `source-quality-changed` · `new-contradictory-evidence` · `time-decay` · `context-changed` · `missing-source` · `projection-source-unavailable`. Triggers don't mutate source history, may mark stale/partial/invalid, are traceable, are **selective**, and never imply a global reset by default.

[DECISION] **`StalenessReason`** mirrors the trigger kinds (a non-current freshness records the reason that produced it).

---

## 7. ProjectionRefreshPolicy Rules

[DECISION] `projectionRefreshPolicy(input)` is **pure and deterministic**. **Inputs:** the projection's current `freshness`, the `RefreshTrigger`, the projection's `sourceRefs`, current source availability, and the affected dimension/context (if any). **Output:** a `ProjectionRefreshDecision` (`keep-current` / `mark-stale` / `mark-partial` / `mark-invalid` / `recompute-required` / `withhold-from-strong-output`).

[DECISION] Rules:
- The policy **decides only**; it does not recompute (recompute is a separate pure helper / the existing `assess`).
- **Selective by source intersection:** a trigger affects a projection **only if** the trigger's scope intersects the projection's `sourceRefs`. No intersection ⇒ `keep-current`. (Purpose change → only assessments whose dimension/purpose-version is in scope; observation supersession → only projections tracing to that observation; hypothesis revision → only projections tracing to that hypothesis.)
- **Severity mapping:** `hypothesis-falsified` / `new-contradictory-evidence` → `mark-invalid`; `observation-superseded` / `hypothesis-revised` → `mark-stale` (or `mark-invalid` if the source is gone); `source-quality-changed` / `missing-source` → `mark-partial`; `purpose-change` / `context-changed` / `time-decay` → `mark-stale`; `projection-source-unavailable` → `mark-invalid` or `unknown` when even resolution fails.
- **Conservative under uncertainty:** if availability/scope can't be determined ⇒ at least `mark-stale`, never `keep-current`. `unknown` freshness can never permit `Recommendation`.
- The policy **never invents traceability** and **never globally invalidates**.

---

## 8. Decision-Support Integration

[DECISION] **No `decision-support` change in this slice.** Freshness reaches the case **through the clamped `safeVoiceCeiling`**:
- `current` → existing behavior;
- `stale` / `partial` → lowered ceiling → degraded voice (`Recommendation` already impossible unless `confident`);
- `invalid` / `unknown` → ceiling `none` → `maxVoiceForCeiling("none") = Silence` → the policy yields **`Withholding`**.
- **`Recommendation` is denied from any non-current freshness** (it requires `confident`, which the clamp forbids).
- The **degradation reason is auditable**: the assessment's `reasons` includes the freshness reason (e.g. `"freshness invalid: hypothesis-falsified -> ceiling none"`), and the existing `understandingGate` result + policy degradations reflect the lowered ceiling.

[DECISION] `decision-support` **consumes** freshness (transitively, via the ceiling); it **does not own refresh** and does not import freshness types. [FACT] This keeps the boundary intact and is why the slice needs no consumer edit. The `Inquiry`-on-`unknown` refinement is deferred (§3 gap).

---

## 9. Refresh Semantics

[DECISION] Refresh = **recompute from source artifacts** (re-run `assess` over the current `UnderstandingProfile`), producing a **new** `UnderstandingAssessment` with a new `derivedAt`, recomputed `freshness = current` (absent any active trigger), and updated `sourceRefs`. Refresh **does not** edit source artifacts, **does not** rewrite the old projection, **does not** invent missing source refs, and leaves the prior assessment **auditable if the caller retains it**. For Implementation 008, refresh is exercised in **tests/helpers** (recompute = call `assess` again); no scheduler/store.

---

## 10. Negative Capability — what must remain impossible

[DECISION] Enforced by types + tests:

| Must remain impossible | How |
|---|---|
| Stale/partial projection consumed as current | freshness is explicit on the assessment; ceiling is clamped; consumer sees a lowered ceiling |
| Invalid/unknown freshness used for `Recommendation` | clamp → ceiling `none`; Recommendation requires `confident` (guard) |
| Non-current freshness **raising** the voice | clamp only lowers; `deriveSafeVoiceCeiling` only lowers; negative test |
| Refresh mutating the old projection | assessments are frozen values; refresh returns a new instance; negative test |
| Projection inventing traceability | `sourceRefs` derived from real `trace`/profile only; constructor takes refs, never fabricates |
| Invalidation deleting/overwriting sources | freshness/policy never touch `reasoning`/`observation` artifacts (no imports) |
| A trigger globally staling unrelated projections | policy is selective by source intersection; test that non-intersecting → `keep-current` |
| UI/LLM becoming projection authority; persistence/cache/event-bus introduced | none created; structural guard in tests |

---

## 11. Validation Strategy (the gate)

[ASSUMPTION] Tests to the acceptance criteria; **negative + boundary tests are defining.**

**Positive / integration:**
- `UnderstandingAssessment` exposes `freshness`, `derivedAt` (when `at` supplied), and `sourceRefs`/trace;
- `current` freshness leaves the existing Reflection scenario unchanged (Impl 006 still green);
- `stale` lowers/keeps a conservative ceiling; `partial` constrains voice; `invalid` and `unknown` deny `Recommendation` (→ `Withholding`);
- `purpose-change` trigger selectively stales the affected assessment; non-intersecting projections stay `current`;
- `hypothesis-revised` affects only projections tracing to that hypothesis; `observation-superseded` only those tracing to that observation;
- `source-quality-changed` yields `partial`/`stale`;
- refresh recomputes a new assessment (new `derivedAt`) without mutating the old; old trace remains inspectable.

**Negative (must prove absence):**
- non-current freshness never raises the ceiling/voice;
- `Recommendation` never emitted from stale/partial/invalid/unknown;
- refresh never mutates the prior assessment; projection never invents a source ref;
- no trigger globally invalidates unrelated projections;
- no UI/API/DB/LLM/event-bus/persistence artifact.

**Dependency-boundary:**
- freshness types live in `understanding`; `decision-support` does not import them; `understanding ⇏ decision-support` stays green; `athlete ⇏ downstream` stays green;
- **all Implementation 001–007 tests continue to pass.**

**Gate before commit:** `typecheck` strict clean · full suite green incl. new tests · no new top-level module · no UI/API/DB/LLM/event-bus/persistence file · `git status` clean except intended additions.

---

## 12. Relationship To Existing Core

[FACT] Implementation 008 builds on, and does not redefine, the core:
- `observation` owns source observations and supersession (a supersession is a trigger);
- `reasoning` owns the hypothesis lifecycle (a revision/falsification is a trigger);
- `understanding` owns `UnderstandingAssessment` and staleness — **this slice extends it with freshness**;
- `decision-support` **consumes** freshness via the safe voice ceiling and the existing gates — **unchanged**;
- `athlete` owns `PurposeChanged` — already a selective-staleness trigger (Impl 007), now a `RefreshTrigger`;
- projections remain read models; aggregates remain sources of truth.

[DECISION] No edits to `decision-support`/`reasoning`/`observation`/`athlete` source. Changes are confined to `understanding` (additive) + new harness tests.

---

## 13. Open Questions (do not block implementation)

[QUESTION] whether freshness eventually belongs in `shared-kernel`; whether `ImpactAssessment` is the second projection before extracting a generic abstraction; whether persisted projections need identity; how old projections are retained without persistence; how refresh is scheduled later; how the event surface carries triggers; how UI/LLM consume freshness safely; whether time-decay thresholds are per dimension/purpose/projection-type; how deep dependency tracking should go.

[ASSUMPTION] None blocks the slice: Aurora can label freshness, reference sources, decide refresh selectively, and constrain downstream voice through the ceiling — regardless of how these resolve.

---

## 14. Implementation Task Preview

[DECISION] **Implementation 008 — Add projection freshness metadata and a conservative refresh policy for `UnderstandingAssessment`.**

**Scope:** add the freshness/source-ref/trigger/policy objects in `understanding/domain`; extend `UnderstandingAssessment` (freshness + sourceRefs + derivedAt) and clamp the ceiling by freshness; pass an optional `at` through `assess`/`produceUnderstandingAssessment`; add `understanding` unit tests + neutral-harness integration tests.

**Acceptance criteria:**
- `UnderstandingAssessment` carries explicit `freshness`, `derivedAt` (when supplied), and `sourceRefs`/trace;
- `current` preserves existing behavior; `stale`/`partial` constrain voice; `invalid`/`unknown` deny `Recommendation` (→ `Withholding`) with an auditable reason;
- triggers are **selective** (purpose-change / hypothesis-revised / observation-superseded affect only intersecting projections); no global reset;
- refresh recomputes a new assessment without mutating the old; old trace remains inspectable; no invented traceability;
- the validation gate (§11) passes; all 001–007 tests stay green.

**The preview explicitly states this slice introduces:**
- **no** generic projection engine · **no** persistence · **no** DB · **no** cache infrastructure · **no** event bus · **no** UI · **no** API · **no** LLM · **no** `ImpactAssessment` · **no** training-plan generation.

---

## 15. Technical Constraints

[FACT] TypeScript strict · Node native test runner (`node:test` + `node:assert/strict`) · no external test framework · no framework · no DB · no event bus · no LLM. No constructor parameter properties. `import type` where appropriate; explicit `.ts` extensions; explicit field declarations; pure domain objects (frozen value objects, immutable-by-operation).

---

## 16. Success Criteria

[ASSUMPTION] After this tech spec, Implementation 008 can be written **without deciding any new domain question in code** — the freshness states, taxonomies, ceiling-clamp mechanism, refresh semantics, and the (zero-change) decision-support integration are specified. The future implementation answers:

> **"Can Aurora know whether an `UnderstandingAssessment` is still safe to consume, and constrain downstream voice when it is not?"**

Provable: an assessment carries `freshness` + `sourceRefs` + `derivedAt`; a selective `RefreshTrigger` drives the pure `ProjectionRefreshPolicy` to mark it stale/partial/invalid; the ceiling clamp turns non-current freshness into a strictly lower voice (invalid/unknown → `Withholding`, `Recommendation` impossible) **without touching `decision-support`**; and refresh recomputes a new assessment from the profile while the prior view stays auditable — a projection that stays a view, never a fact.

---

*This is the eighth Technical Specification. It translates Spec 008 into a minimal freshness slice on `UnderstandingAssessment`, routing freshness downstream through the existing safe voice ceiling; it defers a generic projection kernel, `ImpactAssessment`, persistence, the event surface, scheduled refresh, and `Inquiry`-on-unknown to later specs.*

*Inputs: [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · [Tech Spec 007A](./007-athlete-purpose-change-reinterpretation-tech.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
