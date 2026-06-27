# Implementation Architecture 001 — Technical Boundary Map

> How should the implementation be organized so the domain invariants remain enforceable in code?
>
> Implementation architecture, not production code. No frameworks, databases, ORMs, APIs, UI, types, schemas, or deployment.

> **Implementation status (post Impl 007).** This map describes the *intended* boundaries; the code
> now realizes them. Implemented modules: `observation` (001/002), `reasoning` (003), `understanding`
> (004), `decision-support` (005), end-to-end composition (006), and `athlete` — **Purpose-first only**
> (007: declared, versioned, append-only purpose; no inferred state/capacity/constraints/path-memory yet).
> Every dependency rule below holds in code, including `athlete` as an upstream leaf that imports only
> `shared-kernel`. No architecture decision here is superseded. For the implemented-vs-absent ledger see
> [`CORE_COMPLETION_REVIEW.md`](./CORE_COMPLETION_REVIEW.md) and [`../diagrams/SYSTEM_MAP.md`](../diagrams/SYSTEM_MAP.md).

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[DECISION]** | An architectural commitment, with reasoning. |
| **[HYPOTHESIS]** | Reasoned but unproven; must be validated. |
| **[ASSUMPTION]** | A stance chosen, not a truth. |
| **[QUESTION]** | Open, carried forward. |
| **[UNKNOWN]** | We genuinely don't know. |

Where this document resolves a previously-open question, it uses **Decision / Why / Consequence / Risk / Reversal Point**.

[ASSUMPTION] This is the first step *out* of domain modeling. Its only job is to place the accepted domain model into technical boundaries such that the eleven non-negotiable invariants ([domain modeling index §6](../domain-modeling/README.md)) are *enforceable in code* — not to choose any technology. Per the Engineering Playbook Guardian's phase discipline, this phase is permitted *technical boundaries, module structure, dependency direction, enforcement points* — and forbidden *frameworks, databases, APIs, schemas, deployment, code*.

---

## The Architectural Mandate

[FACT] The domain modeling index named three collapses implementation must never allow, plus the foundation's traceability and agency guarantees. This architecture is **wrong** if it permits any of:

- recommendation without traceability,
- stored inferred athlete state as if it were fact,
- a global understanding level,
- population knowledge promoting personal understanding,
- raw observations treated as signals,
- `DecisionSupportCase` owning `AthleteDecision`,
- `VoiceMode` chosen only from claim confidence,
- Purpose ignored during decision support.

[ASSUMPTION] Every boundary, dependency rule, and enforcement point below exists to make one or more of these *structurally impossible* — not merely discouraged.

---

## 1. Proposed Technical Boundary Map

[DECISION] **Six domain modules, plus a deliberately minimal `shared-kernel`. Projections, policies, and events are *not* their own top-level modules — they live inside the module that owns the invariant they serve.**

- **Why:** [FACT] The domain modeling index settled on five aggregates across five contexts (with Reasoning as one bounded context holding Evidence+Impact). One module per aggregate-owning context keeps each invariant inside one boundary. Making `projections`, `policies`, or `events` top-level modules would scatter logic *away* from the invariant it protects — the opposite of what enforceability requires (a `VoiceSelectionPolicy` in a global `policies` module could be invoked bypassing the `DecisionSupportCase` that must own its result).
- **Consequence:** six modules — `observation`, `reasoning`, `athlete`, `understanding`, `decision-support`, plus `shared-kernel`. Projections/policies/services live *within* their owning module.
- **Risk:** Six modules may be finer than the first implementation needs; `signal` folded into `observation` (below) could later deserve to split.
- **Reversal Point:** if `signal` logic grows independent of capture, or `reasoning` splits Evidence from Impact under real load, promote sub-packages to modules.

[DECISION] **`signal` is a sub-boundary inside `observation`, not a separate module.** [Why] DM-003 placed Signal detection at the Ingestion/Signal seam and made `ObservationSet` the only aggregate there; Signal is a value object with no aggregate of its own. Keeping signal detection beside capture keeps the "raw → meaning" judgment in one place. [Reversal] split if signal detection acquires its own persistence or independent lifecycle.

