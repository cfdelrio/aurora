# Aurora — Technical Spec 043D — Concrete Persistence Adapter & Dependency Approval Plan

> **Status (2026-06-30).** Technical Specification phase, building on Impl 043-C3 (`5093f9f`). It is **plan
> only**: it implements no code, adds no dependency, edits no package/tsconfig file, writes no DB adapter /
> object-storage adapter / migration / Dockerfile / IaC / worker / API / UI / CLI, couples no secret manager,
> reads no process environment, weakens no guard, amends no AC20, and revives no `reflection-composition`.
> Base: `tsc --noEmit` clean; `node --test` **887/887**. It decides *what to approve next* before any concrete
> adapter or runtime dependency is introduced.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — it plans **Implementation 043-D** (and slices) and writes no
code/infra. It sits between the C-series fakes (C1–C3) and the first concrete adapter, gating the project's
**first runtime dependency** behind an explicit, evidence-based approval.

---

## 1. Context recap

`[FACT]` The operator-runtime layer at `src/operator-runtime/` now has:
- **C1** (`5d20605`) — records (`TrainingSessionRecord` + `TrainingSessionRawArtifactRef`,
  `OperatorSessionRunRecord`, `OperatorSessionEnvelopeRecord`, `DecisionCaptureLink`), repository **ports**,
  deterministic **in-memory adapters**, and an import-boundary negative-capability guard.
- **C2** (`1a59e73`) — `TrainingArtifactObjectStore` **port** + `FakeTrainingArtifactObjectStore` (opaque raw
  artifacts, never parsed) + `toRawArtifactRef`.
- **C3** (`5093f9f`) — `runOperatorSession(...)`: loads a training session, runs **only** through
  `invokeOperatorSession`, persists **only** `OperatorSessionEnvelopeRecord` (+ run + optional
  `DecisionCaptureLink`), returns refs + the safe envelope.

C4 would introduce **concrete** DB/object-storage adapters and **may require the first runtime dependency** — so
this spec decides the dependency/adapter strategy *first*.

---

## 2. Current-State Summary (grounded in repo evidence)

```text
 1. ports exist                          — yes (TrainingSession/OperatorSessionRun/Envelope/DecisionCaptureLink + TrainingArtifactObjectStore)
 2. fake/in-memory adapters exist        — yes (InMemory* repositories + FakeTrainingArtifactObjectStore)
 3. run service exists                    — yes (runOperatorSession, behind invokeOperatorSession)
 4. no concrete DB adapter               — confirmed
 5. no concrete object-storage adapter   — confirmed (only the fake)
 6. no runtime config for DB/object store— confirmed
 7. no migrations                         — confirmed
 8. no schema                             — confirmed (records are TS types only)
 9. no deployment target yet             — confirmed
10. no worker executable yet             — confirmed (only scripts/operator-live-smoke.mjs, unrelated)
11. no package dependency for the layer  — confirmed (package.json dependencies: none)
12. no API/UI/CLI                         — confirmed
13. no live-provider default             — confirmed
14. no delivery                           — confirmed
15. AC20 unchanged                        — confirmed
```

`[FACT]` **Package/tsconfig evidence (decisive):**
- `package.json` has **no `dependencies`**; `devDependencies` = exactly `@types/node` + `typescript`; scripts =
  `typecheck` (`tsc --noEmit`), `test` (`node --test "src/**/*.test.ts"`), `check`.
- `package-lock.json` contains **only** those two dev packages (+ `undici-types`). Adding *any* runtime client
  (`pg`, `postgres`, `@aws-sdk/*`, …) would be the **first `dependencies` entry ever** and **would change
  `package-lock.json`**.
- `tsconfig.json` → `include: ["src"]`, `nodenext`, `strict`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `allowImportingTsExtensions`, `isolatedModules`, `skipLibCheck`, `types: ["node"]`.

`[FACT]` **Guard evidence (the central tension).** `operator-runtime-negative-capability.test.ts` scans the
layer's **production files** and asserts they reference **no** DB/ORM/migration token, **no** object-storage SDK,
**no** cloud SDK, **no** provider/live transport, **no** delivery import, **no** secret/cloud adapter, **no**
filesystem import (`node:fs`/`fs`), and **no** process-environment token. Repo-wide,
`process-environment-negative-capability.test.ts` further pins the env token to **exactly one approved file**.
→ **A concrete adapter that imports `pg` or `@aws-sdk` would TRIP the layer guard as written.** Therefore a
concrete adapter cannot land without an explicit, *scoped* guard amendment that **pins the approved client token
to exactly the one approved adapter file** (the established `process-environment-credential-source-adapter`
"one-file-token" precedent) — and that amendment is itself a deliberate, separately-approved act tied to the
dependency approval, **not** a weakening done for convenience.

