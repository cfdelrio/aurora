# Aurora — Technical Spec 043C — Operator Runtime Persistence Layer Implementation Plan (out-of-`modules`)

> **Status (2026-06-30).** Technical Specification phase for Spec 043B (`0aacef9`). It translates the
> persistence-home decision into a TS-strict implementation plan **grounded in the real tsconfig/test config and
> the AC20 guards**. It is **plan only**: it implements no code, edits no package/tsconfig file, adds no
> dependency/migration/Dockerfile/IaC/API/UI/CLI/worker/persistence-port/object-storage-adapter, weakens no guard,
> amends no AC20, and revives no `reflection-composition`. Base: dev branch from merged `main`; `tsc --noEmit`
> clean; `node --test` **852/852**.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — it plans **Implementation 043-C** (and slices) and writes no
code/infra.

---

## 1. Context recap & a decisive config finding

`[FACT]` Spec 043B selected the persistence **home**: a layer that is **not a `src/modules/*` core module**,
**not `application-orchestration`**, **not `event-recording`**, that **imports only Aurora's public application
surface** (`invokeOperatorSession`, `OperatorSessionEnvelope`), keeps **AC20 unchanged**, and persists **only**
the safe envelope. 043B leaned on "out-of-`src`" but **§7 explicitly authorized 043C** to evaluate an
**in-`src`-but-out-of-`modules`** path (`src/operator-runtime/`) and to define the typecheck/test inclusion.

`[FACT]` **Decisive config reality (grounded):**
- `tsconfig.json` → `"include": ["src"]`. Only files **under `src/`** are typechecked.
- `package.json` test → `node --test "src/**/*.test.ts"`. Only tests **under `src/`** are discovered/run.
- **AC20a guard** (`__tests__/end-to-end-responsible-reflection.test.ts`, "no new top-level module") scans
  **`readdirSync(modulesDir)` = `src/modules/` only**.
- **AC20b guard** ("no production file imports all four surfaces") scans **`collectTsFiles(modulesDir)` =
  `src/modules/` only**.
- The orchestration + other negative-capability guards forbid specific dirs by **exact name**
  (`src/{api,server,ui,frontend,db,database,migrations,infrastructure}`, `src/modules/{runtime,session,…}`,
  `src/scripts`) — **`operator-runtime` is in none of them**.
- `src/` already contains a **non-module sibling**: `src/shared-kernel/` (precedent).

`[FACT]` **Consequence:** a layer at **`src/operator-runtime/`** (sibling to `src/modules/` and
`src/shared-kernel/`, **not** a `src/modules/*` module) is **typechecked and tested with ZERO tsconfig/package
changes**, is **invisible to AC20a/AC20b** (both scan only `src/modules/`), and **collides with no forbidden-dir
guard**. A repo-root `runtime/operator/` (truly out-of-`src`) would require **both** a `tsconfig` include change
**and** a `package.json` test-glob change to be typechecked/tested — churn this plan is told to avoid. Therefore
`src/operator-runtime/` is the strictly superior realization of 043B's operative principle ("not a core module;
public-surface-only; AC20 untouched").

`[ASSUMPTION] [for maintainer review]` This **refines** 043B's "out-of-`src`" wording to its operative invariant —
**out-of-`src/modules/`** — choosing `src/operator-runtime/` so the layer is typecheck/test-covered without
config churn. If the maintainer insists on a *literal* repo-root out-of-`src` path, see Decision 1's alternative
(it then requires a deliberate tsconfig + test-glob change at the implementation slice).

---

## 2. Real-Code / Repo Gap Analysis

1. No `src/operator-runtime/` (or any operator-runtime persistence) layer exists.
2. No concrete path was selected before this spec.
3. No typecheck/test-inclusion decision existed for the home (now resolved: §1 — `src/operator-runtime/` needs none).
4. No persistence ports exist in the home.
5. No in-memory adapters exist in the home.
6. No DB adapter exists.
7. No object-storage adapter exists.
8. No deployment worker exists.
9. No executable entrypoint exists.
10. No Dockerfile/IaC exists.
11. No migrations exist.
12. No import-boundary guard exists for the home.
13. No package script exists for it (and none should be created until the deployment slice).
14. No Garmin parser exists.
15. No automatic Garmin integration exists.
16. No API/UI exists.
17. No auth/session/user system exists.
18. No delivery channel exists.
19. No live-provider default exists.
20. AC20 unchanged; the public surface (`invokeOperatorSession`, `OperatorSessionEnvelope`) is exported from
    `src/modules/application-orchestration/index.ts`.

