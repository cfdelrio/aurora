# Aurora — Specification 033 — Product Interaction Model Boundary

> **Status (2026-06-29).** Specification phase. This document defines Aurora's first **product interaction
> model** — who Aurora's first product user is, what they initiate, what they receive, and what must remain
> impossible. It is **behavioral-only**: it implements no code, writes no technical spec, adds no
> runtime/API/UI/CLI/worker code, no auth/user/session, no DB/schema/migrations, no package script, no
> deployment file, no CI config, no SDK, no dependency, no secret; it changes no operator smoke and no
> live-provider behavior, and weakens no guard. Recent sequence: `712727d` (Spec 030 — provider deferred) →
> `a7932f5` (Spec 031 — deployment target deferred) → `17e72eb` (Spec 032 — runtime surface deferred).
> Validation at authorship: `tsc --noEmit` clean; `node --test` 710/710.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes a **product decision**: who Aurora's first user is and how they interact.
  It defines no runtime entrypoint, no interface shape, no file layout, no code.
- `[FACT]` It opens **no** code edge. Nothing about the current codebase changes.
- `[DECISION]` Unlike Specs 030–032 (each blocked by a missing *upstream technical decision*), this boundary
  turns on **product intent** — and the repository **documents** that intent explicitly (README, MANIFESTO,
  `docs/product/vision.md`, and the `athlete` domain). Where the evidence is explicit, this spec **decides**;
  where it is not, it defers the residue.

---

## 1. Context

`[FACT]` The blocking chain bottoms out here — this is the first boundary that depends on product intent, not
on another technical decision:

```text
secret provider   ← deployment target (Spec 030)
deployment target ← product runtime surface (Spec 031)
runtime surface   ← product interaction model (Spec 032)
interaction model ← product intent (THIS spec) ← documented in repo
```

`[FACT]` Current code reality (unchanged by this spec):

- `ingestManualInput` (Impl 013) — a pure manual-input intake function (the **only** intake that exists;
  FIT-file ingestion described in the README is **future**).
- `orchestrateRenderDeliver` (Impl 025) — an application service composition over injected collaborators
  (not a user interaction; not a runtime entrypoint).
- `rendering` (Impl 014) — deterministic rendering behind a mandatory `validateDraft`.
- `athlete` domain — Purpose (Impl 007) + **AthleteDecision (Impl 009)**: an athlete-owned record; source
  `athlete-declared | athlete-reported`, **never inferred/system**; following Aurora is not
  obedience-success, diverging is not failure.
- `delivery` (Impl 016) — exposes a display-eligible message to a deterministic **test-only sink**; delivery
  success is not evidence and not an athlete decision.
- `scripts/operator-live-smoke.mjs` (Impl 027) — operational, **non-product**.
- No API/CLI/UI/worker runtime; no auth/user/session; no DB/schema; no deployment target; no secret
  provider.

---

## 2. Central Question

> Who is Aurora's first product user, what action do they initiate, what output do they receive, and what
> must remain impossible — so Aurora does not collapse operator tooling, domain reasoning, delivery, athlete
> decision, and product runtime into one unsafe surface?

The answer must preserve:

```text
product interaction model ≠ runtime implementation
product interaction model ≠ deployment target
product interaction model ≠ operator smoke
product interaction model ≠ application orchestration
product interaction model ≠ delivery success
product interaction model ≠ evidence creation
product interaction model ≠ athlete decision (Aurora advises; the athlete decides)
product interaction model ≠ live-call enablement
product interaction model ≠ provider output trust
product interaction model ≠ UI requirement
```

---

## 3. Product Thesis Alignment (grounded in the real repo)

`[FACT]` The decision is anchored in Aurora's documented thesis — quoted from the repository:

- **README.md** — *"Athlete First — Diseñamos para el usuario, no para la tecnología."*; *"Somos un sistema
  de decisión basado en datos."*; *"Explainability — si no podemos explicar por qué AURORA dice algo, no lo
  decimos."*; *"Human Before AI — la IA amplifica, pero el criterio humano decide."*
