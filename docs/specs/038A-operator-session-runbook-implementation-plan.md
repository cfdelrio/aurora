# Aurora — Technical Spec 038A — Operator Session Runbook Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 038 (`bdfe185`). It translates the operator
> session runbook / caller-assembly contract into a TS-strict implementation plan **grounded in the real code**.
> It is **plan only**: it implements no code, modifies no production code/test, edits no package file, adds no
> CLI/runtime shell/script, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20
> untouched), creates no production whole-core composer, and does not reopen Spec 034 as a normal continuation.
> Recent sequence: `efd32ba` (Impl 037-A) → `c3da67b` (Docs) → `e6323d1` (Roadmap checkpoint) → `bdfe185`
> (Spec 038). Validation at authorship: `tsc --noEmit` clean; `node --test` 795/795.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 038-A** and writes
no code/test.

---

## 1. Context recap

`[FACT]` Spec 038 decided (Option A + B-deferred + C-preferred): the operator session runbook is a **behavioral
caller-assembly contract over the existing machinery**; a trusted operator supplies athlete manual input + a
**caller-assembled `RenderingRequest`** (preferably projected from a real `TerminalOutput` via
`renderableFromTerminalOutput`) to `offlineReflectionRuntime`, which gates Tier 2 admission, honors Tier 3
`validateDraft`, withholds delivery, and never creates an `AthleteDecision`; later decision capture is **explicit
`athlete-declared`/`athlete-reported`** input. Spec 038 rejected a CLI/runtime shell, script/package command,
deployment/provider decision, production whole-core composer, `reflection-composition` revival, and an AC20
amendment. This plan decides *how little* (if anything) to build to **prove** that runbook.

---

## 2. Real-Code Gap Analysis (grounded; no invented type names)

1. **`offlineReflectionRuntime` command shape (Q1).** `OfflineReflectionRuntimeCommand<TSubmission> = {
   submission: TSubmission; athleteRef: string; request: RenderingRequest; operatorMediation:
   OperatorMediationMarker; timing: OrchestrationTiming; ids?: OrchestrationIds }`
   (`application-orchestration/application/offline-reflection-runtime.ts`).
2. **`offlineReflectionRuntime` deps shape (Q2).** `OfflineReflectionRuntimeDependencies<TSubmission> = {
   runManualIntake: ManualIntakeStep<TSubmission>; client: ProviderClientBoundary; config: ProviderClientConfig;
   secret: ProviderSecretRef; rendererKind: string; providerAdapterKind: string;
   renderedMessageRecordRepository: RenderedMessageRecordRepository }`.
3. **Required submission/manual-input fields (Q3).** The injected `runManualIntake` adapts
   `observation.ingestManualInput`; in both existing harnesses the submission is a `ManualInputSubmission`
   (`{ submissionRef, athleteRef, submittedAt, occurredAt, occasion, reporter, entries: [...] }`). A missing
   `athleteRef` makes intake return `"rejected"` → `input-rejected`.
4. **`RenderingRequest` shape required by runtime (Q4).** `req(renderable)` wraps a `RenderableDomainOutput`:
   `{ sourceCaseRef, kind: "support"|"inquiry"|"withholding", voice?, intent?, contentAtoms[], allowedClaims[],
   forbiddenClaims[], uncertaintyVisibleRequired, limitations[], freshness?, traceability?, agencyRequired,
   conditions[] }` (`rendering/domain/renderable-domain-output.ts`).
5. **Renderable admission checks currently enforced (Q5).** `admitExternalRenderable(request)` →
   `ExternalRenderableAdmission` with closed `ExternalRenderableAdmissionStatus`: `admitted`,
   `rejected-missing-provenance`, `rejected-unsupported-kind`, `rejected-claim-fields-missing`,
   `rejected-agency-missing`, `rejected-uncertainty-hidden`, `rejected-missing-traceability`,
   `rejected-unsafe-voice`. Structural only.
