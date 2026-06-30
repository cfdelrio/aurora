# Aurora — Specification 035 — External Renderable Assembly Contract Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral contract** an
> externally assembled `RenderableDomainOutput` / `RenderingRequest` must satisfy before
> `offlineReflectionRuntime` (Impl 032R-A) may render it into an athlete-facing reflection — the seam that
> Spec 034R (`b34f317`) made the architectural decision. It is **behavioral-only**: it implements no code,
> writes no technical spec, amends no guard (AC20 untouched), revives no `reflection-composition` module,
> creates no top-level module, and modifies no production code/test/package. Recent sequence: `52a93f4`
> (Impl 032R-A) → `09e4487` (Spec 034, ⛔ Option C superseded) → `7ba0818` (Tech Spec 034A, ⛔ on hold) →
> `68029b9` (AC20 blocker) → `b34f317` (Spec 034R). Validation at authorship: `tsc --noEmit` clean;
> `node --test` 737/737.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document defines a **contract**, not code. It does not own the whole core, create a module,
  or amend AC20.
- `[DECISION]` Spec 034R already decided the seam exists (production receives a caller-supplied renderable;
  whole-core composition stays a test harness). Spec 035 makes that seam **safe and explicit**.

---

## 1. Context

`[FACT]` After Spec 034R: no production file owns the observation→reasoning→understanding→decision-support
chain (AC20). The product runtime (`offlineReflectionRuntime`) renders a `RenderingRequest` **supplied in its
command** — assembled outside any production whole-core owner (today: a test harness; tomorrow: a contracted
caller). The open question is what that externally assembled renderable must guarantee.

`[FACT]` Current reality (grounded): `offlineReflectionRuntime(command, deps)` takes `command.request:
RenderingRequest` and passes it **straight** into render-only `orchestrateRenderDeliver`. It performs **no
pre-screen** of the renderable; `validateDraft` runs **downstream inside the render path** (it checks the
rendered *draft* against the renderable's `allowedClaims`/`forbiddenClaims`/voice/uncertainty). The runtime
withholds delivery, creates no `AthleteDecision`.

---

## 2. Central Question

> If Aurora production code may not own the whole-core chain, what contract must an externally supplied
> `RenderableDomainOutput` / `RenderingRequest` satisfy before `offlineReflectionRuntime` may render it into
> an athlete-facing reflection?

The contract must preserve: AC20 unchanged; no production whole-core owner; whole-core composition remains a
test harness; **caller-supplied renderable ≠ trusted truth**; `RenderableDomainOutput ≠ RenderedMessage`;
`RenderingRequest ≠ provider call`; `renderable-ready ≠ validated draft`; `validated draft ≠ recommendation
quality`; `renderable reflection ≠ AthleteDecision`; `delivery success ≠ athlete decision`; `provider output
≠ truth`; `reflection ≠ prescription`.

---

## 3. Required Analysis (grounded in the real code)

1. **How the runtime receives the renderable.** `offlineReflectionRuntime` command carries `request:
   RenderingRequest` (= `{ renderable: RenderableDomainOutput }`), `submission`, `athleteRef`,
   `operatorMediation`, `timing`, `ids` (Impl 032R-A).
2. **Minimal `RenderingRequest` fields.** `{ renderable }` (+ optional style).
3. **`sourceCaseRef`.** A string on `RenderableDomainOutput` (and echoed into the rendered record).
4. **`RenderableDomainOutput` shape.** `sourceCaseRef`, `kind` (`support`/`inquiry`/`withholding`), `voice?`,
   `intent?`, `contentAtoms`, `allowedClaims`, `forbiddenClaims`, `uncertaintyVisibleRequired`, `limitations`,
   `traceability` (`{ status, summary, observationSetId? }`), `agencyRequired`, `conditions`.
5. **`TerminalOutput → RenderableDomainOutput` today.** The production `renderableFromTerminalOutput({
   sourceCaseRef, output })` (rendering public surface) — preserves voice/kind/uncertainty/traceability from a
   real decision-support `TerminalOutput`.
6. **What the Impl 006 harness proves.** The whole chain composes while keeping restraint, traceability,
   uncertainty, and agency (terminal output is DecisionSupport/Reflection, never Recommendation).
7. **What the harness must not become.** A production service (AC20). It stays the proof, not the path.
8. **What AC20 forbids.** A new top-level module (AC20a) and any production file importing all four core
   surfaces (AC20b). The contract must not require either.
9. **What the runtime is allowed to consume.** A `RenderableDomainOutput` (assembled elsewhere) + the
   production `renderableFromTerminalOutput` mapping. It may render-only and withhold delivery.
10. **What the runtime must not infer from a caller-supplied renderable.** That its `allowedClaims` are
    actually traceable to real evidence; that its content is true; that it may be delivered or treated as an
    `AthleteDecision`. The runtime cannot re-derive truth (that needs the whole core it may not own).
11. **Provenance needed?** **Yes** — `traceability` (status/summary/observationSetId) + `sourceCaseRef` must
    be present and non-empty for an inference-bearing reflection.
12. **Assembly-method metadata needed?** **Useful** — a safe marker of how it was assembled (e.g. from a real
    `TerminalOutput` via `renderableFromTerminalOutput`, vs. hand-built) so the runtime/audit can record the
    assembly posture without trusting content. (Behavioral requirement; exact field deferred to 035A.)
13. **Trace refs needed?** **Yes** — `traceability` must reference the recorded set / case the claims derive
    from; missing traceability ⇒ fail closed.
14. **Uncertainty / inference markers needed?** **Yes** — `uncertaintyVisibleRequired: true` for inference;
    voice within the reflection ceiling (never a directive/Recommendation voice); `agencyRequired: true`.
15. **Accept without evidence refs?** **No** — an inference-bearing `support`/`inquiry` renderable without
    traceability fails closed (or must be a `withholding`).
16. **Carry unsupported claims?** **No** — `allowedClaims` must be claims the caller guarantees are
    traceable; the contract forbids smuggling unsupported certainty; `validateDraft` then keeps the draft
    within `allowedClaims`/`forbiddenClaims`.
17. **Reject or withhold unsafe renderables?** The runtime must **fail closed** (withhold/reject) on missing
    provenance, missing uncertainty markers, a prescriptive voice/intent, or absent traceability.
18. **Validation downstream mandatory?** **Yes** — `validateDraft` stays the mandatory downstream structural
    gate; the contract never bypasses it.

`[FACT]` The honest crux: `validateDraft` enforces the renderable's **structure** (draft stays within
allowed/forbidden claims, voice, uncertainty), but it **cannot verify** that the `allowedClaims` themselves
trace to real evidence — that requires the whole-core chain AC20 keeps in the test harness. So the contract
splits responsibility into three tiers (§5).