---

## 3. Central Question

> How should Aurora implement the operator-runtime persistence layer — its path, typecheck/test boundary, import
> guards, records, ports, in-memory adapters, and future DB/object-storage adapters — preserving AC20 and ensuring
> all session processing stays behind `invokeOperatorSession` and stores only `OperatorSessionEnvelope`?

**Answer:** in **`src/operator-runtime/`** (a non-module `src` sibling), typechecked+tested by the existing config
with **no tsconfig/package change**, importing **only** the `application-orchestration` public index + shared-kernel,
guarded by a **new import-boundary negative-capability test**, built in **thin slices** (C1 = records + ports +
in-memory adapters + guard).

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Path → **`src/operator-runtime/`** (in-`src`, NOT a `src/modules/*` module)
Selected: `src/operator-runtime/` (sibling to `src/modules/` + `src/shared-kernel/`). Rationale (§1): zero
tsconfig/test churn (covered by `include:["src"]` + `src/**/*.test.ts`); invisible to AC20a/AC20b (both scan only
`src/modules/`); not in any forbidden-dir guard; `src/shared-kernel/` is the non-module-sibling precedent.
Rejected: `scripts/operator-runtime/` (scripts/ is for entrypoints, and `src/scripts` is guard-forbidden — but
this is repo-root `scripts/`, which holds only the approved smoke; mixing a persistence layer there is wrong);
`apps/operator-runtime/` (implies a product app/API/UI); `runtime/operator/` / `deployment/operator-runtime/` /
`tools/operator-runtime/` (repo-root, **out-of-`src`** → would need a tsconfig include change **and** a test-glob
change to be typechecked/tested — deferred churn this plan avoids). **Alternative (only if a literal repo-root
out-of-`src` path is mandated):** `runtime/operator/` + a deliberate, tightly-scoped tsconfig include + test-glob
change at the slice — documented but **not** selected.

### `[DECISION]` Decision 2 — Typecheck/test boundary → **no tsconfig change, no package change**
`src/operator-runtime/**/*.ts` is already typechecked (`tsconfig include:["src"]`) and
`src/operator-runtime/tests/*.test.ts` already discovered (`node --test "src/**/*.test.ts"`). **Implementation
043-C1 edits neither `tsconfig.json` nor `package.json`.** (A separate operator-runtime tsconfig is unnecessary;
keeping out-of-`modules` TS uncompiled is rejected — it must be typechecked.)

### `[DECISION]` Decision 3 — Test discovery → **colocated under `src/operator-runtime/tests/`**
Tests live at `src/operator-runtime/tests/*.test.ts` (matched by the existing glob; runs under `npm run test`).
**Not** in `src/modules/__tests__/` (that would blur the core boundary). The layer's tests import the layer +
the public surface only.

### `[DECISION]` Decision 4 — Import boundary → **public application surface + shared-kernel only**
`src/operator-runtime/` production files may import **only**:
- `../modules/application-orchestration/index.ts` — specifically `invokeOperatorSession` (the run seam) and the
  `OperatorSessionEnvelope` + related public **types**;
- `../../shared-kernel/*` types if needed.
**Forbidden imports:** any `../modules/{observation,reasoning,understanding,decision-support,athlete,rendering,
delivery,event-recording}/…`; any **internal** (non-`index`) `application-orchestration` file; and — even though
it is publicly exported — the **`offlineReflectionRuntime` symbol must not be imported or called** (sessions run
**only** through `invokeOperatorSession`). Also forbidden: provider/live transport, delivery implementations,
secret/cloud adapters, DB clients, object-storage SDKs, `process.env`. A **new negative-capability guard**
(Decision 9) enforces this.

### `[DECISION]` Decision 5 — Records and ports → **`src/operator-runtime/application/`, mirroring core convention**
Layout (records co-located with their port — the layer has no `domain/`; same pragmatic pattern app-orch uses):

