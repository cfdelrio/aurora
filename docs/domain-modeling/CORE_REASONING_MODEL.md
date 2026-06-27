# Domain Modeling 001 — The Core Reasoning Model

> Which domain objects protect the path from evidence to responsible decision support?
>
> This is domain modeling, not implementation. No APIs, no database, no frameworks, no code. We resolve *what the objects are and what they protect* — not how they are stored or served.

---

## How to Read This Document

Same discipline as the foundation. Every substantive statement is tagged.

| Tag | Meaning |
|---|---|
| **[FACT]** | Well-established or follows necessarily from a foundation paper. |
| **[HYPOTHESIS]** | Reasoned but unproven; must be validated. |
| **[ASSUMPTION]** | A modeling stance Aurora chooses. Not a truth — a commitment. |
| **[QUESTION]** | Open question carried forward. |
| **[UNKNOWN]** | We genuinely don't know. |

Every **modeling decision** below carries five fields:
- **Decision** — what we commit to.
- **Why** — the foundation reasoning behind it.
- **Consequence** — what this makes true downstream.
- **Risk** — how this decision could be wrong or harmful.
- **Reversal Point** — the signal that would tell us to revisit it.

[ASSUMPTION] **We do not force DDD.** If a candidate protects no invariant, it is not an aggregate, and we say so plainly. The goal is the *smallest honest model*, not the most pattern-complete one.

---

## Inputs and Scope

[FACT] This paper consumes all seven foundation documents ([index](../README.md)), and is bounded by them. It may not contradict a foundation belief; where it must depart, it flags the paper to revisit.

**Scope:** the **core reasoning model** — the objects on the path `Evidence → Hypothesis → Impact → Decision Support`, plus the two transversal contexts that constrain it (Athlete/Purpose and Understanding). Upstream capture (Observation, Signal) and downstream presentation are referenced only where they touch the reasoning core.

[ASSUMPTION] The reasoning core is where trust is won or lost, because it is where *inference becomes advice*. Everything modeled here exists to keep that transformation honest.

---

## Part I — The Eight Principal Questions

### Q1. Are Evidence and Impact one bounded context, two, or one context with subdomains?

**Decision:** [ASSUMPTION] **One bounded context — call it `Reasoning` — with Evidence and Impact as two subdomains inside it, not two separate contexts.**