---

## 4. Product Thesis Requirements

The contract protects: *Aurora is not a dashboard; not an AI coach; not "selling AI"; Aurora advises, the
athlete decides; Aurora never presents inference as fact.* It must **prevent an external caller from smuggling
a prescription or unsupported certainty into an athlete-facing reflection.**

---

## 5. Decision Framework & Options

`[FACT]` The seam's safety decomposes into three tiers:
- **Tier 1 — Caller contractual guarantees** (NOT machine-verifiable without the whole core): the renderable's
  claims trace to real evidence; inference is framed as inference, never asserted as fact; no prescription /
  unsupported certainty. The assembler (test harness today, or a contracted caller) is responsible; the safest
  production assembly path is a real decision-support `TerminalOutput → renderableFromTerminalOutput`.
- **Tier 2 — Runtime admission checks** (machine-verifiable structural pre-screen; a *future* implementation):
  provenance/`traceability` present & non-empty; voice within the reflection ceiling (no directive voice);
  `uncertaintyVisibleRequired: true` for inference; `agencyRequired: true`; `forbiddenClaims` present; `kind`
  ∈ {support, inquiry, withholding}. Failure ⇒ **withhold/reject** (fail closed).
- **Tier 3 — Downstream mandatory validation** (already enforced): `validateDraft` keeps the rendered draft
  within the renderable's `allowedClaims`/`forbiddenClaims`/voice/uncertainty.

**Options evaluated:**

- **Option A — No formal contract (keep the seam as-is).** *Rejected* — leaves the seam under-specified; an
  external caller could supply a prescriptive or untraceable renderable and the runtime would render it
  (validateDraft only checks the draft against the renderable's own claims, not the claims' faithfulness).
- **Option B — Formal external renderable assembly contract** (provenance / trace / inference-safety
  requirements + the three tiers). **Selected (with C).**
- **Option C — Require external renderables to originate from a `TerminalOutput` via
  `renderableFromTerminalOutput`.** **Adopted as the *preferred* production assembly path** within B (it is
  the safest existing surface — it preserves voice/kind/uncertainty/traceability from real decision-support).
  Not made the *sole* path (the test harness may hand-build renderables for proof), but it is the recommended,
  contract-satisfying route for any non-test caller.
- **Option D — Accept only test-harness-built renderables.** *Rejected* — would make the product runtime
  unusable outside tests.
- **Option E — Reopen AC20 to allow production composition.** *Rejected here* — a separate, deliberate AC20
  amendment decision (its own spec + sign-off), not part of this contract.

---

## 6. Decision

