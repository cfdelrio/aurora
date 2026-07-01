# Aurora — Specification 043E — Async Persistence Contract Re-decision (D2 Blocker Note)

> **Status (2026-06-30).** Specification / re-decision phase. A **docs-only blocker + contract re-decision**
> triggered when **Implementation 043-D2** could not honestly begin: the operator-runtime persistence ports are
> **synchronous**, but a real Postgres client is **asynchronous**. This note implements no code, adds no
> dependency, edits no package/tsconfig file, modifies no guard, amends no AC20, and installs nothing. The tree is
> at the green baseline: `tsc --noEmit` clean; `node --test` **896/896**, working tree clean. It supersedes
> **Tech Spec 043D's implicit assumption** that a concrete adapter can implement today's sync `RowStoreClient`;
> the cloud/persistence *direction* of Specs 043/043C/043D stands.

---

## 0. Phase confirmation

This is a **re-decision / blocker note** — not Implementation. It records the blocker and fixes the **contract
shape** (sync → async) so the next safe slice can be chosen. No `pg`/`postgres` install; no package-lock change.

---

## 1. What blocker was found

`[FACT]` **Implementation 043-D2** (Postgres-compatible `RowStoreClient` adapter) cannot start honestly. The D1
`RowStoreClient` is **synchronous**; a real Postgres driver in Node (`pg`, `postgres`) is **Promise-based**. A
real adapter therefore **cannot implement the current sync port**, and the required D2 guard test
*"Postgres adapter implements RowStoreClient"* is **unsatisfiable** as the port stands. No dependency was
installed; no package file was touched; the tree stayed green (896/896).

## 2. Precise blocker analysis (grounded in repo evidence)

```text
1. RowStoreClient is synchronous          — insert(...): void · get(...): StorageRow | undefined ·
                                             list(...): readonly StorageRow[] · findBy(...): readonly StorageRow[]
2. BlobStoreClient is synchronous         — put(...): void · get(...): BlobObject | undefined · head(...): BlobMetadata | undefined
3. C1 repository ports are synchronous    — every *Repository: save(...): void · findById(...): ... | undefined ·
                                             listBy*/findByRun(...): readonly [] (TrainingSession / OperatorSessionRun /
                                             OperatorSessionEnvelope / DecisionCaptureLink)
4. C3 run service calls repos synchronously— runOperatorSession awaits ONLY the seam (invokeOperatorSession);
                                             deps.trainingSessions.findById(...), deps.runs.save(...),
                                             deps.envelopes.save(...), deps.decisionLinks.save(...) are NOT awaited
5. real Postgres drivers are Promise-based — there is no synchronous Postgres query in Node (no sync socket I/O)
6. a real adapter cannot implement sync RowStoreClient — async I/O cannot satisfy a `: void` / `: T | undefined` signature
7. buffering / fake-sync wrappers are dishonest — a sync facade over async I/O cannot actually return query results;
                                             it would lie about completion and lose errors (explicitly rejected)
8. dependency install must stay paused     — the contract shape must be fixed BEFORE the first dependency /
                                             package-lock change, or the adapter would be built against a contract
                                             it cannot honor
```

## 3. Why this must be re-decided, not worked around

`[FACT]` The persistence abstraction (C1 ports + C2 store clients + C3 service) was built **synchronously** —
perfectly fine for in-memory fakes, but the in-memory fake was always a stand-in for a future **real** store.
Cloud persistence (Spec 043) requires real, networked, **async** I/O. The sync contract was the right shape for
the fake and the **wrong** shape for the real thing. Forcing a sync adapter (Option C below) would hide real
async I/O behind a false contract — architecturally dishonest and unsafe (dropped errors, fabricated
"completed"). This mirrors the 043-A1 episode: a true blocker is surfaced and the contract re-decided, never
gamed.

---

## 4. Central Question

> How should Aurora adapt operator-runtime persistence contracts for real cloud persistence, given the current
> row-store / blob-store / repository ports are synchronous while real Postgres (and object-storage) I/O is
> asynchronous?