| Module | Responsibility | Owns | Must not own | Inbound deps (who depends on it) | Outbound deps (what it depends on) | Protected invariants | Failure modes prevented |
|---|---|---|---|---|---|---|---|
| **`shared-kernel`** | The minimal vocabulary every module must agree on | Identifiers, timestamps, provenance references, epistemic tags, traceability *references* (not the chain), domain result primitives | Any aggregate, any policy, any meaning, any inference | everything | nothing | none of its own (it holds primitives, not invariants) | Dumping-ground coupling (kept minimal — §3) |
| **`observation`** (incl. `signal`) | Capture what was recorded/reported/detected; turn it into contextualized observations and signals (or recorded rejections) | `ObservationSet` (aggregate); `Observation`, `ContextualizedObservation`, `Signal`, `SignalRejection`, `ObservationQuality`, `Provenance`, `Source` (value objects); `SignalDetectionPolicy`, `SignalEligibility` | Hypotheses, meaning-as-claim, evidence direction/weight | reasoning | shared-kernel; *reads* baselines from athlete/understanding (via passed inputs, not a hard dep — see §2) | Raw observation never treated as meaning; provenance never lost; signal ≠ evidence | Observation→meaning collapse |
| **`reasoning`** | Weigh signals as evidence against impact hypotheses; run the hypothesis lifecycle | `Hypothesis` (aggregate root) incl. `EvidenceCase` (entity); `ImpactAssessment` (projection); `SurpriseDetection` (service) | The decision to communicate; understanding levels; the athlete's attributes | understanding, decision-support | shared-kernel; observation (consumes signals) | Hypothesis always falsifiable/calibrated/traceable; signal becomes evidence only when attached to a hypothesis | Claim-as-fact; orphan claims |
| **`athlete`** | Hold the *given* truth about the person; project the *inferred* | `Athlete` (thin aggregate) — identity, purpose(+history), constraints, path-dependent memory; `CurrentState`, `CapacityProfile` (projections) | Inferred state/capacity *as facts*; hypotheses; understanding | reasoning, understanding, decision-support (all *read*) | shared-kernel | Purpose versioned; given vs. inferred boundary; path-dependent memory permanent | Inference→attribute collapse; stale-athlete-model |
| **`understanding`** | Track per-dimension, revisable confidence in understanding *this athlete* | `UnderstandingProfile` (aggregate); `UnderstandingDimension`, `UnderstandingLevel`, `Surprise` (value objects); `UnderstandingAssessment` (projection); promotion/demotion/decay policies | The athlete's attributes; claim confidence; the decision | decision-support | shared-kernel; consumes reasoning lifecycle outcomes; reacts to athlete events | Dimension-specific never global; level ≤ survived athlete-specific evidence; population never promotes | Global-understanding; population-to-person |
| **`decision-support`** | Turn evidence + understanding into responsible advice, or ask, or withhold | `DecisionSupportCase` (aggregate); `VoiceMode`, `TraceabilityChain`, `RiskAssessment` (value objects); `VoiceSelectionPolicy`, the five gates, `TraceabilityVerification` | The athlete's decision; the generation of new claims | (top of the stack; the athlete-facing edge) | shared-kernel; reads reasoning (hypotheses), understanding (assessment), athlete (purpose/constraints) | Voice gated not derived; recommendation needs complete trace; agency preserved | Support→decision collapse; claim-strength→voice; untraceable advice |

---

## 2. Dependency Rules

[DECISION] **Dependencies flow *up the epistemic ladder*: `decision-support` → `reasoning`/`understanding`/`athlete` → `observation` → `shared-kernel`. Lower modules never depend on higher ones. `understanding` and `decision-support` consume lower modules' *events/outputs*, not the reverse.**

```
   shared-kernel
      ▲
   observation                    (depends only on shared-kernel)
      ▲
   reasoning                      (depends on observation, shared-kernel)
      ▲           ▲
   understanding  │               (consumes reasoning lifecycle outcomes; reacts to athlete events)
      ▲           │
   decision-support               (reads reasoning, understanding, athlete)
                  │
   athlete  ──────┘               (depends only on shared-kernel; read by reasoning/understanding/decision-support)
```

[FACT] Answering the mission's questions explicitly:
- **Can `decision-support` depend on `reasoning`?** [DECISION] **Yes** — it reads hypotheses (already traced). It must *read*, never *write* them (it cannot author or strengthen claims).
- **Can `reasoning` depend on `decision-support`?** [DECISION] **No, forbidden.** Reasoning must not know whether or how a claim will be communicated, or it would tailor inference to the desired advice.
- **Can `understanding` consume `reasoning` lifecycle events?** [DECISION] **Yes** — that is its only legitimate input (DM-004: understanding is earned from *tested hypothesis outcomes*, never raw signals).
- **Can `athlete` depend on `understanding`?** [DECISION] **No, forbidden.** *Athlete describes the athlete; UnderstandingProfile describes Aurora's confidence in understanding the athlete* (DM-002/004). If `athlete` depended on `understanding`, inference could leak back as a stored attribute — the inference→attribute collapse.
- **Can `observation` know about hypotheses?** [DECISION] **No, forbidden** — the load-bearing rule: raw observation must never know what it means.
- **Where do projections live?** With the module that owns their source of truth (§5).
- **Where do policies live?** Inside the module that owns the invariant they serve (§7).
- **What belongs in shared kernel?** Only the minimal cross-module vocabulary (§3).

