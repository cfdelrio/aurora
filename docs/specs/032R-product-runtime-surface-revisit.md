# Aurora — Specification 032R — Product Runtime Surface Revisit

> **Status (2026-06-29).** Specification phase. This document **revisits** the product runtime surface
> decision that Spec 032 (`17e72eb`) deferred, now that Spec 033 (`e8c1a77`) has selected the first product
> interaction model (**athlete-facing manual reflection**). It is **behavioral-only**: it implements no
> code, writes no technical spec, adds no API/UI/CLI/worker code, no auth/user/session, no DB/schema/
> migrations, no package script, no deployment file, no CI config, no SDK, no dependency, no secret; it
> changes no operator smoke and no live-provider behavior, and weakens no guard. Validation at authorship:
> `tsc --noEmit` clean; `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document **decides** the first product runtime surface, using the new product evidence from
  Spec 033. It defines no entrypoint, no interface shape, no file layout, no code.
- `[FACT]` It opens **no** code edge. Nothing about the current codebase changes.
- `[DECISION]` Spec 032 deferred *only* because the interaction model was unknown. That blocker is now
  removed, so this revisit **selects** — choosing the minimum safe surface for athlete-facing manual
  reflection.

---

## 1. Context

`[FACT]` The chain, after Spec 033 turned the corner:

```text
secret provider   ← deployment target (Spec 030, deferred)
deployment target ← product runtime surface (Spec 031, deferred)
runtime surface   ← product interaction model (Spec 032, deferred → revisited HERE)
interaction model = athlete-facing manual reflection (Spec 033, SELECTED)
```

`[FACT]` Spec 033's selected model:

```text
athlete provides manual training input
→ Aurora produces an explainable reflection
→ inference is explicitly marked as inference, never fact
→ validateDraft remains mandatory
→ the athlete owns the decision
→ AthleteDecision is athlete-declared / athlete-reported, never system-inferred
```

`[FACT]` Current code reality (unchanged by this spec):

- `ingestManualInput` (Impl 013) — pure manual-input intake (the only intake; FIT ingestion is future).
- `orchestrateRenderDeliver` (Impl 025) — async composition over **injected** collaborators
  (`orchestration-command/-dependencies/-result/-trace`); a service, **not** a runtime entrypoint.
- `rendering` (Impl 014) — deterministic rendering behind a mandatory `validateDraft`.
- `delivery` (Impl 016) — exposes a display-eligible message to a deterministic **test-only sink**; delivery
  success ≠ evidence ≠ athlete decision.
- `athlete` — Purpose (Impl 007) + AthleteDecision (Impl 009): athlete-owned, athlete-declared/reported.
- `scripts/operator-live-smoke.mjs` (Impl 027) — a manual operator **wiring check**, outside `src`, outside
  the default suite/CI, no npm script. Operational, **non-product**.
- No API/CLI-product/UI/worker runtime; no auth/user/session; no DB/schema; no deployment target; no secret
  provider.

---

## 2. Central Question

> Given that Aurora's first product interaction is athlete-facing manual reflection, what is the first
> deployable/runtime surface that should support it — without prematurely adding UI/API/auth/DB/deployment,
> without treating operator tooling as product, and without weakening Aurora's safety invariants?

Preserve:

```text
runtime surface ≠ product interaction model
runtime surface ≠ deployment target
runtime surface ≠ production rollout
runtime surface ≠ operator smoke
runtime surface ≠ live-call enablement
runtime surface ≠ provider output trust
runtime surface ≠ athlete decision
runtime surface ≠ delivery success
runtime surface ≠ UI requirement
```

---

## 3. Required Analysis (runtime options vs the selected model)

`[FACT]` Each option is judged for fit with athlete-facing manual reflection and for least-irreversible
commitment.

| Option | Fit w/ model | Operator-confusion risk | Auth | Persistence | Delivery | Preserves owner / inference≠fact / no-live-call | Avoids premature deploy | Fake-testable | Least-commitment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Operator-mediated offline/manual reflection runtime** | **High** — drives ingest→render to an athlete-facing reflection | Low *iff* clearly distinguished from smoke; operator action ≠ decision | **None** | **In-memory only** | **None (withheld)** | ✅ all | ✅ runs locally, no target | ✅ | ✅ **highest** |
| Athlete-facing CLI/runtime command | High | Low | None now, but implies athlete distribution/identity | In-memory | None | ✅ | ✅ | ✅ | Medium (presupposes athlete runs software) |
| HTTP API surface | Medium | Low | **Required** (networked) | Likely required | Implied | ✅ but forces commitments | ❌ forces deploy target | ✅ | Low |
| Web UI/frontend runtime | Medium | Low | Required | Required | Required | ✅ but heavy | ❌ | partial | Lowest |
| Worker/job-processor runtime | Low | Medium | — | — | — | risks automatic flow | ❌ | ✅ | Low |
| Manual/offline batch runtime | Medium | Medium | None | In-memory | None | ✅ | ✅ | ✅ | Medium (consumer of output unclear) |
| Hybrid API + UI | Low | Low | Required | Required | Required | heavy | ❌ | partial | Lowest |
| No runtime selected yet | — | — | — | — | — | — | — | — | would ignore Spec 033 evidence |

`[FACT]` The **operator-mediated offline/manual reflection runtime** dominates: it supports the selected
model, requires no auth/DB/UI/API/deployment, withholds automatic delivery and live calls, keeps the athlete
as decision owner (operator action ≠ athlete decision), is fully fake-testable, and can later evolve into an
athlete-direct command / API / UI without breaking boundaries.

---

## 4. Product Safety Requirements (the surface must preserve)

```text
Aurora never presents inference as fact.
Aurora advises; the athlete decides.
Provider output is not truth.
Validation pass is not recommendation quality.
Delivery success is not athlete decision.
Operator action is not athlete decision.
Smoke proves wiring, not wisdom.
```

The first runtime surface must **not** automatically: make live provider calls; deliver messages; create
athlete decisions; create evidence; mutate athlete state outside existing boundaries; persist raw provider
output; or present inference as fact.

---

## 5. Decision Framework (grounded in Spec 033)

| # | Criterion | Met by the selected surface? |
| --- | --- | --- |
| 1 | Supports athlete-facing manual reflection | ✅ ingest manual input → validated, inference-marked reflection. |
| 2 | Keeps athlete as decision owner | ✅ operator action ≠ decision; AthleteDecision stays athlete-declared. |
| 3 | Makes inference status visible | ✅ inference explicitly marked; `validateDraft` mandatory. |
| 4 | Supports review before delivery if needed | ✅ the reflection is produced and reviewed; delivery is withheld by default. |
| 5 | Minimizes auth/DB/deployment commitment | ✅ none required (offline, in-memory, local). |
| 6 | Does not confuse operator smoke with product runtime | ✅ smoke proves wiring; this produces a product reflection. |
| 7 | Does not require live provider calls | ✅ live calls stay disabled-by-default behind `LiveCallPolicy`. |
| 8 | Does not require a production delivery channel | ✅ delivery withheld / test-sink only. |
| 9 | Can be tested deterministically | ✅ entire flow runs on fakes/in-memory. |
| 10 | Can evolve into API/UI without breaking boundaries | ✅ it wraps the existing composition core. |
| 11 | Least irreversible commitment | ✅ behavioral surface; no platform/auth/DB lock-in. |

---

## 6. Decision

`[DECISION]` **First product runtime surface: Operator-mediated offline/manual reflection runtime.**

A manual, deterministic, fail-closed runtime surface that takes an athlete's manual training input, runs the
existing `ingest → orchestrate → render` flow, and produces an **athlete-facing explainable reflection**
(inference explicitly marked, validated by `validateDraft`) — invoked, in this first instance, by a **trusted
operator on the athlete's behalf**, with the **athlete remaining the sole decision owner**. It withholds
automatic delivery and live calls, requires no auth/DB/UI/API, and forces no deployment target.

- **Why this surface follows Spec 033** — it delivers exactly the selected interaction model (manual input →
  explainable reflection → athlete decides) with the minimum mechanism and the least irreversible commitment.
- **Who uses it** — the **athlete** is the product user and decision owner; in the first deployable instance
  a trusted **operator** invokes the runtime on the athlete's behalf (an operator-*mediated* product flow,
  **not** operator smoke). Operator action is never an athlete decision.
- **What input enters the runtime** — a manual athlete training input (the existing `ingestManualInput`
  intake), passed into the existing orchestration command.
- **What output leaves the runtime** — a rendered, **validated, inference-marked** reflection for the athlete
  to read and reason about; **no** automatic delivery, **no** auto-created decision, **no** evidence.
- **What remains impossible** — operator action counted as an athlete decision; delivery success counted as a
  decision; automatic live provider calls; provider output treated as truth; inference presented as fact;
  evidence/athlete-decision/domain mutation outside existing boundaries; persistence of raw provider output.
- **Why this does not implement runtime code** — it names a behavioral surface only; no entrypoint,
  interface, file, or package script is created (that is `Tech Spec 032RA`).
- **Why this does not create a deployment target** — the surface is **offline/local/manual** and needs no
  production hosting; Spec 031 can therefore stay deferred until a networked surface (API/UI) is chosen.
- **Why this does not create production rollout** — nothing is deployed, wired live, or turned on.
- **Why this does not add auth/DB/UI** — an offline, single-session, in-memory operator-mediated reflection
  needs none; each is a separate, later, explicitly-justified decision.
- **Why this does not enable live calls** — live calls stay disabled-by-default behind `LiveCallPolicy`; the
  reflection is produced deterministically (fake provider) in this surface.
- **How this informs Spec 031 (deployment target)** — by being deliberately offline/local, it shows the
  *first* deployment target requirement is **none**; a deployment target becomes necessary only when a
  networked athlete-direct surface (API/UI) is chosen. Spec 031 is revisited then.
- **What the next tech spec must decide** — the file/module host, the input payload shape, the output shape,
  whether review precedes the athlete seeing output, and how the fake provider is wired deterministically.

### 6.1 Recommended next mission

```text
Tech Spec 032RA — Operator-Mediated Offline Reflection Runtime Implementation Plan
```

`[DECISION]` With the surface chosen, the next step is its TS-strict implementation plan (grounded in the
real `ingestManualInput` / `orchestrateRenderDeliver` / `rendering` shapes), deciding placement, input/output
contracts, the deterministic fake-provider wiring, and the guard battery — **without** auth/DB/UI/API/
deployment, without live calls, and without treating operator action as an athlete decision. Selection here
is a documentation decision only; no code, runtime, or rollout is created.

---

## 7. Required Behavioral Rules (hold regardless of the decision)

1. Must not add runtime code.
2. Must not add API/UI/CLI/worker files.
3. Must not add auth/session/user implementation.
4. Must not add DB/schema/migrations.
5. Must not add package scripts.
6. Must not add deployment files.
7. Must not add CI config.
8. Must not add SDKs/dependencies.
9. Must not create production rollout.
10. Must not enable live calls.
11. Must not bypass `LiveCallPolicy`.
12. Must not bypass operator opt-in.
13. Must not bypass the CI guard.
14. Must not bypass `validateDraft`.
15. Must not present inference as fact.
16. Must not create athlete decisions automatically.
17. Must not treat delivery success as an athlete decision.
18. Must not treat operator action as an athlete decision.
19. Must not mutate domain state outside existing boundaries.
20. Must not weaken guards (incl. the process-env one-file seal).

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Athlete-facing manual reflection selected.** *Given* Spec 033 selected athlete-facing manual
reflection, *when* the runtime surface is revisited, *then* the selected runtime supports athlete input and
safe reflection output. ✅ (§6).

**UC2 — Operator smoke exists.** *Given* operator smoke exists, *when* the surface is selected, *then*
operator smoke is **not** classified as product runtime.

**UC3 — Operator-mediated flow considered.** *Given* an operator-mediated offline flow is selected, *when*
the surface is used, *then* operator action is **not** treated as an athlete decision.

**UC4 — Athlete-facing command considered.** *Given* an athlete-facing command is considered, *when* the
surface is selected, *then* it does **not** require auth/DB/deployment implementation in this spec (it is the
documented evolution path, not the first instance).

**UC5 — API/UI considered.** *Given* API/UI are considered, *when* this spec evaluates them, *then* it
identifies their auth/persistence/deployment commitments and **defers** them.

**UC6 — Live-provider safety.** *Given* the surface is selected, *when* live behavior is considered, *then*
no default live provider call is introduced.

**UC7 — Decision ownership.** *Given* a reflection is produced, *when* an athlete response is considered,
*then* only an athlete-declared/reported decision creates an `AthleteDecision`.

**UC8 — Delivery safety.** *Given* delivery is considered, *when* the surface is selected, *then* delivery
success remains distinct from an athlete decision.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- **Runtime selected using Spec 033 evidence.** ✅ (§6 cites the selected model).
- **Selected runtime supports athlete-facing manual reflection.** ✅
- **Operator smoke not classified as product runtime.** ✅ (UC2).
- **Operator action not classified as athlete decision.** ✅ (UC3, rule 18).
- **Application orchestration not classified as a runtime entrypoint by itself.** ✅ (§1; the runtime *wraps*
  the composition service).
- **No API/UI/CLI/worker code added by this spec.** ✅
- **No auth/DB implementation added by this spec.** ✅
- **No package script added by this spec.** ✅
- **No deployment/CI file added by this spec.** ✅
- **No SDK/dependency change by this spec.** ✅
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

- **Spec 033** — selected athlete-facing manual reflection; this spec selects the surface that delivers it.
- **Spec 032** — the runtime surface was deferred *only* because the interaction model was unknown; that
  blocker is now removed.
- **Spec 031** — the deployment target remains deferred; the chosen offline surface deliberately needs
  **none**, so Spec 031 reopens only when a networked surface is chosen.
- **Spec 030** — the secret provider remains deferred, downstream of the deployment target.
- **Impl 029 / 028** — the cloud-secret adapter contract and managed-secret seam exist but have no runtime
  wiring (and none is added).
- **Impl 027** — operator smoke remains operational, **not** product; the new surface is an operator-mediated
  **product** flow, distinct from smoke.
- **Impl 025** — application orchestration exists as a composition **service**; the runtime *wraps* it but is
  not the service itself.
- **Impl 016** — the delivery boundary exists, but **delivery success is not an athlete decision** (and the
  first surface withholds automatic delivery).
- **Impl 014** — provider output validation (`validateDraft`) remains mandatory on any reflection shown.
- **Impl 009** — the AthleteDecision feedback loop remains athlete-declared/reported and distinct from
  delivery.

---

## 11. Forbidden Behaviors

```text
runtime file creation · API/server implementation · UI/frontend implementation · CLI implementation ·
worker implementation · DB/schema/migration creation · auth/session/user implementation ·
package script creation · deployment file creation · CI workflow creation · cloud SDK installation ·
dependency change · package.json edit · package-lock edit · real cloud call · real secret lookup ·
secret creation · CI secret injection · CI live lane · automatic live call · source precedence implementation ·
operator smoke behavior change · process-env guard weakening · operator action treated as athlete decision ·
delivery success treated as athlete decision · provider output treated as truth · inference presented as fact ·
evidence creation outside existing boundary · athlete decision creation outside existing boundary ·
domain mutation outside existing boundary · telemetry/model evaluation · production rollout claim
```

---

## 12. Open Questions For a Future Tech Spec (carried forward)

1. What file/module should host the selected runtime surface?
2. Is the first runtime operator-mediated (this spec: **yes**) or athlete-direct (later)?
3. What input payload shape represents a manual reflection request?
4. What output shape is safe to return?
5. Is review required before the athlete sees output (default: the athlete/operator reviews; nothing
   auto-acts)?
6. How is the athlete's decision captured later (athlete-declared/reported)?
7. Does the first runtime need persistence immediately (default: no, in-memory)?
8. Does the first runtime need auth immediately (default: no)?
9. Does the first runtime need delivery integration immediately (default: no)?
10. How are live provider calls gated in the runtime (default: disabled, fake provider)?
11. How does this surface inform the deployment target (default: none until a networked surface)?

---

## 13. Success Criteria

Can Aurora decide, from the now-known interaction model, its first product runtime surface — **without**
adding runtime/API/UI/CLI/worker code, auth/DB, package scripts, deployment/CI files, SDKs, secrets,
live-call behavior, domain coupling, or a production-rollout claim, and without confusing operator tooling
with product or weakening any safety invariant? **Yes — and the evidence supports selecting.** Spec 033's
athlete-facing manual reflection is best delivered first by an **operator-mediated offline/manual reflection
runtime**: a manual, deterministic, fail-closed surface that produces a validated, inference-marked reflection
for the athlete, who remains the sole decision owner. It needs no deployment target, so Spec 031 stays
deferred until a networked surface is chosen; the next step is `Tech Spec 032RA` to plan the surface.
Validation at authorship: `tsc --noEmit` clean; `node --test` 710/710; no code, test, package, runtime,
deployment, CI, SDK, or dependency change.
