# Aurora — Specification 043F — Operator Session Input Contract

> **Status (2026-06-30).** Specification phase, building on Impl 043-D5B (`b9447c4`). It is **behavioral /
> docs-only**: it implements no code, adds no dependency, edits no package/tsconfig file, writes no CLI/API/UI,
> Dockerfile/IaC, Garmin parser, live-provider default, delivery, or AthleteDecision, introduces no production
> whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **943/943**. It decides
> **what caller-supplied input is approved** to let the out-of-`src` executable actually run a session.

---

## 0. Phase confirmation

This is **Specification** — it decides the *input contract* and routes the build to a tech-spec/implementation
slice. It writes no code.

---

## 1. Context

`[FACT]` The operator-runtime stack is complete up to assembly:
- records + row/blob ports + mappers (C1/D1); Postgres row-store adapter (D2-R); S3 blob-store adapter (D3);
- D4 `createOperatorRuntimePersistenceClients` + D4A storage-backed repositories +
  `createOperatorRuntimePersistenceRepositories` + `BlobStoreTrainingArtifactObjectStore`;
- D5A env-config loader (injected env); D5B out-of-`src` executable + env-free assembler.

`[FACT]` The executable (`scripts/operator-runtime-executable.mjs`) **assembles persistence and stops**, printing
*"operator runtime persistence clients/repositories assembled; session execution requires caller-supplied
command/deps"*. That is correct: it has the repositories + artifact store, but **no approved way to obtain a
session command + dependencies**.

`[FACT]` `runOperatorSession(command, deps)` (operator-run-service) needs `OperatorRunCommand<TSubmission>`:
trainingSessionId + injected refs/timestamps + **`session: { command: OfflineReflectionRuntimeCommand<TSubmission>,
deps: OfflineReflectionRuntimeDependencies<TSubmission> }`** (passed verbatim to the `invokeOperatorSession` seam),
plus the four repositories + invoke.

---

## 2. Required analysis

```text
 1. what the executable can assemble now : rowStore, blobStore, the four storage-backed repositories, artifactStore.
 2. why it cannot run a session yet      : it has no OfflineReflectionRuntimeCommand and no Dependencies to pass to runOperatorSession.
 3. what runOperatorSession requires      : an OperatorRunCommand (ids/timestamps + session.command + session.deps) + the repos + invoke.
 4. what OfflineReflectionRuntimeCommand requires : a caller-supplied RenderingRequest (the reflection renderable) + a generic
                                            submission + timing/ids; bridging a renderable from training data is explicitly a LATER slice.
 5. unsafe-to-invent dependencies         : OfflineReflectionRuntimeDependencies are FUNCTION-BEARING — e.g. ManualIntakeStep<T>
                                            (`(submission) => ManualReflectionIntakeOutcome`) + injected rendering/record collaborators.
                                            The executable must NOT fabricate these; inventing intake/provider/render deps would be a
                                            whole-core composer.
 6. why no Garmin parsing here            : turning a .fit/.tcx/.csv artifact into observations/renderables is interpretation — a
                                            separate AC20-safe observation→renderable boundary (cf. Spec 034R), never the input loader.
 7. why RenderingRequest-from-training is separate : deriving a renderable from training data composes the core; AC20 keeps that a
                                            distinct, separately-specified boundary. The session input carries a CALLER-SUPPLIED renderable.
 8. JSON / stdin / module / injected object : deps are functions ⇒ NOT JSON-serializable. A JSON/stdin/CLI "command" cannot carry deps.
                                            The only honest carrier is a caller-provided MODULE/FACTORY (or an in-process injected object).
 9. CLI parser needed now                  : NO. No flags/argv parsing this slice.
10. package scripts needed now            : NO.
11. reference a persisted TrainingSessionRecord : YES — the safe, serializable part of input is a REFERENCE (id) to an existing record.
12. include a caller-supplied RenderingRequest : YES — supplied by the caller, admitted (not derived); admission ≠ recommendation quality.
13. deterministic fakes by default        : YES — the default dependency posture stays deterministic fakes / no live provider.
14. live provider deps allowed            : NO (separate approval; the runtime stays render-only with delivery withheld).
15. delivery deps allowed                  : NO — delivery remains withheld.
16. run output persistence                 : ONLY OperatorSessionEnvelope (+ run record + optional DecisionCaptureLink) via runOperatorSession.
17. deferred                               : actual command/deps factory execution; module-path loading by the executable; renderable
                                            derivation from training/Garmin; live provider; delivery; CLI/API/UI; container/IaC.
```