### Explicit forbidden dependencies
[DECISION]
- `observation` ⇏ `reasoning` / `understanding` / `decision-support` *(observation must not know meaning)*.
- `reasoning` ⇏ `decision-support` *(reasoning must not know how it will be used)*.
- `athlete` ⇏ `understanding` / `reasoning` / `decision-support` *(the given must not depend on the inferred)*.
- `understanding` ⇏ `decision-support` *(the voice ceiling must not be shaped by the voice that consumes it)*.
- Any module ⇏ another via *projection-as-input-of-truth* *(projections are read models, never authoritative inputs — §5)*.

[ASSUMPTION] **Cross-cutting reads without hard dependencies:** `observation` needs athlete *baselines* and `understanding`/`reasoning` need athlete *purpose/priors*. To avoid a dependency cycle (athlete is read by all yet depends on none), these are passed *into* the lower module as plain input values by the coordinating application service (§9), not imported as a module dependency. The athlete module is a leaf that everything *reads from* via the application layer, never a thing `observation` imports.

---

## 3. Shared Kernel

[DECISION] **The shared-kernel holds only: stable identifiers, timestamps, `Provenance` *references*, `Source` metadata, epistemic tags (`[FACT]`/`[HYPOTHESIS]`/`[ASSUMPTION]`/`[UNKNOWN]` as a value type), traceability *reference handles*, and generic domain result primitives (e.g., a Result/Outcome wrapper). Nothing that carries meaning, inference, or an invariant.**

- **Why:** [FACT] These are the vocabulary every module must agree on to *link* and *attribute* — without them, traceability and provenance can't cross boundaries. But the shared kernel is, by reputation, the most dangerous module: anything placed there couples every module to it. So it holds *references and primitives*, never *concepts that protect invariants*.
- **Consequence / the specific rulings the mission asks:**
  - **`TraceabilityChain`:** [DECISION] **owned by `decision-support`, not shared.** The shared kernel holds only lightweight *reference handles* (IDs that let a chain be assembled); the chain *object* and its verification belong where it is enforced. [Why] putting the chain in the kernel would let any module assemble or assert one, defeating the single guardian. [Risk] cross-module assembly needs the reference handles to be stable. [Reversal] if assembly proves to need more shared structure, share a *read-only* chain *view*, never the constructable chain.
  - **`Purpose`:** [DECISION] **owned by `athlete`, referenced elsewhere by handle — not shared as a mutable type.** [Why] purpose is versioned and owned by the athlete (DM-002); sharing it invites edits outside the aggregate. Other modules receive a purpose *value snapshot* passed in, not the owned type.
  - **`VoiceMode`:** [DECISION] **local to `decision-support`, not shared.** [Why] only decision-support emits or reasons about voice; nothing else needs the type. Sharing it would invite another module to set a voice.
- **Risk:** Even a minimal kernel drifts toward a dumping ground over time.
- **Reversal Point:** if anything meaning-bearing is proposed for the kernel, that is the signal to stop and relocate it to an owning module.

[ASSUMPTION] **Conservative default:** when unsure whether something belongs in the kernel, it does *not*. The kernel grows only by explicit decision.

---

## 4. Aggregate Placement

[FACT] Conceptual placement only — no repositories, no persistence (deferred).