**Answer:** make the operator-runtime persistence contracts **async (Promise-based) end-to-end** — ports, store
clients, fakes, and the run service — **before** any concrete DB/object-storage adapter or dependency. The fakes
become trivially-async, deterministic, and isolated; the redaction/safety semantics are untouched.

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — Async persistence end-to-end** (repository ports, row/blob store clients, in-memory/fake adapters, and the run service all become Promise-based) | **Selected.** Aligns the contract with real cloud I/O; the fakes stay deterministic; no dependency yet; concrete adapters (D2-R/D3) then implement honest async ports. |
| B — Introduce only `AsyncRowStoreClient` now; leave repositories sync | **Rejected (as the destination).** Leaves two persistence models (sync repos + async row-store) coexisting; the repos are themselves future DB-backed and must go async too. A half-migration adds churn and a second migration later. |
| C — Keep sync repos; wrap async adapters behind a sync facade | **Rejected.** A sync facade over async I/O is dishonest: it cannot return query results, cannot await completion, and swallows errors. Forbidden ("no fake synchronous wrapper over async I/O"). |
| D — Reject DB persistence; keep fake/in-memory only | **Rejected.** Spec 043 selected cloud persistence on real evidence; this would abandon the direction. |
| E — Defer Postgres; use a different storage engine | **Rejected (now).** No concrete alternative solves cloud persistence better; the async-contract problem exists for any networked store. (A specific engine choice remains a later, separate decision; it does not avoid async.) |

---

## 6. Decision

`[DECISION]` **Operator-runtime persistence contracts must become async (Promise-based) end-to-end BEFORE any
concrete DB/object-storage adapter or runtime dependency is implemented (Option A).** No `pg`/`postgres` install,
no `package.json`/`package-lock.json` change, no Postgres/S3 adapter until the async contracts exist.

`[DECISION]` **Async target shape:**
```text
RowStoreClient   : insert(...) -> Promise<void> · get(...) -> Promise<StorageRow | undefined> ·
                   list(...) -> Promise<readonly StorageRow[]> · findBy(...) -> Promise<readonly StorageRow[]>
BlobStoreClient  : put(...) -> Promise<void> · get(...) -> Promise<BlobObject | undefined> ·
                   head(...) -> Promise<BlobMetadata | undefined>
Repository ports : save(...) -> Promise<void> · findById(...) -> Promise<T | undefined> ·
                   listBy*/findByRun(...) -> Promise<readonly T[]>   (all four repositories)
Fakes            : in-memory adapters implement the async methods deterministically (return resolved Promises),
                   isolated per instance, still structuredClone in/out, no global state, no real I/O
Run service      : runOperatorSession awaits every repository call; still runs the session ONLY through
                   invokeOperatorSession (never the underlying runtime); still persists only OperatorSessionEnvelope
Mappers          : record/blob mappers stay PURE + SYNC (no I/O) — only the store/repository boundaries go async
Dependencies     : NONE added yet; package.json + package-lock.json unchanged; no real DB/S3 adapter yet
```
`[ASSUMPTION]` Record **factories and mappers remain synchronous** — they perform no I/O; only the
store/repository *boundaries* (which a real driver will back) become async. This keeps the redaction logic and the
whitelist mappers unchanged and pure.

---

## 7. Scope Control — the async migration MUST preserve (unchanged)

```text
no raw OfflineReflectionRuntimeOutcome persistence · no reflection.text persistence · no provider output ·
no hidden reasoning · no secret material · no delivery ids/artifacts · no eventRecordIds · no AthleteDecision ·
no Evidence / ObservationSet / Signal creation · no Garmin parsing · no delivery · no live-provider default ·
no process environment reads · run only via invokeOperatorSession · persist only OperatorSessionEnvelope ·
AC20 unchanged · the layer stays out of src/modules; the core never imports it.
```

---

## 8. Implementation Slicing