```text
src/operator-runtime/application/training-session-record.ts            (TrainingSessionRecord + TrainingSessionRawArtifactRef + factories)
src/operator-runtime/application/training-session-repository.ts        (port)
src/operator-runtime/application/in-memory-training-session-repository.ts
src/operator-runtime/application/operator-session-run-repository.ts    (OperatorSessionRunRecord + factory + port)
src/operator-runtime/application/in-memory-operator-session-run-repository.ts
src/operator-runtime/application/operator-session-envelope-repository.ts (OperatorSessionEnvelopeRecord + factory + port)
src/operator-runtime/application/in-memory-operator-session-envelope-repository.ts
src/operator-runtime/application/decision-capture-link-repository.ts   (DecisionCaptureLink + factory + port)
src/operator-runtime/application/in-memory-decision-capture-link-repository.ts
src/operator-runtime/index.ts                                         (public surface of the layer)
```
Convention: `<name>-repository.ts` (record + factory + port) + `in-memory-<name>-repository.ts` (adapter). **Note:**
repository **classes** are allowed here — the `explicit-orchestration-negative-capability` "no repository" guard
scans **only `application-orchestration/`**, not `src/operator-runtime/`. (`TrainingSessionRawArtifactRef` is a
ref+provenance value carried on/with `TrainingSessionRecord`; the *object-storage adapter* is Decision 7 / C2.)

### `[DECISION]` Decision 6 — Slicing → **thin slices; C1 = skeleton + records + ports + in-memory adapters + guard**
```text
043-C1 — src/operator-runtime/ skeleton + the 4 record types + repository ports + in-memory adapters + index +
         a negative-capability import-boundary guard + functional tests. (No DB, no object storage, no worker, no infra.)
043-C2 — raw-artifact object-storage PORT + fake/in-memory adapter (provenance, opaque). (No real S3.)
043-C3 — internal operator run SERVICE: load training session + caller-supplied RenderingRequest →
         invokeOperatorSession → persist OperatorSessionEnvelopeRecord + OperatorSessionRunRecord + DecisionCaptureLink.
         (Deterministic fakes; no executable.)
043-C4 — concrete DB + object-storage adapters (Postgres/S3 direction) behind the C1/C2 ports. (May need deps →
         explicit approval; tsconfig already covers src/operator-runtime.)
043-C5 — deployment packaging: out-of-`src` executable entrypoint (repo-root, like operator-live-smoke.mjs) +
         Dockerfile/IaC. (Separate approval.)
```
Rejected: bundling. **Next mission = 043-C1.**

### `[DECISION]` Decision 7 — DB / object-storage placement → **in `src/operator-runtime/`; fakes first; concrete deferred**
DB + object-storage **adapters** live in `src/operator-runtime/` behind the ports (outside the core; AC20-safe).
**In-memory/fake adapters first (C1/C2);** concrete Postgres/S3 + any dependencies are **C4** with explicit
approval. The executable that wires real infra is **C5**, out-of-`src` (repo-root).

### `[DECISION]` Decision 8 — Package / tsconfig changes → **none in C1 (and none until C4/C5, with approval)**
C1 edits **neither** `tsconfig.json`, `package.json`, nor `package-lock.json`. No package script until the
deployment slice (C5). Any dependency (a real DB/S3 client) is C4/C5 and requires explicit approval (it would be
the first runtime dependency — currently devDeps are only `typescript` + `@types/node`).

### `[DECISION]` Decision 9 — AC20 & guards → **existing guards stay green + a new layer import-boundary guard**
Add `src/operator-runtime/tests/operator-runtime-negative-capability.test.ts` proving: the layer imports only the
`application-orchestration` public index + shared-kernel; imports no upstream core / internals; does not import or
call `offlineReflectionRuntime`; imports no DB client / object-storage SDK / provider-live / delivery / secret
adapter; reads no `process.env`; constructs no `AthleteDecision` and records no event; stores no raw runtime
outcome; and adds no API/UI/CLI/deployment yet. Existing guards remain **green and unchanged**: AC20a/AC20b (scan
`src/modules/` — the new layer is invisible to them), `explicit-orchestration-negative-capability` (app-orch still
owns no repository), the forbidden-dir checks (no `src/{api,db,…}` created).