6. **Safe/admitted runtime path (Q6).** intake ok → `admitExternalRenderable` admitted → render-only
   `orchestrateRenderDeliver` → downstream mandatory `validateDraft` → rendered record (status "rendered") →
   `reflection-ready` (`reflection.validationPassed: true`, `deliveryWithheld: true`, `decisionCapture`
   invitation; no `AthleteDecision`).
7. **`renderable-inadmissible` path (Q7).** admission rejected → status `renderable-inadmissible`,
   `admissionReason?` = safe closed code, `deliveryWithheld: true`, `trace.stoppedAt: "stopped"`,
   `trace.renderedMessageRecordId: undefined`, no `reflection`, `decisionCapture` invitation (no decision).
8. **`not-rendered` path (Q8).** orchestration "provider-not-rendered" (incl. `validateDraft` failure) → status
   `not-rendered`, no reflection, `deliveryWithheld: true`, `decisionCapture` invitation.
9. **`input-rejected` path (Q9).** injected intake returned "rejected" → status `input-rejected`, no reflection,
   `deliveryWithheld: true`, `decisionCapture` invitation; stops before admission/rendering.
10. **`deliveryWithheld` shape/semantics (Q10).** `deliveryWithheld: true` on the outcome **always** — the
    runtime never delivers; `trace.deliveryRecordId`/`deliveryRequestId` stay `undefined`. (`OfflineReflectionStatus`
    also includes `recording-failed`/`unexpected-failure`, both safe stops.)
11. **Decision-capture prompt/ref shape (Q11).** `DecisionCapturePrompt = { kind:
    "athlete-decision-invitation"; athleteRef: string; acceptableSources: readonly ["athlete-declared",
    "athlete-reported"] }` — an invitation only; it creates no decision.
12. **Decision-capture machinery shape (Q12).** `athleteDecision(input: AthleteDecisionInput): AthleteDecision`
    (source `DecisionReportSource = "athlete-declared" | "athlete-reported"`); `decisionContext({
    decisionSupportCaseRef?, decisionOpportunityRef?, purposeVersionRef?, limitations? })`;
    `recordAthleteDecision({ record: AthleteDecisionRecord; decision: AthleteDecision }): AthleteDecisionRecord`;
    `InMemoryAthleteDecisionRecordRepository`; re-entry via `decisionAsObservation(decision):
    SubjectiveObservation` (`__tests__/decision-observation-adapter.ts`).
13. **036-A session harness sequence (Q13).** `src/modules/__tests__/first-operator-mediated-reflection-session.test.ts`:
    composes whole-core (`buildObservationSet → detectSignals → attachSignalAsEvidence → reasoningOutcomeFrom →
    updateUnderstandingFromOutcome → produceUnderstandingAssessment → evaluateDecisionSupportCase` →
    `terminal`) → `renderableFromTerminalOutput({ sourceCaseRef, output })` → `req(renderable)` →
    `offlineReflectionRuntime(command, deps)`; asserts the 4 statuses + cross-path no-decision/no-delivery.
14. **037-A decision-capture harness sequence (Q14).** `src/modules/__tests__/post-reflection-athlete-decision-capture.test.ts`:
    builds `athleteDecision({ source, context: decisionContext({ decisionSupportCaseRef: SOURCE_CASE_REF }) })`
    → `recordAthleteDecision({ record: AthleteDecisionRecord.empty(ATHLETE), decision })`; re-entry via
    `decisionAsObservation`; runs `offlineReflectionRuntime` to re-assert no auto-creation.
15. **`package.json` scripts available today (Q15).** `typecheck` (`tsc --noEmit`), `test` (`node --test
    "src/**/*.test.ts"`), `check` (both). No operator-session script.
16. **Absence of operator session CLI/script/package command (Q16).** None. The only `scripts/` file is
    `operator-live-smoke.mjs` (a separate operational smoke). No session entrypoint exists.
