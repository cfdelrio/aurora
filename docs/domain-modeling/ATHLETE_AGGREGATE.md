# Domain Modeling 002 — The Athlete Aggregate

> What must the Athlete aggregate own so Aurora can interpret training impact without reducing the athlete to a profile?
>
> Domain modeling, not implementation. No code, schemas, APIs, UI, or frameworks.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[DECISION]** | A modeling commitment, with reasoning. |
| **[HYPOTHESIS]** | Reasoned but unproven; must be validated. |
| **[ASSUMPTION]** | A stance chosen, not a truth. |
| **[QUESTION]** | Open, carried forward. |
| **[UNKNOWN]** | We genuinely don't know. |

Each principal **[DECISION]** carries: **Why** · **Consequence** · **Risk** · **Reversal Point**.

[ASSUMPTION] We do not force DDD. An aggregate earns the name only by protecting an invariant across a consistency boundary. A model that owns everything is a data bucket, not an aggregate.

---

## The Governing Idea (read this first)

[DECISION] **The Athlete aggregate boundary is the line between what is *declared by or permanently true about the person* and what is *inferred by Aurora about them*.**

- **Inside Athlete:** identity, purpose (and its history), constraints, path-dependent memory, and the athlete's own accepted declarations. These are *given* — stated by the athlete or permanently true of them.
- **Outside Athlete:** current state and capacity. These are *inferred* — defeasible conclusions produced by the `Reasoning` context and held with confidence by `UnderstandingProfile`. They are **projections**, not attributes stamped on the person.

**Why this is the whole paper:** [FACT] The foundation insists the athlete is *the context through which training acquires meaning*, never a profile. The fastest way to accidentally reduce an athlete to a profile is to store Aurora's *inferences about them* (FTP, readiness, fatigue) as authoritative *facts on the person*. The instant "this athlete's capacity is 280W" lives inside Athlete as a stored attribute, it stops being a defeasible hypothesis and becomes a label — and the athlete has become their metrics. Keeping inference *outside* the aggregate is the structural defense against that.

Everything below follows from this one line.

---

## Required Inputs

[FACT] This paper consumes the [Foundation Index](../README.md), the [Athlete Model](../domain/ATHLETE_MODEL.md), [Understanding Model](../domain/UNDERSTANDING_MODEL.md), [Decision Model](../domain/DECISION_MODEL.md), [Evidence Model](../domain/EVIDENCE_MODEL.md), [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md), and [Core Reasoning Model](./CORE_REASONING_MODEL.md). It may not contradict their decisions; one explicitly-deferred lean is *resolved* (not contradicted) below and flagged.

### Reconciliation with Core Reasoning Model 001

[DECISION] **CRM 001 left the Athlete internals "unresolved, leaning toward one `Athlete` aggregate with `AthleteState` as an entity inside it." This paper resolves that lean differently: `CurrentState` is a *projection outside* Athlete, not an entity inside it.**

- This is a **resolution of an explicitly deferred question, not a contradiction of a settled decision.** CRM 001 flagged it as deferred to Domain Modeling 002 — this is that paper.
- **Why the change:** storing state as an entity *inside* Athlete recreates the "Stale Athlete Model" failure mode from Architecture Discovery — authoritative state that silently ages. Modeling state as a projection forces it to carry staleness and to be recomputed, never trusted as a stored fact.
- All other CRM 001 decisions stand unchanged. `Purpose` as a versioned value object is **confirmed and refined** (see Decision 3), not revised.

---

## Part I — The Ten Required Modeling Decisions

### Decision 1 — Athlete is a *thin* aggregate root

[DECISION] **`Athlete` is an aggregate root, but a deliberately thin one. It owns only the *given* dimensions (identity, purpose history, constraints, path-dependent memory, accepted declarations). It does not own inferred state or capacity.**

- **Why:** [FACT] The athlete needs a single consistency boundary guaranteeing continuity of identity, the always-present-or-explicitly-unknown purpose, and persistence of hard constraints and path-dependent memory. Those are real invariants → a real aggregate. But the seven Athlete-Model dimensions have radically different *sources of truth*: some are declared, some inferred, some external. Forcing all seven into one aggregate makes a data bucket. A thin root owns the *given*; the *inferred* lives in Reasoning/Understanding as projections.
- **Consequence:** Athlete is small, stable, and rarely written. It cannot become a dumping ground for metrics. Inferred values are always defeasible and always recomputed, never stamped on the person.
- **Risk:** A thin root means "the athlete's current state" requires assembling a projection from several sources; there is no single place that "is" the athlete-right-now. Consumers wanting a one-stop snapshot must compose it.
- **Reversal Point:** If composing the athlete-right-now projection proves so frequent and expensive that consistency suffers, introduce a *maintained read model* (`AthleteSnapshot`) — still derived, never an alternative source of truth.

