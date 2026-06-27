# Architecture Discovery — From Observation to Responsible Decision Support

> How should Aurora be organized so it can move from observation to decision support without losing traceability, uncertainty, purpose, or the athlete's agency?
>
> This is domain architecture discovery, not implementation. No frameworks, databases, APIs, or code — only the shape the domain demands.

---

## How to Read This Document

Same discipline as the six foundational papers. Every substantive statement is tagged.

| Tag | Meaning |
|---|---|
| **[FACT]** | Well-established or self-evidently true. |
| **[HYPOTHESIS]** | Reasoned but unproven for our system. Must be validated. |
| **[ASSUMPTION]** | A stance Aurora chooses. Not a truth — a commitment. |
| **[QUESTION]** | Open question to resolve before designing. |
| **[UNKNOWN]** | We genuinely don't know. |

---

## The Question This Document Answers

The six foundational papers defined Aurora's mind. This one asks how that mind should be *organized*:

```
   Observation → Signal → Evidence → Hypothesis → Understanding → Decision Support
```

[FACT] Each arrow in that chain is a transformation that the prior papers already defined conceptually. Architecture's job is to decide *where each transformation lives*, *what crosses between the stages*, and *what must never collapse into what*.

[ASSUMPTION] The governing test, inherited from every prior paper: **if the architecture cannot explain why Aurora said something, it is wrong. If it cannot say "I don't know yet," it is wrong. If it can produce a recommendation without evidence, it is wrong.** Architecture here is not about scale or performance — it is about preserving the epistemic honesty the domain requires.

---

## Core Principle

[ASSUMPTION] Architecture serves the domain, never the reverse. Aurora's architecture must structurally preserve seven things:

1. **Traceability** — every claim links back to what produced it.
2. **Uncertainty** — "I don't know yet" is a first-class output, not an error state.
3. **Athlete agency** — the system supports decisions; it never owns them.
4. **Purpose alignment** — nothing is interpreted independent of what the athlete trains for.
5. **Longitudinal learning** — understanding matures and decays over time.
6. **Evidence-based reasoning** — no hypothesis without evidence, no confidence without falsifiability.
7. **Responsible decision support** — voice matched to evidence and understanding.

[FACT] These are not features to add later. They are constraints on the *shape* of the architecture. An architecture that bolts traceability on afterward will leak it; it must be load-bearing from the first boundary.

---

## Discovery Area 1 & 2: Bounded Contexts and Their Boundaries

[ASSUMPTION] The six papers strongly suggest seven candidate bounded contexts, each corresponding to one transformation in the epistemic ladder. They are *derived* from the domain, not invented as technical modules. [QUESTION] Whether all seven are truly separate contexts or some collapse together is itself an open question, flagged per context.

A bounded context, here, means: **a region of the domain with its own language, its own responsibility, and a clear rule about what it must never do.** The "must not own" line is as important as the "owns" line — it is what prevents the collapse of observation into impact that the Evidence Model forbids.

---

### 1. Observation / Ingestion Context

[ASSUMPTION]
- **Purpose:** Capture faithfully what happened. Nothing more.
- **Core language:** Workout, observation, stream, athlete report, recording, timestamp, device, artifact.
- **Inputs:** Device data (power, HR, pace, distance, duration, splits, GPS), athlete-reported notes, recovery/sleep inputs if available.
- **Outputs:** Faithful, attributed observations — each marked with its source and its fallibility.
- **Owns:** What was recorded, and the provenance of every recording.
- **Must NOT own:** Meaning. [FACT] An observation context that decides "this was a hard session" has already crossed into Signal. Ingestion may flag a reading as a likely *artifact* (a defensible recording-level judgment) but must never assign training meaning.
- **Depends on:** Nothing upstream (it is the source boundary).
- **Depended on by:** Signal (primarily), and everything downstream via traceability.
- **Failure it prevents:** Fabricated or unattributed data entering the reasoning chain. If the bottom of the ladder is corrupt, every claim above it is poisoned.

[ASSUMPTION] Critically, this context treats observations as **fallible by default** (Evidence Model). It is the home of "the strap read 210 bpm — probably interference." [QUESTION] Is artifact-detection an Ingestion responsibility or a Signal one? It needs context (baseline) to judge, which argues for Signal — but raw implausibility can be caught at Ingestion. Likely both, at different strengths.

---

### 2. Signal Context

[ASSUMPTION]
- **Purpose:** Turn observations into meaningful signals by applying context and baselines.
- **Core language:** Signal, noise, baseline, context, anomaly, trend, threshold, interpretability.
- **Inputs:** Observations (from Ingestion), athlete baselines and history (from Athlete context).
- **Outputs:** Detected signals, *and explicit noise rejections* (a rejection is itself information — see Domain Events).
- **Owns:** The judgment "this observation is interpretable relative to this athlete's baseline."
- **Must NOT own:** What the signal *means for impact*. "250W for 40 min is unusual for this athlete" is a signal; "this built fitness" is a hypothesis, owned by Evidence/Impact.
- **Depends on:** Observation, Athlete (for baselines).
- **Depended on by:** Evidence.
- **Failure it prevents:** Mistaking noise for meaning (and its twin, discarding rare-but-real signals as noise).

[FACT] This is the first act of interpretation, and it is already a judgment. [ASSUMPTION] The Signal context must preserve the distinction between *noise* (random fluctuation), *artifact* (measurement error), and *coincidence* — the Understanding Model's four-way discrimination begins here.

---