17. **AC20 guard constraints (Q17).** AC20a — no new top-level production module beyond the nine allowlisted +
    `__tests__`; AC20b — no **production** file imports all four core surfaces. Test files are excluded from the
    AC20b scan, so a `__tests__/` harness may compose the whole core.
18. **Existing negative-capability guard style (Q18).** Sibling `*-negative-capability.test.ts` files (e.g.
    `application-orchestration/tests/offline-reflection-runtime-negative-capability.test.ts`) read production
    source as text (with a `stripComments` helper to scan code-only) and assert forbidden imports/symbols are
    absent. The `__tests__/` harnesses also embed JSON-scan assertions (banned substrings) on outcomes.

`[FACT]` Decisive consequence: **036-A already proves the session paths** (safe/inadmissible/not-rendered/
input-rejected + no-decision/no-delivery) and **037-A already proves the capture half** (athlete-declared/
reported, session-linked, no auto-creation, `SubjectiveObservation` re-entry). What is **not** proven in one
executable place is the **end-to-end runbook sequence** that *binds* a session to a *later* capture using the
**preferred assembly path** and asserts the **operator's per-outcome obligations** as one contract. A production
wrapper would add **no safety** over `offlineReflectionRuntime` (which already does intake + admission + render +
`validateDraft` + delivery-withheld + decision-capture invitation).

---

## 3. Central Question

> Should the operator session runbook remain docs-only, be proven by a test-only harness/checklist, or introduce
> a thin invocation helper — preserving AC20, caller-assembled `RenderingRequest`, no default live call, delivery
> withheld, no automatic `AthleteDecision`, and no deployment/provider commitment?

**Answer:** a **test-only runbook proof** (a single `__tests__/` harness sequencing the already-proven 036-A and
037-A paths into one executable runbook, with per-outcome operator-obligation assertions) **plus a docs-only
operator runbook checklist** — **no production code, no wrapper, no CLI/shell**. The test proves the runbook is
real and green; the checklist is the human-facing artifact the test mirrors.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Implementation scope → **Option B (test-only runbook proof) + a docs-only checklist; no code/wrapper/CLI**

Implementation 038-A adds **one test-only runbook harness** that sequences a full session (preferred assembly
path) → `reflection-ready` (delivery withheld, no decision) → a **later, explicit** athlete decision capture →
`SubjectiveObservation` re-entry, and asserts the operator's obligations on each runtime disposition; **plus one
docs-only runbook checklist**. Rejected: **A** (docs-only alone) — the runbook's *sequencing + per-outcome
handling binding session→capture* benefits from one executable proof (036-A and 037-A prove the halves
separately, not the bound sequence); **C** (thin production invocation helper) — adds ceremony, not safety, over
`offlineReflectionRuntime` (§2); **D** (CLI/operator command) — premature shell (Spec 038 rejected); **E**
(production whole-core caller-assembly helper) — would make a production file own the whole core (AC20b) and
revive production composition; **F** (defer) — the loop is sufficient to prove the runbook now. If, during
implementation, the existing surfaces turn out to need a production wrapper for a concrete safety guarantee,
escalate explicitly — but §2 indicates they do not.

### `[DECISION]` Decision 2 — Placement → **`src/modules/__tests__/operator-session-runbook.test.ts`**

Because the **preferred** assembly path composes the **whole core** to produce a real `TerminalOutput` (then
`renderableFromTerminalOutput`), the harness must live in the neutral `src/modules/__tests__/` root, where AC20
excludes test files from the production import scan (as 036-A does). **Not**
`application-orchestration/tests/operator-session-runbook.test.ts` — that location is for tests using an
**already-supplied/fixture** renderable without whole-core imports (the Impl 025 application-orchestration import
guard governs production there); the runbook proof needs whole-core assembly. **No** production module; **no**
`src/modules/session` or runtime shell.

