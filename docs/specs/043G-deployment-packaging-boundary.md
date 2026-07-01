# Aurora — Specification 043G — Deployment Packaging Boundary

> **Status (2026-07-01).** Specification phase, building on Impl 043-F3 (`0907200`). It is **behavioral /
> docs-only**: it implements no code, adds no Dockerfile / IaC / package script / dependency, edits no
> executable/test/package/tsconfig file, builds no API/UI/server/public endpoint/scheduler, integrates no secret
> manager, enables no live provider / delivery / Garmin integration, creates no `AthleteDecision`, introduces no
> production whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **962/962**. It
> decides the **smallest approved deployable unit** for the non-public operator runtime.

---

## 0. Phase confirmation

This is **Specification** — it decides the packaging boundary and routes the build to a next slice. No code/infra.

---

## 1. Context

`[FACT]` The operator-runtime chain is proven end-to-end (043-F3, `0907200`) with deterministic fakes:
```text
env → loadOperatorRuntimeConfigFromEnv → createOperatorRuntimePersistenceFromEnvironmentConfig (real pg/S3
clients via token-pinned factories) → repositories/artifactStore → explicit local caller module (dynamic import,
out-of-`src`) → validate request/factory/result → runOperatorSessionFromCallerModule → runOperatorSession →
invokeOperatorSession → runtime → persist only OperatorSessionEnvelope. Delivery withheld; no AthleteDecision.
```
`[FACT]` The executable `scripts/operator-runtime-executable.mjs` is the single out-of-`src` entrypoint; the
in-`src` module runner is `src/operator-runtime/deployment/operator-session-module-runner.ts`. There is **no**
package script, Dockerfile, IaC, API, UI, server, or scheduler.

---

## 2. Central distinctions (preserved throughout)

```text
deployable unit ≠ product API · container ≠ SaaS · IaC ≠ public rollout · runtime command ≠ CLI product ·
caller module ≠ remote plugin marketplace · operator execution ≠ athlete decision · deployment health ≠
recommendation quality · configured credentials ≠ live-call enabled · object-storage artifact ≠ truth ·
TrainingSessionRecord ≠ Evidence · OperatorSessionEnvelope ≠ delivered message · delivery withheld ≠ delivery
failure · Aurora advises, the athlete decides; Aurora never presents inference as fact.
```

---

## 3. Required analysis

```text
 1. Currently deployable        : a Node ESM entrypoint (scripts/operator-runtime-executable.mjs) that runs on any
                                   Node with the repo present; nothing is containerized/packaged yet.
 2. No caller-module path        : assemble config→clients→repositories/artifactStore, print the assemble-only
                                   message, run NO session, exit success.
 3. With AURORA_OPERATOR_SESSION_FACTORY_MODULE : dynamic-import that ONE explicit local module, validate the F1
                                   contract, run via runOperatorSession, persist only the safe envelope, print safe refs/status.
 4. Env keys already required     : AURORA_OPERATOR_DATABASE_URL, AURORA_OPERATOR_ARTIFACT_BUCKET (required);
                                   AURORA_OPERATOR_ARTIFACT_REGION/ENDPOINT/FORCE_PATH_STYLE (optional);
                                   AURORA_OPERATOR_SESSION_FACTORY_MODULE (optional — absent ⇒ assemble-only).
 5. Dockerfile appropriate now   : YES, minimally — a container is the smallest honest "deployable unit" proof.
 6. IaC appropriate now          : NO — no platform is chosen on evidence; IaC would pick a vendor prematurely.
 7. Package script needed        : NO — the entrypoint runs via `node scripts/operator-runtime-executable.mjs`;
                                   adding an npm script is deferred (and separately gated).
 8. Public endpoint needed       : NO — non-public operator runtime; no inbound surface.
 9. API server needed            : NO.
10. Scheduler/worker needed      : NO — run-once/on-demand; scheduler semantics are a separate, later decision.
11. Healthcheck meaning          : "process starts, validates required config, assembles clients/repositories,
                                   and exits safely" — NOT "a session ran" and NOT recommendation quality.
12. Live DB/S3 smoke by default  : NO — default packaging proof uses assemble-only (no live services). Live
                                   integration smoke is opt-in, out of the default suite, a later slice.
13. How secrets are provided     : by the runtime PLATFORM as env vars at run time (DATABASE_URL / bucket / region
                                   / endpoint); the image bakes NO secret. Source reads only the AURORA_OPERATOR_* allowlist.
14. Secret manager integration   : NO — not this slice; the platform injects env; a secret-manager adapter is separate.
15. Caller module baked or mounted : MOUNTED / provided at run time as an explicit local path — NOT baked into the image
                                   (the reference fixture is the only in-repo example, and it is a fixture, not the product).
16. Remote caller modules        : FORBIDDEN — local filesystem path only; no URL, package name, glob, or scan.
17. Live provider credentials    : NO — render-only runtime; deterministic fakes by default; live provider is separate.
18. Delivery channel credentials : NO — delivery withheld; no delivery boundary approved.
19. Garmin credentials/integration: NO — no Garmin parser/integration; artifacts stay opaque provenance.
20. Must remain manual/operator-mediated : supplying the caller module + running a session; Aurora composes no core,
                                   derives no renderable, creates no AthleteDecision, delivers nothing.
```

