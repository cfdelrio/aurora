# Aurora — Specification 030 — Secret Provider Selection Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **decision boundary** for
> selecting — or explicitly deferring — a concrete secret-provider target behind the provider-neutral
> cloud-secret adapter contract introduced in Implementation 029 (`2d46e12`). It is **behavioral-only**: it
> implements no code, writes no technical spec, selects no SDK, adds no dependency, changes no live-call
> behavior, changes no operator smoke behavior, weakens no guard, and introduces no source-precedence
> implementation. Recent sequence: `f0ff8c1` (Spec 029) → `f8ca43c` (Tech Spec 029A) → `2d46e12` (Impl 029)
> → `fe9f403` (Docs post Impl 029). Validation at authorship: `tsc --noEmit` clean; `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes a **decision**: under what evidence Aurora should adopt a concrete secret
  provider, or continue to defer that choice. It defines no file layout, no SDK, no cloud provider identity,
  no IAM configuration, and no deployment mechanism.
- `[FACT]` It opens **no** new code edge. Impl 029 already provides the provider-neutral adapter contract
  (`CloudSecretValueClient` → `CloudSecretStoreAdapter` → `ManagedSecretStoreClient`). This spec only decides
  whether — and on what basis — a *concrete* provider should sit behind that contract next.
- `[DECISION]` A provider may be selected **only** if repository docs, deployment reality, or project
  constraints clearly justify it. A provider must **not** be selected merely because it is common.

---

## 1. Context

`[FACT]` After Impl 029, the credential chain is:

```text
CloudSecretValueClient        (injected cloud-like transport boundary; MAY throw — the adapter catches)
  → CloudSecretStoreAdapter   (implements ManagedSecretStoreClient; maps + redacts; fails closed)
    → ManagedSecretStoreClient (Aurora provider-neutral seam, Impl 028)
      → ManagedSecretCredentialSource (async pre-fetch into EnvironmentCredentialSource)
        → EnvironmentProviderCredentialResolver (synchronous; unchanged since Impl 022)