### `[DECISION]` Decision 3 — Checklist artifact → **`docs/runbooks/operator-session-runbook.md` (docs-only)**

Add a **docs-only** operator runbook checklist at `docs/runbooks/operator-session-runbook.md` (a new `docs/`
subfolder; docs-only, implies no runtime surface). It restates Spec 038 §6/§9 as an actionable operator
checklist (assemble → verify Tier 1 → admit → run → handle each disposition → later capture). **Why both
checklist + test:** the **test** is the executable proof that the documented sequence is real, green, and
import-safe; the **checklist** is the human-usable operational artifact a real operator follows. They are
complementary, not redundant — the test references the checklist's steps as assertions. (Rejected: a checklist
under `docs/implementation-architecture/` — that folder is architecture, not operator procedure; and
"test-names-only, no doc" — the operator needs a readable checklist.) **No** operational script / package
command.

### `[DECISION]` Decision 4 — Production wrapper → **none (no new production code)**

038-A adds no production function/module/wrapper. `offlineReflectionRuntime` already performs intake, Tier 2
admission, render-only orchestration, the Tier 3 `validateDraft` path, the delivery-withheld outcome, and the
decision-capture invitation; a wrapper that merely calls it adds ceremony without safety and risks importing
upstream surfaces. (A future candidate, only if a concrete new guarantee ever emerges: a thin
`application-orchestration` helper that must **not** import any upstream core surface — not built here.)

### `[DECISION]` Decision 5 — Invocation surface → **out of scope for 038-A (no CLI/script/package command)**

No CLI, runtime shell, `scripts/` file, or package command in 038-A (Spec 038 Option B is **deferred**). A thin
invocation surface may be reconsidered **only after** the runbook proof + checklist are stable, and only as an
explicit future decision that preserves no-default-live-call / delivery-withheld.

### `[DECISION]` Decision 6 — Runbook outcome handling → **assertions/checklist steps per disposition**

The harness + checklist cover each disposition with the operator's obligation:
- **`reflection-ready`** → assert `reflection.validationPassed === true`, `deliveryWithheld === true`,
  `decisionCapture.kind === "athlete-decision-invitation"`, **no `AthleteDecision`**; operator *may* review, must
  not treat as delivered, must not record a decision yet.
- **`renderable-inadmissible`** → assert status + `admissionReason` (safe code) + `trace.stoppedAt === "stopped"`
  + no reflection; operator stops, must not strip safety to force admission.
- **`not-rendered`** → assert status + no reflection + `deliveryWithheld`; operator stops/revises, must not
  deliver, must not treat draft as safe.
- **`input-rejected`** → assert status + stops before admission/rendering (throwing client never called);
  operator corrects input.
- **later `athlete-declared` decision** → `athleteDecision({ source: "athlete-declared", context:
  decisionContext({ decisionSupportCaseRef: <reflection sourceCaseRef> }) })` → `recordAthleteDecision`; assert
  source + link.
- **later `athlete-reported` decision** → same with `source: "athlete-reported"`; assert operator scribe is not
  the source.
- **silence/no-response** → assert **no `AthleteDecision`** is created (record stays empty).

### `[DECISION]` Decision 7 — Caller assembly (Tier 1) obligations → **represented as preconditions + a preferred-path assertion**

The harness represents Tier 1 obligations by **using the preferred path** (`renderableFromTerminalOutput` from a
real domain-approved `TerminalOutput`, so claim/voice/uncertainty/agency/traceability are inherited) and
asserting the resulting request is **admitted** *and* still subject to `validateDraft`. The checklist enumerates
the Tier 1 obligations the operator must guarantee: `sourceCaseRef`/provenance present; claim fields present;
uncertainty visible; agency preserved; voice ceiling respected; **prefer** `TerminalOutput →
renderableFromTerminalOutput`; **and** the caller must not treat the renderable as truth, admission as evidence
proof, or `validateDraft` as recommendation quality. (A hand-built admissible renderable is permitted but
discouraged; the harness demonstrates the preferred path.)