`[DECISION]` **External renderable assembly contract: Option B + C — a formal contract with provenance /
traceability / inference-safety requirements, whose preferred production assembly path is a real
decision-support `TerminalOutput` mapped through `renderableFromTerminalOutput`.**

- **Who may assemble the renderable.** The Impl 006 test harness (for proof), or a non-test caller that
  satisfies this contract — **preferably** by mapping a real decision-support `TerminalOutput` via the
  production `renderableFromTerminalOutput`. No production whole-core composer assembles it (AC20).
- **What the runtime may trust.** The renderable's **structure** — `validateDraft` enforces that the rendered
  draft stays within `allowedClaims`/`forbiddenClaims`/voice/uncertainty.
- **What the runtime must not trust.** That the `allowedClaims` are themselves true or evidence-traceable
  (Tier 1 is the caller's guarantee), that it may be delivered, or that it is an `AthleteDecision`.
- **Required provenance.** `sourceCaseRef` non-empty + `traceability` (status/summary, and
  `observationSetId` when the claim derives from a recorded set) present for an inference-bearing renderable.
- **Required trace refs.** `traceability` must reference the case/recorded set the claims derive from; absent
  ⇒ fail closed (or the renderable must be a `withholding`).
- **Required inference/fact markers.** `uncertaintyVisibleRequired: true` for inference; `agencyRequired:
  true`; voice within the reflection ceiling (never a directive/Recommendation voice).
- **Required claim-support posture.** `allowedClaims` must be claims the caller guarantees are traceable;
  `forbiddenClaims` populated; **no unsupported certainty, no prescription**.
- **TerminalOutput → renderableFromTerminalOutput.** **Preferred and recommended** for any non-test caller
  (safest existing path); **required** posture-equivalence (provenance + uncertainty preserved) for any
  hand-built renderable that bypasses it.
- **How unsupported claims fail closed.** A renderable missing provenance/traceability, lacking uncertainty
  markers, or carrying a prescriptive voice/intent must be **withheld/rejected** by the runtime admission
  check (Tier 2) — never rendered into an athlete-facing reflection.
- **How `validateDraft` stays mandatory.** It remains the downstream structural gate (Tier 3); the contract
  adds an *upstream admission* posture, it never removes validation.
- **How `AthleteDecision` stays athlete-owned.** The contract creates none; a decision remains
  athlete-declared/reported (Impl 009); delivery remains withheld.
- **How this preserves AC20.** It defines a **contract on data the runtime receives**, not a new module and
  not a production whole-core composer. AC20a + AC20b untouched.
- **How this informs a technical spec.** `Tech Spec 035A` plans the **Tier 2 admission check** as a runtime
  pre-screen (or a small rendering-side validator extension) that fails closed on unsafe renderables —
  **without** owning the whole core, importing all four cores, or creating a module.

`[ASSUMPTION]` The headline: **the runtime cannot re-derive truth, so the contract makes explicit what the
caller must guarantee, what the runtime can structurally check (and reject on), and what `validateDraft`
already enforces** — keeping the athlete-facing reflection safe without a production whole-core owner.

---

## 7. Required Behavioral Rules

An externally assembled renderable, and the runtime that admits it, must ensure it:

```text
must not be treated as truth · must not bypass validateDraft · must not bypass the safety voice ceiling ·
must not bypass the inference/fact distinction · must not create evidence · must not create AthleteDecision ·
must not trigger delivery · must not call a live provider · must not persist raw provider output ·
must not contain hidden reasoning · must not contain raw provider output · must not contain unsupported prescriptions ·
must not erase uncertainty · must not claim observation is evidence unless existing rules support it ·
must not claim signal is evidence unless existing rules support it · must not claim hypothesis as fact ·
must not claim understanding as permanent truth
```

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Safe externally assembled renderable.** *Given* a renderable with required provenance, trace refs,
uncertainty markers, and no unsupported prescription, *when* `offlineReflectionRuntime` renders it, *then* the
runtime may produce a validated reflection with delivery withheld.

**UC2 — Missing provenance.** *Given* a renderable without provenance/source refs, *when* the runtime
considers it, *then* it must fail closed or withhold rendering.

**UC3 — Unsupported certainty.** *Given* a renderable that asserts a hypothesis as fact, *when* the runtime
considers it, *then* it must reject or withhold.

**UC4 — Prescription disguised as reflection.** *Given* a renderable that prescribes a training action
without athlete decision ownership, *when* the runtime considers it, *then* it must reject or withhold.

**UC5 — Test harness renderable.** *Given* the Impl 006 harness produces a renderable, *when* used in tests,
*then* it remains proof of compatibility, not a production whole-core service.

**UC6 — TerminalOutput conversion.** *Given* a caller has a valid `TerminalOutput`, *when* it is converted
through `renderableFromTerminalOutput`, *then* the resulting `RenderableDomainOutput` satisfies the contract's
structural posture when provenance and uncertainty are preserved.

**UC7 — AC20.** *Given* the contract exists, *when* implementation is considered, *then* no production
whole-core composer is introduced and AC20 remains intact.

**UC8 — AthleteDecision.** *Given* a safe reflection is rendered, *when* the athlete responds later, *then*
only athlete-declared/reported input can create an `AthleteDecision`.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- **AC20 unchanged.** ✅ (contract on data, not a module).
- **No new top-level module required.** ✅
- **No production file owns all four core surfaces.** ✅
- **Spec 034 Option C remains superseded.** ✅
- **Tech Spec 034A remains on hold/superseded.** ✅
- **`offlineReflectionRuntime` keeps its injected-renderable seam.** ✅ (unchanged).
- **External renderable is not treated as truth.** ✅ (Tier 1 caller guarantee; runtime trusts structure only).
- **Missing provenance fails closed.** ✅ (Tier 2).
- **Unsupported certainty fails closed.** ✅ (Tier 2 + Tier 3).
- **Prescription disguised as reflection fails closed.** ✅ (voice ceiling / intent check).
- **`validateDraft` remains downstream mandatory.** ✅ (Tier 3).
- **Delivery remains withheld.** ✅ (Impl 032R-A).
- **`AthleteDecision` is not created.** ✅
- **No live provider called by the contract.** ✅
- **No runtime/API/UI/CLI/worker code added; no DB/auth/deployment/CI/SDK files; no package change.** ✅
  (docs-only).
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  737/737. ✅

---

## 10. Relationship To Existing Architecture

- **Spec 034R** — production composition remains caller-supplied; this contract makes that seam safe/explicit.
- **AC20** — no production whole-core owner; the contract requires none.
- **Impl 032R-A** — `offlineReflectionRuntime` receives the injected renderable; the contract governs what it
  may admit (Tier 2 is a future pre-screen).
- **Impl 006** — the whole-core harness remains proof only (UC5).
- **Impl 014** — `validateDraft` remains the mandatory downstream structural gate (Tier 3).
- **rendering** — `renderableFromTerminalOutput` is the preferred production assembly path (Option C).
- **Impl 009** — `AthleteDecision` remains athlete-declared/reported.
- **Spec 033 / Spec 032R** — the athlete is the decision owner; the runtime is operator-mediated offline,
  delivery withheld.

---

## 11. Forbidden Behaviors

```text
implementation code · technical implementation plan · AC20 amendment · new top-level production module ·
production whole-core composer · split workaround around AC20 · application-orchestration upstream imports ·
decision-support upstream dependency inversion · runtime/API/UI/CLI/worker code · DB/schema/migrations ·
auth/session/user implementation · deployment/CI files · package script changes · SDK/dependency changes ·
live provider enablement · automatic delivery · AthleteDecision auto-creation · renderable treated as truth ·
unsupported prescription · hidden reasoning · raw provider output
```

---

## 12. Recommended Next Mission

`[DECISION]` **Tech Spec 035A — External Renderable Assembly Contract Implementation Plan** *(recommended)* —
a TS-strict plan for the **Tier 2 admission check**: where it lives (a runtime pre-screen inside
`offlineReflectionRuntime`, or a small rendering-side renderable validator — chosen against the real code,
without owning the whole core or creating a module), the exact structural checks (provenance/traceability
present, voice ceiling, uncertainty required, agency required, no prescriptive intent), the closed
admit/withhold disposition, and deterministic fake-driven tests — preserving AC20, `validateDraft`
(downstream), delivery-withheld, and no-AthleteDecision.

Alternatively, if the contract is treated as purely documentary for now (the current runtime + downstream
`validateDraft` already cover Tier 3, and Tier 1 is a caller guarantee): **Docs consolidation post
034R/035**.

---

## 13. Success Criteria

Can Aurora make the caller-supplied renderable seam **safe and explicit** — defining what an externally
assembled `RenderableDomainOutput`/`RenderingRequest` must guarantee before the runtime renders it — **without**
owning the whole core, amending AC20, weakening any guard, creating a module, enabling live calls,
auto-delivering, or auto-creating an `AthleteDecision`? **Yes — via Option B + C:** a three-tier contract
(caller guarantees + runtime admission checks + mandatory downstream `validateDraft`), with
`TerminalOutput → renderableFromTerminalOutput` as the preferred production assembly path, and `Tech Spec
035A` to plan the admission check. AC20 stays intact; Spec 034 Option C stays superseded; Tech Spec 034A stays
on hold. Validation at authorship: `tsc --noEmit` clean; `node --test` 737/737; no code, test, package,
runtime, deployment, CI, SDK, or dependency change.