---

## 4. Options evaluated

| Option | Verdict |
| --- | --- |
| A — no packaging; docs checkpoint only | **Rejected as the endpoint.** The chain is proven; a minimal deployable artifact is the honest next step. |
| **B — Dockerfile only, no IaC** | **Selected.** The smallest artifact that makes the runtime *deployable* without choosing a platform, exposing a surface, or enabling live services. |
| C — Dockerfile + minimal local/container smoke runbook | **Selected (folded into B).** The Dockerfile ships with a short container smoke/runbook (assemble-only) — no live-DB/S3 default. |
| D — Dockerfile + minimal IaC skeleton | **Deferred.** IaC waits until a platform is chosen with evidence (a separate spec). |
| E — full API/server deployment | **Rejected.** No API/UI/SaaS is selected. |
| F — scheduled worker deployment | **Rejected (now).** Scheduler semantics unselected; run-once/on-demand only. |
| G — public SaaS/service deployment | **Rejected.** Non-public operator runtime. |
| H — container with live provider/delivery/Garmin credentials | **Rejected.** Those are separate boundaries; the image carries none. |

---

## 5. Required decisions

### `[DECISION]` Decision 1 — Packaging artifact → **Dockerfile + .dockerignore + a short container runbook; no npm script**
Next slice adds a `Dockerfile` (Node base, repo copied, entrypoint `node scripts/operator-runtime-executable.mjs`),
a `.dockerignore`, and a brief `docs/runbooks/` container-run note. No package script; no Docker in *this* spec.

### `[DECISION]` Decision 2 — IaC → **none yet**
No Terraform/CDK/ECS/App Runner/Batch. A platform is chosen only when there is deployment-target evidence, in its
own spec. This slice proves a runnable container, not a hosted service.

### `[DECISION]` Decision 3 — Runtime command → **`node scripts/operator-runtime-executable.mjs`**
Container entrypoint runs the existing executable. **Without** `AURORA_OPERATOR_SESSION_FACTORY_MODULE`: validate
config, assemble clients/repositories, print the assemble-only message, exit 0. With missing required config:
print only the missing key **names**, exit non-zero. With the module path: run the proven F2/F3 path.

### `[DECISION]` Decision 4 — Environment surface → **exactly the existing AURORA_OPERATOR_* allowlist**
```text
AURORA_OPERATOR_DATABASE_URL · AURORA_OPERATOR_ARTIFACT_BUCKET · AURORA_OPERATOR_ARTIFACT_REGION ·
AURORA_OPERATOR_ARTIFACT_ENDPOINT · AURORA_OPERATOR_ARTIFACT_FORCE_PATH_STYLE · AURORA_OPERATOR_SESSION_FACTORY_MODULE
```
No new env keys. **No generic AWS-credential handling is added inside source** — the platform provides any cloud
credentials externally (the standard SDK credential chain runs outside our code); the image bakes none.

### `[DECISION]` Decision 5 — Caller module packaging → **mounted/provided local path; never baked, never remote**
The caller module is supplied at run time as an explicit local filesystem path (mount/volume/bundled-alongside).
It is **not** baked into the image as the product. Remote URL modules, package-name plugin loading, directory
scan, and glob discovery remain **forbidden**. The in-repo reference fixture stays a fixture (proof), not product.

### `[DECISION]` Decision 6 — Smoke/health behavior → **"assembles and exits safely" (assemble-only)**
Healthy = the container starts, validates required config, assembles clients/repositories, and exits safely
**without running a session** unless a caller-module path is explicitly provided. Health proves **deployability**,
never recommendation quality or live-service verification. No live-DB/S3 smoke by default.

