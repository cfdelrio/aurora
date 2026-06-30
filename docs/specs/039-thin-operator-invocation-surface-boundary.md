# Aurora — Specification 039 — Thin Operator Invocation Surface Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral boundary** for a *thin
> operator invocation surface* — a reusable seam that means "invoke the operator session runbook once" — the
> continuation selected by the post-038 roadmap checkpoint (`d448b4b`). It is **behavioral-only**: it implements
> no code, writes no technical spec, modifies no production code/test, creates no CLI/runtime shell/script/package
> command, edits no package file, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20
> untouched), and creates no production whole-core composer. Recent sequence: `aebb11c` (Impl 038-A) → `85b8132`
> (Docs) → `d448b4b` (Roadmap checkpoint post-038). Validation at authorship: `tsc --noEmit` clean; `node --test`
> 803/803.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a behavioral
boundary (the invocation seam); it adds no code. **Its purpose is not to create a CLI/API/script/package command;
it is to define the boundary a future CLI/API/operator tool could sit behind.**

---

## 1. Context

`[FACT]` Aurora's operator session runbook is **proven (test-only) and documented (docs-only checklist)**:

```text
operator-session runbook → athlete manual input → caller-assembled RenderingRequest
→ preferred TerminalOutput → renderableFromTerminalOutput → offlineReflectionRuntime → admitExternalRenderable
→ validateDraft → reflection-ready → delivery withheld → no AthleteDecision
→ later explicit athlete-declared / athlete-reported capture → recordAthleteDecision → SubjectiveObservation only
```

`[FACT]` The production runtime surface is exactly two pure functions — `offlineReflectionRuntime(command, deps)`
and `admitExternalRenderable(request)`. `offlineReflectionRuntime` already returns a **safe, redacted-by-design
outcome**: `OfflineReflectionRuntimeOutcome = { status: OfflineReflectionStatus; reflection?:
SafeReflectionProjection; deliveryWithheld: true; mediation: { operatorRef }; decisionCapture:
DecisionCapturePrompt; intake: { status }; admissionReason?: ExternalRenderableRejectionReason; trace:
OrchestrationTrace; rawRetained: false }`. `OfflineReflectionStatus = reflection-ready | input-rejected |
renderable-inadmissible | not-rendered | recording-failed | unexpected-failure`.

`[GAP]` There is **no reusable seam** that names what it means to *invoke the runbook once*: a caller (today, and
a future CLI/API tomorrow) still hand-sequences "assemble → admit → run → read outcome." Spec 038 gave the
*procedure* (a checklist + a test proof); Spec 039 names the **invocation boundary** — the inputs it accepts, the
**safe result envelope** it returns, the dispositions it surfaces, and the safety obligations it enforces —
**without** becoming a CLI, script, package command, API/UI, deployment, live-provider enablement, delivery
mechanism, `AthleteDecision` creator, truth validator, or production whole-core composer.

---

## 2. Central Question

> What does it mean to **invoke the operator session runbook once** through a **reusable seam**, without making
> that seam a CLI, runtime shell, deployment surface, live-provider default, delivery mechanism, `AthleteDecision`
> creator, or production whole-core composer?

The seam must keep these distinctions legible (never collapse):

