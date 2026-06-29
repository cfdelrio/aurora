# Aurora — Technical Spec 034A — Observation-to-Renderable Composition Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 034 (`09e4487`). This document translates
> the selected boundary — a new dedicated **reflection-composition** application module — into a TS-strict
> implementation plan **grounded in the real code**. It is **plan only**: it implements no code, modifies no
> production code or test, edits no package file, adds no runtime/API/UI/CLI/worker/DB/auth/deployment/CI/SDK
> file, changes no operator smoke or live-provider behavior, and weakens no guard. Recent sequence:
> `52a93f4` (Impl 032R-A) → `a4f8302` (Docs post 032R-A) → `09e4487` (Spec 034). Validation at authorship:
> `tsc --noEmit` clean; `node --test` 737/737.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation.

- `[FACT]` This document plans **Implementation 034-A**; it writes no production code and no test.
- `[FACT]` It opens one edge: a pure, synchronous application composition function that **sequences** the
  existing observation / reasoning / understanding / decision-support / rendering public surfaces into a
  `RenderableDomainOutput` / `RenderingRequest`, **authoring no domain artifact itself**.
- `[DECISION]` The plan is the **smallest safe slice** and is honest about a real constraint (the Impl 006
  harness *authors* domain inputs — §2.x — which a production "compose, author nothing" boundary must not
  fabricate; they become **caller-supplied** inputs).

---

## 1. Context recap

`[FACT]` Spec 034 selected **Option C** — a new dedicated `reflection-composition` application boundary that
promotes the Impl 006 end-to-end composition (today a **test harness**) to a production service, without
weakening the Impl 025 application-orchestration guard and without inverting decision-support's dependencies.
`offlineReflectionRuntime` (Impl 032R-A) keeps its injected-renderable seam and will later consume this
boundary's `RenderingRequest` via a caller.

---

## 2. Surface Gap Analysis (grounded in real code)

Exact answers to the 23 required questions. No invented names; no assumed signatures.

### 2.1 Observation intake / `ObservationSet` (Q1)
`observation` exports `recordObservationSet(input): ObservationSet` and `ingestManualInput({ submission,
observationSetRepository })` (Impl 013). `ObservationSet` exposes `.active()` (active observations), each with
`.provenance.reference`; observations carry **no meaning slot**.

### 2.2 Signal detection (Q2)
`observation.detectSignals({ set, frameFor })` → `readonly (Signal | SignalRejection)[]` (each item has
`.outcome === "signal" | "rejection"`). `frameFor(observation): ContextualFrame` is **caller-supplied** (the
coordinator invents no frame). `contextualFrame({ purpose?, sessionContext?, expectedRange?, missingContext? })`.
**Signal ≠ Evidence.**

### 2.3 Reasoning / evidence / hypothesis (Q3)
`reasoning` exports `openHypothesis({ claim, scope, athleteRef, falsifiers }): Hypothesis`,
`attachSignalAsEvidence({ hypothesis, signal, direction, reasoningNote, at }): Hypothesis`,
`transitionHypothesis(...)`, plus `hypothesisClaim`, `hypothesisScope`, `falsifier`, and
`HypothesisRepository` / `InMemoryHypothesisRepository`. The claim/scope/falsifiers are **caller-supplied
domain inputs**. **Hypothesis ≠ Fact.**

### 2.4 Understanding (Q4)
`understanding` exports `reasoningOutcomeFrom({ hypothesis, dimension, conditions, at })`,
`updateUnderstandingFromOutcome({ profile, outcome }): UnderstandingProfile`,
`produceUnderstandingAssessment({ profile, dimensionKey })`, `markUnderstandingStale`,
`UnderstandingProfile.initialize({ athleteRef })`, `understandingDimension(...)`, and
`UnderstandingProfileRepository` / `InMemoryUnderstandingProfileRepository`. The dimension/conditions are
**caller-supplied**. **Understanding ≠ Stored Truth.**

### 2.5 Decision-support (Q5)
`decision-support` exports `openDecisionSupportCase({ opportunity, assessment, purpose, risk, candidate,
trace, claimState })`, `evaluateDecisionSupportCase({ decisionCase })` → an evaluated case with
`selectedOutput: TerminalOutput | undefined`, plus `verifyTraceability(hypothesis)`, `claimStateOf(hypothesis)`,
`decisionOpportunity(...)`, `purposeContext(...)`, `noRisk()`, and `DecisionSupportCaseRepository` /
`InMemoryDecisionSupportCaseRepository`. The opportunity/purpose/risk/candidate are **caller-supplied**.

