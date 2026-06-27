# Tech Spec 006A — End-to-End Responsible Reflection Implementation Plan

> The smallest TypeScript-strict plan for Spec 006 — compose the four existing core modules into one end-to-end path that produces a traceable, agency-preserving `Reflection`, proven by an **integration test harness**, with **no new domain, no new production service, no infrastructure**.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 006 — First End-to-End Responsible Reflection](./006-end-to-end-responsible-reflection.md) |
| **Builds on** | Implementations 001–005 (all four module public surfaces exist and are tested) |
| **New module** | **None.** A new *test* file composes existing surfaces. |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided and in use. This slice adds **no module and no production code** — only an integration test (and, if needed, a tiny test-only helper). It is the first proof that the composed core does not betray its invariants.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora compose the existing core modules into one end-to-end flow and produce a traceable, agency-preserving `Reflection` without introducing new domain logic or overreaching into `Recommendation`?*

[FACT] **Borders to guard while composing:** observation ≠ meaning · signal ≠ evidence · evidence ≠ certainty · understanding ≠ authority · `SafeVoiceCeiling` ≠ `VoiceMode` · support ≠ decision ownership.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–005: no constructor parameter properties; `import type` + explicit `.ts` extensions; frozen value objects; smart constructors; branded ids; aggregates immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`; conditional spreads for `exactOptionalPropertyTypes`. No new dependencies; reuse the existing `typecheck` / `test` / `check` scripts. **Prefer tests/helpers over production code** for this slice.

---

## 1. Key Architectural Decision — the orchestration seam

[DECISION] **For Implementation 006, the orchestration seam is an integration test harness / fixture, not a production application service.**

- **Decision:** implement the first end-to-end slice as an integration test (plus, at most, a tiny test-only helper), composing the *existing* public surfaces of `observation`, `reasoning`, `understanding`, and `decision-support`. No production application service is created.
- **Why:** no external input boundary exists yet — no UI, API, DB, CLI, worker, or event source. A production application service would imply a *use-case / entrypoint boundary* that has not been specified (Spec 006 §3, Boundary Map §9). The first thing worth proving is that the *composed* core keeps its invariants; that is a test concern, not a product surface.
- **Consequence:** we prove composition and invariant-preservation without committing to any API/UI/DB/event shape. No production code imports all four modules (which would let one layer silently "own the whole story" — Spec 006 §5/§11).
- **Risk:** the orchestration logic may later move into a real application service when product entrypoints exist; the test harness is not the final home.
- **Reversal Point:** the first real external interface (API/CLI/worker) or persistence boundary is specified — at that point the harness's composition becomes the skeleton of a real coordinating service, and 00X-A specifies it.

[FACT] This matches the Boundary Map's rule that **application services coordinate, never reason** (§9): even when promoted later, the seam will only sequence calls; every verdict/level/voice stays inside its owning module.

---

## 2. Proposed File / Test Layout

[FACT] Existing layout untouched: `src/shared-kernel/*`, `src/modules/{observation,reasoning,understanding,decision-support}/**`. Each module keeps its own `tests/` folder (12 / 8 / 6 / 5 test files today).

[DECISION] **One new cross-module integration test, in a new neutral test root — not inside any single module:**
```text
src/modules/__tests__/
  end-to-end-responsible-reflection.test.ts   # the only required new file
  end-to-end-fixture.ts                        # (optional) test-only fixture builder, NOT a .test file
```

- **Why `src/modules/__tests__/` and not inside a module:** placing the end-to-end test inside `observation/` (or any module) would imply that module owns the whole chain — exactly the "one module appears to own the core" collapse Spec 006 forbids (§5). A sibling `__tests__/` directory at the `modules` level is the smallest location that reads as *"this composes modules, it belongs to none."*
- **What it may import:** the four module **public surfaces only** — `../observation/index.ts`, `../reasoning/index.ts`, `../understanding/index.ts`, `../decision-support/index.ts` — plus `shared-kernel`. It must not reach into any module's internal files.
- **No production file** may import all four modules. (A negative/boundary assertion checks this — §6.)
- [ASSUMPTION] The optional `end-to-end-fixture.ts` holds the synthetic scenario builder so the test body reads as assertions, not setup. It is a **test helper** (no `.test.` infix), uses explicit field declarations / frozen literals if it builds any object, and lives beside the test. If the fixture is short enough, inline it and skip this file.

[QUESTION] Whether the runner glob `node --test "src/**/*.test.ts"` already picks up `src/modules/__tests__/*.test.ts` — it does (the glob is recursive), so no script change is needed. Confirmed against `package.json` at implementation time.

