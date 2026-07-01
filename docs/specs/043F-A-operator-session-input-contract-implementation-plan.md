# Aurora — Technical Spec 043F-A — Operator Session Input Contract Implementation Plan

> **Status (2026-06-30).** Technical Specification phase for Spec 043F (`1185d79`). It is **plan only**: it
> implements no code, edits no test/package/tsconfig file, adds no dependency, changes the executable not at all,
> adds no module loading / CLI / API / UI / Dockerfile / IaC / Garmin parser / live-provider / delivery, creates
> no `AthleteDecision`, introduces no production whole-core composer, and amends no AC20. Base: `tsc --noEmit`
> clean; `node --test` **943/943**. It translates 043F's "caller-provided module/factory" decision into a small,
> testable in-`src` contract.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — it plans **Implementation 043-F1** (and the deferred F2) and
writes no code.

---

## 1. Context recap & grounded type facts

`[FACT]` Spec 043F decided: the first session input contract is a **caller-provided module/factory**, because
`OfflineReflectionRuntimeDependencies` are function-bearing and JSON/stdin/CLI cannot carry them.

`[FACT]` Grounded current types:
- `runOperatorSession<TSubmission>(command: OperatorRunCommand<TSubmission>, deps: OperatorRunServiceDependencies)`.
- `OperatorRunCommand<TSubmission>` = `trainingSessionId` + `runId` + `envelopeRecordId` + `decisionCaptureLinkId`
  + `startedAt`/`completedAt`/`recordedAt` (Timestamps) + `session: { command: OfflineReflectionRuntimeCommand<T>,
  deps: OfflineReflectionRuntimeDependencies<T> }`.
- `OperatorRunServiceDependencies` = the four repositories + optional `invoke` seam.
- `OfflineReflectionRuntimeDependencies<T>` includes a **function** `runManualIntake: ManualIntakeStep<T>`
  (`(submission) => ManualReflectionIntakeOutcome`) + injected rendering/record collaborators — **not** JSON.
- `OfflineReflectionRuntimeCommand<T>` carries a **caller-supplied** `RenderingRequest` (the reflection
  renderable) + a generic submission + timing/ids; deriving a renderable from training data is a separate slice.
- `createOperatorRuntimePersistenceRepositories(config)` → `{ rowStore, blobStore, repositories, artifactStore }`
  (the "bundle").

`[FACT]` The executable is **assemble-only** and must stay so this slice.

---

## 2. Central question

> How should Aurora implement the safe in-`src` session **request envelope** + **caller-factory** contract, so a
> future executable can load a caller module and run `runOperatorSession` — without becoming a JSON CLI, Garmin
> parser, delivery channel, `AthleteDecision` creator, or whole-core composer?

**Answer:** add a tiny in-`src` boundary in `src/operator-runtime/application/` with (a) a serializable
`OperatorSessionRequestEnvelope` (a **reference** to a persisted `TrainingSessionRecord` + a caller-supplied
`RenderingRequest` + injected ids/timestamps/provenance), (b) a typed **caller-factory** contract
`(bundle) => { command, deps }` (the only carrier for function-bearing deps), and (c) **pure validators** for
both — types + validation only, no execution, no module loading, no executable change.

---

## 3. Required technical decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Request envelope shape → **minimal, reference + caller renderable + injected refs**
`OperatorSessionRequestEnvelope` (in `src/operator-runtime/application/operator-session-request.ts`):
```text
trainingSessionId : TrainingSessionId         // a REFERENCE to a persisted record — operational metadata, not Evidence
athleteRef        : string                    // operational ref
operatorRef       : string                    // operator/session provenance
renderingRequest  : RenderingRequest          // CALLER-SUPPLIED renderable (admitted later; never derived here)
runId             : OperatorSessionRunId       // injected deterministic ref
envelopeRecordId  : OperatorSessionEnvelopeRecordId
decisionCaptureLinkId : DecisionCaptureLinkId
startedAt / completedAt / recordedAt : Timestamp
```
**Excluded by design:** raw Garmin/artifact payloads (a `TrainingSessionRawArtifactRef` is provenance, referenced
only via the persisted record — never raw bytes as truth); any `AthleteDecision`/decided value; any Evidence/
ObservationSet/Signal; any delivery target. Rationale: the envelope is the **serializable** half of input; the
function-bearing half is the factory (Decision 2). It pairs a persisted record reference + a caller renderable;
it derives nothing.

