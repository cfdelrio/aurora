# Tech Spec 005A — DecisionSupportCase & Voice Selection Implementation Plan

> The smallest safe TypeScript-strict plan for Spec 005 — a new `decision-support` module that selects the maximum responsible athlete-facing output (or Inquiry / Withholding) over reasoning + understanding, without turning evidence into command, understanding into authority, or support into decision ownership.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 005 — Decision Support & Voice](./005-decision-support-voice.md) |
| **Builds on** | [Spec 004](./004-understanding-update.md)/[004A](./004-understanding-update-tech.md) + Implementation 004 (`UnderstandingAssessment` + `SafeVoiceCeiling` are inputs) |
| **New module** | `decision-support` (consumes `reasoning`, `understanding`, athlete context; never the reverse) |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided and in use. This slice adds a new module under the same setup. **It closes the reasoning core end-to-end.**

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora implement `DecisionSupportCase` and `VoiceSelectionPolicy` so the selected output is the maximum responsible voice — or Inquiry / Withholding — while preserving traceability, uncertainty, purpose, risk, and athlete agency?*

[FACT] **Borders to guard:** `SafeVoiceCeiling ≠ VoiceMode` · `claim confidence ≠ voice` · `risk → caution only` · `DecisionSupportCase ≠ AthleteDecision`.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–004: no constructor parameter properties; `import type` + `.ts` extensions; frozen value objects; smart constructors; branded ids; aggregates immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`. No new dependencies; reuse the `typecheck`/`test`/`check` scripts.

---

## 1. Implementation Scope

[DECISION] **Allowed:**
- new `decision-support` module;
- `DecisionOpportunity` (+ `DecisionOpportunityId`);
- `DecisionSupportCase` (aggregate root, + `DecisionSupportCaseId`);
- terminal outputs `DecisionSupport` / `Inquiry` / `Withholding` (a `TerminalOutput` union);
- `VoiceMode`, `VoiceSelectionPolicy`;
- gates `EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate`, `TraceabilityVerification` (+ `GateResult`);
- `RiskAssessment`, `PurposeAlignment`, `DegradationReason`, `SupportQuality`, `TraceabilityVerificationResult`, `AthleteDecisionRef`;
- references to relevant reasoning + `UnderstandingAssessment`;
- a thin coordinator + anti-corruption adapters;
- tests (positive, negative, boundary, no-regression).

[FACT] **Forbidden:** UI; API; DB; event bus; LLM text generation; notification delivery; training-plan generation; automatic `AthleteDecision`; coach-marketplace behavior; Garmin/FIT parsing.

---

## 2. Proposed File / Module Layout

[FACT] Existing layout untouched: `src/shared-kernel/*`, `src/modules/{observation,reasoning,understanding}/**`.

[DECISION] **New, additive `decision-support` module:**
```text
src/modules/decision-support/
  domain/
    ids.ts                       # DecisionOpportunityId, DecisionSupportCaseId (branded)
    decision-opportunity.ts      # DecisionOpportunity
    voice-mode.ts                # VoiceMode + ceiling->allowed-voice mapping
    risk-assessment.ts           # RiskAssessment, RiskKind, RiskLevel (input placeholder shape)
    purpose-alignment.ts         # PurposeAlignment, PurposeContext (input placeholder shape)
    gate-result.ts               # GateResult, GateVerdict, DegradationReason
    traceability.ts              # TraceabilityVerificationResult (verification shape)
    gates.ts                     # the six gates as pure functions
    voice-selection-policy.ts    # VoiceSelectionPolicy (deterministic)
    terminal-output.ts           # TerminalOutput = DecisionSupport | Inquiry | Withholding
    support-quality.ts           # SupportQuality, AthleteDecisionRef
    decision-support-case.ts     # DecisionSupportCase aggregate root
    index.ts                     # domain PUBLIC surface
  application/
    inputs-adapter.ts            # anti-corruption: build gate inputs from reasoning/understanding/placeholders
    decision-support-coordinator.ts # open / evaluate / selectTerminalOutput / recordAthleteDecisionRef
  tests/
    ... (see §17)
  index.ts                       # module surface
```

[DECISION] **Dependencies:** `decision-support` **may import** `reasoning`, `understanding`, and `shared-kernel`. It **may consume athlete context as explicit input** (no `athlete` module exists yet — see §3). **`reasoning`, `understanding`, `observation` must NOT import `decision-support`** (re-checked over the import graph). Ids are module-local (reversal: promote to `shared-kernel` later). No UI/API/DB/event-bus/LLM layer.

[FACT] **No** `athlete` module is created here; purpose/risk/athlete-decision enter as **explicit inputs** (§3).

---

## 3. Required Input Surfaces *(gap analysis — surfaced, not decided silently)*

[FACT] Inspection of the current upstream modules:

| Need | Available? | Where |
|---|---|---|
| `UnderstandingAssessment` | **Yes, directly** | `understanding` exposes `UnderstandingAssessment` (level, fragility, staleness, **safeVoiceCeiling**, reasons, trace). |
| `SafeVoiceCeiling` | **Yes, directly** | `understanding` (`none`/`tentative`/`qualified`/`confident`). |
| Reference a Hypothesis / claim | **Yes** | `reasoning` `Hypothesis` snapshot (id, state, athleteRef, purposeContextRef, evidence). |
| Traceability links | **Material yes, verification no** | `Hypothesis.evidence[].trace` is a `TraceToSignal` → `observationSetId` + `observationIds`. The *links* exist; there is **no completeness verifier**. |
| Purpose context | **No upstream source** | `Hypothesis.purposeContextRef` is only a string ref; **no `athlete` module** provides purpose. |
| Risk context | **No upstream source** | nothing computes risk anywhere. |
| Athlete decision | **No upstream source** | no athlete-decision module. |

[DECISION] **Resolutions (anti-corruption adapters in `decision-support/application`, no upstream change):**
1. **Traceability:** `TraceabilityVerification` *verifies* over the existing `Hypothesis.evidence[].trace` links — walking Hypothesis → EvidenceCase → TraceToSignal → observationSet/observationIds — and returns `complete`/`partial`/`missing`/`invalid`. It **verifies, never authors**. (The links are sufficient; only a verifier is added.)
2. **Purpose:** represented as an **explicit `PurposeContext` input placeholder** (passed into the case), since no `athlete` module exists. The `PurposeGate` consumes it; missing/ambiguous → Inquiry/Withholding. [QUESTION] wired to a real `athlete` module later.
3. **Risk:** represented as an **explicit `RiskAssessment` input placeholder** (passed in). The `RiskGate` consumes it; risk computation is deferred. [QUESTION] a real risk source later.
4. **AthleteDecision:** represented as a lightweight **`AthleteDecisionRef`** value recorded *after the fact*, never owned (§13).

[FACT] **Important:** decision-support **verifies** traceability and **consumes** an already-computed `UnderstandingAssessment`; it does not author claims, recompute understanding, or invent traceability.

---

## 4. Domain Objects

[FACT] Conceptual fields only — no DB schema, no over-modeling.

### `DecisionOpportunityId` / `DecisionSupportCaseId`
- Branded opaque ids; unique; never parsed.

### `DecisionOpportunity`
- **Responsibility:** a non-obvious, consequential moment where support may be useful. **Fields:** `id`, `choice: string` (the fork/context), `whySupportMayHelp: string`, `athleteRef: string`, `at: Timestamp`. **Invariant:** names the choice and the reason. **Must not:** be created for every workout; carry an answer.

### `VoiceMode`
- **Responsibility:** the assertiveness mode of a `DecisionSupport`. **Fields:** union `'Silence' | 'Reflection' | 'Framing' | 'Warning' | 'Recommendation'`. **Invariant:** never derived directly from claim confidence; never above the mapped ceiling (except `Warning` via the risk path). **Must not:** be `Inquiry`; equal `SafeVoiceCeiling`.

### `RiskAssessment` *(input placeholder)*
- **Responsibility:** the risk picture for this opportunity. **Fields:** `kinds: readonly RiskKind[]` (`'injury'|'overtraining'|'psychological'|'trust'|'adaptation-waste'|'safety'`), `level: RiskLevel` (`'low'|'medium'|'high'|'critical'`), `note?`. **Invariant:** may raise toward caution only. **Must not:** justify a stronger Recommendation.

### `PurposeAlignment` / `PurposeContext` *(input placeholder)*
- **PurposeContext:** `{ purpose?: string; status: 'declared'|'unknown'|'ambiguous' }`. **PurposeAlignment:** `'aligned'|'misaligned'|'unknown'|'ambiguous'` (the gate's verdict). **Invariant:** missing/ambiguous purpose may force Inquiry/Withholding; **must not** be silently ignored.

### `GateResult`
- **Responsibility:** one gate's verdict. **Fields:** `gate: string`, `verdict: GateVerdict` (`'pass'|'limit'|'fail'|'needs-inquiry'|'caution-warning'`), `reason: string`. **Invariant:** every gate run is recorded; failures never hidden. **Must not:** be omitted from the case audit.

### `TraceabilityVerificationResult`
- **Responsibility:** whether support is walkable to observations. **Fields:** `status: 'complete'|'partial'|'missing'|'invalid'`, `resolvedTo?: { observationSetId; observationIds }`, `reason: string`. **Invariant:** verified, not authored; **Recommendation requires `complete`**. **Must not:** invent links.

### `DegradationReason`
- **Responsibility:** why a stronger voice was not used. **Fields:** `from: VoiceMode | 'Recommendation-considered'`, `to: VoiceMode | 'Inquiry' | 'Withholding'`, `cause: string`, `gate: string`. **Invariant:** recorded whenever voice is degraded.

### `TerminalOutput` *(discriminated union)*
- `DecisionSupport`: `{ outcome: 'support'; voice: VoiceMode; intent: SupportIntent; preservesAgency: true; uncertaintyVisible: boolean; trace: TraceabilityVerificationResult; reasons: readonly string[] }`.
- `Inquiry`: `{ outcome: 'inquiry'; question: string; whatNeeded: string; reasons: readonly string[] }` — **not a VoiceMode**.
- `Withholding`: `{ outcome: 'withholding'; reason: string }` — realizes Silence.
- **Invariant:** all three auditable; support preserves agency and surfaces uncertainty where relevant. **Must not:** include command/shame intent.

### `SupportQuality`
- **Responsibility:** integrity of the support (gate honoring), **not** outcome. **Fields:** `gatesPassed: readonly string[]`, `traceability: TraceabilityVerificationResult['status']`, `degraded: boolean`. **Invariant:** about process, never outcome. **Must not:** be computed from any `AthleteDecision` result.

### `AthleteDecisionRef`
- **Responsibility:** a *reference* to the athlete's later decision. **Fields:** `decisionId: string`, `at: Timestamp`, `divergedFromSupport?: boolean`. **Invariant:** recorded after the fact; **referenced, never owned**; no judgment of the choice. **Must not:** live inside the case's core resolution state as an owned entity.

### `DecisionSupportCase` *(aggregate root)*
- **Responsibility:** guards the integrity of one unit of support.
- **Fields:** `id`, `opportunity`, reasoning references (hypothesis id/snapshot ref), the `UnderstandingAssessment`, `purposeContext`, `riskAssessment`, `gateResults`, `traceability`, `selectedOutput?` (only after evaluation), `degradations`, `supportQuality?`, `athleteDecisionRef?`, audit trail.
- **Invariant:** opens from a `DecisionOpportunity`; **produces no terminal output before gates run**; does **not** own `AthleteDecision`; owns **no** raw observations/signals/EvidenceCases/`UnderstandingProfile`; does **not** author claims; immutable-by-operation.
- **Must not:** emit a recommendation if gates fail; exceed the ceiling; contain command/shame.

---

## 5. DecisionOpportunity Rules

[DECISION] Not every workout creates one; an opportunity exists only for **non-obvious or consequential** choices, names the **choice/context** and **why support may help**, and **may be produced outside this slice**. A `DecisionSupportCase` may open **only** from an explicit `DecisionOpportunity`. **Opportunity *detection* is not implemented in this slice** (an opportunity is constructed/passed in).

---

## 6. DecisionSupportCase Rules

[DECISION] Aggregate root; opens from a `DecisionOpportunity`; holds gate results + the traceability result; holds a selected terminal output **only after gates run**; records degradation reasons; preserves an audit trail; **does not own** `AthleteDecision`, raw observations/signals/EvidenceCases, or `UnderstandingProfile`; **does not author claims**; **produces no output before gates are evaluated.** `open()` → unresolved case; `evaluate(policy)` → resolved case with terminal output (immutable-by-operation).

---

## 7. Terminal Output Rules

[DECISION] Three terminal outputs:
- `DecisionSupport` — **may include** a `VoiceMode`.
- `Inquiry` — **not a VoiceMode**; states what input is needed.
- `Withholding` — realizes `Silence` / refusal to assert, with a reason.

[DECISION] **`Silence` is represented as a `VoiceMode` value (the lowest) AND realized as `Withholding`** — i.e., when the policy selects `Silence`, the terminal output is a `Withholding` (not a `DecisionSupport` with voice Silence). This keeps "silence is an output, not a thing Aurora says." All outputs are auditable, preserve agency, and expose uncertainty where relevant.

---

## 8. VoiceMode Rules & Ceiling Mapping

[DECISION] Ladder `Silence < Reflection < Framing < Warning ≈ Recommendation`. `VoiceMode` is selected only for `DecisionSupport` (except `Silence` → `Withholding`). `Warning` and `Recommendation` are high-responsibility, **not persuasion-ordered**. `VoiceMode` is **never derived from claim confidence** and **never exceeds the safe voice ceiling** unless `RiskGate` forces a cautionary `Warning`.

[DECISION] **`SafeVoiceCeiling` → allowed `VoiceMode` mapping (the single source of this mapping; SafeVoiceCeiling is NOT a VoiceMode):**

| SafeVoiceCeiling | Allowed assertiveness ladder (max) |
|---|---|
| `none` | `Silence` (→ Withholding) |
| `tentative` | up to `Reflection` |
| `qualified` | up to `Framing` |
| `confident` | up to `Recommendation` |

[DECISION] **`Warning` is reachable via the `RiskGate` (cautionary safety path) independent of the ceiling** — risk can raise to `Warning` even when the ceiling would otherwise cap lower; it can **never** raise to `Recommendation`.

- **Why Recommendation only at `confident`:** [ASSUMPTION] strictest safe mapping for the first slice — a recommendation is the strongest action-proposing voice and should require the highest earned understanding (Mature → `confident`).
- **Reversal Point:** [QUESTION] if the Decision Support Model's "Recommendation at Trusted" is desired, add `Recommendation` to the `qualified` row; the mapping is one table to change.

---

## 9. Gate Rules

[DECISION] Each gate is a **pure function** returning a `GateResult`. The case records all results.

| Gate | Inputs | Verdicts | Must not |
|---|---|---|---|
| **EvidenceGate** | reasoning ref / hypothesis snapshot, traceability availability, claim limitations | `pass`/`limit`/`fail`/`needs-inquiry` | infer an athlete decision |
| **UnderstandingGate** | `UnderstandingAssessment`, requested voice, safe voice ceiling, fragility, staleness | `pass`/`limit`/`fail` | permit voice above the ceiling |
| **PurposeGate** | `PurposeContext`, opportunity, proposed support | `pass`/`limit`/`fail`/`needs-inquiry` | ignore missing purpose |
| **RiskGate** | `RiskAssessment`, opportunity, proposed support | `pass`/`caution-warning`/`limit`/`fail` | escalate toward Recommendation |
| **AgencyGate** | candidate intent, command/shame markers | `pass`/`fail`/`needs-inquiry` (rewrite) | accept command/shame |
| **TraceabilityVerification** | reasoning refs, trace links, provenance availability | `complete`/`partial`/`missing`/`invalid` | invent traceability |

[FACT] **Recommendation requires `TraceabilityVerification = complete`**; lower voices may use `partial` **only if explicitly labeled** in the output's `trace`.

---

## 10. VoiceSelectionPolicy

[DECISION] A **deterministic, auditable** pure function. It chooses the **maximum responsible voice**:
1. Start from the **ceiling-allowed max** (§8 mapping).
2. **Cap** by every gate: the result cannot exceed the weakest relevant gate (`limit`/`fail` lower it).
3. **`RiskGate = caution-warning`** can raise to `Warning` (safety path) even if the ceiling capped lower — but **never** to `Recommendation`.
4. **`needs-inquiry`** from any required gate (e.g., missing purpose, missing athlete context) → force **`Inquiry`**.
5. If nothing responsible remains (ceiling `none`, or gates fail without a resolvable inquiry) → force **`Withholding`**.
6. **`Recommendation`** requires *all* required gates `pass` **and** `TraceabilityVerification = complete` **and** ceiling `confident`.
7. **Claim confidence never raises the voice** (it is not even an input to the policy).
8. Every degradation records a `DegradationReason`; the selected output **preserves agency**.

[FACT] **No LLM. No scoring formula** (qualitative, table-driven). If a tie/ambiguity arises, the policy chooses the *lower* (more conservative) voice.

---

## 11. Traceability Strategy

[DECISION] `DecisionSupportCase` **verifies** traceability via `TraceabilityVerification` over existing reasoning links (Hypothesis → EvidenceCase → `TraceToSignal` → observationSet/observationIds); it **does not author** it. **Recommendation requires `complete`.** Reflection/Framing may proceed with `partial` **only when explicitly labeled** in the output. **Withholding** is valid when traceability is `missing`/`invalid`; **Inquiry** is valid when the missing piece is athlete-resolvable. [FACT] The current reasoning surface is **sufficient** (the links exist); only the verifier is added (§3).

---

## 12. Agency and Language Safety

[DECISION] This slice generates **no final NL copy**. Agency is enforced via **structured intent metadata**, not text:
- a `SupportIntent` enum: `'reflect' | 'frame' | 'warn' | 'recommend'`;
- **prohibited intent markers**: `command`, `shame`, `certainty-claim`, `hidden-uncertainty`, `decision-ownership`;
- the `AgencyGate` **rejects** any candidate carrying a prohibited marker and requires `preservesAgency: true` + (where relevant) `uncertaintyVisible: true`.

[FACT] Tests validate agency **without** NLG: by asserting the candidate-intent enum + the absence of prohibited markers + the presence of the agency-preserving structure. No `"you must"` semantics; no certainty where uncertainty exists; no output that hides athlete choice.

---

## 13. SupportQuality

[DECISION] `SupportQuality` measures **integrity of support** — which gates were honored and traceability completeness — **never** outcome. `AthleteDecisionRef` **may be referenced later** but is **never owned**; a later outcome **must not** retroactively validate unsupported advice. `SupportQuality` is computed from the gate results, not from any decision result.

---

## 14. Negative Capability

[DECISION] **Structural prevention, each backed by a test:**
1. **Boundary:** `decision-support` imports `reasoning`/`understanding`/`shared-kernel`; upstream modules import **no** `decision-support` (import-graph test).
2. **Type shape:** `VoiceMode` and `SafeVoiceCeiling` are **distinct types**; the policy's input has **no claim-confidence field** (confidence→voice unrepresentable); `TerminalOutput` `DecisionSupport` requires `preservesAgency: true` (a `false` is a type error); `Inquiry` has no `voice` field (Inquiry-as-VoiceMode unrepresentable); the case has no owned `AthleteDecision` field.
3. **Policy rules:** Recommendation gated on `complete` traceability + `confident` ceiling + all gates pass; `RiskGate` can only produce `caution-warning` (no Recommendation path); ties resolve downward.
4. **Public surface:** `decision-support/index.ts` exposes the case/policy/gates/outputs — and is the *only* place these live; no UI/LLM symbol.

[FACT] Plus, by construction: no output before gates; degradation reasons recorded; gate failures recorded; missing purpose never silently ignored.

---

## 15. Application Service / Coordinator

[DECISION] Thin coordinators that **coordinate, never reason**:
- `openDecisionSupportCase({ opportunity, hypothesis, assessment, purposeContext, riskAssessment }) → DecisionSupportCase`
- `evaluateDecisionSupportCase({ case, policy? }) → DecisionSupportCase` (runs gates + policy → resolved case with terminal output)
- `selectTerminalOutput` (internal to evaluate, or exposed for testing)
- `recordAthleteDecisionRef({ case, decisionRef }) → DecisionSupportCase` (references, never owns)

Plus an **inputs-adapter** (application layer) that builds gate inputs from reasoning/understanding/placeholders.

[FACT] All support-integrity invariants live in `DecisionSupportCase`; all voice-selection logic in `VoiceSelectionPolicy`. The coordinator only sequences.

---

## 16. Persistence Decision

[DECISION] **Pure domain objects. No repository (unless a test wants a trivial in-memory one), no DB, no event bus.** Validation is about the model + negative capability; persistence/eventing/delivery are deferred. **Reversal:** add a case store + opportunity events when cases must persist or react to live upstream events.

---

## 17. Validation Strategy (tests before implementation)

[DECISION] **Negative + boundary + no-regression tests are defining.**

**Positive:** open a case from an opportunity (no output before gates); each gate; traceability verification; Recommendation requires `complete` traceability; voice never exceeds the ceiling; risk can force a cautionary `Warning`; risk cannot force `Recommendation`; missing purpose → Inquiry/Withholding; incomplete context → Inquiry; Withholding valid + auditable; Inquiry is not a VoiceMode; DecisionSupport can use Reflection / Framing / Warning / Recommendation (the last only when all gates permit); the policy records degradation reasons; AgencyGate rejects command + shame intent; `SupportQuality` ≠ outcome; `AthleteDecisionRef` referenced but not owned.

**Negative (must prove absence):** **claim confidence cannot override gates** (not even an input); **no Recommendation without complete traceability / above ceiling / if any gate fails**; **risk never escalates to Recommendation**; **Inquiry never typed as VoiceMode**; **Withholding never a failure**; **case never owns `AthleteDecision`**; command/shame intent rejected; uncertainty never hidden; gate failures + degradation never hidden; no UI/API/DB/LLM/training-plan artifact.

**Boundary:** `decision-support` may import `reasoning` and `understanding`; `reasoning`/`understanding`/`observation` must **not** import `decision-support`.

**No-regression:** **all Implementation 001 + 002 + 003 + 004 tests continue to pass.**

---

## 18. Relationship To Implementation 004

[FACT] Implementation 005 **builds on, does not change,** Implementation 004:
- `UnderstandingAssessment` provides the `SafeVoiceCeiling`; **`SafeVoiceCeiling` is not a `VoiceMode`** — this slice maps within it (§8).
- **Staleness and fragility constrain voice** (they already lowered the ceiling in `understanding`).
- `DecisionSupport` **consumes** the assessment but **selects** the terminal output.
- **`understanding` does not know about `decision-support`** (`understanding ⇏ decision-support`).
- Decision support **preserves athlete agency**.

[DECISION] No edits to any existing file. The `decision-support` module is **entirely additive**; it imports the `reasoning`/`understanding` surfaces read-only.

---

## 19. Open Questions (do not block implementation)

[QUESTION] Exact `TraceabilityVerification` representation (depth of the walk) · exact `RiskAssessment` taxonomy · exact `PurposeAlignment` representation · how athlete purpose context is provided technically (placeholder now) · whether `DecisionOpportunity` is an event or value object · whether terminal outputs are entities or value objects ([ASSUMPTION] value objects) · how `SupportQuality` is represented · how to reference `AthleteDecision` later · whether `Recommendation` and `Warning` need separate structures · compile-time vs. runtime enforcement depth · first concrete `DecisionOpportunity` worth implementing · future UI/LLM boundary.

[ASSUMPTION] None block building a gated, deterministic, agency-preserving voice selection that consumes the existing reasoning + understanding surfaces.

---

## 20. Implementation Task Preview

[DECISION] The task that follows **once approved**:

> **Implementation 005 — Build DecisionSupportCase, gates, VoiceSelectionPolicy, and terminal outputs**

**Scope:** the new `decision-support` module (§2), the adapters + thin coordinators (§15), the full test suite (§17). Nothing else.

**Acceptance criteria (gate to "done"):**
- [ ] All §17 positive tests pass.
- [ ] All §17 negative tests pass — voice gated not derived; no Recommendation without complete traceability / above ceiling / on gate failure; risk only toward cautionary Warning; Inquiry not a VoiceMode; Withholding valid; AthleteDecision referenced not owned; command/shame rejected.
- [ ] All §17 boundary tests pass — `decision-support`→`reasoning`/`understanding` allowed; upstream ⇏ `decision-support`.
- [ ] No output before gates run; degradation reasons recorded; `SupportQuality` ≠ outcome.
- [ ] `typecheck` clean (strict) and `test` green, **including all Implementation 001 + 002 + 003 + 004 tests** (no regression).

**This task explicitly produces:**
- **no** UI, **no** API, **no** DB, **no** LLM output, **no** notification delivery, **no** training-plan generation, **no** automatic `AthleteDecision`.

[FACT] **Implementation does not begin until the user explicitly approves this tech spec.**

---

## Success Criterion

> **"Can Aurora decide how strongly it may speak — or whether it must stay silent — without taking ownership of the athlete's decision?"**

[ASSUMPTION] After this tech spec, an implementer can build the decision-support slice **without deciding any domain question in code**: the objects, fields, invariants, the ceiling→voice mapping (with `SafeVoiceCeiling ≠ VoiceMode`), the six gates, the deterministic `VoiceSelectionPolicy` (claim confidence is not even an input; risk only toward caution; Recommendation needs complete traceability + `confident` ceiling + all gates), the structured agency/language safety (intent enums, no NLG), `SupportQuality` ≠ outcome, `AthleteDecisionRef` referenced-not-owned, the enforcement layers, and the full negative + boundary + no-regression suite are all specified. Aurora selects the maximum responsible voice — or asks, or stays silent — and the decision stays the athlete's. A correct command is still a command, and the case is structurally forbidden from issuing one.

---

## Known Risks

[ASSUMPTION]
- **Risk:** voice derived from claim strength (the tempting path). **Defense:** claim confidence is **not an input** to the policy; `UnderstandingGate` caps; negative test.
- **Risk:** `RiskGate` used to justify a strong Recommendation. **Defense:** `RiskGate` can only emit `caution-warning`; the policy has no risk→Recommendation path; negative test.
- **Risk:** Inquiry/Withholding treated as a voice or a failure. **Defense:** `Inquiry` has no `voice` field; `Withholding` is a first-class outcome; tests.
- **Risk:** the case owns/judges the decision. **Defense:** no owned `AthleteDecision` field; `SupportQuality` from gates only; reference-only `AthleteDecisionRef`.
- **Risk:** purpose/risk placeholders quietly become real coupling. **Defense:** they are explicit inputs in the application layer; surfaced in §3; reversal noted.
- **Risk:** parameter-property / native-strip pitfall in the aggregate. **Defense:** §0 — explicit field declarations.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical spec for Spec 005 and the plan for the first `decision-support` module — the slice that closes the reasoning core end-to-end. It defines the minimal implementation plan and surfaces the purpose/risk/athlete-decision input gaps; it does not implement. Implementation awaits explicit approval.*

*Inputs: [Spec 005](./005-decision-support-voice.md) · [Spec 004](./004-understanding-update.md) · [Tech Spec 004A](./004-understanding-update-tech.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