- **MANIFESTO.md** — *"Decision First — cada feature debe mejorar una decisión del atleta."*; *"AURORA
  asesora; el atleta decide."*; *"AURORA advierte, no prescribe."*; *"Si hay un coach, AURORA trabaja para
  él"* (coach is conditional/secondary).
- **docs/product/vision.md** — **¿Quién es el usuario?** *Perfil primario:* endurance athlete (cycling /
  running / triathlon), trains 4–12 h/week, uses a GPS/power device, **has no elite coach**, wants to
  understand. *Perfil secundario:* amateur coach (3–10 athletes); intermediate athlete. **¿Qué significa
  éxito?** *"cuando un atleta cambia una decisión de entrenamiento basada en algo que AURORA le mostró."*
- **`athlete/domain/athlete-decision.ts`** — *"The decision is the athlete's; decision-support may only
  reference it."*; source is `athlete-declared | athlete-reported`, **never inferred/system**.

`[FACT]` The protected invariant, carried into every product interaction:

```text
Aurora never presents inference as fact.
```

---

## 4. Required Analysis (what the repo names)

| Question | Answer (from repo) |
| --- | --- |
| First product user | **Yes — the endurance athlete** (vision.md *perfil primario*). |
| Athlete-facing interaction | **Implied by thesis**; no athlete-facing *interface* exists yet. |
| Coach-facing interaction | **Secondary persona** (vision.md); explicitly deferred ("AURORA trabaja para el coach" — later). |
| Operator-facing interaction | **Operational only** (Impl 027); **not** a product interaction. |
| System-triggered interaction | **Rejected by thesis** ("Human Before AI"; decision is athlete-declared, never system). |
| First user action | Provide their **training input** — currently **manual input** (`ingestManualInput`); FIT ingestion is future. |
| First input shape | A manually-provided training input (the existing manual-input intake). |
| First output shape | An **explainable reflection** on state/load/progress, with inference explicitly marked, validated by `validateDraft`. |
| Decision recipient / owner | **The athlete** — sole decision owner (AthleteDecision; athlete-declared). |
| Delivery recipient | The athlete; but **delivery success ≠ athlete decision** (Impl 016). |
| Reviewer / approver | The **athlete reviews their own reflection**; no third-party approval is required, and nothing auto-acts. |
| Feedback loop | AthleteDecision (Impl 009) — the athlete reports their own choice/rationale. |
| Auth/identity need | **Not required** for a first, single-athlete, offline/manual reflection. |
| Persistence need | **Not required** beyond existing in-memory adapters for a first reflection. |
| Delivery-channel need | **Not required** for the athlete to receive a reflection in the first instance. |
| Runtime need | A runtime surface is still **undecided** (Spec 032) — this spec names the model, not the surface. |

`[FACT]` Supplementary findings: operator-only interaction does **not** count as product interaction;
athlete-facing interaction is the product (operator tooling is not); coach interaction is a secondary,
deferred persona; system-triggered interaction is too automatic for current safety boundaries; **manual
input can be the first product input** (it is athlete-provided and already exists); rendered output **can** be
shown before any real delivery-channel integration; athlete-decision *ownership* is part of the model, while
its capture mechanism is minimal/manual; for athlete-facing reflection, the athlete is the reviewer of their
own reflection.

---

## 5. Decision Framework (interaction-model selection criteria)