```text
invocation surface ≠ CLI · invocation surface ≠ script · invocation surface ≠ package command ·
invocation surface ≠ deployment · invocation surface ≠ API/UI · invocation surface ≠ live-provider enablement ·
invocation surface ≠ delivery mechanism · invocation surface ≠ production whole-core composer ·
invocation surface ≠ AthleteDecision creator · invocation surface ≠ truth validator
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."*

The invocation surface must **not** convert operational execution into an athlete decision, delivery, truth, or
recommendation quality. It runs the runbook once and reports a **safe** result; it decides nothing for the
athlete and delivers nothing.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **What the seam would receive.** A **caller-assembled** invocation input: the athlete `submission`, the
   `athleteRef`, the **caller-assembled `RenderingRequest`** (preferably `renderableFromTerminalOutput`-projected),
   the `OperatorMediationMarker`, the `OrchestrationTiming`/`ids` — i.e. the existing
   `OfflineReflectionRuntimeCommand<TSubmission>` — plus the injected `OfflineReflectionRuntimeDependencies`
   (deterministic fakes by default).
2. **What the seam would call.** `admitExternalRenderable(request)` (Tier 2, before rendering) and
   `offlineReflectionRuntime(command, deps)` — the existing functions, unchanged. Nothing else.
3. **What the seam must not assemble.** The renderable from observations (whole-core composer — AC20b); a live
   provider client; a delivery sink; a real secret; an `AthleteDecision`.
4. **What the seam must not infer.** That an admitted renderable is true; that a reflection is a decision; that
   silence/behavior is a decision; that following Aurora is success.
5. **What safe result/envelope it should expose.** A redacted **session result envelope** mirroring the runtime
   outcome: `status`/disposition, `deliveryWithheld`, a safe `admissionReason?` (closed code) when inadmissible,
   a **reference** to the safe reflection when `reflection-ready` (not raw provider output), the
   `decisionCapture` invitation/ref, a redacted `trace` summary, and `rawRetained: false` — **no** raw provider
   output, hidden reasoning, secrets, or delivery artifact.
6. **What runtime statuses it should mirror or normalize.** Use the **exact existing**
   `OfflineReflectionStatus` values: `reflection-ready`, `renderable-inadmissible`, `not-rendered`,
   `input-rejected`, plus `recording-failed`/`unexpected-failure` where justified. The seam **preserves**
   dispositions; it does not invent or rename statuses.
7. **What redaction rules are required.** The envelope must never carry raw provider draft/response, prompt,
   payload, secret/`ProviderSecretRef` value, `process.env` value, delivery artifact, or any `AthleteDecision`
   shape (`choice`/`rationale`). It restates the runtime's `rawRetained: false` discipline.
8. **`reflection-ready`.** The envelope reports `reflection-ready`, `deliveryWithheld: true`, a safe reflection
   reference, and the `decisionCapture` invitation; it creates **no** `AthleteDecision`.
9. **`renderable-inadmissible`.** The envelope reports `renderable-inadmissible` with the safe `admissionReason`
   and **no** provider/render/validate/delivery/decision.
10. **`not-rendered`.** The envelope reports `not-rendered` with **no** raw provider output and **no** delivery;
    the provider draft is not safe.
11. **`input-rejected`.** The envelope reports `input-rejected` and stops before admission/rendering.
12. **How delivery withheld is represented.** Always `deliveryWithheld: true`; the envelope carries no delivery
    record/request id. Delivery withheld ≠ delivery failure.
13. **How the decision-capture invitation/ref is represented.** Exactly as the runtime's `DecisionCapturePrompt`
    — `{ kind: "athlete-decision-invitation", athleteRef, acceptableSources: ["athlete-declared",
    "athlete-reported"] }` — an invitation only; the seam creates no decision.
14. **How later athlete decision capture remains separate.** It is **not** part of invocation. After an envelope
    reports `reflection-ready`, a **separate, explicit** flow (Impl 037-A documented usage) records an
    `athlete-declared`/`athlete-reported` decision via `athleteDecision(...)` + `decisionContext({
    decisionSupportCaseRef })` + `recordAthleteDecision(...)`.
15. **How no-default-live-call is preserved.** The seam reads no `process.env`, resolves no real secret, and
    calls no live provider by default; live behavior stays behind the existing opt-in gates (Impl 021/026/027)
    and is out of scope here.
16. **How a deterministic fake provider remains the default.** The injected deps default to the deterministic
    `FakeProviderClient` + in-memory repos used by the runbook proof; the seam never silently substitutes a live
    client.
17. **How AC20 remains intact.** The seam consumes a **caller-supplied** `RenderingRequest`; the whole-core
    composition that produces the `TerminalOutput` stays in `__tests__/`. No production file owns the whole core;
    no `reflection-composition` module; no production whole-core composer.
18. **How a future CLI/API/script would sit behind this seam.** A future surface would **call the seam**, inherit
    its inputs/envelope/redaction/no-live/no-delivery rules, and add only transport/formatting — never re-derive
    the sequence or relax the safety rules. The seam is the contract; the surface is downstream.
19. **What remains out of scope.** Any CLI/runtime shell/script/package command, API/UI/worker, deployment/
    provider/DB/auth/CI/SDK decision, live-provider enablement, real delivery channel, persistence of session/
    event records, a production wrapper that adds no safety, and the observation→renderable production composition
    (034R: caller-supplied / test harness).

`[FACT]` Decisive consequence: the runtime **already** returns a safe, redacted, disposition-bearing outcome. The
seam's value is **naming the invocation boundary** (one reusable handle + a safe envelope contract + the safety
obligations) so a future surface has something to sit behind — not adding new runtime behavior. Any
implementation must add **safe normalization/envelope discipline**, not new capability.

---

## 5. Decision Framework & Criteria

Evaluated on: least irreversible commitment · AC20 preservation · no-default-live-call preservation ·
delivery-withheld preservation · athlete decision ownership · redaction safety · future CLI/API compatibility ·
fake-testability · no premature deployment/provider choice · no DB/auth/CI dependency · no package-script
requirement.

| Option | Verdict |
| --- | --- |
| **A — Behavioral invocation seam only; no implementation yet** | **Selected (core).** Defines the boundary now; depends only on what exists; least irreversible; AC20-safe; fully fake-testable. |
| **B — A future thin function-level invocation helper over the existing runtime + runbook** | **Adopted as direction (deferred).** Permitted later **only** if it adds a safe envelope/redaction/normalization beyond calling the runtime; implementation deferred to Tech Spec 039A. |
| **C — Test-only invocation helper / harness only** | **Adopted as the likely first implementation path** (in Tech Spec 039A): prove the seam with deterministic fakes before any production helper. |
| D — Production wrapper over `offlineReflectionRuntime` | **Rejected unless it adds safety.** A wrapper that only forwards the call adds ceremony, not safety, and risks importing upstream surfaces; only justified if it owns the safe envelope/redaction and imports no core. |
| E — CLI/script/package command now | **Rejected — premature surface.** Must sit behind the seam, not precede it. |
| F — API/UI/operator tool now | **Rejected — premature surface.** Same reason as E, with deployment risk. |
| G — Reopen AC20 / production whole-core composition | **Rejected.** 034 Option C superseded, 034A on hold, 034R standing; no need; out of scope. |
| H — Defer the invocation boundary | **Rejected.** The runbook is stable enough to define the seam now. |

---

## 6. Decision

`[DECISION]` **Thin operator invocation surface = a reusable *behavioral seam* for invoking the existing operator
session runbook once (Option A), with a future thin function-level helper deferred (Option B) and a test-only
helper as the likely first implementation path (Option C).** The seam accepts **only caller-assembled inputs and
injected deterministic dependencies**, calls **only** the existing `admitExternalRenderable` +
`offlineReflectionRuntime`, and returns a **safe, redacted session result envelope** that **mirrors the existing
runtime dispositions**. Implementation, CLI, scripts, package commands, API/UI, live provider, real-secret
resolution, delivery, persistence, and production whole-core composition all remain **deferred / out of scope**.

**What inputs the seam accepts.** The existing `OfflineReflectionRuntimeCommand<TSubmission>` (athlete
`submission`, `athleteRef`, caller-assembled `RenderingRequest`, `operatorMediation`, `timing`/`ids`) — assembled
**outside** the seam (the seam does not assemble the renderable).

**What dependencies are injected.** The existing `OfflineReflectionRuntimeDependencies<TSubmission>` —
`runManualIntake`, provider `client` (**deterministic fake by default**), `config`, `secret` ref (fake),
`rendererKind`, `providerAdapterKind`, `renderedMessageRecordRepository`. No global service locator; no
`process.env`.

**What it may call.** `admitExternalRenderable(request)` (Tier 2, before rendering) and
`offlineReflectionRuntime(command, deps)` — unchanged.

**What it must not call.** A live provider (by default), a real-secret resolver, a delivery sink,
`recordAthleteDecision`/`athleteDecision` (decision capture is separate), or any whole-core assembly in
production.

**What statuses/dispositions it exposes.** The exact `OfflineReflectionStatus` values: `reflection-ready`,
`renderable-inadmissible`, `not-rendered`, `input-rejected`, and `recording-failed`/`unexpected-failure` where
justified. No renamed/invented status.

**What redaction rules apply.** The envelope restates `rawRetained: false`: no raw provider draft/response,
prompt, payload, secret value, `process.env` value, delivery artifact, or `AthleteDecision` shape.

**How `deliveryWithheld` is represented.** Always `true`; no delivery record/request id; delivery withheld ≠
delivery failure.

**How the decision-capture prompt/ref is represented.** Exactly the runtime's `DecisionCapturePrompt`
invitation/ref — an invitation only.

**How later decision capture remains separate.** Not part of invocation; performed afterward by the explicit
Impl 037-A documented-usage flow, session-linked via `decisionContext({ decisionSupportCaseRef })`.

**Why this is not CLI/script/API/deployment.** The seam is a behavioral contract (a function-shaped boundary), not
a transport, an entrypoint, or a deployed surface; CLI/script/package/API/UI are explicitly deferred to sit
*behind* it.

**Why this is not a production wrapper unless later selected.** A wrapper is justified only if it owns the safe
envelope/redaction and imports no core surface (Tech Spec 039A decides); a forward-only wrapper adds ceremony,
not safety.

**Why this is not a whole-core composer.** It consumes a caller-supplied `RenderingRequest`; the whole-core
composition stays a test harness (AC20).

**What the next technical spec must decide.** Whether the seam is implemented as a **test-only** helper (Option C)
or a **production application-level** helper (Option B); the exact function name/input shape; the exact safe
**result envelope type** (and whether it wraps `offlineReflectionRuntime` or only normalizes its outcome);
whether redaction utilities already exist or are needed; how to test no-live-provider/no-delivery by default; how
to keep package scripts unchanged; and whether a CLI/API stays deferred until after the helper proof.
(`Tech Spec 039A`.)

`[ASSUMPTION]` The headline: **the runtime already returns a safe outcome; Spec 039 names the *invocation
boundary* so a future surface has a safe contract to sit behind.** The seam runs the runbook once with
caller-assembled inputs + deterministic deps and returns a redacted, disposition-bearing envelope — deciding
nothing, delivering nothing, calling no live provider, and owning no whole core.

---

## 7. Required Behavioral Rules

**Must require:** a **caller-assembled `RenderingRequest`**; **injected dependencies**; a **deterministic fake
provider by default**; **delivery withheld by default**; a **safe redacted result envelope**; the runtime
**status/disposition preserved**; the **decision-capture invitation/ref exposed only as an invitation/ref**;
later **decision capture kept separate**; **no automatic `AthleteDecision`**; **no automatic delivery**; **no
automatic live-provider call**; **no production whole-core composition**.

**Must forbid:** reading `process.env`; resolving real secrets by default; calling a live provider by default;
calling a delivery sink; creating an `AthleteDecision`; inferring an athlete decision; assembling the whole-core
chain in production; creating a CLI/script/package command; creating an API/UI/deployment surface; persisting
session/event/DB records; treating `reflection-ready` as delivered; treating `reflection-ready` as a decision;
treating admission as truth; treating `validateDraft` as recommendation quality.

---

## 8. Required Result / Envelope Semantics

A safe result envelope should conceptually include:

```text
status / disposition (exact OfflineReflectionStatus) · deliveryWithheld (always true) ·
safe reason code if failed · safe admissionReason if inadmissible · safe reflection REFERENCE if reflection-ready ·
decision-capture invitation/ref if present · redacted trace summary · rawRetained: false
— and NEVER: raw provider output · hidden reasoning · raw secrets · delivery artifact ·
  an AthleteDecision (unless supplied later by the separate capture flow)