### `[DECISION]` Decision 2 — Caller factory contract → **`(bundle) => { command, deps }`, async-capable**
```text
OperatorSessionCallerFactoryBundle = {
  readonly repositories: { trainingSessions, runs, envelopes, decisionLinks };  // from createOperatorRuntimePersistenceRepositories
  readonly artifactStore: TrainingArtifactObjectStore;
  readonly request: OperatorSessionRequestEnvelope;
  readonly trainingSession: TrainingSessionRecord;   // already loaded by the (future) loader, not re-fetched by the caller
}
OperatorSessionCallerFactory<TSubmission> =
  (bundle: OperatorSessionCallerFactoryBundle) =>
    | { command: OfflineReflectionRuntimeCommand<TSubmission>; deps: OfflineReflectionRuntimeDependencies<TSubmission> }
    | Promise<{ command: ...; deps: ... }>
```
The factory returns exactly the `session.{command,deps}` that `runOperatorSession` needs (the loader supplies the
ids/timestamps from the envelope to finish the `OperatorRunCommand`). The **caller** composes the command + deps
(with the caller-supplied RenderingRequest + deterministic fakes by default); Aurora composes none of it. Async
allowed (a real caller may build deps asynchronously). It is the ONLY honest carrier for function-bearing deps.

### `[DECISION]` Decision 3 — Validation boundary → **pure, structural, no execution**
`src/operator-runtime/application/operator-session-request.ts` exports pure validators returning a safe result:
```text
validateOperatorSessionRequest(input): { status:"ok"; request } | { status:"invalid"; reasons:string[] }
validateCallerFactoryShape(value):    { status:"ok" } | { status:"invalid"; reasons:string[] }   // typeof === "function"
validateCallerFactoryOutput(value):   { status:"ok" } | { status:"invalid"; reasons:string[] }   // has command + deps objects
```
They check: required envelope fields (ids/refs/timestamps present, non-empty), `renderingRequest` present and
structurally a RenderingRequest (shape-only, reuse the existing admission/shape notion — admission ≠ recommendation
quality), the factory is a function, and the factory output has both a `command` and a `deps` object. **Forbidden
fields** (raw artifact payload, athleteDecision, evidence/observation/signal) cause `invalid`. Validators **must
not** call `invokeOperatorSession`/`runOperatorSession`/`offlineReflectionRuntime`, load modules, read files/env,
parse Garmin, deliver, or create `AthleteDecision`. (No network, no I/O — pure.)

### `[DECISION]` Decision 4 — Module loading → **NOT in F1 (deferred to F2)**
F1 is in-`src` **types + pure validators + tests** only. The executable *loading* a caller module path is **043-F2**
(separate approval): it would import the local module, `validateCallerFactoryShape`, call it with the bundle,
`validateCallerFactoryOutput`, assemble the `OperatorRunCommand`, and call `runOperatorSession` — still no Garmin
parser, no delivery, no `AthleteDecision`, persisting only `OperatorSessionEnvelope`.

### `[DECISION]` Decision 5 — Executable behavior → **no change in F1**
The executable stays assemble-only; F1 touches no `.mjs`. (F2 wires the loader behind the existing assemble step.)

### `[DECISION]` Decision 6 — Test strategy → **pure-validator unit tests; no runtime/session/module/exec**
F1 tests (in `src/operator-runtime/tests/`) prove: the envelope validator accepts a minimal valid request and
rejects missing ids / missing renderingRequest / forbidden raw-artifact-or-decision fields; the factory-shape
validator accepts a conforming function and rejects non-functions; the factory-output validator accepts a
`{command,deps}` object and rejects missing `command`/`deps`; validators are pure (no calls to runtime/session/
delivery, no env/file/module access — asserted by exercising them with spies/inert inputs and by the existing
guard's env/import bans); JSON/stdin/CLI remain unselected; the executable remains assemble-only (unchanged
static guard).

---

## 4. Required file layout (Implementation 043-F1)

```text
src/operator-runtime/application/operator-session-request.ts        (new — envelope type, caller-factory types, pure validators)
src/operator-runtime/tests/operator-session-request.test.ts         (new — validator unit tests)
(operator-runtime index.ts MAY export the new types/validators — optional, no SDK pulled in)
```
**Must NOT touch in F1:** the executable, `operator-runtime-assembly.ts`, package/tsconfig files, any module
loader, any CLI/API/UI/Docker/IaC, the run service logic.

---

## 5. Boundary / import rules (F1)

`operator-session-request.ts` may import: the operator-run-service types (`OperatorRunCommand` ids), the record
ids/types, and — for `RenderingRequest` + `OfflineReflectionRuntime*` types — the **application-orchestration
public index** (type-only) + the rendering public types as already used by the runbook, via the public surface;
shared-kernel `Timestamp`. It must **not** import `pg`/`@aws-sdk`, the runtime symbol, or any module loader; it
reads no env; it runs nothing. (The existing operator-runtime guard already enforces these for any new production
file.)

---

## 6. Required distinctions

```text
request envelope ≠ whole-core composer · caller factory ≠ Aurora inference · TrainingSessionRecord reference ≠ Evidence ·
raw artifact ref ≠ truth · RenderingRequest admission ≠ recommendation quality · validators ≠ session execution ·
function-bearing deps ⇒ caller factory, never JSON · persist only OperatorSessionEnvelope · delivery withheld ·
decisionCapture invitation ≠ AthleteDecision · Aurora advises, the athlete decides; Aurora never presents inference as fact.
```

---

## 7. Acceptance criteria (Given / When / Then)