| Aggregate | Owning module | Repository-boundary candidate (conceptual) | Allowed collaborators | Emits | Consumes | Invariant enforcement point |
|---|---|---|---|---|---|---|
| `ObservationSet` | `observation` | one boundary per occasion | (none above; read by reasoning) | `ObservationSetCreated`, `SignalDetected`, `SignalRejected`, `MissingDataDetected` | device/report inputs | at construction/amendment of the set (provenance + immutability + completeness) |
| `Hypothesis` (owns `EvidenceCase`) | `reasoning` | one boundary per hypothesis | reads signals from observation; read by understanding & decision-support | `HypothesisRaised/Supported/Weakened/PromotedToKnowledge/Falsified`, `SurpriseDetected` | `SignalDetected` | at every lifecycle transition (falsifier present, confidence calibrated, traceable, no silent transition) |
| `Athlete` | `athlete` | one boundary per athlete | read by reasoning, understanding, decision-support | `PurposeChanged`, `ConstraintDeclared`, `AthleteReportSubmitted`, `InjuryReported` | athlete inputs/reports | at declaration acceptance (purpose versioned; hard constraint/path-memory never dropped; given-vs-inferred boundary) |
| `UnderstandingProfile` | `understanding` | one boundary per athlete *(per-dimension internally)* | consumes reasoning outcomes; reacts to athlete events; read by decision-support | `UnderstandingLevelPromoted/Demoted`, `UnderstandingMarkedStale` | hypothesis lifecycle events; athlete events | at level change (per-dimension; ≤ survived evidence; population never promotes; cause recorded) |
| `DecisionSupportCase` | `decision-support` | one boundary per case | reads reasoning, understanding, athlete | `DecisionOpportunityDetected`, `DecisionSupportCaseOpened`, `TraceabilityVerified`, `VoiceModeSelected`, `DecisionSupportGenerated`, `InquiryRaised`, `RecommendationWithheld` | opportunities; reads of hypotheses/assessment/purpose | at output emission (the gate invariant — §6, no voice without its gates) |

---

## 5. Projections and Read Models

[DECISION] **Each projection is owned by the module that owns its *source of truth*, is refreshed from that module's events, always exposes staleness, and may never be used as an authoritative input or written as a fact.**

| Projection | Owning module | Refreshed by | May be stale? | Staleness exposed how | Must never |
|---|---|---|---|---|---|
| `ImpactAssessment` | `reasoning` | hypothesis lifecycle events | yes (derived) | carries "as of" + underlying hypotheses' confidence | become an editable source of truth for impact (the Hypothesis is) |
| `CurrentState` | `athlete` | inference (reasoning) + athlete reports | yes — *expires to `unknown`* | per-dimension validity window + `StateStaleness` | persist a last-known value as if current |
| `CapacityProfile` | `athlete` | reasoning hypotheses | yes | `CapacityEstimate` carries confidence + staleness | be stored as an authoritative athlete attribute |
| `UnderstandingAssessment` | `understanding` | profile level/decay changes | yes | carries fragility + staleness + reasons | be read as a claim; only ever a *voice ceiling* |

[FACT] **Core principle (load-bearing):** *a projection is not an aggregate; a projection must not become the source of truth for inferred reality.* The architectural defense: projections live in a read-only sub-boundary of their module, constructed *from* events, never accepting direct writes, and every consumer receives them with staleness attached so "stale" cannot be silently read as "current."

[DECISION] **What a projection must never do:** accept a write; be passed as an authoritative input to another module's invariant decision *without* its staleness; or outlive its source without re-derivation. [Why] each is a route to the projection→fact collapse. [Reversal] if a citable, frozen snapshot is genuinely needed, introduce an explicit immutable `*Snapshot` value object (flagged in DM-001/002), still derived, never authoritative.

---

## 6. Traceability Enforcement Strategy

[DECISION] **Two-layer enforcement, mirroring the domain model: (1) provenance is *born* at `observation` and carried immutably by every artifact via shared-kernel reference handles; (2) the `TraceabilityChain` is *assembled and verified* inside `decision-support` by `TraceabilityVerification`, which the `DecisionSupportCase` must call before any assertive output. A Recommendation is structurally impossible without a verified complete chain.**

| Question | Answer |
|---|---|
| Where is provenance born? | `observation` — every `Observation` carries `Provenance` at capture; `ObservationSet` guarantees it. |
| Where is traceability assembled? | `decision-support`, at case formation, by walking reference handles down through hypothesis → evidence → signal → observation. |
| Where is traceability verified? | `decision-support`, by `TraceabilityVerification`, before emission. |
| Which outputs require complete traceability? | **Recommendation** (and Warning-as-fact). |
| Can partial traceability support Reflection/Framing? | Yes — with priors **explicitly labeled** as priors; never presented as personal findings. |
| What happens when traceability is incomplete? | Voice degrades (to Reflection/Framing-as-prior), or routes to `Inquiry`, or `Withholding` — all recorded. "Incomplete" is itself a valid reason for Inquiry. |
| What module prevents orphan claims? | `decision-support` — it may only *read* already-traced hypotheses from `reasoning`; it cannot author claims, so an untraceable claim cannot enter the speaking boundary. |

[DECISION] **Enforcement is at construction, not after the fact.** The `DecisionSupportCase` aggregate refuses to reach a Recommendation state unless `TraceabilityVerification` has returned a complete chain — the invariant is a *precondition of the output existing*, not a check run on it later.