### Decision 2 — The Athlete invariant

[DECISION] **Athlete protects: (a) *identity continuity* — the same athlete persists across time and sport changes; (b) *purpose presence* — there is always a current purpose or an explicit "purpose unknown"; (c) *purpose history integrity* — purpose changes are versioned and never lost; (d) *constraint & path-dependent-memory persistence* — a known hard constraint or a serious injury/overtraining episode never silently disappears; (e) *agency* — the athlete remains the decider; Athlete records decisions without judging them.**

- **Why:** [FACT] These are exactly the things that, if violated, break the foundation: lose purpose history and past evidence can't be reinterpreted; lose path-dependent memory and Aurora repeats old harm; lose agency and the companion becomes a commander.
- **Consequence:** Five concrete things can never happen through any path that bypasses Athlete: an athlete with no purpose state, a silently rewritten purpose, a vanished hard constraint, a forgotten overtraining episode, or a decision recorded as a judgment of character.
- **Risk:** "Identity continuity across sport change" is subtle — if modeled too rigidly, an athlete who genuinely re-founds themselves (sport switch, comeback after years) may be shackled to a stale identity.
- **Reversal Point:** If real athletes' identities change more than the model allows, introduce an explicit `IdentityEpoch` so continuity is preserved *and* re-founding is representable.

### Decision 3 — Purpose lives inside Athlete, as a versioned value object with an owned history

[DECISION] **`Purpose` is owned by Athlete. The *current* purpose is a value object; each change produces an immutable `PurposeVersion` (value object); the sequence is `PurposeHistory`, owned by Athlete. Purpose is *not* its own aggregate.**

