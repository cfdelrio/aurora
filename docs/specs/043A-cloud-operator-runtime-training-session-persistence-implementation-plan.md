# Aurora — Technical Spec 043A — Cloud Operator Runtime & Training Session Persistence Implementation Plan

> **Status (2026-06-30).** Technical Specification phase for Spec 043 (`56f19f3`). It translates the cloud
> operator runtime + training-session persistence boundary into a TS/infra-strict implementation plan **grounded
> in the real code**. It is **plan only**: it implements no code, adds no infrastructure / Dockerfile / IaC /
> migrations / API/UI / CLI/script/package command, edits no package file, adds no dependency, adds no
> provider/live or delivery integration, amends no guard (AC20 untouched), and creates no production whole-core
> composer. Base: dev branch from merged `main` (`7ebef4b`); `tsc --noEmit` clean; `node --test` **852/852**.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 043-A** (and its
slices) and writes no code/infra.

---

## 1. Context recap

`[FACT]` Spec 043 decided (Option C): a **minimal, non-public cloud operator runtime** + **relational metadata
store** + **object storage for raw training artifacts**; **manual/export intake first**; **all processing behind
`invokeOperatorSession`**; **persist only `OperatorSessionEnvelope`** (never the raw outcome); deterministic fakes
by default; delivery withheld; no automatic `AthleteDecision`; no public API/UI; no automatic Garmin; no
live-provider default; no production whole-core composition. This plan decides the **concrete** runtime/storage/
record/entrypoint shape and the **slicing** — without building anything.

---

## 2. Real-Code / Repo Gap Analysis (grounded)

1. **No cloud entrypoint exists.** The only `scripts/` file is `operator-live-smoke.mjs` (operational smoke).
2. **No worker exists.** No operator-triggered runtime process.
3. **No public API exists.**
4. **No CLI/package command exists.** `package.json` scripts: `typecheck` / `test` / `check` only.
5. **No DB adapter exists for this runtime.** The repository **convention** is established, though:
   `<name>-repository.ts` (port) + `in-memory-<name>-repository.ts` (adapter), each in `<module>/application/`
   (observation, reasoning, understanding, decision-support, athlete, rendering, delivery, event-recording).
6. **No schema/migrations exist for training sessions.**
7. **No object-storage adapter exists for training artifacts.**
8. **No Garmin parser/importer exists.**
9. **No automatic Garmin integration exists.**
10. **No runtime persistence for `OperatorSessionEnvelope` exists.** The envelope type + mapper + helper exist in
    `application-orchestration/application/` (`operator-session-envelope.ts`, `operator-session-invocation.ts`).
11. **No cloud deployment target exists.**
12. **No Dockerfile/IaC exists.**
13. **No auth/session/user system exists.** Identity is a safe opaque `athleteRef` string.
14. **No delivery channel exists.** `offlineReflectionRuntime` withholds delivery (`deliveryWithheld: true`).
15. **Live provider remains opt-in/deferred** (Impl 021/026/027 gates; deterministic `FakeProviderClient` default).
16. **Existing secret/cloud-provider adapters are seams, not a selected deployment** (Impl 028/029 contracts).
17. **AC20a:** 9 allowlisted top-level production modules (`observation`, `reasoning`, `understanding`,
    `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`, `application-orchestration`) +
    `__tests__` — **no new top-level module may be created.** **AC20b:** no production file imports all four core
    surfaces.
18. **`invokeOperatorSession` is the required processing seam** (no caller may call `offlineReflectionRuntime`
    directly).
19. **`OperatorSessionEnvelope` is the only safe persisted invocation result** (never the raw
    `OfflineReflectionRuntimeOutcome`).
20. **Athlete decision capture remains separate** (Impl 037-A; athlete-declared/reported only).