### 2.6 `TerminalOutput` (Q6)
`TerminalOutput = DecisionSupport | Inquiry | Withholding` (decision-support domain). DecisionSupport carries
`VoiceMode` (Reflection in the reflection path), uncertainty/limitations visible.

### 2.7 `RenderableDomainOutput` (Q7)
A rendering domain type (`sourceCaseRef`, `kind` (`support`/`inquiry`/`withholding`), `voice?`, `intent?`,
`contentAtoms`, `allowedClaims`, `forbiddenClaims`, `uncertaintyVisibleRequired`, `limitations`,
`traceability`, `agencyRequired`, `conditions`). Exported from `rendering/index.ts`.

### 2.8 `TerminalOutput → RenderableDomainOutput` path (Q8)
**`renderableFromTerminalOutput({ sourceCaseRef, output })`** — a **production** function exported from
`rendering/index.ts` (exercised in `__tests__/decision-support-rendering.test.ts`). This is the production
mapping; the composition calls it. **No test-only hack needed.**

### 2.9 `RenderingRequest` (Q9) and builder (Q10)
`RenderingRequest = { renderable: RenderableDomainOutput; ...optional style }` (rendering domain). Tests build
it with `req(renderable)` = `{ renderable }` (a fixture). The composition can construct `{ renderable }`
inline, or expose the `RenderableDomainOutput` and let `offlineReflectionRuntime` wrap it.

### 2.10 Repository interfaces required (Q11) and in-memory fakes (Q12)
The chain uses (when persistence is exercised): `ObservationSetRepository`, `HypothesisRepository`,
`UnderstandingProfileRepository`, `DecisionSupportCaseRepository`. In-memory adapters exist for all four
(`InMemory*`). The Impl 006 harness runs the chain **without** persisting (pure artifacts threaded
step-to-step); persistence is optional and injected.

### 2.11 Trace / ref types (Q13)
`verifyTraceability(hypothesis)` → a traceability result; `claimStateOf(hypothesis)` → claim state; ids are
carried as plain strings (`String(brandedId)`); rendering renderable carries a `traceability` field
(`{ status, summary, observationSetId? }`).

### 2.12 Confidence / uncertainty / claim confidence (Q14)
Decision-support gates on `claimStateOf` + `verifyTraceability`; the renderable carries
`uncertaintyVisibleRequired` and limitations. Hypothesis confidence governs whether decision-support yields
DecisionSupport vs Withholding/Inquiry.

### 2.13 Invariant-enforcement sites (Q15–Q18)
- **Observation ≠ Evidence:** an observation has no meaning/signal slot (Impl 006 AC1); only `detectSignals`
  produces signals.
- **Signal ≠ Evidence:** a signal becomes evidence only via `attachSignalAsEvidence` (reasoning).
- **Hypothesis ≠ Fact:** hypotheses carry falsifiers + claim state; decision-support gates on claim state.
- **Understanding ≠ Stored Truth:** understanding is produced from a hypothesis **outcome**, not raw signals;
  it can be marked stale.

### 2.14 `AthleteDecision` source constraints (Q19)
`athlete-decision.ts`: athlete-owned; `source: "athlete-declared" | "athlete-reported"`, never
inferred/system; re-enters only as an Observation (`__tests__/decision-observation-adapter.ts`). The
composition creates **none**.

### 2.15 application-orchestration guard (Q20)
The Impl 025 negative-capability guard scans **application-orchestration** production files and forbids
importing `observation`/`reasoning`/`understanding`/`athlete`. It does **not** constrain a separate module.

### 2.16 Cross-module import direction (Q20 cont.)
The module boundary guards forbid **upstream → downstream** imports (observation must not import reasoning;
reasoning must not import understanding/decision-support; understanding must not import decision-support;
etc.). A new `reflection-composition` module is **downstream of all four** — importing their public surfaces
is the **allowed** direction. **No production module imports these today** (only the `__tests__` harness);
`reflection-composition` would be the first production consumer, which is architecturally sound.