| # | Criterion | Met by the selected model? |
| --- | --- | --- |
| 1 | Alignment with Aurora thesis | ✅ Athlete First / Decision First / Explainability / Human Before AI. |
| 2 | First-user clarity | ✅ Endurance athlete (vision.md primary persona). |
| 3 | Decision-ownership clarity | ✅ The athlete (athlete-declared AthleteDecision). |
| 4 | Input availability | ✅ Manual input exists today. |
| 5 | Output safety | ✅ Explainable reflection; inference marked, never fact; `validateDraft` mandatory. |
| 6 | Review/approval requirements | ✅ Athlete reviews own reflection; nothing auto-acts. |
| 7 | Athlete-agency preservation | ✅ Advises, never prescribes; following ≠ success, diverging ≠ failure. |
| 8 | Inference-not-fact protection | ✅ Hard invariant preserved. |
| 9 | No-default-live-call preservation | ✅ No live call introduced. |
| 10 | Provider-validation preservation | ✅ `validateDraft` stays mandatory. |
| 11 | Delivery gating | ✅ Delivery success ≠ decision; nothing auto-delivered. |
| 12 | Persistence requirements | ✅ None beyond in-memory for a first reflection. |
| 13 | Identity/auth requirements | ✅ None for a first single-athlete offline reflection. |
| 14 | Runtime-surface implications | ✅ Names the model; surface returns to Spec 032 (does not force one). |
| 15 | Deployment implications | ✅ None forced. |
| 16 | Least irreversible commitment | ✅ Behavioral model only; no platform/runtime/auth/DB lock-in. |
| 17 | Testability with deterministic fakes | ✅ The whole flow is fake-testable today. |

---

## 6. Options Evaluated (decision level only)

| Option | Fit against thesis + evidence |
| --- | --- |
| No interaction model selected yet | Rejected — the repo **explicitly** names the athlete as first user; deferring would ignore documented evidence. |
| **Athlete-facing manual reflection** | **Selected** — athlete provides manual training input, receives an explainable reflection, owns the decision. Matches thesis + existing kernel exactly. |
| Operator-guided offline interaction | Useful as a *first delivery mechanism* (a runtime-surface concern, Spec 032), but the operator is **not** the product user and must never be mistaken for the decision owner. |
| Coach-facing review interaction | Deferred — coach is the **secondary** persona (vision.md); not the first product interaction. |
| System-triggered daily/weekly reflection | Rejected — too automatic; violates "Human Before AI" and athlete-declared decision ownership. |
| API-driven / CLI-driven / UI-driven interaction | These are **runtime surfaces** (Spec 032), not interaction models; not chosen here. |
| Delivery-channel-first interaction | Rejected — delivery success ≠ decision; a channel is not the interaction model. |

---

## 7. Decision

`[DECISION]` **First product interaction model: Athlete-facing manual reflection.**

The athlete provides a manual training input; Aurora produces an **explainable reflection** on their training
(state / load / progress) in which inference is explicitly marked and **never presented as fact**; the
**athlete is the sole decision owner** and reports their own decision (athlete-declared). This is selected
because the repository documents the deciding product evidence explicitly (README "Athlete First";
MANIFESTO "el atleta decide / advierte, no prescribe"; vision.md primary persona + success definition;
`AthleteDecision` athlete-owned/athlete-declared) and because the existing kernel already realizes this loop.

- **Who the first user is** — the endurance athlete (vision.md *perfil primario*); the coach is a deferred
  secondary persona; the operator is non-product; the system is never the decider.
- **What action they initiate** — providing a manual training input (the existing `ingestManualInput`
  intake; FIT-file ingestion remains future).
- **What input they provide or select** — a manually-provided training input.
- **What output they receive** — an explainable reflection on their training, with inference clearly marked
  and validated by the mandatory `validateDraft`; advice, never prescription.
- **Who owns the decision** — the athlete, exclusively (AthleteDecision; `athlete-declared` /
  `athlete-reported`). Aurora advises; the athlete decides; following is not obedience-success and diverging
  is not failure.
- **Whether review/approval is required** — the athlete is the reviewer of their own reflection; no
  third-party approval is required; nothing is auto-delivered, auto-decided, or auto-acted.
- **What remains explicitly impossible** — operator activity counted as an athlete decision; delivery
  success counted as a decision; system-triggered/automatic decisions; inference presented as fact;
  prescription or coach replacement; automatic live calls.
- **Why this does not implement runtime code** — it names a behavioral interaction model only; no
  entrypoint, interface, or file is created.
- **Why this does not create a deployment target** — the runtime surface (and thus the platform) remains
  undecided (Specs 032/031).