`[FACT] [GAP — critical AC20 consequence].` To run a session, `invokeOperatorSession` needs a **caller-assembled
`RenderingRequest`** in the command. A production cloud worker that *derived* the renderable from a Garmin/training
artifact would have to compose the whole core (observation→…→renderable) in production = **AC20b violation**.
Therefore 043-A's runnable scope is: **store the raw artifact + metadata, and run sessions whose `RenderingRequest`
is supplied to the worker** (caller-assembled, e.g. from a stored/handed-in renderable or a future AC20-safe
composition boundary). **Deriving a renderable from Garmin data is NOT in 043-A** — it remains the deferred,
separately-specified AC20-safe composition lane (successor to Spec 034R, behind its own §042 evidence). 043-A
delivers the **cloud place + persistence + safe invocation seam**, not the observation→renderable pipeline.

`[FACT]` Decisive consequence: the persistence **ports + records + worker** are application-level and reference
only safe refs/strings + the existing `OperatorSessionEnvelope` type → they live in
**`application-orchestration/application/`** (no new top-level module — AC20a safe; no upstream-core import —
Impl 025 safe). Concrete **cloud adapters** (Postgres/S3) and **deployment artifacts** (Dockerfile/IaC) live
**outside `src/modules/`** (repo root / a non-module dir) at the deployment slice — not touching AC20a.

---

## 3. Central Question

> What is the **minimum concrete** cloud runtime, storage model, record model, and operator entrypoint needed to
> run Aurora with real training sessions in the cloud — preserving `invokeOperatorSession`, envelope-only output,
> no-default-live-call, delivery-withheld, athlete-decision-ownership, and AC20?

**Answer:** application-level **persistence ports + in-memory adapters** for training-session / operator-run /
envelope records (in `application-orchestration/application/`), an **object-storage port** for raw artifacts (fake
adapter first), and an **internal operator worker** application service that runs **behind `invokeOperatorSession`**
and persists only the envelope — built in **thin, test-backed slices**, with **cloud adapters + deployment target
deferred to the last slice**. The renderable stays **caller-supplied** (deriving it from Garmin is a separate,
deferred AC20-safe lane).

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Cloud runtime target → **a single containerized worker process; binding target deferred to the deployment slice (043-A4)**
Direction: a **non-public, operator-triggered single worker/job process** (lowest operational complexity; no
public ingress, no autoscaling). Concrete candidates — **EC2-simple**, **Docker on EC2**, **ECS/Fargate**,
**Lambda/job runner**, **managed container (App Runner/Render/Railway/Fly.io)** — are **decided at 043-A4** (the
deployment slice), which should pick the **simplest portable container** runnable on EC2 first and movable to
ECS/Fargate later. **Slices 043-A1–A3 are target-agnostic** (in-memory/fakes), so the target choice does not block
them. Rejected: **F (stay local)** — the evidence is cloud operation.

### `[DECISION]` Decision 2 — Persistence engine → **Postgres-compatible direction; in-memory first (no engine in early slices)**
Production direction: a **Postgres-compatible relational metadata store** (referential, auditable, multi-session —
the §042 persistence threshold). **Slice 043-A1 uses in-memory repositories behind ports** (no DB engine, no
migrations). A concrete **Postgres adapter + schema/migrations** is a **later slice (043-A4 or its own)** with an
**explicit migration path**. SQLite-first is acceptable **only** if 043-A4 justifies it with a stated Postgres
migration path; default direction is Postgres-compatible. Rejected: **files-only**, **object-store-only**
(we need queryable session/envelope history), **DB-blob for artifacts**.

### `[DECISION]` Decision 3 — Object storage → **S3-compatible direction; fake/in-memory adapter first**
Raw Garmin/manual artifacts are binary → **S3-compatible object storage** (provenance-keyed, opaque at rest).
**Slice 043-A2 uses a fake/in-memory object-store adapter** behind a port; the concrete S3-compatible adapter is a
later slice. Rejected: **local-filesystem-as-the-answer** (fine for dev only), **DB-blob**, **no raw-artifact
storage** (provenance matters).