`[FACT]` **Multiple-test-engine config reality:** `node --test "src/**/*.test.ts"` discovers **every** `*.test.ts`
under `src/`. Any future *integration* test that needs a live DB/object store would, if named `*.test.ts` under
`src/`, run in the default suite and break a no-network CI. Integration tests must therefore be **opt-in / out of
the default glob** (deferred to D5), not mixed into the unit suite.

---

## 3. Central Question

> What concrete DB adapter, object-storage adapter, dependency strategy, configuration boundary, schema/migration
> approach, and implementation slicing should Aurora approve next, now that operator-runtime has ports + fakes +
> the run service — **without** adding a dependency, weakening a guard, or amending AC20 in this spec?

**Answer (preview):** approve **no real dependency yet**; do **043-D1** = concrete *adapter contracts* + thin
*client ports* + *fake-client* contract/mapping tests + *schema-mapping types* + a *conceptual schema*, at **zero
dependencies and zero guard changes**; then approve a **Postgres-compatible** client (D2) and an **S3-compatible**
object-storage SDK (D3) **at their own slices**, each ratified with a **scoped one-file guard token-pin**.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — DB adapter strategy → **Option D (Postgres-compatible behind the port; client deferred)**
Selected: **D** — a Postgres-compatible adapter implementing the existing `*Repository` ports, written against a
**thin internal "row store" client port** so the concrete driver is chosen and approved at D2. Direction:
**Postgres-compatible relational metadata** (the records are small, relational, queried by athlete / training
session / run — a natural fit). Rejected: **A** (fakes-only forever — leaves cloud persistence unbuilt);
**B** (SQLite *as the final target* — fine as a dev convenience later, wrong as the cloud store of record);
**C** (commit to a *specific* Postgres client now — premature; couples the dependency before D2 approval);
**E** (managed-service SDK adapter — heavier coupling than needed for metadata; defer). **No ORM** (Prisma/
TypeORM/Drizzle/Sequelize) — the record set is tiny and explicit; an ORM is unjustified weight and a large
dependency surface.

### `[DECISION]` Decision 2 — Object-storage adapter strategy → **Option D (S3-compatible interface; SDK deferred)**
Selected: **D** — an **S3-compatible** adapter implementing `TrainingArtifactObjectStore`, written against a thin
internal **blob-client port**; the concrete SDK is chosen/approved at D3. Raw artifacts (Garmin `.fit`/`.tcx`,
`.csv`, manual blobs) are **opaque bytes** and belong in **object storage**. Rejected: **A** (fake-only forever);
**B** (local filesystem as the cloud store — not cloud persistence; also trips the `node:fs` guard);
**C** (commit to the AWS SDK now — premature before D3); **E** (DB blob columns — rejected: bloats the
relational store, couples artifact size to DB limits, and conflates opaque payloads with queryable metadata).

### `[DECISION]` Decision 3 — Dependency approval → **approve NONE now; pre-approve in principle, ratify at the slice**
`[FACT]` D1 needs **zero** new dependencies (fakes/contracts only). Therefore **approve no dependency in this
spec.** **Pre-approved in principle, each ratified at its own slice with explicit sign-off:**
- **D2:** exactly **one** Postgres-compatible client (candidate: a lightweight driver such as `postgres` or `pg`;
  final choice stated at D2). First-ever `dependencies` entry → `package-lock.json` will change **then**.
- **D3:** exactly **one** S3-compatible object-storage SDK (candidate: `@aws-sdk/client-s3` or a lighter
  S3-compatible client; final choice at D3).
- **Migration tooling:** **not approved** — prefer plain `.sql` files (D2) over a migration-tool dependency.
- **testcontainers / integration tooling:** **not approved now** — deferred to **D5**, opt-in, never in the
  default `node --test` glob.
Principle: **approve only the smallest dependency set the next slice actually needs**, and keep DB, object
storage, migrations, config, and deployment as **separate** approvals.

### `[DECISION]` Decision 4 — Schema & migrations → **Option C now (mapping types) + Option B at D2 (plain SQL)**
Now (D1): **C** — author **schema-mapping types** (record ⇄ row / record ⇄ object-key shapes) and a **conceptual
schema** (tables: `training_session`, `operator_session_run`, `operator_session_envelope`,
`decision_capture_link`; object keys for raw artifacts), **no SQL**. At D2: **B** — **plain `.sql` migrations**
checked into the layer/deployment (no migration-tool dependency; **D** rejected). **E** (defer schema entirely to
deployment) rejected — the mapping types belong with the adapter contracts. The envelope row stores **only** the
whitelisted `OperatorSessionEnvelope` (JSON column or projected columns) — **never** the raw outcome.

