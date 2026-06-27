# Aurora — Foundation Index

> The canonical entry point to Aurora's intellectual architecture.
>
> Read this before reading anything else. It is the map; the seven discovery papers are the territory.

This document connects the seven discovery papers that define Aurora *before any code exists*. It is not a summary for marketing and not a product pitch. It is a map of the domain foundation — what Aurora believes, in what order it was discovered, and what every future model and implementation must preserve.

If you are a new contributor or an AI agent, this index exists so you can answer one question before you touch anything:

> **What is Aurora trying to preserve as it moves from discovery into modeling?**

---

## How the Foundation Is Organized

The foundation was discovered in seven sequential papers. Each answers one question and hands its conclusion to the next. They are not independent essays — they are a chain, and reading them out of order loses the argument.

| # | Paper | Location | Answers |
|---|---|---|---|
| 1 | **The Aurora Thesis** | [`foundation/THE_AURORA_THESIS.md`](./foundation/THE_AURORA_THESIS.md) | *Why* Aurora exists |
| 2 | **Training Impact Discovery** | [`domain/TRAINING_IMPACT_DISCOVERY.md`](./domain/TRAINING_IMPACT_DISCOVERY.md) | *What* Aurora studies |
| 3 | **The Evidence Model** | [`domain/EVIDENCE_MODEL.md`](./domain/EVIDENCE_MODEL.md) | *How* Aurora reasons |
| 4 | **The Athlete Model** | [`domain/ATHLETE_MODEL.md`](./domain/ATHLETE_MODEL.md) | *Who* Aurora reasons about |
| 5 | **The Understanding Model** | [`domain/UNDERSTANDING_MODEL.md`](./domain/UNDERSTANDING_MODEL.md) | How Aurora gets *better* at an athlete over time |
| 6 | **The Decision Model** | [`domain/DECISION_MODEL.md`](./domain/DECISION_MODEL.md) | How understanding becomes *responsible help* |
| 7 | **Architecture Discovery** | [`architecture/ARCHITECTURE_DISCOVERY.md`](./architecture/ARCHITECTURE_DISCOVERY.md) | How to *organize* all of the above |

[FACT] All seven share one discipline: every substantive statement is tagged `[FACT]` / `[HYPOTHESIS]` / `[ASSUMPTION]` / `[QUESTION]` / `[UNKNOWN]`, so the reader always knows what is established, what is reasoned, what is chosen, and what is still open. This index inherits that discipline.

---

## The Canonical Chain

Aurora's foundation was discovered in this conceptual order. Each link assumes the previous is resolved:

```
   Thesis ──► Training Impact ──► Evidence ──► Athlete ──► Understanding ──► Decision ──► Architecture
   (why)       (what)             (how)        (who)        (how it grows)   (how it      (how it is
                                                                              helps)       organized)
```

Starting later in the chain without the earlier links produces confident answers to the wrong questions. You cannot reason about *evidence* before you know *what impact is*; you cannot offer *decision support* before you know *how well you understand* the athlete.

---

## The Operational Reasoning Chain

The canonical chain above is how the foundation was *discovered*. The chain below is how Aurora *reasons* in operation — how a single workout becomes responsible help:

```
   Observation ──► Signal ──► Evidence ──► Hypothesis ──► Impact / Understanding ──► Decision Support ──► Athlete Decision
```

[ASSUMPTION] **Athlete and Understanding are not simple pipeline stages.** They are *transversal contexts* that the whole chain consults and writes back to:

- **Athlete** is the shared context of meaning. Every stage reads it — Signal needs the athlete's baselines, Impact needs their purpose, Decision Support needs their constraints. It sits *beside* the chain, not within it.
- **Understanding** sits *above* the chain, governing how assertively Decision Support may speak. It is fed by the stream of tested claims and caps the voice per-dimension.

[FACT] And the chain is a **cycle, not a pipeline**. Three loops make it honest:
- **Surprise** — contradicting evidence updates Understanding (and may revise the Athlete model) *before* any decision support is offered.
- **Purpose change** — a new purpose can reinterpret past evidence (what counted as progress changes).
- **Decision outcome** — the athlete's decision becomes future observation, feeding Understanding over time.

A purely linear reading of either chain misses the feedback that lets Aurora improve and revise.

---

