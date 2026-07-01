# Aurora — Specification 043I — Non-Public Compute Target Boundary

> **Status (2026-07-01).** Specification phase, building on Impl 043-H1 (`e7a2509`). It is **behavioral /
> docs-only**: it implements no code, adds no Terraform/CDK/Pulumi/Kubernetes manifest, no Docker Compose, no
> GitHub Actions deploy workflow, no registry push, no cloud credentials/OIDC, no secrets, no package/
> dependency/Dockerfile/workflow change, builds no API/UI/server, integrates no secret manager, enables no live
> provider / delivery / Garmin integration, creates no `AthleteDecision`, introduces no production whole-core
> composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **995/995**. It decides **which
> non-public compute target, if any**, is now approved for Aurora's operator-runtime container.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and routes the build to a next slice. No IaC file, no deploy workflow, no credential, no code is created here.

---

## 1. Context

`[FACT]` Aurora now has a packaged, CI-validated operator-runtime container:

```text
Dockerfile (node:22.22-slim, source-direct) — Impl 043-G1, f612e4e
.github/workflows/operator-runtime-docker-build.yml (build-only CI) — Impl 043-H1, e7a2509
Validation: 995/995
```

`[FACT]` Spec 043H (`5d9796a`) selected Option C — a build-only GitHub Actions workflow — and explicitly
approved *nothing* about where the image runs: no registry push, no deployment, no IaC, no cloud auth, no
secrets, no runtime platform, no scheduler/worker loop, no API/server. Impl 043-H1 implemented exactly that and
nothing more, confirmed by 13 new static guard tests.

`[FACT]` Nothing about *execution location* has changed since Spec 031 (never revisited): no account, no
registry, no IAM/networking model, no named hosting platform exists anywhere in the repository. What **has**
changed is that a *packaging* artifact (the Dockerfile) and a *build-validation* artifact (the CI workflow) now
exist — narrower facts than a *hosting* decision.

`[GAP]` A container that reliably builds in CI is not the same as a container that has anywhere approved to
*run* outside a developer's own machine. This spec closes that gap only as far as the evidence allows.

---

## 2. Central Question

> Which non-public compute target, if any, is approved for Aurora's operator-runtime container, and what
> evidence is required before registry, IaC, or deployment automation can be added?

The central distinctions below must stay legible regardless of the answer:

```text
compute target ≠ public product · container execution ≠ SaaS · one-shot task ≠ long-running server ·
manual trigger ≠ scheduler · cloud deploy ≠ athlete-facing UI · registry image ≠ production rollout ·
platform env injection ≠ secret manager integration · configured credentials ≠ live-call enabled ·
caller module path ≠ remote plugin marketplace · session run ≠ AthleteDecision ·
OperatorSessionEnvelope ≠ delivered message · delivery withheld ≠ delivery failure ·
TrainingSessionRecord ≠ Evidence · raw artifact ≠ truth · health check ≠ recommendation quality ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/specs/031-production-deployment-target-boundary.md
docs/specs/043-cloud-operator-runtime-training-session-persistence-boundary.md   (matches "043-...-cloud-start-boundary")
docs/specs/043G-deployment-packaging-boundary.md
docs/specs/043H-deployment-automation-iac-boundary.md
docs/runbooks/operator-runtime-container-smoke.md
Dockerfile
.github/workflows/operator-runtime-docker-build.yml
scripts/operator-runtime-executable.mjs
src/operator-runtime/deployment/operator-runtime-env-config.ts
src/operator-runtime/deployment/operator-runtime-assembly.ts
src/operator-runtime/deployment/operator-session-module-runner.ts
```

`[FACT]` Spec 031's gating criterion 1 ("runtime fit") was written about a *product* runtime surface (API/
worker/UI) and remains unmet by design — Aurora still has none. The **separate** question this spec answers —
*where does the already-proven, non-public operator container physically run* — was explicitly deferred by
both Spec 031 (§6.6, "the correct next decision is what the deployable product runtime surface is") and Spec
043H (§9, "IaC and a platform choice are deferred to a later, evidence-based spec"). This is that spec.

