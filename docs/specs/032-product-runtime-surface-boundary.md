# Aurora — Specification 032 — Product Runtime Surface Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral boundary** for
> Aurora's first deployable product runtime surface — *what deployable thing exists first*. It is
> **behavioral-only**: it implements no code, writes no technical spec, adds no API/UI/worker code, no
> DB/schema/migrations, no auth, no package script, no deployment file, no CI config, no SDK, no dependency,
> no secret; it changes no operator smoke and no live-provider behavior, and weakens no guard. Recent
> sequence: `2d46e12` (Impl 029) → `fe9f403` (Docs post 029) → `712727d` (Spec 030 — provider deferred) →
> `a7932f5` (Spec 031 — deployment target deferred). Validation at authorship: `tsc --noEmit` clean;
> `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes a **decision**: what Aurora's first deployable product runtime surface
  should be, or — with explicit evidence — why that choice is deferred. It defines no runtime entrypoint, no
  interface shape, no file layout.
- `[FACT]` It opens **no** code edge. Nothing about the current codebase changes.
- `[DECISION]` A runtime surface may be selected **only** if repo evidence and architecture clearly justify
  one. A surface must **not** be chosen merely because it is common.

---

## 1. Context

`[FACT]` The blocking chain established by Specs 030–031:

```text
secret provider selection   ← blocked by deployment target (Spec 030)
deployment target selection ← blocked by product runtime surface (Spec 031)
product runtime surface      ← THIS spec
```

`[FACT]` Aurora has a strong **domain/application kernel** + safety boundaries, but **no deployable product
runtime**. The most product-shaped pieces that exist are application *services* and *adapters*, not runnable
entrypoints:

- `orchestrateRenderDeliver` (Impl 025) — an **async application-service composition over injected
  collaborators** (`orchestration-command` / `-dependencies` / `-result` / `-trace`). It is *called* with
  dependencies; it does not run itself.
- `ingestManualInput` (Impl 013) — a **pure function** manual-input adapter.
- `delivery` (Impl 016) — exposes a display-eligible message to a **deterministic test-only sink** + an
  audit record; no real channel.
- `scripts/operator-live-smoke.mjs` (Impl 027) — a **manual operator wiring check**, outside `src`, outside
  the default suite/CI, no npm script. **Not** a product runtime.

`[GAP]` Aurora has a *capable, operator-drivable flow* but **no evidence of who the first product user is**
(operator? athlete? coach? system?) or **how they interact** (CLI? API? UI? worker?). A runtime *surface
shape* cannot be chosen without that — choosing one would smuggle in an undecided product-interaction model.

---

## 2. Central Question

> What is Aurora's first deployable product runtime surface, and what must it expose — or explicitly not
> expose — so that future deployment-target, secret-provider, and API/auth/DB/UI decisions can proceed
> without collapsing Aurora's domain boundaries or safety invariants?

The answer must preserve, regardless of outcome:

```text
product runtime surface ≠ domain kernel
product runtime surface ≠ deployment target
product runtime surface ≠ production rollout
product runtime surface ≠ secret provider selection
product runtime surface ≠ SDK installation
product runtime surface ≠ live-call enablement
product runtime surface ≠ provider output trust
product runtime surface ≠ evidence
product runtime surface ≠ athlete decision
operator smoke script ≠ product runtime
application orchestration ≠ API/server by itself
```

---

## 3. Required Analysis (grounded in the real repository)

### 3.1 Does the repo currently have… (each checked against real source)

| Capability | Present? | Evidence |
| --- | --- | --- |
| API/server runtime | **No** | no `express`/`fastify`/`http.listen`/`app.listen` in production source. |
| CLI product runtime | **No** | only the operator smoke script (operational, not product). |
| Worker runtime | **No** | no queue consumer / job processor entrypoint. |
| UI/frontend runtime | **No** | no frontend, no static site; `rendering` is a domain-presentation boundary, not a UI. |
| Auth/session/user boundary | **No** | no user/session/auth model anywhere. |
| DB/schema/persistence runtime | **No** | only in-memory repository adapters behind ports (Impl 010); no schema/migrations/driver. |
| Delivery-channel runtime | **No** | `delivery` targets a deterministic test-only sink; no real channel. |
| Queue/event-bus runtime | **No** | `event-recording` is an append-only ref-only log; no bus. |
| Deployment package script | **No** | `package.json` scripts are only `typecheck`/`test`/`check`. |
| Runtime entrypoint | **No** | no `start`/`serve`/`main` production entrypoint. |
| Product-facing command | **No** | none. |
| Operator-only command | **Yes (non-product)** | `scripts/operator-live-smoke.mjs` (Impl 027). |

### 3.2 Deeper analysis

1. **Can `application-orchestration` serve as the first product runtime core?** **As a core, partly; as a
   runtime, no.** `orchestrateRenderDeliver` is the natural *composition core* a runtime would call, but it
   is a service over **injected** collaborators — it is not itself a deployable entrypoint. A runtime surface
   would *wrap* it; the service ≠ the surface.
2. **Is the delivery boundary ready for product runtime exposure?** **Only to a test sink.** Real product
   delivery needs a channel decision that does not exist; the boundary is safe but not channel-ready.
3. **Are rendering/provider boundaries safe to expose?** **Yes, behaviorally** — output passes mandatory
   `validateDraft`; live calls stay fail-closed/opt-in. But "safe to expose" ≠ "a surface is decided."
4. **Is the athlete-decision flow ready for product runtime exposure?** **Partially** — `athlete` holds
   Purpose (Impl 007) + AthleteDecision (Impl 009), but not full Athlete/DecisionOutcome; exposing it
   presupposes an athlete-facing interaction model that is undecided.
5. **Can the manual input adapter feed a first runtime?** **Yes** — `ingestManualInput` is a pure, ready
   intake function a runtime could call.
6. **Does no-DB / in-memory state block a product runtime?** **Not necessarily** — an operator/offline
   runtime can run on in-memory state; an athlete-facing, multi-session runtime would need persistence
   first. The answer depends on the (undecided) user.
7. **Must auth/user identity precede a product runtime?** **Depends on the user.** Operator/offline: no.
   Athlete/coach-facing: yes. Undecided until the interaction model is chosen.
8. **Must UI precede API?** **No** — neither is forced; the order depends on the interaction model.
9. **Must API precede the deployment target?** **Yes for a networked surface** — a deployment target
   presupposes *something deployable*; that is exactly why Spec 031 deferred to this spec.
10. **Can a CLI/operator runtime be product-valid, or only operational?** **It can be product-valid** *iff*
    the product's first user is an operator — which is itself an undecided interaction-model fact. Today's
    operator script is purely operational (a wiring check), not product.

`[FACT]` Across every item the same dependency appears: the runtime *shape* is determined by **who the first
user is and how they interact** — a product-interaction-model decision the repo does not document.

---

## 4. Decision Framework (runtime-surface selection criteria)

`[DECISION]` A concrete runtime surface may be adopted only when the following can be answered from real
repo/product evidence. Until then, the criteria are the deliverable.

| # | Criterion | What must be true to select |
| --- | --- | --- |
| 1 | **Minimum product value** | The surface delivers real value to a *named* first user. |
| 2 | **Boundary safety** | Exposure crosses no domain boundary unsafely; all existing seams hold. |
| 3 | **Domain isolation** | No domain module would import runtime/infrastructure code. |
| 4 | **State/persistence requirements** | The surface's persistence needs are known (in-memory may suffice, or a DB decision is triggered). |
| 5 | **Identity/auth requirements** | Whether the surface needs auth/user identity is known (operator: no; athlete/coach: yes). |
| 6 | **Observability requirements** | Known (deferred to implementation). |
| 7 | **Delivery requirements** | Whether the surface needs a real delivery channel is known. |
| 8 | **Operator vs athlete-facing distinction** | The first user is named; the surface matches that user. |
| 9 | **Preserve "inference ≠ fact"** | The surface never presents inference as fact. |
| 10 | **Preserve no-default-live-call** | Live calls stay disabled-by-default, behind `LiveCallPolicy`, opt-in + CI guard + `validateDraft`. |
| 11 | **Provider output validation mandatory** | `validateDraft` stays mandatory on any exposed provider output. |
| 12 | **Avoid premature DB/auth/UI/deployment** | The surface does not force those choices before their own specs. |
| 13 | **Testability with deterministic fakes** | The surface is testable with fakes, no network/secret. |
| 14 | **Deployment-readiness impact** | Choosing it meaningfully unblocks Spec 031 (deployment target). |
| 15 | **Least irreversible commitment** | The choice avoids lock-in disproportionate to current evidence. |

`[FACT]` Criteria 2–3, 9–11, 13 are **already satisfiable** by the architecture for any surface. Criteria
**1, 5, 7, 8 (minimum value to a *named* user; auth/delivery needs; operator-vs-athlete)** are the **gating,
currently-unanswerable** criteria — they all require a product-interaction-model decision that does not
exist.

---

## 5. Options Evaluated (decision level only)

`[FACT]` No implementation details, no runtime files. Each judged against §4 — chiefly criteria 1/8 (value
to a *named* first user).

| Option | Decision-level fit | Gating evidence present? |
| --- | --- | --- |
| **No product runtime selected yet** | Preserves the kernel + operator/manual architecture; lets the interaction-model decision come first. | **N/A** — requires no missing evidence. |
| **Operator-only CLI runtime** | **Strongest candidate**: reuses `ingestManualInput → orchestrateRenderDeliver → delivery(sink)` over in-memory/injected collaborators; no auth/DB/UI/network/deployment; the operator already exists as a trusted actor. | **Partly** — capability exists, but presupposes *first user = operator*, an undecided interaction-model fact. |
| **Athlete-facing CLI/runtime command** | Direct product value, but presupposes athlete identity, auth, persistence, and a fuller Athlete model. | **No** — athlete interaction model + auth/DB undecided. |
| **HTTP API surface** | Networked, integrable; forces deployment target, runtime identity, and (usually) auth/persistence. | **No** — no consumer/contract decided; forces downstream commitments. |
| **Worker/job-processor runtime** | Fits scheduled/async flows; presupposes a trigger source + queue that do not exist. | **No** — no trigger/queue; no scheduling decision. |
| **Web UI/frontend runtime** | Most user-facing; presupposes API + auth + design + hosting. | **No** — nothing upstream exists. |
| **Hybrid API + UI** | Maximum surface; maximum premature commitment. | **No** — disproportionate to current evidence. |
| **Manual/offline batch runtime** | Could process inputs offline; still presupposes who consumes outputs and how. | **No** — consumer/interaction undecided. |

`[FACT]` Every concrete surface shares the same gap: the **first user and interaction model are undecided**.
The operator-only CLI is the *least-committing* candidate and the natural first step — but selecting it now
would itself assert "the product's first user is an operator," a product-interaction-model decision the repo
does not justify. That is the same premature-commitment trap Specs 030–031 avoided.

---

## 6. Decision

`[DECISION]` **No product runtime surface selected yet.**

Aurora **defers** runtime-surface selection. The decision is blocked not by capability — the kernel can
already be driven end-to-end over injected collaborators — but by a missing upstream decision: **who the
product's first user is and how they interact** (the product interaction model). A surface *shape*
(CLI/API/UI/worker) is meaningless until that is named.

### 6.1 What evidence is missing

- The **first user**: operator, athlete, coach, or system? (open question #2; repo documents none).
- The **interaction model**: how that user initiates and consumes an Aurora flow (command? request? screen?
  scheduled job?).
- The consequent **auth / persistence / delivery-channel** needs (all undecided, and all *follow* from the
  user, not the other way around).

### 6.2 What product decision must happen first

The **product interaction model** — a behavioral decision naming the first user and how they interact —
must precede the runtime surface. With it, criteria 1/5/7/8 become answerable and a surface can be chosen
honestly (the operator-only CLI being the leading candidate *if* operator-first is confirmed).

### 6.3 Why deferral is safer than a premature runtime choice

- Choosing a surface now would assert an undecided product-interaction model by implication, and (for
  API/UI/athlete options) cascade into premature auth/DB/deployment/provider commitments.
- The blocking chain stays honest: runtime ← interaction model; deployment ← runtime; provider ← deployment.
  Skipping a link manufactures commitments out of order.
- Nothing is blocked by waiting: the kernel, seams, and manual operator flow keep working and stay fully
  testable.

### 6.4 What remains usable today

- The full domain kernel + integration seams (observation → reasoning → understanding → decision-support →
  athlete; rendering; delivery; event-recording; application-orchestration).
- `orchestrateRenderDeliver` as the ready composition core a future runtime will wrap.
- `ingestManualInput` as a ready intake function.
- In-memory persistence (Impl 010), the sealed local credential path (Impl 023/022), the provider-neutral
  cloud-secret contract (Impl 029), and the manual operator smoke (Impl 027) — all unchanged.

### 6.5 Why the current architecture still has value without runtime selection

Aurora's value is **correctness by construction**: validation-mandatory output, fail-closed credentials,
redaction, no-default-live-call, explicit orchestration, ref-only events, and "inference is never presented
as fact." These hold independent of any runtime surface. Deferring the surface costs nothing and preserves
optionality; the composition core and seams are the durable assets and will receive whatever surface the
interaction model justifies.

### 6.6 Recommended next mission

```text
Spec 033 — Product Interaction Model Boundary
```

`[DECISION]` The correct next decision is **not** "which surface" but "who is Aurora's first user and how do
they interact." Once the interaction model is named, criteria 1/5/7/8 are met and **Spec 032 can be
revisited** to select a surface (likely operator-CLI-first); that surface then unblocks **Spec 031**
(deployment target), which unblocks **Spec 030** (secret provider) and the implementation plans. Until then,
runtime-surface selection stays deferred by explicit criteria, not by omission.

---

## 7. Required Behavioral Rules (hold regardless of the decision)

This spec, and any future selection it eventually records, must obey:

1. Runtime-surface selection must not add runtime code.
2. Must not add API/UI/worker files.
3. Must not add DB/schema/migrations.
4. Must not add auth/session/user implementation.
5. Must not add package scripts.
6. Must not add deployment files.
7. Must not add CI config.
8. Must not add SDKs/dependencies.
9. Must not add secrets.
10. Must not create production rollout.
11. Must not enable live calls.
12. Must not bypass `LiveCallPolicy`.
13. Must not bypass operator opt-in.
14. Must not bypass the CI guard.
15. Must not bypass `validateDraft`.
16. Must not weaken "Aurora never presents inference as fact."
17. Must not create evidence automatically.
18. Must not create athlete decisions automatically.
19. Must not mutate domain state outside existing boundaries.
20. Must not weaken guards (incl. the process-env one-file seal).

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — No runtime entrypoint exists.** *Given* no API/server/worker/UI/product-CLI exists, *when* surface
selection is considered, *then* the spec either defers or selects a minimal surface with explicit evidence.
— **Live case today: defer** (§6).

**UC2 — Operator script exists.** *Given* `scripts/operator-live-smoke.mjs` exists, *when* product runtime is
considered, *then* the spec must **not** treat operator smoke as product runtime.

**UC3 — Application orchestration exists.** *Given* `orchestrateRenderDeliver` exists, *when* product runtime
is considered, *then* the spec distinguishes service **composition** from a deployable runtime **entrypoint**.

**UC4 — API selected.** *Given* an HTTP API is selected (future), *when* the spec is complete, *then* no API
implementation, server, auth, DB, deployment, or package script has been added.

**UC5 — CLI selected.** *Given* a CLI/runtime command is selected (future), *when* the spec is complete,
*then* it distinguishes a product CLI from operator smoke and adds no package script.

**UC6 — Runtime deferred.** *Given* selection is deferred, *when* the spec is complete, *then* deployment
target (Spec 031) and secret provider (Spec 030) remain deferred.

**UC7 — Live-provider safety.** *Given* any surface is selected or deferred, *when* live-provider behavior is
considered, *then* no default live call is introduced.

**UC8 — Domain isolation.** *Given* a surface is selected or deferred, *when* future implementation is
considered, *then* domain modules import no runtime/infrastructure code.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- **No runtime selected without evidence.** *Given* the repo names no first user/interaction model, *when*
  this spec concludes, *then* it records "no product runtime surface selected yet." ✅ (met — §6).
- **Selected runtime maps to reality.** *Given* any future selection, *when* recorded, *then* it cites the
  named first user + interaction model it serves. (criterion gate, §4.1/4.8).
- **Operator smoke not classified as product runtime.** ✅ (§1, UC2).
- **Application orchestration not classified as runtime entrypoint.** ✅ (§3.2.1, UC3).
- **No API/UI/worker code added by this spec.** ✅
- **No DB/auth implementation added by this spec.** ✅
- **No package script added by this spec.** ✅ (`package.json` scripts unchanged).
- **No deployment/CI file added by this spec.** ✅
- **No SDK/dependency change by this spec.** ✅ (lockfile/devDependencies unchanged).
- **No code/test change by this spec.** ✅ (`src/` unchanged).
- **No live-call enablement.** ✅
- **No operator smoke change.** ✅
- **No source-precedence implementation.** ✅
- **No domain coupling.** *Given* this spec, *when* domain modules are inspected, *then* none imports runtime
  code. ✅
- **No production rollout claim.** ✅
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  710/710 pass. ✅

---

## 10. Relationship To Existing Architecture

- **Spec 031** — deployment target deferred *because* the product runtime surface is unknown; Spec 032 is
  the upstream decision that, once made, unblocks it.
- **Spec 030** — secret provider deferred *because* the deployment target is unknown (two links upstream).
- **Impl 029** — the provider-neutral cloud-like adapter contract exists but has no real provider/runtime
  wiring.
- **Impl 028** — the provider-neutral managed-secret seam is the interface a future provider adapter
  implements.
- **Impl 027** — operator smoke remains manual and **non-product**; it is not a runtime surface.
- **Impl 025** — `orchestrateRenderDeliver` exists as a composition **service**, but is **not** a runtime
  entrypoint; a runtime would wrap it.
- **Impl 016** — the delivery boundary exists but targets a **test-only sink**, not a product channel.
- **Impl 014** — provider output validation (`validateDraft`) remains mandatory on any exposed output.
- **Core domain** — inference must **never** be presented as fact; any future surface inherits this
  invariant.

---

## 11. Forbidden Behaviors

```text
runtime file creation · API/server implementation · UI/frontend implementation · worker implementation ·
DB/schema/migration creation · auth/session/user implementation · package script creation ·
deployment file creation · CI workflow creation · cloud SDK installation · dependency change ·
package.json edit · package-lock edit · real cloud call · real secret lookup · secret creation ·
CI secret injection · CI live lane · automatic live call · source precedence implementation ·
operator smoke behavior change · process-env guard weakening · domain import of runtime code ·
delivery trigger without explicit athlete/user decision boundary · event recording outside existing boundary ·
evidence creation outside existing boundary · athlete decision creation outside existing boundary ·
domain mutation outside existing boundary · telemetry/model evaluation · production rollout claim
```

---

## 12. Open Questions For a Future Tech Spec (carried forward)

Deliberately **not** resolved here; they belong to later specs/tech specs once an interaction model exists:

1. What is the first deployable runtime?
2. Is the first user an operator, athlete, coach, or system?
3. Is the first interface CLI, API, UI, or worker?
4. Does the runtime require auth/user identity immediately?
5. Does the runtime require DB/persistence immediately?
6. What minimal command/request starts an Aurora flow?
7. What output is safe for a first runtime?
8. How are athlete decisions represented in the runtime?
9. How is delivery triggered or withheld?
10. How are live-provider calls gated?
11. How is observability handled?
12. How does the runtime choice inform the deployment target (Spec 031)?

---

## 13. Success Criteria

Can Aurora decide, from real evidence, what its first deployable product runtime surface should be —
**without** adding runtime/API/UI/worker code, DB/auth, package scripts, deployment/CI files, SDKs, secrets,
live-call behavior, domain coupling, or a production-rollout claim? **Yes — and the evidence says defer.** The
kernel is capable, but the first user and interaction model are undocumented, so the gating criteria (value
to a named user; auth/delivery needs; operator-vs-athlete) are unanswerable. Runtime-surface selection is
deferred behind explicit criteria, and the correct next decision is **who Aurora's first user is and how they
interact** (`Spec 033 — Product Interaction Model Boundary`), after which Spec 032 is revisited to select a
surface, unblocking Spec 031 (deployment target) and Spec 030 (secret provider). Validation at authorship:
`tsc --noEmit` clean; `node --test` 710/710; no code, test, package, runtime, deployment, CI, SDK, or
dependency change.
