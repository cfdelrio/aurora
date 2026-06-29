# Aurora — Technical Spec 032RA — Operator-Mediated Offline Reflection Runtime Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 032R (`d0e46de`). This document translates
> the selected runtime surface — an **operator-mediated offline/manual reflection runtime** — into a
> TS-strict implementation plan **grounded in the real code**. It is **plan only**: it implements no code,
> adds no runtime/API/UI/CLI/worker file, no package script, no DB/schema/migrations, no auth/session/user,
> no deployment file, no CI config, no SDK, no dependency, no secret; it changes no operator smoke and no
> live-provider behavior, and weakens no guard. Recent sequence: `e8c1a77` (Spec 033) → `d0e46de`
> (Spec 032R). Validation at authorship: `tsc --noEmit` clean; `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation.

- `[FACT]` This document plans **Implementation 032R-A**; it writes no production code and no test.
- `[FACT]` It opens one edge: a pure application-level function that composes the existing **manual intake**
  and **validated rendering** ends into a safe, operator-mediated, athlete-facing reflection — with
  deterministic fakes, delivery withheld, and no athlete decision created.
- `[DECISION]` The plan is shaped to the **smallest safe slice** and is honest about a real gap (no existing
  observation→renderable composition — §2.3), which it scopes around rather than inventing.

---

## 1. Context recap

`[FACT]` Spec 033 (`e8c1a77`) selected **athlete-facing manual reflection**; Spec 032R (`d0e46de`) selected
the **operator-mediated offline/manual reflection runtime** as the surface that delivers it:

```text
athlete manual training input → operator-mediated offline/manual runtime → existing ingest/orchestrate/render
→ explainable athlete-facing reflection → inference marked, never fact → validateDraft mandatory
→ no automatic delivery → no automatic live call → athlete remains sole decision owner
```

This tech spec decides the smallest safe code slice that realizes that surface.

---

## 2. Surface Gap Analysis (grounded in real code)

Exact answers to the 24 required questions. No invented names; no assumed signatures.

### 2.1 `ingestManualInput` (Q1, Q2)

`src/modules/observation/application/manual-input-adapter.ts`:

```ts
export interface IngestManualInputInput { readonly submission: ManualInputSubmission; }
export function ingestManualInput(input: IngestManualInputInput): ManualInputIngestionOutcome
```

Synchronous, pure except for **one** effect: on accept/partial it saves **one** `ObservationSet` through an
injected `ObservationSetRepository` port. Hard preconditions (missing athlete-ref / occurrence-time / invalid
timestamp / empty submission / `inference-smuggled-as-fact`) → `{ status: "rejected", reasons }`, saving
nothing. It assigns no meaning, runs no detection, invents no values.

### 2.2 Observation → understanding path from manual input (Q3)

`ingestManualInput` yields a faithful `ObservationSet` (via `recordObservationSet`). The downstream domain
pipeline (observation → reasoning → understanding → decision-support → renderable) exists as **domain
modules** but **not as a single application composition** (see §2.3).

### 2.3 `orchestrateRenderDeliver` (Q4–Q7) and the renderable gap

`src/modules/application-orchestration/application/orchestrate-render-deliver.ts`:

```ts
export async function orchestrateRenderDeliver(
  command: ExplicitOrchestrationCommand,
  deps: ExplicitOrchestrationDependencies,
): Promise<OrchestrationOutcome>
```

- **Command** (`orchestration-command.ts`) requires `request: RenderingRequest` + `timing:
  OrchestrationTiming`; `review` / `delivery` / `recordEvents` are **optional and selective** (present ⇒ that
  step runs). **Partial composition is first-class** — omit `delivery` (and the sink dep) ⇒ render-only.
- **Dependencies** (`orchestration-dependencies.ts`) require `client: ProviderClientBoundary`, `config:
  ProviderClientConfig`, `secret: ProviderSecretRef`, `rendererKind`, `providerAdapterKind`,
  `renderedMessageRecordRepository`. Optional: `providerAttemptRepository`, `deliverySink`,
  `deliveryRecordRepository`, `eventRepository`. It depends on the **abstraction**, never on live transport,
  credential resolvers, or the process-env adapter.

`[GAP]` **`orchestrateRenderDeliver` starts at a `RenderingRequest` (a `RenderableDomainOutput`), while
`ingestManualInput` ends at an `ObservationSet`.** There is **no single existing application service** that
composes observations → reasoning → understanding → decision-support → `RenderableDomainOutput`. Tests build
a renderable with `req(supportRenderable())` (`rendering/tests/fixtures.ts`); `decision-support` owns
`TerminalOutput` → renderable, but the end-to-end reasoning composition is not a wired application surface.
**This gap is the central scoping fact** (Decision 1).

### 2.4 `OrchestrationOutcome` and trace (Q5, Q6)

`orchestration-result.ts`: `OrchestrationOutcome { kind: OrchestrationOutcomeKind; trace: OrchestrationTrace }`.
`OrchestrationOutcomeKind` (closed): `delivered | delivery-failed | rendered | review-rejected |
display-ineligible | provider-not-rendered | recording-failed | partial-success`. The result is **ref-only**
— it carries a safe disposition + `OrchestrationTrace` (ref strings: `renderedMessageRecordId`, etc.) and
**no message body, no raw draft/prompt/payload/secret**. Reading it triggers nothing.

### 2.5 Rendering request / draft / validation path (Q8, Q9)

`RenderingRequest` (`rendering/domain/rendering-request.ts`) wraps a `RenderableDomainOutput`.
`requestRealProviderRendering` (called inside `orchestrate`) runs the provider client behind the **mandatory
`validateDraft`** (`rendering/domain/rendering-validator.ts`, `{ renderable, ... }`). A validation failure ⇒
`outcome.status !== "rendered"` ⇒ orchestration stops at `provider-not-rendered`, **no record**. The
validated, display-eligible message lives on the saved `RenderedMessageRecord`.

### 2.6 Deterministic rendering / fake-provider surfaces (Q10)

`rendering/index.ts` exports `FakeProviderClient` (`FakeProviderClientScenario`, e.g. `"safe"`) implementing
`ProviderClientBoundary`, plus `fakeRenderText` / the validator. These give a fully deterministic provider
path — **no SDK, no network, no secret** — already used across tests.

### 2.7 Delivery shapes / test sink (Q11, Q12)

`delivery/index.ts`: `DeliverySink`, `DeliveryRecordRepository`, `DeliveryTarget`, delivery records. Delivery
exposes a display-eligible message to a **deterministic test-only sink**; **delivery success ≠ evidence ≠
athlete decision**. The runtime will **omit** the sink (render-only), so no delivery occurs.

### 2.8 Event-recording boundaries not to trigger (Q13)

`event-recording` is append-only, ref-only, **never auto-emitted**. Orchestration's event step runs **only**
with `recordEvents: true` + `eventRepository`. The runtime **omits both** → no event recording.

### 2.9 AthleteDecision shape / source constraints (Q14)

`athlete/domain/athlete-decision.ts`: `AthleteDecision` is **athlete-owned**; `source:
"athlete-declared" | "athlete-reported"` — **never inferred/system**; it carries **no** compliance/obedience/
reward/inferred-state field; following Aurora is not success, diverging is not failure. The runtime must
**not** create an `AthleteDecision`.

### 2.10 Operator-smoke guard constraints (Q15)

`scripts/operator-live-smoke.mjs` is the **only** approved script (asserted by guards: `scripts/` contains
only that file; no `scripts/` under `src/`; no npm script invokes it; it must not reference managed/cloud
secret symbols). The runtime adds **no** script and must not change it.

### 2.11 Package-script constraints (Q16)

`package.json` scripts are exactly `typecheck` / `test` / `check`; no `dependencies` key; devDependencies
exactly `@types/node` + `typescript`. **Unchanged.**

### 2.12 Module export patterns (Q17)

`application-orchestration/index.ts` is `export * from "./application/index.ts"`;
`application/index.ts` names each export explicitly. New symbols go through `application/index.ts`.

### 2.13 Nearby test style (Q18)

`application-orchestration/tests/explicit-orchestration.test.ts` (functional) +
`explicit-orchestration-negative-capability.test.ts` (guard); `node:test` + `node:assert/strict`; renderable
fixtures via `rendering/tests/fixtures.ts` (`req`, `supportRenderable`); in-memory repositories + fakes; fixed
injected timestamps. The new tests mirror this exactly.

### 2.14 Where an offline runtime should live (Q19)

**`application-orchestration` (application subfolder).** It is **runtime composition** over existing
application services — not rendering-only, not delivery-only, not domain, not a script. (See Decision 2.)

### 2.15 Pure function vs executable script (Q20)

**Pure exported function with injected dependencies.** No executable, no package script, no CLI in this slice
(Decision 3). The operator smoke already owns the only approved script; the product runtime is planned as a
pure surface first; an executable shell is a later slice.

### 2.16 Should it call delivery in this slice (Q21)

**No.** Render-only; delivery withheld; return an explicit withheld status (Decision 6).

### 2.17 Real provider vs deterministic fake (Q22)

**Deterministic fake only** (`FakeProviderClient`, scenario `"safe"`). Live provider stays gated by existing
boundaries and out of scope (Decision 7).

### 2.18 Should it persist anything (Q23)

**No new persistence.** It uses **existing** in-memory ports already required by `ingestManualInput`
(`ObservationSetRepository`) and `orchestrate` (`renderedMessageRecordRepository`). No DB, no new repository
type, no event store (Decision 8).

### 2.19 AthleteDecision: create or only invite (Q24)

**Only invite** — the outcome may carry a safe decision-capture prompt/ref; it must **not** create an
`AthleteDecision` (Decision 9).

---

## 3. Central Question

> What is the smallest safe implementation slice for an operator-mediated offline/manual reflection runtime
> that takes athlete manual input, runs Aurora's existing ingest + render flow with deterministic fakes,
> produces a safe athlete-facing reflection output, and preserves every existing safety boundary?

**Answer:** a pure `offlineReflectionRuntime(command, deps)` function in
`application-orchestration/application/` that (1) runs `ingestManualInput` (faithful intake → `ObservationSet`
via injected port; rejection → fail-closed), (2) composes `orchestrateRenderDeliver` in **render-only** mode
over deterministic fakes (`FakeProviderClient` + in-memory rendered-message repo; mandatory `validateDraft`),
(3) projects a **safe athlete-facing reflection** from the saved `RenderedMessageRecord`, and (4) returns a
closed outcome with `deliveryWithheld: true`, **no** `AthleteDecision`, **no** events, **no** new
persistence. The renderable is **carried in the command** because the observation→renderable composition does
not yet exist (§2.3) — bridging it is a later slice.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Scope → **pure offline reflection runtime function; two proven ends; renderable injected; reasoning bridge deferred**

Implementation 032R-A adds a pure application-level `offlineReflectionRuntime` function — **not** an
executable script, **not** a package command. It wires the two **proven** ends: `ingestManualInput` (athlete
faithful intake) and `orchestrateRenderDeliver` render-only (validated rendering), returning a safe
athlete-facing reflection. **Because no application service composes `ObservationSet` → `RenderableDomainOutput`
(§2.3),** the authoritative `RenderingRequest` is supplied in the command in this slice; the
reasoning-pipeline composition (observation → … → renderable) is an explicit **later** slice. This keeps the
slice small, honest, and fully fake-testable.

### `[DECISION]` Decision 2 — Placement → **`application-orchestration/application/offline-reflection-runtime.ts`**

```text
src/modules/application-orchestration/application/offline-reflection-runtime.ts   ← CHOSEN
```

It is runtime **composition** over existing application services — so it belongs beside
`orchestrate-render-deliver.ts`, exported via `application/index.ts`. **Not** `rendering` (not rendering-only),
**not** `delivery`, **not** domain, **not** `scripts/`, **not** a new `src/modules/runtime/` module.

### `[DECISION]` Decision 3 — Executable vs pure → **pure exported function with injected deps; no script, no package script, no CLI**

Operator smoke owns the only approved script; the product runtime is planned as a pure, test-callable surface
first; an executable/CLI shell is a deliberate later slice after guards + docs.

### `[DECISION]` Decision 4 — Input contract → **`OfflineReflectionRuntimeCommand`**

```ts
interface OfflineReflectionRuntimeCommand {
  readonly submission: ManualInputSubmission;     // athlete's faithful manual training input
  readonly request: RenderingRequest;             // authoritative reflection renderable (injected; §2.3 gap)
  readonly operatorMediation: OperatorMediationMarker; // operational marker — NOT a decision (see below)
  readonly timing: OrchestrationTiming;           // injected Timestamps (no Date.now())
  readonly ids?: OrchestrationIds;                // optional deterministic ids
}
// OperatorMediationMarker: { readonly operatorRef: string; readonly mediatedAt: Timestamp }  — operational only
```

It must **not** carry a raw credential, a process-env value, a provider prompt/payload, chain-of-thought,
hidden reasoning, or an arbitrary metadata bag. Distinctions enforced: **athlete input ≠ operator decision**;
**operator mediation ≠ athlete decision**; **manual input ≠ automatic evidence** beyond what the existing
intake path already represents.

### `[DECISION]` Decision 5 — Output contract → **`OfflineReflectionRuntimeOutcome` (closed, safe, ref-only + projected reflection)**

```ts
interface OfflineReflectionRuntimeOutcome {
  readonly status: OfflineReflectionStatus;       // closed union (Decision/§6)
  readonly reflection?: SafeReflectionProjection; // present only on reflection-ready
  readonly deliveryWithheld: true;                // always true in this slice
  readonly decisionCapture: DecisionCapturePrompt;// a PROMPT/REF inviting athlete-declared decision — NOT a decision
  readonly trace: OrchestrationTrace;             // ref-only, from orchestrate
  readonly rawRetained: false;                    // explicit
}
// SafeReflectionProjection: the VALIDATED rendered message text (already past validateDraft) + an explicit
// inference/fact marker + validationPassed:true. It is the display-eligible product phrasing — NOT raw
// provider output.
```

It must **not** include: a raw provider response; a raw secret; hidden reasoning; an arbitrary metadata bag;
delivery success as a decision; a system-created `AthleteDecision`.

### `[DECISION]` Decision 6 — Delivery → **withheld (render-only)**

The runtime omits `command.delivery` and the `deliverySink`/`deliveryRecordRepository` deps → orchestration
runs render-only → `OrchestrationOutcome.kind === "rendered"`. The runtime maps this to `reflection-ready`
and sets `deliveryWithheld: true`. **No silent delivery.**

### `[DECISION]` Decision 7 — Provider → **deterministic fake only**

Inject `FakeProviderClient({ scenario: "safe" })` + a render `config`/`secret` ref that the fake ignores. No
live provider; `LiveCallPolicy` untouched and disabled-by-default; live remains out of scope.

### `[DECISION]` Decision 8 — Persistence/events → **existing in-memory ports only; no new persistence; no events**

Use the existing in-memory `ObservationSetRepository` (for `ingestManualInput`) and
`InMemoryRenderedMessageRecordRepository` (for `orchestrate`). **No** new repository type, **no** DB/schema,
**no** `providerAttemptRepository`, **no** `eventRepository`, **no** `recordEvents`. The two saves are the
**existing** intake (Impl 010/013) and rendered-message-record (Impl 015) boundaries — not new surfaces.

### `[DECISION]` Decision 9 — AthleteDecision → **invite, never create**

The outcome's `decisionCapture` is a safe prompt/ref structuring a **future** athlete-declared/athlete-reported
decision. The runtime creates **no** `AthleteDecision` and references the existing athlete-decision boundary
only conceptually.

### `[DECISION]` Decision 10 — Guards/tests → **functional + defining negative-capability**

Two test files (Decision/§7), deterministic fakes only, mirroring the `application-orchestration` test pair.
Negative tests are defining tests.

---

## 5. Required Runtime Flow Candidate — evaluated

The mission's candidate flow is **accepted with one correction** (the renderable middle):

```text
OfflineReflectionRuntimeCommand
→ ingestManualInput(submission)                         // faithful intake; rejection → input-rejected
→ [renderable supplied in command]                      // §2.3: NO observation→renderable service exists yet
→ orchestrateRenderDeliver(render-only, fakes)          // requestRealProviderRendering → mandatory validateDraft
→ project SafeReflectionProjection from the saved RenderedMessageRecord
→ return OfflineReflectionRuntimeOutcome (deliveryWithheld:true; decisionCapture prompt; no AthleteDecision)
```

`[DECISION]` The "derive/compose the renderable from manual input" step is **rejected for this slice** —
there is no such composition in code (§2.3). `orchestrateRenderDeliver` **is** the correct composition point
for the render half (it already supports render-only partial composition); it is used **without** delivery,
review, audit, or events. The observation→renderable reasoning composition is a separate, later slice.

---

## 6. Required Outcome Statuses (closed, code-grounded)

```ts
type OfflineReflectionStatus =
  | "reflection-ready"   // ingest ok + orchestrate "rendered" → validated reflection; delivery withheld
  | "input-rejected"     // ingestManualInput returned { status: "rejected" } → fail-closed, no render
  | "not-rendered"       // orchestrate "provider-not-rendered" (incl. validateDraft failure) → no record
  | "recording-failed"   // orchestrate "recording-failed" (required persistence threw) → safe stop
  | "unexpected-failure";// any unexpected error → safe result, no raw content