### `[DECISION]` Decision 8 — Guards → **reuse the existing negative-capability style; no new production guard needed**

Because 038-A is **test-only + docs-only**, all existing guards (AC20, Impl 025 application-orchestration import
guard, scripts/package guards) stay green unchanged. The runbook harness will additionally assert: no
`AthleteDecision` on any session path (JSON-scan banned substrings as 036-A does); `offlineReflectionRuntime`
exercised unchanged; delivery withheld; no live provider / real secret / `process.env`. No new
`*-negative-capability.test.ts` is required, though a small set of in-harness guard assertions may restate the
forbidden outcomes; **no production file is read/modified**.

---

## 5. Required File Layout (Implementation 038-A)

```text
src/modules/__tests__/operator-session-runbook.test.ts   (new — test-only runbook proof; whole-core assembly allowed here)
docs/runbooks/operator-session-runbook.md                (new — docs-only operator checklist)
```

**No production file changes.** **Must NOT create:** `src/modules/{session,runtime,api,server,ui,frontend,
worker,auth,db}/`, `scripts/operator-session.mjs`, `scripts/run-operator-session.mjs`. **Must NOT edit:**
`package.json`, `package-lock.json`, `scripts/operator-live-smoke.mjs`. **Must NOT integrate with:** a deployment
target, provider selection, cloud-secret adapters, delivery sinks, event persistence, an auth/session/user
system.

---

## 6. Required Test Plan (Implementation 038-A)

Deterministic; documented usage of existing surfaces:

1. Runbook safe path reaches `reflection-ready`.
2. The runbook uses a **caller-assembled** `RenderingRequest`.
3. The **preferred** assembly path uses `TerminalOutput → renderableFromTerminalOutput`.
4. Admission (`admitExternalRenderable`) runs **before** rendering.
5. `validateDraft` remains **downstream** (admitted request still validated).
6. Delivery is **withheld** (`deliveryWithheld: true`; no delivery record/request id).
7. **No `AthleteDecision`** is created during runtime (any session path).
8. A later **`athlete-declared`** decision can be recorded, session-linked.
9. A later **`athlete-reported`** decision can be recorded, session-linked.
10. Operator scribe is **not** the decision source.
11. Silence/no-response creates **no `AthleteDecision`**.
12. `renderable-inadmissible` stops the runbook (no render/deliver/decision).
13. `not-rendered` stops the runbook (no deliver; draft not treated as safe).
14. `input-rejected` stops the runbook (before admission/rendering).
15. Decision feedback re-enters **only** as a `SubjectiveObservation`.
16. **No `Signal`/`Evidence`** is created directly from the decision.
17. No live provider / real secret / `process.env` is required (deterministic fakes).
18. No delivery sink is invoked.
19. No production code is changed.
20. AC20 remains green; 21. all existing tests remain green.

(If, contrary to §3, only the docs-only checklist were chosen, validation would simply prove the repo stays
green at 795/795 and the doc clarifies all outcome handling — but Decision 1 selects the test-only proof + the
checklist.)

---

## 7. Boundary / Import Rules

**Allowed (in the `__tests__/` harness):** whole-core surfaces (`observation`/`reasoning`/`understanding`/
`decision-support`) for the preferred assembly path; `rendering` (`renderableFromTerminalOutput`,
`FakeProviderClient`, `InMemoryRenderedMessageRecordRepository`, fixtures `req`/`supportRenderable`);
`application-orchestration` (`offlineReflectionRuntime`, `admitExternalRenderable`,
`OFFLINE_REFLECTION_STATUSES`); athlete surfaces (`athleteDecision`, `recordAthleteDecision`, `decisionContext`,
`AthleteDecisionRecord`, `InMemoryAthleteDecisionRecordRepository`); the `decisionAsObservation` adapter;
shared-kernel. Reproduce the minimal 036-A/037-A setup locally if those helpers are not exported. **Allowed (in
the checklist):** docs only. **Forbidden:** a production whole-core composer; a `reflection-composition` module;
`application-orchestration` production files importing upstream core; `offlineReflectionRuntime` auto-decision
capture; automatic delivery / live provider; CLI/runtime shell; script/package command; DB/auth/session/
deployment files; SDK/dependency changes.