## What Each Paper Contributes

### 1. The Aurora Thesis — *why Aurora exists*
- **Why it exists:** Every product drifts without a stable reason to exist. The Thesis is the filter against which all later decisions are judged.
- **Central question:** Why does Aurora deserve to exist?
- **Main discovery:** Aurora is a *companion* to the athlete's transformation — not a coach, not a dashboard, not a tracker. The athlete is the center; training is stimulus; transformation is the objective.
- **Future architecture must preserve:** The athlete at the center, and Aurora's role as companion that *informs* rather than *commands*. Any design that makes Aurora the authority rather than the athlete violates the Thesis.

### 2. Training Impact Discovery — *what Aurora studies*
- **Why it exists:** Before reasoning about impact, Aurora must know what impact *is*.
- **Central question:** Why can two athletes do the exact same workout and experience completely different impact?
- **Main discovery:** A workout is an observable *event*; impact is an unobservable *consequence*. The athlete mediates between them — impact is a property of the *encounter*, not of the event. Impact spans five dimensions (physical, technical, mental, competitive, longitudinal) and three timescales (immediate, delayed, accumulated).
- **Future architecture must preserve:** The hard separation between *event* (observed) and *impact* (inferred); the existence of latent and invisible-dimension impact that may leave no trace.

### 3. The Evidence Model — *how Aurora reasons*
- **Why it exists:** If impact is never directly observable, Aurora needs an honest way to claim it anyway.
- **Central question:** How can Aurora claim a workout had impact, if impact is never directly observed?
- **Main discovery:** A seven-rung ladder — Observation → Signal → Evidence → Hypothesis → (Impact) → Knowledge → Confidence — with Impact as the unobservable target in the middle. Aurora reasons *upward* from traces but *aims downward* at the cause (inference to the best explanation). Knowledge is defeasible; confidence must be calibrated and falsifiable; the false positive is the costlier error.
- **Future architecture must preserve:** The traceability mandate (no claim without a chain back to observation), calibrated and falsifiable confidence, and the rule that *absence of evidence ≠ evidence of absence*.

### 4. The Athlete Model — *who Aurora reasons about*
- **Why it exists:** A workout has no intrinsic impact; meaning comes from the athlete. Aurora must model the athlete to interpret the workout.
- **Central question:** What must Aurora know about an athlete to correctly interpret the impact of a workout?
- **Main discovery:** The athlete is a living adaptive system across seven dimensions — Identity, Purpose, State, Capacity, History, Constraints, Context — each changing at its own rate (state hourly, identity never, injuries/overtraining never decay). The impact equation is `Workout × Athlete(...) at Moment, relative to Goals`. The one thing Aurora must never forget is **Purpose**.
- **Future architecture must preserve:** The seven dimensions and their time-classification (the decay schedule); purpose as the indispensable referent; the explicit list of permanent unknowns.

### 5. The Understanding Model — *how Aurora gets better over time*
- **Why it exists:** Aurora must earn understanding of a *specific* athlete the way a veteran coach does — slowly, through tested experience.
- **Central question:** How do I know whether I truly understand this athlete, or am simply overconfident?
- **Main discovery:** Two distinct kinds of confidence — *in a claim* (Evidence Model) vs. *in understanding* (this paper). Five per-dimension levels: Unknown → Thin → Working → Trusted → Mature. Understanding is earned by *survived challenge*, not accumulated agreement; surprise is the most informative event; the central error is mistaking the population for the person.
- **Future architecture must preserve:** Understanding as *per-dimension, never global*; the rule that understanding level *caps* decision-support voice; surprise as a privileged, model-revising event.

### 6. The Decision Model — *how understanding becomes responsible help*
- **Why it exists:** Aurora exists to help athletes decide — without replacing their agency.
- **Central question:** What can Aurora responsibly help an athlete decide, and where must it stop?
- **Main discovery:** Four layers — Observation / Interpretation / Decision Support / Decision — of which Aurora owns the first three and never the fourth. Five voice modes in a ladder of assertiveness: Silence → Reflection → Framing → Warning → Recommendation, climbed only as far as evidence × understanding × risk × ownership permit. A *good decision ≠ a good outcome* (judge by process). The one decision Aurora must never make is **purpose**.
- **Future architecture must preserve:** Athlete agency (support, never own, the decision); voice matched to evidence and understanding; silence as a valid output; decision quality judged by reasoning, not result.