---

## 3. Central question

> What caller-supplied input is approved to let the out-of-`src` executable run a session — **without** becoming a
> whole-core composer, Garmin parser, API, UI, delivery channel, or AthleteDecision creator?

**Answer:** a **caller-provided module/factory** that receives the assembled repositories + artifact store and
returns the exact `OfflineReflectionRuntimeCommand` + `OfflineReflectionRuntimeDependencies` for
`runOperatorSession`. Dependencies are function-bearing, so no JSON/stdin/CLI command format can carry them. The
executable stays **assemble-only now**; before any module-loading, a small **in-`src`, testable input-validation
boundary** validates a *session request* that pairs a persisted `TrainingSessionRecord` **reference** with a
caller-supplied `RenderingRequest` — leaving the function-bearing deps to the caller factory.

---

## 4. Required distinctions

```text
session input contract ≠ whole-core composer · ≠ Garmin parser · ≠ API schema · ≠ UI form · ≠ delivery request · ≠ AthleteDecision ·
caller-supplied command ≠ Aurora inference · TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth ·
RenderingRequest admission ≠ recommendation quality · operator executable ≠ product SaaS · session run ≠ athlete decision ·
caller-supplied RenderingRequest ≠ a renderable derived from training data · deterministic fakes ≠ live provider ·
Aurora advises, the athlete decides; Aurora never presents inference as fact.
```

---

## 5. Options evaluated

| Option | Verdict |
| --- | --- |
| A — keep executable assemble-only; no session input yet | **Partly kept (now).** The executable stays assemble-only this slice; but the contract is decided so a *next* slice can run sessions. |
| B — JSON file: trainingSessionId + command/deps descriptors | **Rejected.** Deps are functions (`ManualIntakeStep`, injected collaborators); JSON cannot carry them. A JSON "deps descriptor" would force the loader to *construct* deps → a whole-core composer. |
| C — stdin JSON | **Rejected.** Same as B. |
| D — caller-provided JS/TS **module/factory** exporting `(bundle) => { command, deps }` | **Selected (direction).** The only honest carrier for function-bearing deps; the caller owns composition; the executable composes nothing. Module-path *loading* is a later, explicitly-scoped slice. |
| E — internal function only; executable still does not run sessions | **Kept as the now-state.** The in-`src` input-validation boundary (the next slice) is internal + testable; the executable does not run sessions until D's loader slice. |
| F — CLI flags (trainingSessionId + renderable payload) | **Rejected.** No CLI parser approved; flags still can't carry deps. |
| G — automatic Garmin artifact → renderable | **Rejected.** Interpretation; a separate AC20-safe observation→renderable boundary, never the input loader. |
| H — API endpoint | **Rejected.** No API/UI approved. |
| I — whole-core composition inside the executable | **Rejected.** AC20 forbids a production whole-core composer. |

`[FACT]` B/C/F fail on the **function-bearing deps** fact (§2.5/§2.8). G/H/I fail on AC20 / scope.

---

## 6. Decision

`[DECISION]` **The first operator session input contract is a caller-provided module/factory, NOT a generic
JSON/stdin/CLI command API.** Because `OfflineReflectionRuntimeDependencies` are function-bearing (a
`ManualIntakeStep<TSubmission>` plus injected rendering/record collaborators), the *only* honest carrier is a
**caller module that exports a factory** receiving the assembled `{ repositories, artifactStore, rowStore,
blobStore }` and returning the exact `OfflineReflectionRuntimeCommand` + `OfflineReflectionRuntimeDependencies`
(with a **caller-supplied RenderingRequest**, deterministic fakes by default) for `runOperatorSession`. The
executable **remains assemble-only now**; the executable *loading* an explicitly-provided local module path is a
later, separately-scoped slice. **Before** that, the next slice adds a small **in-`src`, testable
input-validation boundary** for a *session request envelope* that pairs an existing persisted
`TrainingSessionRecord` **reference** (operational metadata, not Evidence) with a caller-supplied
`RenderingRequest` (admitted, not recommendation-quality), and validates the caller-factory **shape** — it does
**not** derive a renderable from Garmin/training data, run the session, compose the core, deliver, or create an
`AthleteDecision`.

