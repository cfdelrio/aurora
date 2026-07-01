# Aurora — Specification 043H — Deployment Automation / IaC Boundary

> **Status (2026-07-01).** Specification phase, building on Impl 043-G1 (`f612e4e`). It is **behavioral /
> docs-only**: it implements no code, adds no Terraform/CDK/Pulumi/Kubernetes manifest, no Docker Compose, no
> GitHub Actions workflow file, no package/dependency/Dockerfile/executable change, builds no API/UI/server,
> integrates no secret manager, enables no live provider / delivery / Garmin integration, creates no
> `AthleteDecision`, introduces no production whole-core composer, and amends no AC20. Base: `tsc --noEmit`
> clean; `node --test` **982/982**. It decides **whether**, and to what degree, deployment automation/IaC is
> now approved for Aurora's non-public operator-runtime container.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and routes the build to a next slice. No workflow file, no IaC file, no code is created here.

---

## 1. Context

`[FACT]` Aurora now has a proven, packaged operator-runtime container (Impl 043-G1, `f612e4e`):

```text
Dockerfile (node:22.22-slim, source-direct, no build step) → CMD ["node", "scripts/operator-runtime-executable.mjs"]
  → loadOperatorRuntimeConfigFromEnv → createOperatorRuntimePersistenceFromEnvironmentConfig (real pg/S3 via
  token-pinned factories) → repositories/artifactStore → (optional) mounted local caller module →
  runOperatorSessionFromCallerModule → runOperatorSession → invokeOperatorSession → runtime →
  persist only OperatorSessionEnvelope. Delivery withheld; no AthleteDecision.
```

`[FACT]` This was verified by 20 static guard tests (text-only; no `docker build` in default validation) plus
the pre-existing 962 tests — total **982/982**. Node's native TypeScript stripping was confirmed unflagged by
default at v22.22.2 (≥22.18) before the Dockerfile was written; the image runs the repository's TypeScript
source directly, with no transpiler, no package script, no tsconfig change.

`[FACT]` Nothing beyond the container exists yet: no CI provider (`.github/` is absent — confirmed by Spec 031
§3.4 and unchanged since), no registry wiring, no IaC file of any kind, no platform selection, no scheduled or
long-running runtime, no public endpoint.

`[GAP]` A container that *can* be built and run is not the same as a container that *is* automatically built,
verified, or deployed anywhere. The open question this spec resolves: how much of that automation gap, if any,
should Aurora close now — without selecting a hosting platform it has no evidence for.

---

## 2. Central Question

> Should Aurora introduce deployment automation / IaC now, and if yes, what is the smallest non-public
> deployment-automation step that preserves the operator-mediated runtime boundary?

The central distinctions below must stay legible regardless of the answer:

```text
IaC ≠ public rollout · deployment automation ≠ product API · container task ≠ SaaS ·
scheduled job ≠ athlete-facing product · CI build ≠ production deployment · image build success ≠ runtime
correctness · health check ≠ recommendation quality · configured credentials ≠ live-call enabled ·
caller module path ≠ remote plugin marketplace · operator execution ≠ AthleteDecision ·
OperatorSessionEnvelope ≠ delivered message · delivery withheld ≠ delivery failure ·
TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/specs/031-production-deployment-target-boundary.md
docs/specs/043-cloud-operator-runtime-training-session-persistence-boundary.md   (matches "043-...-cloud-start-boundary")
docs/specs/043G-deployment-packaging-boundary.md
docs/runbooks/operator-runtime-container-smoke.md
Dockerfile
.dockerignore
scripts/operator-runtime-executable.mjs
src/operator-runtime/deployment/operator-runtime-env-config.ts
src/operator-runtime/deployment/operator-runtime-assembly.ts
src/operator-runtime/deployment/operator-session-module-runner.ts
```

`[FACT]` Spec 031 (never revisited) concluded deployment-**target** selection is blocked on "runtime fit"
(criterion 1): no deployable product runtime surface existed. Impl 043-G1 changed that fact for the *packaging*
layer only — a deployable **container** now exists — but Spec 031's criterion 1 was written about a *product*
runtime surface (API/worker/UI); the operator-runtime container is explicitly **non-public** and
**operator-triggered**, so it does not, by itself, supply the evidence Spec 031 was waiting for. Spec 031's
gate on platform *selection* therefore still holds.

---

## 4. Required Analysis