---

## 6. Acceptance criteria (Given / When / Then)

```text
G: the container starts without a caller-module path · W: config is valid
   · T: it assembles runtime dependencies and runs NO session (assemble-only), exit 0.
G: the container starts with missing required config · W: config is invalid
   · T: it fails safely, printing only missing key NAMES — never a secret value — exit non-zero.
G: a caller-module path is supplied · W: valid
   · T: it may run through the proven F2/F3 path (validate → runOperatorSession → persist envelope).
G: no delivery boundary is approved · W: a session completes · T: delivery remains withheld.
G: no AthleteDecision boundary is approved · W: a decision invitation exists · T: no AthleteDecision is created.
G: no Garmin integration is approved · W: raw artifacts exist · T: no parsing occurs (opaque provenance).
G: object storage is configured · W: raw artifacts are referenced · T: they remain provenance, not truth.
G: deployment packaging exists · W: health checks pass · T: this proves deployability, NOT recommendation quality.
G: AC20 · W: packaging is added · T: no production whole-core composer is introduced.
```

---

## 7. Forbidden behaviors

```text
implementation code in this spec · Dockerfile in this spec · IaC in this spec · package changes · package script ·
new dependencies · API/UI/server · public endpoint · scheduler/worker semantics (unselected) · secret manager
integration · live-provider default · delivery channel · automatic AthleteDecision · Garmin parser/integration ·
remote caller-module loading · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 8. Relationship to existing architecture

- **Spec 031 / 032 / 032R** — the production-deployment-target and product-runtime-surface boundaries: this stays
  a **non-public** operator runtime; no product/API/UI surface is created.
- **Spec 043 / 043D / 043F / 043F-A** — the cloud-start direction, dependency approvals, and input contract stand;
  this packages the *proven* runtime, adding no new capability.
- **043-D5A/B, 043-F1/F2/F3** — the env loader, executable, module runner, and reference fixture are the substrate;
  packaging wraps them in a container without changing behavior.
- **AC20 / Spec 034R** — unchanged; the caller composes the core, the container/runtime never does.

---

## 9. Decision & next mission

`[DECISION] Deployment packaging boundary: Option B (+C) — a minimal Dockerfile + .dockerignore + container smoke
runbook, NO IaC, NO package script, NO API/UI/server, NO live provider/delivery/Garmin credentials.` The image
runs `node scripts/operator-runtime-executable.mjs`; without a caller-module path it assembles and exits safely
(assemble-only health); the caller module is a mounted local path (never baked, never remote); the env surface is
exactly the existing AURORA_OPERATOR_* allowlist; the platform provides any cloud credentials externally.

`[RECOMMENDATION] Next mission: Implementation 043-G1 — Dockerfile & Container Smoke Runbook` — add a `Dockerfile`
(+ `.dockerignore` + a short `docs/runbooks/` container note) with the assemble-only entrypoint, plus a
**static** guard test (read the Dockerfile/dockerignore as text — no container build in the default suite) proving
the entrypoint, the env-surface-only posture, no baked secret/caller-module, no live-provider/delivery/Garmin,
and no IaC/API/UI. IaC and a platform choice are deferred to a later, evidence-based spec (043-H).

```text
selected packaging option        : Option B (+C) — Dockerfile + .dockerignore + container smoke runbook; no IaC.
Dockerfile approved next          : YES (in 043-G1).
IaC approved next                 : NO (deferred to a later platform-evidence spec).
selected runtime command          : node scripts/operator-runtime-executable.mjs (assemble-only without module path).
selected env surface              : the existing AURORA_OPERATOR_* allowlist only; no new keys; no in-source AWS creds.
caller module packaging           : mounted/provided local path; never baked into image; never remote/glob/scan.
health/smoke                      : assembles config+clients+repositories and exits safely (no session by default);
                                    proves deployability, not recommendation quality; no live-DB/S3 default.
recommended next mission          : Implementation 043-G1 — Dockerfile & Container Smoke Runbook.
```

---

## 10. Validation & invariants at this spec

`tsc --noEmit` clean; `node --test` **962/962**. No code/test/package/lockfile/tsconfig change; no dependency; no
guard weakened; AC20 untouched. Packaging is decided as a **minimal Dockerfile (no IaC)** for a non-public,
assemble-only-by-default operator runtime; live services, delivery, Garmin, AthleteDecision, and any public
surface remain out of scope.
