# Aurora — Specification 031 — Production Deployment Target Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral decision boundary**
> for choosing Aurora's first production deployment target — *where Aurora runs*. It is **behavioral-only**:
> it implements no code, writes no technical spec, adds no deployment file (no Dockerfile, no CI config, no
> IaC, no Kubernetes/serverless manifest), adds no SDK, adds no dependency, selects no secret provider, adds
> no secret/credential, changes no live-call behavior, changes no operator smoke, edits no production source
> or test, and weakens no guard. Recent sequence: `2d46e12` (Impl 029) → `fe9f403` (Docs post Impl 029) →
> `712727d` (Spec 030 — secret provider deferred). Validation at authorship: `tsc --noEmit` clean;
> `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes a **decision**: under what evidence Aurora should adopt a concrete
  production deployment target, or continue to defer that choice. It defines no deployment file, no CI
  workflow, no IaC, no platform identity, and no runtime topology.
- `[FACT]` It opens **no** code edge. Nothing about the current codebase changes.
- `[DECISION]` A deployment target may be selected **only** if repository/project evidence clearly justifies
  one. A target must **not** be chosen merely because it is common.

---

## 1. Context

`[FACT]` Spec 030 (`712727d`) concluded **no concrete secret provider selected yet**, because the repo
documents no production deployment target — so AWS/GCP/Azure/Vault could not be chosen without inventing a
production commitment. Spec 031 addresses the **upstream** decision Spec 030 surfaced: *where does Aurora
run?*

`[FACT]` The secret-provider seam is ready and provider-neutral:

```text
CloudSecretValueClient → CloudSecretStoreAdapter → ManagedSecretStoreClient
  → ManagedSecretCredentialSource → EnvironmentProviderCredentialResolver