```text
 1. What G1 proved            : the operator-runtime executable is packageable as a container and runs its full
                                 .ts import chain (incl. token-pinned pg/S3 adapters) under stock Node 22 with
                                 zero new build tooling; assemble-only default; missing-config fails safely
                                 (key names only); env surface is exactly the approved allowlist; no secrets/
                                 caller-module baked; no IaC/API/server/scheduler present. Proven by 20 static
                                 guard tests reading Dockerfile/.dockerignore/runbook AS TEXT — no docker build
                                 ran in default validation (no daemon in this sandbox; non-blocking).
 2. What G1 did NOT prove      : that `docker build` actually succeeds anywhere (no Docker daemon was available
                                 in this sandbox to confirm it); that the image runs correctly against a real
                                 network-reachable Postgres/S3-compatible endpoint; behavior under any specific
                                 hosting platform's constraints (cold start, task IAM, ephemeral filesystem,
                                 image size/layer limits); registry distribution; reproducible/CI builds; image
                                 vulnerability posture; multi-arch support; anything about recommendation
                                 quality, delivery, AthleteDecision, Garmin parsing, or live-provider behavior
                                 (explicitly out of scope by the runbook itself).
 3. AWS ECS/App Runner/Batch/Lambda/etc evidence : NONE. No account, billing, runtime-identity, registry, or
                                 platform signal exists anywhere in the repo (same gap Spec 031 §3 documented;
                                 G1 packaged a container, it did not name a host for it).
 4. IaC deferred until platform choice? : YES. Writing Terraform/CDK/Pulumi/Kubernetes now would silently pick
                                 a platform shape (ECS task def vs. Lambda container vs. Batch job vs. Cloud Run)
                                 with zero evidence, exactly the premature commitment Spec 031 forbade.
 5. Should GitHub Actions build the image now? : YES, build-only. A workflow that runs `docker build .` on push/
                                 PR is CI validation of an artifact that already exists (the Dockerfile) — it
                                 requires no secrets, no registry, no deploy target, and it catches Dockerfile
                                 breakage (base-image changes, COPY drift, native-TS-stripping regressions)
                                 immediately instead of at some future first real deploy.
 6. Is pushing images to a registry approved? : NO. Registry choice (ECR/GHCR/Docker Hub/etc), push credentials,
                                 and image-retention policy are deployment-ops decisions with their own evidence
                                 requirements (who consumes the registry? which platform pulls from it?) — none
                                 of which exist yet. Approving push now would manufacture that evidence.
 7. Should secrets be wired through platform env only? : YES, unchanged from Spec 043G Decision 4 — the image
                                 bakes no secret; the (future) platform injects AURORA_OPERATOR_* values as env
                                 at run time. This spec adds no new mechanism.
 8. Is secret-manager integration approved? : NO, still deferred (Spec 030's conclusion stands: no deployment
                                 target exists to anchor a provider choice; premature now for the same reason).
 9. Is a scheduler required or deferred? : DEFERRED (still). No evidence of a periodic/triggered-by-time need;
                                 the operator remains the trigger.
10. Is a worker loop required or forbidden? : FORBIDDEN. A long-running loop would convert the one-shot,
                                 exits-safely runtime into a standing service — a materially different (and
                                 unapproved) runtime model.
11. Is a public endpoint required or forbidden? : FORBIDDEN. Unchanged — Spec 043/043G's "non-public,
                                 operator-triggered runtime" holds; no API/UI lane evidence exists (Spec 031/032
                                 gate unmet).
12. Should live DB/S3 smoke be in default CI? : NO. Any CI (build-only or otherwise) must remain daemon-light
                                 and credential-free by default, matching the existing default-suite invariant
                                 (982/982 requires no live DB/S3 today); a live smoke, if ever added, stays an
                                 explicit, separate, opt-in job — never a default gate.
13. Can Docker build stay optional/manual? : YES for local/default validation (`npm run typecheck && node --test`
                                 never requires a Docker daemon) — this remains true even if a build-only CI
                                 workflow is approved, because that workflow is additive automation, not a new
                                 requirement of the default test suite.
14. Should deployment support caller-module mounts? : YES, unchanged — the caller module stays a mounted/
                                 provided local filesystem path (Spec 043G Decision 5); this spec adds nothing
                                 new here and does not touch it.
15. Do remote caller modules remain forbidden? : YES, absolutely unchanged.
16. Are live-provider credentials allowed? : NO.
17. Are delivery credentials allowed? : NO.
18. Are Garmin credentials allowed? : NO.
19. Next slice: docs-only / CI build-only / registry-only / IaC skeleton? : CI BUILD-ONLY. It is the smallest
                                 automation step that produces new evidence (does the image keep building?)
                                 without selecting a product surface, a registry, a platform, or a runtime model.
20. Evidence still missing before platform IaC : a named production deployment target (Spec 031 criterion 1,
                                 still unmet for a *hosted* target — G1 proved packageability, not hosting); an
                                 account/billing owner; a registry decision; a runtime-identity model (how the
                                 host authenticates to Postgres/S3); an invocation model for a non-public one-
                                 shot container on that platform (e.g. ECS RunTask vs. Batch job vs. manual `docker
                                 run` on a host); observability requirements; a rollback story; cost constraints.
                                 None of these exist in the repository today, so platform-specific IaC stays
                                 out of scope.
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — no IaC/CI yet; keep manual container smoke only | **Viable, not selected.** Forgoes a safe, zero-credential win: automated proof the Dockerfile keeps building. |
| B — docs-only deployment checklist | **Folded in, not sufficient alone.** A checklist doesn't produce new build evidence; the runbook (043-G1) already covers manual smoke steps. |
| **C — GitHub Actions Docker build validation only, no registry push** | **Selected.** Smallest automation increment: builds the existing Dockerfile on push/PR, no secrets, no push, no deploy, no platform commitment. |
| D — GitHub Actions image build + registry push | **Rejected now.** Registry push requires registry credentials — a deployment credential and its own evidence-based decision (who/what consumes the registry?). |
| E — Terraform/CDK skeleton for a non-public one-shot task | **Rejected now.** No platform evidence (Spec 031 criterion 1 unmet for a hosting target); any skeleton would silently fix a platform shape. |
| F — scheduled worker/task IaC | **Rejected now.** No scheduling need evidenced; also requires IaC (rejected) and changes the approved runtime model (Decision 5 below). |
| G — API/server deployment | **Rejected.** No product/API surface is approved; Spec 031/032's API/UI lane remains unmet. |
| H — full production rollout with secrets, delivery, live provider, Garmin | **Rejected.** Every one of those lanes (secret manager, delivery, live provider, Garmin) remains explicitly deferred/unmet per Specs 030/042/043/043G. |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — IaC now or defer → **no IaC yet**
No Terraform/CDK/Pulumi/Kubernetes manifest, minimal or platform-specific, is approved. A minimal "skeleton"
would still have to pick a shape (task definition vs. function vs. job) with zero platform evidence — the same
premature commitment Spec 031 forbade. IaC is deferred until a concrete deployment target is selected on real
evidence (a future Spec 031 revisit).

### `[DECISION]` Decision 2 — CI image build → **approved, build-only**
A GitHub Actions workflow that runs `docker build` against the repository's `Dockerfile` on push/PR is approved
**at the decision level**. Per the mission's explicit constraint, if implemented it must:

```text
not push the image · not deploy anything · not require secrets · not run live DB/S3 ·
not run a caller-module session by default · not add a product server
```

This spec does **not** create the workflow file — that is implementation (`.github/workflows/*.yml` is code,
not documentation) and is deferred to the recommended next mission, Implementation 043-H1.

### `[DECISION]` Decision 3 — Registry → **not approved**
Registry push, registry choice, and image-retention policy remain deferred. Expected pressure confirmed:
registry credentials and artifact retention are separate deployment-ops decisions requiring their own evidence
(a consuming platform) that does not yet exist.

### `[DECISION]` Decision 4 — Secrets → **not approved (no secret-manager integration)**
Expected pressure confirmed: no secret-manager integration is approved. Platform-provided environment injection
remains the boundary, unchanged from Spec 043G Decision 4 — this spec adds no new secrets mechanism.

### `[DECISION]` Decision 5 — Runtime model → **manual/operator-triggered one-shot container**
Expected pressure confirmed: the runtime stays a **manual/operator-triggered one-shot container** (Spec 043G
Decision 6's "assembles and exits safely" model). It does **not** become a scheduled worker, a long-running
server, or a public endpoint. Any future change to this model requires its own evidence and its own spec.

### `[DECISION]` Decision 6 — Caller module delivery → **mounted/provided local path (unchanged)**
The caller module remains a **mounted/provided local filesystem path**, exactly as Spec 043G Decision 5
established. Rejected, explicitly and unchanged: remote URL, package plugin, directory scan, glob discovery,
and any baked default production caller module.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given G1 packaging exists, when deployment automation is considered, then it must not create API/UI/server
  semantics. ✅ (Decision 2 workflow is build-only; no server/API is added.)
Given no platform has been selected, when IaC is considered, then platform-specific IaC is deferred unless
  evidence is documented. ✅ (Decision 1 — no IaC yet; §4 item 20 lists the missing evidence.)
Given CI build-only is selected, when workflow runs, then it builds the image but does not push or deploy. ✅
  (Decision 2's explicit constraints.)
Given no registry decision is approved, when image build succeeds, then no registry credentials are required. ✅
  (Decision 3 — no push, no registry auth.)
Given no secret-manager boundary is selected, when runtime env is described, then platform env injection
  remains the boundary. ✅ (Decision 4, unchanged from 043G.)
Given no delivery boundary is approved, when a session completes, then delivery remains withheld. ✅ (unchanged
  from Specs 043/043G; this spec adds nothing to delivery.)
Given no AthleteDecision boundary is approved, when a decision link exists, then no AthleteDecision is
  created. ✅ (unchanged.)
Given no Garmin integration is approved, when artifacts exist, then no parsing occurs. ✅ (unchanged.)
Given deployment automation exists, when health checks pass, then this proves deployability, not
  recommendation quality. ✅ (central distinction, §2; unchanged from 043G Decision 6.)
Given AC20, when deployment automation is added, then no production whole-core composer is introduced. ✅
  (this spec adds no composer of any kind — it is docs-only.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · Terraform/CDK/Pulumi/Kubernetes files · Docker Compose ·
GitHub Actions workflow file creation (Decision 2 approves the workflow at the decision level only; the actual
  .github/workflows/*.yml is implementation, deferred to Implementation 043-H1) ·
package changes · new dependencies · registry push · deployment credentials · secret manager integration ·
API/UI/server · public endpoint · scheduler/worker loop · live DB/S3 required by default CI ·
live-provider default · delivery channel · automatic AthleteDecision · Garmin parser/integration ·
remote caller modules · production whole-core composer · reflection-composition · AC20 amendment ·
Dockerfile modification · executable modification
```

---

## 9. Relationship to Existing Architecture

- **Spec 031** — production-deployment-target-boundary: criterion 1 (runtime fit, for a *hosted* target) stays
  unmet; this spec does not revisit target selection, only the automation *around* the already-packaged
  container.
- **Spec 030** — secret-provider selection stays deferred for the same reason it always has: no deployment
  target exists to anchor a provider choice.
- **Spec 042** — the persistence/deployment lanes are entered (Specs 043→043G); the API/UI, live-provider,
  delivery, and AC20-amendment lanes remain gated/unmet — this spec does not touch any of them.
- **Spec 043 / 043G** — this spec is the direct continuation 043G's §9 recommended: "IaC and a platform choice
  are deferred to a later, evidence-based spec (043-H)." That evidence-based review is this document; the
  evidence remains insufficient for IaC, sufficient for a build-only CI check.
- **AC20 / Spec 034R** — unchanged; no composer of any kind is introduced by a docs-only spec.

---

## 10. Decision & Next Mission

`[DECISION] Deployment automation boundary: Option C — GitHub Actions Docker build validation only (build the
existing Dockerfile on push/PR; no registry push, no IaC, no secrets, no deploy, no live DB/S3, no product
server, no scheduler/worker loop). All other automation — registry push, IaC/platform selection, secret-manager
integration, scheduled/long-running runtime — remains deferred, each behind its own future evidence-based spec.`

```text
IaC approved now                  : NO (Decision 1).
GitHub Actions image build approved : YES, build-only (Decision 2) — decision only; workflow file is 043-H1.
registry push approved            : NO (Decision 3).
secret-manager integration approved : NO (Decision 4).
runtime model                     : manual/operator-triggered one-shot container, unchanged (Decision 5).
caller module delivery            : mounted/provided local path, unchanged (Decision 6).
```

`[RECOMMENDATION] Next mission: Implementation 043-H1 — Docker Build CI Guard.` Add a GitHub Actions workflow
(`.github/workflows/...`) that runs `docker build .` on push/PR — build-only, no push, no deploy, no secrets,
no live DB/S3, no session run, no product server — plus a static guard proving the workflow file matches those
constraints (text-based; still no `docker build` required in `npm run check`). If, on inspection, the mission
owner instead prefers to hold automation at the docs level, the fallback is `Docs 043-H1 — Manual Deployment
Checklist` (a docs-only companion to the container smoke runbook) — but the evidence in this spec supports the
build-only CI guard as the smallest safe increment.

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **982/982** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig/Dockerfile/executable change; no dependency added; no guard weakened; AC20 untouched.