---

## 5. Required File Layout (Implementation 043-C1)

```text
src/operator-runtime/application/training-session-record.ts                       (new)
src/operator-runtime/application/training-session-repository.ts                   (new)
src/operator-runtime/application/in-memory-training-session-repository.ts         (new)
src/operator-runtime/application/operator-session-run-repository.ts               (new)
src/operator-runtime/application/in-memory-operator-session-run-repository.ts     (new)
src/operator-runtime/application/operator-session-envelope-repository.ts          (new)
src/operator-runtime/application/in-memory-operator-session-envelope-repository.ts (new)
src/operator-runtime/application/decision-capture-link-repository.ts              (new)
src/operator-runtime/application/in-memory-decision-capture-link-repository.ts    (new)
src/operator-runtime/index.ts                                                     (new — layer public surface)
src/operator-runtime/tests/operator-runtime-persistence.test.ts                  (new — functional)
src/operator-runtime/tests/operator-runtime-negative-capability.test.ts          (new — import-boundary guard)
```
**Must NOT create/edit in C1:** `tsconfig.json`, `package.json`, `package-lock.json`, any `src/modules/*` change,
`Dockerfile`/IaC/migrations, a repo-root executable, a package script, any DB/object-storage SDK.

---

## 6. Required Future Test Plan (043-C1)

1. records can be saved/retrieved in the layer's in-memory repositories.
2. `TrainingSessionRecord` is operational metadata, not Evidence/ObservationSet.
3. `TrainingSessionRawArtifactRef` is provenance (opaque handle), not truth.
4. `OperatorSessionRunRecord` is operational run metadata, not delivery/decision.
5. `OperatorSessionEnvelopeRecord` stores the `OperatorSessionEnvelope` only.
6. no raw `OfflineReflectionRuntimeOutcome` is stored; 7. no `reflection.text`; 8. no provider output; 9. no
   secrets; 10. no delivery ids/artifacts; 11. no `eventRecordIds`; 12. no `AthleteDecision`.
13. `DecisionCaptureLink` is not an `AthleteDecision` (invitation/ref only).
14. repositories are deterministic + isolated per instance.
15. no DB client/migration; 16. no object-storage SDK; 17. no API/UI/CLI/deployment; 18. no package script.
19. import boundary enforced (only public app surface + shared-kernel; no `offlineReflectionRuntime`).
20. AC20 remains green; all existing tests remain green.

---

## 7. Boundary / Import Rules

**Allowed (in `src/operator-runtime/`):** `import { invokeOperatorSession } from "../modules/application-orchestration/index.ts"`,
`import type { OperatorSessionEnvelope, … } from "../modules/application-orchestration/index.ts"`, shared-kernel
types; tests using deterministic fakes + typed fixtures + the public surface. **Forbidden:** importing any
upstream core module or app-orch internal file; importing/calling `offlineReflectionRuntime`; DB clients
(`pg`/`postgres`/`sqlite`/ORMs), object-storage SDKs (`@aws-sdk`/`s3`/cloud), provider-live transport, delivery
implementations, secret/cloud adapters; `process.env`; constructing `AthleteDecision`; recording events; storing
the raw outcome; creating API/UI/CLI/worker/deployment/migration/Dockerfile/IaC; editing tsconfig/package files.

---

## 8. Required Distinctions