`[FACT]` Forbidden by this decision: JSON/stdin/CLI command formats; the executable fabricating intake/provider/
render deps; deriving `RenderingRequest` from raw artifacts; live provider default; delivery; whole-core
composition; `AthleteDecision` creation; CLI/API/UI; package/dependency/tsconfig changes.

---

## 7. Acceptance criteria (Given / When / Then)

```text
G: the executable has assembled persistence · W: no approved session input is provided
   · T: it must NOT run a session (it prints the assemble-only message and stops).
G: a future session input is provided        · W: it is processed
   · T: it must SUPPLY command/deps (via the caller factory), never DERIVE them from Garmin artifacts.
G: a TrainingSessionRecord exists             · W: referenced by input
   · T: it remains operational metadata, never Evidence/ObservationSet.
G: a raw artifact exists                      · W: referenced by input
   · T: it remains provenance (opaque), never truth.
G: a RenderingRequest is supplied             · W: admitted
   · T: admission is a structural pre-screen, NOT recommendation-quality proof.
G: a session runs (a later slice)             · W: output is persisted
   · T: ONLY OperatorSessionEnvelope is persisted (+ run record + optional DecisionCaptureLink).
G: a decisionCapture invitation exists        · W: persisted
   · T: no AthleteDecision is created.
G: no delivery channel is approved            · W: reflection-ready occurs
   · T: delivery remains withheld.
G: AC20                                        · W: the session input is specified
   · T: no production whole-core composer is introduced (the caller composes; Aurora does not).
```

---

## 8. Forbidden behaviors

```text
implementation code · package changes · CLI parser · package script · API/UI/server · Dockerfile/IaC ·
automatic Garmin integration · Garmin parser · whole-core composer · deriving RenderingRequest from raw artifacts ·
live-provider default · delivery channel · automatic AthleteDecision · secret manager integration · new dependencies ·
AC20 amendment · reflection-composition
```

---

## 9. Relationship to existing architecture

- **Spec 038 (runbook / caller-assembly)** — reaffirms the caller assembles the command (incl. RenderingRequest)
  and injects deps; this spec makes that the *operator-runtime* input contract.
- **Spec 035 / 034R** — caller-supplied renderable admission stays a structural pre-screen; deriving a renderable
  from training data is the separate AC20-safe boundary, deliberately out of scope here.
- **Spec 040 / 041** — `invokeOperatorSession` + `OperatorSessionEnvelope`: the only seam + the only stored result;
  `runOperatorSession` already enforces both.
- **043D / 043E / 043-D5A / 043-D5B** — the async contracts, adapters, config loader, and executable are the
  substrate; this is the missing *input* boundary above them.
- **AC20 / Spec 034R** — unchanged; the caller composes the core, the executable/loader never does.

---

## 10. Recommended next mission

`[RECOMMENDATION]` **Tech Spec 043F-A — Operator Session Input Contract Implementation Plan**: translate this
decision into a concrete plan — the in-`src` `OperatorSessionRequest` envelope type (a `TrainingSessionRecord`
reference + a caller-supplied `RenderingRequest` + injected refs/timestamps), a pure validator, and the
**caller-factory type** `(bundle) => { command, deps }`; plan the executable's later module-path loading as its
own slice; keep deterministic fakes by default, no live provider, no delivery, no AthleteDecision, no Garmin
parsing, no whole-core composition. Then **Implementation 043-F1 — Safe Session Request Envelope** (the in-`src`,
testable validator only; the executable stays assemble-only until the loader slice).

---

## 11. Validation & invariants at this spec

`tsc --noEmit` clean; `node --test` **943/943**. No code/test/package/lockfile/tsconfig change; no dependency; no
guard weakened; AC20 untouched. The executable remains assemble-only; the session input contract is decided as a
**caller-provided module/factory** with an in-`src` validation envelope to come.

```text
deps are functions ⇒ not JSON · caller composes, Aurora does not · TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth ·
admission ≠ recommendation quality · persist only OperatorSessionEnvelope · delivery withheld · no AthleteDecision ·
Aurora advises, the athlete decides; Aurora never presents inference as fact.
```