- **Why:** [FACT] The domain modeling index's final reflection: untraceable advice possible *even once* collapses trust irrecoverably. "Discouraged" is not enough; it must be impossible by construction.
- **Risk:** assembling the chain at the top requires every lower artifact to have kept its reference handle; one producer omitting a handle breaks assembly.
- **Reversal Point:** if breaks recur, make a provenance handle a *mandatory construction parameter* of every reasoning artifact (no artifact exists without naming its input) — turning a convention into an impossibility-to-omit.
- [QUESTION] How much of this is enforced at compile-time (type-level "no Recommendation without a Chain") vs. runtime verification? Carried to §11.

---

## 7. Policy and Domain Service Placement

[DECISION] **Every policy/service lives inside the module that owns the invariant it serves, and is invoked only through that module's aggregate — never as a free-floating, independently-callable function.**

| Policy / Service | Owning module | Inputs | Outputs | May decide | Must NOT decide | Failure if misplaced |
|---|---|---|---|---|---|---|
| `SignalDetectionPolicy` | `observation` | contextualized observations + baselines (passed in) | `Signal` or `SignalRejection` | whether something is meaningful enough to consider | what it *means for impact* | if in `reasoning`, observation→meaning collapse |
| `SignalEligibility` (gate) | `observation` | a signal | eligible / not (4-part: which hypothesis / direction / quality / source) | whether a signal may become evidence | the evidence's weight | if in `decision-support`, noise reaches advice |
| `SurpriseDetection` (service) | `reasoning` | new evidence vs. current model | `Surprise` / `SurpriseDetected` | that a contradiction occurred | how to respond to it | if in `understanding`, detection entangles with response |
| `ContradictionResponsePolicy` | `understanding` | a surprise | response (lower confidence / reopen / demote / ask) | how to react to surprise | the truth of the claim | if in `reasoning`, response entangles with weighing |
| promotion/demotion/decay policies | `understanding` | hypothesis outcomes, time | level changes | understanding level movement | claim confidence; athlete attributes | if in `reasoning`, repetition could promote |
| `EvidenceGate` | `decision-support` | hypotheses + traceability | pass / degrade | whether evidence suffices for a voice | the hypothesis's content | if in `reasoning`, reasoning tailors to advice |
| `UnderstandingGate` | `decision-support` | `UnderstandingAssessment` | safe voice ceiling | the voice cap | the understanding level itself | if it could raise the level, population-to-person at the edge |
| `PurposeGate` | `decision-support` | athlete purpose (read) | aligned / ambiguous→Inquiry | whether purpose permits a voice | the athlete's purpose | if it could set purpose, agency violation |
| `RiskGate` | `decision-support` | hypotheses, context | `RiskAssessment` + escalation | raise toward Warning for safety | a diagnosis | if it could raise a Recommendation's ceiling, overreach relocated |
| `AgencyGate` | `decision-support` | candidate output | preserves-agency / rewrite / drop | whether form preserves agency | the decision itself | if absent, commands leak |
| `VoiceSelectionPolicy` | `decision-support` | all five gate results | a `VoiceMode` / `Inquiry` / `Withholding` | the maximum *responsible* voice | the athlete's decision; new claims | if outside the case, voice chosen bypassing gates |
| `TraceabilityVerification` (service) | `decision-support` | reference handles | complete / incomplete chain | whether the chain resolves | the claim's truth | if optional, untraceable advice |

[FACT] **The unifying rule:** a policy may *read* across modules (via passed inputs) but is *owned and invoked* by one module's aggregate, so its result cannot be produced in a way that bypasses the invariant guardian.

---

## 8. Event Surface

[DECISION] **Each module declares a small set of *public* domain events (cross-module contracts) and keeps the rest *internal* (process events). Internal events must not cross module boundaries; public events are the only legitimate cross-module coupling besides explicit reads.**