- **Why:** [FACT] CRM 001 classified Purpose as a versioned value object; this confirms and refines it. Purpose has no lifecycle independent of the athlete — it cannot exist without an athlete to whom it belongs → not an aggregate. But purpose changes *reinterpret past evidence* (Architecture Discovery's purpose loop), so the *timeline* of versions must be retained and queryable "as of" any past moment. Hence an owned, append-only history of immutable versions.
- **Consequence:** Aurora can always answer "what was this athlete training for when that workout happened?" — essential for evaluating whether a past impact was progress. A purpose change is a new version, never an overwrite.
- **Risk:** Append-only purpose history could grow noisy if athletes tweak wording constantly; distinguishing a *real* purpose change from a rephrase may be hard.
- **Reversal Point:** If purpose churn floods the history, introduce a materiality threshold (only *substantive* changes create versions; rephrasings update the current version in place) — but never silently drop a substantive change.

[DECISION] **Ambiguous or unknown purpose is explicitly allowed and explicitly represented.** [ASSUMPTION] "Purpose unknown" is a first-class state, not a null. When purpose is unknown, Decision Support must drop to inquiry/framing (Decision Model) — it may not invent one. [QUESTION] When stated purpose and revealed purpose (behavior) diverge, Athlete records the *stated* purpose as authoritative and surfaces the divergence as a signal; it does not silently substitute revealed for stated. Which one *Impact* evaluates against remains open (carried from CRM 001).

### Decision 4 — Purpose is versioned (confirmed)

[DECISION] **Yes — versioned, append-only, immutable versions.** (Covered by Decision 3; called out separately because the mission requires an explicit ruling.)

- **Why / Consequence / Risk / Reversal:** as Decision 3.

### Decision 5 — CurrentState is projected, not stored

[DECISION] **`CurrentState` is a *projection*, assembled on demand from (a) inferred state from `Reasoning`/`Understanding`, (b) recent `AthleteReport`s, and (c) recency/decay metadata. Athlete does *not* store an authoritative current state. Athlete owns the *reports*; it does not own the *synthesized state*.**

- **Why:** [FACT] State is largely *inferred* (recovery, readiness, fatigue are read from signals and reports). Storing it as a fact inside Athlete is the "Stale Athlete Model" failure (Architecture Discovery) and the profile-reduction failure (this paper's governing idea). A projection must carry staleness and be recomputed; it can never be silently trusted as current.
- **Consequence:** State always knows how old it is. "State unknown" is naturally representable (no recent observation/report → the projection says so). Aurora can say "I don't know your current state" honestly.
- **Risk:** Projecting state on demand means there's no single event "state changed" to react to; consumers may need to re-derive frequently.
- **Reversal Point:** If reacting to state transitions (e.g., "athlete just became overreached") is needed, emit `AthleteStateExpired` / threshold-crossing events from the projection layer — still derived, not a stored authoritative state.

[DECISION] **State expires.** [ASSUMPTION] A `StateSnapshot` has a validity window per dimension; past it, the dimension reads `stale → unknown` rather than persisting a last-known value as if current. This is an invariant (Part II).

### Decision 6 — Capacity is projected from Reasoning hypotheses

[DECISION] **`CapacityProfile` is a *projection* over the `Reasoning` context's impact hypotheses (accumulated, longitudinal impact), not a stored attribute of Athlete. Each `CapacityEstimate` carries confidence (from the hypotheses) and staleness.**

- **Why:** [FACT] Capacity *is* inferred impact accumulated over time — exactly what `Hypothesis`/`ImpactAssessment` already produce (CRM 001). A separate stored capacity in Athlete would be a second, drift-prone source of truth for something the reasoning core already owns. Capacity must remain defeasible; storing it as an Athlete attribute would freeze a hypothesis into a fact.
- **Consequence:** Capacity is always traceable to the hypotheses that produced it (honoring the traceability mandate). "Capacity unknown" and "capacity stale" are first-class. The distinction *"capacity is low" vs. "capacity is hidden by poor state"* is representable because capacity (longitudinal hypotheses) and state (recent projection) are different objects with different evidence — Aurora can hold "capacity estimate high, current state poor" without contradiction.
- **Risk:** A pure projection may feel unstable if hypotheses revise often; an athlete seeing their "FTP estimate" wobble could lose trust.
- **Reversal Point:** If a stable, citable capacity figure is needed, introduce an immutable `CapacityEstimate` snapshot captured at a point in time (mirroring CRM 001's deferred `ImpactSnapshot`) — derived, never authoritative.

### Decision 7 — How state decays

[DECISION] **Decay follows the Athlete Model's change-frequency table, applied per dimension. Decay is *graceful* (weight fades) toward `unknown`, never a cliff to a wrong default, and it is *reversible* (a fresh observation/report instantly restores relevance).**

- **Why:** [FACT] The Athlete Model classifies each dimension's change rate; the Understanding Model says decay rates are the inverse of that table. Hourly things (readiness, soreness) expire fast; never-changing things (sport, physiology archetype) never decay; path-dependent memory never decays at all.
- **Consequence:** Old data loses influence automatically; nothing stale silently drives current reasoning. A returning athlete's volatile state snaps to `unknown` while their identity and path-dependent memory remain intact.
- **Risk:** Wrong decay rates either discard still-valid information (too fast) or trust expired information (too slow). The rates are not yet empirically known.
- **Reversal Point:** When real athlete data reveals actual validity windows, tune the per-dimension decay rates; the *mechanism* (graceful, reversible, toward-unknown) stays.

### Decision 8 — Athlete and UnderstandingProfile are separate aggregates

[DECISION] **`UnderstandingProfile` is a separate aggregate referencing Athlete. It is not inside Athlete.**

- **Why:** [FACT] The proposed rule holds: *Athlete describes the athlete; UnderstandingProfile describes Aurora's confidence in its understanding of the athlete.* These are different subjects with different lifecycles — understanding rises on survived challenge, falls on surprise, decays on time, all independently of anything changing about the athlete themselves. Two subjects with independent lifecycles must not share a consistency boundary.
- **Consequence:** Understanding can change while the athlete does not (and vice versa). Decision Support reads *both* — Athlete for purpose/constraints, UnderstandingProfile for the per-dimension voice cap. Neither writes the other directly; understanding updates from the *Reasoning* stream (tested claims), not from Athlete edits.
- **Risk:** Two aggregates referencing each other can drift or create coordination overhead; a consumer needs both to act, so they're often fetched together.
- **Reversal Point:** If they are *always* used together and never independently, reconsider — but the independent-lifecycle argument makes this unlikely.

### Decision 9 — Athlete self-report enters as Observation (Ingestion), then fans out

[DECISION] **An `AthleteReport` enters the system as a `SubjectiveObservation` through Ingestion — the same path as device data, differing only in provenance (`athlete-reported`) and fallibility profile. From there it fans out: it may *update Athlete* (when it declares a constraint, injury, or purpose change), become *Evidence* (when pointed at a hypothesis in Reasoning), and feed *Understanding* over time.**

- **Why:** [FACT] Architecture Discovery and CRM 001 establish human report as first-class observation traveling the same ladder as device data. A report is not a lesser data stream; it carries information no instrument has. But a report that *declares* something (a new injury, a purpose change) also triggers a change in the *given* dimensions Athlete owns — so Athlete accepts declarations, while the raw report remains an immutable observation.
- **Consequence:** Self-report is fallible (athletes misjudge themselves) but never discarded; provenance and time are preserved (an invariant). When report and device data conflict, the conflict is itself a signal (Decision Model), often resolved by `Inquiry`. Aurora asks for a report instead of inferring exactly when the missing input is something only the athlete knows (life stress, felt meaning) and the stakes justify it.
- **Risk:** The same report doing three jobs (update Athlete / become evidence / feed understanding) could blur responsibility for what the report "did."
- **Reversal Point:** If the fan-out causes confusion or double-counting (a report counted as both a declaration and independent evidence for the same claim), make the declaration-extraction explicit and separate from the evidence-use.

### Decision 10 — What Athlete must never own

[DECISION] **Athlete must never own: inferred state, inferred capacity, impact hypotheses, understanding levels, raw signals/evidence, external context (calendar/season/weather), or any ranking/comparison against other athletes.**

- **Why:** [FACT] Each of these is either an inference (belongs to Reasoning/Understanding, must stay defeasible and traceable) or external (belongs elsewhere) or forbidden (ranking reduces the athlete to a comparable metric — the foundation rejects comparison as meaningless). Owning any of them turns the aggregate into a profile.
- **Consequence:** Athlete stays the *context of meaning*, not the *store of conclusions*. The profile-reduction failure is structurally prevented.
- **Risk:** Strictness pushes assembly work onto projections; "give me everything about this athlete" is never a single aggregate read.
- **Reversal Point:** Composition pain (Decision 1's reversal) — addressed with a derived snapshot, never by moving inference into Athlete.

---

## Part II — Detailed Concept Modeling

### 2.1 Identity (Key Question 2)

[DECISION] Identity is **owned by Athlete**, composed of value objects.

| Concept | Classification | Note |
|---|---|---|
| `AthleteIdentity` | **Value object** (composite), inside Athlete | The stable "who they are, apart from today." |
| `SportIdentity` | **Value object** | [DECISION] Sport is **identity**, not purpose. Purpose is *why* they train; sport is *what they are*. A triathlete pursuing an Ironman has sport=triathlon (identity) and purpose=that race. |
| `CompetitiveCategory` | **Value object** | [DECISION] Identity, not context — pro/age-group/recreational is who they are competitively, changing rarely. (Context is the *environment*; category is the *person*.) |
| `ExperienceProfile` | **Value object** | Years in sport, accumulated. Changes slowly; part of identity. |
| `PhysiologyArchetype` | **Value object** | Natural sprinter/endurance/climber. Never changes (Athlete Model). |

[QUESTION] **What happens when an athlete changes sport?** [ASSUMPTION] Identity continuity is preserved (same athlete), but `SportIdentity` updates and much inferred capacity becomes sport-specific-stale. The path-dependent memory and purpose history carry over; capacity projections re-thin. (See `IdentityEpoch` reversal in Decision 2.)

[ASSUMPTION] Identity is *mostly* immutable: `PhysiologyArchetype` never changes; `SportIdentity`/`CompetitiveCategory`/`ExperienceProfile` change rarely. None are "merely labels" — each changes how training is interpreted.

### 2.2 Capacity (Key Question 5)

[DECISION] `CapacityProfile` = **projection** (Decision 6). Sub-concepts:

| Concept | Classification | Note |
|---|---|---|
| `CapacityProfile` | **Projection** over Reasoning hypotheses | Not stored in Athlete. |
| `CapacityEstimate` | **Value object** (within the projection) | One dimension's estimate, with confidence + staleness. |
| `CapacityDimension` | **Value object** | Aerobic/anaerobic/strength/technical/tactical/adaptability (Athlete Model). |
| `CapacityConfidence` | **Value object** | Inherited from the underlying hypotheses' confidence. |
| `CapacityStaleness` | **Value object** | How long since the estimate was last supported by fresh evidence. |

[FACT] No formulas (non-goal). We model *responsibility*: capacity is owned by Reasoning, surfaced as a projection, always carrying confidence and staleness, always able to read `unknown`.

### 2.3 History (Key Question 6)

[DECISION] History is **split by permanence**.

| Concept | Classification | Decays? |
|---|---|---|
| `PathDependentMemory` | **Owned by Athlete** (entity-like, append-only) | **Never.** Injuries, overtraining episodes. Permanently shape interpretation (Athlete Model path-dependency). |
| `InjuryHistory` | **Owned by Athlete** (part of PathDependentMemory) | Never fully; resolved injuries archive but remain recallable on recurrence. |
| `PerformanceHistory` | **Projection** over the observation/hypothesis stream | Active vs. reference: recent is active evidence, old is reference. |
| `TrainingResponseHistory` | **Projection** | How this athlete has responded to stimuli — feeds Understanding. |
| `CompetitiveHistory` | **Projection / reference** | Past races; reference, occasionally re-activated by similarity. |
| `AthleteHistory` | **Umbrella term** | Not a single object — the union of the above. |

[DECISION] **Path-dependent memory is owned by Athlete and never decays;** all other history is a projection over the event stream (old performances are *historical reference*, not active evidence, unless re-activated by similarity).

### 2.4 Constraints (Key Question 7)

[DECISION] `ConstraintProfile` is **owned by Athlete**, versioned, with mixed provenance (declared and/or inferred-then-confirmed).

| Concept | Classification | Note |
|---|---|---|
| `ConstraintProfile` | **Owned by Athlete** | The set of active constraints. |
| `Constraint` | **Value object** (versioned) | Time availability, sleep, sickness, structural limit, external stress. |

[DECISION] **Constraints can expire** (a temporary one — illness, a deadline) **but a known *hard* constraint must not disappear silently.** [ASSUMPTION] Expiry is explicit and recorded (`ConstraintExpired`); it is never a silent drop. The candidate invariant — *a known hard constraint must not be ignored by `DecisionSupportCase`* — is **accepted and strengthened**: hard constraints are part of what Decision Support must reference, like purpose.

[DECISION] **Injuries are all three, at different layers:** an *active* injury is a **constraint** (limits current training) and updates **state**; the *episode* is **path-dependent memory** (permanent). [DECISION] **Age is a modifier carried by identity** (a rate-modifier on adaptation/recovery, per Athlete Model), not a constraint and not pure context.

### 2.5 Context (Key Question 8)

[DECISION] Context is **mostly NOT owned by Athlete.** It is external environment, owned elsewhere or entering via report.

| Concept | Classification | Owner |
|---|---|---|
| `CompetitionContext` (calendar, target events) | **Separate concern / reference** | [DECISION] Calendar is its own concern, *referenced by* Purpose (which targets an event), not owned by Athlete. |
| `SeasonContext` (phase, climate) | **Reference / projection** | [DECISION] Training *phase* is **purpose-adjacent** (it's why this block exists) — carried with purpose; *season/climate* is external context. |
| `LifeContext` (travel, external stress) | **Enters via `AthleteReport`** | Becomes a `SubjectiveObservation`; may update constraints/state. |
| `TrainingContext` | **Projection** | Derived from purpose + recent training. |
| `AthleteContext` | **Umbrella term** | Not a single owned object. |

[ASSUMPTION] Transient context (travel, a heatwave) enters as report/observation; stable context (the season's shape) is referenced. Athlete owns none of it directly — it *references* competition calendar and *carries* phase with purpose.

### 2.6 Athlete Report (Key Question 9)

[DECISION] Covered by Decision 9. Classifications:

| Concept | Classification | Note |
|---|---|---|
| `AthleteReport` | **Value object (observation)** entering via Ingestion | Immutable; provenance `athlete-reported`. |
| `SubjectiveObservation` | **Value object** | The report as it sits at the bottom of the evidence ladder. |
| `ReportConfidence` | **Value object** | The report's own fallibility/strength (athlete certainty). |
| `InquiryResponse` | **Value object** | A report given *in answer to* an `Inquiry`; links back to the question that prompted it. |

[DECISION] **A report may override device-derived state — but only as a conflicting signal, never automatically.** [ASSUMPTION] When "I feel terrible" meets "data says recovered," neither wins by default; the conflict is surfaced (often via `Inquiry`). Self-report is fallible *and* irreplaceable; it is treated as evidence, not as ground truth and not as noise.

---

## Part III — Candidate Aggregate Design (Key Question 12)

| Candidate | Classification | Owner / Home |
|---|---|---|
| `Athlete` | **Aggregate root** (thin) | Athlete context |
| `AthleteIdentity` | **Value object** | inside Athlete |
| `Purpose` | **Value object** (current) | inside Athlete |
| `PurposeVersion` | **Value object** (immutable) | inside Athlete |
| `PurposeHistory` | **Owned collection** (append-only) | inside Athlete |
| `CurrentState` | **Projection** | assembled from Reasoning/Understanding + reports |
| `StateSnapshot` | **Value object** | within the CurrentState projection |
| `CapacityProfile` | **Projection** | over Reasoning hypotheses |
| `CapacityEstimate` | **Value object** | within CapacityProfile |
| `AthleteHistory` | **Umbrella** (mixed) | path-dependent part in Athlete; rest projection |
| `PathDependentMemory` | **Owned, append-only, permanent** | inside Athlete |
| `ConstraintProfile` | **Owned collection** (versioned) | inside Athlete |
| `Constraint` | **Value object** (versioned) | inside ConstraintProfile |
| `AthleteContext` | **Umbrella** | referenced/external, not owned |
| `AthleteReport` | **Value object (observation)** | enters via Ingestion |
| `UnderstandingProfile` | **Aggregate root** (separate) | Understanding context |

### Aggregate candidates expanded

**`Athlete` (aggregate root — thin)**
- **Purpose:** preserve the *given* truth about a person and their continuity, as the context of meaning.
- **Invariant:** Decision 2 (identity continuity, purpose presence + history, constraint/path-memory persistence, agency).
- **Lifecycle:** `AthleteCreated` → declarations and purpose versions accumulate → never "deleted" (archived). Long-lived, rarely written.
- **Relationships:** referenced by `UnderstandingProfile`, `Reasoning` (purpose, constraints, identity as priors/baselines), `DecisionSupportCase` (purpose, hard constraints).
- **Owns:** identity, purpose (+ history), constraints, path-dependent memory, accepted declarations.
- **Must not own:** inferred state, inferred capacity, hypotheses, understanding, raw evidence, external context, rankings (Decision 10).
- **Risk / Reversal:** Decision 1.

**`UnderstandingProfile` (aggregate root — separate)**
- **Purpose:** hold Aurora's per-(athlete×dimension) confidence in its own understanding.
- **Invariant:** per-dimension never global; raised only by survived challenge; lowered by surprise; decayed by time; caps Decision Support voice (CRM 001).
- **Lifecycle:** created with the athlete at `Unknown` per dimension; rises/falls/decays from the Reasoning stream.
- **Relationships:** references Athlete; read by `DecisionSupportCase`.
- **Owns:** understanding levels + the evidence trail behind each.
- **Must not own:** the athlete's attributes; individual claim confidence.

[ASSUMPTION] No other candidate qualifies as an aggregate. `Purpose`, `Constraint`, `Identity` protect no *independent* invariant (they protect Athlete's) → value objects inside Athlete. `CurrentState`, `CapacityProfile`, history (non-path) → projections. `AthleteReport` → observation/value object.

---

## Part IV — Invariants

[DECISION] The Athlete model protects these invariants (candidates from the mission, challenged and refined):

1. **Identity continuity** — the same athlete persists across time and sport change; identity is never silently replaced. *(Refined: continuity ≠ immutability; re-founding is representable via IdentityEpoch if needed.)*
2. **Purpose is always present or explicitly unknown** — never null, never absent. Decision Support without purpose drops to inquiry/framing.
3. **Purpose changes are versioned** — append-only, immutable versions; the past is reconstructable "as of" any moment.
4. **Current state must expire if not refreshed** — a dimension past its validity window reads `stale → unknown`, never last-known-as-current.
5. **Known hard constraints never disappear silently** — expiry is explicit and recorded; hard constraints must be referenced by `DecisionSupportCase`.
6. **Path-dependent memory is permanent** — injuries and overtraining episodes never decay; they may archive but remain recallable.
7. **Athlete self-report preserves source and time** — every report is immutable, attributed, timestamped; fallible but never discarded.
8. **Agency is explicit** — decisions are recorded without judgment; Athlete never stores an evaluation of the athlete's character or a ranking against others.
9. **The athlete is never reduced to metrics** *(meta-invariant, enforced structurally)* — inferred values live outside Athlete as defeasible projections; no inference is stored as an authoritative attribute on the person.

[ASSUMPTION] Invariant 9 is the one the whole aggregate boundary exists to protect; the other eight are its concrete expressions.

---

## Part V — Decay and Time

[DECISION] Using the Athlete Model's change-frequency table as the decay schedule (Understanding Model: decay is its inverse):

| Change rate | Concepts | Decay behavior | Home |
|---|---|---|---|
| **Never** | Physiology archetype, sport-identity-essence, **path-dependent memory** | Never decays | Athlete |
| **Rarely** (months/yrs) | Competitive category, long-term purpose, experience | Effectively permanent; revalidate on life events | Athlete |
| **Slowly** (weeks/months) | Capacity (aerobic, strength, technical, tactical) | Decays gracefully toward `stale`; reversible on fresh evidence | Projection (Reasoning) |
| **Weekly** | Current purpose/phase, chronic fatigue | Revalidate weekly; purpose changes versioned | Athlete (purpose) / Projection (fatigue) |
| **Daily** | Recovery, readiness, motivation, soreness, external stress | Expire fast to `unknown` | Projection + reports |
| **Hourly / momentary** | Acute readiness, in-session state | Very short validity; mostly transient | Projection (not stored authoritatively) |

[DECISION] Summary rules:
- **Never decays:** path-dependent memory, physiology archetype.
- **Becomes stale → unknown:** all inferred state and capacity, gracefully and reversibly.
- **Archived (kept, inactive):** resolved injuries, old performances, completed competitions — recallable on recurrence/similarity.
- **Requires revalidation:** purpose (on life events), constraints (on expiry), capacity (on fresh evidence).
- **Path-dependent memory** is the explicit exception to all decay.

---

## Part VI — Things We Refuse to Model Yet

[ASSUMPTION] Out of scope for Domain Modeling 002, with reason:

- **Exact readiness/state formulas** — non-goal; the foundation forbids modeling scoring math. We model responsibility and invariants only.
- **Exact confidence math** — same; confidence is calibrated/falsifiable/travels-with-claim, not computed here.
- **Exact device data fields (Garmin etc.)** — an Ingestion concern; premature until ingestion modeling.
- **Injury/medical taxonomy** — Aurora is not a medical system (Decision Model); a clinical taxonomy invites overreach. We model "injury as constraint + state + path-memory," not diagnosis.
- **UI/onboarding questions** — how purpose/identity are *elicited* is product/UI, not domain.
- **Training plan generator** — downstream of decision support; not the athlete model.
- **Ranking/comparison between athletes** — *refused permanently*, not just "yet": comparison is meaningless in the foundation and reduces the athlete to a metric (Invariant 8).
- **Medical advice workflows** — escalation-to-human is named (Decision Model); the workflow is not domain modeling.
- **Athlete state-vs-capacity disambiguation algorithm** — we model that they are *different objects* so the distinction is *representable*; how Aurora decides which explains a low reading is reasoning logic, deferred.

---

## Part VII — Events (Key Question 11)

[DECISION] Candidate Athlete-related events. "Domain event" = meaningful across boundaries; "internal" = within a context.

| Event | What happened | Emitted by | Who cares | Domain or internal |
|---|---|---|---|---|
| `AthleteCreated` | An athlete entered Aurora | Athlete | Understanding (init at Unknown) | **Domain** |
| `PurposeDeclared` | First purpose set | Athlete | Reasoning, Decision Support | **Domain** |
| `PurposeChanged` | New purpose version | Athlete | All (reopens past impact) | **Domain** |
| `PurposeClarificationRequested` | Purpose unknown/ambiguous; Aurora asks | Decision Support | Athlete (awaits report) | **Domain** (an `Inquiry`) |
| `AthleteStateUpdated` | State projection crossed a threshold | State projection | Decision Support | **Domain** (derived, not stored) |
| `AthleteStateExpired` | A state dimension aged out to unknown | State projection | Decision Support | **Domain** |
| `CapacityEstimateRevised` | A capacity projection changed | Capacity projection | Decision Support, Understanding | Internal-leaning (derived) |
| `ConstraintDeclared` | A constraint added | Athlete | Reasoning, Decision Support | **Domain** |
| `ConstraintExpired` | A constraint ended (explicitly) | Athlete | Decision Support | **Domain** |
| `AthleteReportSubmitted` | A self-report arrived | Ingestion | Reasoning, Athlete, Understanding | **Domain** |
| `InjuryReported` | An injury declared | Athlete (from report) | Reasoning, Decision Support | **Domain** (constraint + state + path-memory) |
| `CompetitionAdded` | A target event entered the calendar | Competition concern | Purpose, Decision Support | **Domain** |
| `ContextChanged` | External context shifted | report/external | Reasoning, Decision Support | Domain-leaning |
| `AthleteIdentityUpdated` | A rare identity change (e.g., sport) | Athlete | Reasoning (re-thin capacity) | **Domain** |
| `AthleteDecisionRecorded` | The athlete chose | Athlete | Understanding | **Domain** (from CRM/Architecture) |

[FACT] No payload schemas (non-goal). [ASSUMPTION] The derived events (`AthleteStateUpdated/Expired`, `CapacityEstimateRevised`) are emitted by *projections*, consistent with state/capacity not being stored in Athlete.

---

## Part VIII — Glossary

- **Athlete** — thin aggregate root; the context of meaning; owns the *given* (identity, purpose+history, constraints, path-dependent memory, declarations).
- **AthleteIdentity** — value object; stable "who they are apart from today" (sport, category, experience, physiology archetype).
- **Purpose** — value object inside Athlete; current training intent.
- **PurposeVersion** — immutable value object; one entry in the purpose timeline.
- **PurposeHistory** — append-only owned collection of PurposeVersions; lets Aurora read purpose "as of" any past moment.
- **CurrentState** — projection (not stored in Athlete); the athlete's dynamic condition, assembled from inference + reports, carrying staleness.
- **StateSnapshot** — value object within CurrentState; one dimension at one time, with a validity window.
- **StateStaleness** — value object; how old a state reading is and whether it has expired to `unknown`.
- **CapacityProfile** — projection over Reasoning hypotheses; the athlete's slowly-changing capabilities.
- **CapacityEstimate** — value object; one capacity dimension with confidence and staleness.
- **AthleteHistory** — umbrella; path-dependent part owned by Athlete, the rest projections.
- **PathDependentMemory** — owned, append-only, *permanent* record of injuries and overtraining episodes; never decays.
- **Constraint** — versioned value object; a limit on adaptation/intensity/risk.
- **ConstraintProfile** — owned collection of active Constraints.
- **AthleteContext** — umbrella for external environment; referenced, not owned.
- **AthleteReport** — value object; self-report entering as an observation, immutable, attributed, timestamped.
- **SubjectiveObservation** — the report at the bottom of the evidence ladder; fallible, irreplaceable.
- **UnderstandingProfile** — separate aggregate; Aurora's per-dimension confidence in understanding the athlete; caps voice.
- **Agency** — the athlete's standing as the decider; Athlete records decisions without judging them and never ranks the athlete.

---

## Final Reflection

> **What is the smallest Athlete model Aurora needs in order to interpret one workout responsibly?**

[ASSUMPTION] Four owned things, plus two referenced projections:

**Owned by Athlete (the given):**
1. **`AthleteIdentity`** — enough to set baselines (sport, archetype, experience): a workout means different things to a novice and a veteran.
2. **`Purpose`** (current, or explicit unknown) — without it, the workout's impact cannot be judged as progress or regression. The indispensable referent.
3. **`ConstraintProfile`** (at least known hard constraints) — so interpretation and any support respect what's actually possible/safe.
4. **`PathDependentMemory`** — so a past injury/overtraining episode is never re-walked into.

**Referenced (the inferred), not owned:**
5. **`CurrentState` projection** — even if it reads `unknown`, Aurora must *know that it doesn't know* the athlete's current condition.
6. **`UnderstandingProfile` entry** for the relevant dimension — to cap how assertively any resulting support may speak.

[FACT] Strip an owned item and interpretation breaks: no identity → no baseline; no purpose → no meaning; no constraints → unsafe advice; no path-memory → repeated harm. Strip a referenced projection and Aurora risks treating an inference as a fact, or overreaching from population to person. The model is small because Athlete is *thin by design* — most of "the athlete right now" is inference that lives elsewhere.

> **What would be the most dangerous way to accidentally reduce the athlete to a profile?**

[ASSUMPTION] **Storing Aurora's inferences about the athlete — capacity, readiness, fatigue, "type" — as authoritative attributes *inside* the Athlete aggregate.**

This is the most dangerous reduction precisely because it looks like good engineering. It feels natural, even responsible, to keep "this athlete's FTP is 280W" right there on the athlete, ready to read. But the moment that number is a stored attribute rather than a defeasible projection, three things die at once: it **loses its confidence** (a fact has no error bar), it **loses its falsifier** (a fact has nothing that would change it), and it **loses its traceability** (a stored attribute has no chain back to the evidence that produced it). The athlete stops being *the context through which training acquires meaning* and becomes *a record of Aurora's conclusions about them* — a profile. And because the conclusions sit on the person, every future interpretation silently trusts them, even as they go stale, even when the athlete is exactly the exception the foundation built Aurora to serve.

[FACT] This is why the entire aggregate boundary is drawn at *given vs. inferred*. It is not a tidiness preference. It is the structural guarantee that Aurora reasons about a *person* and not about a *cached summary of a person*. Keep the inferences outside, defeasible and traceable, and the athlete can never quietly collapse into their metrics.

---

## Success Criterion

> **"What must Aurora know, remember, forget, refresh, and leave unknown about an athlete to interpret training responsibly?"**

[ASSUMPTION]
- **Know (own):** identity, current purpose, hard constraints — the given baselines of meaning.
- **Remember forever:** purpose history and path-dependent memory (injuries, overtraining) — never decayed.
- **Forget (decay to unknown):** inferred state and capacity, gracefully and reversibly — never trusted stale.
- **Refresh:** purpose on life events, constraints on expiry, capacity on fresh evidence, state continuously.
- **Leave unknown (explicitly):** any state/capacity without recent support, purpose when undeclared, and everything in the Athlete Model's permanent Unknowns (inner experience, true compliance, genetic ceiling). "Unknown" is a first-class value, never a guess.

The Athlete aggregate is correct exactly to the degree that it holds the *given* faithfully, refuses to hold the *inferred*, remembers what must never be repeated, forgets what must never go stale, and can always say what it does not know.

---

## Open Questions Carried Forward

1. [QUESTION] Does identity continuity need an explicit `IdentityEpoch` for genuine re-founding (sport switch, multi-year comeback)?
2. [QUESTION] When stated and revealed purpose diverge, which does *Impact* evaluate against? (Shared with CRM 001.)
3. [QUESTION] Materiality threshold for purpose versioning — when is a change substantive vs. a rephrase?
4. [QUESTION] Exact per-dimension decay/validity windows for state and capacity (await real data).
5. [QUESTION] Is a citable `CapacityEstimate` snapshot needed, and when? (Mirrors CRM 001's `ImpactSnapshot`.)
6. [QUESTION] How far back does a `PurposeChanged` reinterpret past hypotheses — all history or a bounded window? (Shared, foundation-level.)
7. [QUESTION] Does `AthleteSnapshot` (a maintained read model) become necessary if composing the athlete-right-now proves too costly?

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the second Domain Modeling paper. It resolves the Athlete aggregate (thin root: given vs. inferred); it defers ingestion, formulas, and all implementation concerns.*

*Inputs: [Foundation Index](../README.md) · [Athlete Model](../domain/ATHLETE_MODEL.md) · [Understanding](../domain/UNDERSTANDING_MODEL.md) · [Decision](../domain/DECISION_MODEL.md) · [Evidence](../domain/EVIDENCE_MODEL.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning Model](./CORE_REASONING_MODEL.md)*