### `[DECISION]` Decision 5 — Configuration boundary → **explicit injected config object; no env in adapter core**
Concrete adapters receive a **plain config object via constructor injection** (connection target, bucket name,
etc.). **No `process.env` reads in adapter core** (preserves the one-file env-token guard). Environment/secret
**resolution is deferred to the out-of-`src` deployment executable (C5/D5)**, which assembles the config and
injects it. **Secret-manager coupling deferred.** This keeps the adapter pure, testable with a fake client, and
free of the env/secret guards.

### `[DECISION]` Decision 6 — Test strategy → **D1 unit + contract tests vs. fake clients; integration deferred to D5**
- **D1:** **contract/mapping tests against fake clients** — define a thin **row-store** and **blob-store** client
  port, supply in-test fakes, and prove the adapter↔record mapping round-trips, preserves provenance, and stores
  **only** the safe envelope. Pure, deterministic, no network. (These live under `src/operator-runtime/tests/`.)
- **D5:** **integration tests against a real DB/object store** — **opt-in**, **outside** the default
  `node --test "src/**/*.test.ts"` glob (a separate command/dir), so the default suite never needs a live
  service. Not now.

### `[DECISION]` Decision 7 — Implementation slicing → **D1 next; never bundle DB+S3+migrations+config+deploy**
```text
043-D1 — concrete ADAPTER CONTRACTS + thin client ports (row-store / blob-store) + fake-client contract & mapping
         tests + schema-mapping types + conceptual schema doc. ZERO dependencies. ZERO guard changes. (Next.)
043-D2 — Postgres-compatible adapter behind the row-store port + the FIRST approved dependency (one client) +
         plain .sql migrations + a SCOPED guard token-pin (the client token allowed in exactly one adapter file).
043-D3 — S3-compatible adapter behind the blob-store port + ONE approved object-storage SDK + scoped guard token-pin.
043-D4 — runtime CONFIG boundary (explicit injected config object; still no env in adapter core).
043-D5 — opt-in integration tests + out-of-`src` deployment wiring (executable/Dockerfile/IaC) — separate approval.
```
Rejected: bundling. **Next mission = 043-D1.**

---

## 5. Boundary Rules — any future concrete adapter MUST

```text
live in src/operator-runtime/ · implement the existing ports · change no core module contract ·
import no src/modules internals (only the application-orchestration public index, and only the run service does) ·
never call offlineReflectionRuntime · never call invokeOperatorSession (only runOperatorSession does) ·
create no Evidence / ObservationSet / Signal · create no AthleteDecision · deliver nothing ·
parse no Garmin artifact (payloads stay opaque) · read no process environment directly (config is injected) ·
own no deployment (the out-of-`src` executable owns wiring) · persist only the whitelisted records/envelope.
```

`[FACT]` **Guard consequence to honor at D2/D3:** because the layer guard bans DB/object-storage/cloud-SDK tokens
in *all* production files, the concrete-adapter slices must (a) introduce the approved client token in **exactly
one** adapter file and (b) **amend the guard to a one-file token-pin** (allow the token in that single approved
file, keep it forbidden everywhere else) — **deliberately, with the dependency approval**, mirroring
`process-environment-credential-source-adapter`. This is a *scoped, explicit* amendment, **not** a weakening; D1
introduces neither token nor amendment.

---

## 6. Required Distinctions

```text
ports + fakes ≠ concrete adapter · concrete adapter ≠ deployment · adapter ≠ whole-core composer ·
Postgres metadata ≠ object-storage blobs · opaque artifact ≠ truth · artifact payload ≠ ObservationSet ·
OperatorSessionEnvelopeRecord ≠ raw outcome · injected config ≠ process-environment read · plain .sql ≠ ORM ·
contract test vs. fake ≠ integration test vs. real service · dependency pre-approved ≠ dependency added ·
scoped one-file token-pin ≠ guard weakening · Aurora advises, the athlete decides; Aurora never presents inference as fact.
```

---

## 7. Forbidden In This Spec (and until each slice approves its scope)

```text
implementation code · package dependency change · package-lock change · DB adapter implementation ·
S3 adapter implementation · filesystem persistence · migrations · Dockerfile · IaC · worker executable ·
API/UI/CLI · automatic Garmin integration · Garmin parser · live-provider default · delivery channel ·
automatic AthleteDecision · secret-manager coupling · process-environment reads · AC20 amendment ·
reflection-composition · production whole-core composer
```

---

## 8. Relationship To Existing Architecture

- **Spec 043 / 043A-R / 043B / 043C** — direction (cloud + real sessions), home (`src/operator-runtime/`), and the
  C-slice plan stand; this spec gates the **concrete-adapter / first-dependency** step C3 → C4 named the D-series.