```text
out-of-src/modules layer ≠ core module · src/operator-runtime ≠ src/modules/* · persistence home ≠ application-orchestration ·
persistence home ≠ event-recording · runtime persistence ≠ Evidence · TrainingSessionRecord ≠ ObservationSet ·
TrainingSessionRawArtifactRef ≠ truth · OperatorSessionEnvelopeRecord ≠ raw outcome ≠ delivered artifact ·
DecisionCaptureLink ≠ AthleteDecision · the layer runs sessions only via invokeOperatorSession (never offlineReflectionRuntime) ·
in-memory adapter ≠ cloud deployment · Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 9. Relationship To Existing Architecture

- **Spec 043B** — its home decision (not a core module; public-surface-only; AC20 untouched) is realized here as
  `src/operator-runtime/` (the in-`src`-out-of-`modules` candidate 043B §7 authorized).
- **Spec 043 / 043A / 043A-R** — direction + records stand; 043A placement superseded; 043A-R blocker resolved.
- **Spec 042** — persistence + provider/deployment lanes entered; this plans the persistence build only.
- **Spec 041 / 040** — `invokeOperatorSession` + `OperatorSessionEnvelope`: the only seam + the only stored result.
- **AC20 / Spec 034R** — unchanged; the layer composes no core (renderable stays caller-supplied; deriving from
  Garmin is the separate deferred AC20-safe composition lane).
- **`scripts/operator-live-smoke.mjs`** — the precedent for out-of-`src` execution at C5.

---

## 10. Forbidden Behaviors

```text
implementation code in this tech spec · DB migrations · object storage adapters (in C1) · Dockerfile · IaC ·
package script changes (until C5, with approval) · tsconfig/package edits in C1 · CLI/script creation ·
API/UI creation · automatic Garmin integration · provider/live default · delivery channel · automatic AthleteDecision ·
auth/session/user implementation · AC20 amendment · reflection-composition module · production whole-core composer ·
new src/modules persistence module · application-orchestration repository ownership ·
event-recording generic-persistence expansion · raw runtime outcome persistence ·
calling offlineReflectionRuntime directly from the layer
```

---

## 11. Open Questions (deferred to the slices)

1. Whether `TrainingSessionRawArtifactRef` is a field on `TrainingSessionRecord` or its own record (C1).
2. Exact `OperatorSessionRunRecord.status` typing (free string vs the `OfflineReflectionStatus` re-export) (C1).
3. Concrete DB choice (Postgres vs SQLite-first) + migration path (C4).
4. Concrete object-storage product (C4).
5. Local/dev equivalent (e.g. docker-compose) (C5).
6. The out-of-`src` executable entrypoint form + Dockerfile/IaC (C5).
7. First runtime dependency approval (C4/C5).
8. When the AC20-safe observation→renderable composition lane (deriving renderable from Garmin) is opened
   (separate evidence + spec).

---

## 12. Implementation Task Preview

`[DECISION]` **Implementation 043-C plan = thin slices in `src/operator-runtime/` (a non-module `src` sibling),
typecheck/test-covered by the existing config with NO tsconfig/package change; the layer imports only the
`application-orchestration` public surface (`invokeOperatorSession`, `OperatorSessionEnvelope`), runs sessions
only via `invokeOperatorSession`, and persists only the envelope.** Slices: **C1** records + ports + in-memory
adapters + import-boundary guard → **C2** artifact object-storage port + fake → **C3** operator run service →
**C4** concrete DB/object-storage adapters (deps with approval) → **C5** out-of-`src` executable + Dockerfile/IaC
(separate approval).

**Recommended next mission: Implementation 043-C1 — Operator Runtime Persistence Skeleton** (in
`src/operator-runtime/`: the four record types + repository ports + in-memory adapters + `index.ts` + a
negative-capability import-boundary guard + functional tests; no DB, no object storage, no worker, no infra; no
tsconfig/package change). Then C2 → C3 → C4 → C5.

---

## 13. Success Criteria

Can Aurora plan, concretely enough to implement, the operator-runtime persistence layer — at `src/operator-runtime/`
(a non-module `src` sibling, typechecked+tested by the existing config with no tsconfig/package change), importing
only the public application surface, running sessions only via `invokeOperatorSession`, persisting only
`OperatorSessionEnvelope`, with records as operational (not Evidence), DB/object-storage adapters behind ports
(fakes first), and an import-boundary guard — **preserving AC20** (the layer is invisible to AC20a/AC20b, which
scan only `src/modules/`), keeping `application-orchestration` composition-only and `event-recording` bounded, and
**without** any code/infra/migration/package/tsconfig change in this spec? **Yes — via `src/operator-runtime/` +
thin slices (C1→C5)**, C1 next. Validation at authorship: `tsc --noEmit` clean; `node --test` 852/852; no code,
infra, migration, package, tsconfig, or dependency change; no guard weakened; AC20 untouched.