### 3. Evidence Context

[ASSUMPTION]
- **Purpose:** Relate signals to specific hypotheses — give them direction and weight.
- **Core language:** Evidence, hypothesis, direction (for/against), weight, convergence, grade (confirmed/convergent/suggestive/prior/absent), falsifier.
- **Inputs:** Signals (from Signal), hypotheses under test (from Impact), priors (population knowledge).
- **Outputs:** Evidence relations — "this signal points *this way*, *this strongly*, on *this claim*" — and convergence assessments.
- **Owns:** The relation between a signal and a claim. The grading of evidence. The naming of falsifiers.
- **Must NOT own:** The hypothesis itself (that's Impact), or whether to act on it (that's Decision Support). Evidence weighs; it does not decide.
- **Depends on:** Signal, Impact (for the hypotheses to bear on), Athlete (for priors).
- **Depended on by:** Impact, Understanding, Decision Support, and traceability above all.
- **Failure it prevents:** "Evidence in a vacuum" — data treated as meaningful without a claim it bears on. Also the overstatement of convergence from signals that only appear independent.

[FACT] Evidence does not exist in the abstract; it exists relative to a hypothesis (Evidence Model). [HYPOTHESIS] This bidirectional dependency with Impact (Evidence needs a hypothesis to weigh; Impact needs evidence to revise) suggests these two may be the most tightly coupled contexts — possibly one context with two faces. Flagged for boundary review.

---

### 4. Impact Context