---

## 4. Required Analysis

```text
 1. What H1 proved              : the Dockerfile keeps building reliably in a clean CI environment (npm ci,
                                   typecheck, test, docker build), with zero secrets/registry/deploy/cloud auth.
                                   CI never runs `docker run` — the built image's runtime behavior is proven only
                                   by the local static/G1 evidence and the manual smoke runbook, not by CI.
 2. What H1 did NOT prove       : anything about hosting — no registry, no IAM/networking model, no execution on
                                   any platform, no verification that the image runs against a real, network-
                                   reachable Postgres/S3 endpoint (CI sets no such env; that stays a manual,
                                   opt-in step per the runbook). CI build success proves the image is buildable,
                                   not that it is deployed, deployable-to-a-specific-host, or correct at runtime.
 3. Is the image ready for manual operator-triggered execution now? : YES — nothing new is required. The Impl
                                   043-G1 runbook (docs/runbooks/operator-runtime-container-smoke.md §6) already
                                   documents `docker build` + `docker run` with injected env against local/fake
                                   or real endpoints, on whatever host the operator already has Docker on.
 4. Is a registry needed before selecting compute? : ONLY for targets that pull a remote image (ECS/Fargate,
                                   Batch, Lambda container, App Runner all require one). A manual/local or
                                   already-controlled-private-host execution needs NO registry — the operator (or
                                   a CI artifact, out of scope here) builds the image where it runs. This is why
                                   deferring compute selection also defers the registry question (§6, Decision 3).
 5. Registry push approved now? : NO.
 6. Platform credentials approved now? : NO — no account/IAM/OIDC decision exists to scope credentials to.
 7. Secret-manager integration approved now? : NO — unchanged from Specs 030/043G/043H; still no deployment
                                   target to anchor a provider choice.
 8. Caller module: mounted, baked, or another path? : MOUNTED/PROVIDED local filesystem path — unchanged and
                                   reaffirmed (Spec 043G Decision 5). No compute-target decision changes this.
 9. Remote caller modules forbidden? : YES, unchanged and reaffirmed — no URL, package name, glob, or scan.
10. Should DB/S3 connectivity be verified by the compute target? : Only as an OPTIONAL, explicit, MANUAL smoke
                                   step (already documented in the G1 runbook §6) — never a default/required
                                   gate of any CI or compute-target automation.
11. Live DB/S3 smoke in default CI? : NO, unchanged — Impl 043-H1's workflow sets no AURORA_OPERATOR_* env by
                                   design; that stays true regardless of what compute target is (or isn't)
                                   eventually selected.
12. Runtime: one-shot, scheduled, or long-running? : ONE-SHOT, manual/operator-triggered — unchanged (Decision
                                   2 below reaffirms this explicitly; no evidence supports any other model).
13. Compute target evaluation : see §5 (Options Evaluated) — no cloud target is selected; see Decision 1.
14. Does any option introduce API/server semantics? : Option E (App Runner-class services) and Option I
                                   (public API/server) inherently do; ECS RunTask/Batch/Lambda-container/manual-
                                   host do not, by construction, if invoked as one-shot tasks/commands.
15. Does any option introduce scheduler/worker semantics? : Only Option H, by definition; none of the others do
                                   unless deliberately misconfigured against their one-shot invocation form.
16. Does any option require registry credentials? : YES for C (ECS/Fargate), D (Batch), F (Lambda container,
                                   which requires ECR specifically) and E (App Runner). NO for B (manual/private
                                   host — build locally or transfer the image without a registry). G (GitHub
                                   Actions as executor) does not strictly require a registry but blurs CI/runtime
                                   roles regardless (see item 19).
17. Does any option require cloud auth? : YES for C/D/E/F (an IAM role/identity is required to run the task and
                                   reach Postgres/S3). NO for B. Possibly for G if it needed private-network
                                   database access (a self-hosted runner or network peering) — another unresolved
                                   decision, not evidenced.
18. Does any option require network/VPC decisions? : YES for C/D/E/F (subnet, security group, and
                                   Postgres/S3 reachability design are all unresolved). B's networking is
                                   whatever the operator's already-existing host already has — no NEW network
                                   decision is created by choosing it. G's GitHub-hosted runners only have public
                                   internet egress, which would force either a publicly reachable DB/S3 endpoint
                                   (a real security decision, unevidenced) or a self-hosted runner (its own,
                                   unevidenced infrastructure decision).
19. Does any option require secrets-policy decisions? : YES for C/D/E/F (task-definition/function env or an IAM
                                   role need a defined secrets-injection policy — exactly what Spec 043H deferred).
                                   B needs only the operator's own shell-exported env at invocation time — no
                                   platform secrets policy is created. G would require storing DB/S3 credentials
                                   as GitHub Actions secrets in a runtime-executing workflow — a decision Impl
                                   043-H1's own guard tests explicitly forbid inside the *build* workflow, and a
                                   *separate* runtime-executor workflow is exactly the premature commitment this
                                   spec is checking for evidence on (there is none).
20. Evidence still missing before IaC : the same gaps Spec 031 and Spec 043H both found unresolved — a named
                                   account/billing owner, a registry decision, an IAM/networking design, an
                                   observability plan, a rollback story, and cost constraints. Impl 043-H1 added
                                   build-time CI evidence; it added none of the above.
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — no compute target yet; manual local/container smoke only** | **Selected.** Already sufficient: the G1 runbook documents building/running the image on any host the operator already controls (their own machine or an already-provisioned private host they SSH into) — no NEW target, registry, IAM, network, or secrets decision is required to keep using it. |
| B — manual operator-triggered container run on an already-provisioned private host/VM | **Folded into A.** No such host is evidenced anywhere in the repository; if/when the operator has one, running the already-proven image there is the *same* manual model as Option A, not a new decision. Naming it separately would falsely imply a host has been provisioned. |
| C — AWS ECS RunTask / Fargate one-shot task | **Deferred, cautious.** Fits the one-shot invocation model conceptually, but requires a registry, an IAM task role, VPC/subnet/security-group design, and a secrets-injection policy — none evidenced (§4 items 16–19). |
| D — AWS Batch job | **Deferred, cautious.** Same blocking gaps as C (registry, IAM, networking, secrets); no evidence a queue/compute-environment model is needed over C's simpler RunTask shape. |
| E — AWS App Runner or long-running container service | **Rejected as compute for this runtime.** App Runner-class services are designed to stay up and typically expose HTTP — that is service/server semantics, contradicting the approved one-shot, non-public runtime model (Decision 2). Would require its own product-surface evidence (Spec 031/032 gate), which does not exist. |
| F — AWS Lambda container image | **Deferred, cautious.** Requires ECR specifically (a registry decision), an IAM execution role, and forces reconsidering the one-shot model against Lambda's timeout/cold-start/read-only-filesystem constraints — the mounted-caller-module delivery model (Decision 6) does not map cleanly onto Lambda's writable-`/tmp`-only filesystem without redesign. |
| G — GitHub Actions manual workflow as runtime executor | **Rejected now.** Blurs the CI system Impl 043-H1 scoped to *build validation only* with a *runtime executor* that would need real DB/S3 credentials as GitHub secrets — a secrets-policy decision this spec finds no evidence for, and a role Impl 043-H1's own guard tests explicitly forbid mixing into the same workflow. |
| H — scheduled worker/task | **Rejected.** Scheduler semantics are explicitly unselected (Decision 2); no periodic/triggered-by-time need is evidenced anywhere. |
| I — public API/server deployment | **Rejected.** No product/API surface is approved; Spec 031/032's API/UI lane remains unmet. |
| J — full production rollout (registry, IaC, secrets, delivery, live provider, Garmin) | **Rejected.** Every one of those lanes remains explicitly deferred/unmet per Specs 030/042/043/043G/043H. |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — Compute target → **no new compute target selected**
No cloud target (ECS/Fargate, Batch, App Runner, Lambda container) is selected — none has the registry/IAM/
network/secrets evidence Decision 3–5 below require. The approved execution model remains: the operator
manually builds and runs the container wherever they already have a Docker-compatible runtime and network
reachability to the target Postgres/S3 endpoints — their own workstation, or any private host/VM they already
control. This is a continuation of the Impl 043-G1 runbook's existing manual-smoke model, not a new target
requiring its own spec.

### `[DECISION]` Decision 2 — Runtime mode → **manual/operator-triggered one-shot container (unchanged)**
Expected pressure confirmed: the runtime stays manual/operator-triggered and one-shot. It does **not** become a
scheduled job, a long-running worker, a server, or a public endpoint. Any future change requires its own
evidence and its own spec.

### `[DECISION]` Decision 3 — Registry → **deferred, not approved**
Expected pressure confirmed: registry push, image naming, and retention remain deployment-ops decisions. They
are not needed for the selected (manual/local-or-private-host) execution model and become relevant only once a
cloud target is selected with real evidence.

### `[DECISION]` Decision 4 — IaC → **deferred, not approved**
Expected pressure confirmed: with no compute target selected (Decision 1), there is nothing for IaC to
provision. IaC stays deferred until a concrete target is chosen on real evidence, exactly as Spec 043H concluded.

### `[DECISION]` Decision 5 — Secrets and env → **platform-provided env only (unchanged)**
Expected pressure confirmed: no secret-manager integration; no generic AWS-credential handling inside source.
For the selected manual model, "platform" is the operator's own shell/environment at invocation time — the same
`AURORA_OPERATOR_*` allowlist (Spec 043G Decision 4) supplied however the operator's host already supplies env
(exported vars, a local `.env` loaded outside `src`, etc.) — nothing new is introduced.

### `[DECISION]` Decision 6 — Caller module delivery → **mounted/provided local filesystem path (unchanged)**
Reaffirmed unchanged from Spec 043G Decision 5. Rejected, explicitly: remote URL, package plugin, directory
scan, glob discovery, and any baked default production caller module.

### `[DECISION]` Decision 7 — Smoke/health → **"assembles and exits safely" (unchanged)**
Reaffirmed unchanged from Spec 043G Decision 6: the process starts, validates required config, assembles
runtime clients/repositories, and exits safely **without running a session** unless a caller-module path is
explicitly provided. Whatever compute target is eventually selected, its smoke/health definition must mean the
same thing — deployability posture, never recommendation quality, never live-service verification by default.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given H1 build-only CI exists, when compute target is considered, then build success is not treated as
  deployment success. ✅ (§4 items 1–2; §2 central distinction.)
Given no product surface is selected, when compute is selected, then no API/UI/server endpoint is
  introduced. ✅ (Decision 1 selects no target at all; Option E/I explicitly rejected, §5.)
Given manual operator-mediated runtime remains selected, when compute runs, then it is one-shot and explicitly
  triggered. ✅ (Decision 2.)
Given no scheduler is approved, when compute target is evaluated, then scheduled worker semantics are rejected
  or deferred. ✅ (Option H rejected, §5; Decision 2.)
Given no registry decision is approved, when image distribution is evaluated, then registry push remains
  deferred unless explicitly selected. ✅ (Decision 3.)
Given no secret-manager boundary is selected, when runtime env is described, then platform env injection
  remains the boundary. ✅ (Decision 5.)
Given caller module path is used, when runtime starts, then module must be local/provided, not
  remote/plugin/glob. ✅ (Decision 6, unchanged.)
Given no delivery boundary is approved, when a session completes, then delivery remains withheld. ✅
  (unchanged from Specs 043/043G/043H; this spec adds nothing to delivery.)
Given no AthleteDecision boundary is approved, when a decision link exists, then no AthleteDecision is
  created. ✅ (unchanged.)
Given no Garmin integration is approved, when artifacts exist, then no parsing occurs. ✅ (unchanged.)
Given compute smoke passes, when reported, then it proves deployability posture, not recommendation
  quality. ✅ (Decision 7.)
Given AC20, when compute target is selected, then no production whole-core composer is introduced. ✅ (this
  spec adds no composer of any kind — it is docs-only, and selects no target at all.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · Terraform/CDK/Pulumi/Kubernetes files · Docker Compose · GitHub Actions deploy workflow ·
registry push · cloud auth/OIDC · secrets usage · package changes · new dependencies · API/UI/server ·
public endpoint · scheduler/worker loop · live DB/S3 required by default CI · live-provider default ·
delivery channel · automatic AthleteDecision · Garmin parser/integration · remote caller modules ·
production whole-core composer · reflection-composition · AC20 amendment ·
Dockerfile modification · workflow modification · package/lockfile modification
```

