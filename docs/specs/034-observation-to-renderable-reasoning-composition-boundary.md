# Aurora — Specification 034 — Observation-to-Renderable Reasoning Composition Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral boundary** for the
> bridge that Implementation 032R-A deliberately scoped out: deriving a renderable athlete-facing reflection
> from manual observations through Aurora's existing reasoning / understanding / decision-support boundaries.
> It is **behavioral-only**: it implements no code, writes no technical spec, modifies no production code or
> test, edits no package file, adds no runtime/API/UI/CLI/worker/DB/auth/deployment/CI/SDK file, and weakens
> no guard. Recent sequence: `52a93f4` (Impl 032R-A) → `a4f8302` (Docs post 032R-A). Validation at
> authorship: `tsc --noEmit` clean; `node --test` 737/737.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document **decides** where the observation→renderable composition belongs and what it may /
  may not do. It defines no file layout, no signatures, no code.
- `[FACT]` It opens **no** code edge. Nothing in the current codebase changes.
- `[DECISION]` The composition is selected only against the **real** module surfaces and guards; no
  implementation detail is invented.

---

## 1. Context & the current gap

`[FACT]` Implementation 032R-A added `offlineReflectionRuntime(command, deps)` which wires an **injected**
manual-intake step + render-only `orchestrateRenderDeliver`. It deliberately does **not** invent the bridge:

```text
ObservationSet → (signals) → reasoning → understanding → decision-support → RenderableDomainOutput / RenderingRequest
```

The runtime therefore receives the `RenderingRequest` **in its command** (the renderable is supplied).
Spec 034 defines the behavioral boundary for the bridge that would produce that renderable from observations.

`[FACT]` The chain **already exists and works end-to-end** — but only as a **test harness**, not a
production service:

- `src/modules/__tests__/end-to-end-responsible-reflection.test.ts` (Impl 006, "THE DEFINING INTEGRATION
  TEST") composes the four core public surfaces (observation → reasoning → understanding → decision-support)
  and proves the terminal output is `DecisionSupport` with `VoiceMode` **Reflection** (never
  `Recommendation`). Its own header states it "lives in a NEUTRAL `src/modules/__tests__/` root on purpose …
  It is a test harness, **not** a production service (Tech Spec 006A §1). It composes existing surfaces; it
  authors no domain and no trace."
- `src/modules/__tests__/decision-support-rendering.test.ts` exercises `TerminalOutput → RenderableDomainOutput`.

`[GAP]` There is **no production application service** that performs this composition. The only place the
full chain is composed is a neutral test harness owned by no module.

---

## 2. Central Question

> How can Aurora derive a renderable athlete-facing reflection from manual observations through the existing
> reasoning, understanding, and decision-support boundaries — without presenting inference as fact, without
> fabricating evidence, without creating athlete decisions, and without violating the application-orchestration
> import guards?

---

## 3. Invariants the boundary must preserve

```text
Aurora never presents inference as fact.
Aurora advises; the athlete decides.
Observation ≠ Evidence.
Signal ≠ Evidence.
Hypothesis ≠ Fact.
Understanding ≠ Stored Truth.
Renderable reflection ≠ AthleteDecision.
Delivery success ≠ AthleteDecision.
Provider output ≠ Truth.
Validation pass ≠ Recommendation Quality.
```

---

## 4. Required Analysis (grounded in the real module surfaces)

| Concern | Reality in the repo |
| --- | --- |
| Manual intake → `ObservationSet` | `observation.ingestManualInput` (Impl 013) produces/persists an `ObservationSet` via an injected `ObservationSetRepository`. |
| Signal detection | `observation.detectSignals` (public) turns observations into `Signal`s. `Signal ≠ Evidence`. |
| Evidence / hypothesis lifecycle | `reasoning.openHypothesis` / `attachSignalAsEvidence` / `transitionHypothesis` (+ `HypothesisRepository`). A signal becomes evidence only by explicit attachment; `Hypothesis ≠ Fact`. |
| Understanding update | `understanding.reasoningOutcomeFrom` / `updateUnderstandingFromOutcome` / `produceUnderstandingAssessment` (+ `UnderstandingProfileRepository`). `Understanding ≠ Stored Truth`. |
| Decision-support / terminal output | `decision-support.openDecisionSupportCase` / `evaluateDecisionSupportCase` (+ `verifyTraceability`, `claimStateOf`, `DecisionSupportCaseRepository`) selects a `TerminalOutput` (DecisionSupport / Inquiry / Withholding), `VoiceMode` Reflection. |
| Terminal output → renderable | `TerminalOutput → RenderableDomainOutput` is exercised in `__tests__/decision-support-rendering.test.ts`; rendering owns `RenderableDomainOutput` / `RenderingRequest`. |
| application-orchestration import restrictions | The **Impl 025 negative-capability guard** forbids any `application-orchestration` production file from importing `observation`/`reasoning`/`understanding`/`athlete`, and requires rendering/delivery/event-recording only via their public index. |
| Must the bridge inject or import upstream? | A production composition of these surfaces **cannot live in `application-orchestration`** (guard). It must live in a module **permitted** to import the upstream public surfaces (a new neutral composition module) OR fully invert via injection (impractical for a multi-artifact chain — §6 Option A). |
| Does it create facts? | **No.** It must compose existing outputs only (author no domain, no trace) — exactly the Impl 006 harness discipline. |
| Does it persist anything? | Only through the **existing** injected repositories (observation/hypothesis/understanding/decision-support) — no new persistence surface. |
| Does it record events? | **No** (event-recording is never auto-emitted). |
| Does it create `AthleteDecision`? | **No.** An `AthleteDecision` is athlete-declared/reported and re-enters only as an Observation (`__tests__/decision-observation-adapter.ts`). |
| Should `offlineReflectionRuntime` later call it? | It should consume its **output** (`RenderingRequest`) — keeping the runtime's injected-renderable seam intact (§6.7). |

`[FACT]` The surfaces are **sufficient** (Impl 006 composes them end-to-end). The gap is solely the absence
of a **production** composition home — so deferral on capability grounds is not warranted (§6 Option D).

---

## 5. Decision Framework (criteria)

1. Composes the existing observation→reasoning→understanding→decision-support→renderable surfaces.
2. Authors no domain object and no trace (composition only — the Impl 006 discipline).
3. Preserves every §3 invariant (inference≠fact; observation≠evidence; hypothesis≠fact; understanding≠truth).
4. Preserves traceability (decision-support `verifyTraceability` / `claimStateOf` remain mandatory).
5. Creates no `AthleteDecision`; performs no delivery; calls no live provider; records no events.
6. Persists only through existing injected repositories — no new persistence surface.
7. **Does not weaken the Impl 025 application-orchestration guard.**
8. Produces a `RenderableDomainOutput` / `RenderingRequest` the existing render path already consumes.
9. Integrates with `offlineReflectionRuntime` without coupling it to upstream domain (keep the injected-renderable seam).
10. Least irreversible commitment; fully fake/in-memory testable.

---

## 6. Options Evaluated

**Option A — application-orchestration composition with upstream steps injected.** *Rejected.* Even with
injected steps, composing a multi-artifact chain requires the upstream **types** (`Signal`, `Hypothesis`,
`UnderstandingProfile`, `DecisionSupportCase`, `TerminalOutput`) — importing them from
observation/reasoning/understanding trips the Impl 025 guard. Fully-generic opaque injection would reduce
application-orchestration to a meaningless pass-through and push all real composition to the caller. The guard
exists precisely to keep application-orchestration the render→deliver **tail**, not the reasoning **head**.

**Option B — decision-support application surface accepting reasoning/understanding artifacts.** *Rejected.*
Decision-support sits mid-chain (it consumes understanding). Owning the **upstream** half (observation →
signals → reasoning → understanding) would invert dependencies (decision-support importing observation/
reasoning). It can own only the understanding/decision-support→renderable **tail**, not the full bridge.

**Option C — a new dedicated reflection-composition application boundary.** **Selected.** A new neutral
application-composition module (sibling to `application-orchestration`, but for the reasoning **head** rather
than the render/deliver **tail**) that imports the **public surfaces** of observation / reasoning /
understanding / decision-support / rendering, composes them over **injected repositories**, and produces a
`RenderableDomainOutput` / `RenderingRequest`. This is exactly the role the Impl 006 test harness plays —
promoted to a production service. No existing module's guard forbids a **new** module from importing those
public surfaces; the Impl 025 guard (scoped to application-orchestration) is untouched.

**Option D — defer because existing surfaces are insufficient.** *Rejected.* The surfaces are sufficient
(Impl 006 proves end-to-end composition). The only gap is the missing production home — which Option C fills.

---

## 7. Decision

`[DECISION]` **Observation-to-renderable composition boundary: Option C — a new dedicated reflection-composition application boundary.**

A new neutral application-composition module derives a renderable athlete-facing reflection from observations
by composing the existing public surfaces, authoring no domain object and no trace, over injected
repositories — producing a `RenderableDomainOutput` / `RenderingRequest` that the existing render path (and,
downstream, `offlineReflectionRuntime`) consumes.

- **Where the boundary belongs** — a **new** application-composition module (working name
  `reflection-composition`), sibling to `application-orchestration`. It is the one place permitted to import
  the upstream public surfaces, mirroring the Impl 006 harness as a production service. Final
  name/placement is for `Tech Spec 034A`. It must **not** live in `application-orchestration` (Impl 025
  guard) and must **not** be owned by any single core module.
- **What inputs it accepts** — an `ObservationSet` (or the manual submission already ingested into one) plus
  the necessary safe context (purpose/decision-opportunity refs) and the **injected repositories**
  (observation / hypothesis / understanding / decision-support). All side-effecting collaborators injected;
  no globals, no service locator.
- **What outputs it produces** — a `RenderableDomainOutput` / `RenderingRequest` (the reflection renderable),
  or a safe closed "no-renderable" disposition (e.g. withholding / insufficient-traceability) — never raw
  evidence, never a stored truth, never an `AthleteDecision`.
- **How it preserves inference/fact distinction** — it produces only what decision-support already frames:
  `VoiceMode` Reflection, `uncertaintyVisibleRequired`, limitations and conditions preserved. It asserts no
  fact; the eventual rendered text still passes the mandatory `validateDraft` downstream.
- **How it preserves traceability** — decision-support `verifyTraceability` / `claimStateOf` remain mandatory
  within the composition; a renderable is produced only for claims that resolve to the recorded set;
  otherwise it withholds.
- **How it avoids `AthleteDecision` creation** — it never constructs an `AthleteDecision`; a decision remains
  athlete-declared/reported and re-enters only as an Observation (existing adapter pattern).
- **How it avoids delivery** — it produces a renderable only; it performs no delivery and imports no delivery
  channel (delivery stays the render→deliver tail's concern, withheld by `offlineReflectionRuntime`).
- **How it avoids live-provider behavior** — it composes domain reasoning only; it calls no provider client,
  no live transport, reads no `process.env`, requires no secret. (Provider *rendering* happens later in the
  render path, fail-closed.)
- **How it preserves application-orchestration guards** — it is a **separate** module; the Impl 025 guard
  (which scans application-orchestration files) is untouched and not weakened. `offlineReflectionRuntime`
  continues to import no upstream domain module.
- **How it later integrates with `offlineReflectionRuntime`** — the runtime keeps its **injected-renderable
  seam**: a caller (a future runtime shell, or the operator entrypoint) calls the reflection-composition
  module to obtain the `RenderingRequest`, then passes it into `offlineReflectionRuntime`. The runtime stays
  decoupled from the reasoning head; no guard change is required.

### 7.1 Recommended next mission

```text
Tech Spec 034A — Observation-to-Renderable Composition Implementation Plan
```

`[DECISION]` Next, a TS-strict plan grounded in the exact `detectSignals` / reasoning-coordinator /
understanding-coordinator / decision-support-coordinator / terminal-output→renderable signatures: the module
name/placement, the input/output contracts, the injected-repository set, the withholding/insufficient-
traceability dispositions, the deterministic fake-driven tests, and the negative-capability guard battery
(no domain authored, no trace authored, no `AthleteDecision`, no delivery, no live provider, no events, no new
persistence, application-orchestration guard intact).

---

## 8. Required Behavioral Rules (hold regardless)

1. The composition must author no domain object and no trace (compose existing outputs only).
2. Must present inference as inference, never fact.
3. Must keep `Observation ≠ Evidence`, `Signal ≠ Evidence`, `Hypothesis ≠ Fact`, `Understanding ≠ Stored Truth`.
4. Must keep decision-support traceability verification mandatory; withhold when traceability is insufficient.
5. Must create no `AthleteDecision`.
6. Must perform no delivery and import no delivery channel implementation.
7. Must call no live provider, no live transport; read no `process.env`; require no secret.
8. Must record no events implicitly.
9. Must persist only through existing injected repositories — add no new persistence surface, no DB/schema.
10. Must not weaken the Impl 025 application-orchestration guard, and must not be placed in application-orchestration.
11. Must not be owned by a single core domain module (it is a neutral composition).
12. Must produce a `RenderableDomainOutput`/`RenderingRequest` or a safe closed no-renderable disposition.
13. Must add no runtime/API/UI/CLI/worker, no package script, no deployment/CI file, no SDK/dependency.
14. Aurora advises; the athlete decides — the composition advises a reflection, never a prescription.

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Faithful observations → reflection.** *Given* an `ObservationSet` whose claims resolve to the
recorded set, *when* the composition runs, *then* it produces a `RenderableDomainOutput` with `VoiceMode`
Reflection, uncertainty/limitations preserved.

**UC2 — Insufficient traceability → withholding.** *Given* claims that do not resolve to traceable evidence,
*when* the composition runs, *then* it produces a withholding/no-renderable disposition — never a fabricated
claim.

**UC3 — No evidence fabrication.** *Given* signals that are not attached as evidence, *when* the composition
runs, *then* no hypothesis is treated as fact and no evidence is invented.

**UC4 — No AthleteDecision.** *Given* any composition run, *when* it completes, *then* no `AthleteDecision`
is created; a decision remains athlete-declared/reported.

**UC5 — No delivery / no live provider.** *Given* any composition run, *when* it completes, *then* no
delivery occurs and no live provider/transport is called.

**UC6 — Guard preserved.** *Given* the composition lives in its own module, *when* application-orchestration
files are scanned, *then* the Impl 025 guard still passes (no observation/reasoning/understanding/athlete
import there).

**UC7 — Integration seam.** *Given* the composition produces a `RenderingRequest`, *when* a caller passes it
to `offlineReflectionRuntime`, *then* the runtime renders render-only with delivery withheld and the athlete
remains decision owner — the runtime importing no upstream domain module.

**UC8 — Determinism.** *Given* injected fakes/in-memory repositories, *when* the composition runs, *then* it
is deterministic — no network, no real secret.

---

## 10. Required Acceptance Criteria (Given / When / Then)

- A decision is recorded (select / defer). ✅ (Option C selected — §7).
- The selected boundary composes only existing public surfaces and authors no domain/trace.
- Inference is presented as inference, not fact; traceability verification stays mandatory.
- No `AthleteDecision` is created; no delivery; no live provider; no events; no new persistence/DB.
- The Impl 025 application-orchestration guard remains intact (no observation/reasoning/understanding/athlete
  import in application-orchestration).
- The output is a `RenderableDomainOutput`/`RenderingRequest` (or a safe withholding disposition) the render
  path consumes.
- No code/test/package change by this spec.
- No runtime/API/UI/CLI/worker/deployment/CI/SDK file introduced by this spec.
- All existing tests remain green (737/737).

---

## 11. Relationship To Existing Architecture

- **Impl 006** — the end-to-end composition exists as a **test harness** in `__tests__/`; Spec 034 promotes
  that role to a production application boundary (Option C), keeping its "compose, author nothing" discipline.
- **Impl 013** — `ingestManualInput` produces the `ObservationSet` the composition starts from.
- **Impl 032R-A** — `offlineReflectionRuntime` keeps its injected-renderable seam; it will consume the
  composition's `RenderingRequest` via a caller, importing no upstream domain module.
- **Impl 025** — the application-orchestration guard is preserved; the composition lives in a separate module.
- **Impl 014** — the eventual rendered text still passes the mandatory `validateDraft`.
- **Impl 009** — `AthleteDecision` stays athlete-declared/reported; the composition creates none.
- **observation / reasoning / understanding / decision-support** — their public coordinators + repositories
  are the composed surfaces; `detectSignals`, hypothesis lifecycle, understanding assessment, and
  decision-support traceability all remain unchanged and mandatory.

---

## 12. Forbidden Behaviors

```text
implementing code · writing a technical spec · authoring any domain object or trace in the composition ·
presenting inference as fact · fabricating evidence · treating a hypothesis as fact ·
creating an AthleteDecision · performing delivery · importing a delivery channel implementation ·
calling a live provider / live transport · reading process.env · requiring a real secret ·
recording events implicitly · adding a new repository / DB / schema / migration ·
placing the composition in application-orchestration · weakening the Impl 025 guard ·
adding runtime/API/UI/CLI/worker files · adding a package script · adding deployment/CI files ·
adding an SDK/dependency · production rollout claim
```

---

## 13. Open Questions For Tech Spec 034A

1. Final module name/placement (working name `reflection-composition`; a neutral application-composition module).
2. Exact input contract (raw `ObservationSet` vs the manual submission ingested into one) and the safe context refs.
3. The injected-repository set and whether the composition runs detection/hypothesis steps or accepts prior artifacts.
4. The closed output disposition catalog (renderable-ready / withholding / insufficient-traceability / unexpected-failure).
5. How withholding maps to a safe no-renderable disposition the runtime understands.
6. Exactly how `TerminalOutput → RenderableDomainOutput → RenderingRequest` is performed (the existing test path).
7. The deterministic fake/in-memory test strategy and the negative-capability guard battery.
8. The integration wiring (a caller composes reflection-composition → `offlineReflectionRuntime`).
9. Whether/when this composition is invoked by a future runtime shell vs left as a pure callable surface.

---

## 14. Success Criteria

Can Aurora derive a renderable athlete-facing reflection from manual observations through its existing
reasoning / understanding / decision-support boundaries — **without** presenting inference as fact, fabricating
evidence, creating athlete decisions, performing delivery, calling a live provider, recording events, adding
new persistence, or violating the application-orchestration import guard? **Yes — via Option C**, a new
dedicated reflection-composition application boundary that composes the existing public surfaces (exactly as
the Impl 006 harness proves possible), authors no domain/trace, produces a `RenderableDomainOutput`/
`RenderingRequest` the render path already consumes, and integrates with `offlineReflectionRuntime` through
its injected-renderable seam. The next step is `Tech Spec 034A`. Validation at authorship: `tsc --noEmit`
clean; `node --test` 737/737; no code, test, package, runtime, deployment, CI, SDK, or dependency change.