### 2.17 Module export conventions (Q21)
Each module: `index.ts` = `export * from "./domain/index.ts"; export {...} from "./application/...";`. The new
module mirrors this (`reflection-composition/index.ts` → `application/index.ts`).

### 2.18 Nearby test style (Q22)
`node:test` + `node:assert/strict`; in-memory repos + hand-built fixtures (`recordObservationSet`,
`contextualFrame`, `openHypothesis`, `req(supportRenderable())`); deterministic injected timestamps; a
functional test + a negative-capability test per module.

### 2.19 Harness-vs-production gap (Q23)
The Impl 006 harness **authors** the per-step domain inputs (the `frameFor` frames, the hypothesis
claim/scope/falsifiers, the dimension/conditions, the decision opportunity/purpose/risk/candidate). A
production "compose, author nothing" boundary **must not fabricate** these — they become **caller-supplied
inputs** in the composition command. The composition's job is to **sequence** the existing surfaces and fail
closed; it authors no domain artifact (every artifact is produced by the existing module surfaces from
caller-supplied inputs).

---

## 3. Central Question

> What is the smallest safe implementation slice for a dedicated `reflection-composition` application boundary
> that composes the existing observation/reasoning/understanding/decision-support/rendering public surfaces
> into a `RenderableDomainOutput` / `RenderingRequest`, without presenting inference as fact, fabricating
> evidence, creating `AthleteDecision`, or weakening existing guards?

**Answer:** a pure, **synchronous** `composeObservationToRenderable(command, deps)` in a new
`reflection-composition` module that accepts an `ObservationSet` + the **caller-supplied** per-step domain
inputs the existing coordinators require + injected (optional) repositories, **sequences** `detectSignals →
attachSignalAsEvidence(openHypothesis) → reasoningOutcomeFrom/updateUnderstandingFromOutcome/
produceUnderstandingAssessment → openDecisionSupportCase/evaluateDecisionSupportCase →
renderableFromTerminalOutput`, and returns a closed outcome (renderable-ready with a `RenderableDomainOutput`/
`RenderingRequest`, or a withholding/blocked disposition). It calls no provider, runs no `validateDraft`,
performs no delivery, creates no `AthleteDecision`, and authors no domain artifact.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Scope → **pure synchronous composition function; sequences existing surfaces; authors nothing**

Implementation 034-A adds `composeObservationToRenderable(command, deps)` — a pure, synchronous application
function (the chain is synchronous; no provider/network/async). It **sequences** the existing public
coordinators and `renderableFromTerminalOutput`, threading artifacts, and **fails closed** at each step. It
**authors no domain artifact** — every Signal/Hypothesis/Understanding/DecisionSupportCase/TerminalOutput is
produced by the existing module surfaces from **caller-supplied** inputs. It does **not** call a rendering
provider, does **not** run `validateDraft`, does **not** deliver. It prepares the renderable input consumed
later by render-only orchestration (`offlineReflectionRuntime`).

### `[DECISION]` Decision 2 — Placement / module name → **new `reflection-composition` module**

```text
src/modules/reflection-composition/application/observation-to-renderable-composition.ts   ← CHOSEN
src/modules/reflection-composition/application/index.ts
src/modules/reflection-composition/index.ts
```

A neutral application-composition module, **downstream** of the four cores (allowed import direction — §2.16),
sibling to `application-orchestration`. **Not** in `application-orchestration` (Impl 025 guard); **not** in
`decision-support` (would invert dependencies); **not** a domain module.

### `[DECISION]` Decision 3 — Function shape → **`composeObservationToRenderable(command, deps): ObservationToRenderableOutcome` (synchronous)**

Synchronous (distinct from the async `offlineReflectionRuntime`). `command` carries the `ObservationSet` +
the caller-supplied domain inputs; `deps` carries the injected (optional) repositories. No globals, no
service locator, no `process.env`, no arbitrary metadata bag.

### `[DECISION]` Decision 4 — Input scope → **accept an `ObservationSet` (not `ManualInputSubmission`)**

Accept an already-recorded `ObservationSet` (Option A). Manual intake belongs to Impl 032R-A; this bridge is
the step **after** intake. The command also carries the caller-supplied per-step inputs (frames, hypothesis
seed, dimension/conditions, decision opportunity/purpose/risk/candidate) — the composition fabricates none.

### `[DECISION]` Decision 5 — Output contract → **closed `ObservationToRenderableOutcome` union**