```text
043-E1 — Async Persistence Contract Migration (next). Convert the four repository ports + RowStoreClient +
         BlobStoreClient to Promise-based APIs; convert the in-memory repositories + fake row/blob clients to
         async (deterministic, isolated); make runOperatorSession await repository calls; update all operator-runtime
         tests to await. Keep every guard green. NO dependency, NO package change, NO Postgres/S3 adapter, NO SQL.
043-D2-R — Postgres-Compatible Row-Store Adapter (the renamed/re-based D2), now implementing the ASYNC RowStoreClient,
         with explicit dependency approval + the scoped one-file guard token-pin + plain .sql schema-change files.
043-D3  — S3-compatible blob-store adapter against the async BlobStoreClient (separate dependency approval).
043-D4  — injected runtime config boundary. 043-D5 — opt-in integration tests + out-of-`src` deployment wiring.
```
**Next mission = 043-E1.** D2 is renamed **043-D2-R** and is unblocked only after E1.

---

## 9. Acceptance Criteria (Given / When / Then)

```text
G: real Postgres I/O is async   · W: Aurora defines row-store persistence contracts
                                  · T: row-store operations are Promise-based (insert/get/list/findBy).
G: repositories may be DB-backed · W: repository ports are defined
                                  · T: save/find/list operations are Promise-based on all four repositories.
G: in-memory repos are test fakes· W: converted to async
                                  · T: they remain deterministic and isolated per instance (resolved Promises, structuredClone).
G: run service coordinates persistence · W: persistence is async
                                  · T: it awaits repository calls and still calls invokeOperatorSession ONLY through the seam.
G: envelope persistence occurs   · W: the async migration is complete
                                  · T: only OperatorSessionEnvelope-safe data is stored (no raw outcome / unsafe field).
G: blob storage is async         · W: BlobStoreClient is converted
                                  · T: payloads remain opaque (never parsed) and round-trip unchanged via async get/put.
G: mappers perform no I/O        · W: the boundary goes async
                                  · T: record/artifact mappers remain pure + synchronous (only ports/clients are async).
G: D2 is blocked                 · W: this spec completes
                                  · T: no dependency is installed and package.json/package-lock.json are unchanged until E1 lands.
```

---

## 10. Forbidden (this spec and until each later slice approves its scope)

```text
implementation code · package dependency changes · package-lock changes · Postgres adapter implementation ·
S3/object-storage adapter implementation · migrations · SQL · filesystem persistence · network integration tests ·
testcontainers · API/UI/CLI/worker/deployment · Dockerfile/IaC · process environment reads · secret manager ·
live-provider default · delivery channel · automatic AthleteDecision · Garmin parser · AC20 amendment ·
reflection-composition · fake synchronous wrapper over async I/O
```

---

## 11. Relationship To Existing Architecture

- **Spec 043 / 043C / 043D** — cloud/persistence direction + the C/D slicing stand; 043D's dependency approval is
  **deferred to 043-D2-R** (after E1); 043D's implicit "sync port is adapter-ready" assumption is **superseded**.
- **C1/C2/C3** — ports, store clients, fakes, and the run service are exactly what E1 converts to async; the
  whitelist mappers and record factories stay pure/sync.
- **`operator-runtime-negative-capability` guard** — unchanged; E1 keeps it green and adds no DB/SDK token (the
  scoped token-pin still belongs to D2-R/D3, tied to the dependency approval).
- **AC20 / Spec 034R** — unchanged; the layer composes no core and stays invisible to AC20a/AC20b.

## 12. Validation & invariants at this note

`tsc --noEmit` clean; `node --test` **896/896**; working tree clean. No code/test/package/lockfile/tsconfig/guard
change; no dependency installed; AC20 untouched. The contract shape is re-decided to **async**; the concrete
Postgres adapter + first dependency are **deferred to 043-D2-R**, after the **043-E1** async migration.

```text
sync fake ≠ real store contract · async I/O ≠ sync facade · re-decision ≠ abandonment · contract fix ≠ dependency install ·
async migration preserves every redaction invariant · persist only OperatorSessionEnvelope · run only via invokeOperatorSession ·
Aurora advises, the athlete decides; Aurora never presents inference as fact.
```