| Module | Public domain events (cross-module) | Internal process events (do not cross) |
|---|---|---|
| `observation` | `ObservationSetCreated`, `SignalDetected`, `SignalRejected`, `MissingDataDetected` | `ObservationCaptured`, `ObservationContextualized`, `ObservationQualityFlagged` |
| `reasoning` | `HypothesisPromotedToKnowledge`, `HypothesisFalsified`, `SurpriseDetected`, `ImpactRevised` | `HypothesisRaised`, `HypothesisSupported`, `HypothesisWeakened`, `EvidenceAttached` |
| `athlete` | `PurposeChanged`, `ConstraintDeclared`, `ConstraintExpired`, `AthleteReportSubmitted`, `InjuryReported`, `AthleteIdentityUpdated` | declaration-extraction internals |
| `understanding` | `UnderstandingLevelPromoted`, `UnderstandingLevelDemoted`, `UnderstandingMarkedStale`, `PopulationKnowledgeUsed`/`PersonalKnowledgePreferred` | `ContradictionRecorded`, `UnderstandingDimensionOpened`, `UnderstandingArchived` |
| `decision-support` | `DecisionSupportGenerated`, `InquiryRaised`, `RecommendationWithheld`, `AthleteDecisionRecorded` | `DecisionSupportCaseOpened`, `TraceabilityVerified`, `VoiceModeSelected`, gate pass/fail events |

[FACT] Rationale per the mission:
- **Public** events are the *trust-critical, cross-context* facts (a signal was detected, a hypothesis was promoted, understanding moved, support was generated/withheld/asked).
- **Internal** events are the fine-grained steps of a single module's process; exposing them as public contracts would let other modules couple to *how* a module works, not just *what* it concludes — the "events leak internal process as public contract" failure (§12).
- [ASSUMPTION] **Should-not-cross examples:** `HypothesisRaised` (a raw, untested claim — others must not react to it as if meaningful), `ObservationContextualized` (mid-process), `VoiceModeSelected` (internal to a case before emission). [QUESTION] The exact public/internal split is carried to §11.

[FACT] No payload schemas (non-goal).

---

## 9. Application Services

[DECISION] **Application services *coordinate* modules and own transaction boundaries; they contain *no domain reasoning*. They pass the cross-cutting reads (athlete baselines/purpose) into lower modules so those modules need no hard dependency on `athlete`.**

| Service | Purpose | Modules coordinated | Transaction-boundary candidate | Must NOT decide | Relies on invariant |
|---|---|---|---|---|---|
| Record workout observations | Persist a faithful, attributed `ObservationSet` | observation | one `ObservationSet` | what anything means | provenance/immutability |
| Process observation set into signals | Run signal detection/rejection over a set | observation (+ athlete baselines passed in) | per set | signal weight/direction | raw ≠ meaning |
| Raise/update hypothesis | Attach eligible signals as evidence; move lifecycle | reasoning (reads observation) | one `Hypothesis` | the voice; the level | falsifiable/traceable hypothesis |
| Update understanding from lifecycle | Apply promotion/demotion/decay from hypothesis outcomes | understanding (consumes reasoning events) | one `UnderstandingProfile` (dimension) | claim confidence; athlete facts | survived-challenge promotion |
| Open decision support case | Assemble inputs, run gates, select voice | decision-support (reads reasoning/understanding/athlete) | one `DecisionSupportCase` | the athlete's decision; new claims | the gate invariant |
| Generate terminal output | Emit DecisionSupport / Inquiry / Withholding | decision-support | within the case txn | the decision | voice gated + traceable |
| Record athlete decision | Capture the choice + any divergence, neutrally | athlete-facing (references the case) | one `AthleteDecision` | judge the choice; write understanding directly | agency (no judgment) |

[FACT] **The rule the index demands:** application services coordinate; they must not contain domain reasoning. A gate's verdict, a voice choice, a level change — all live in the owning module's policy/aggregate, never in the coordinating service. The service only sequences calls and bounds the transaction.

---

## 10. Transaction and Consistency Boundaries

[DECISION] **Each aggregate is one atomic transaction boundary. Cross-aggregate effects are eventual, propagated by public events. Projections may lag and always expose staleness. A decision that cannot tolerate a stale input must *read fresh* or *route to Inquiry*, never silently consume stale data.**