---

## 3. The Scenario Fixture (precise, mapped to real surfaces)

[DECISION] The fixture is fully synthetic and built **only** from existing exported constructors. Each row names the real surface it uses.

| Step | Real surface (existing export) | Fixture content |
|---|---|---|
| Athlete ref | plain string | `"athlete:e2e-1"` |
| Intake | `recordObservationSet({ occasion, expected, observations:[…] })` | occasion `"session"`; `observations`: one `{kind:"measured", …}` (e.g. heart-rate elevated for the session), one `{kind:"subjective", …}` ("felt unusually heavy"), one `{kind:"missing-data", …}` (the quality-limited / missing datum) — each carrying `provenance`, `source`, `quality` |
| Detection | `detectSignals({ set, frameFor })` | caller supplies a `ContextualFrame` per observation via `frameFor`; returns `readonly (Signal \| SignalRejection)[]` — the missing-data observation legitimately yields a `SignalRejection` (or is excluded from `active()`), the measured/subjective yield at least one `Signal` |
| Reasoning | `openHypothesis(...)` then `attachSignalAsEvidence({ hypothesis, signal, direction:"supports", reasoningNote, at })` | a falsifiable `Hypothesis` (declared falsifier) with `athleteRef:"athlete:e2e-1"`; the detected `Signal` attached as one `EvidenceCase` |
| Settle | `transitionHypothesis({ hypothesis, to:"supported", cause, at })` | move the hypothesis to a **settled** state `understanding` can consume (`supported`) |
| Understanding | `reasoningOutcomeFrom({ hypothesis, dimension, conditions:[oneCondition], at })` → `updateUnderstandingFromOutcome({ profile, outcome })` → `produceUnderstandingAssessment({ profile, dimensionKey })` | `UnderstandingProfile.initialize({ athleteRef })`; **one** outcome, **one** distinct condition |
| Decision opportunity | `decisionOpportunity({ choice, whySupportMayHelp, athleteRef, at })` | a non-obvious but low-stakes reflection moment |
| Purpose | `purposeContext("declared", "…")` | explicit but minimal declared purpose |
| Risk | `noRisk()` (or `riskAssessment("low", …)`) | assessed as **not** requiring a Warning |
| Traceability | `verifyTraceability(hypothesis)` | walks the hypothesis's real evidence links → `complete` (verified, not authored) |
| Claim state | `claimStateOf(hypothesis)` → `"supported"` | the settled state feeds the `EvidenceGate` |
| Candidate | `candidate`-shaped `{ intent:"reflect", markers:[], uncertaintyVisible:true }` | a clean reflection candidate (no prohibited markers) |
| Case | `openDecisionSupportCase({ opportunity, assessment, purpose, risk, candidate, trace, claimState })` → `evaluateDecisionSupportCase({ decisionCase })` | terminal output read from `evaluated.selectedOutput` |