### 7. Architecture Discovery — *how to organize all of it*
- **Why it exists:** The six papers define Aurora's mind; this one organizes it without losing what the mind requires.
- **Central question:** How should Aurora be organized to move from observation to decision support without losing traceability, uncertainty, purpose, or agency?
- **Main discovery:** Seven candidate bounded contexts along an epistemic ladder (Ingestion, Signal, Evidence, Impact, Decision Support) with Athlete and Understanding as *cross-cutting* contexts; domain events that carry facts (not interpretations) across boundaries, including first-class `SignalRejectedAsNoise` and `RecommendationWithheld`; candidate aggregates gated by the invariant rule; traceability as a structural invariant; a cyclic, loop-aware context map.
- **Future architecture must preserve:** Traceability enforced *by construction*; each context's "must not own" boundary; uncertainty and silence as first-class; purpose visible everywhere; the loops that make revision possible.

---

## Non-Negotiable Principles

[ASSUMPTION] These are the constraints that all future domain modeling and implementation must honor. Violating any one of them is not a trade-off — it breaks the foundation.

1. **Aurora never presents inference as fact.** Every claim about impact is a calibrated, defeasible hypothesis, stated as such — never *"this happened,"* always *"the evidence supports this, to this degree."*
2. **No recommendation without traceability.** Every piece of decision support must be walkable, link by link, back to the observations that produced it. If the chain breaks, the recommendation is not made.
3. **Uncertainty is first-class.** "I don't know yet" is a valid, representable, propagatable output — not an error state. A model with no home for its own ignorance fills the gap with false confidence.
4. **Purpose constrains interpretation.** Nothing — no impact claim, no recommendation — is evaluated independent of what the athlete is training for. Aurora must not optimize metrics in a purpose vacuum.
5. **Athlete agency is preserved.** Aurora supports decisions; it never owns them. The architecture must make it structurally impossible for Aurora to decide *for* the athlete.
6. **Understanding is dimension-specific, never global.** Confidence earned in one dimension (e.g., recovery) must never leak into another (e.g., heat response). There is no single "Aurora knows this athlete."
7. **Population knowledge is fallback, not truth.** Priors are visible, labeled as priors, and overridable by personal evidence. A population belief must never silently become a personal finding.
8. **Silence is a valid output.** Withholding is a deliberate, recorded, accountable act — not an absence. Aurora speaks only when speaking helps the athlete decide better than silence would.
9. **Human report is evidence, not noise.** The athlete's voice (effort, soreness, meaning, stress) travels the same reasoning ladder as device data — fallible, but carrying information no instrument has.
10. **Architecture must make revision possible.** Hypotheses, understanding, and impact are all defeasible. Nothing is silently overwritten; revisions are recorded; surprise can reopen what was settled.

---

## Domain Truths Discovered So Far

[FACT] / [ASSUMPTION] The load-bearing truths the foundation rests on. Future work may deepen these, but must not contradict them without revisiting the papers that established them.

- **A workout has no intrinsic impact.** Impact emerges from the encounter between a specific workout and a specific athlete at a specific moment, pursuing a specific purpose.
- **Impact is a consequence, not an event.** The workout is what happened; the impact is what it *changed* in the athlete.
- **Impact is inferred, never directly observed.** Aurora's relationship to impact is permanently indirect — like medicine and science, it reasons from traces to causes.
- **The athlete is the context through which training acquires meaning** — not the receiver of training, but the function that turns stimulus into consequence.
- **Aurora's understanding matures over time** — and can also decay. It is earned by survived challenge, not by accumulated agreement.
- **A good decision is not the same as a good outcome.** In an uncertain domain, sound reasoning can meet bad luck. Aurora judges decisions by process, not result.
- **Purpose is the concept Aurora must never lose sight of** — the one thing it must never forget (Athlete Model), the one decision it must never make (Decision Model), and the one concept that must remain visible everywhere (Architecture Discovery).
- **The false positive is the costlier error.** A confident claim that proves false erodes trust faster than an honest "I don't know yet" ever could.

---

## Open Questions for Domain Modeling