- **C1/C2/C3** — ports, fake adapters, and the run service are the seams the concrete adapters implement, unchanged.
- **`operator-runtime-negative-capability` guard** — its DB/SDK/cloud/env bans are the reason D2/D3 need a scoped
  one-file token-pin; D1 keeps it fully green.
- **`process-environment-credential-source-adapter`** — the precedent for a one-file token-pin and for deferring
  env/secret resolution to a deployment boundary.
- **AC20 / Spec 034R** — unchanged; the persistence layer composes no core and stays invisible to AC20a/AC20b.

---

## 9. Open Questions (deferred to the slices)

```text
1. Exact Postgres client (postgres vs pg vs node:sqlite-for-dev) — D2.
2. Exact S3-compatible SDK (@aws-sdk/client-s3 vs lighter client) and provider (AWS/R2/MinIO) — D3.
3. Envelope storage shape (single JSONB column vs projected columns) — D2.
4. Migration ordering/runner (plain psql vs a tiny in-repo runner, still no tool dependency) — D2.
5. Object-key scheme + lifecycle/retention for raw artifacts — D3.
6. Integration-test harness + how it stays out of the default glob — D5.
7. Deployment target + the out-of-`src` executable form — D5 (separate approval).
```

---

## 10. Required Output

`[DECISION] Concrete adapter plan:` **Add no real dependency yet.** Next implement **043-D1** — concrete *adapter
contracts* + thin *row-store / blob-store client ports* + *fake-client* contract & mapping tests + *schema-mapping
types* + a *conceptual schema*, at **zero dependencies and zero guard changes**. Then, at their own slices and with
explicit sign-off: **043-D2** introduces **one** Postgres-compatible client (first dependency) + plain `.sql`
migrations + a **scoped one-file guard token-pin**; **043-D3** introduces **one** S3-compatible object-storage SDK
+ scoped token-pin; **043-D4** the injected runtime config boundary; **043-D5** opt-in integration tests +
out-of-`src` deployment wiring (separate approval).

```text
selected DB adapter direction        : Postgres-compatible, behind the existing repository ports via a thin
                                        row-store client port; no ORM; concrete client chosen/approved at D2.
selected object-storage direction     : S3-compatible, behind TrainingArtifactObjectStore via a thin blob-store
                                        client port; reject DB blobs + filesystem; concrete SDK approved at D3.
dependency approval status            : NONE approved now. D1 = zero deps. Postgres client (D2) and S3 SDK (D3)
                                        pre-approved in principle, ratified at their slices. Migration tool +
                                        testcontainers: not approved (plain .sql; integration deferred to D5).
schema/migration decision             : mapping types + conceptual schema now (D1, no SQL); plain .sql migrations
                                        at D2 (no migration-tool dependency).
configuration boundary                : explicit config object via constructor injection; no process.env in
                                        adapter core; env/secret resolution deferred to the deployment executable.
test strategy                         : D1 contract/mapping tests vs. fake row-store/blob-store clients
                                        (deterministic, no network); real integration tests opt-in at D5, outside
                                        the default node --test glob.
selected implementation slicing       : D1 (next) → D2 → D3 → D4 → D5 (never bundled).
recommended next mission              : Implementation 043-D1 — Concrete Adapter Contracts + Fake-Client Tests
                                        (adapter contracts + row-store/blob-store client ports + fake-client
                                        contract/mapping tests + schema-mapping types + conceptual schema; zero
                                        dependencies; no guard change; AC20 unchanged).
```

---

## 11. Success Criteria

Can Aurora decide, concretely enough to implement, the concrete-persistence direction — Postgres-compatible
metadata + S3-compatible object storage, each behind a thin client port; the smallest dependency approval
(none now; one client at D2, one SDK at D3); plain `.sql` migrations (no tool); injected config (no env in
adapter core); fake-client contract tests now / real integration deferred; and a non-bundled D1→D5 slicing —
**without** adding a dependency, weakening a guard, or amending AC20 in this spec? **Yes — via 043-D1 next, with
D2/D3 gating the first dependencies behind a scoped one-file guard token-pin.** Validation at authorship:
`tsc --noEmit` clean; `node --test` 887/887; no code/test/package/tsconfig/dependency change; no guard weakened;
AC20 untouched.

```text
ports/fakes ≠ concrete adapter · pre-approved ≠ added · scoped one-file token-pin ≠ guard weakening ·
Postgres metadata ≠ object-storage blobs · injected config ≠ env read · plain .sql ≠ ORM ·
the adapter persists only the whitelisted envelope, never the raw outcome · Aurora advises, the athlete decides.
```