---

## 8. Required Distinctions

```text
runbook ≠ CLI · runbook ≠ runtime shell · runbook ≠ deployment · caller assembly ≠ proof of truth ·
TerminalOutput preferred path ≠ production whole-core composer · admission success ≠ evidence-backed fact ·
validateDraft success ≠ recommendation quality · reflection-ready ≠ delivered · reflection-ready ≠ AthleteDecision ·
operator mediation ≠ athlete decision · operator scribe ≠ decision source · silence ≠ decision ·
decision feedback ≠ Signal/Evidence · Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 9. Relationship To Existing Architecture

- **Spec 038** — implements its runbook/caller contract as a test-only proof + a docs-only checklist.
- **Impl 036-A** — the session harness whose sequence the runbook proof reuses (preferred assembly path).
- **Impl 037-A** — the decision-capture harness whose documented usage the runbook proof binds to a session.
- **Impl 035-A/B** — Tier 2 `admitExternalRenderable` gate the runbook runs before rendering.
- **Impl 032R-A / 014 / 009** — `offlineReflectionRuntime` / `validateDraft` / the `AthleteDecision` feedback
  loop the runbook drives and reuses unchanged.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the runbook proof composes it only in
  `__tests__/`; no production whole-core composer.

---

## 10. Open Questions (deferred to Implementation 038-A / a later slice)

1. Whether the harness reproduces the 036-A/037-A setup inline or imports shared (currently unexported) helpers.
2. The exact checklist headings/format in `docs/runbooks/operator-session-runbook.md`.
3. Whether a safe session-report *shape* is ever worth introducing (default: no — out of 038-A scope).
4. Whether a thin invocation helper is deferred until after runbook tests (Spec 038 Option B — yes, deferred).
5. How a later CLI/runtime shell would preserve no-default-live-call / delivery-withheld (future decision).
6. How to preserve AC20 if caller assembly is ever automated (must not live in one whole-core-owning production
   file).

---

## 11. Implementation Task Preview

**Next mission: Implementation 038-A — operator session runbook proof (test-only) + docs checklist.** Add
`src/modules/__tests__/operator-session-runbook.test.ts` sequencing the preferred-path session →
`reflection-ready` (delivery withheld, no decision) → later explicit `athlete-declared`/`athlete-reported`
capture → `SubjectiveObservation` re-entry, with per-outcome operator-obligation assertions and the
`renderable-inadmissible`/`not-rendered`/`input-rejected`/silence cases; and add
`docs/runbooks/operator-session-runbook.md` (docs-only checklist). No production change. After it lands, **Docs
consolidation post 038**.

---

## 12. Success Criteria

Can Aurora prove the operator session runbook — caller-assembled (preferably `renderableFromTerminalOutput`-projected)
`RenderingRequest`, Tier 2 admission before rendering, Tier 3 `validateDraft`, delivery withheld, no automatic
`AthleteDecision`, later explicit `athlete-declared`/`athlete-reported` capture, `SubjectiveObservation` re-entry —
**without** new production code, a wrapper, a CLI/shell, persistence/auth/event coupling, a deployment/provider
decision, or an AC20 amendment? **Yes — via Option B + a docs checklist:** one `__tests__/` runbook harness
proving the bound sequence and per-outcome obligations, plus a docs-only operator checklist; implementation is
`Implementation 038-A`. Validation at authorship: `tsc --noEmit` clean; `node --test` 795/795; no code, test,
package, runtime, CLI, deployment, CI, SDK, or dependency change introduced by this document; AC20 untouched.