```

`[FACT]` Impl 029 deliberately did **not** choose AWS/GCP/Azure, add SDKs, add dependencies, make network
calls, add real secret access, change operator smoke, or introduce source precedence. The only implementation
of `CloudSecretValueClient` that exists is `FakeCloudSecretValueClient` (deterministic; no real secret).

`[GAP]` There is a working provider-neutral **contract**, but **no concrete provider behind it**. The chain
can be fed today from the real process environment (`ProcessEnvironmentCredentialSourceAdapter`, Impl 023) or
from injected fakes (tests). It has **no** path to a managed cloud secret store, because no such adapter — and
no provider choice — exists.

---

## 2. Central Question

> What evidence is required before Aurora selects a concrete secret provider — and given the current
> repository, is that evidence present?

The answer must preserve, regardless of outcome:

```text
provider selection ≠ SDK installation
provider selection ≠ production rollout
provider selection ≠ live-call enablement
provider selection ≠ CI credentials
provider selection ≠ source precedence
provider selection ≠ secret rotation
provider selection ≠ telemetry
provider selection ≠ provider output trust
provider selection ≠ evidence
provider selection ≠ athlete decision
```

---

## 3. Required Analysis (grounded in the real repository)

Each item was checked against the actual repo at authorship.

1. **Does the repo name a production deployment target?** **No.** No `README.md` / `MANIFESTO.md`
   deployment section; no ops/runbook/infra/deploy docs anywhere under `docs/`.
2. **Does the repo name AWS/GCP/Azure or any cloud provider as a target?** **No.** The only occurrences of
   `aws`/`gcp`/`azure`/`vault`/`amazonaws`/`googleapis` are **negative-capability guards** that *forbid*
   those tokens (`managed-secret-negative-capability.test.ts`, `cloud-secret-store-adapter-negative-capability.test.ts`)
   and **deferral notes** in Specs 022 / 029 / 029A. None is a selection.
3. **Does package/deployment config imply a provider?** **No.** `package.json` has **no** `dependencies`
   key; devDependencies are exactly `typescript` + `@types/node`. No Dockerfile, no `*.tf`, no
   `docker-compose`, no `Procfile`, no `vercel.json` / `fly.toml` / `app.yaml`, no `.github/` (no CI at all).
4. **Is the current runtime operator/development or production context?** **Operator/development only.** The
   one manual operational surface is `scripts/operator-live-smoke.mjs` (Impl 027) — outside `src`, outside
   the default suite, outside CI, no npm script. There is no production runtime, scheduler, or entrypoint.
5. **What should secret-provider choice follow — hosting, CI, security policy, cost, or familiarity?** It
   must follow the **hosting/deployment target first** (so runtime identity/IAM and the SDK are aligned with
   where the code actually runs), with security model, CI safety, and operational familiarity as secondary
   tie-breakers. **None of these inputs exists in the repo yet**, so the primary driver is absent.
6. **Would selecting a provider now create hidden production commitments?** **Yes.** Naming a provider would
   imply a runtime identity model (IAM role / workload identity), a region, an SDK, and an operational
   ownership that the project has not decided — a commitment disguised as a documentation choice.
7. **Must source precedence be specified before provider wiring?** **No — and it must stay separate.** A
   single provider adapter resolves one configured secret; precedence (process-env vs managed vs cloud,
   ordering, override) is an independent decision and must not be bundled into provider selection.
8. **Should provider selection include rotation/cache/TTL now?** **No.** Those are operational concerns of a
   *wired, deployed* provider; they belong to a later tech spec / implementation, not to the selection
   decision.
9. **Should the CI-live lane remain absent?** **Yes.** No CI exists; introducing a live lane or CI secret is
   explicitly out of scope and would violate the no-default-live-call invariant.
10. **Should operator smoke remain unchanged?** **Yes.** `scripts/operator-live-smoke.mjs` stays manual and
    untouched; no provider-specific secret source is wired into it by this spec.
11. **Does the local env / manual flow remain valid?** **Yes.** The `ProcessEnvironmentCredentialSourceAdapter`
    → `EnvironmentProviderCredentialResolver` chain (Impl 023/022) remains the valid, sealed local path.
12. **Should production secret wiring be separate from provider selection?** **Yes.** Selecting a provider,
    implementing its adapter, and wiring it into a production rollout are three distinct slices; this spec
    only addresses the first decision.

---

## 4. Decision Framework (provider-selection criteria)

`[DECISION]` A concrete provider may be adopted only when the following criteria can be answered from real
repository/deployment evidence. Until then, the criteria themselves are the deliverable.

| # | Criterion | What must be true to select |
| --- | --- | --- |
| 1 | **Deployment alignment** | A production hosting/deployment target is documented; the provider is its native or clearly-justified secret store. |
| 2 | **Least operational surprise** | The provider matches where the team already operates; no new operational platform is implied solely by the secret store. |
| 3 | **Security model clarity** | The provider's access model is understood and documentable (who can read which secret, under what identity). |
| 4 | **IAM / runtime identity clarity** | The runtime identity the adapter would authenticate as is known (role / workload identity / managed identity). |
| 5 | **SDK / dependency impact** | The minimal SDK/dependency footprint is known and acceptable; a tech spec can justify it or choose an HTTP path. |
| 6 | **Local development compatibility** | Local/dev flow remains usable without the cloud provider (the env adapter path stays valid). |
| 7 | **CI safety** | No CI secret or live lane is required to select or to test the adapter (fakes only). |
| 8 | **Secret rotation support** | The provider's rotation model is known (to be handled in a later slice, not bundled here). |
| 9 | **Cache / TTL implications** | The caching/TTL behavior is understood (deferred to implementation). |
| 10 | **Failure semantics** | The provider's failures map cleanly onto the existing 4-state `ManagedSecretResolution` (already proven possible by Impl 029). |
| 11 | **Redaction guarantees** | Raw secret and raw provider response can be kept out of every output/audit/error (already enforced by the adapter contract). |
| 12 | **Testability with fakes** | The adapter remains fully testable with deterministic fakes, no network, no real secret. |
| 13 | **Domain isolation** | No domain module would need to import provider-specific code. |
| 14 | **Operator smoke stays manual** | Selection does not require changing the manual operator entrypoint. |
| 15 | **No-default-live-call invariant** | Selection preserves: live calls disabled by default, behind `LiveCallPolicy`, opt-in + CI guard + `validateDraft` intact. |

`[FACT]` Criteria 10–15 are **already satisfied** by the Impl 028/029 contract regardless of provider.
Criteria 1–4 are **the gating, currently-unanswerable** criteria: they require a deployment reality the repo
does not yet have. Criteria 5/8/9 are implementation concerns for a later tech spec.

---

## 5. Options Evaluated (behavioral/decision level only)

`[FACT]` No SDK details, endpoints, or implementation specifics are evaluated — only fit against §4.

| Option | Decision-level fit | Gating evidence present? |
| --- | --- | --- |
| **AWS Secrets Manager** | Natural *iff* the deployment target is AWS; implies IAM-role runtime identity; richer rotation. | **No** — no AWS deployment target documented. |
| **AWS SSM Parameter Store** | Lighter-weight AWS alternative (SecureString); same IAM/runtime-identity dependency; weaker native rotation. | **No** — same missing AWS context. |
| **GCP Secret Manager** | Natural *iff* the deployment target is GCP; implies workload-identity runtime model. | **No** — no GCP deployment target documented. |
| **Azure Key Vault** | Natural *iff* the deployment target is Azure; implies managed-identity runtime model. | **No** — no Azure deployment target documented. |
| **No provider selected yet** | Preserves the provider-neutral contract; keeps every invariant; commits to nothing premature. | **N/A** — requires no missing evidence. |

`[FACT]` Every concrete option shares the same blocking gap: **criterion 1 (deployment alignment) cannot be
answered**, and criteria 3–4 (security/IAM/runtime identity) follow from a deployment target that does not
exist. Selecting any of them now would be choosing a provider *to invent* a deployment reality, rather than
*to match* one — exactly the casual selection this spec forbids.

---

## 6. Decision

`[DECISION]` **No concrete provider selected yet.**

Aurora **defers** secret-provider selection. The provider-neutral cloud-secret adapter contract (Impl 029)
stands as the stable seam; a concrete AWS/GCP/Azure/Vault target is **not** chosen because the gating
evidence (a documented production deployment target and its runtime-identity model — criteria 1–4) is
**absent** from the repository.

### 6.1 What evidence is missing

- A documented **production deployment / hosting target** (where Aurora actually runs).
- The associated **runtime identity / IAM model** (the identity an adapter would authenticate as).
- Any **package/config/CI/IaC signal** implying a platform (there is none — no `.github/`, no Dockerfile, no
  IaC, no deploy/ops docs, no runtime dependencies).
- A **security policy** stating where production secrets must live.

### 6.2 Why deferral is safer than premature choice

- Selecting a provider now would manufacture a hidden production commitment (runtime identity, region, SDK,
  operational ownership) the project has not decided.
- The adapter contract is already provider-neutral and fully testable; nothing is blocked by waiting.
- A provider chosen to fit an imagined deployment would likely be re-recorded once a real target appears —
  wasted commitment, and a precedent for casual selection.

### 6.3 What remains usable today

- The full local/dev path: `ProcessEnvironmentCredentialSourceAdapter` → `EnvironmentProviderCredentialResolver`
  (Impl 023/022) — sealed, valid, unchanged.
- The provider-neutral cloud adapter contract (Impl 029) — ready to receive any concrete `CloudSecretValueClient`.
- The manual operator smoke entrypoint (Impl 027) — unchanged.
- Deterministic fake-driven testing of the entire chain — no real secret, no network.

### 6.4 Why Impl 029 still provides value without provider selection

Impl 029 fixed the **shape** of the boundary every future provider must satisfy: the failure-mapping into the
4-state `ManagedSecretResolution`, the fail-closed catch-all, and the redaction guarantees. When a deployment
target finally exists, the remaining work is *only* the concrete transport — the contract, the mapping, the
redaction, and the tests are already settled. Deferral costs nothing; the seam is the durable asset.

### 6.5 Recommended next mission

```text
Spec 031 — Production Deployment Target Boundary
```

`[DECISION]` The correct next decision is **not** "which secret provider" but "where does Aurora run." Once a
production deployment target (and its runtime-identity model) is documented, criteria 1–4 become answerable
and **Spec 030 can be revisited** to select a provider, followed by `Tech Spec 030A — <Provider> Secret
Adapter Implementation Plan`. Until then, provider selection stays deferred by explicit criteria, not by
omission.

---

## 7. Required Behavioral Rules (hold regardless of the decision)

This spec, and any future selection it eventually records, must obey:

1. Provider selection must not add SDKs.
2. Provider selection must not edit package files (`package.json` / `package-lock.json`).
3. Provider selection must not add real cloud calls.
4. Provider selection must not add real secrets.
5. Provider selection must not create CI credentials.
6. Provider selection must not enable live calls.
7. Provider selection must not bypass `LiveCallPolicy`.
8. Provider selection must not bypass operator opt-in.
9. Provider selection must not bypass the CI guard.
10. Provider selection must not bypass `validateDraft`.
11. Provider selection must not change operator smoke.
12. Provider selection must not introduce a source-precedence implementation.
13. Provider selection must not create delivery.
14. Provider selection must not record events.
15. Provider selection must not create evidence.
16. Provider selection must not create athlete decisions.
17. Provider selection must not mutate domain state.
18. Provider selection must not weaken the process-env one-file seal.
19. Provider selection must not expose a raw secret or raw cloud response.
20. Provider selection must not claim production rollout.

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — No deployment target documented.** *Given* no production deployment target is documented, *when*
provider selection is considered, *then* the spec **defers** selection and records the missing evidence
(§6.1). — **This is the live case today.**

**UC2 — Deployment target documented.** *Given* a production deployment target is documented, *when* provider
selection is considered, *then* the provider choice must align with that deployment reality (criterion 1) or
explicitly justify divergence.

**UC3 — Provider selected.** *Given* a provider is selected in a (future) revision of this spec, *when* the
spec is complete, *then* **no** SDK/dependency/code/test/package change has occurred — selection is a
documentation decision only.

**UC4 — Provider deferred.** *Given* provider selection is deferred, *when* the spec is complete, *then* Impl
029 remains valuable as the provider-neutral adapter contract (§6.4) and the local/dev path stays valid.

**UC5 — CI default.** *Given* provider selection occurs or is deferred, *when* CI runs (if any ever exists),
*then* no live provider call and no secret lookup is introduced by default.

**UC6 — Operator smoke.** *Given* provider selection occurs or is deferred, *when* `scripts/operator-live-smoke.mjs`
is inspected, *then* its behavior is unchanged.

**UC7 — Domain isolation.** *Given* provider selection occurs or is deferred, *when* domain modules are
inspected in any future implementation, *then* they import no provider-specific code.

**UC8 — Source precedence.** *Given* a provider is eventually selected, *when* source precedence is
considered, *then* precedence remains a **separate** explicit decision unless a future spec proves it must be
bundled (this spec proves it must **not** — §3.7).

---

## 9. Required Acceptance Criteria (Given / When / Then)

- **No provider without evidence.** *Given* the repo names no deployment target, *when* this spec concludes,
  *then* it records "no concrete provider selected yet." ✅ (met — §6).
- **Selected provider maps to deployment reality.** *Given* any future selection, *when* recorded, *then* it
  cites the documented deployment target it aligns with. (criterion gate, §4.1).
- **No SDK added by this spec.** *Given* this spec, *when* the tree is inspected, *then* no SDK appears. ✅
- **No package change by this spec.** *Given* this spec, *when* `package.json`/`package-lock.json` are
  inspected, *then* they are unchanged. ✅
- **No code/test change by this spec.** *Given* this spec, *when* `src/` is inspected, *then* it is
  unchanged. ✅
- **No live-call enablement.** *Given* this spec, *when* `LiveCallPolicy` and live paths are inspected, *then*
  they are unchanged and disabled-by-default. ✅
- **No operator smoke change.** *Given* this spec, *when* the operator script is inspected, *then* it is
  unchanged. ✅
- **No CI credential lane.** *Given* this spec, *when* CI config is inspected, *then* none is introduced
  (none exists). ✅
- **No source-precedence implementation.** *Given* this spec, *when* the credential chain is inspected, *then*
  no precedence logic is added. ✅
- **No domain coupling.** *Given* this spec, *when* domain modules are inspected, *then* none imports
  provider/cloud code. ✅
- **No production rollout claim.** *Given* this spec, *when* read end-to-end, *then* it claims no rollout. ✅
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  710/710 pass. ✅

---

## 10. Relationship To Existing Architecture

- **Impl 029** — the provider-neutral cloud-like adapter **contract** exists; a provider-specific adapter
  remains future. This spec decides *whether* to choose that provider now (it defers).
- **Impl 028** — the provider-neutral managed-secret seam (`ManagedSecretStoreClient`) exists and is the
  interface any provider adapter implements.
- **Impl 027** — the operator smoke entrypoint remains manual and unchanged.
- **Impl 023** — the one-file `process.env` source adapter remains sealed and valid; it is the live local
  credential path while provider selection is deferred.
- **Impl 021** — live calls remain behind `LiveCallPolicy`, disabled by default; provider selection does not
  touch this gate.
- **Impl 014** — provider output validation (`validateDraft`) remains mandatory; a credential becoming
  available never bypasses it.

---

## 11. Forbidden Behaviors

```text
SDK installation · dependency change · package.json edit · package-lock edit ·
real cloud call · real secret lookup · secret creation · CI secret injection · CI live lane ·
automatic live call · source precedence implementation · operator smoke behavior change ·
process-env guard weakening · domain import of provider code · delivery trigger · event recording ·
evidence creation · athlete decision creation · domain mutation · telemetry/model evaluation ·
production rollout claim
```

---

## 12. Open Questions For a Future Tech Spec (carried forward)

These are deliberately **not** resolved here; they belong to a future `Tech Spec 030A` *after* a deployment
target and provider are chosen:

1. Which SDK/package, if any, is required (or HTTP-only)?
2. Where should the provider-specific adapter live (still `rendering/application`, or a new approved surface)?
3. How should runtime identity be configured (role / workload identity / managed identity)?
4. How are secret refs configured safely (path / ARN / version / stage)?
5. How are permissions represented?
6. How are timeout / throttling / provider exceptions mapped (the 4-state mapping already exists; provider
   specifics to confirm)?
7. How is local development configured alongside the provider?
8. How is source precedence configured (separate Spec, per §3.7)?
9. Is cache/TTL allowed?
10. Is rotation observed?
11. Is a CI-live lane ever permitted?
12. Should operator smoke support a provider-specific secret source later?

---

## 13. Success Criteria

Can Aurora decide, from real evidence, whether to adopt a concrete secret provider behind the Impl 029
contract — **without** adding SDKs, leaking secrets, creating production rollout, changing live-call policy,
changing operator smoke, adding CI credentials, introducing source precedence, or coupling domain code to
infrastructure? **Yes — and the evidence says defer.** No production deployment target is documented, so
criteria 1–4 are unanswerable; provider selection is deferred behind explicit criteria, and the correct next
decision is **where Aurora runs** (`Spec 031 — Production Deployment Target Boundary`), after which Spec 030
is revisited to select a provider and `Tech Spec 030A` plans its adapter. Validation at authorship:
`tsc --noEmit` clean; `node --test` 710/710; no code, test, package, SDK, provider, or dependency change.
