# Aurora — Specification 038 — Operator Session Runbook / Caller Assembly Contract

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral runbook** and
> **caller-assembly contract** for running Aurora's existing operator-mediated offline reflection loop — the
> continuation selected by the post-037 roadmap checkpoint (`e6323d1`). It is **behavioral-only**: it implements
> no code, writes no technical spec, modifies no production code/test, creates no CLI/runtime shell/script, edits
> no package file, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20 untouched), and
> creates no production whole-core composer. It does **not** reopen Spec 034 as an ordinary continuation. Recent
> sequence: `efd32ba` (Impl 037-A) → `c3da67b` (Docs) → `e6323d1` (Roadmap checkpoint post-037). Validation at
> authorship: `tsc --noEmit` clean; `node --test` 795/795.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a behavioral
boundary (a runbook + caller-assembly contract); it adds no code.

---

## 1. Context

`[FACT]` Aurora's athlete-input → reflection → athlete-owned decision-capture loop is **proven end-to-end, but
only as a test**:

```text
manual input → test-only whole-core responsible-reflection harness → TerminalOutput
→ renderableFromTerminalOutput → RenderingRequest → offlineReflectionRuntime → admitExternalRenderable
→ validateDraft → reflection-ready → delivery withheld → decision-capture invitation/ref
→ explicit athlete-declared / athlete-reported input → athleteDecision(...)
→ decisionContext({ decisionSupportCaseRef: sourceCaseRef }) → recordAthleteDecision(...)
→ SubjectiveObservation feedback only
```

`[FACT]` The **production runtime surface is exactly two pure functions**: `offlineReflectionRuntime(command,
deps)` and `admitExternalRenderable(request)` (both in `application-orchestration/application/`). They are
**invocable building blocks**, not an invocation surface. `offlineReflectionRuntime` **consumes a
caller-supplied `RenderingRequest`** (the reflection renderable is supplied in the command — the
observation→renderable bridge is deliberately a later/test-only slice) and **must not own the whole-core chain**
(AC20b). The only assemblers that satisfy the caller's contractual obligations today are the **Impl 006 / 036-A
test harness** and the production **`renderableFromTerminalOutput`** (from a real `TerminalOutput`).

`[GAP]` What is missing is the **runbook / caller-assembly contract**: *how a trusted operator/caller assembles
a contract-satisfying `RenderingRequest`, sequences the loop, and responds to each runtime outcome* — without a
CLI, runtime shell, deployment surface, live-provider default, or production whole-core composer. The runtime
*behavior* is specified (Spec 036) and the *external renderable contract* is specified + enforced (Spec 035 /
Impl 035-A/B); the **operator/caller procedure that ties them together is unspecified.**

---

## 2. Central Question

> What must a trusted operator/caller **do, supply, verify, and avoid** when assembling and running Aurora's
> current offline reflection loop, given that the production runtime consumes a caller-supplied `RenderingRequest`
> but must not own the whole-core chain?

The runbook must keep these distinctions legible (never collapse):

```text
runbook ≠ CLI · runbook ≠ runtime shell · runbook ≠ deployment · runbook ≠ API/UI ·
runbook ≠ live-provider enablement · runbook ≠ production whole-core composer ·
caller assembly ≠ machine proof of truth · operator mediation ≠ athlete decision · operator scribe ≠ decision source ·
reflection-ready ≠ delivered · reflection-ready ≠ AthleteDecision · decision capture ≠ runtime rendering ·
decision feedback ≠ Signal/Evidence
```

---

## 3. Product Thesis Alignment

*Aurora is not a dashboard. Aurora is not an AI coach. Aurora is not "selling AI." Aurora advises; the athlete
decides. Aurora never presents inference as fact. Aurora helps the athlete understand how training transforms
them and where it is taking them, so they decide better and sustain decisions under pressure.*

The runbook must **support athlete agency**: it must **not** convert operator action into an athlete decision,
and it must **not** convert rendering success into recommendation quality. The operator is a mediator/scribe;
the athlete is the product user and the sole decision owner.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **Who the operator/caller is.** A *trusted* human (or trusted calling context) who assembles inputs, invokes
   the two runtime functions, reviews the withheld reflection, and may later scribe an athlete-reported decision.
   The operator is mediation only — never the decision source.