```

`[FACT]` Current runtime reality: **operator/development only** — a manual `scripts/operator-live-smoke.mjs`
(Impl 027), no production rollout, no CI live lane, no default live call.

`[GAP]` Aurora has a **domain kernel + integration seams** but **no deployable production runtime surface**
(no API, no server entrypoint, no UI, no scheduler/worker). You cannot meaningfully choose *where* to deploy
a runtime that does not yet exist. This gap — not platform preference — is the true blocker.

---

## 2. Central Question

> Where should Aurora run first in production, and what decision evidence is required before that target is
> selected?

The answer must preserve, regardless of outcome:

```text
deployment target selection ≠ deployment implementation
deployment target selection ≠ production rollout
deployment target selection ≠ CI live lane
deployment target selection ≠ secret provider implementation
deployment target selection ≠ SDK installation
deployment target selection ≠ source precedence
deployment target selection ≠ live-call enablement
deployment target selection ≠ provider output trust
deployment target selection ≠ evidence
deployment target selection ≠ athlete decision
```

---

## 3. Required Analysis (grounded in the real repository)

Each item was checked against the actual repo at authorship. No facts are inferred from architecture docs
alone.

1. **Is a deployment target already named?** **No.** No `README.md`/`MANIFESTO.md` deployment section; no
   ops/runbook/infra/deploy docs under `docs/`.
2. **Do repo files imply a deployment platform?** **No.** No `.github/`, no `Dockerfile`, no
   `docker-compose*`, no `Procfile`, no `fly.toml`, no `vercel.json`, no `render.yaml`, no `app.yaml`, no
   Terraform/Pulumi/CDK/CloudFormation, no Kubernetes manifests. Repo root is only `MANIFESTO.md`,
   `README.md`, `docs/`, `node_modules/`, `package.json`, `package-lock.json`, `scripts/`, `src/`,
   `tsconfig.json`.
3. **Do package scripts imply a server/runtime mode?** **No.** `package.json` scripts are exactly
   `typecheck` (`tsc --noEmit`), `test` (`node --test`), and `check`. No `start`, `serve`, `build`, or
   `dev` script; no server bundle.
4. **Does any CI provider exist?** **No.** No `.github/`, no CI config of any kind.
5. **Does any Docker/IaC/k8s/serverless config exist?** **No** (see item 2).
6. **Does the app have an API/server entrypoint?** **No.** No `express`/`fastify`/`http.listen`/`app.listen`
   in production source; the only matches are in negative-capability guards (which *forbid* such tokens) and
   domain files.
7. **Does the app have DB/schema/migrations?** **No production DB.** Persistence exists only as **in-memory
   repository adapters** behind ports (Impl 010); no schema, no migrations, no DB driver/dependency.
8. **Does the app have an auth/user model?** **No.** No auth, no user/session model, no credential-of-user
   concept (provider *credentials* are a separate, injected, sealed concern).
9. **Does the app have a UI/frontend runtime?** **No.** No frontend, no static site, no rendering target
   beyond the deterministic text `rendering` module (a domain-presentation boundary, not a UI runtime).
10. **Is current live-provider behavior manual/operator-only?** **Yes.** `liveProviderSmoke` (Impl 026) is
    pure/injected; the only executable surface is the manual `scripts/operator-live-smoke.mjs` (Impl 027),
    outside `src`, outside the default suite, outside CI, no npm script.
11. **Should the deployment target be selected before API/auth/DB?** **No.** A deployment target presupposes a
    deployable runtime surface; Aurora has none. The product runtime surface (what actually gets deployed)
    must be decided first.
12. **Should the deployment target drive secret-provider selection?** **Yes.** Spec 030 already established
    that provider choice follows the hosting/runtime identity model — i.e. it follows the deployment target.
13. **Does source precedence depend on the deployment target?** **Partly.** Precedence between process-env,
    managed, and cloud sources only becomes meaningful once a real runtime injects more than one source;
    until a runtime/target exists it stays an independent, deferred decision.
14. **Should the CI-live lane remain absent?** **Yes.** No CI exists; introducing one or a live lane is out
    of scope and would violate the no-default-live-call invariant.
15. **Can production rollout be claimed yet?** **No.** There is no runtime surface, no target, no provider,
    no rollout — and this spec claims none.

---

## 4. Decision Framework (deployment-target selection criteria)

`[DECISION]` A concrete deployment target may be adopted only when the following can be answered from real
repository/project evidence. Until then, the criteria themselves are the deliverable.

| # | Criterion | What must be true to select |
| --- | --- | --- |
| 1 | **Runtime fit** | A deployable product runtime surface exists (API / worker / scheduled job / UI) for the target to host. |
| 2 | **Operational simplicity** | The target's operational burden matches the team's capacity; it adds no platform the project hasn't chosen. |
| 3 | **Security / secrets model** | How secrets reach the runtime on that target is understood. |
| 4 | **Runtime identity model** | The identity the runtime authenticates as (role / workload / managed identity / none) is known. |
| 5 | **CI/CD compatibility** | The target can be built/deployed by a known (or future) CI provider without forcing a live lane. |
| 6 | **Local development parity** | Local/dev flow remains usable without the target (the current `node --test` + manual script flow stays valid). |
| 7 | **Cost** | The cost model is acceptable for the project's stage. |
| 8 | **Observability needs** | The runtime's observability requirements are known (deferred to implementation). |
| 9 | **Data persistence needs** | Whether the runtime needs a production DB is decided (currently in-memory only). |
| 10 | **Future DB/auth/API/UI needs** | The minimum product surface (and its growth) is understood enough to size the target. |
| 11 | **Secret-provider alignment** | The target implies (or is compatible with) the eventual secret provider (Spec 030). |
| 12 | **Operator-smoke compatibility** | Selection does not require changing the manual operator entrypoint. |
| 13 | **No-default-live-call preservation** | Live calls stay disabled by default, behind `LiveCallPolicy`, opt-in + CI guard + `validateDraft` intact. |
| 14 | **Deployment rollback model** | The target's rollback story is understood (deferred to implementation). |
| 15 | **Least irreversible commitment** | The choice avoids lock-in disproportionate to current evidence. |

`[FACT]` Criteria 6, 12, 13 are **already satisfied** by the current architecture. Criterion **1 (runtime
fit)** is the **gating, currently-unmet** criterion: there is no product runtime surface to deploy. Criteria
3–5, 9–11 follow from a runtime surface + product-shape decision that does not exist yet.

---

## 5. Options Evaluated (decision level only)

`[FACT]` No implementation details, no deployment files. Each option is judged against §4 — chiefly criterion
1 (is there anything to host?).

| Option | Decision-level fit | Gating evidence present? |
| --- | --- | --- |
| **No deployment target selected yet** | Preserves the operator/manual architecture; commits to nothing premature; lets the runtime-surface decision come first. | **N/A** — requires no missing evidence. |
| **Single VM / EC2-style host** | Maximum control; heavy ops burden; presupposes a long-running server process Aurora does not have. | **No** — no server runtime surface; no platform context. |
| **Container platform** | Portable; presupposes a containerizable runtime + a registry/orchestrator choice. | **No** — no runtime to containerize; no platform chosen. |
| **Managed app platform** (Heroku/Render/Railway/Fly) | Low ops; fast; presupposes a web/process entrypoint and a billing/account commitment. | **No** — no web/process entrypoint exists. |
| **Serverless platform** (Lambda/Cloud Run/Functions) | Scales to zero; presupposes a function/HTTP handler shape + a cloud account (which would also fix the secret provider). | **No** — no handler surface; would prematurely fix the cloud/provider. |
| **Kubernetes** | Maximum flexibility; maximum operational surprise; far beyond current evidence. | **No** — disproportionate to a domain-kernel-only project. |
| **Static / frontend-only platform** | Fits a UI/SPA; Aurora has no frontend runtime. | **No** — no UI runtime exists. |

`[FACT]` Every concrete platform shares the same blocking gap: **criterion 1 cannot be answered** — there is
no deployable runtime surface. Choosing a platform now would be selecting a host *for a runtime that does not
exist*, manufacturing both a product-shape decision and (for serverless/cloud options) a secret-provider
commitment — exactly the casual, premature choice this spec forbids.

---

## 6. Decision

`[DECISION]` **No production deployment target selected yet.**

Aurora **defers** deployment-target selection. The decision is blocked not by platform preference but by a
missing prerequisite: there is **no deployable production runtime surface** (no API/server/worker/UI), and no
repository/project signal naming any platform.

### 6.1 What evidence is missing

- A defined **product runtime surface** — what actually gets deployed and run (API? scheduled worker?
  CLI/operator tool? UI?).
- A documented **production hosting/platform target** (there is none — no `.github/`, Dockerfile, IaC,
  deploy/ops docs, runtime dependency, or `start`/`serve` script).
- The **runtime identity / secrets-injection model** that the surface + target would require.
- Whether the runtime needs **production persistence / auth / API** (today: in-memory only, none of these).

### 6.2 What criteria must be satisfied before selection

Criterion 1 (runtime fit) above all: a deployable runtime surface must exist. Then criteria 3–5 and 9–11
(secrets model, runtime identity, CI/CD, persistence, future product needs, provider alignment) become
answerable. Selecting a target before a runtime surface inverts the dependency order.

### 6.3 Why deferral is safer than a premature deployment choice

- Choosing a platform now would manufacture a product-shape decision (what the runtime *is*) by implication,
  and — for serverless/cloud options — silently fix the secret provider Spec 030 deliberately deferred.
- It would create irreversible-ish commitments (account, billing, runtime identity, ops ownership) ahead of
  any evidence.
- Nothing is blocked by waiting: the domain kernel, seams, and manual operator flow all keep working.

### 6.4 What remains usable today

- The full domain kernel + integration seams (observation → reasoning → understanding → decision-support →
  athlete; rendering; delivery; event-recording; application-orchestration).
- In-memory persistence adapters behind ports (Impl 010).
- The sealed local credential path (`ProcessEnvironmentCredentialSourceAdapter` →
  `EnvironmentProviderCredentialResolver`, Impl 023/022).
- The provider-neutral cloud-secret adapter contract (Impl 029) and the manual operator smoke (Impl 027) —
  unchanged.

### 6.5 Why the current architecture still has value without deployment selection

The architecture's value is **correctness by construction**, not deployment. Every boundary (validation,
fail-closed credentials, redaction, no-default-live-call, explicit orchestration, ref-only events) holds
independent of where it runs. Deferring the target costs nothing and preserves optionality; the seams are the
durable asset and will receive whatever runtime surface and platform are chosen next.

### 6.6 Recommended next mission

```text
Spec 032 — Product Runtime Surface Boundary
```

`[DECISION]` The correct next decision is **not** "which platform" but "what is the deployable product
runtime surface" — the entrypoint(s) that would actually run in production (e.g. a minimal API, a scheduled
worker, or an operator/CLI surface), defined behaviorally and safely (no live-call enablement, no rollout).
Once a runtime surface exists, criterion 1 is met and **Spec 031 can be revisited** to select a target; that
target then unblocks **Spec 030** (secret provider) and the corresponding `Tech Spec 030A` / `Tech Spec 031A`
implementation plans. Until then, deployment-target selection stays deferred by explicit criteria, not by
omission.

---

## 7. Required Behavioral Rules (hold regardless of the decision)

This spec, and any future selection it eventually records, must obey:

1. Deployment target selection must not add deployment files.
2. Deployment target selection must not add CI config.
3. Deployment target selection must not add cloud SDKs.
4. Deployment target selection must not add dependencies.
5. Deployment target selection must not add secrets.
6. Deployment target selection must not create production credentials.
7. Deployment target selection must not create production rollout.
8. Deployment target selection must not enable live calls.
9. Deployment target selection must not bypass `LiveCallPolicy`.
10. Deployment target selection must not bypass operator opt-in.
11. Deployment target selection must not bypass the CI guard.
12. Deployment target selection must not bypass `validateDraft`.
13. Deployment target selection must not change operator smoke.
14. Deployment target selection must not introduce a source-precedence implementation.
15. Deployment target selection must not create delivery.
16. Deployment target selection must not record events.
17. Deployment target selection must not create evidence.
18. Deployment target selection must not create athlete decisions.
19. Deployment target selection must not mutate domain state.
20. Deployment target selection must not weaken guards (incl. the process-env one-file seal).

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — No deployment evidence.** *Given* no deployment files or production runtime docs exist, *when*
deployment-target selection is considered, *then* selection is **deferred** and the missing evidence is
recorded (§6.1). — **This is the live case today.**

**UC2 — Deployment target documented.** *Given* a production deployment target is documented, *when*
selection is considered, *then* the spec may select it **only** if it aligns with Aurora's safety and runtime
constraints (§4), or it must justify divergence.

**UC3 — Deployment target selected.** *Given* a target is selected in a (future) revision, *when* the spec is
complete, *then* **no** deployment implementation and **no** production rollout has occurred — selection is a
documentation decision only.

**UC4 — Deployment target deferred.** *Given* selection is deferred, *when* the spec is complete, *then* the
current operator/manual architecture remains valid and usable (§6.4).

**UC5 — Secret-provider dependency.** *Given* secret-provider selection depends on the deployment target,
*when* the target is absent, *then* secret-provider selection (Spec 030) remains deferred.

**UC6 — CI default.** *Given* the target is selected or deferred, *when* CI runs (if any ever exists), *then*
no live provider call and no secret lookup is introduced by default.

**UC7 — Operator smoke.** *Given* the target is selected or deferred, *when* `scripts/operator-live-smoke.mjs`
is inspected, *then* its behavior is unchanged.

**UC8 — Domain isolation.** *Given* the target is selected or deferred, *when* domain modules are inspected in
any future implementation, *then* they import no deployment/platform code.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- **No target without evidence.** *Given* the repo names no deployment target/runtime surface, *when* this
  spec concludes, *then* it records "no production deployment target selected yet." ✅ (met — §6).
- **Selected target maps to reality.** *Given* any future selection, *when* recorded, *then* it cites the
  documented runtime surface + platform evidence it aligns with. (criterion gate, §4.1).
- **No deployment files added by this spec.** *Given* this spec, *when* the tree is inspected, *then* no
  Dockerfile/IaC/k8s/CI/platform config appears. ✅
- **No CI config added by this spec.** ✅ (no `.github/` introduced).
- **No SDK/dependency change.** *Given* this spec, *when* `package.json`/lockfile are inspected, *then* they
  are unchanged. ✅
- **No code/test change.** *Given* this spec, *when* `src/` is inspected, *then* it is unchanged. ✅
- **No live-call enablement.** *Given* this spec, *when* live paths are inspected, *then* they remain
  disabled-by-default behind `LiveCallPolicy`. ✅
- **No operator smoke change.** ✅ (script unchanged).
- **No CI credential lane.** ✅ (none introduced).
- **No source-precedence implementation.** ✅
- **No domain coupling.** *Given* this spec, *when* domain modules are inspected, *then* none imports
  deployment/platform code. ✅
- **No production rollout claim.** *Given* this spec, *when* read end-to-end, *then* it claims no rollout. ✅
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  710/710 pass. ✅

---

## 10. Relationship To Existing Architecture

- **Spec 030** — secret-provider selection was deferred *because* the deployment target is unknown; Spec 031
  is the upstream decision that, once made, unblocks it.
- **Impl 029** — the provider-neutral cloud-like adapter contract exists; a provider-specific adapter remains
  future and depends on the target.
- **Impl 028** — the provider-neutral managed-secret seam (`ManagedSecretStoreClient`) is the interface any
  future provider adapter implements.
- **Impl 027** — the operator smoke entrypoint remains manual and unchanged; it is the *only* current
  executable surface and is **not** a production runtime.
- **Impl 023** — the one-file `process.env` source adapter remains sealed and valid (the live local
  credential path while deployment is deferred).
- **Impl 021** — live calls remain behind `LiveCallPolicy`, disabled by default; target selection does not
  touch this gate.
- **Impl 014** — provider output validation (`validateDraft`) remains mandatory regardless of runtime.
- **Core product architecture** — the domain kernel + integration seams exist, but a **production runtime
  surface remains separate and undefined** (the subject of the recommended Spec 032).

---

## 11. Forbidden Behaviors

```text
deployment file creation · CI workflow creation · cloud SDK installation · dependency change ·
package.json edit · package-lock edit · Dockerfile creation · IaC creation · Kubernetes manifest creation ·
real cloud call · real secret lookup · secret creation · CI secret injection · CI live lane ·
automatic live call · source precedence implementation · operator smoke behavior change ·
process-env guard weakening · domain import of deployment code · delivery trigger · event recording ·
evidence creation · athlete decision creation · domain mutation · telemetry/model evaluation ·
production rollout claim
```

---

## 12. Open Questions For a Future Tech Spec (carried forward)

Deliberately **not** resolved here; they belong to later specs/tech specs once a runtime surface and target
exist:

1. Where will Aurora run first?
2. Is the first production target a server, container, managed app, VM, or serverless?
3. Does Aurora need API/auth/DB before deployment-target implementation?
4. Which CI provider, if any, will exist?
5. How will runtime identity be represented?
6. How will secrets be injected/resolved on the target?
7. Which secret provider follows from the target (Spec 030)?
8. How is source precedence configured?
9. Is live smoke ever allowed in CI?
10. How are deployment rollbacks handled?
11. How is observability handled?
12. What minimum product surface is deployed first (Spec 032)?

---

## 13. Success Criteria

Can Aurora decide, from real evidence, whether to adopt a concrete production deployment target — **without**
adding deployment infrastructure, cloud SDKs, secrets, CI credentials, live-call behavior, source precedence,
domain coupling, or a product-rollout claim? **Yes — and the evidence says defer.** No deployable product
runtime surface and no platform signal exist, so criterion 1 is unmet; deployment-target selection is
deferred behind explicit criteria, and the correct next decision is **what the deployable product runtime
surface is** (`Spec 032 — Product Runtime Surface Boundary`), after which Spec 031 is revisited to select a
target, unblocking Spec 030 (secret provider) and the corresponding implementation plans. Validation at
authorship: `tsc --noEmit` clean; `node --test` 710/710; no code, test, package, deployment, CI, SDK, or
dependency change.