[ASSUMPTION]
- **Purpose:** Reason about the unobservable consequence of training — raise, hold, revise, and retire impact hypotheses.
- **Core language:** Impact, hypothesis, adaptation, latent impact, dimension (physical/technical/mental/competitive/longitudinal), timescale (immediate/delayed/accumulated), change-vs-impact, defeasibility.
- **Inputs:** Evidence relations (from Evidence), athlete context (from Athlete), priors.
- **Outputs:** Impact hypotheses with confidence, their falsifiers, and their dimension/timescale; revisions to prior hypotheses.
- **Owns:** The representation of inferred impact. The distinction between change (observed) and impact (inferred). The handling of latent impact ("absent signal ≠ no impact").
- **Must NOT own:** The observations or signals beneath it (those are upstream), or the decision about whether to tell the athlete (that's Decision Support).
- **Depends on:** Evidence, Athlete.
- **Depended on by:** Understanding, Decision Support.
- **Failure it prevents:** Collapsing change into impact (claiming "you got stronger" from "power rose 5W"); treating absent evidence as evidence of absence.

[FACT] Impact is permanently indirect (Training Impact, Evidence Model). [ASSUMPTION] This context must be able to hold a hypothesis as *open and unresolved* indefinitely — latent impact may take weeks to surface. Architecture must not force premature resolution.

---

### 5. Athlete Context

[ASSUMPTION]
- **Purpose:** Represent the athlete as a living adaptive system — the context through which training acquires meaning.
- **Core language:** Identity, purpose, state, capacity, history, constraints, context (the Athlete Model's seven dimensions), and the time-classification of each.
- **Inputs:** Athlete-reported information, confirmed knowledge fed back from Impact/Understanding, contextual data (calendar, season).
- **Outputs:** The athlete model that every other context consults — baselines for Signal, priors-vs-personal for Evidence, purpose for Decision Support.
- **Owns:** Who the athlete is, what they're training for, their current state, capacity, history, constraints, and context. **Purpose lives here.**
- **Must NOT own:** Impact hypotheses (those are Impact), or how well Aurora understands the athlete (that's Understanding — a subtle but critical separation, see below).
- **Depends on:** Human input (reports), and feedback from downstream (confirmed knowledge updates capacity, etc.).
- **Depended on by:** Nearly everything — it is the shared context of meaning.
- **Failure it prevents:** Interpreting training without interpreting the athlete; the "stale athlete model" where old state or purpose silently drives current reasoning.

[FACT] This context embodies the Athlete Model's time discipline: state decays fast, identity never, injuries/overtraining never (path-dependent memory). [ASSUMPTION] The separation between *the athlete model* (Athlete context: what is true of them) and *Aurora's understanding of the athlete* (Understanding context: how well Aurora knows it) is one of the most important boundaries in the whole architecture. Conflating them is the architectural form of the population-to-person error.

---

### 6. Understanding Context

[ASSUMPTION]
- **Purpose:** Track how well Aurora understands *this athlete*, per dimension, over time.
- **Core language:** Understanding confidence, levels (Unknown/Thin/Working/Trusted/Mature), pattern, surprise, personalization, decay, archive, path-dependent memory.
- **Inputs:** Confirmed and contradicted claims over time (from Evidence/Impact), surprises, the passage of time.
- **Outputs:** A per-dimension understanding level that *caps the assertiveness* of Decision Support.
- **Owns:** The meta-model — Aurora's competence regarding this person. The detection of surprise. The maturing and decay of understanding.
- **Must NOT own:** The athlete's actual attributes (those are Athlete), or individual claim confidence (that's Evidence). It governs the *second kind* of confidence, never the first.
- **Depends on:** Evidence/Impact (the stream of tested claims), Athlete (the dimensions to understand across), time.
- **Depended on by:** Decision Support (which it constrains).
- **Failure it prevents:** Population-to-person error; overconfidence; premature personalization; stale understanding.

[FACT] Understanding is per-dimension, never global (Understanding Model). [ASSUMPTION] Architecturally, this means understanding level cannot be a single attribute on the athlete — it must be indexed by dimension, and it must be queryable by Decision Support before any voice is chosen.

---

### 7. Decision Support Context

[ASSUMPTION]
- **Purpose:** Turn evidence and understanding into responsible decision support — or into silence.
- **Core language:** Decision, decision support, voice mode (silence/reflection/framing/warning/recommendation), evidence threshold, risk tier, autonomy, the four-layer distinction.
- **Inputs:** Impact hypotheses + confidence (from Impact), understanding levels (from Understanding), purpose (from Athlete), the decision at hand.
- **Outputs:** Decision support in an appropriate voice, *with its traceability chain attached and the decision returned to the athlete* — or an explicit withholding.
- **Owns:** Whether to speak, in what voice, at what assertiveness. The matching of voice to evidence × understanding × risk × ownership.
- **Must NOT own:** The decision itself (the athlete's, always). The evidence or hypotheses (upstream). It must not *generate* new claims — only act on existing, traced ones.
- **Depends on:** Impact, Understanding, Athlete (purpose).
- **Depended on by:** The athlete (and the record of their decisions).
- **Failure it prevents:** Recommendation overreach, autonomy violation, speaking without traceability, voice exceeding understanding.

[FACT] This context is where the Decision Model lives in full: the five voice modes, the risk tiers, the understanding-caps-voice rule, the autonomy-preserving close. [ASSUMPTION] It is structurally forbidden from inventing claims — it may only select among, and speak about, hypotheses that arrived fully traced from upstream. This is the architectural guarantee against "opinions wearing the costume of findings."

---

## Discovery Area 3: Domain Events

[ASSUMPTION] Events are how contexts communicate without collapsing into each other. Each carries *what happened* across a boundary while leaving *interpretation* to the receiving context. [QUESTION] Whether these are literal published events or simply conceptual transitions is an implementation question — here they name the meaningful state-changes the domain produces. No payload schemas (a non-goal).

| Event | What happened | Emitted by | Who cares | Must contain (conceptually) | Must NOT contain |
|---|---|---|---|---|---|
| `WorkoutRecorded` | A session was captured | Ingestion | Signal, Athlete | Provenance, raw streams, athlete attribution | Any interpretation of meaning |
| `ObservationCaptured` | A specific value was recorded | Ingestion | Signal | The value, its source, its fallibility flag | A claim about what it means |
| `SignalDetected` | An observation became interpretable | Signal | Evidence, Understanding | The signal, the baseline/context that made it one | The hypothesis it bears on |
| `SignalRejectedAsNoise` | An observation was judged not interpretable | Signal | Understanding (bias-check), traceability | What was rejected and why | A claim it was *truly* meaningless (rejections are revisable) |
| `EvidenceAttachedToHypothesis` | A signal was related to a claim | Evidence | Impact, Understanding | Direction, weight, grade, the falsifier | A decision to act |
| `HypothesisRaised` | A candidate impact claim was opened | Impact | Evidence, Understanding | The claim, its dimension/timescale, its falsifier | Confidence not yet earned |
| `HypothesisWeakened` | Contradicting evidence arrived | Impact | Understanding, Decision Support | What weakened it, new confidence | — |
| `HypothesisPromotedToKnowledge` | Support became strong/convergent | Impact | Understanding, Decision Support | The convergent evidence, confidence, standing falsifier | Any claim of certainty |
| `ImpactHypothesized` | An impact was inferred | Impact | Understanding, Decision Support | Dimension, timescale, confidence, falsifier | The observation (only a link to it) |
| `ImpactRevised` | An impact claim changed | Impact | Understanding, Decision Support | What changed and why | Silent overwrite (history matters) |
| `AthleteStateChanged` | Fast-changing state shifted | Athlete | Signal, Decision Support | The new state, its recency | Stale prior state presented as current |
| `AthletePurposeChanged` | Purpose was updated | Athlete | All contexts | New purpose, effective time | — |
| `UnderstandingLevelIncreased` | Aurora earned deeper understanding | Understanding | Decision Support | Dimension, new level, what earned it | A global "knows the athlete" claim |
| `UnderstandingLevelDecreased` | Understanding became less trustworthy | Understanding | Decision Support | Dimension, new level, the surprise that caused it | — |
| `SurpriseDetected` | Evidence contradicted the model | Understanding | Impact, Athlete, Decision Support | What was contradicted, magnitude | A reflexive dismissal as noise |
| `DecisionSupportRequested` | A decision point arose / athlete asked | Decision Support | — | The decision at hand, its risk tier | — |
| `DecisionSupportGenerated` | Aurora spoke | Decision Support | Athlete, traceability record | Voice mode, the support, confidence, falsifier, traceability chain | An imperative without reasoning |
| `RecommendationWithheld` | Aurora chose silence | Decision Support | traceability record | Why withheld (weak evidence / thin understanding / not Aurora's) | — |
| `AthleteDecisionRecorded` | The athlete chose | Athlete | Understanding (feeds future learning), Impact | The decision, divergence from support if any | A judgment of the choice |

[FACT] Two events are easy to omit and essential to keep: **`SignalRejectedAsNoise`** (so noise rejection is auditable and bias-checkable) and **`RecommendationWithheld`** (so silence is a recorded, accountable act, not an absence). [ASSUMPTION] Without these, the architecture cannot distinguish "Aurora considered and chose not to speak" from "Aurora missed it" — and that distinction is trust-critical.

---

## Discovery Area 4: Candidate Aggregates

[ASSUMPTION] An aggregate earns the name only if it **protects an invariant**. Things that merely hold data are not aggregates. For each candidate: why it might be one, what invariant it protects, what it owns, what it must not own, open questions.

### Athlete *(strong candidate — root aggregate)*
- **Why:** It is the consistency boundary for who the athlete is and what they're training for.
- **Invariant protected:** [ASSUMPTION] An athlete always has a purpose (or an explicit "purpose unknown" state); state is always timestamped; path-dependent memory (injury/overtraining) is never lost.
- **Owns:** Identity, purpose, state, capacity, history, constraints, context.
- **Must not own:** Impact hypotheses; understanding levels.
- **Open:** [QUESTION] Is the whole athlete one aggregate, or do fast-changing state and never-changing identity belong in separate aggregates with different lifecycles?

### Workout / ObservationSet *(candidate)*
- **Why:** A workout is a natural consistency boundary for "what was recorded in this session."
- **Invariant protected:** [ASSUMPTION] Observations are immutable once recorded and always retain provenance; a workout's observations are internally consistent in time.
- **Owns:** Its observations, their sources, their fallibility flags.
- **Must not own:** Signals or meaning.
- **Open:** [QUESTION] Are Workout and ObservationSet the same aggregate, or is ObservationSet a finer boundary (e.g., multi-source: device + athlete report + sleep)?

### Signal *(weak candidate)*
- **Why:** Possibly just a value object, not an aggregate.
- **Invariant protected:** [HYPOTHESIS] Perhaps none of its own — a signal is meaningful only relative to a baseline it doesn't own.
- **Open:** [QUESTION] If a signal protects no invariant, it is **not** an aggregate. Likely a value object emitted within the Evidence/Signal flow. Flagged.

### EvidenceCase *(candidate)*
- **Why:** The bundle of evidence bearing on one hypothesis needs internal consistency (direction, weight, convergence).
- **Invariant protected:** [ASSUMPTION] Every piece of evidence in the case names its direction, weight, and falsifier; convergence is only claimed across genuinely independent signals.
- **Owns:** The set of evidence relations for one hypothesis.
- **Must not own:** The hypothesis's confidence (that's the hypothesis's).
- **Open:** [QUESTION] Is EvidenceCase separate from Hypothesis, or two views of one aggregate?

### Hypothesis / ImpactAssessment *(strong candidate)*
- **Why:** An impact claim has invariants that must always hold.
- **Invariant protected:** [ASSUMPTION] A hypothesis always has a falsifier; confidence is always calibrated and stated; it is always traceable to evidence; it is never promoted to "knowledge" without convergent support; it is never silently overwritten (revisions are recorded).
- **Owns:** The claim, its dimension/timescale, its confidence, its falsifier, its revision history.
- **Must not own:** The decision to communicate it.
- **Open:** [QUESTION] One aggregate per hypothesis, or an ImpactAssessment aggregating many hypotheses about one workout/period?

### UnderstandingProfile *(strong candidate)*
- **Why:** Per-dimension understanding levels need consistency rules.
- **Invariant protected:** [ASSUMPTION] Understanding is always per-dimension (never global); a level is only raised by survived-challenge evidence; surprise always lowers the affected dimension; decay is applied per the time-classification.
- **Owns:** The map of dimension → understanding level, and the evidence trail behind each.
- **Must not own:** The athlete's actual attributes; individual claim confidence.
- **Open:** [QUESTION] Is this one profile per athlete, or per (athlete × dimension)?

### DecisionSupportCase *(strong candidate)*
- **Why:** A unit of decision support has invariants critical to trust.
- **Invariant protected:** [ASSUMPTION] Support is never generated without a complete traceability chain; voice never exceeds the understanding level; every recommendation carries confidence + falsifier; the decision is always returned to the athlete; withholding is always recorded with a reason.
- **Owns:** The voice mode, the support content, its traceability chain, its outcome (spoken/withheld).
- **Must not own:** The athlete's decision; the underlying hypotheses (only links to them).
- **Open:** [QUESTION] Does a DecisionSupportCase persist as the audit record, or is it transient with the trace stored elsewhere?

### AthleteDecision *(candidate)*
- **Why:** Recording what the athlete chose (and any divergence from support) feeds future understanding.
- **Invariant protected:** [ASSUMPTION] A decision is recorded without judgment; divergence from Aurora's support is captured neutrally; it links to the support case that preceded it (if any).
- **Owns:** The choice, its timing, its relation to prior support.
- **Must not own:** An evaluation of the choice's quality (quality is process-based and assessed elsewhere, over time).
- **Open:** [QUESTION] Is this its own aggregate or part of the Athlete's history?

### Purpose *(candidate — possibly a value object within Athlete)*
- **Why:** Purpose is central enough to consider standalone.
- **Invariant protected:** [ASSUMPTION] Purpose always exists or is explicitly unknown; purpose changes are versioned (so past evidence can be reinterpreted against the purpose that was current then).
- **Open:** [QUESTION] Is Purpose a value object owned by Athlete, or significant enough to be its own aggregate given that purpose changes can reinterpret past evidence?

[FACT] The discipline holds: **Signal and possibly Purpose protect no independent invariant and so may not be aggregates.** Calling everything an aggregate would be forcing DDD patterns prematurely — exactly what the mission warns against.

---

## Discovery Area 5: The Critical Flow

[ASSUMPTION] The proposed linear flow is a useful spine but **incomplete in four ways**. First the spine, then the corrections.

**Proposed spine:**
1. Workout recorded → 2. Observations extracted → 3. Observations contextualized → 4. Signals detected or rejected → 5. Signals attached to hypotheses → 6. Evidence weighed → 7. Impact hypotheses raised/revised → 8. Athlete state & understanding updated → 9. Decision opportunity detected → 10. Voice mode selected → 11. Decision support generated or withheld → 12. Athlete remains owner.

**Corrections / missing steps:**

[ASSUMPTION]
- **Missing: athlete report enters in parallel, not after.** Human input (perceived effort, soreness, life stress) enters alongside device observation at step 2–3, not as an afterthought. It is a co-equal source.
- **Missing: purpose check gates interpretation.** Before step 7 (impact) and again at step 9–10 (decision), purpose must be consulted. Impact is meaningless without purpose; voice is unjustifiable without it.
- **Missing: surprise branch.** At step 6–7, if evidence contradicts the existing model, a *surprise* fires that loops back to update Understanding (step 8) and possibly revise the Athlete model — *before* any decision support. Surprise pre-empts the forward flow.
- **Missing: the loop back.** Step 12 is not terminal. The athlete's decision (and its eventual outcome) becomes future observation, feeding understanding. The flow is a cycle.

**Where uncertainty enters:** [FACT] at *every* step — fallible observation (2), noise-vs-signal (4), evidence weight (6), hypothesis confidence (7), understanding level (8), and the speak/withhold judgment (9–11). Uncertainty is not a stage; it is a property carried along the whole flow.

**Where traceability must be preserved:** [FACT] at every arrow. Each step must retain a link to its input, so that from step 11 one can walk back to step 1. A step that transforms without linking breaks the chain.

---

## Discovery Area 6: The Traceability Chain

[FACT] The traceability mandate (Evidence Model, Decision Model) becomes an architectural invariant: **every meaningful recommendation must be walkable, link by link, back to its origin.**

```
   Recommendation / Decision Support
        │
        ▼
   Decision Support Case   ── voice mode, confidence, falsifier
        │
        ▼
   Hypothesis (Impact)     ── claim, dimension, confidence, falsifier
        │
        ▼
   Evidence Case           ── direction, weight, grade, convergence
        │
        ▼
   Signals                 ── baseline/context that made them interpretable
        │
        ▼
   Observations            ── value + provenance + fallibility
        │
        ▼
   Workout / Athlete Report / Context
```

[ASSUMPTION] Architectural rules for the chain:

- **Where it can break:** any context that produces an output without linking it to its input. The highest-risk breaks are Signal→Evidence (a signal used without recording which hypothesis) and Impact→Decision Support (a recommendation generated from something other than a traced hypothesis).
- **How Aurora detects a break:** [HYPOTHESIS] a Decision Support Case must *refuse to form* if it cannot resolve its chain to the bottom. Detection is structural: the invariant "no support without complete chain" makes a break a constraint violation, not a silent gap.
- **What happens when traceability is incomplete:** [ASSUMPTION] Aurora drops to a lower-assertiveness voice or to silence. An incomplete chain *can* still permit speech — but only as a disclosed prior ("athletes usually…, but I can't yet trace this to you") or as a question, never as a recommendation.
- **Can Aurora still speak with a broken chain? In what voice?** [ASSUMPTION] Yes — but only in Reflection, Framing-as-prior, or a question. Never Recommendation or Warning-as-fact. The chain's completeness is a gate on the *top* of the voice ladder.

[FACT] This is why Decision Support is structurally forbidden from generating claims: every claim must arrive pre-traced from Impact. The architecture makes "opinion dressed as finding" impossible by construction, not by discipline.

---

## Discovery Area 7: Uncertainty and Silence

[FACT] Uncertainty is first-class, not an error condition. It has a home, a flow, and a consequence.

[ASSUMPTION] **Where uncertainty is produced:**
- Ingestion: fallible/artifact observations.
- Signal: weak signal, noise-ambiguity.
- Evidence: conflicting evidence, low grade, false-convergence risk.
- Impact: low hypothesis confidence, latent (absent-signal) impact.
- Athlete: unknown context, ambiguous or stale purpose.
- Understanding: thin/unknown understanding of a dimension.
- Decision Support: insufficient evidence for the decision's risk tier.

[ASSUMPTION] **Where uncertainty is consumed:** primarily Decision Support, which integrates all upstream uncertainty into the speak/withhold/voice judgment. Understanding also consumes it (surprise is uncertainty about the model itself).

[ASSUMPTION] **How uncertainty affects voice:** it lowers the ceiling. High uncertainty anywhere in the chain caps the voice — strong recommendations require low uncertainty *and* sufficient understanding *and* a complete chain.

[ASSUMPTION] **When uncertainty forces silence:** when no voice above silence would help the athlete decide better — weak evidence, thin understanding, or a matter outside Aurora's authority (Decision Model, Area 3).

[ASSUMPTION] **When uncertainty requires a question instead:** when the missing piece is something *only the athlete can supply* — life stress, how it felt, a purpose change. Here the architecture should route to Human Input rather than infer. [HYPOTHESIS] "Ask, don't guess" is a distinct output mode alongside speak and withhold, and may deserve its own event (`AthleteQuestionRaised`).

---

## Discovery Area 8: Purpose Alignment

[FACT] No decision support can be evaluated without purpose (Athlete Model, Decision Model).

[ASSUMPTION]
- **Which context owns purpose:** the Athlete context. Purpose is an attribute of the athlete, versioned over time.
- **How others access it:** read-only. Impact consults purpose to interpret whether a change is progress; Decision Support consults it to choose voice and evaluate the decision. No context *sets* purpose except via an explicit `AthletePurposeChanged`.
- **What happens when purpose is missing:** [ASSUMPTION] Aurora cannot evaluate decisions; it must fall back to asking the athlete ("what are you training for?") — the first question the Athlete Model says Aurora should ask. Decision support without purpose drops to framing/question only.
- **What happens when purpose changes:** [HYPOTHESIS] past evidence may need *reinterpretation against the purpose that was current then* — which is why purpose must be versioned. A workout that was "good" under a build purpose may read differently under a recovery purpose. This is a loop in the architecture: a purpose change can reopen past impact assessments.
- **What happens when behavior conflicts with stated purpose:** [QUESTION] Decision Support surfaces the divergence (the Decision Model's "purpose and behavior diverge" trigger) but does not resolve it — resolution is the athlete's. [QUESTION] Which purpose does Impact evaluate against meanwhile, stated or revealed?

[FACT] The architectural rule: **Aurora must not optimize metrics independently of purpose.** Structurally, this means no impact assessment and no decision support may form without a purpose reference (even if that reference is "unknown — asking").

---

## Discovery Area 9: Human Input

[FACT] Aurora cannot rely on device data alone. Much of athlete reality is invisible to instruments (Athlete Model, Understanding Model). Human input is where the athlete's voice enters.

[ASSUMPTION]
- **What enters:** perceived effort, soreness, confidence, motivation, sleep quality, stress, pain, goal/purpose changes, the subjective meaning of a workout.
- **Which context accepts it:** Ingestion accepts athlete *reports as observations* (with provenance "athlete-reported"); purpose/goal changes route to the Athlete context.
- **Are athlete reports observations or evidence?** [ASSUMPTION] Both, at different stages. A report *enters* as an observation (something recorded, fallible). It *becomes* evidence when pointed at a hypothesis — exactly like a device reading. "I felt terrible" is an observation; it becomes evidence about readiness when related to that claim.
- **How Aurora treats self-report as fallible but important:** [FACT] like all observations, reports can be wrong (athletes misjudge their own state). But they carry information no device has. [ASSUMPTION] When report and data conflict, neither automatically wins — the conflict itself is a signal (Decision Model, Area 5), often resolved by asking.
- **When to ask instead of infer:** [ASSUMPTION] when the decisive missing information is something only the athlete knows, and the stakes justify the interruption. The architecture should prefer a question over a low-confidence inference whenever the inference would be about invisible reality (life stress, meaning, felt experience).

[HYPOTHESIS] Treating athlete reports as first-class observations (not as a separate, lesser data stream) is what keeps Aurora from the "trusts the device over the person" failure. The architecture should give report and device the *same* path through the ladder, differing only in provenance and fallibility profile.

---

## Discovery Area 10: Architecture-Level Failure Modes

[ASSUMPTION] Each is a structural failure, with why it's dangerous, where it occurs, and an architectural defense.

### 1. Recommendation Without Traceability
- **Danger:** The defining betrayal — advice that cannot show its evidence; trust-fatal.
- **Where:** Decision Support generating from anything but a traced hypothesis.
- **Defense:** Invariant on DecisionSupportCase — no support forms without a complete chain (Area 6).

### 2. Context Leakage
- **Danger:** Responsibilities blur; the observation→impact collapse the Evidence Model forbids.
- **Where:** e.g., Ingestion assigning meaning; Decision Support inventing claims.
- **Defense:** Explicit "must not own" lines per context (Areas 1–2); events carry facts, not interpretations.

### 3. Premature Certainty
- **Danger:** Weak evidence becomes strong recommendation; false positives erode trust.
- **Where:** Evidence→Impact→Decision Support, when uncertainty is dropped along the way.
- **Defense:** Uncertainty travels with every output (Area 7); voice ceiling set by weakest link.

### 4. Lost Purpose
- **Danger:** Aurora optimizes a metric, moving the athlete efficiently the wrong way.
- **Where:** Impact or Decision Support forming without a purpose reference.
- **Defense:** No impact/support without purpose reference (Area 8); purpose versioned in Athlete.

### 5. Stale Athlete Model
- **Danger:** Current reasoning driven by outdated state or purpose.
- **Where:** Athlete context serving un-decayed state; Decision Support reading old purpose.
- **Defense:** Time-classification enforces decay (Athlete Model); state always timestamped; `AthleteStateChanged`/`AthletePurposeChanged` propagate.

### 6. Global Confidence Error
- **Danger:** Understanding earned in one dimension leaks into another (population-to-person, structurally).
- **Where:** Understanding represented as a single global level.
- **Defense:** UnderstandingProfile indexed per-dimension; Decision Support must query the *relevant* dimension (Area 7 context, Understanding Model).

### 7. Silent Contradiction
- **Danger:** Conflicting evidence exists but is never surfaced; Aurora appears more certain than it is.
- **Where:** Evidence/Impact holding contradictory signals without exposing them.
- **Defense:** Surprise is a first-class event (`SurpriseDetected`); EvidenceCase must represent direction *against* as well as for.

### 8. Overtechnical Architecture
- **Danger:** Architecture follows infrastructure convenience over domain truth; the domain's honesty is lost to expedience.
- **Where:** Any point where a technical shortcut would collapse a domain boundary.
- **Defense:** This document's primacy — domain architecture precedes and constrains implementation architecture (Core Principle).

[HYPOTHESIS] These eight sort into two families: **collapse failures** (2, 4, 6 — boundaries blur) and **honesty failures** (1, 3, 5, 7 — uncertainty or traceability lost), with (8) the meta-failure that causes the rest. Every defense is ultimately a boundary or an invariant.

---

## Discovery Area 11: Architecture Principles

[ASSUMPTION] Derived from the domain, refined from the candidates:

1. **No recommendation without traceability.** Every claim is walkable to its origin or it is not made.
2. **Uncertainty is first-class.** "I don't know yet" is a valid, representable, propagatable output.
3. **Purpose constrains interpretation.** Nothing is interpreted or recommended without a purpose reference.
4. **Understanding is dimension-specific.** No global "knows the athlete"; voice is capped per-dimension.
5. **Athlete agency is preserved.** The architecture supports decisions; it structurally cannot own them.
6. **Human report is evidence, not noise.** Athlete voice travels the same ladder as device data, differing only in provenance.
7. **Population knowledge is fallback, not truth.** Priors are visible, labeled, and overridable by personal evidence.
8. **Silence is valid output.** Withholding is a recorded, accountable act, not an absence.
9. **Contexts must not collapse observation into impact.** The ladder's rungs stay distinct; meaning is never assigned at the source.
10. **Architecture must make revision possible.** Hypotheses, understanding, and impact are all defeasible; nothing is silently overwritten — revisions are recorded.

[ASSUMPTION] Two refinements beyond the candidates:

11. **Surprise is privileged.** Contradiction pre-empts the forward flow and updates understanding before any decision support. The architecture must let a surprise interrupt, not queue behind a recommendation.
12. **Loops are first-class, not exceptions.** Purpose changes reinterpret the past; decisions become future observations; surprise feeds back. The architecture is a cycle with feedback, not a pipeline.

---

## Discovery Area 12: Candidate Context Map

[ASSUMPTION] The naive linear map is a useful skeleton but, as the mission anticipates, **too linear**. Aurora requires loops.

**The forward spine:**
```
   Observation/Ingestion ──► Signal ──► Evidence ──► Impact ──► Decision Support
            ▲                   ▲           ▲           ▲              │
            │                   │           │           │             ▼
            │              (baselines,  (priors,    (purpose,    (the athlete
            │               state)      hypotheses)  athlete)     decides)
            │                   │           │           │
            └───────────────────┴───────────┴───────────┘
                          Athlete (shared context of meaning:
                          purpose, state, capacity, history,
                          constraints, context)
```

**The loops that make it honest:**
```
   ┌─ Surprise loop ──────────────────────────────────────────┐
   │  Evidence/Impact detects contradiction                    │
   │       └─► Understanding (level ↓, dimension-specific)     │
   │             └─► Athlete (model revised)                    │
   │                   └─► reinterprets future Signals          │
   └───────────────────────────────────────────────────────────┘

   ┌─ Purpose loop ───────────────────────────────────────────┐
   │  Athlete: AthletePurposeChanged                           │
   │       └─► reopens past Impact assessments                 │
   │             └─► re-evaluates what counts as progress      │
   └───────────────────────────────────────────────────────────┘

   ┌─ Decision loop ──────────────────────────────────────────┐
   │  Athlete decides → AthleteDecisionRecorded                │
   │       └─► becomes future Observation                      │
   │             └─► feeds Understanding over time             │
   └───────────────────────────────────────────────────────────┘

   ┌─ Understanding-caps-voice (cross-cut) ───────────────────┐
   │  Understanding ──► constrains ──► Decision Support voice  │
   └───────────────────────────────────────────────────────────┘
```

[FACT] Three structural truths the map reveals:
1. **Athlete is not a stage in the pipeline — it is the shared context every stage consults.** It sits beside the flow, not within it.
2. **Understanding sits *above* the flow, governing the voice of Decision Support**, fed by the stream of tested claims.
3. **The system is fundamentally cyclic.** A purely linear architecture would lose surprise, purpose-reinterpretation, and learning — the three things that make Aurora improve.

[HYPOTHESIS] The tightest coupling is Evidence↔Impact (bidirectional: evidence needs a hypothesis; hypotheses need evidence). These may merge into one "Reasoning" context. The cleanest separations are Ingestion (pure capture) and Decision Support (pure speaking-or-silence). Athlete and Understanding are best modeled as *cross-cutting* contexts that the flow reads from and writes to, not links in the chain.

---

## Non-Goals

[FACT] This paper does **not**: choose a database, framework, language, or cloud; define REST/GraphQL APIs or event payload schemas; define UI, infrastructure, deployment, ML implementation, or scoring formulas; or write code. It stays in domain architecture discovery.

[ASSUMPTION] It also does not *finalize* the contexts, aggregates, or map — every one is a candidate, tagged with its open questions. Architecture Discovery proposes the domain's shape; it does not freeze it.

---

## Open Questions (Consolidated)

1. [QUESTION] Do Evidence and Impact merge into one Reasoning context, given their bidirectional dependency?
2. [QUESTION] Is artifact-detection an Ingestion responsibility, a Signal one, or split?
3. [QUESTION] Is the Athlete one aggregate, or do fast-changing state and stable identity warrant separate aggregates/lifecycles?
4. [QUESTION] Is Purpose a value object within Athlete, or its own aggregate (given purpose changes reinterpret the past)?
5. [QUESTION] Is Signal an aggregate at all, or a value object (does it protect any invariant)?
6. [QUESTION] When stated and revealed purpose diverge, which does Impact evaluate against?
7. [QUESTION] Should "ask the athlete" be a first-class output mode with its own event (`AthleteQuestionRaised`)?
8. [QUESTION] How far back should a purpose change reinterpret past evidence — all history, or a bounded window?
9. [QUESTION] Does a DecisionSupportCase persist as the permanent audit record, or is the trace stored separately?

---

## Unknowns

- [UNKNOWN] Whether seven contexts is the right granularity, or whether real modeling collapses them to four or five.
- [UNKNOWN] How expensive full traceability is to preserve in practice, and whether that cost ever pressures the honesty invariants (it must not, but we don't yet know the cost).
- [UNKNOWN] Whether the loop-heavy architecture can remain comprehensible as it grows, or whether the feedback cycles create reasoning that is itself hard to trace.
- [UNKNOWN] Whether purpose-driven reinterpretation of past evidence is tractable, or whether the past must in practice be treated as fixed.

---

## Hypotheses to Carry Forward

1. [HYPOTHESIS] Evidence and Impact are one tightly-coupled Reasoning context, not two.
2. [HYPOTHESIS] Athlete and Understanding are cross-cutting contexts the flow consults, not stages within it.
3. [HYPOTHESIS] Making `SignalRejectedAsNoise` and `RecommendationWithheld` first-class events is what makes Aurora's silences accountable and therefore trustworthy.
4. [HYPOTHESIS] "Ask the athlete" deserves to be a first-class output mode beside speak and withhold.
5. [HYPOTHESIS] The architecture's correctness will be judged not by what it can compute, but by what it can *explain and revise*.

---

## Final Reflection

> **What is the one architectural mistake that would make Aurora impossible to trust?**

[ASSUMPTION] **Allowing decision support to form without a complete, walkable traceability chain.**

Every other failure is recoverable. A stale state corrects itself; a thin understanding deepens; a wrong hypothesis gets revised. But if the architecture *permits even once* a recommendation that cannot be traced back to evidence, observation, and the athlete, then Aurora has produced an opinion wearing the costume of a finding — and there is no way, from the outside, to tell that recommendation apart from a trustworthy one. The moment untraceable advice is structurally possible, *all* of Aurora's advice becomes suspect, because none of it can prove its provenance. Trust does not degrade gradually here; it collapses, because the guarantee that made it possible is gone.

[FACT] This is why traceability must be an *invariant*, enforced by construction, not a discipline hoped for at runtime. An architecture where untraceable recommendation is merely "discouraged" is an architecture where it will eventually happen — and once is enough.

> **Which concept must remain visible across the entire architecture, no matter how the system is implemented?**

[ASSUMPTION] **Purpose** — the athlete's reason for training, and ultimately who they are trying to become.

Purpose is the only concept that touches every context: it makes a signal worth detecting, an impact worth claiming, a decision worth supporting, and a recommendation worth trusting. Strip it out and the rest still *runs* — observations flow, signals fire, hypotheses form, recommendations generate — but it all optimizes nothing, or worse, optimizes the wrong thing efficiently. Every other concept can be local to its context. Purpose cannot. It is the thread that makes the whole architecture *about someone* rather than *about data.*

[FACT] This mirrors, at the architectural level, what the Athlete Model and Decision Model each concluded: purpose is the one thing Aurora must never forget, and the one decision it must never make. Architecture adds the third face: **purpose is the one concept that must remain visible everywhere.** Remembered in the Athlete context, never decided in Decision Support, and never out of sight in between.

---

## Success Criterion

> **"How do we organize the system so that every recommendation remains traceable, revisable, purpose-aligned, uncertainty-aware, and owned by the athlete?"**

[ASSUMPTION] Aurora can now answer:

*Organize the domain as seven candidate contexts along an epistemic ladder — Observation, Signal, Evidence, Impact, Decision Support — with Athlete and Understanding as cross-cutting contexts the ladder consults. Keep each rung's responsibility distinct so meaning is never assigned at the source. Carry uncertainty along every arrow and let it cap the voice. Make traceability an invariant: no decision support forms without a chain walkable to its origin. Index understanding per-dimension so no confidence leaks across. Reference purpose at every interpretation and every recommendation, and version it so the past can be re-read. Treat the athlete's voice as first-class observation, prefer asking over guessing about the invisible, and record both what Aurora withheld and what the athlete chose. Above all, build it as a cycle — surprise, purpose-change, and decision-outcome all loop back — so the system can revise. The architecture is correct exactly to the degree that it can explain why Aurora spoke, admit when it cannot, and leave the decision with the athlete.*

The measure of this architecture is not what it can compute. It is **what it can explain, what it can revise, and what it refuses to own.**

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This completes Architecture Discovery. The candidate contexts, events, and aggregates here are inputs to the next phase — domain modeling and, only then, implementation architecture.*

*Reference: [`THE_AURORA_THESIS.md`](../foundation/THE_AURORA_THESIS.md) · [`TRAINING_IMPACT_DISCOVERY.md`](../domain/TRAINING_IMPACT_DISCOVERY.md) · [`EVIDENCE_MODEL.md`](../domain/EVIDENCE_MODEL.md) · [`ATHLETE_MODEL.md`](../domain/ATHLETE_MODEL.md) · [`UNDERSTANDING_MODEL.md`](../domain/UNDERSTANDING_MODEL.md) · [`DECISION_MODEL.md`](../domain/DECISION_MODEL.md)*