- **Why this does not create production rollout** — nothing is deployed, wired, or turned on.
- **Why this does not enable live calls** — live calls stay disabled-by-default behind `LiveCallPolicy`.
- **How this informs Spec 032 (runtime surface)** — with the model now named (athlete-facing reflection,
  manual input → explainable output, athlete decides), Spec 032 can be re-opened to choose the surface that
  delivers it (e.g. an athlete-facing manual/offline reflection surface, possibly operator-mediated in the
  very first deployable instance).
- **What the next spec/tech spec must decide** — the runtime surface that carries this model, then the
  deployment target and secret provider in turn.

### 7.1 Recommended next mission

```text
Spec 032R — Product Runtime Surface Revisit
```

`[DECISION]` The interaction model is now decided, so the correct next step is to **revisit Spec 032** and
select the runtime surface that delivers athlete-facing manual reflection — re-evaluating the candidates
(operator-mediated offline reflection vs a direct athlete surface) against this now-named model. That choice
then unblocks **Spec 031** (deployment target) and **Spec 030** (secret provider), each followed by its
implementation plan. Selection here is a documentation decision only; no code, runtime, or rollout is created.

---

## 8. Required Behavioral Rules (hold for this and any future revision)

1. Must not add runtime code.
2. Must not add API/UI/CLI/worker files.
3. Must not add auth/session/user implementation.
4. Must not add DB/schema/migrations.
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
16. Must not present inference as fact.
17. Must not create evidence automatically.
18. Must not create athlete decisions automatically.
19. Must not treat delivery success as an athlete decision.
20. Must not mutate domain state outside existing boundaries.
21. Must not weaken guards (incl. the process-env one-file seal).

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — First user documented.** *Given* the repo documents the first product user (vision.md primary
persona: the endurance athlete), *when* interaction-model selection is considered, *then* the spec selects an
athlete-facing model with that evidence (rather than deferring). — **Live case: select** (§7).

**UC2 — Operator smoke exists.** *Given* `scripts/operator-live-smoke.mjs` exists, *when* product
interaction is considered, *then* the spec does **not** treat smoke as product interaction.

**UC3 — Application orchestration exists.** *Given* `orchestrateRenderDeliver` exists, *when* product
interaction is considered, *then* the spec distinguishes service composition from user interaction.

**UC4 — Athlete-facing interaction selected.** *Given* an athlete-facing interaction is selected, *when* the
spec is complete, *then* the athlete remains decision owner and inference is not presented as fact. ✅

**UC5 — Operator-guided delivery considered.** *Given* the first reflection may be operator-mediated, *when*
the spec is complete, *then* operator activity must **not** be mistaken for an athlete decision (the athlete
remains the sole decision owner).

**UC6 — System-triggered interaction considered.** *Given* a system-triggered interaction is considered,
*when* current safety boundaries are reviewed, *then* it is rejected and no automatic live call or delivery
is introduced.

**UC7 — Residue deferred.** *Given* the runtime surface that carries this model is still undecided, *when*
the spec is complete, *then* runtime/deployment/secret-provider choices remain deferred (Spec 032R onward).

**UC8 — Delivery considered.** *Given* delivery is considered part of the interaction, *when* the spec is
complete, *then* delivery success must not equal an athlete decision.

---

## 10. Required Acceptance Criteria (Given / When / Then)

- **First user selected with evidence.** *Given* vision.md names the endurance athlete as the primary
  persona, *when* this spec concludes, *then* it selects an athlete-facing interaction model citing that
  evidence. ✅
- **Selected interaction maps to the Aurora thesis.** *Given* the selection, *when* checked, *then* it aligns
  with Athlete First / Decision First / Explainability / Human Before AI. ✅
- **Operator smoke not classified as product interaction.** ✅ (UC2).
- **Application orchestration not classified as user interaction.** ✅ (UC3).
- **Athlete remains decision owner.** ✅ (athlete-declared AthleteDecision).
- **Inference is not presented as fact.** ✅ (invariant preserved).
- **Delivery success is not an athlete decision.** ✅ (§7, UC8).
- **No API/UI/CLI/worker code added by this spec.** ✅
- **No auth/DB implementation added by this spec.** ✅
- **No package script added by this spec.** ✅
- **No deployment/CI file added by this spec.** ✅
- **No SDK/dependency change by this spec.** ✅
- **No live-call enablement.** ✅
- **No operator smoke change.** ✅
- **No source-precedence implementation.** ✅
- **No domain coupling.** *Given* this spec, *when* domain modules are inspected, *then* none imports
  runtime/interaction code. ✅
