# Aurora — Specification 043 — Cloud Operator Runtime & Training Session Persistence Boundary

> **Status (2026-06-30).** Specification phase. This document defines the **behavioral boundary** for Aurora's
> **first cloud operator runtime** and **training-session persistence** — the re-entry from `stable/hold` unlocked
> by the post-042 gate now that real-caller / runtime evidence exists ("run Aurora in the cloud with real Garmin/
> manual training sessions"). It is **behavioral-only**: it implements no code, creates no infrastructure, adds no
> Terraform/CDK/IaC, no Dockerfile, no API/UI/CLI, no DB migration, no dependency, no provider/live integration,
> no delivery integration; it edits no package file, amends no guard (AC20 untouched), and creates no production
> whole-core composer. Base: `main` stable at `7ebef4b` (PR #7 merged); `tsc --noEmit` clean; `node --test`
> **852/852**. Re-entry trigger (per Spec 042 §7): **persistence lane** (retain/audit training sessions across
> runs) **+ provider/deployment lane** (a real cloud runtime target).

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a boundary and a
first cloud *shape*; it builds no code and stands up no infrastructure.

---

## 1. Context

`[FACT]` Aurora has a complete, safe invocation chain in production: `invokeOperatorSession(command, deps)` →
`offlineReflectionRuntime` (admission-gated, `validateDraft` downstream, delivery withheld) →
`toOperatorSessionEnvelope` → **`OperatorSessionEnvelope` only**. Spec 042 put every surface/integration lane
behind an explicit per-lane evidence gate; the roadmap was on a deliberate hold.

`[FACT]` **New evidence (the re-entry trigger):** *"Aurora must stop living only as a repo and run real operator
sessions in the cloud, starting from Garmin/manual training exports, with sessions retained across runs."* This
meets **two** Spec 042 §7 thresholds: the **persistence/event lane** (retain/audit/multi-session need beyond the
in-memory/test harnesses) and the **provider/deployment lane** (a real deployment/runtime-target signal). It does
**not** meet the API/UI lane (no identified remote/sessionful product user yet), the live-provider lane (no live
opt-in need), the delivery lane (no athlete-consented channel), or the AC20-amendment lane.

`[GAP]` Aurora has **no** cloud runtime, database, object storage, training-session intake, operator entrypoint,
or session persistence. Spec 043 fixes the **minimum** cloud + persistence boundary required to run real operator
sessions from training data — **without** prematurely becoming SaaS/UI/API/public-delivery/live-provider.

---

## 2. Central Question

> What is the **minimum** cloud runtime and persistence boundary required for Aurora to run real operator sessions
> from training data, while preserving `invokeOperatorSession`, `OperatorSessionEnvelope`, no-default-live-call,
> delivery-withheld, athlete-decision-ownership, and AC20?

The first cloud shape must keep these distinctions legible (never collapse):

```text
cloud runtime ≠ public API · cloud runtime ≠ SaaS · cloud runtime ≠ athlete UI ·
cloud runtime ≠ automatic Garmin integration · cloud runtime ≠ live-provider default · cloud runtime ≠ automatic delivery ·
cloud runtime ≠ AthleteDecision capture · cloud runtime ≠ production whole-core composition ·
database record ≠ truth · training session ≠ Evidence · Garmin file ≠ truth · operator run ≠ athlete decision ·
OperatorSessionEnvelope ≠ delivered artifact
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."*

The cloud runtime must **not** convert stored data into truth, inference into fact, an envelope into delivery, or
operator execution into an athlete decision. A Garmin file is a **raw artifact with provenance**, not Evidence; a
DB row is a **record**, not truth.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **What needs to run in cloud.** A **non-public operator runtime** that, given a stored training session,
   assembles a command + deterministic deps and calls `invokeOperatorSession`, then stores the returned
   `OperatorSessionEnvelope`. That is the whole job — no public surface.
2. **Who/what calls `invokeOperatorSession`.** A **cloud operator worker/run** (internal, operator-triggered) —
   **never** a public API/UI, and **never** `offlineReflectionRuntime` directly. The worker is a *caller behind
   the helper* in the Spec 042 sense.
3. **How training sessions enter.** As **manual/exported artifacts** the operator uploads/places into object
   storage (a FIT/TCX/CSV Garmin export, or a manual JSON/summary). **Not** an automatic Garmin API pull.
4. **Garmin: manual export, file upload, or automatic integration?** **Manual export / file upload first.**
   Automatic Garmin API integration is **deferred** (its own evidence + spec) — it adds OAuth/rate-limit/privacy
   surface unjustified by the current need.
5. **What raw data is stored.** The **raw training artifact** (the uploaded Garmin/manual file) in object storage,
   keyed with **provenance** (source, upload time, a minimal athlete ref) — stored as opaque bytes, **never**
   interpreted as truth/Evidence at rest.
6. **What normalized data is stored.** A **minimal metadata record** of the training session (athlete ref, source
   kind, artifact handle, occasion/occurred-at if known) — *references and provenance only*, not derived meaning.
   (Whether to also persist a normalized `ObservationPack` is deferred to 043A; the boundary permits a
   manual/observation pack record but does not require pre-deriving meaning.)
7. **What `OperatorSessionEnvelope` data is stored.** The **safe envelope** returned by `invokeOperatorSession`
   (status, `deliveryWithheld`, `rawRetained: false`, `reflectionRef?`+flags, decision-capture invitation/ref,
   `admissionReason?`/`safeReason?`, `intakeStatus`, `mediation`, ref-only `traceSummary`) — i.e. a persisted
   `OperatorSessionEnvelopeRecord`. It is **already redacted by construction**; persistence stores **only** the
   envelope, **never** the raw `OfflineReflectionRuntimeOutcome`.
8. **What is NOT stored.** Raw provider output, hidden reasoning, secrets, delivery artifacts/ids, `eventRecordIds`
   as delivery proof, `reflection.text` as a delivered message, any `AthleteDecision` not explicitly declared/
   reported, and any "truth"/Evidence derived from a Garmin file at rest.
9. **How athlete identity is represented minimally.** A **safe opaque `athleteRef` string** (as today) — **no**
   auth/user/account system, no PII beyond what the operator supplies; identity is a reference, not a user record.
10. **How decisions remain separate.** The runtime **creates no `AthleteDecision`**; the envelope carries only the
    decision-capture invitation/ref. A captured decision (athlete-declared/reported) is a **separate** later flow
    (Impl 037-A) and a **separate** record (`AthleteDecisionRecord`), only if/when the athlete declares/reports.
11. **What object storage is needed.** Yes — for the **raw training artifacts** (binary Garmin/manual exports).
    Provenance-keyed; opaque at rest. (Concrete product — S3/GCS/etc — deferred to 043A; the *direction* is
    object storage.)
12. **What database is needed.** Yes — for **metadata/records** (training-session metadata, operator-session-run
    records, envelope records, decision-capture refs). Relational fits the referential, append-leaning shape.
13. **Is Postgres justified now?** **As the baseline direction, yes** — referential metadata + auditability +
    multi-session retention (the §042 persistence threshold). The **exact** engine (Postgres vs SQLite for a first
    single-node start) is **deferred to 043A**; the boundary requires *a relational metadata store*, not a
    specific product.
14. **Is S3/object storage justified now?** **As the direction, yes** — raw artifacts are binary and don't belong
    in a relational row. Exact product deferred to 043A.
15. **EC2 / ECS / Fargate / Lambda / App Runner?** **Deferred (final target) to 043A.** The boundary requires a
    **non-public, operator-triggered runtime** (a worker/job process), **not** a long-running public server. A
    simple single-process worker (e.g. a container/VM run, or a job runner) fits; the binding choice is 043A's.
16. **Is an API required now?** **No.** No identified remote/sessionful product user (API/UI lane not met). The
    runtime is operator-triggered/internal.
17. **Is a CLI/script required now?** **No** as a product surface; an operator entrypoint may be a thin internal
    runner **behind** `invokeOperatorSession`, but its exact form (script/worker) is 043A's, and it must meet the
    §042 CLI-lane discipline (offline, behind the helper, no package-script unless justified).
18. **Is auth/session/user system required now?** **No.** A safe `athleteRef` string suffices; auth/session is its
    own deferred lane (needs the API/UI evidence it lacks).
19. **Is live-provider secret resolution required now?** **No.** Deterministic fakes remain default;
    no-default-live-call holds. A deployment **may** wire a secret manager for config, but **not** to enable live
    calls by default (the live-provider lane is unmet).
20. **What remains explicitly deferred.** Public API/UI/SaaS; automatic Garmin integration; live-provider/delivery;
    auth/user/session; the exact cloud target / DB / object-store products; the schema; automatic decision capture;
    production whole-core composition (AC20). All to 043A or later, each behind its own §042 threshold.

`[FACT]` Decisive consequence: the cloud need is satisfied by a **thin operator runtime + a persistence seam
around `invokeOperatorSession`** — store the raw artifact (provenance, opaque), run the session behind the helper,
store the envelope. No public surface, no live calls, no delivery, no decision creation, no whole-core
composition. The cloud is a *place to run the existing safe loop*, not a new product.

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — Stay manual/local, no cloud | **Rejected.** The new evidence is precisely cloud operation + retained sessions. |
| B — Cloud storage only (object store + run elsewhere) | **Rejected as the whole answer.** We need session-run + envelope **persistence**, not just file storage. |
| **C — Cloud DB + object storage + operator worker/runtime, no public API** | **Selected.** The minimum cloud operator runtime: store raw artifact + metadata, run behind `invokeOperatorSession`, store the envelope; no public surface. |
| D — Cloud DB + object storage + **internal API** behind the helper | **Deferred.** An internal API is a surface the current evidence does not require; revisit if a remote/sessionful caller appears (§042 API/UI lane). |
| E — EC2 simple Node process + Postgres + S3 | **Candidate concrete shape (deferred to 043A)** — a reasonable *simplest* first target; not bound here. |
| F — Docker + ECS/Fargate + Postgres + S3 | **Candidate concrete shape (deferred to 043A)** — fits a container worker; not bound here. |
| G — Lambda/job runner + Postgres/S3 | **Candidate concrete shape (deferred to 043A)** — fits operator-triggered jobs; not bound here. |
| H — Full API/UI/SaaS now | **Rejected.** Premature product surface; §042 API/UI lane unmet. |
| I — Automatic Garmin integration now | **Rejected.** Adds OAuth/rate-limit/privacy surface unjustified by current need; intake starts manual/export. |
| J — Provider/deployment/live-delivery bundle now | **Rejected.** Live-provider + delivery lanes remain unmet/deferred. |

---

## 6. Required Decision Areas

### 6.1 Cloud runtime target → **a non-public, operator-triggered worker/runtime; concrete target deferred to 043A**
The boundary requires an **internal worker/job runtime** (not a public long-running server). Candidate concrete
targets — **EC2-simple**, **Docker on EC2**, **ECS/Fargate**, **Lambda/job runner**, or a managed runner
(App Runner/Render/Railway/Fly.io) — are **deferred to Tech Spec 043A**, which picks the simplest target meeting:
operator-triggered, offline by default, behind `invokeOperatorSession`, no public ingress required.

### 6.2 Persistence model → **relational metadata store + object storage for raw artifacts**
Baseline direction: **a relational DB (Postgres baseline; SQLite acceptable for a first single-node start —
043A decides)** for metadata/records + **object storage (S3-direction)** for raw Garmin/manual artifacts. Not
files-only; not object-store-only (we need queryable session/envelope history).

### 6.3 Training session intake → **manual / exported artifacts first**
First supported intake: **manual upload of a Garmin export (FIT/TCX/CSV) or a manual JSON/summary**, stored as a
raw artifact with provenance. **Automatic Garmin API integration is deferred** (own evidence + spec). Exact
first-supported formats deferred to 043A.

### 6.4 Minimal records (conceptual; no schema here) → defined
Conceptual records the boundary permits (schema deferred to 043A):
```text
AthleteRef                      — safe opaque reference string (no auth/user system)
TrainingSession                 — metadata: athleteRef, source kind, occasion/occurredAt?, artifact handle, provenance
TrainingSessionRawArtifact      — the raw Garmin/manual file in object storage, provenance-keyed, opaque at rest
ManualObservationPack           — (optional) a normalized observation pack the caller assembles; not pre-derived truth
OperatorSessionRun              — a record that invokeOperatorSession was run (refs, timing, operator marker)
OperatorSessionEnvelopeRecord   — the persisted OperatorSessionEnvelope (safe, redacted; never the raw outcome)
DecisionCaptureRef              — the envelope's decision-capture invitation/ref (an invitation, not a decision)
AthleteDecisionRecord           — ONLY if the athlete later declares/reports a decision (separate Impl 037-A flow)
```

### 6.5 Entry point → **anything that runs a session sits behind `invokeOperatorSession`**
The cloud entry point (operator-triggered worker/run) **must** call `invokeOperatorSession` and receive **only**
`OperatorSessionEnvelope`. **No caller may call `offlineReflectionRuntime` directly.** Exact entrypoint form
(worker/job/internal runner) deferred to 043A; no public API.

### 6.6 Secrets / live provider → **deterministic fakes by default; no live by default**
Deterministic fake deps remain the default in the cloud runtime. A deployment **may** use a secret manager for
*config* (e.g. DB/object-store credentials), but **not** to enable a live provider by default — the live-provider
lane (§042) is unmet. No `process.env` read inside the core/runtime beyond the existing approved adapter.

### 6.7 Delivery → **withheld; no channel; manual operator review**
`deliveryWithheld` stays `true`; **no** automatic delivery channel is added; the operator reviews the persisted
envelope manually. The delivery lane (§042) remains deferred.

### 6.8 Athlete decision → **none automatic; separate; athlete-declared/reported only**
The runtime creates **no** `AthleteDecision`. The envelope persists only the decision-capture invitation/ref.
Later capture is the **separate** athlete-declared/reported flow (Impl 037-A), recorded as its own record.

---

## 7. Decision

`[DECISION]` **First cloud runtime (Option C): a minimal, non-public cloud operator runtime + training-session
persistence boundary.** Aurora introduces (in a later implementation, not here) a **relational metadata store +
object storage for raw artifacts** and a **non-public, operator-triggered runtime** that: ingests a training
session as a **manual/exported artifact** stored with **provenance** (Garmin file ≠ truth), runs the session
**only behind `invokeOperatorSession`** (never `offlineReflectionRuntime` directly), and **persists the returned
`OperatorSessionEnvelope`** (and the run/refs) — with **deterministic fakes by default, delivery withheld, no
automatic `AthleteDecision`, no public API/UI, no automatic Garmin integration, no live-provider default, and no
production whole-core composition.** The **concrete cloud target, DB/object-store products, schema, intake
formats, and entrypoint form are deferred to Tech Spec 043A.**

**What this commits to now.** The *shape*: cloud = a place to run the existing safe loop; persistence = raw
artifact (object storage, provenance, opaque) + metadata/envelope records (relational); intake = manual/export;
caller = behind the helper; everything else (live/delivery/decision/whole-core) stays off.

**What this defers (to 043A or later, each behind its §042 threshold).** The exact cloud target; exact DB +
object-store products; the schema; first-supported artifact formats; the entrypoint packaging; environment/secret
config; the no-live/no-delivery wiring specifics; the local/dev equivalent; cost/risk constraints; and — as their
own lanes — automatic Garmin integration (own evidence), an internal/public API/UI (API/UI lane), live-provider
(live lane), delivery (delivery lane), auth/user/session (with API/UI), and any AC20 amendment.

`[ASSUMPTION]` The headline: **Aurora goes to the cloud as a place to run its existing safe loop on real training
data — not as a SaaS.** Store the raw Garmin/manual artifact with provenance, run it behind `invokeOperatorSession`,
persist only the redacted envelope. No public API, no automatic Garmin, no live provider, no delivery, no
auto-decision, no whole-core composition; AC20 intact. *Aurora advises; the athlete decides.*

---

## 8. Required Acceptance Criteria (Given / When / Then)

- *Given* a Garmin/exported training file, *when* it is stored, *then* it is a **raw artifact with provenance**,
  **not truth/Evidence**. ✅
- *Given* a training session record, *when* Aurora processes it, *then* it **must call `invokeOperatorSession`**
  and receive `OperatorSessionEnvelope` (never call `offlineReflectionRuntime` directly). ✅
- *Given* an `OperatorSessionEnvelope`, *when* persisted, *then* it is **not delivery** and **not an
  `AthleteDecision`**; the raw `OfflineReflectionRuntimeOutcome` is never persisted. ✅
- *Given* no live-provider opt-in, *when* a cloud run occurs, *then* **deterministic/fake deps remain default**. ✅
- *Given* no delivery channel, *when* `reflection-ready` occurs, *then* **delivery remains withheld**. ✅
- *Given* a later athlete decision, *when* captured, *then* it remains **athlete-declared/reported and separate**. ✅
- *Given* the cloud runtime exists, *when* callers are added later, *then* they **must sit behind
  `invokeOperatorSession`**. ✅
- *Given* AC20, *when* the cloud runtime is specified, *then* it **must not create production whole-core
  composition**. ✅
- *Given* this is a Specification, *when* it lands, *then* **no code/infra/migration/dependency** is added;
  validation stays **852/852**; AC20 unchanged. ✅

---

## 9. Relationship To Existing Architecture

- **Spec 042** — the gate this re-enters: the persistence + provider/deployment lanes now have evidence; other
  lanes (API/UI, live, delivery, auth, AC20) remain gated/deferred.
- **Spec 041 / Impl 041-A** — `invokeOperatorSession`, the **only** way the cloud runtime runs a session.
- **Spec 040 / Impl 040-A** — `OperatorSessionEnvelope`, the **only** thing persisted from a run.
- **Spec 038 / Impl 038-A** — the operator runbook; the cloud worker is its operator role, automated minimally.
- **Spec 037 / Impl 037-A** — decision capture stays separate; cloud persists only the invitation/ref.
- **Impl 032R-A / 035-A/B / 014** — the runtime, admission, and `validateDraft` the helper drives, unchanged.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the cloud runtime composes no core.
- **Specs 030/031** — provider/deployment: the deployment lane is now **entered** (a runtime target), but provider
  *selection* / live calls remain deferred (live lane unmet).

---

## 10. Forbidden Behaviors

```text
implementation code · DB migrations · IaC (Terraform/CDK) · Dockerfile · package changes · CLI/script creation ·
API/UI creation · automatic Garmin integration · provider/live default · delivery channel · automatic AthleteDecision ·
event/persistence implementation before the tech spec · auth/session/user implementation ·
deployment before an explicit target decision · AC20 amendment · reflection-composition module ·
production whole-core composer · calling offlineReflectionRuntime directly from a future cloud surface ·
treating Garmin as truth · treating DB rows as Evidence · treating the envelope as a delivered artifact
```

---

## 11. Open Questions For Tech Spec 043A

1. The exact cloud target (EC2-simple / Docker / ECS-Fargate / Lambda-job-runner / managed runner).
2. The exact DB choice (Postgres vs SQLite-first).
3. The exact object-storage choice (S3 / GCS / compatible).
4. The exact schema (the §6.4 records).
5. The exact training-artifact formats supported first (FIT / TCX / CSV / manual JSON).
6. The exact operator entrypoint (internal worker / job / runner — behind the helper).
7. The exact deployment packaging.
8. The exact environment / secrets configuration (config-only; no live default).
9. The exact no-live-provider default wiring.
10. The exact no-delivery behavior in cloud.
11. The exact migration strategy.
12. The exact local/dev equivalent.
13. The exact cost/risk constraints.

---

## 12. Success Criteria

Can Aurora define the **minimum cloud operator runtime + training-session persistence boundary** — a non-public,
operator-triggered runtime that stores raw Garmin/manual artifacts with provenance, runs sessions **only behind
`invokeOperatorSession`**, and persists **only** the redacted `OperatorSessionEnvelope` (+ run/refs) into a
relational metadata store, with deterministic fakes by default, delivery withheld, no automatic `AthleteDecision`,
no public API/UI, no automatic Garmin integration, no live-provider default — **without** building code/infra/
migrations and **without** an AC20 amendment? **Yes — via Option C:** the cloud is a place to run the existing safe
loop on real data, with the concrete target/DB/storage/schema/intake/entrypoint deferred to **Tech Spec 043A**.
Validation at authorship: `tsc --noEmit` clean; `node --test` 852/852; no code, infra, migration, package, or
dependency change; AC20 untouched.