```ts
type ObservationToRenderableStatus =
  | "renderable-ready"          // a DecisionSupport/Inquiry TerminalOutput → RenderableDomainOutput produced
  | "insufficient-observations" // ObservationSet invalid/empty → fail closed
  | "no-signal"                 // detectSignals produced no usable Signal
  | "hypothesis-unsupported"    // no signal could be attached as supporting evidence
  | "understanding-unavailable" // no dimension assessment could be produced
  | "withheld"                  // decision-support produced Withholding or no terminal output (safe non-claim)
  | "unexpected-failure";       // any unexpected error → safe result, no raw content
```

`renderable-ready` carries the `RenderableDomainOutput` (and optionally a `RenderingRequest = { renderable }`),
a **trace/ref summary** (string ids), an **inference/fact marker** (`presentedAs: "reflection"` /
`uncertaintyVisible: true`), a claim/uncertainty summary if available, and `rawRetained: false`. It must
**not** include raw provider output, hidden reasoning, a raw secret, an `AthleteDecision`, a delivery outcome,
or a live-provider result. (Final status names confirmed against code in implementation; the catalog is
closed.)

### `[DECISION]` Decision 6 — Harness promotion → **promote the SEQUENCE, not the AUTHORING**

Promote to production collaborators: `detectSignals`, `attachSignalAsEvidence`/`openHypothesis`,
`reasoningOutcomeFrom`/`updateUnderstandingFromOutcome`/`produceUnderstandingAssessment`,
`verifyTraceability`/`claimStateOf`/`openDecisionSupportCase`/`evaluateDecisionSupportCase`,
`renderableFromTerminalOutput`. Keep **caller-supplied** (tests use fixtures; production callers supply real
values): the `frameFor` frames, the hypothesis claim/scope/falsifiers, the dimension/conditions, the decision
opportunity/purpose/risk/candidate. In-memory repos are used in tests. **The boundary authors nothing
independently** — it may call surfaces that create their own artifacts per their own rules, but it fabricates
no Signal, Evidence, Hypothesis, Understanding, or AthleteDecision.

### `[DECISION]` Decision 7 — Traceability → **ref-only summary; verification mandatory; withhold if insufficient**

The output carries observation/signal/hypothesis/understanding/decision-support/renderable refs (string ids)
plus the renderable's `traceability`. `verifyTraceability` + `claimStateOf` remain mandatory inside the
composition; an unresolved/untraceable claim yields `withheld`, never a fabricated claim. No hidden reasoning,
no raw provider text.

### `[DECISION]` Decision 8 — Failure behavior → **fail closed at every step**

Invalid/insufficient `ObservationSet` → `insufficient-observations`; no usable signal → `no-signal`; no
supporting evidence attachable → `hypothesis-unsupported`; no dimension assessment → `understanding-unavailable`;
decision-support yields Withholding/no terminal output → `withheld`; any unexpected throw → `unexpected-failure`.
It never fills a gap by asserting certainty.

### `[DECISION]` Decision 9 — `offlineReflectionRuntime` integration → **deferred (keep the injected-renderable seam)**

Implementation 034-A does **not** edit `offlineReflectionRuntime`. The composition produces a
`RenderableDomainOutput`/`RenderingRequest`; a **caller** (a future runtime shell or the operator entrypoint)
wires `composeObservationToRenderable → offlineReflectionRuntime`. Wiring is a later slice; the runtime stays
decoupled and its negative-capability guard unchanged.

### `[DECISION]` Decision 10 — Guards / tests → **functional + defining negative-capability**

Two test files; deterministic fakes/in-memory; mirroring the module test pattern. Negative tests are defining.

---

## 5. Required Composition Flow Candidate — evaluated

Accepted, grounded in the Impl 006 sequence + the production `renderableFromTerminalOutput`:

```text
ObservationToRenderableCommand
→ accept/validate ObservationSet                                  (else insufficient-observations)
→ detectSignals({ set, frameFor })                               (else no-signal)
→ openHypothesis(seed) + attachSignalAsEvidence({...signal...})  (else hypothesis-unsupported)
→ reasoningOutcomeFrom + updateUnderstandingFromOutcome + produceUnderstandingAssessment
                                                                  (else understanding-unavailable)
→ verifyTraceability + claimStateOf + openDecisionSupportCase + evaluateDecisionSupportCase
→ evaluated.selectedOutput:
     DecisionSupport/Inquiry → renderableFromTerminalOutput({ sourceCaseRef, output }) → renderable-ready
     Withholding / undefined → withheld
→ NO rendering provider call · NO validateDraft yet · NO delivery · NO AthleteDecision
```

