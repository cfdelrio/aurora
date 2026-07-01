# Aurora — Specification 043B — Operator Runtime Persistence Home & Boundary

> **Status (2026-06-30).** Specification phase. This document decides **where** cloud/operator-runtime persistence
> may live, after Implementation 043-A1 hit a real architectural blocker (Spec 043A-R). It is **behavioral-only**:
> it implements no code, writes no technical spec for code, adds no infrastructure / Dockerfile / IaC / migration /
> API/UI/CLI / persistence ports / object-storage adapters / dependency, edits no package or tsconfig file, adds no
> new `src/modules/*` module, weakens no guard, **does not amend AC20**, and revives no `reflection-composition`.
> Base: dev branch from merged `main`; `tsc --noEmit` clean; `node --test` **852/852**. It supersedes Tech Spec
> 043A's *placement* only; Spec 043's cloud/persistence *direction* stands.

---

## 0. Phase confirmation

This is the **Specification** phase — a boundary/home decision, not Implementation and not yet a code tech spec.

---

## 1. Context

`[FACT]` Spec 043 (re-entry from hold, evidence = "run Aurora in the cloud on real Garmin/manual sessions,
retained across runs") chose a minimal cloud operator runtime + persistence direction. Tech Spec 043A sliced it
and placed persistence ports in `application-orchestration/application/`. **Implementation 043-A1 was blocked and
reverted** (Spec 043A-R): that placement violates `application-orchestration`'s guarded invariant, and there is no
AC20-safe home for these repositories inside the existing `src/modules/` core. This spec answers the open question:
**where can operator-runtime persistence live?**

---

## 2. Central Question

> What is the correct **home** for cloud/operator-runtime persistence, given that `application-orchestration`
> cannot own repositories, `event-recording` is not a generic persistence home, and AC20a forbids a new top-level
> production module?

The home must keep these distinctions legible (never collapse):

```text
persistence home ≠ domain module · persistence home ≠ application-orchestration · persistence home ≠ event-recording by default ·
persistence home ≠ production whole-core composer · runtime persistence ≠ Evidence · training session record ≠ ObservationSet ·
OperatorSessionEnvelope record ≠ delivery artifact · DecisionCaptureLink ≠ AthleteDecision ·
deployment layer ≠ bounded domain module · out-of-src runtime layer ≠ AC20 top-level module · AC20 amendment ≠ casual refactor
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."* A persistence/runtime layer must not turn stored records into
truth, a Garmin file into Evidence, an envelope into delivery, or operator execution into an athlete decision.

---

## 4. Required Analysis

1. **Why 043-A1 failed.** It placed persistence repositories in `application-orchestration/application/`, which is
   a **composition-only** module forbidden from owning repositories/persistence.
2. **Which guard caught it.** `explicit-orchestration-negative-capability.test.ts` →
   *"orchestration owns no domain model and no repository (application-only)"* (fails any app-orch production file
   defining a repository implementation).
3. **Why `application-orchestration` cannot own repositories.** By design + guard, it is *pure application
   composition*: it wires existing public services over injected collaborators and returns closed results; it owns
   no domain model, no repository, no persistence, no bounded context. Persistence is a stateful bounded context it
   must not absorb.
4. **Why `event-recording` is not automatically the right home.** It owns one bounded context — append-only
   **domain occurrence events** (`DomainEventRecord`). Training-session metadata / operator-run / envelope records
   are **operational/runtime** persistence, not domain events; hosting them there stretches it into a generic
   datastore (bounded-context erosion).
5. **Why test-only adapters do not solve production placement.** They would hide the unresolved production home in
   tests; the future cloud worker + DB/object-storage adapters still need a real production home.
6. **Why a new `src/modules/*` persistence module violates AC20a.** AC20a allowlists exactly nine top-level
   production modules + `__tests__`; a tenth requires an **explicit, separately-approved AC20a amendment** — not a
   side effect of this spec.
7. **Why AC20b still forbids production whole-core composition.** No production file may import all four core
   surfaces. A persistence home must import **zero** core surfaces (it touches no `observation`/`reasoning`/
   `understanding`/`decision-support`), so it does not threaten AC20b — but it must never become a place that
   composes the core.
8. **What the persistence home must own.** Operational **records + repositories**: `TrainingSessionRecord`,
   `TrainingSessionRawArtifactRef`, `OperatorSessionRunRecord`, `OperatorSessionEnvelopeRecord`,
   `DecisionCaptureLink` (§Required Record Ownership), plus (later) DB/object-storage adapters.
9. **What the persistence home must not own.** Domain models, Evidence, `ObservationSet`s, the raw
   `OfflineReflectionRuntimeOutcome`, `AthleteDecision`s, a whole-core composer, or any core-domain logic.
10. **What records need a home.** The five operational records above (training-session metadata + raw-artifact
    ref + run + envelope + decision-capture link).
11. **What can remain in core public surfaces.** The **invocation chain** stays in the core, unchanged:
    `invokeOperatorSession` + `OperatorSessionEnvelope` (+ the runtime/mapper) in `application-orchestration`. The
    home **consumes** these; it adds nothing to the core.
12. **What should sit outside `src/modules/`.** The persistence/runtime layer — records, repositories, the future
    worker, and DB/object-storage adapters — exactly as `scripts/operator-live-smoke.mjs` lives **outside `src`**
    and consumes Aurora's public surface.
13. **How out-of-`src` code can import public surfaces safely.** Aurora's public application surface
    (`src/modules/application-orchestration/index.ts` → `invokeOperatorSession`, `OperatorSessionEnvelope`,
    types) is importable from an out-of-`src` layer the same way the operator smoke imports rendering's public
    surface; the import is one-directional (home → core public surface), never the reverse. No core module imports
    the home.
14. **How typechecking/testing would work for an out-of-`src` home.** Two viable patterns (decided in 043C): (a)
    extend `tsconfig`/test glob to include the out-of-`src` path (a `tsconfig`/test-config change — its own
    decision); or (b) the 027 split: a typechecked in-`src` *pure helper* + an out-of-`src` executable. 043B does
    **not** change tsconfig; 043C decides the strategy.
15. **Whether package/tsconfig changes would be needed later.** Possibly (to typecheck/test the out-of-`src`
    layer) — a **deliberate** change in 043C, not now.
16. **Whether an AC20 amendment is justified now.** **No.** The out-of-`src` home preserves AC20 entirely; an
    amendment is unnecessary for the current need.
17. **Whether a separate AC20 amendment spec is required if selected.** Only if the alternative (a new
    `src/modules/*` persistence module) were ever chosen — that would require its **own** amendment spec with risk
    review. This spec does **not** select that path.
18. **How future cloud runtime stays behind `invokeOperatorSession`.** The home's worker calls
    `invokeOperatorSession` (never `offlineReflectionRuntime` directly) and persists only the returned envelope.
19. **How only `OperatorSessionEnvelope` is persisted.** The `OperatorSessionEnvelopeRecord` stores the safe
    envelope (already redacted by Impl 040-A); the raw outcome is never returned by the helper, so it cannot be
    stored.
20. **What remains deferred.** All code/adapters/worker/deployment, the typecheck/test strategy, the concrete
    out-of-`src` path, DB/object-store products, and intake parsing — to Tech Spec 043C and its slices.

`[FACT]` Decisive consequence: operator-runtime persistence is a **deployment/runtime concern that consumes
Aurora's core, not part of it**. Its correct home is **outside `src/modules/`**, importing only the public
application surface — which keeps `application-orchestration` composition-only, `event-recording` bounded, AC20
fully intact, and the raw outcome unreachable. This is the same shape already proven by `scripts/`: out-of-`src`
code that consumes the public surface without expanding the AC20-governed core.

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — `application-orchestration` owns persistence ports/repositories | **Rejected.** Guarded against (043A-R §2–§4). |
| B — `event-recording` owns operator-runtime persistence | **Rejected.** Records are operational, not domain events; stretches its bounded context. |
| C — Test-only persistence adapters under `tests/` only | **Rejected.** Hides the production-placement decision. |
| D — New top-level `src/modules/operator-runtime` (or `persistence`) module via AC20 amendment | **Rejected now (not forever).** A legitimate eventual candidate, but requires a **separately-approved AC20a amendment** with risk review; unnecessary while Option E preserves AC20. |
| **E — Out-of-`src` deployment/runtime persistence layer importing only public application surfaces** | **Selected.** Preserves AC20a + AC20b + every guard; keeps app-orch composition-only and event-recording bounded; mirrors the proven `scripts/` shape. |
| F — Postpone persistence, stay manual/no storage | **Rejected.** Cloud persistence is a real Spec-043 need (retain sessions across runs). |
| G — Object storage only, no repository home | **Rejected.** Metadata/querying/session linkage need a record home, not just blobs. |
| H — External managed service / manual DB outside the repo | **Rejected as the *home decision*.** A managed DB may later sit *behind* the home's adapters, but the **home** (records/ports/worker) must still be a defined layer in-repo. |

---

## 6. Decision

`[DECISION]` **Operator-runtime persistence home = an out-of-`src` deployment/runtime layer (Option E).**
Persistence for cloud operator-runtime records belongs in a layer **outside `src/modules/`** that **imports only
Aurora's public application surface** — especially `invokeOperatorSession` and `OperatorSessionEnvelope`.
`src/modules/` remains the domain/application core; `application-orchestration` remains composition-only;
`event-recording` remains event-recording; **AC20 remains unchanged**. **No code is added now.** A future
implementation may create that out-of-`src` layer **only after Tech Spec 043C** defines its typecheck/test/package
boundary and import-guard.

**Why out-of-`src` is the home.** Operator-runtime persistence *consumes* Aurora's core; it is deployment/runtime
infrastructure, not a bounded domain. The proven precedent is `scripts/operator-live-smoke.mjs`: out-of-`src` code
that imports the public surface without expanding the core.

**Why this preserves AC20a.** It creates **no** new `src/modules/*` top-level module; the nine-module allowlist is
untouched.

**Why this preserves AC20b.** The layer imports **zero** core surfaces (only the public application surface +
shared-kernel types); it composes no core and cannot own the whole core.

**Why app-orch stays clean.** The core keeps only the invocation chain (`invokeOperatorSession`, the mapper, the
runtime); no repository/persistence enters `application-orchestration`.

**Why event-recording stays bounded.** Operational records live in the out-of-`src` home, not in the
domain-event module.

**What records this layer owns.** `TrainingSessionRecord`, `TrainingSessionRawArtifactRef`,
`OperatorSessionRunRecord`, `OperatorSessionEnvelopeRecord`, `DecisionCaptureLink` (§Required Record Ownership).

**What it imports.** Only Aurora's **public application surface** (`invokeOperatorSession`,
`OperatorSessionEnvelope`, related public types) + shared-kernel types. **What it may not import.**
`offlineReflectionRuntime` directly; any upstream core module (`observation`/`reasoning`/`understanding`/
`decision-support`/`athlete`); any internal (non-index) core file.

**How it calls `invokeOperatorSession`.** The home's worker assembles the command (with a **caller-supplied**
`RenderingRequest` — deriving it from Garmin is a *separate deferred AC20-safe composition lane*, not here),
injects deterministic deps by default, calls `invokeOperatorSession`, and stores the result.

**How it stores `OperatorSessionEnvelope` only.** `OperatorSessionEnvelopeRecord` wraps the safe envelope; the raw
`OfflineReflectionRuntimeOutcome` is never returned by the helper and never stored.

**How DB/object-storage adapters fit later.** They implement the home's repository/object-store **ports**, live in
the same out-of-`src` home, and stay outside the core (no AC20 impact). Concrete products (Postgres/S3) are 043C+.

**Why no code is added now.** The home is a *boundary decision*; its typecheck/test/package strategy and concrete
shape are 043C's to define before any implementation.

**What the next technical spec must decide.** The exact out-of-`src` path; whether `tsconfig`/test-glob include
it (and how it is typechecked/tested); the port/repository + in-memory-adapter placement within the home; the
import-boundary guard (home → public surface only); the DB/object-storage adapter placement; the local/dev
equivalent; and deployment packaging. (`Tech Spec 043C`.)

`[ASSUMPTION]` The headline: **operator-runtime persistence lives outside the AC20-governed core, consuming
Aurora's public surface — not inside it.** This keeps `application-orchestration` composition-only,
`event-recording` bounded, and AC20 intact, while giving cloud persistence a real production home. *Aurora
advises; the athlete decides.*

---

## 7. Required Boundary Definition (out-of-`src` home — conceptual)

```text
outside src/modules · not a core module · not a domain module · not application-orchestration · not event-recording ·
not reflection-composition · imports ONLY public application surfaces · calls invokeOperatorSession, not offlineReflectionRuntime ·
persists OperatorSessionEnvelope, not the raw runtime outcome · stores training-session metadata as operational records, not Evidence ·
stores raw artifact REFS, not parsed truth · keeps delivery withheld · creates no AthleteDecision
```

**Possible future locations (for Tech Spec 043C to evaluate — not chosen here):** `runtime/operator/`,
`apps/operator-runtime/`, `tools/operator-runtime/` (repo-root, outside `src`), or — only if 043C justifies an
in-`src`-but-out-of-`modules` path — `src/operator-runtime/` (note: `src/operator-runtime/` is **not** a
`src/modules/*` module, so it is outside AC20a's module allowlist, but 043C must confirm it does not collide with
the orchestration guard's forbidden `src/{api,infrastructure,db,database,migrations}` list and define its
typecheck/test inclusion). **No path is chosen in this spec.**

---

## 8. Required Record Ownership

Each record is an **operational/persistence record — not domain truth, not Evidence**; preserves provenance; never
becomes an `ObservationSet`; never contains the raw runtime outcome; never contains an `AthleteDecision`.

| Record | It is | It is NOT |
| --- | --- | --- |
| `TrainingSessionRecord` | operational metadata (athleteRef, sourceKind, occasion?, occurredAt?, artifact refs, reporter, createdAt) | Evidence · ObservationSet · truth |
| `TrainingSessionRawArtifactRef` | an opaque object-storage handle + provenance (contentType, sourceKind, uploadedAt) | parsed content · truth · Evidence |
| `OperatorSessionRunRecord` | a record that one run happened (refs, operatorRef marker, safe status code, timing) | raw outcome · provider output · delivery · AthleteDecision |
| `OperatorSessionEnvelopeRecord` | the persisted safe `OperatorSessionEnvelope` (+ refs, createdAt) | the raw `OfflineReflectionRuntimeOutcome` · reflection.text · a delivered artifact |
| `DecisionCaptureLink` | the envelope's decision-capture invitation/ref tied to the run/session | an `AthleteDecision` · a decision source · inferred behavior |

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Runtime persistence home.** *Given* `application-orchestration` cannot own repositories, *when*
operator-runtime persistence is needed, *then* the home **must not** be inside `application-orchestration`.

**UC2 — AC20 preservation.** *Given* AC20a forbids new top-level core modules, *when* a home is selected, *then*
it **must not** create a new `src/modules/*` module unless a separate AC20 amendment is approved (not selected
here).

**UC3 — Out-of-`src` runtime layer.** *Given* an out-of-`src` layer imports only public surfaces, *when* it runs a
session, *then* it calls `invokeOperatorSession` and persists **only** `OperatorSessionEnvelope`.

**UC4 — Event-recording boundary.** *Given* operator-run records are operational, *when* a home is selected,
*then* `event-recording` is **not** expanded into generic persistence unless a separate event-recording spec proves
the fit.

**UC5 — No raw outcome.** *Given* a run completes, *when* persistence occurs, *then* the raw
`OfflineReflectionRuntimeOutcome` is **never** stored.

**UC6 — No athlete decision.** *Given* an envelope contains a decision-capture invitation/ref, *when* persisted,
*then* **no** `AthleteDecision` is created.

**UC7 — No whole-core composition.** *Given* runtime persistence exists, *when* command assembly occurs, *then* it
**must not** introduce a production whole-core composer (renderable stays caller-supplied).

**UC8 — Future DB/S3.** *Given* DB/object-storage adapters are implemented later, *when* added, *then* they live
in the selected out-of-`src` home and remain outside the core (no AC20 impact).

---

## 10. Required Acceptance Criteria (Given / When / Then)

- `application-orchestration` does not own repositories. ✅
- `event-recording` is not generic persistence. ✅
- Test-only adapters are insufficient as production placement. ✅
- A new `src/modules/*` persistence home requires an AC20 amendment (not selected here). ✅
- An out-of-`src` runtime layer can preserve AC20. ✅
- Future persistence sits behind `invokeOperatorSession`. ✅
- Future persistence stores `OperatorSessionEnvelope` only. ✅
- Future persistence never stores the raw outcome. ✅
- Future persistence never stores an `AthleteDecision`. ✅
- Training-session records are operational records, not Evidence. ✅
- Garmin artifacts are provenance, not truth. ✅
- Future DB/S3 work requires a tech spec (043C). ✅
- No code/package/test/tsconfig changes in this spec. ✅
- AC20 unchanged; no guard weakened. ✅
- All existing tests remain green (852/852). ✅

---

## 11. Relationship To Existing Architecture

- **Spec 043** — cloud runtime + training-session persistence *direction* (stands).
- **Tech Spec 043A** — original sliced plan; its *placement* is **superseded**.
- **Spec 043A-R** — the blocker note that triggered this home decision.
- **Spec 042** — the persistence + provider/deployment lanes remain entered; only the home was open.
- **Spec 041 / Impl 041-A** — `invokeOperatorSession`, the home's only processing seam.
- **Spec 040 / Impl 040-A** — `OperatorSessionEnvelope`, the only persisted result.
- **Spec 038 / Impl 038-A** — the operator runbook the home's worker automates minimally.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the home composes no core.
- **`scripts/operator-live-smoke.mjs`** — the precedent: out-of-`src` code consuming the public surface.

---

## 12. Forbidden Behaviors

```text
implementation code · technical implementation plan · DB migrations · object storage adapters · Dockerfile · IaC ·
package changes · tsconfig changes · CLI/script creation · API/UI creation · automatic Garmin integration ·
provider/live default · delivery channel · automatic AthleteDecision · auth/session/user implementation ·
AC20 amendment inside this spec · reflection-composition module · production whole-core composer ·
new src/modules persistence module without a separate AC20 amendment · application-orchestration repository ownership ·
event-recording generic-persistence expansion · raw runtime outcome persistence
```

---

## 13. Open Questions For Tech Spec 043C

1. Exact out-of-`src` path.
2. Whether `tsconfig`/test glob must include that path (and how).
3. Whether package scripts stay unchanged or a future executable is required.
4. Exact port/repository type placement within the home.
5. Exact in-memory adapter placement.
6. Exact DB adapter placement.
7. Exact object-storage adapter placement.
8. Exact local/dev equivalent.
9. Exact test strategy for the out-of-`src` runtime layer.
10. Exact import-boundary guard (home → public surface only).
11. Exact deployment packaging.
12. Exact migration strategy if Postgres is selected.

---

## 14. Success Criteria

Can Aurora decide the home for operator-runtime persistence — **an out-of-`src` deployment/runtime layer that
imports only Aurora's public application surface, runs sessions behind `invokeOperatorSession`, and persists only
`OperatorSessionEnvelope`** — keeping `application-orchestration` composition-only, `event-recording` bounded, and
**AC20 unchanged**, **without** building code/infra, stretching a bounded context, hiding placement in tests, or
amending AC20? **Yes — via Option E:** persistence is deployment/runtime that *consumes* the core, not part of it;
its concrete shape + typecheck/test/package boundary are deferred to **Tech Spec 043C**. Validation at authorship:
`tsc --noEmit` clean; `node --test` 852/852; no code, infra, migration, package, tsconfig, or dependency change;
no guard weakened; AC20 untouched.