```text
G: a session request envelope · W: validated · T: it references a TrainingSessionRecord but does not become Evidence.
G: a RenderingRequest is supplied · W: validated · T: validation is structural, NOT recommendation-quality proof.
G: a caller factory is supplied · W: validated · T: it must produce command/deps compatible with runOperatorSession.
G: dependencies are function-bearing · W: the input format is selected · T: JSON/stdin/CLI remains rejected.
G: F1 is implemented · W: tests run · T: no module loading and no executable session execution occur.
G: raw artifact refs exist · W: referenced by input · T: they remain provenance, not truth.
G: a session eventually runs (F2) · W: output is persisted · T: only OperatorSessionEnvelope is persisted.
G: a decisionCapture invitation exists · W: linked · T: no AthleteDecision is created.
G: AC20 · W: the input contract is implemented · T: no production whole-core composer is introduced.
```

---

## 8. Forbidden behaviors

```text
implementation code in this tech spec · package changes · new dependencies · CLI parser · package script ·
API/UI/server · Dockerfile/IaC · module loading in F1 · executable change in F1 · automatic Garmin integration ·
Garmin parser · deriving RenderingRequest from raw artifacts · delivery channel · live-provider default ·
automatic AthleteDecision · whole-core composer · reflection-composition · AC20 amendment
```

---

## 9. Implementation slicing

```text
043-F1 — Safe Session Request Envelope & Caller Factory Contract (next): types + pure validators + tests.
         No executable change, no module loading, no package change, no new deps.
043-F2 — Out-of-`src` Caller Module Loader (separate approval): the executable loads an explicit local module
         path, validates the factory shape/output, invokes it with the assembled bundle, builds OperatorRunCommand
         from the envelope ids/timestamps, calls runOperatorSession, persists only OperatorSessionEnvelope.
         Still no Garmin parser, no delivery, no AthleteDecision, no whole-core composition.
```
**Next mission = 043-F1.**

---

## 10. Relationship to existing architecture

- **Spec 043F** — its caller-module/factory decision is realized here as the in-`src` envelope + factory contract.
- **Spec 038 / 035 / 034R** — caller assembles the command + caller-supplied renderable; admission stays a
  structural pre-screen; renderable-from-training stays a separate AC20-safe boundary.
- **Spec 040 / 041** — `invokeOperatorSession` + `OperatorSessionEnvelope`: the only seam + the only stored result;
  `runOperatorSession` already enforces both — F2 routes through it unchanged.
- **043-D4A / D5A / D5B** — the bundle (repositories + artifactStore), env loader, and executable are the substrate
  the F2 loader will use; F1 only adds the input types/validators above them.
- **AC20 / Spec 034R** — unchanged; the caller composes the core, the validators/loader never do.

---

## 11. Required output

`[DECISION] Implementation 043-F1 plan:` add a small in-`src` boundary `operator-session-request.ts` defining
**`OperatorSessionRequestEnvelope`** (a `TrainingSessionRecord` **reference** + a caller-supplied `RenderingRequest`
+ injected ids/timestamps/provenance; no raw artifact payload, no Evidence, no `AthleteDecision`), the
**`OperatorSessionCallerFactory<TSubmission>`** contract `(bundle) => { command, deps }` (async-capable; the only
honest carrier for function-bearing deps), and **pure validators** (`validateOperatorSessionRequest`,
`validateCallerFactoryShape`, `validateCallerFactoryOutput`) returning safe results — **types + validators + tests
only**. No module loading (F2), no executable change, no package/tsconfig change, no new dependency. **JSON / stdin
/ CLI remain rejected** (deps are function-bearing).

```text
selected request envelope shape : trainingSessionId + athleteRef + operatorRef + caller-supplied RenderingRequest +
                                  injected runId/envelopeRecordId/decisionCaptureLinkId + startedAt/completedAt/recordedAt;
                                  NO raw artifact payload, NO Evidence/ObservationSet/Signal, NO AthleteDecision.
selected caller factory shape    : (bundle:{repositories,artifactStore,request,trainingSession}) =>
                                  ({ command: OfflineReflectionRuntimeCommand<T>, deps: OfflineReflectionRuntimeDependencies<T> })
                                  | Promise<…>  — caller composes command/deps; Aurora composes none.
selected validation boundary     : pure validators (request shape, factory shape, factory output) — no execution,
                                  no module loading, no env/file/IO, no runtime/session/delivery calls.
module loading decision          : NOT in F1; deferred to 043-F2 (separate approval).
executable change decision       : NONE in F1; executable stays assemble-only.
next implementation slice         : Implementation 043-F1 — Safe Session Request Envelope & Caller Factory Contract.
JSON/stdin/CLI                    : remain REJECTED.
```

---

## 12. Validation & invariants at this spec

`tsc --noEmit` clean; `node --test` **943/943**. No code/test/package/lockfile/tsconfig change; no dependency; no
guard weakened; AC20 untouched. The executable remains assemble-only; F1 will add only in-`src` types + pure
validators + tests, with module loading and any session execution deferred to F2.