| Question | Answer |
|---|---|
| What must happen atomically? | Changes *within* one aggregate (a hypothesis lifecycle transition; a profile level change; a case's gate-verified emission). |
| What can happen eventually? | Cross-aggregate reactions: understanding updating after a hypothesis promotes; a projection refreshing after events. |
| Which projections may lag? | All four (`ImpactAssessment`, `CurrentState`, `CapacityProfile`, `UnderstandingAssessment`) — by nature. |
| Which decisions cannot tolerate stale projections? | Recommendation/Warning — they must read a *fresh* `UnderstandingAssessment` and current purpose, or degrade/Inquiry. |
| What if `UnderstandingAssessment` is stale? | The `UnderstandingGate` treats stale as a *lower ceiling* (fragility/staleness lower the safe voice) — staleness can only make Aurora *more* cautious, never less. |
| What if Purpose changed during a case? | The case must re-read purpose before emission; a `PurposeChanged` mid-case invalidates the case's purpose alignment and forces re-evaluation (possibly Inquiry). |
| How are revisions handled? | Never silent overwrite — hypothesis revisions, level changes, and superseded observations are all recorded with cause; the chain assembled for a past output is immutable. |

[FACT] No infrastructure chosen — these are *consistency needs*, not mechanisms. [ASSUMPTION] The safety asymmetry holds at the consistency layer too: **stale data may only push Aurora toward caution (lower voice / Inquiry / Withholding), never toward greater assertiveness.**

---

## 11. Open Questions From Domain Modeling

[QUESTION] Carried forward; resolved only where the architecture *requires* it.

- [QUESTION] **Stated vs. revealed purpose** — which `Impact` evaluates against. *Domain-level; not forced by this architecture.* The `athlete` module stores stated as authoritative and surfaces divergence; resolution deferred.
- [QUESTION] **Depth of reinterpretation after `PurposeChanged`** — all history or a bounded window. *Affects how far `reasoning` reopens hypotheses on a purpose-change event; deferred.*
- [QUESTION] **Exact projection refresh strategy** (on-read / on-event / maintained). *Architecturally constrained — must expose staleness and never accept writes — but the mechanism is deferred to a persistence-architecture paper.*
- [QUESTION] **Compile-time vs. runtime traceability enforcement.** Resolved *partially* below.
- [QUESTION] **Event public/private surface** — the exact split (§8 proposes one; needs validation against the first slice).
- [QUESTION] **Module granularity under real load** — whether `signal` splits from `observation`, `reasoning` splits Evidence/Impact, or `athlete`/`understanding` split per-dimension. *Reversal points noted; not forced now.*
- [QUESTION] **First implementation slice** — which behavior ships first.

### Partial resolution — traceability enforcement layer
[DECISION] **Prefer compile-time/type-level enforcement where it makes untraceable output *unrepresentable*; fall back to runtime verification where types cannot express it.**
- **Why:** [FACT] the index demands traceability be impossible by construction; a type-level guarantee ("a Recommendation cannot be constructed without a verified Chain") is stronger than a runtime check that can be forgotten.
- **Consequence:** the `decision-support` boundary should be designed so that the *only* way to obtain a Recommendation value is to supply a verified complete chain — pushing as much of the invariant into construction as the eventual language allows.
- **Risk:** over-reliance on type tricks can make the model rigid or language-specific before a language is even chosen (and choosing one is a non-goal here).
- **Reversal Point:** if type-level enforcement forces premature language commitment, specify it as a *runtime precondition with an explicit, tested guard* until the implementation-language decision is made.

---

## 12. Architectural Failure Modes

[ASSUMPTION] Each is a way the boundaries could fail, with its defense.

| # | Failure | Why dangerous | Architectural defense |
|---|---|---|---|
| 1 | **Projection becomes fact** | Inferred reality stored as truth; loses confidence/staleness/traceability | Projections are read-only sub-boundaries, refreshed from events, always carrying staleness; never accept writes (§5) |
| 2 | **Observation becomes meaning** | Corrupts the root of every chain invisibly | `observation` cannot depend on `reasoning`; meaning requires `ContextualizedObservation` + `SignalDetectionPolicy` (§1–2) |
| 3 | **Inference becomes Athlete attribute** | The athlete reduced to a cached profile of conclusions | `athlete` cannot depend on `understanding`/`reasoning`; state/capacity are projections, not stored attributes (§2, §5) |
| 4 | **DecisionSupportCase owns AthleteDecision** | Companion becomes commander; agency lost | `AthleteDecision` is a separate, athlete-facing concern referencing the case; `decision-support` may not own it (§4, §9) |
| 5 | **VoiceMode derived from claim confidence** | A correct command is still a command | Voice produced only by `VoiceSelectionPolicy` from *five gate results*, inside the case (§7); claim-strength is one input, never the driver |
| 6 | **Understanding becomes global** | Population-to-person error structurally enabled | `UnderstandingProfile` indexed per-dimension; `UnderstandingGate` reads a per-dimension ceiling (§4, §7) |
| 7 | **Traceability optional** | Untraceable advice = trust collapse | Recommendation unobtainable without verified complete chain; enforced at construction (§6) |
| 8 | **Shared kernel dumping ground** | Universal coupling; meaning leaks everywhere | Kernel holds only references/primitives; meaning-bearing things relocated to owning modules; grows only by explicit decision (§3) |
| 9 | **Application service contains domain reasoning** | Invariants escape their guardian, become unenforceable | Services only coordinate + bound transactions; all reasoning in module policies/aggregates (§9) |
| 10 | **Internal events leak as public contract** | Other modules couple to *how* a module works | Strict public/internal event split; raw/mid-process events never cross boundaries (§8) |

---

## 13. Non-Goals

[FACT] This document does **not**: choose a framework, choose a database, define a schema, define an API, define UI, define types, define deployment, implement code, define ML algorithms, or define confidence formulas. It defines *technical boundaries and enforcement points only*.

---

## Final Reflection

> **What must the implementation make structurally impossible?**

[ASSUMPTION] **Producing an athlete-facing recommendation that is either untraceable or stronger than the gates permit.**

The single thing the boundaries exist to make *unrepresentable* — not merely discouraged — is a `DecisionSupportCase` reaching a Recommendation without a verified complete `TraceabilityChain` and a `VoiceMode` bounded by the per-dimension understanding ceiling, purpose, risk, and agency. Every module placement and dependency rule converges here: `observation` can't smuggle meaning to the root; `reasoning` can't be shaped by how it'll be used; `athlete` can't absorb inference as fact; `understanding` can't go global or be promoted by population priors; `decision-support` can't author claims or own the decision. If the implementation makes *just this one thing* structurally impossible — untraceable or un-gated advice — then the other ten failure modes have nowhere left to do their damage, because they all ultimately surface as a recommendation that shouldn't have been made. Make the bad recommendation unconstructable, and the architecture has done its job.

> **What is the most dangerous architecture shortcut Aurora could take at this stage?**

[ASSUMPTION] **Letting an application service reach across modules and "just compute" a recommendation directly — coordinating *and* reasoning in one place because it's faster than routing through the aggregates and gates.**

This is the most dangerous shortcut because it is the most *tempting* and the most *invisible*. An application service already touches every module to coordinate; adding "and while I'm here, if confidence is high, emit a recommendation" feels efficient and reads like ordinary glue code. But the instant reasoning lives in the coordinator, every invariant guardian is bypassed at once: the gates don't run, the traceability isn't verified at construction, the voice isn't gated, the understanding ceiling isn't consulted, purpose isn't checked — and none of it *looks* wrong, because the service is "supposed to" talk to all those modules anyway. It is failure mode #9 acting as a carrier for #5, #6, and #7 simultaneously. The defense is the rule that application services *coordinate, never reason* — and it must be held even when (especially when) routing through the aggregate feels like ceremony. The ceremony *is* the enforcement.

---

## Success Criterion

> **"Where does each core domain object live, who may depend on whom, and where are Aurora's trust-preserving invariants enforced?"**

[ASSUMPTION] Answerable from this page: **six modules** (`observation` incl. `signal`, `reasoning`, `athlete`, `understanding`, `decision-support`, `shared-kernel`), each owning its aggregate and the policies/projections serving its invariants (§1, §4, §5, §7); **dependencies flow up the epistemic ladder** with explicit forbidden edges (`observation⇏reasoning`, `reasoning⇏decision-support`, `athlete⇏understanding`, `understanding⇏decision-support`) and athlete as a read-only leaf coordinated via the application layer (§2); and **invariants are enforced at construction inside the owning aggregate** — provenance at `observation`, hypothesis integrity at `reasoning`, given-vs-inferred at `athlete`, the per-dimension ceiling at `understanding`, and the gate + traceability invariant at `decision-support` (§6, §10). The three collapses are prevented by dependency direction; traceability and gated voice are enforced at the `decision-support` construction boundary.

---

## Open Questions Carried Forward

1. [QUESTION] Compile-time vs. runtime traceability enforcement — partially resolved (§11); finalize when an implementation language is chosen.
2. [QUESTION] Exact public/internal event split (§8) — validate against the first slice.
3. [QUESTION] Projection refresh mechanism (§5/§11) — deferred to a persistence-architecture paper.
4. [QUESTION] Module granularity under load — `signal`/`observation`, Evidence/Impact, per-dimension understanding (§1) — reversal points noted.
5. [QUESTION] First implementation slice — which behavior ships first (the natural next implementation-architecture paper).
6. [QUESTION] Domain-level carries unaffected by this architecture: stated vs. revealed purpose; depth of purpose-change reinterpretation.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the first Implementation Architecture paper. It maps the domain model to technical boundaries and enforcement points; it defers persistence, language, framework, API, and the first implementation slice.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Observation & Signal](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support](../domain-modeling/DECISION_SUPPORT_MODEL.md)*