`[FACT]` Ordering matches the real Impl 006 chain (intake → detect → reason → understand → decision-support →
renderable). The per-step **domain inputs** (frames, hypothesis seed, dimension, opportunity/purpose/risk/
candidate) are caller-supplied; the composition invents none. `validateDraft` stays **downstream** (it runs
inside the render path when the runtime later renders), never bypassed.

---

## 6. Required File Layout

```text
src/modules/reflection-composition/application/observation-to-renderable-composition.ts   (new — production)
src/modules/reflection-composition/application/index.ts                                   (new — surface)
src/modules/reflection-composition/index.ts                                               (new — module surface)
src/modules/reflection-composition/tests/observation-to-renderable-composition.test.ts    (new — functional)
src/modules/reflection-composition/tests/observation-to-renderable-composition-negative-capability.test.ts (new — guard)
```

**Must NOT create:** `src/modules/{api,server,ui,frontend,worker,auth,session,db,database,migrations}/`,
`scripts/observation-to-renderable.mjs`. **Must NOT edit:** `package.json`, `package-lock.json`,
`scripts/operator-live-smoke.mjs`.

---

## 7. Required Test Contract — `observation-to-renderable-composition.test.ts` (functional)

Deterministic, in-memory/fakes, fixed timestamps (modeled on the Impl 006 harness inputs):

1. A valid `ObservationSet` (+ caller inputs) → `renderable-ready` with a `RenderableDomainOutput`.
2. Output preserves the inference/fact distinction (`presentedAs: "reflection"` / uncertainty visible).
3. Output preserves a trace/ref summary (observation/signal/hypothesis/understanding/decision-support/renderable refs).
4. Observation is not treated as evidence (only `detectSignals` yields signals).
5. Signal is not treated as evidence (only `attachSignalAsEvidence` makes evidence).
6. Hypothesis is not treated as fact (claim state gates decision-support).
7. Understanding is not stored truth (produced from the hypothesis outcome; can be stale).
8. Insufficient observations → `insufficient-observations` (fail closed).
9. No usable signal → `no-signal`.
10. Unsupported claim / insufficient traceability → `withheld` (safe non-claim).
11. No `AthleteDecision` is created.
12. No delivery is triggered.
13. No rendering provider is called.
14. `validateDraft` remains downstream (not bypassed; not invoked here).
15. No raw provider output is returned.
16. No hidden reasoning is returned.

## 8. Required Test Contract — `observation-to-renderable-composition-negative-capability.test.ts` (defining guards)

- The new module is **not** `application-orchestration`; the Impl 025 guard remains unchanged and green
  (re-asserted: application-orchestration imports no `observation`/`reasoning`/`understanding`/`athlete`).
- No domain module imports `reflection-composition`.
- `reflection-composition` does **not** import the `application-orchestration` offline runtime.
- `reflection-composition` does **not** import provider/live transport, the cloud-secret adapter, the
  process-env adapter, or a delivery channel implementation; reads no `process.env`.
- `reflection-composition` constructs no `AthleteDecision` (no `newAthleteDecisionId`/`athleteDecision(`/etc.).
- `reflection-composition` triggers no delivery and records no events (no delivery/event-recording import).
- No forbidden directory created; no `scripts/observation-to-renderable.mjs`; no npm script.
- devDependencies remain exactly `["@types/node","typescript"]`; no `dependencies`; package/lockfile unchanged.
- Operator script unchanged.
- Imports of observation/reasoning/understanding/decision-support/rendering are via their **public index**.

## 9. Boundary / Import Rules

**Allowed:** `reflection-composition` importing the **public** surfaces of observation / reasoning /
understanding / decision-support; importing rendering **types** (`RenderableDomainOutput`, `RenderingRequest`,
`renderableFromTerminalOutput`) via `rendering/index.ts`; deterministic fakes + in-memory repos in tests;
shared-kernel (`Timestamp`). **Forbidden:** application-orchestration importing observation/reasoning/
understanding/athlete (unchanged); domain modules importing `reflection-composition`; `reflection-composition`
importing the offline runtime, provider/live transport, a delivery channel implementation, or the
cloud-secret adapter; reading `process.env`; creating `AthleteDecision`; triggering delivery; recording events;
persisting raw provider output; adding runtime/API/UI/CLI/worker/auth/db/deployment/CI files; package-script
or SDK/dependency changes.