```

`[FACT]` `delivered` / `delivery-failed` / `review-rejected` / `display-ineligible` / `partial-success`
**cannot** occur (delivery, review, and events are never selected). The mapping from `OrchestrationOutcomeKind`
is explicit and total over the reachable kinds.

---

## 7. Required File Layout

```text
src/modules/application-orchestration/application/offline-reflection-runtime.ts          (new — production)
src/modules/application-orchestration/tests/offline-reflection-runtime.test.ts           (new — functional)
src/modules/application-orchestration/tests/offline-reflection-runtime-negative-capability.test.ts (new — guard)
```

Export the new symbols (`offlineReflectionRuntime`, `OfflineReflectionRuntimeCommand`,
`OfflineReflectionRuntimeOutcome`, `OfflineReflectionStatus`, `OperatorMediationMarker`,
`SafeReflectionProjection`, `DecisionCapturePrompt`) via
`application-orchestration/application/index.ts` (an Impl 032R-A block).

**Must NOT create:** `src/modules/{runtime,api,server,ui,frontend,worker,auth,session,db,database,migrations}/`,
`scripts/offline-reflection-runtime.mjs`. **Must NOT edit:** `package.json`, `package-lock.json`,
`scripts/operator-live-smoke.mjs`.

---

## 8. Required Test Contract — `offline-reflection-runtime.test.ts` (functional)

All with deterministic fakes (`FakeProviderClient` "safe"), in-memory repos, fixed injected timestamps, and a
`req(supportRenderable())` renderable:

1. Valid manual input + safe renderable → `reflection-ready`; `reflection` present; `validationPassed: true`;
   `deliveryWithheld: true`.
2. Invalid manual input (e.g. missing athlete-ref / `inference-smuggled-as-fact`) → `input-rejected`; no
   render attempted; `reflection` absent.
3. Runtime does **not** call a live provider by default (spy/throwing transport never invoked; only the fake
   client is used).
4. Runtime requires **no** real secret (a sentinel/empty `ProviderSecretRef`; no `process.env` read).
5. Runtime performs **no** real delivery (no `deliverySink` passed; outcome `deliveryWithheld: true`).
6. Outcome carries the withheld status/flag on success.
7. Runtime creates **no** `AthleteDecision` (no athlete-decision repository touched; `decisionCapture` is a
   prompt/ref only).
8. Operator mediation is recorded as **mediation**, not decision ownership (the marker is operational; it
   never produces a decision).
9. The athlete remains the decision owner (the outcome invites an athlete-declared decision; creates none).
10. Inference is marked as inference, not fact (the projection carries the inference marker; never asserts
    fact).
11. `validateDraft` remains mandatory (a renderable that fails validation → `not-rendered`, no reflection).
12. Provider output is not returned raw (no raw draft/payload in the outcome; only the validated message).
13. Hidden reasoning is not returned (no chain-of-thought/metadata bag in the outcome).
14. No event recording occurs implicitly (no `eventRepository`/`recordEvents`; none invoked).
15. No new persistence is introduced (only the existing in-memory observation + rendered-message saves).
16. `not-rendered` and `recording-failed` map correctly from the orchestration outcome.

## 9. Required Test Contract — `offline-reflection-runtime-negative-capability.test.ts` (defining guards)

Mirroring the `application-orchestration` negative-capability pattern:

- New file exists at the planned path; no `process.env` token in it; the repo-wide one-file seal stays exactly
  `["process-environment-credential-source-adapter.ts"]`.
- No vendor/SDK/network/retry/scheduler token; no cloud-provider token.
- No forbidden import: not live transport, not the cloud-secret adapter, not the process-env adapter, not a
  credential resolver, not operator-smoke; no delivery-channel implementation import for real delivery.
- No module outside `application-orchestration` imports the new symbols inappropriately; **no domain module
  imports the runtime**.
- No forbidden directory created (`runtime`/`api`/`server`/`ui`/`frontend`/`worker`/`auth`/`session`/`db`/
  `database`/`migrations`); no `scripts/offline-reflection-runtime.mjs`.
- devDependencies remain exactly `["@types/node","typescript"]`; no `dependencies` key; no npm script added;
  no package script references the runtime.
- `scripts/operator-live-smoke.mjs` unchanged and does not reference the runtime symbols; `scripts/` still
  contains only that one file.
- Source contains no `AthleteDecision` construction; no event-recording/delivery side-effect token; no
  raw-secret/raw-provider-output exposure.

## 10. Guard Strategy

- **All existing guards remain green** — process-env seal, managed/cloud-secret negative capability, operator
  smoke, no-default-live-call, orchestration negative capability, and all Impl 001–029 suites.
- **New guard** mirrors `explicit-orchestration-negative-capability.test.ts`, adding the runtime-specific
  assertions (no script/CLI/API/UI/worker/DB/auth, no AthleteDecision creation, delivery withheld, no live
  provider default).

## 11. Boundary / Import Rules

**Allowed:** `application-orchestration` surfaces; manual-input public surface (`ingestManualInput`);
`rendering` public surfaces (`FakeProviderClient`, `InMemoryRenderedMessageRecordRepository`,
`RenderingRequest`, validator types); `delivery` **types** only if needed to express *withheld* (no sink
wired); shared-kernel (`Timestamp`); deterministic fakes in tests. **Forbidden:** domain modules importing
the runtime; operator-smoke importing the runtime (or vice versa); importing the cloud-secret adapter, live
transport, credential resolvers, or the process-env adapter; reading `process.env`; real delivery; event
side-effects; `AthleteDecision` creation; API/server/UI/worker/auth/db modules; package-script/deployment/CI
changes; SDK/dependency changes.

## 12. Required Distinctions (carried into the implementation)

```text
operator-mediated runtime ≠ operator smoke
operator mediation ≠ athlete decision
offline runtime ≠ deployment target
runtime output ≠ delivery success
delivery success ≠ athlete decision
validated draft ≠ recommendation quality
provider output ≠ truth
manual input ≠ automatic evidence (beyond the existing intake boundary)
reflection ≠ prescription
AthleteDecision must be athlete-declared or athlete-reported
```

## 13. Relationship To Existing Architecture

- **Spec 032R / 033** — realizes the selected operator-mediated offline reflection runtime for athlete-facing
  manual reflection.
- **Impl 025** — uses `orchestrateRenderDeliver` (render-only); the runtime **wraps** the composition
  service, it is not the service.
- **Impl 013** — uses `ingestManualInput` for faithful athlete intake (its one existing save boundary).
- **Impl 014/015** — `validateDraft` stays mandatory; the rendered-message record is the existing boundary
  that holds the validated, display-eligible message the projection reads.
- **Impl 016** — delivery withheld; **delivery success ≠ athlete decision**.
- **Impl 009** — the runtime invites but never creates an `AthleteDecision` (athlete-declared/reported only).
- **Impl 021/023/028/029** — live calls, the process-env seal, and the secret seams are untouched and not
  imported.

## 14. Open Questions (deferred to Implementation 032R-A / a later slice)

1. Exact file/module host confirmed as `application-orchestration/application/` (this plan).
2. First runtime is **operator-mediated** (this plan); athlete-direct is later.
3. Exact `ManualInputSubmission` fields surfaced in the command vs. passed through.
4. Exact `SafeReflectionProjection` shape (text + inference marker + validation status).
5. Whether review precedes the athlete seeing output (default: no; athlete/operator reviews).
6. The observation→renderable **reasoning composition** (the deferred middle) — a separate future slice.
7. Persistence beyond in-memory (default: none).
8. Auth (default: none).
9. Delivery integration (default: none).
10. Live-provider gating in the runtime (default: disabled, fake provider).
11. How this surface informs the deployment target (default: none until a networked surface).

## 15. Implementation Task Preview

**Next mission: Implementation 032R-A — Operator-mediated offline reflection runtime (pure function).**

Add `offlineReflectionRuntime(command, deps)` in `application-orchestration/application/`, composing
`ingestManualInput` + render-only `orchestrateRenderDeliver` over deterministic fakes, projecting a safe
athlete-facing reflection, with delivery withheld, no `AthleteDecision`, no events, no new persistence; plus
the two test files.

Explicitly:

```text
no executable script · no package script · no CLI/API/UI/worker · no DB/auth/migrations ·
no deployment/CI files · no SDK/dependency · no live provider (fake only) · no real secret ·
no real delivery · no AthleteDecision creation · no event recording · no operator-smoke change ·
no process-env read · no domain import of the runtime
```

---

## 16. Success Criteria

Can Aurora plan the smallest safe slice for an operator-mediated offline reflection runtime — composing the
proven manual-intake and validated-render ends over deterministic fakes into a safe, inference-marked,
athlete-facing reflection with delivery withheld and no athlete decision created — **without** adding a
script/CLI/API/UI/worker, auth/DB, package scripts, deployment/CI files, SDKs, secrets, live calls, real
delivery, event recording, domain coupling, or a production-rollout claim? **Yes — as planned above**, scoping
honestly around the absent observation→renderable composition (renderable injected in this slice).
Validation at authorship: `tsc --noEmit` clean; `node --test` 710/710; no code, test, package, runtime,
deployment, CI, SDK, or dependency change introduced by this document.