2. **Who the athlete/product user is.** The person whose manual input seeds the session, who receives the
   reflection, and who alone declares/reports a decision (`athlete-declared`/`athlete-reported`).
3. **What the operator may assemble.** The athlete `submission` (manual input), a contract-satisfying
   `RenderingRequest` (via `req(renderable)` over a `RenderableDomainOutput`), the `OperatorMediationMarker`
   (`{ operatorRef, mediatedAt }`), the injected deps (`runManualIntake`, provider `client` — a **deterministic
   fake** by default, `config`, `secret` ref, `rendererKind`, `providerAdapterKind`,
   `renderedMessageRecordRepository`), and the `OrchestrationTiming`/`ids`.
4. **What the operator must not assemble.** A renderable **fabricated** to pass admission (claims not traceable
   to real evidence), a live-provider client enabled by default, a delivery sink, an `AthleteDecision`, or a
   *production whole-core composition* that derives the renderable from observations in a production file (AC20b).
5. **What athlete manual input must contain.** A well-formed `submission` the injected `runManualIntake` step
   (the caller's adapter over `observation.ingestManualInput`) can accept — a valid `athleteRef`, occasion,
   reporter, and entries; the step returns a safe id or closed reasons, never raw content.
6. **What `RenderingRequest` must contain.** A `RenderableDomainOutput` carrying `sourceCaseRef`, `kind`
   (`support`/`inquiry`/`withholding`), for `support` a `voice` ceiling + `intent`, `contentAtoms`,
   `allowedClaims` (support needs ≥ 1), `forbiddenClaims`, `uncertaintyVisibleRequired`, `limitations`,
   `agencyRequired`, optional `freshness`/`traceability`, and `conditions`.
7. **What Tier 1 caller guarantees must be made (NOT machine-proven).** That the `allowedClaims` actually trace
   to real evidence; that inference is **framed, not asserted as fact**; that no prescription / unsupported
   certainty / hidden reasoning is smuggled into the renderable; and that the voice does not exceed what the
   domain approved. Tier 2 admission cannot prove any of these (admitted ≠ true).
8. **How `TerminalOutput → renderableFromTerminalOutput` should be used / preferred.** It is the **preferred**
   assembly path: it builds the renderable as a *read-only projection of a domain-approved `TerminalOutput`*
   (evaluates no gate, selects no voice, invents nothing), so the Tier 1 guarantees are **structurally
   inherited from the domain decision** rather than asserted by hand. It is preferred, not strictly mandatory
   (see Decision), because a caller could in principle hand-build an admissible renderable — but doing so makes
   Tier 1 a manual, error-prone assertion.
9. **How the Impl 006 / 036-A harness may inform assembly without becoming a production service.** It is the
   reference assembly *recipe* — it composes the whole core **in `__tests__/`** to produce a real
   `TerminalOutput`, then projects it. The runbook may **mirror its sequence** and reuse the production
   `renderableFromTerminalOutput`, but the whole-core composition itself stays test-only (AC20); the runbook
   does not turn the harness into a production service.
10. **How admission checks Tier 2 structurally.** `admitExternalRenderable(request)` inspects the renderable's
    shape only — provenance (`sourceCaseRef`), supported `kind`, claim fields (support needs ≥ 1
    `allowedClaim`), `agencyRequired`, `uncertaintyVisibleRequired`, traceability where required, support voice
    ceiling — returning admitted or a closed rejection reason. Structural only; it proves shape, never truth.
11. **How `validateDraft` remains Tier 3 downstream.** Inside `offlineReflectionRuntime`, an **admitted**
    renderable still goes through the mandatory `validateDraft`: the rendered *draft* must stay within the
    renderable's `allowedClaims`/`forbiddenClaims`/voice/uncertainty. A failing draft → `not-rendered`.
12. **How delivery remains withheld.** The runtime **never delivers** (`deliveryWithheld: true` on every path;
    no delivery sink in deps); it surfaces a decision-capture invitation instead.
13. **How the decision-capture invitation/ref is used.** On `reflection-ready` the outcome carries
    `decisionCapture = { kind: "athlete-decision-invitation", athleteRef, acceptableSources:
    ["athlete-declared","athlete-reported"] }` — an **invitation only**, addressed to the athlete; it creates no
    decision.
14. **How later athlete-declared/reported decision capture is sequenced.** As a **separate, explicit** step
    *after* the session: the athlete declares/reports → `athleteDecision({ ..., source, context:
    decisionContext({ decisionSupportCaseRef: <the reflection's sourceCaseRef> }) })` →
    `recordAthleteDecision({ record, decision })` → (optional) re-entry as a `SubjectiveObservation` via the
    existing feedback loop (Impl 009). The link reuses the existing `decisionSupportCaseRef`; no new ref type.
15. **What happens on `reflection-ready`.** The operator may **review** the validated, delivery-withheld
    reflection and present it to the athlete under manual conditions — but must **not** treat it as delivered and
    must **not** record an `AthleteDecision` unless the athlete explicitly declares/reports one later.
16. **What happens on `renderable-inadmissible`.** The operator **stops**: no rendering, no delivery, no
    decision capture; and must **not** "fix" admission by stripping safety constraints from the renderable.
17. **What happens on `not-rendered`.** The operator **stops or revises** the caller assembly / provider-draft
    path; must **not** treat the provider draft as safe and must **not** deliver.
18. **What happens on `input-rejected`.** The operator **corrects** the athlete manual input and does **not**
    proceed to render.
19. **What happens if the athlete is silent.** **No `AthleteDecision`** — silence is not a decision; observed
    later behavior is not a decision either (it may only re-enter as a `SubjectiveObservation`).
20. **What must be recorded manually in the runbook, if anything.** Out of scope to *mandate* persistence: the
    operator may optionally record a captured decision through the **existing in-memory**
    `AthleteDecisionRecordRepository`; any session log/checklist is a documentation artifact, not a new
    production persistence/event surface.
21. **What remains outside scope.** Any CLI/runtime shell/entrypoint, deployment/provider/DB/auth/CI/SDK
    decision, live-provider enablement, real delivery channel, a production whole-core composer, and the
    observation→renderable production composition (Spec 034R: stays caller-supplied / test harness).

---

## 5. Decision Framework & Criteria

Evaluated on: athlete agency · source honesty · caller-responsibility clarity · Tier 1 guarantee clarity · Tier
2 admission compatibility · Tier 3 `validateDraft` compatibility · AC20 preservation · no-default-live-call
preservation · delivery-withheld preservation · no deployment/provider commitment · no DB/auth/CI commitment ·
fake-testability · least irreversible commitment.

| Option | Verdict |
| --- | --- |
| **A — Runbook-only contract over the existing runtime + decision-capture machinery** | **Selected (core).** Specifies the operator/caller procedure behaviorally; depends only on what exists; least irreversible; fully fake-testable; AC20-safe. |
| **B — Runbook contract + a future thin invocation surface, no implementation now** | **Adopted as direction.** A thin invocation helper may follow, but **only after** the runbook (and likely its test-only harness). Deferred, not built. |
| **C — Operator session must be assembled from `TerminalOutput → renderableFromTerminalOutput`** | **Adopted as the PREFERRED path (not absolute).** It makes Tier 1 structurally inherited from the domain decision. Not made strictly mandatory because the runtime's contract is "caller-supplied renderable"; a hand-built admissible renderable is *permitted but discouraged* and still bound by Tier 1. |
| D — Operator may supply *any* `RenderingRequest` that passes admission | **Rejected as a standalone basis.** Admission is structural only — passing it is **not** Tier 1 truth. Allowed only *within* C+Tier-1 obligations, never as a substitute for them. |
| E — Build a CLI / runtime shell now | **Rejected — premature shell.** It presupposes exactly the runbook this spec defines; sequencing it first risks a shell without a contract. |
| F — Reopen production whole-core composition / amend AC20 | **Rejected.** Spec 034 Option C superseded, 034A on hold, 034R standing; no overwhelming need; explicitly out of scope. |
| G — Defer the runbook | **Rejected.** The current loop is sufficient to specify the runbook now. |

---

## 6. Decision

`[DECISION]` **Operator session runbook = a behavioral, docs-only caller-assembly contract over the existing
machinery (Option A), with a future thin invocation surface deferred (Option B) and assembly from
`TerminalOutput` via `renderableFromTerminalOutput` as the PREFERRED path (Option C).** A trusted operator may
run the offline loop by supplying athlete manual input and a **caller-assembled `RenderingRequest`** to
`offlineReflectionRuntime` — **preferably** assembled from a real `TerminalOutput` via
`renderableFromTerminalOutput` so the Tier 1 guarantees are inherited from the domain decision — then sequencing
reflection review (delivery withheld), and **later, explicit** athlete-declared/reported decision capture, all
**without** creating a CLI, runtime shell, deployment surface, live-provider default, or production whole-core
composer.

**What the operator must supply.** A well-formed athlete `submission`; a contract-satisfying `RenderingRequest`
(preferably from `renderableFromTerminalOutput`); an `OperatorMediationMarker`; deterministic/injected deps
(`runManualIntake`, a **fake** provider `client` by default, `config`, `secret` ref, repos, `rendererKind`,
`providerAdapterKind`); and `OrchestrationTiming`.

**What the operator must verify before runtime invocation.** That the renderable's Tier 1 guarantees hold (§4.7)
— claims trace to real evidence, inference is framed not asserted, no prescription/unsupported certainty, voice
within the domain ceiling — and (preferably) that the renderable is a projection of a real domain-approved
`TerminalOutput`. The operator should also confirm `admitExternalRenderable(request).admitted === true` is
*expected* — while understanding admission is a precondition, not a proof.

**What the runtime may trust.** The structural shape of the command/renderable (admission gates it) and the
injected collaborators it is given.

**What the runtime must not trust.** That an admitted renderable is *true*, evidence-backed, wise, or high
quality; that a caller-supplied renderable reflects real reasoning; that operator mediation is an athlete
decision.

**What admission proves / does not prove.** *Proves:* the renderable is structurally admissible (provenance,
kind, claim fields, agency, uncertainty, traceability-where-required, voice ceiling). *Does not prove:* truth,
evidence backing, recommendation quality, or Tier 1 caller guarantees (admitted ≠ true; Tier 2 cannot prove
Tier 1).

**What `validateDraft` proves / does not prove.** *Proves:* the rendered draft stays within the renderable's
`allowedClaims`/`forbiddenClaims`/voice/uncertainty. *Does not prove:* that those claims are true, wise, or high
quality (`validateDraft` success ≠ recommendation quality).

**What the operator must / must not do on each runtime outcome.** See §9 (Required Runbook Outcomes).

**How the decision-capture step is sequenced.** Strictly *after* a session, *only* on explicit athlete input:
`athleteDecision(...)` (source `athlete-declared`/`athlete-reported`) + `decisionContext({ decisionSupportCaseRef:
<reflection sourceCaseRef> })` → `recordAthleteDecision(...)` → optional re-entry as a `SubjectiveObservation`.

**How operator scribe is constrained.** An operator-conveyed decision is valid **only** as `athlete-reported`
content representing the athlete's own reported decision; never `operator-decided` (no such source exists). The
`operatorRef` is session metadata, never the decision's source/owner.

**How AC20 remains intact.** The renderable is **caller-assembled** (preferably via the production
`renderableFromTerminalOutput`); the whole-core composition that produces the `TerminalOutput` stays in
`__tests__/`. No production file imports all four core surfaces; no `reflection-composition` module; no
production whole-core composer.

**How no deployment/provider decision is introduced.** The runbook uses the offline runtime with a deterministic
fake provider and no delivery sink; it commits to no secret provider (Spec 030), deployment target (Spec 031),
networked surface (Spec 032), DB, auth, CI, or SDK.

**What the next technical spec must decide.** Whether the runbook stays docs-only or gets a **test-only runbook
harness** proving the documented sequence with deterministic fakes; the exact runbook + caller-assembly
checklist format; the per-outcome handling/reporting; whether any safe session-report shape is useful; and
whether a thin invocation helper is deferred until after runbook tests. (`Tech Spec 038A`.)

`[ASSUMPTION]` The headline: **the loop is proven; Spec 038 fixes how a human safely *drives* it.** It turns the
two runtime functions + the existing decision machinery into a disciplined operator procedure — caller assembles
(preferably from a real `TerminalOutput`), admission gates, `validateDraft` guards, delivery stays withheld, the
athlete alone decides later — with no shell, no deployment, and AC20 untouched.

---

## 7. Required Behavioral Rules

**Must require:** operator action is **mediation only**; the athlete remains the product user and the decision
owner; the `RenderingRequest` is **caller-assembled before** runtime invocation; the caller's Tier 1 guarantees
are **explicit**; the `RenderingRequest` **passes admission before rendering**; an admitted renderable still goes
through `validateDraft`; **delivery remains withheld**; the runtime creates **no `AthleteDecision`**; decision
capture is **later, explicit, `athlete-declared`/`athlete-reported` only**; an operator/scribe report is valid
**only** as `athlete-reported`; decision feedback re-enters **only** as a `SubjectiveObservation`; whole-core
**production** composition is **not** introduced.

**Must forbid:** operator action treated as an athlete decision; operator scribe treated as the decision source;
a renderable treated as truth; admission treated as an evidence-backed fact; `validateDraft` treated as
recommendation quality; `reflection-ready` treated as delivery; `reflection-ready` treated as a decision;
delivery success treated as a decision; silence treated as a decision; observed behavior treated as a decision;
automatic delivery; automatic live-provider call; CLI/runtime shell creation; script/package command creation; a
production whole-core composer; a `reflection-composition` module; an AC20 amendment.

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Safe runbook.** *Given* athlete manual input and a contract-satisfying `RenderingRequest`, *when* the
operator runs the offline session, *then* the runtime may return `reflection-ready` with `deliveryWithheld: true`
and no `AthleteDecision`.

**UC2 — Inadmissible runbook input.** *Given* an inadmissible `RenderingRequest`, *when* the operator runs the
session, *then* the runtime returns `renderable-inadmissible` and the operator stops without rendering,
delivering, or capturing a decision (and does not strip safety constraints to force admission).

**UC3 — Validation failure.** *Given* an admitted request but an invalid rendered draft, *when* the runtime
returns `not-rendered`, *then* the operator does not deliver and does not treat the draft as safe.

**UC4 — Input rejected.** *Given* invalid manual input, *when* the runtime returns `input-rejected`, *then* the
operator corrects the input and does not proceed to render.

**UC5 — Later athlete decision.** *Given* a `reflection-ready` output and later explicit athlete input, *when*
the athlete declares/reports a decision, *then* the operator may record it as `athlete-declared`/`athlete-reported`
linked via `decisionContext({ decisionSupportCaseRef: <reflection sourceCaseRef> })`.

**UC6 — Operator scribe.** *Given* the operator records the athlete's words, *when* decision capture occurs,
*then* the source is `athlete-reported` and never operator-created.

**UC7 — Silence.** *Given* no athlete response after a reflection, *when* the operator evaluates the session,
*then* no `AthleteDecision` is created.

**UC8 — AC20.** *Given* the runbook uses caller assembly, *when* the runbook is specified, *then* no production
whole-core composer is introduced (the whole-core composition stays a test harness).

---

## 9. Required Runbook Outcomes (operator behavior per runtime disposition)

- **Outcome 1 — `reflection-ready`.** Operator **may** review/present the validated reflection under
  delivery-withheld/manual conditions. Operator **must not** treat it as delivered; **must not** record an
  `AthleteDecision` unless the athlete explicitly declares/reports one later.
- **Outcome 2 — `renderable-inadmissible`.** Operator **must stop**. **Must not** render, deliver, infer a
  decision, or "fix" the renderable by removing safety constraints (the closed `admissionReason` is the cause).
- **Outcome 3 — `not-rendered`.** Operator **must stop or revise** the caller assembly / provider-draft path.
  **Must not** treat the provider output as safe; **must not** deliver.
- **Outcome 4 — `input-rejected`.** Operator **must stop and correct** the athlete manual input. **Must not**
  proceed to render.
- **Outcome 5 — later athlete decision.** Operator **may** record **only** `athlete-declared`/`athlete-reported`
  decision content through the existing decision-capture machinery. **Must not** infer a decision from silence,
  observed behavior, or "compliance."

---

## 10. Required Acceptance Criteria (Given / When / Then)

- Operator mediation is not an athlete decision. ✅
- Operator scribe is not the decision source. ✅
- Caller assembly is not proof of truth. ✅
- Admission success is not an evidence-backed fact. ✅
- `validateDraft` success is not recommendation quality. ✅
- `reflection-ready` is not delivered. ✅
- `reflection-ready` is not an `AthleteDecision`. ✅
- Delivery success is not an `AthleteDecision`. ✅
- Silence is not an `AthleteDecision`. ✅
- Observed behavior is not an `AthleteDecision`. ✅
- Decision capture is later, explicit, `athlete-declared`/`athlete-reported` input. ✅
- Decision feedback is a `SubjectiveObservation` only. ✅
- Whole-core composition remains a test harness only. ✅
- No CLI/runtime shell is introduced. ✅
- No package script is introduced. ✅
- No deployment/provider/DB/auth/CI decision is introduced. ✅
- AC20 remains unchanged. ✅
- No implementation/code is added by this spec (docs-only). ✅
- All existing tests remain green (795/795). ✅

---

## 11. Relationship To Existing Architecture

- **Spec 034R** — whole-core **production** composition stays **caller-supplied / test harness only**; this
  runbook is the AC20-respecting answer to "then how does a caller assemble it?".
- **Spec 035** — the external renderable assembly contract; the runbook tells the operator how to satisfy it.
- **Impl 035-A/B** — `admitExternalRenderable` implemented + wired before rendering; the runbook's Tier 2 gate.
- **Spec 036 / Impl 036-A** — the first operator-mediated reflection session contract + test harness; the
  runbook generalizes the harness's sequence into an operator procedure.
- **Spec 037 / Impl 037-A** — the post-reflection decision-capture boundary + harness; the runbook's decision
  step reuses it (documented usage; `athlete-declared`/`athlete-reported`; session-linked).
- **Impl 032R-A** — `offlineReflectionRuntime`, the runtime the runbook drives.
- **Impl 014** — `validateDraft`, the Tier 3 mandatory guard.
- **Impl 009** — the `AthleteDecision` feedback loop (re-entry as `SubjectiveObservation` only).
- **AC20** — no production file owns the whole core; the runbook never introduces one.

---

## 12. Forbidden Behaviors

```text
implementation code · technical implementation plan · CLI/runtime shell creation · script creation ·
package script changes · deployment/CI files · DB/schema/migrations · auth/session/user implementation ·
SDK/dependency changes · AC20 amendment · reflection-composition module · production whole-core composer ·
automatic live call · automatic delivery · automatic AthleteDecision creation · system-created decision ·
AI-created decision · operator-created decision (unless explicitly athlete-reported) · reflection-ready treated as delivery ·
reflection-ready treated as decision · delivery success treated as decision · silence treated as decision ·
inferred behavior treated as decision · following Aurora treated as obedience-success
```

---

## 13. Open Questions For Tech Spec 038A

1. Whether the runbook remains docs-only or gets a **test-only harness**.
2. Whether any **thin invocation helper** is useful later (and where it would live without breaking AC20/guards).
3. The exact **runbook checklist** format.
4. The exact **caller-assembly checklist** format.
5. The exact **handling/reporting** of each runtime outcome.
6. Whether a **safe session-report shape** is useful (and what it must redact).
7. Whether session outputs should be captured only in **docs** or in **test fixtures**.
8. Whether an **invocation surface** should be deferred until **after** runbook tests.
9. How a later **CLI/runtime shell** would avoid live-provider/default-delivery risks.
10. How to preserve **AC20** if caller assembly is ever **automated** (it must stay outside a single
    whole-core-owning production file).

---

## 14. Success Criteria

Can a trusted operator/caller assemble and run Aurora's current offline reflection loop — supplying athlete
manual input and a caller-assembled (preferably `renderableFromTerminalOutput`-projected) `RenderingRequest`,
passing Tier 2 admission, honoring Tier 3 `validateDraft`, keeping delivery withheld, and capturing **only**
later explicit `athlete-declared`/`athlete-reported` decisions linked to the session — **without** a CLI,
runtime shell, deployment/provider/DB/auth/CI/SDK decision, a production whole-core composer, or an AC20
amendment? **Yes — via Option A (with B deferred and C preferred):** a behavioral runbook + caller-assembly
contract over the existing machinery, with implementation (likely a test-only runbook harness) deferred to
`Tech Spec 038A`. Validation at authorship: `tsc --noEmit` clean; `node --test` 795/795; no code, test, package,
runtime, CLI, deployment, CI, SDK, or dependency change; AC20 untouched.