## 10. Required Distinctions

```text
ObservationSet ≠ Evidence · Signal ≠ Evidence · Hypothesis ≠ Fact · Understanding ≠ Stored Truth ·
RenderableDomainOutput ≠ RenderedMessage · RenderingRequest ≠ provider call · renderable-ready ≠ validated draft ·
validated draft ≠ recommendation quality · renderable reflection ≠ AthleteDecision · delivery success ≠ athlete decision ·
operator action ≠ athlete decision · provider output ≠ truth · reflection ≠ prescription ·
application composition ≠ domain authorship · test harness ≠ production service
```

## 11. Relationship To Existing Architecture

- **Spec 034** — realizes Option C (the reflection-composition boundary).
- **Impl 006** — its end-to-end **test harness** sequence is promoted to a production service; its
  *authoring* stays caller-supplied (the boundary authors nothing).
- **observation/reasoning/understanding/decision-support** — composed via their public coordinators; `Signal`,
  `Hypothesis`, `Understanding` invariants unchanged and mandatory.
- **rendering** — `renderableFromTerminalOutput` (production) is the `TerminalOutput → RenderableDomainOutput`
  mapping; `validateDraft` stays downstream.
- **Impl 032R-A** — `offlineReflectionRuntime` keeps its injected-renderable seam; integration is a later
  slice (Decision 9); the Impl 025 guard is preserved.
- **Impl 009** — `AthleteDecision` stays athlete-declared/reported; the composition creates none.

## 12. Open Questions (deferred to Implementation 034-A / a later slice)

1. Final status-name confirmation against code; whether to expose `RenderableDomainOutput` only or also
   `RenderingRequest = { renderable }`.
2. Exact shape of the caller-supplied per-step inputs in the command (frames, hypothesis seed, dimension,
   opportunity/purpose/risk/candidate) — typed from the existing module types via public index.
3. Whether the composition persists through the injected repositories or threads pure artifacts (the Impl 006
   harness threads pure; persistence optional).
4. Whether multi-signal / multi-hypothesis composition is in the first slice or single-signal first.
5. The integration wiring slice (composeObservationToRenderable → offlineReflectionRuntime).
6. Whether a future runtime shell invokes this, vs leaving it a pure callable surface.

## 13. Implementation Task Preview

**Next mission: Implementation 034-A — Observation-to-renderable composition (pure function).**

Add `composeObservationToRenderable(command, deps)` in a new `reflection-composition` application module that
sequences the existing observation/reasoning/understanding/decision-support/rendering public surfaces into a
`RenderableDomainOutput`/`RenderingRequest`, authoring no domain artifact, failing closed, with no provider
call, no `validateDraft`, no delivery, and no `AthleteDecision`; plus the two test files.

Explicitly:

```text
new neutral module (not application-orchestration, not decision-support, not domain) · pure sync function ·
no rendering provider call · no validateDraft · no delivery · no AthleteDecision · no events · no process.env ·
no live transport · no cloud-secret adapter · no new DB/auth/runtime-shell · no package script ·
no SDK/dependency · Impl 025 guard intact · offlineReflectionRuntime unchanged
```

---

## 14. Success Criteria

Can Aurora plan the smallest safe slice for the observation→renderable bridge — a pure synchronous
composition that sequences the existing public surfaces into a `RenderableDomainOutput`/`RenderingRequest`,
authoring no domain artifact, failing closed, preserving every invariant — **without** presenting inference
as fact, fabricating evidence, creating `AthleteDecision`, calling a provider, running `validateDraft`,
delivering, recording events, adding persistence, or weakening any guard? **Yes — as planned above**, in a new
`reflection-composition` module (downstream of the four cores, the allowed import direction), with the Impl
006 *authoring* kept caller-supplied and only the *sequence* promoted to production. Validation at authorship:
`tsc --noEmit` clean; `node --test` 737/737; no code, test, package, runtime, deployment, CI, SDK, or
dependency change introduced by this document.