---

## 9. Relationship to Existing Architecture

- **Spec 031** — production-deployment-target-boundary: criterion 1 (runtime fit, for a *hosted* target) stays
  unmet; this spec does not select a hosting platform, only confirms the manual model remains sufficient.
- **Spec 030** — secret-provider selection stays deferred for the same reason it always has.
- **Spec 042** — the API/UI, live-provider, delivery, and AC20-amendment lanes remain gated/unmet; untouched.
- **Spec 043 / 043G / 043H** — this spec is the direct continuation Spec 043H's §9 recommended ("a platform
  choice [is] deferred to a later, evidence-based spec"). The evidence remains insufficient for any cloud
  target; sufficient only to reaffirm the existing manual model.
- **AC20 / Spec 034R** — unchanged; no composer of any kind is introduced by a docs-only spec that selects no
  new target.

---

## 10. Decision & Next Mission

`[DECISION] Non-public compute target boundary: Option A — no new compute target selected; manual
operator-triggered container execution on any host the operator already controls (their own machine or an
already-controlled private host) remains the approved model. Registry, IaC, platform credentials, and
secret-manager integration all remain deferred pending real deployment-target evidence — none of which exists
in the repository today.`

```text
selected compute target        : none (manual/local or any already-controlled private host — no cloud target).
selected runtime mode          : manual/operator-triggered one-shot container (unchanged).
registry decision              : deferred, not approved.
IaC decision                   : deferred, not approved.
secrets/env decision           : platform-provided env only; no secret-manager integration; no generic AWS
                                  credential handling in source (unchanged).
caller module delivery decision: mounted/provided local filesystem path only (unchanged).
smoke/health decision          : assembles config+clients+repositories and exits safely without running a
                                  session by default; proves deployability posture, not recommendation quality
                                  (unchanged).
recommended next mission       : Docs 043-I1 — Manual Private Host / Operator Compute Runbook.
```

`[RECOMMENDATION] Next mission: Docs 043-I1 — Manual Private Host / Operator Compute Runbook.` A docs-only
addendum to `docs/runbooks/operator-runtime-container-smoke.md` (or a new sibling runbook) documenting how an
operator runs the already-proven image on a private host they control (transferring the image via `docker
save`/`load` or a local rebuild, supplying env at invocation, no registry). No code, no IaC, no CI change. Since
this spec selects no cloud target and approves no registry/credentials, a Tech Spec for ECS RunTask (or any
other platform) is **not** recommended next — that requires its own future spec once account/registry/IAM/
network evidence exists, per Decision 1 and §4 item 20.

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **995/995** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig/Dockerfile/workflow change; no dependency added; no guard weakened; AC20 untouched.