These are the unresolved questions the foundation deliberately leaves open. They are the agenda for the **next** phase — Domain Modeling — and must be answered before implementation architecture begins. They are *not* resolved here, by design.

**Bounded contexts**
- [QUESTION] Should Evidence and Impact be one bounded context or two? (Their bidirectional dependency suggests a single "Reasoning" context — unconfirmed.)
- [QUESTION] Are Athlete and Understanding best modeled as cross-cutting contexts, or do they need a different treatment than the ladder contexts?
- [QUESTION] Which of the seven candidate contexts are truly distinct, and which collapse together under real modeling?

**Aggregates and invariants**
- [QUESTION] Is Athlete one aggregate or several? (Fast-changing state vs. never-changing identity may warrant separate lifecycles.)
- [QUESTION] Is Purpose a value object, an aggregate, or part of Athlete? (Purpose changes can reinterpret past evidence, which argues for versioning at least.)
- [QUESTION] What invariant does UnderstandingProfile protect, and is it one profile per athlete or per (athlete × dimension)?
- [QUESTION] Is Signal an aggregate at all, or a value object? (If it protects no invariant, it is not an aggregate.)
- [QUESTION] Is EvidenceCase separate from Hypothesis, or two views of one aggregate?

**Lifecycles**
- [QUESTION] What is the lifecycle of a Hypothesis (raised → weakened/strengthened → promoted to knowledge → revised → retired)?
- [QUESTION] What is the lifecycle of a DecisionSupportCase, and does it persist as the permanent audit record?
- [QUESTION] How long does a hypothesis stay open while waiting for latent impact to surface?

**Events**
- [QUESTION] Which of the candidate events are truly *domain* events (cross-boundary, meaningful to the domain) versus internal process events?
- [QUESTION] Should "ask the athlete" be a first-class output mode with its own event (`AthleteQuestionRaised`)?

**Human input and purpose**
- [QUESTION] Where exactly does athlete self-report enter the model — as observation, as evidence, or both, and at which boundary?
- [QUESTION] When stated purpose and revealed purpose (behavior) diverge, which does Impact evaluate against?
- [QUESTION] How far back should a purpose change reinterpret past evidence — all history, or a bounded window?

**Traceability**
- [QUESTION] How is traceability enforced *conceptually* in the model — as an invariant on DecisionSupportCase, a property of every entity, or both?
- [QUESTION] What is the minimal trace a recommendation must carry to be considered complete?

---

## Non-Goals

[FACT] This index, and the foundation it maps, does **not**:
- define implementation architecture,
- choose frameworks, languages, or cloud services,
- define REST/GraphQL APIs or event schemas,
- define database models,
- define UI screens,
- or write code.

This is consolidation, not implementation. The discovery phase proposes the *shape* of the domain; it does not freeze it, and it does not build it.

---

## How to Use This Index

1. **New to Aurora?** Read this index, then the seven papers in order. The chain only makes sense forward.
2. **Contesting a decision?** Return to the paper that owns the relevant question, and to the Non-Negotiable Principles above.
3. **Starting Domain Modeling?** Begin from the Open Questions section — that is your agenda.
4. **Reviewing a design?** Check it against the ten Non-Negotiable Principles and the Domain Truths. A design that violates one has departed from the foundation, and that departure must be deliberate and documented.

---

## What Comes Next

[ASSUMPTION] The foundation (discovery) is complete: six domain papers plus one architecture-discovery paper. The next phase is **Domain Modeling** — resolving the Open Questions above into a concrete model (contexts, aggregates, invariants, lifecycles) — followed only then by **implementation architecture**.

Nothing in the next phases may silently contradict this foundation. If modeling reveals that a foundational belief was wrong, the correct response is to *revise the relevant paper deliberately* — not to quietly route around it. The foundation is the most stable layer; changing it is a significant event, not a routine update.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*Foundation papers · [Thesis](./foundation/THE_AURORA_THESIS.md) · [Training Impact](./domain/TRAINING_IMPACT_DISCOVERY.md) · [Evidence](./domain/EVIDENCE_MODEL.md) · [Athlete](./domain/ATHLETE_MODEL.md) · [Understanding](./domain/UNDERSTANDING_MODEL.md) · [Decision](./domain/DECISION_MODEL.md) · [Architecture Discovery](./architecture/ARCHITECTURE_DISCOVERY.md)*