[FACT] **Why this fixture lands on `Reflection` through real logic, not by force** (the load-bearing mechanic, verified against the code):
1. A single **`supported`** outcome is "first contact": `applyOutcome` sets `level = higherOf("Unknown","Working") = Working`; with **one** distinct condition (`distinct < 2`) it does **not** reach `Trusted`/`Mature`.
2. `deriveSafeVoiceCeiling(Working, fragility:low, fresh)` = **`tentative`**.
3. `maxVoiceForCeiling("tentative")` = **`Reflection`**.
4. In `selectTerminalOutput`: `EvidenceGate(supported)` = pass · `UnderstandingGate` permits up to Reflection · `PurposeGate(declared)` = pass · `RiskGate(low)` = pass · `AgencyGate(clean candidate)` = pass · `trace = complete` ⇒ **no degradation, no Recommendation guard triggered** (ceiling isn't `confident`) ⇒ terminal output **`DecisionSupport` with `VoiceMode = Reflection`**.

[ASSUMPTION] The fixture deliberately uses **one condition** and **a fresh, low-fragility** dimension so that Reflection is the *natural* ceiling — not a degraded Recommendation. This proves restraint by construction: even with complete traceability and clean gates, a single chain tops out at Reflection.

---

## 4. Required End-to-End Assertions

[DECISION] The integration test asserts, in order along the chain (these are Spec 006 §8 made concrete):

1. `ObservationSet` contains the raw observations with provenance (`set.active()` / observation `provenance`), and **no Signal exists yet** (intake produced none).
2. `detectSignals` returns at least one `Signal` **and** the missing/limited datum surfaces as a `SignalRejection` (or is not in `active()`) — nothing silently dropped.
3. A produced value is a `Signal`, **not** an `EvidenceCase` (a `Signal` has no evidence-case shape; assert via its discriminant/`questionTopic`).
4. The `EvidenceCase` exists **only inside** the `Hypothesis` (`hypothesis.evidence.length === 1`; no standalone evidence constructor is reachable from the public surface).
5. The `Hypothesis` has a declared falsifier (`hypothesis.falsifiers.some(f => f.status === "declared")`).
6. Hypothesis confidence is **not** certainty — assert the lifecycle state is a defeasible `"supported"`, not a "certain/proven" terminal (no such state exists).
7. Understanding consumed the **hypothesis outcome**, not a raw signal — the path went through `reasoningOutcomeFrom(hypothesis…)`; assert the assessment's `trace` references the hypothesis outcome, and the profile was never handed a `Signal`.
8. The `UnderstandingAssessment` is **dimension-specific** (`assessment.dimension.key` matches the chosen dimension; `assess(otherKey)` is `undefined`).
9. `assessment.safeVoiceCeiling === "tentative"` (modest), and `assessment.level === "Working"`.
10. The `DecisionSupportCase` **verifies** traceability rather than authoring it — `trace` came from `verifyTraceability(hypothesis)` and is `"complete"`; the case has no method that *creates* a trace.
11. `evaluated.selectedOutput.outcome === "support"`.
12. `evaluated.selectedOutput.voice === "Reflection"`.
13. `evaluated.selectedOutput.voice !== "Recommendation"` (and is not `"Warning"`).
14. The support output carries `preservesAgency === true`, `uncertaintyVisible === true`, and the candidate carried **no** prohibited markers (no command/shame/certainty-claim/hidden-uncertainty/decision-ownership).
15. `evaluated.athleteDecisionRef === undefined` — no `AthleteDecision` owned; the field exists only to *reference* later.
16. End-to-end traceability reaches back to the `ObservationSet`: `selectedOutput.trace.resolvedTo.observationSetId` / `observationIds` resolve to the intake set's id and observation ids (§7).
17. The quality limitation survives: the missing/limited datum is still observable in the chain (e.g. the `SignalRejection` is present, or the assessment/output reasons reflect the limitation) — uncertainty is not silently cleaned.
18. (Boundary) running the full suite leaves **all 001–005 tests green** (no regression — validation gate, §8).
19. (Boundary) `observation`/`reasoning`/`understanding` still **⇏** `decision-support` (existing boundary tests unchanged and green).
20. (Boundary) **no production file imports all four module surfaces**, and **no UI/API/DB/LLM/event-bus file exists** (§6).

---

## 5. Traceability Expectations

[DECISION] The test asserts the chain is traceable **by walking the existing links**, never by inventing a trace in the test:

- The terminal `DecisionSupport.trace` is the `TraceabilityVerificationResult` produced by `verifyTraceability(hypothesis)`; its `resolvedTo.observationSetId` and `resolvedTo.observationIds` are compared against the `ObservationSet.id` and the ids of the observations the `Signal` was built from.
- The `Hypothesis` → `EvidenceCase` → `trace.observationSetId` / `observationIds` chain is the bridge; the `Signal`'s own `traceToObservation(setId, [obs])` is the lower link.
- The `UnderstandingAssessment.trace` references the hypothesis-outcome; the `DecisionSupportCase` references the `assessment` and the `opportunity`.

[DECISION] **If any current surface does not expose enough to assert a link, that is a blocker/adapter finding — recorded in §9, never patched by inventing data in the test.** From the read of the existing code, the needed links are all present:
- `verifyTraceability` already returns `resolvedTo.{observationSetId, observationIds}`;
- `EvidenceCase.trace` carries `observationSetId` + `observationIds`;
- `Signal` carries `traceToObservation`;
- `UnderstandingAssessment.trace` carries `TraceToHypothesisOutcome`.

[ASSUMPTION] No adapter is expected to be needed. If the id types compare as branded values, the test compares via `String(...)` (as `verifyTraceability` already does internally) — no new conversion surface required.

---

## 6. Negative Capability — what must remain impossible

[DECISION] The test (and the unchanged module surfaces) must keep these unrepresentable; each line is an assertion or a structural fact:

| Must remain impossible | How it is guaranteed |
|---|---|
| Observation → Hypothesis directly | `attachSignalAsEvidence` only accepts a `Signal`; no `Observation`-to-evidence path exists on the public surface. |
| Signal → Understanding directly | `updateUnderstandingFromOutcome` accepts a `ReasoningOutcome` (built by `reasoningOutcomeFrom` from a `Hypothesis`), never a `Signal`. |
| Evidence → certainty | no "certain/proven" lifecycle state exists; confidence is never read by understanding (the adapter drops it). |
| Understanding chooses a VoiceMode | `understanding` exports no voice symbol; `SafeVoiceCeiling` is a ceiling type only. |
| `SafeVoiceCeiling` becomes `VoiceMode` | distinct types in distinct modules; the mapping `maxVoiceForCeiling` lives in `decision-support`, consumes the ceiling, returns a `VoiceMode`. |
| `DecisionSupport` owns `AthleteDecision` | the case has only an `athleteDecisionRef` field (asserted `undefined` here); no `AthleteDecision` is constructed. |
| `Reflection` treated as failed `Recommendation` | the test asserts `Reflection` is the **expected success**, with `preservesAgency`/`uncertaintyVisible` true. |
| Claim confidence → `Recommendation` | `VoiceSelectionInputs` has no confidence field (existing negative test); not introduced by the harness. |
| Complete traceability alone → `Recommendation` | the fixture has complete trace yet `tentative` ceiling ⇒ Reflection; asserted. |
| Placeholder purpose/risk ignored | `purpose` and `risk` are passed in and gated; the test asserts the gates ran (case `gateResults` non-empty). |
| A new layer turns this into a UI/API/DB/LLM demo | §2 forbids it; a structural assertion checks no such file/import exists. |

---

## 7. Relationship To Existing Core

[FACT] This slice **uses but does not redefine** any module:
- `observation` owns intake + provenance + the raw≠meaning judgment (signal detection);
- `reasoning` owns the hypothesis/evidence lifecycle;
- `understanding` owns dimension-specific, earned learning and the `SafeVoiceCeiling`;
- `decision-support` owns support integrity, traceability *verification*, and voice selection.

[DECISION] **No module becomes the owner of the full story.** The integration test *composes* the surfaces; it lives in a neutral `__tests__` root precisely so no module appears to own the chain. No module source is edited. The seam adds zero domain reasoning — it only sequences existing calls and reads results.

---

## 8. Validation Strategy (the gate)

[DECISION] Before commit/push:
1. `npm run typecheck` — strict, clean.
2. `npm test` — full suite green, including the new integration test.
3. **All Implementation 001–005 tests remain green** (no regression).
4. **Dependency-boundary tests remain green** (`observation`/`reasoning`/`understanding` ⇏ `decision-support`, re-run over the import graph).
5. No forbidden top-level modules introduced (still exactly `observation`, `reasoning`, `understanding`, `decision-support`).
6. No UI/API/DB/LLM/event-bus file introduced.
7. `git status` clean except the intended new test (+ optional fixture helper) and this/the spec docs.
8. Follow the global commit/push policy.

---

## 9. Open Questions (do not block implementation)

[QUESTION] Carried forward:
- Where the first **production orchestration service** will live (and whether the harness becomes its skeleton).
- Whether future orchestration is **API-driven, CLI-driven, worker-driven, or event-driven**.
- How real **athlete purpose** context will be loaded (future `athlete` module).
- How **risk** context will be assessed from real data.
- How end-to-end **traceability is persisted**.
- How `Reflection` is **rendered** in UI / natural language later (without making copy domain truth).
- How **`AthleteDecision` feedback** re-enters as an Observation (Spec 009).
- Whether **Garmin/FIT or manual entry** becomes the first real input adapter (this slice uses a synthetic fixture).

[ASSUMPTION] None blocks implementation: the harness proves composition + restraint regardless of how these resolve.

---

## 10. Implementation Task Preview

[DECISION] **Implementation 006 — Add first end-to-end responsible Reflection integration test.**

**Scope:** add `src/modules/__tests__/end-to-end-responsible-reflection.test.ts` (and, optionally, `end-to-end-fixture.ts`) composing the four existing module public surfaces into the §3 scenario, asserting §4, preserving §6.

**Acceptance criteria:**
- the synthetic scenario runs through `observation → reasoning → understanding → decision-support`;
- the terminal output is `DecisionSupport` with `VoiceMode = Reflection`;
- `Recommendation` is **not** produced; `Reflection` is treated as success;
- traceability resolves from the terminal output back to the `ObservationSet`;
- the quality limitation survives the chain (uncertainty visible);
- agency preserved; `AthleteDecision` not owned;
- the validation gate (§8) passes — all 001–005 tests and boundary tests stay green.

**The preview explicitly states this slice introduces:**
- **no** production application service (unless implementation proves it unavoidable — and it is not expected to);
- **no** UI;
- **no** API;
- **no** DB / persistence;
- **no** LLM output;
- **no** event bus;
- **no** new domain object/aggregate/policy;
- **no** `Recommendation` output.

---

## 11. Technical Constraints

[FACT] TypeScript strict · Node native test runner (`node:test` + `node:assert/strict`) · no external test framework · no framework · no DB · no event bus · no LLM. No constructor parameter properties. `import type` where appropriate; explicit `.ts` extensions. Explicit field declarations / frozen literals for any helper object. **Prefer tests/helpers over production code.**

---

## 12. Success Criteria

[ASSUMPTION] After this tech spec, Implementation 006 can be written **without deciding any new domain question in code** — every constructor, gate, and mapping already exists; the slice only sequences them and asserts the result. The future implementation answers:

> **"Can Aurora run the full reasoning core and still choose a modest, traceable, agency-preserving Reflection instead of overreaching into advice?"**

The answer is provable: a single synthetic `ObservationSet` flows forward, a single supported hypothesis earns a `Working`/`tentative` understanding, and the gates resolve — by their real logic — to `DecisionSupport` with `VoiceMode = Reflection`, traceable to the `ObservationSet`, with agency preserved and the decision left to the athlete.

---

*This is the sixth Technical Specification. It translates Spec 006 into a minimal, surgical plan: one integration test composing the existing core, no new domain, no infrastructure, no production service yet. It defers the production orchestration seam, persistence, rendering, and real input adapters to later specs.*

*Inputs: [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 005](./005-decision-support-voice.md) · [Tech Spec 005A](./005-decision-support-voice-tech.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