```

Required dispositions (exact existing runtime statuses where possible):

```text
reflection-ready · renderable-inadmissible · not-rendered · input-rejected · (recording-failed / unexpected-failure if justified)
```

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Safe invocation.** *Given* caller-assembled athlete input and `RenderingRequest`, *when* the operator
invokes the seam once with deterministic dependencies, *then* the result envelope reports `reflection-ready`,
`deliveryWithheld: true`, and **no `AthleteDecision`**.

**UC2 — Inadmissible invocation.** *Given* an inadmissible `RenderingRequest`, *when* the seam is invoked, *then*
the envelope reports `renderable-inadmissible` with a safe reason code and **no** provider/render/validate/
delivery/decision.

**UC3 — Not-rendered invocation.** *Given* admitted input but an invalid rendered draft, *when* rendering fails
validation, *then* the envelope reports `not-rendered` **without** raw provider output and **without** delivery.

**UC4 — Input rejected.** *Given* invalid manual input, *when* invoked, *then* the envelope reports
`input-rejected` and stops before admission/rendering.

**UC5 — Later decision capture.** *Given* a `reflection-ready` envelope, *when* the athlete later declares/reports
a decision, *then* decision capture remains a **separate** flow and is **not** created by invocation.

**UC6 — No live provider default.** *Given* no explicit live-provider opt-in, *when* invoked, *then* the seam
**must not** call a live provider or resolve real secrets.

**UC7 — Future CLI/API.** *Given* a future CLI/API wants to run a session, *when* designed, *then* it **must sit
behind** this seam and preserve the redaction / no-live / no-delivery rules.

**UC8 — AC20.** *Given* a caller-supplied `RenderingRequest`, *when* the seam is specified, *then* **no**
production whole-core composer is introduced.

---

## 10. Required Acceptance Criteria (Given / When / Then)

- The invocation surface is not a CLI/script/API/deployment. ✅
- Caller assembly remains **outside** the seam. ✅
- A `RenderingRequest` is not truth. ✅
- Admission success is not an evidence-backed fact. ✅
- `validateDraft` success is not recommendation quality. ✅
- `reflection-ready` is not delivered. ✅
- `reflection-ready` is not an `AthleteDecision`. ✅
- `deliveryWithheld` is preserved. ✅
- No live provider by default. ✅
- No real-secret resolution by default. ✅
- No delivery sink by default. ✅
- No `AthleteDecision` creation. ✅
- Later decision capture remains separate. ✅
- The safe envelope excludes raw provider output. ✅
- The safe envelope excludes hidden reasoning. ✅
- The safe envelope excludes secrets. ✅
- AC20 remains unchanged. ✅
- No implementation/code is added by this spec (docs-only). ✅
- All existing tests remain green (803/803). ✅

---

## 11. Relationship To Existing Architecture

- **Spec 038 / Impl 038-A** — the operator session runbook (proof + checklist); the seam names "invoke it once."
- **Spec 037 / Impl 037-A** — post-reflection decision capture; stays a **separate** flow after invocation.
- **Spec 036 / Impl 036-A** — the first reflection session proof; the seam runs the same path.
- **Spec 035 / Impl 035-A/B** — external renderable admission; the seam runs `admitExternalRenderable` before
  rendering.
- **Impl 032R-A** — `offlineReflectionRuntime`, the runtime the seam invokes (unchanged) and whose safe outcome
  the envelope mirrors.
- **Impl 027** — the operator **live smoke** is an *operational* smoke, **not** the product runbook/invocation
  surface; the seam stays separate from it.
- **Impl 021/022/023/028/029** — live-provider / secret boundaries remain **opt-in / deferred**; the seam never
  enables them by default.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the seam introduces no production whole-core
  composer.

---

## 12. Forbidden Behaviors

```text
implementation code · technical implementation plan · CLI/runtime shell creation · script creation ·
package script changes · API/UI creation · deployment/CI files · DB/schema/migrations · auth/session/user implementation ·
SDK/dependency changes · AC20 amendment · reflection-composition module · production whole-core composer ·
automatic live call · automatic real-secret resolution · automatic delivery · automatic AthleteDecision creation ·
system-created decision · AI-created decision · raw provider output in envelope · hidden reasoning in envelope ·
secret material in envelope · reflection-ready treated as delivery · reflection-ready treated as decision ·
delivery success treated as decision · silence treated as decision
```

---

## 13. Open Questions For Tech Spec 039A

1. The exact function name if a helper is selected.
2. The exact command/input shape.
3. The exact safe result/envelope type.
4. Whether the helper is test-only or production application-level.
5. Whether it wraps `offlineReflectionRuntime` or only normalizes its result.
6. Whether redaction utilities already exist or are needed.
7. How to test no-live-provider by default.
8. How to test no-delivery-sink by default.
9. How to keep package scripts unchanged.
10. Whether a CLI/API remains deferred until after the helper proof.

---

## 14. Success Criteria

Can Aurora define what it means to **invoke the operator session runbook once** through a **reusable seam** —
caller-assembled inputs + injected deterministic deps → `admitExternalRenderable` + `offlineReflectionRuntime` →
a **safe, redacted session result envelope** mirroring the runtime dispositions, with delivery withheld, no live
provider/real secret by default, no `AthleteDecision`, and later capture kept separate — **without** becoming a
CLI/script/package command, API/UI, deployment, live-provider/delivery mechanism, truth validator, production
wrapper-without-safety, or production whole-core composer, and **without** amending AC20? **Yes — via Option A
(with B/C deferred):** a behavioral invocation seam over the existing runtime/runbook, with implementation
(likely a test-only helper first) deferred to `Tech Spec 039A`. Validation at authorship: `tsc --noEmit` clean;
`node --test` 803/803; no code, test, package, runtime, CLI, deployment, CI, SDK, or dependency change; AC20
untouched.