### `[DECISION]` Decision 4 — Intake formats → **manual JSON + opaque raw artifact (FIT/TCX/CSV stored opaque); parsing deferred; no auto-Garmin**
First intake: a **manual JSON training summary** *and/or* an **uploaded raw artifact** (Garmin FIT/TCX/CSV)
stored as **opaque bytes with provenance**. **No parsing of FIT/TCX/CSV in 043-A** (no parser exists; parsing →
meaning is observation's territory and would pull the worker toward composition). **Automatic Garmin API
integration is rejected** for now (own evidence + spec). Exact first formats confirmed at 043-A1/A2.

### `[DECISION]` Decision 5 — Minimal record model → **defined (application-level; safe refs only)**
All records live in `application-orchestration/application/` (AC20a-safe), reference only safe strings/refs + the
existing `OperatorSessionEnvelope` type, and import **no** upstream core:

| Record | Purpose | Required fields | Provenance | What it is NOT | In 043-A? |
| --- | --- | --- | --- | --- | --- |
| `AthleteRef` | safe opaque athlete reference | the existing `athleteRef` string | — | not a user/auth record; no PII | reused (exists) |
| `TrainingSessionRecord` | metadata for one training session | id, athleteRef, sourceKind, occasion?, occurredAt?, artifactRef? | sourceKind + uploadedAt | not Evidence, not truth, not an ObservationSet | **A1** |
| `TrainingSessionRawArtifact` | the raw Garmin/manual file (object storage) | artifactRef (storage handle), contentType, byteSize, checksum? | sourceKind + uploadedAt | not parsed/interpreted; opaque at rest; not truth | **A2** (port A1) |
| `ManualObservationPack` | optional caller-assembled normalized input | opaque/handed-in shape | caller-declared | not pre-derived meaning; not whole-core output | **deferred** (optional) |
| `OperatorSessionRunRecord` | a record that a session was run | id, athleteRef, trainingSessionRef, operatorRef, timing, status | operator marker + run time | not an athlete decision; not delivery | **A1** |
| `OperatorSessionEnvelopeRecord` | the persisted envelope | the `OperatorSessionEnvelope` (status, deliveryWithheld, rawRetained:false, reflectionRef?+flags, decisionCapture, admissionReason?, safeReason?, intakeStatus, mediation, traceSummary) | run ref | **not** the raw outcome; not delivery; not a decision | **A1** |
| `DecisionCaptureLink` | the envelope's decision-capture invitation/ref | kind, athleteRef, acceptableSources | from envelope | **not** an `AthleteDecision` | **A1** |
| `AthleteDecisionRecord` | a later, athlete-declared/reported decision | (existing athlete domain) | athlete source | only if athlete later declares/reports; separate flow | **deferred** (Impl 037-A path; not 043-A) |

### `[DECISION]` Decision 6 — Entrypoint model → **internal operator worker application service behind `invokeOperatorSession`; no public API, no package script**
The processing entrypoint is an **internal operator worker application function** (in
`application-orchestration/application/`) that: loads a `TrainingSessionRecord` (+ artifact ref) and a
**caller-supplied `RenderingRequest`**, calls **`invokeOperatorSession`** (never `offlineReflectionRuntime`), and
**persists the `OperatorSessionEnvelopeRecord` + `OperatorSessionRunRecord`**. **No public API.** **No package
script.** A thin **executable** entrypoint (to actually run the worker in cloud) is the **deployment slice
(043-A4)** and lives **outside `src/modules/`** (like `operator-live-smoke.mjs`), behind the same worker function.

### `[DECISION]` Decision 7 — Secrets and config → **config-only; no live key by default**
Deployment settings (DB/object-store credentials) are **config-only**, supplied at the deployment slice and read
**outside `src/modules/`** (no new in-`src` `process.env` site; the production env seal stays). **No live-provider
key required by default; no rendering-provider secret unless an explicit opt-in is separately specified.** Existing
secret-manager seams (Impl 028/029) stay **deferred** unless 043-A4's target requires config wiring.

### `[DECISION]` Decision 8 — No-live / no-delivery wiring → **deterministic fakes; withheld; no sink; no auto-decision**
The worker injects **deterministic fake deps by default** (`FakeProviderClient`, in-memory rendered-message repo,
fake secret ref). `deliveryWithheld` stays `true`; **no delivery sink**; the operator reviews persisted envelopes;
**no automatic `AthleteDecision`** (only the invitation/ref is persisted).

### `[DECISION]` Decision 9 — AC20 / composition boundary → **worker composes no core; renderable caller-supplied**
The worker **must not become a production whole-core composer**: it receives a **caller-supplied `RenderingRequest`**
(AC20b). Persistence ports/records live in `application-orchestration/application/` and import **no** upstream core
(Impl 025). **No `reflection-composition` module.** Deriving a renderable from training data remains a **separate,
deferred AC20-safe composition lane** (successor to 034R) — explicitly **not** 043-A.

### `[DECISION]` Decision 10 — Implementation slicing → **Option E: thin, test-backed slices**
```text
043-A1 — Cloud persistence ports + in-memory repositories (TrainingSessionRecord, OperatorSessionRunRecord,
         OperatorSessionEnvelopeRecord, DecisionCaptureLink) in application-orchestration/application/. Tests only;
         no DB engine, no migrations, no infra.
043-A2 — Object-storage port for raw training artifacts + a fake/in-memory adapter (provenance, opaque). Tests only;
         no S3, no cloud.
043-A3 — Internal operator worker application service behind invokeOperatorSession: load training session +
         caller-supplied RenderingRequest → invokeOperatorSession → persist envelope/run records. Tests only
         (deterministic fakes); no executable, no public API.
043-A4 — Deployment slice (LAST, only after A1–A3 are proven): select the concrete cloud target + Postgres adapter
         + S3 adapter + a thin out-of-src executable entrypoint + Dockerfile/IaC. Its own spec/approval.
```
Rejected: bundling DB + object storage + worker + deployment + parsing into one implementation. Prefer thin slices
with tests; defer all infra to 043-A4.

---

## 5. Required Future Test Plan (per slice)

1. raw training artifact stored with provenance, **not truth** (A2).
2. training session record persisted separately from Evidence (A1).
3. processing calls **`invokeOperatorSession`**, not `offlineReflectionRuntime` (A3).
4. **`OperatorSessionEnvelope` persisted, not the raw outcome** (A1/A3).
5. reflection-ready is **not** delivery (A3).
6. `deliveryWithheld` preserved (A3).
7. **no automatic `AthleteDecision`** (A3).
8. later athlete-declared/reported decision remains **separate** (A1 record exists but unused until declared).
9. **no live provider by default** (A3, deterministic fakes; throwing client proves stopped paths).
10. **no delivery sink** by default (A3).
11. **no Garmin automatic integration** (guard).
12. object-storage adapter stores a **raw artifact ref only** (A2).
13. relational metadata record stores **refs/statuses only** (A1).
14. **no app-orch whole-core imports** (negative-capability guard, every slice).
15. AC20 remains green (every slice).
16. **no public API/UI** (guard).
17. **no package script** unless explicitly selected (guard).
18. **no DB migration** unless that slice (A4) is selected.
19. **no IaC/Dockerfile** unless the deployment slice (A4) is selected.
20. all existing tests remain green.

---

## 6. Boundary / Import Rules

**Allowed:** `application-orchestration` importing its own `invokeOperatorSession` / `OperatorSessionEnvelope` /
runtime types; new persistence ports + in-memory adapters + the worker in
`application-orchestration/application/`; tests using deterministic fakes + typed fixtures; (A4 only, outside
`src/modules/`) a thin executable entrypoint + Dockerfile/IaC + concrete Postgres/S3 adapters. **Forbidden:** a new
top-level `src/modules/` module (AC20a); `application-orchestration` production files importing observation/
reasoning/understanding/athlete (Impl 025); a production whole-core composer / `reflection-composition`; the worker
calling `offlineReflectionRuntime` directly; automatic Garmin integration; provider/live default; a delivery sink;
automatic `AthleteDecision`; auth/session/user; API/UI; DB migrations / IaC / Dockerfile / package changes /
dependencies **before** the deployment slice (043-A4) is separately approved.

---

## 7. Required Distinctions

```text
cloud runtime ≠ public API ≠ SaaS ≠ athlete UI ≠ automatic Garmin ≠ live-provider default ≠ automatic delivery ≠
AthleteDecision capture ≠ production whole-core composition · database record ≠ truth · training session ≠ Evidence ·
Garmin file ≠ truth · operator run ≠ athlete decision · OperatorSessionEnvelope ≠ raw runtime outcome ≠ delivered artifact ·
worker ≠ whole-core composer · caller-supplied RenderingRequest ≠ derived-from-Garmin (deferred) ·
Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 8. Relationship To Existing Architecture

- **Spec 043** — implements its cloud/persistence boundary as thin, test-backed slices.
- **Spec 042** — the gate: persistence + deployment lanes entered; API/UI, live, delivery, auth, AC20 still gated.
- **Spec 041 / Impl 041-A** — `invokeOperatorSession`, the worker's **only** processing seam.
- **Spec 040 / Impl 040-A** — `OperatorSessionEnvelope`, the **only** persisted result.
- **Spec 038 / Impl 038-A** — the operator runbook, automated minimally by the worker.
- **Spec 037 / Impl 037-A** — decision capture stays separate.
- **Impl 028/029** — secret/cloud-secret seams remain deferred unless 043-A4 needs config wiring.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the worker composes no core; deriving a
  renderable from Garmin is a separate deferred AC20-safe lane.

---

## 9. Forbidden Behaviors

```text
implementation code in this tech spec · actual DB migrations · actual IaC · Dockerfile · package changes ·
CLI/script creation · API/UI creation · automatic Garmin integration · provider/live default · delivery channel ·
automatic AthleteDecision · auth/session/user implementation · AC20 amendment · reflection-composition module ·
production whole-core composer · a future cloud surface calling offlineReflectionRuntime directly ·
treating Garmin as truth · treating DB rows as Evidence · treating the envelope as a delivered artifact
```

---

## 10. Open Questions (deferred to the slices)

1. SQLite-first vs Postgres-first for the concrete adapter (043-A4) + migration path.
2. Exact object-store product (S3 vs compatible) (043-A4).
3. Exact schema column types/indexes (043-A4 / adapter slice).
4. Whether `ManualObservationPack` is persisted now or stays caller-handed-in (043-A1).
5. The exact executable entrypoint form (out-of-src runner) + Dockerfile (043-A4).
6. Local/dev equivalent (e.g. docker-compose with local Postgres/MinIO) (043-A4).
7. When/whether the AC20-safe observation→renderable composition lane is opened (separate evidence + spec).
8. Cost/risk constraints for the chosen target (043-A4).

---

## 11. Implementation Task Preview

`[DECISION]` **Implementation 043-A plan = Option E (thin, test-backed slices):** **043-A1** cloud persistence
ports + in-memory repositories (training-session / operator-run / envelope / decision-capture-link records) in
`application-orchestration/application/`; **043-A2** object-storage port + fake adapter for raw artifacts;
**043-A3** internal operator worker service behind `invokeOperatorSession` persisting only the envelope; **043-A4**
deployment slice (concrete cloud target + Postgres + S3 + out-of-src executable + Dockerfile/IaC) **last, after
A1–A3 are proven, with its own approval.** Each slice is docs/ports/tests with deterministic fakes; no infra until
A4.

**Recommended next mission: Implementation 043-A1 — Cloud Persistence Ports for Training Sessions and Operator
Runs** (test-backed, in-memory, in `application-orchestration/application/`; no DB engine, no migrations, no
infra). Then 043-A2 → 043-A3 → (separately approved) 043-A4.

---

## 12. Success Criteria

Can Aurora plan, concretely enough to implement, a minimum cloud operator runtime + training-session persistence —
application-level persistence ports + in-memory adapters + an object-storage port (fakes first) + an internal
worker behind `invokeOperatorSession` persisting **only** the envelope, with raw artifacts stored opaque with
provenance, deterministic fakes by default, delivery withheld, no automatic `AthleteDecision`, renderable
caller-supplied (no whole-core composition), and all concrete cloud/DB/object-store/deployment choices deferred to
the last slice — **without** building code/infra and **without** an AC20 amendment? **Yes — via Option E slicing**
(043-A1 → A2 → A3 → A4), home in `application-orchestration/application/` (AC20a-safe; Impl-025-safe), infra
out-of-`src` at A4 only. Validation at authorship: `tsc --noEmit` clean; `node --test` 852/852; no code, infra,
migration, package, or dependency change; AC20 untouched.