- **No production rollout claim.** ✅
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  710/710 pass. ✅

---

## 11. Relationship To Existing Architecture

- **Spec 032** — runtime surface was deferred *because* the interaction model was unknown; this spec supplies
  it, so Spec 032 can now be revisited (Spec 032R).
- **Spec 031 / Spec 030** — deployment target and secret provider remain deferred, downstream of the runtime
  surface.
- **Impl 029 / 028** — the cloud-secret adapter contract and the provider-neutral managed-secret seam exist
  but have no product-runtime wiring.
- **Impl 027** — operator smoke remains manual and **non-product**.
- **Impl 025** — application orchestration exists as a composition **service**, not user interaction.
- **Impl 016** — the delivery boundary exists, but **delivery success is not an athlete decision**.
- **Impl 014** — provider output validation (`validateDraft`) remains mandatory on any shown output.
- **Impl 009** — the AthleteDecision feedback loop exists and must remain **distinct from delivery**; the
  decision is athlete-owned, athlete-declared.
- **Core domain** — inference must **never** be presented as fact; the selected model inherits this.

---

## 12. Forbidden Behaviors

```text
runtime file creation · API/server implementation · UI/frontend implementation · CLI implementation ·
worker implementation · DB/schema/migration creation · auth/session/user implementation ·
package script creation · deployment file creation · CI workflow creation · cloud SDK installation ·
dependency change · package.json edit · package-lock edit · real cloud call · real secret lookup ·
secret creation · CI secret injection · CI live lane · automatic live call · source precedence implementation ·
operator smoke behavior change · process-env guard weakening · domain import of runtime/interaction code ·
delivery success treated as athlete decision · provider output treated as truth · inference presented as fact ·
evidence creation outside existing boundary · athlete decision creation outside existing boundary ·
domain mutation outside existing boundary · telemetry/model evaluation · production rollout claim
```

---

## 13. Open Questions For a Future Spec / Tech Spec (carried forward)

1. Which **runtime surface** carries athlete-facing manual reflection (Spec 032R)?
2. Is the very first reflection **operator-mediated** or athlete-direct?
3. What minimal input shape does the athlete provide first?
4. Exactly what reflection output is safe to show in the first instance?
5. Who, if anyone, reviews output before the athlete sees it (default: no one)?
6. How is the athlete's decision captured (minimal manual capture)?
7. Does the first interaction require auth/user identity (default: no)?
8. Does the first interaction require persistence beyond in-memory (default: no)?
9. Does the first interaction require a real delivery channel (default: no)?
10. When does FIT-file ingestion replace/augment manual input?
11. How is the AthleteDecision feedback loop exposed safely in the runtime?
12. How does this interaction model inform the deployment target (Spec 031)?

---

## 14. Success Criteria

Can Aurora decide, from real evidence, its first product interaction model — **without** adding
runtime/API/UI/CLI/worker code, auth/DB, package scripts, deployment/CI files, SDKs, secrets, live-call
behavior, domain coupling, or a production-rollout claim, and without presenting inference as fact or letting
delivery/operator activity stand in for an athlete decision? **Yes — and the evidence supports selecting.**
The repository explicitly names the endurance athlete as the first user (vision.md), defines success as the
athlete changing a decision based on what Aurora showed, and encodes athlete-owned decisions in the domain —
so the first product interaction model is **athlete-facing manual reflection**: the athlete provides a manual
training input, receives an explainable reflection (inference marked, never fact), and owns the resulting
decision. The runtime surface that carries it returns to **Spec 032R**, which then unblocks Spec 031
(deployment target) and Spec 030 (secret provider). Validation at authorship: `tsc --noEmit` clean;
`node --test` 710/710; no code, test, package, runtime, deployment, CI, SDK, or dependency change.