- **Why:** [FACT] The Evidence Model establishes that evidence does not exist in the abstract — *a signal becomes evidence only when pointed at a hypothesis*, and every hypothesis is a claim *about impact*. The dependency is bidirectional and tight: evidence needs a hypothesis to bear on; an impact hypothesis needs evidence to be raised or revised. Architecture Discovery already flagged this as the tightest coupling in the system and hypothesized a merge. Two contexts here would mean a boundary crossed on every single inference step — a chatty, circular boundary, which is the classic smell that two "contexts" are really one.
- **Consequence:** The `Reasoning` context owns the whole ladder rung from "signal arrives" to "impact hypothesis with calibrated confidence." Evidence and Impact share one ubiquitous language and one consistency boundary. A `Hypothesis` and the evidence bearing on it live and change together.
- **Risk:** If Evidence later needs to serve *non-impact* claims (e.g., data-quality reasoning, or reasoning about the athlete's *state* rather than training impact), forcing it inside an impact-oriented `Reasoning` context could distort it. There may be a more general "evidence" capability that impact is only one consumer of.
- **Reversal Point:** When a second, independent consumer of evidence appears that is *not* about training impact and cannot share the impact language. At that point, extract a general `Evidence` capability and let `Impact` depend on it.

---

### Q2. Does Hypothesis have its own lifecycle?

**Decision:** [ASSUMPTION] **Yes. `Hypothesis` is an entity with explicit identity and a defined lifecycle of states.** (It is, in fact, the aggregate root of the reasoning core — see Q3/Part II.)

- **Why:** [FACT] The Evidence Model makes every impact claim *defeasible*: raised, supported, weakened, promoted to knowledge, demoted, revised. Those are state transitions over time on a thing with continuous identity. Anything with identity + state transitions + history is an entity with a lifecycle, by definition.
- **Consequence:** A hypothesis persists across many workouts and observations; it accumulates evidence; it carries its confidence and falsifier as it moves through states; its revisions are recorded, never silently overwritten. (Full lifecycle in Part III.)
- **Risk:** Modeling every fleeting inference as a tracked entity could explode into thousands of trivial hypotheses. Not every passing interpretation deserves identity and history.
- **Reversal Point:** If most hypotheses turn out to be ephemeral and never revised, we split into *transient inferences* (value objects, discarded) vs. *tracked hypotheses* (entities), promoting only those that survive a first challenge.

---

### Q3. Is EvidenceCase an aggregate?

**Decision:** [ASSUMPTION] **No. `EvidenceCase` is an entity *inside* the `Hypothesis` aggregate, not an aggregate of its own.**

- **Why:** [FACT] An EvidenceCase is "all the evidence bearing on *one* hypothesis." Its invariants — every piece names direction/weight/grade/falsifier; convergence is claimed only across genuinely independent signals — exist to protect *the integrity of that hypothesis's support*. An invariant that protects another object's integrity belongs inside that object's consistency boundary. The EvidenceCase has no reason to change independently of its hypothesis; "evidence for what?" is structurally meaningless without the claim.
- **Consequence:** The `Hypothesis` aggregate root owns its `EvidenceCase`. You cannot add evidence to a case without going through the hypothesis, which guarantees "evidence is always evidence *for* a claim." The two never drift apart.
- **Risk:** A single signal can be evidence for multiple hypotheses simultaneously (Evidence Model). If EvidenceCase is buried inside one hypothesis, the *same* signal-relation may be duplicated across cases, risking inconsistency about that signal.
- **Reversal Point:** When cross-hypothesis consistency of a shared signal becomes a real problem (the same signal weighted contradictorily in two cases), promote the *signal-to-claim relation* to a first-class entity shared across cases — but the *case* still stays inside its hypothesis.

---

### Q4. Does ImpactAssessment exist as a separate model, or is it a hypothesis about impact?

**Decision:** [ASSUMPTION] **An impact claim *is* a `Hypothesis` (specialized by a subject of "impact," with dimension + timescale). `ImpactAssessment` is not a separate aggregate — it is a read model / projection that groups the impact hypotheses about one workout or period for presentation.**

- **Why:** [FACT] The Evidence Model is explicit: *every Aurora claim about impact is, in its nature, a hypothesis*, because impact is unobservable. To model `ImpactAssessment` as a separate authoritative object would create a second home for impact claims and invite drift between "the hypothesis" and "the assessment." There must be one source of truth for an impact claim, and it is the hypothesis. What people *call* an "assessment" is the human-facing rollup: "here is what we currently believe about this block's impact" — a projection over the live hypotheses.
- **Consequence:** No duplicate state. The assessment is always derivable from current hypotheses and is never edited directly. Dimension (physical/technical/mental/competitive/longitudinal) and timescale (immediate/delayed/accumulated) are attributes *of the impact hypothesis*, not of a separate type.
- **Risk:** Some consumers may want a stable, citable "assessment as of date X" that doesn't shift as hypotheses revise. A pure projection recomputes and may feel unstable.
- **Reversal Point:** When a stable, snapshot-able assessment is genuinely needed (e.g., to show "what we believed when you made that decision"), introduce an immutable `ImpactSnapshot` value object captured at a point in time — still derived from hypotheses, never an alternative source of truth.

---

### Q5. Is DecisionSupportCase the aggregate that protects the integrity of the decision?

**Decision:** [FACT-derived / ASSUMPTION] **Yes. `DecisionSupportCase` is the aggregate root that protects the integrity of a unit of decision support.** It is the guardian of the Decision Model's guarantees.

- **Why:** [FACT] The Decision Model and Architecture Discovery converge on a set of invariants that must hold *together* at the moment Aurora speaks (or chooses not to): no support without a complete traceability chain; voice never exceeds understanding; every recommendation carries confidence + falsifier; the decision is always returned to the athlete; withholding is recorded with a reason. Invariants that must hold *together, atomically* define a consistency boundary — an aggregate.
- **Consequence:** Nothing can produce athlete-facing decision support except by forming a `DecisionSupportCase`, and the case *refuses to form* if any invariant is unmet. This is the structural guarantee against "opinion dressed as finding." (Full invariant in Part V.)
- **Risk:** Concentrating all guarantees in one aggregate could make it a bottleneck or a god-object that knows too much (evidence, understanding, purpose, risk).
- **Reversal Point:** If the case accumulates unrelated responsibilities, extract the *selection logic* (which voice, whether to speak) into policies/domain services it consults, keeping the aggregate as the integrity guardian only. (We already do this for VoiceMode — Q7.)

---

### Q6. Who protects traceability?

**Decision:** [ASSUMPTION] **Traceability is protected in two layers: (a) every reasoning artifact carries provenance links to its inputs (distributed responsibility), and (b) the `DecisionSupportCase` is the *guardian* that refuses to form without a complete, walkable chain (enforcement point). The chain itself is modeled as a `TraceabilityChain` value object the case must hold.**

- **Why:** [FACT] Architecture Discovery makes traceability an *invariant enforced by construction*, not a runtime hope. But a single guardian cannot fabricate links that upstream objects failed to keep — so provenance must be maintained *at every step* (each Signal links to its Observation, each Hypothesis to its EvidenceCase, etc.), and *verified for completeness* at the one place where advice becomes athlete-facing.
- **Consequence:** Traceability cannot be "added later." It is a property of every artifact (links) plus a precondition at the speaking boundary (completeness check). The `TraceabilityChain` value object is the materialized walk from recommendation down to observation/athlete-report/context.
- **Risk:** Distributed link-keeping is only as strong as its weakest producer; one context that emits an output without a back-link silently breaks the chain, and the guardian can only detect the break, not repair it.
- **Reversal Point:** If silent breaks recur, make provenance a *mandatory constructor argument* for every reasoning artifact (no artifact can exist without naming its input), turning link-keeping from a convention into a structural impossibility-to-omit.

---

### Q7. Is VoiceMode part of DecisionSupportCase, a value object, a policy, or an output?

**Decision:** [ASSUMPTION] **`VoiceMode` is a value object (the chosen mode, an attribute of the `DecisionSupportCase`). The *act of choosing* it is a domain policy (`VoiceSelectionPolicy`). The two are different things and both are needed.**

- **Why:** [FACT] The Decision Model defines five modes on a ladder of assertiveness — they are a closed set of named values with no identity of their own → a value object. But *which* mode is appropriate is a judgment that reads evidence grade, understanding level, risk tier, and purpose → that is behavior, not data, and behavior that doesn't belong to any single entity is a domain policy/service.
- **Consequence:** `DecisionSupportCase` *has a* `VoiceMode` (value), chosen by `VoiceSelectionPolicy` (service) at formation time. The policy enforces "voice ≤ understanding level" and the risk-tier evidence thresholds; the value records the outcome. Separating them keeps the case as integrity-guardian and the laddering logic testable in isolation.
- **Risk:** A policy that lives outside the aggregate could be bypassed, letting a case be constructed with a voice the policy would never have chosen.
- **Reversal Point:** If bypass becomes possible or real, fold the selection into the aggregate's construction so a `DecisionSupportCase` *cannot* be created except via the policy.

---

### Q8. Should "Ask the athlete" be a sixth voice mode?

**Decision:** [ASSUMPTION] **No. "Ask the athlete" is *not* a sixth voice mode. It is a distinct first-class output of the reasoning core — an `Inquiry` — a sibling to "decision support" and "withholding," on a different axis from the assertiveness ladder.**

- **Why:** [FACT] The five voice modes (silence, reflection, framing, warning, recommendation) are all forms of Aurora *speaking about a decision* at varying assertiveness — they sit on one axis: how strongly Aurora asserts. "Ask" is categorically different: it is Aurora *acquiring input it lacks*, not offering support at any strength. Putting it on the assertiveness ladder would mean treating "I need to know something from you" as a degree of recommendation, which it isn't. Architecture Discovery already sensed this, floating `AthleteQuestionRaised` as its own first-class output rather than a voice variant.
- **Consequence:** The reasoning core has **three terminal outputs**: `DecisionSupport` (in one of five voice modes), `Withholding` (recorded silence), and `Inquiry` (a question to the athlete). This resolves the open question from Architecture Discovery: "ask" is first-class, but as an output type, not a sixth mode. Inquiry is the right move precisely when the missing piece is something *only the athlete can supply* (life stress, felt experience, purpose change) — exactly the Decision Model's "ask, don't guess about the invisible."
- **Risk:** The line between an `Inquiry` and a `reflection` ("you often choose intensity when confidence is low — worth noticing") can blur; a reflection can be a soft question. Two output types that overlap in practice may confuse modeling.
- **Reversal Point:** If reflection and inquiry collapse in real use (every reflection is really a question, or vice versa), reconsider — either fold inquiry into reflection, or make "interrogative vs. declarative" a property *within* voice modes rather than a separate output type.

---

## Part II — Candidate Classification

[ASSUMPTION] Each candidate classified as: **aggregate / entity / value object / domain service / policy / projection (read model) / unresolved**. The discipline: *aggregate only if it protects an invariant across a consistency boundary.*

| Candidate | Classification | Lives in | Protects / Why |
|---|---|---|---|
| **Hypothesis** | **Aggregate root** | Reasoning | The integrity of an impact claim: always has a falsifier, calibrated confidence, traceable evidence, recorded revisions, defeasible status. Owns its EvidenceCase. |
| **EvidenceCase** | **Entity** (inside Hypothesis) | Reasoning | Coherence of the evidence bearing on one hypothesis (direction/weight/grade; independence before convergence). Not independent of its hypothesis → not an aggregate. |
| **ImpactAssessment** | **Projection / read model** | Reasoning | A rollup of current impact hypotheses for one workout/period. Derived, never a source of truth. (Snapshot variant deferred — Q4.) |
| **DecisionSupportCase** | **Aggregate root** | Decision Support | The integrity of a unit of decision support: complete trace, voice ≤ understanding, confidence+falsifier, decision returned, withholding recorded. |
| **UnderstandingProfile** | **Aggregate root** | Understanding | Per-(athlete×dimension) understanding level; raised only by survived challenge, lowered by surprise, decayed by time. Caps decision-support voice. |
| **Athlete** | **Aggregate root** | Athlete | Who the athlete is and what they're training for; purpose always present (or explicitly unknown); state always timestamped; path-dependent memory never lost. *(State/identity split — unresolved, see below.)* |
| **Purpose** | **Value object** (versioned, inside Athlete) | Athlete | The training intent against which impact and decisions are judged. Versioned so past evidence is reinterpretable. No independent lifecycle → not an aggregate. |
| **ObservationSet** | **Aggregate root** | Ingestion | Immutability and provenance of what was captured in a session. Observations never mutate; every one retains its source and fallibility. |

**Supporting objects named in passing (not in the original candidate list but required by the model):**

| Object | Classification | Lives in | Note |
|---|---|---|---|
| **Signal** | **Value object** | Signal | Protects no independent invariant (meaningful only relative to a baseline it doesn't own). Confirmed *not* an aggregate (resolves an Architecture Discovery question). |
| **VoiceMode** | **Value object** | Decision Support | Closed set of five assertiveness modes; attribute of DecisionSupportCase (Q7). |
| **TraceabilityChain** | **Value object** | Decision Support | Materialized walk from recommendation → observation; held by DecisionSupportCase (Q6). |
| **VoiceSelectionPolicy** | **Domain service / policy** | Decision Support | Chooses VoiceMode from evidence × understanding × risk × purpose (Q7). |
| **SurpriseDetection** | **Domain service / policy** | Understanding | Detects contradiction; triggers understanding decrease and hypothesis reopening. |
| **Inquiry** | **Value object (output type)** | Decision Support | A question to the athlete; first-class output, not a voice mode (Q8). |

### Unresolved classifications

- [QUESTION] **Athlete: one aggregate or two?** Fast-changing `State` and never-changing `Identity` have radically different lifecycles and decay rules. Keeping them in one aggregate is simplest now, but a write to volatile state should not contend with stable identity. **Leaning:** one `Athlete` aggregate root with `AthleteState` as an entity inside it (own decay), `Identity` and `Purpose` as value objects. Split into two aggregates only if state churn causes real contention. Deferred to Domain Modeling 002 (the Athlete model).
- [QUESTION] **EvidenceCase vs. a shared signal-relation:** kept inside Hypothesis for now (Q3); promote the shared relation only under real cross-hypothesis inconsistency.
- [QUESTION] **ImpactSnapshot:** introduced only when a citable, stable assessment is needed (Q4).

---

## Part III — Hypothesis Lifecycle

[ASSUMPTION] The `Hypothesis` aggregate moves through these states. Transitions are evidence-driven and always recorded.

```
                         (a signal is pointed at a candidate impact claim)
                                          │
                                          ▼
   ┌──────────────┐  supporting evidence  ┌──────────────┐  convergent, survives
   │   RAISED     │ ────────────────────► │  SUPPORTED   │  challenge
   │ (open claim, │                       │ (evidence    │ ───────────────┐
   │  falsifier   │ ◄──────────────────── │  leaning for)│                │
   │  named)      │  contradicting        └──────┬───────┘                ▼
   └──────┬───────┘  evidence                    │              ┌──────────────────┐
          │                                       │ contradiction│   KNOWLEDGE      │
          │ falsifier observed                    ▼              │ (justified,      │
          │ / sustained contradiction      ┌──────────────┐     │  defeasible,     │
          ▼                                 │  WEAKENED    │     │  acted upon)     │
   ┌──────────────┐                         │ (confidence  │     └────────┬─────────┘
   │  FALSIFIED   │ ◄────────────────────── │  dropped,    │              │ new contradicting
   │ (retired as  │   falsifier observed    │  reopened)   │              │ evidence (surprise)
   │  disproven)  │                         └──────────────┘              ▼
   └──────────────┘                                              demoted back to SUPPORTED/WEAKENED
                                                                  (never silently; revision recorded)

   Special states:
   • LATENT-PENDING — raised, but evidence is ABSENT and impact may be latent. Held open, not falsified.
                      "Absence of evidence ≠ evidence of absence." May wait weeks.
   • RETIRED        — closed without disproof (e.g., the question stopped mattering). Archived, not deleted.
```

[FACT] Invariants across every state:
- A hypothesis **always has a falsifier** (what would change Aurora's mind). A claim with no possible falsifier is not admitted as a hypothesis.
- Confidence is **always calibrated and stated**, and **travels with the claim** including through demotion.
- **Knowledge is not certainty.** The KNOWLEDGE state is "justified, defeasible, safe to act on" — it can always be demoted.
- **No silent overwrite.** Every transition, especially demotion and revision, is recorded with its cause.
- [ASSUMPTION] **Surprise privileges demotion.** Contradicting evidence cannot be reflexively discarded; it must at minimum lower confidence (RAISED/SUPPORTED → WEAKENED) and may reopen KNOWLEDGE.

[QUESTION] How long does `LATENT-PENDING` stay open before it is archived as `RETIRED`? Is there a per-dimension timeout (immediate vs. accumulated impact differ)?

---

## Part IV — Traceability Model

[FACT] The operative chain (from Architecture Discovery), now mapped to model objects:

```
   DecisionSupportCase
        │  holds a
        ▼
   TraceabilityChain (value object) ── must resolve to the bottom or the case refuses to form
        │  links to
        ▼
   Hypothesis (aggregate)  ──owns──►  EvidenceCase (entity)
        │                                   │  composed of
        │                                   ▼
        │                            evidence relations ──point at──► Signals (value objects)
        ▼                                                                  │  made meaningful from
   (the claim, its confidence, its falsifier)                             ▼
                                                                    ObservationSet (aggregate)
                                                                          │  records
                                                                          ▼
                                                          Observations + Athlete reports + Context
                                                          (each with provenance + fallibility)
```

[ASSUMPTION] Modeling rules:
- **Two-layer protection** (Q6): every artifact carries back-links (distributed), and `DecisionSupportCase` verifies completeness (guardian).
- **A broken chain is a constraint violation, not a silent gap.** If `TraceabilityChain` cannot resolve to observations/report/context, the case cannot reach a *recommendation* or *warning-as-fact* voice. It may still reach *reflection*, *framing-as-prior*, *inquiry*, or *silence*.
- **Priors are labeled in the chain.** When a link bottoms out at a population prior rather than this athlete's data, the chain records it as `prior`, so "athletes usually…" is never presented as "you did…".
- **The chain is immutable once the case is formed.** It is the audit record of *why Aurora said what it said* — even after the underlying hypotheses later revise.

---

## Part V — Invariants

### EvidenceCase invariant
[ASSUMPTION]
> Every evidence relation in the case names its **direction** (for/against), **weight**, **grade** (confirmed/convergent/suggestive/prior/absent), and the **falsifier** it bears on. **Convergence may be claimed only across signals established as genuinely independent.** An `absent` grade is represented explicitly and never silently read as "no impact."

- Protects against: false convergence (overstating agreement from non-independent signals) and the absence-of-evidence fallacy.

### Hypothesis invariant
[ASSUMPTION]
> A hypothesis **always carries a falsifier and a calibrated confidence**, is **always traceable to its EvidenceCase**, and **never transitions silently** — every promotion, demotion, and revision is recorded with cause. It is **never marked certain**; KNOWLEDGE means justified-and-defeasible.

- Protects against: inference presented as fact; un-revisable belief; lost revision history.

### DecisionSupportCase invariant
[FACT-derived] **The central invariant of the whole model:**
> A `DecisionSupportCase` **cannot reach an athlete-facing assertion unless**: (1) it holds a **complete TraceabilityChain** to observation/report/context; (2) its **VoiceMode ≤ the UnderstandingProfile level** for the relevant dimension; (3) every recommendation/warning carries **confidence + falsifier**; (4) it references a **Purpose** (or explicit "purpose unknown → inquiry"); and (5) the **decision is returned to the athlete**. If it instead withholds, the **withholding is recorded with a reason**.

- Protects against: untraceable advice, voice exceeding understanding (population-to-person error), false certainty, purpose-blind optimization, autonomy violation, and unaccountable silence — all in one boundary.

### UnderstandingProfile invariant
[ASSUMPTION]
> Understanding is held **per (athlete × dimension), never globally**. A level is **raised only by evidence that survived challenge**, **lowered by surprise**, and **decayed by time** per the Athlete Model's change-frequency schedule. The profile **caps** the voice any DecisionSupportCase may use in that dimension.

- Protects against: global confidence leakage; overconfidence from mere agreement; stale understanding.

---

## Part VI — VoiceMode Model

[ASSUMPTION] `VoiceMode` is a value object: a closed, ordered set on the assertiveness axis. `Inquiry`, `Withholding` are *separate output types*, not points on this ladder.

```
   Output of the reasoning core
   ├── DecisionSupport ── VoiceMode (value object, ordered):
   │        SILENCE  <  REFLECTION  <  FRAMING  <  WARNING  ≈  RECOMMENDATION
   │        (least assertive)                            (most assertive)
   ├── Inquiry        ── a question to the athlete (different axis: acquiring input)
   └── Withholding    ── recorded silence with a reason
```

[FACT] Selection rule (enforced by `VoiceSelectionPolicy`): the chosen mode is the **minimum of** what evidence grade permits, what the per-dimension understanding level permits, and what the decision's ownership permits. Goal/competition/existential decisions cap at FRAMING/REFLECTION regardless of evidence, because the decision is the athlete's to own. Risk decisions may *raise* to WARNING on weaker evidence (the false-positive/false-negative asymmetry flips for safety).

[ASSUMPTION] Every `DecisionSupport` ends by **returning the decision** to the athlete and, when in RECOMMENDATION/WARNING, **attaches its falsifier** ("…and X would change my mind"). These are not phrasing niceties — they are invariant content of the output.

---

## Part VII — Things We Refuse to Model Yet

[ASSUMPTION] Deliberately out of scope for Domain Modeling 001. Naming them prevents accidental premature commitment.

- **The internal structure of the Athlete aggregate** — one vs. two aggregates, how state decays mechanically. (→ Domain Modeling 002.)
- **Signal detection logic** — how an observation becomes a signal, noise discrimination. (Upstream of the reasoning core.)
- **How confidence is *computed*** — we model that confidence is calibrated, falsifiable, and travels with claims; we do *not* model any scoring formula, weighting, or numeric scheme. (Explicitly a non-goal of the foundation.)
- **How understanding levels are *promoted*** — we model the invariant (survived challenge) and the five levels; the concrete promotion criteria are deferred. (→ a future Understanding modeling paper.)
- **Persistence, identity generation, concurrency, events-as-messages** — all implementation concerns.
- **The Inquiry/reflection boundary** — kept as two output types; will revisit if they collapse in practice (Q8 reversal).
- **Purpose reinterpretation depth** — how far back a purpose change reopens past hypotheses. (→ Athlete/Purpose modeling.)
- **Multi-sport variation** — whether one reasoning model fits all sports identically. (Foundation marks this unknown.)

---

## Part VIII — Glossary

[ASSUMPTION] Modeling terms as used in this document. Where a term refines a foundation concept, the foundation meaning governs.

- **Reasoning (context)** — the single bounded context holding Evidence and Impact as subdomains; owns the path from signal to impact hypothesis.
- **Hypothesis** — aggregate root; a defeasible impact claim with a falsifier, calibrated confidence, an EvidenceCase, and a lifecycle. The single source of truth for an impact claim.
- **EvidenceCase** — entity inside a Hypothesis; the coherent bundle of evidence relations bearing on that one claim.
- **Evidence relation** — a signal pointed at a hypothesis, with direction, weight, and grade. (A value object within EvidenceCase.)
- **ImpactAssessment** — read-model projection rolling up current impact hypotheses for a workout/period; derived, never authoritative.
- **ImpactSnapshot** *(deferred)* — an immutable, citable assessment captured at a point in time, if ever needed.
- **DecisionSupportCase** — aggregate root; guardian of a unit of decision support and its invariant; holds the VoiceMode and TraceabilityChain.
- **VoiceMode** — value object; one of five ordered assertiveness modes (silence < reflection < framing < warning ≈ recommendation).
- **VoiceSelectionPolicy** — domain service choosing the VoiceMode from evidence × understanding × risk × purpose.
- **Inquiry** — first-class output type; a question to the athlete when only they hold the missing input. Not a voice mode.
- **Withholding** — first-class output type; recorded silence with a reason.
- **TraceabilityChain** — value object; the materialized, immutable walk from a recommendation down to observation/report/context.
- **UnderstandingProfile** — aggregate root; per-(athlete×dimension) understanding level; caps voice.
- **Athlete** — aggregate root; the living adaptive system; owner of Purpose and State.
- **Purpose** — versioned value object inside Athlete; the intent against which impact and decisions are judged.
- **ObservationSet** — aggregate root; immutable, provenance-carrying record of what was captured in a session.
- **Signal** — value object; an observation made meaningful by baseline/context. Not an aggregate.

---

## Final Reflection

> **What is the smallest model Aurora needs in order to make one responsible recommendation?**

[ASSUMPTION] Six objects, and not one fewer:

1. **An `ObservationSet`** — something was captured, with provenance. (Without it, nothing is traceable.)
2. **At least one `Signal`** — an observation made meaningful against a baseline. (Without it, there is only raw data.)
3. **A `Hypothesis` with its `EvidenceCase`** — a defeasible impact claim, with evidence pointed at it, a falsifier named, and calibrated confidence. (This *is* the inference; it is the heart.)
4. **A `Purpose`** (from the `Athlete`) — the intent the recommendation is *for*. (Without it, the recommendation optimizes nothing, or the wrong thing.)
5. **An `UnderstandingProfile` entry** for the relevant dimension — to cap how assertively Aurora may speak. (Without it, Aurora risks the population-to-person error.)
6. **A `DecisionSupportCase`** — which assembles the `TraceabilityChain`, has the `VoiceSelectionPolicy` choose a `VoiceMode`, attaches confidence + falsifier, and returns the decision to the athlete. (This is what makes the recommendation *responsible* rather than merely correct.)

[FACT] Strip any one and the recommendation stops being responsible: drop the ObservationSet or the EvidenceCase and it is untraceable; drop the Purpose and it is purpose-blind; drop the UnderstandingProfile cap and it may overreach from the population onto the person; drop the DecisionSupportCase and there is no guardian returning the decision to the athlete. The model is small because the foundation is strict — every object earns its place by protecting one of the non-negotiable principles.

> **Which invariant, if broken, would destroy trust in Aurora fastest?**

[ASSUMPTION] **The `DecisionSupportCase` traceability requirement: that no athlete-facing recommendation may form without a complete, walkable chain back to observation.**

This is the fastest-acting poison because of a peculiar property: a single untraceable recommendation is *indistinguishable from the outside* from a trustworthy one. A stale state corrects itself; a thin understanding deepens; a wrong hypothesis gets revised and the revision is recorded. But the moment untraceable advice becomes *structurally possible*, every recommendation Aurora has ever made becomes suspect — because none of them can any longer prove their provenance. Trust here does not erode gradually; it collapses, because the one guarantee that let an athlete distinguish "a finding" from "a guess wearing the costume of a finding" is gone. Once is enough.

[FACT] This is why traceability is modeled as an invariant *enforced at construction* of the `DecisionSupportCase` — the aggregate refuses to exist in an untraceable state — and not as a property checked, hopefully, after the fact. Every other object in this model is, in the end, in service of being able to honor that one chain when Aurora finally speaks.

---

## Open Questions Carried Forward

1. [QUESTION] Athlete: one aggregate or two (identity vs. volatile state)? → Domain Modeling 002.
2. [QUESTION] Latent-pending timeout: how long before an absent-evidence hypothesis is retired, and is it per-dimension?
3. [QUESTION] Should a shared signal-to-claim relation be promoted out of EvidenceCase to keep multi-hypothesis consistency?
4. [QUESTION] Is a citable `ImpactSnapshot` needed, and when?
5. [QUESTION] Do `Inquiry` and `reflection` stay distinct, or collapse?
6. [QUESTION] Concrete promotion criteria between UnderstandingProfile levels (deferred to a future paper).
7. [QUESTION] How far back does a Purpose change reinterpret past hypotheses?

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the first Domain Modeling paper. It resolves the reasoning core; it defers the Athlete internals and all implementation concerns.*

*Inputs: [Foundation Index](../README.md) · [Evidence](../domain/EVIDENCE_MODEL.md) · [Training Impact](../domain/TRAINING_IMPACT_DISCOVERY.md) · [Decision](../domain/DECISION_MODEL.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Understanding](../domain/UNDERSTANDING_MODEL.md) · [Athlete](../domain/ATHLETE_MODEL.md)*
