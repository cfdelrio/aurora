# Domain Modeling 004 — The Understanding Profile & Surprise Model

> How does Aurora's understanding of a specific athlete mature, decay, and revise over time — and how does it know when it has the right to claim it understands at all?
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

[ASSUMPTION] We do not force DDD. An aggregate earns the name only by protecting an invariant across a consistency boundary.

---

## The One Thing This Model Exists To Prevent

[FACT] The Understanding Model named Aurora's most dangerous error: **mistaking the population for the person** — taking a claim that is true *on average* and presenting it as true *of this athlete*. It is the worst error because it does not feel like ignorance; it feels like competence. The evidence is real, the claim is sound, the confidence is honest *about the claim* — and yet the understanding behind it was borrowed, not earned.

[ASSUMPTION] This model is the structural antidote. It exists to keep two kinds of confidence permanently apart:

| | Belongs to | Example |
|---|---|---|
| **Claim confidence** | Evidence Model / `Hypothesis` (DM-001) | "This swim likely produced fatigue. (78%)" |
| **Understanding confidence** | This model / `UnderstandingProfile` | "Aurora has *Trusted* understanding of this athlete's fatigue response to high-intensity swim sessions." |

[FACT] A claim can carry high confidence while personal understanding is thin — and that combination is exactly the trap. The whole point of `UnderstandingProfile` is to be the second number, so the first can never silently impersonate it.

---

## The Governing Idea

[DECISION] **Understanding is the accumulated, revisable, dimension-specific confidence that Aurora has learned something *person-specific* — earned only when athlete-specific hypotheses repeatedly survive meaningful chances to be wrong.**

Three things it is **not**, each a failure this model must block:
- **Not repetition.** Ten confirmations under identical conditions are one observation repeated, not understanding (Understanding Model).
- **Not claim confidence.** Being sure about one workout's fatigue says nothing about knowing this athlete.
- **Not population knowledge.** "Athletes usually…" is a prior, never personal understanding.

Understanding is earned by **survived challenge**, measured **per dimension**, and is always **defeasible**. Everything below follows from this.

---

## Reconciliation With Prior Modeling

[DECISION] **This paper refines, never contradicts, prior decisions. Points needing explicit flagging:**

1. **`UnderstandingProfile` as a separate aggregate** — asserted in CRM 001 and DM-002. [DECISION] **Confirmed and detailed** here (Decision 1). No conflict.
2. **Dependency direction `signals → Reasoning → Understanding`** (DM-003). [DECISION] **Honored and sharpened**: `UnderstandingProfile` consumes *Hypothesis lifecycle outcomes*, never raw signals or `EvidenceCase` directly (Decision 9). No conflict.
3. **`UnderstandingProfile` caps Decision Support voice** (CRM 001, Decision Model). [DECISION] **Honored**; the cap is delivered via an `UnderstandingAssessment` projection (Decision 10). No conflict.
4. **Understanding is per-dimension, never global** (Understanding Model). [DECISION] **Made a structural invariant** here. No conflict.

---

## Part I — The Fourteen Required Modeling Decisions

### Decision 1 — UnderstandingProfile is an aggregate root

[DECISION] **`UnderstandingProfile` is an aggregate root, one per `Athlete` (by reference), owning a set of per-dimension understanding records and their surprise/contradiction history.**

- **Why:** [FACT] It protects an invariant that must hold atomically: *Aurora may never claim stronger understanding of a dimension than the survived, athlete-specific evidence supports.* Something must own and enforce that ceiling; promotion/demotion/decay must be transactionally consistent with the evidence trail behind each level. That is a consistency boundary → an aggregate. The Understanding Model and CRM 001 both treat it as the home of "Aurora's competence regarding this person," distinct from the athlete themselves.
- **Consequence:** No path may raise a dimension's level except through the profile, against its rules. The profile is the single source of truth for *how well Aurora knows this athlete*, dimension by dimension.
- **Risk:** One profile per athlete holding all dimensions could grow large and become a write-contention point as many dimensions update from many hypotheses.
- **Reversal Point:** If dimensions update independently and frequently enough to contend, split into per-(athlete×dimension) aggregates — each dimension its own consistency boundary, the profile a thin index over them.

### Decision 2 — The UnderstandingProfile invariant

[DECISION] **The profile guarantees: (a) understanding is held *per dimension, never globally*; (b) a level *never exceeds what survived, athlete-specific evidence supports*; (c) levels are raised only by *survived challenge*, lowered by *surprise*, and decayed by *time/context*; (d) population knowledge *never* raises a level; (e) every level change is *recorded with its cause* (no silent promotion or demotion); (f) understanding is *always revisable* — no level is permanent, including the highest.**

- **Why:** [FACT] These are the Understanding Model's commitments turned into enforceable rules. Each guards a named failure: (a) global-confidence leakage; (b)/(d) population-to-person error; (c) overconfidence-from-agreement and stale understanding; (e) unaccountable change; (f) the false finality that breeds overconfidence.
- **Consequence:** The candidate invariant from the mission is **accepted and strengthened**: not only may understanding not exceed survived evidence, but its rise/fall is bound to specific, recorded causes.
- **Risk:** Strict cause-recording on every change could make routine decay (a slow fade) noisy if modeled as discrete events.
- **Reversal Point:** If decay-as-events floods the history, model decay as a *continuous staleness function* read at query time, recording only threshold *crossings* (level changes), not every decrement.

### Decision 3 — UnderstandingDimension is a value object naming a (response-type × condition) question

[DECISION] **An `UnderstandingDimension` is a value object identifying *what* Aurora is learning about — a response type under conditions (e.g., "fatigue response to high-intensity swim sessions"). Dimensions are *not* an exhaustive predefined taxonomy; a seed set exists, and dimensions may *emerge* as hypotheses recur around a new (response × condition) pairing.**

- **Why:** [FACT] The Understanding Model insists understanding is "per dimension," and that the *valuable* understanding is often a narrow, condition-specific departure ("intervals do less for *you* than for most"). A rigid taxonomy would miss exactly those emergent, athlete-specific dimensions. A dimension is an *identity for a question*, not a thing with a lifecycle → value object.
- **Consequence:** Dimensions can be sport-specific and condition-specific. One hypothesis **can** update multiple dimensions (a high-intensity swim block informs both "fatigue response to intensity" and "swim-specific recovery"). [QUESTION] Dimensions *can depend on* one another (aerobic understanding may underpin taper understanding) — dependency is noted but **not modeled** yet (deferred).
- **Risk:** Emergent dimensions could proliferate — thousands of hyper-specific "(response × condition)" slivers, none ever reaching enough evidence to leave Unknown.
- **Reversal Point:** If dimension sprawl prevents any from maturing, introduce a *granularity policy* that merges near-duplicate dimensions and requires a minimum evidence flow before a dimension is "opened."

### Decision 4 — The official UnderstandingLevels

[DECISION] **Five ordered levels: `Unknown` < `Thin` < `Working` < `Trusted` < `Mature`.** (Confirms the Understanding Model's proposal as the official language.)

| Level | Definition | What earns it | What lowers it | Decision-support implication | Failure if overused |
|---|---|---|---|---|---|
| **Unknown** | No athlete-specific evidence in this dimension. | (default / reset target) | — | Population priors only, labeled; or `Inquiry`/silence. | Claiming anything personal = pure population-to-person error. |
| **Thin** | A few athlete-specific hypotheses, untested, conditions not varied. | First surviving athlete-specific hypotheses. | One contradiction; decay. | Cautious *framing* at most; personal observations only as hypotheses. | Treating a lucky early read as a pattern (premature personalization). |
| **Working** | Athlete-specific hypotheses partially confirmed, lightly held. | Several confirmations beginning to span conditions. | Surprise; sustained contradiction; decay. | Suggest options *with explicit caveats*. | Recommending as if Trusted on still-fragile understanding. |
| **Trusted** | Patterns tested across *varied* conditions; forward predictions held; survived contradiction. | Survived challenge across diversity + forward-prediction success. | A genuine surprise; accumulating contradictions; staleness. | Recommend with clear reasoning and stated confidence; lead with personal over priors. | Mistaking "held so far" for "cannot fail" — dropping vigilance. |
| **Mature** | Trusted *and* Aurora knows the *edges* of the model (where it's reliable and where not). | Trusted + demonstrated awareness of its own limits in the dimension. | Surprise (even Mature is defeasible); long staleness. | Confident personal support — *and* explicit naming of what it still doesn't know. | Treating Mature as certainty; the better Aurora knows, the costlier its confident error. |

- **Why:** [FACT] The levels and their voice-implications come straight from the Understanding Model's level→voice table and the Decision Model's "understanding caps voice."
- **Consequence:** `Unknown` is a first-class *explicit* value (not a null). Level is per dimension and **per condition within a dimension** — "Trusted on swim fatigue, Thin on heat" can coexist, and even "Trusted on intensity-fatigue in base phase, Working in taper."
- **Risk:** Five discrete levels may be too coarse (real understanding is continuous) or too fine (some collapse in practice).
- **Reversal Point:** If five prove wrong-grained, adjust the *number* of levels while keeping the ordinal, earned-by-survived-challenge structure.

### Decision 5 — What promotes understanding

[DECISION] **A level rises when athlete-specific hypotheses *repeatedly survive meaningful opportunities to be contradicted, across varied conditions, with forward-prediction success* — not by repetition, and never by population knowledge.**

- **Why:** [FACT] The Understanding Model is explicit: trust is earned by *survived challenge*, not accumulated agreement; convergence beats repetition; the test of real pattern is that it *predicts forward* and survives explain-away. Promotion criteria must encode all of that, or they'd reward mere repetition (the central anti-pattern).
- **Consequence (sub-questions resolved):**
  - **Repetition alone:** insufficient — identical-condition repeats don't promote past Thin.
  - **Contradiction survival:** the primary driver.
  - **Convergence across independent evidence:** required for higher levels.
  - **Longitudinal stability & condition diversity:** required for Trusted+.
  - **Athlete self-report confirming an inference:** counts as one (fallible) corroborating channel.
  - **A successful forward recommendation:** strong promotion evidence; **a failed one:** a surprise (demotion pressure).
  - **Time:** necessary but not sufficient — time enables varied conditions, but time alone promotes nothing.
- **Risk:** "Meaningful opportunity to be contradicted" is a judgment we are deliberately *not* formularizing; without care it's arbitrary.
- **Reversal Point:** If promotion proves inconsistent, define (still non-numeric) *qualitative gates* per level (e.g., "Trusted requires ≥1 survived surprise + ≥2 distinct conditions + ≥1 held forward prediction") before reaching for math.

[DECISION] **Candidate principle accepted and sharpened:** understanding increases when athlete-specific hypotheses survive *meaningful, varied* opportunities to be contradicted — emphasis on *meaningful* and *varied*, against repetition.

### Decision 6 — What demotes understanding

[DECISION] **A level falls when Aurora's prior athlete-specific model *stops explaining new observations* — via surprise (sharp) or staleness (gradual). Demotion is graceful (one step toward Unknown by default), never silent, and a dimension *can* return all the way to Unknown.**

- **Why:** [FACT] The Understanding Model: understanding decays, surprise lowers it, and stale understanding is a named failure. Demotion must be possible or "Mature" becomes a permanent lie.
- **Consequence (sub-questions resolved):**
  - **Contradictory evidence:** lowers confidence immediately; sustained/convergent contradiction demotes the level.
  - **Outdated evidence:** decays understanding (Decision 13).
  - **Purpose change:** can demote dimensions whose meaning depended on the old purpose (the past may need reinterpretation — Architecture Discovery's purpose loop).
  - **Injury / life-context change / sport change:** can demote or reset affected dimensions (a new constraint may invalidate prior response patterns).
  - **Repeated surprise:** demotes faster than a single one.
- **Risk:** Over-eager demotion makes understanding skittish — every off-day knocks it down, and it never matures.
- **Reversal Point:** If demotion is too jumpy, require *convergent or repeated* contradiction (not a lone off-day) to demote a level, while still *immediately* lowering claim-confidence and marking fragility.

[DECISION] **Candidate principle accepted:** understanding decreases when the prior athlete-specific model stops explaining new observations.

### Decision 7 — What Surprise is

[DECISION] **`Surprise` is a value object (+ a `SurpriseDetected` domain event): the recorded occurrence of new evidence *meaningfully contradicting what Aurora believed it understood* about an athlete dimension. Surprise can be positive (the athlete exceeded the model), can itself be noise, and always at minimum lowers confidence in the affected belief.**

- **Why:** [FACT] The Understanding Model calls surprise "the single most informative event in the life of understanding" — a confirmation teaches little; a surprise tells Aurora *where* its model is wrong. It must be first-class so it can never be reflexively discarded (the mechanism by which understanding goes stale).
- **Consequence (sub-questions resolved):**
  - **Updates both** `Hypothesis` (reopen/weaken) **and** `UnderstandingProfile` (fragility/demotion) — surprise is the bridge between the two.
  - **Can trigger `Inquiry`** when only the athlete can explain the contradiction (life stress, illness).
  - **Can be positive** (faster recovery than modeled) — positive surprise still demotes *certainty* while being good news.
  - **Can be noise** — handled by the graded ladder (Decision below), burden-of-proof on dismissal.
  - **Can reopen a retired hypothesis** (CRM 001's lifecycle).
  - **Can force Decision Support to a lower voice** via the resulting understanding/fragility change.
- **Risk:** Treating every deviation as surprise floods the system; treating too few ignores real change.
- **Reversal Point:** If surprise fires too often, raise the threshold for what counts as *meaningful* contradiction (magnitude × convergence), while never letting a *convergent, repeated* contradiction be ignored.

[DECISION] **Candidate definition accepted.** Surprise = new evidence meaningfully contradicting believed understanding of a dimension.

### Decision 8 — SurpriseDetection is a domain service; the response is a policy

[DECISION] **`SurpriseDetection` is a domain service living in the `Reasoning`/Understanding boundary: it compares new evidence against the current understanding model and emits `SurpriseDetected`. *How Aurora responds* is a separate `ContradictionResponsePolicy` (the graded ladder).**

- **Why:** [FACT] Detection (does this contradict?) and response (what do we do about it?) are different behaviors; the Understanding Model gives an explicit five-step response ladder that is policy, not detection. Separating them keeps detection objective and the response tunable/testable in isolation — the same split we used for `VoiceMode`/`VoiceSelectionPolicy` (CRM 001) and `Signal`/`SignalDetectionPolicy` (DM-003).
- **Consequence:** Detection emits an event; the policy decides among: check-evidence-first → lower-confidence → reopen-hypothesis → revise-athlete-model → ask-the-athlete (the Understanding Model's ladder, scaled by surprise magnitude).
- **Risk:** Two collaborators (service + policy) around one moment could fragment responsibility for "what happened after the surprise."
- **Reversal Point:** If the split causes confusion, fold detection into the policy as its first phase, keeping the *event* first-class even if the service disappears.

### Decision 9 — Relationship to Hypothesis lifecycle

[DECISION] **`UnderstandingProfile` updates from `Hypothesis` *lifecycle outcomes* (promotions, falsifications, retirements, surprises) — never from raw signals or `EvidenceCase` directly. A single hypothesis outcome *may* update multiple dimensions.**

- **Why:** [FACT] DM-003 fixed the dependency direction (`signals → Reasoning → Understanding`); the Understanding Model defines understanding as earned by *tested* claims. Only the hypothesis lifecycle knows whether a claim was *tested* (survived, fell, surprised). Consuming raw signals would reward repetition; consuming EvidenceCase directly would entangle understanding in the weighing it must stay *above*.
- **Consequence (sub-questions resolved):**
  - **Promoted-to-knowledge:** promotes understanding (survived challenge).
  - **Falsified:** demotes / records fragility (the model was wrong).
  - **Surprised then revised:** the strongest learning signal — demote-then-relearn.
  - **Retired (question stopped mattering):** neutral — no understanding change.
  - **Latent-pending:** does *not* update understanding (nothing tested yet); it's a held question.
  - **Circular reasoning prevented:** understanding is built from hypothesis *outcomes*, and understanding only *caps voice* downstream — it never feeds back into *raising* the confidence of the very hypotheses that built it.
- **Risk:** If "outcome" is defined too narrowly, slow-burning learning (a hypothesis that quietly strengthens without a discrete promotion) might never update understanding.
- **Reversal Point:** If gradual strengthening is lost, let understanding also observe *confidence-trajectory* of long-lived hypotheses (read-only), not just discrete lifecycle transitions.

[DECISION] **Candidate rule accepted:** UnderstandingProfile updates from hypothesis lifecycle events, not raw signals.

### Decision 10 — Relationship to DecisionSupportCase

[DECISION] **`UnderstandingProfile` exposes an `UnderstandingAssessment` — a projection / read model — to `DecisionSupportCase`. It provides, per relevant dimension: level, fragility, staleness, a safe voice ceiling, and the reasons for any uncertainty. Decision Support *consumes* this; it owns no understanding logic.**

- **Why:** [FACT] CRM 001 and the Decision Model require understanding to *cap voice* but keep the laddering logic out of Decision Support. A read-model projection is the clean seam: Understanding computes "how well do I know this, and how fragile/stale is it," Decision Support computes "given that ceiling, what may I say." The projection mirrors DM-001's `ImpactAssessment` and DM-002's state/capacity projections.
- **Consequence:** `DecisionSupportCase` receives a *safe voice ceiling* (e.g., "Working → framing-with-caveats max") plus *reasons* ("only one condition seen; last confirmed 9 weeks ago"). It cannot exceed the ceiling. Fragility and staleness let it explain its own hedging honestly.
- **Risk:** A projection that bundles too much (level + fragility + staleness + reasons + ceiling) could leak understanding *logic* into its shape, tempting Decision Support to re-derive rather than consume.
- **Reversal Point:** If Decision Support starts re-deriving from the assessment's parts, narrow the projection to *just the safe voice ceiling + human-readable reasons*, hiding the mechanics.

[DECISION] **Candidate output accepted:** `UnderstandingAssessment` as a projection/read model for DecisionSupportCase.

### Decision 11 — Relationship to Athlete

[DECISION] **Confirmed and refined: `Athlete` and `UnderstandingProfile` are separate aggregates. `UnderstandingProfile` references `Athlete`. Athlete *can* exist without a profile (a brand-new athlete = all-Unknown, profile created lazily or at creation); a profile cannot exist without its Athlete. Neither writes the other's internals directly.**

- **Why:** [FACT] DM-002's rule holds: *Athlete describes the athlete; UnderstandingProfile describes Aurora's confidence in understanding the athlete.* Different subjects, independent lifecycles → different aggregates.
- **Consequence (sub-questions resolved):**
  - **Purpose change** (an Athlete event) *can demote* understanding — but indirectly: the profile *reacts to* `PurposeChanged` by demoting purpose-dependent dimensions. Athlete doesn't reach in and edit levels.
  - **Hard constraints / new injury** can affect understanding the same way — via events the profile reacts to.
  - **Path-dependent memory** *informs* understanding (an overtraining history makes load-response understanding more fragile) but lives in Athlete; the profile reads it, doesn't own it.
  - **UnderstandingProfile never writes to Athlete** (it's Aurora's self-knowledge, not a fact about the person).
  - **Athlete never writes directly to UnderstandingProfile** (it emits events the profile chooses to honor).
- **Risk:** Event-driven coupling between two aggregates can drift if an Athlete event is missed by the profile.
- **Reversal Point:** If drift occurs, make the profile re-validate affected dimensions against current Athlete state on read, not only on event.

### Decision 12 — Population vs. personal knowledge

[DECISION] **`PopulationKnowledge` may *seed* hypotheses (as priors, always labeled) but may *never* raise `UnderstandingProfile`. Only athlete-specific evidence — surviving challenge — raises understanding. The two coexist; population dominance fades as personal understanding rises, and the transition is *explicit and visible*.**

- **Why:** [FACT] This is the direct structural defense against Aurora's biggest mistake. The Understanding Model demands priors stay *visible* and never silently become personal findings. Tying promotion exclusively to athlete-specific survived evidence makes the population-to-person error *impossible to commit by accident*.
- **Consequence (sub-questions resolved):**
  - Aurora **relies on population knowledge** when a dimension is Unknown/Thin, and says so: *"Athletes usually respond this way — I don't yet see it in you."*
  - It **relies on personal knowledge** as the dimension reaches Working+.
  - Both coexist; the assessment marks which is in play (`PopulationKnowledgeUsed` vs. `PersonalKnowledgePreferred`).
  - **What prevents general truths becoming person-specific claims:** the invariant that population knowledge cannot move the level, plus the labeling requirement in the traceability chain (DM-001: a `prior`-graded link is recorded as such).
- **Risk:** Athletes (and Aurora) may find "I don't know you yet, but generally…" repetitive or unsatisfying, tempting a slide into stated certainty.
- **Reversal Point:** None on the invariant — it is load-bearing. If the *phrasing* grates, that's a Decision-Support/communication concern, never a license to let priors promote understanding.

[DECISION] **Candidate invariant accepted, unmodified:** population knowledge may seed hypotheses, but only athlete-specific evidence may increase UnderstandingProfile.

### Decision 13 — What decays and what never decays

[DECISION] **Understanding decays toward `Unknown`, gracefully and reversibly, per the Athlete Model's time-classification: understanding of *fast-changing* dimensions (readiness, current-state responses) decays fast; understanding of *slow/stable* dimensions (aerobic adaptation pattern, technique) decays slowly. Decay is accelerated by purpose change, injury, sport change, and disuse. *Nothing* about understanding is permanent — even Mature decays — but archived understanding can be revived.**

- **Why:** [FACT] The Understanding Model: "decay rates are the inverse of the Athlete Model's change-frequency table"; stale understanding is a named failure; and the better Aurora knows an athlete, the costlier a stale confident error. DM-002 established graceful, reversible decay-toward-unknown as the mechanism.
- **Consequence (sub-questions resolved):**
  - **Mature decays** (slowly) — no exemption.
  - **Unused understanding decays** (disuse = no fresh confirming evidence).
  - **Purpose change / injury accelerate decay** of affected dimensions.
  - **Time alone degrades** understanding (gently), because the athlete is always changing.
  - **Decay is graceful toward Unknown**, not a cliff to a wrong default.
  - **Archived understanding can be revived** instantly when fresh confirming evidence returns (a returning athlete's old patterns may re-confirm quickly).
- **Risk:** Wrong decay rates either discard still-valid understanding (too fast) or trust stale understanding (too slow); rates are not yet empirically known.
- **Reversal Point:** Tune per-dimension decay rates when real data reveals actual validity windows; the *mechanism* (graceful, reversible, toward Unknown, faster on context change) stays.

### Decision 14 — What this model must never infer

[DECISION] **The Understanding model must never infer: impact, evidence direction/weight, claim confidence, athlete attributes (state/capacity/purpose), a recommendation or voice (it only *caps* it), or a resolution of a contradiction (it records surprise and triggers response; Reasoning/Decision-Support act). It must never produce a *global* "understands the athlete" verdict.**

- **Why:** [FACT] Architecture Discovery's anti-collapse principle. Understanding's single job is *self-knowledge about competence per dimension*. The instant it infers impact or claim confidence, it has merged with Reasoning and the two-confidence distinction collapses — re-opening the population-to-person trap.
- **Consequence:** A clean seam: Reasoning produces tested hypotheses → Understanding integrates their outcomes into per-dimension levels → Decision Support reads the assessment as a voice ceiling. Each context does one thing.
- **Risk:** The seam tempts leakage — an "understanding level" that quietly encodes a claim ("Trusted that you're fatigued") rather than a competence ("Trusted understanding of your fatigue *response*").
- **Reversal Point:** If levels start encoding claims, enforce that a dimension names only a *response-under-conditions*, never a current-state verdict.

---

## Part II — Candidate Concept Classification

| Concept | Classification | Home | Protects / Note |
|---|---|---|---|
| `UnderstandingProfile` | **Aggregate root** | Understanding | The per-dimension understanding ceiling; the central invariant. |
| `UnderstandingDimension` | **Value object** | Understanding | Identity of a (response × conditions) question; may emerge. |
| `UnderstandingLevel` | **Value object** (ordinal) | Understanding | Unknown<Thin<Working<Trusted<Mature. |
| `UnderstandingAssessment` | **Projection / read model** | Understanding→Decision Support | level + fragility + staleness + safe voice ceiling + reasons. |
| `UnderstandingEvidence` | **Value object** (the trail behind a level) | Understanding | *Which hypothesis outcomes* earned the level; not raw evidence. |
| `UnderstandingFragility` | **Value object** | Understanding | How exposed a level is (few conditions, recent near-miss). |
| `UnderstandingStaleness` | **Value object** | Understanding | How long since fresh confirming evidence; drives decay. |
| `Surprise` | **Value object** (+ event) | Reasoning/Understanding | Recorded meaningful contradiction. |
| `SurpriseDetection` | **Domain service** | Reasoning/Understanding boundary | Detects contradiction; emits `SurpriseDetected`. |
| `Contradiction` | **Value object** | Reasoning/Understanding | A single conflicting outcome; raw material of surprise. |
| `PopulationKnowledge` | **Value object** (prior) | Reasoning (seeds hypotheses) | May seed, never promote understanding. |
| `PersonalKnowledge` | **Concept realized as** high `UnderstandingLevel` + `PersonalPattern` | Understanding | Not a separate object; the *state* of earned understanding. |
| `PersonalPattern` | **Value object** | Understanding | A specific athlete-specific regularity that survived challenge. |
| `TestedHypothesis` | **Not a new object** — a `Hypothesis` in a tested lifecycle state | Reasoning | Understanding consumes its *outcomes*. |
| `DimensionHistory` | **Value object collection** (inside profile) | Understanding | Level changes + surprises for one dimension. |
| `UnderstandingDecay` | **Policy / function** | Understanding | Graceful, reversible decay toward Unknown. |
| `UnderstandingPromotionPolicy` | **Policy** | Understanding | Survived-challenge promotion rules. |
| `UnderstandingDemotionPolicy` | **Policy** | Understanding | Surprise/staleness demotion rules. |
| `ContradictionResponsePolicy` | **Policy** | Understanding | The graded response ladder to surprise. |

[ASSUMPTION] Only **`UnderstandingProfile`** is an aggregate. Levels, dimensions, fragility, staleness, surprise, patterns are value objects; promotion/demotion/decay/response are policies; detection is a service; the assessment is a projection. `TestedHypothesis` and `PersonalKnowledge` are **not new objects** — the first is a Hypothesis state (DM-001), the second is the *state* of an earned level, named to avoid reification.

---

## Part III — Invariants

[DECISION] (Mission candidates, challenged and refined.)

1. **Understanding is dimension-specific, never global.** No object ever yields "Aurora understands this athlete."
2. **A level never exceeds survived, athlete-specific evidence.** The ceiling is the whole point.
3. **Population knowledge never promotes personal understanding.** Priors seed; only earned evidence raises.
4. **Understanding decays when context makes it stale.** Nothing — not even Mature — is permanent.
5. **Surprise is recorded whenever it changes understanding.** Contradiction is never reflexively discarded.
6. **Contradictions are never silently ignored.** At minimum they lower confidence and mark fragility.
7. **Decision Support never receives a stronger understanding claim than the profile permits.** The assessment is a ceiling, not a suggestion.
8. **Understanding is always revisable.** Every level can fall, including to Unknown; every change records its cause.

[ASSUMPTION] Invariants 2 and 3 together *are* the structural antidote to the population-to-person error; the rest protect against staleness, overconfidence, and unaccountable change.

---

## Part IV — Domain Events

[DECISION] "Domain" = meaningful across boundaries; "internal" = within Understanding.

| Event | What happened | Emitted by | Who cares | Domain / internal |
|---|---|---|---|---|
| `UnderstandingProfileCreated` | Profile opened for an athlete | Understanding | Decision Support | **Domain** |
| `UnderstandingDimensionOpened` | A new (response×conditions) dimension began tracking | Understanding | (internal) | Internal-leaning |
| `UnderstandingLevelPromoted` | A dimension rose a level | Promotion policy | Decision Support | **Domain** |
| `UnderstandingLevelDemoted` | A dimension fell a level | Demotion policy | Decision Support | **Domain** |
| `UnderstandingMarkedStale` | A dimension crossed into staleness | Decay policy | Decision Support | **Domain** |
| `UnderstandingArchived` | A dimension decayed out of active use | Decay policy | (internal) | Internal |
| `UnderstandingRevived` | Archived understanding re-confirmed | Understanding | Decision Support | **Domain** |
| `SurpriseDetected` | New evidence meaningfully contradicted understanding | SurpriseDetection service | Reasoning, Understanding, Decision Support | **Domain** |
| `ContradictionRecorded` | A conflicting outcome was logged | Understanding | (internal, feeds surprise) | Internal |
| `PersonalPatternEstablished` | An athlete-specific pattern survived enough challenge | Promotion policy | Decision Support | **Domain** |
| `PersonalPatternWeakened` | A pattern lost support | Demotion policy | Decision Support | **Domain** |
| `PopulationKnowledgeUsed` | A prior was used because understanding was thin | Reasoning/Decision Support | traceability, Decision Support | **Domain** |
| `PersonalKnowledgePreferred` | Personal understanding overrode a prior | Decision Support | traceability | **Domain** |
| `PurposeChangeAffectedUnderstanding` | A `PurposeChanged` demoted purpose-dependent dimensions | Understanding (reacting) | Decision Support | **Domain** |
| `AthleteContextShiftAffectedUnderstanding` | Injury/context shift affected dimensions | Understanding (reacting) | Decision Support | **Domain** |

[FACT] No payload schemas (non-goal). [ASSUMPTION] `SurpriseDetected`, the promote/demote pair, and `PopulationKnowledgeUsed`/`PersonalKnowledgePreferred` are the trust-critical events — they make Aurora's *learning and its honesty about borrowed-vs-earned knowledge* visible.

---

## Part V — Things We Refuse to Model Yet

[ASSUMPTION] Out of scope, with reason:

- **Exact promotion thresholds / level math** — non-goal; we model survived-challenge *responsibility*, not numbers. Qualitative gates only if needed (Decision 5 reversal).
- **Exact confidence formulas** — foundation-level non-goal.
- **Exact staleness timeouts** — await real data (Decision 13 reversal); we model graceful-reversible-toward-Unknown.
- **ML personalization** — an implementation strategy; the domain must be expressible without it.
- **Full athlete-dimension taxonomy** — dimensions emerge; an exhaustive list would freeze what should grow (Decision 3).
- **Dimension inter-dependencies** — noted (aerobic underpins taper) but not modeled; premature.
- **UI wording** — how levels/uncertainty are phrased to the athlete is Decision-Support/product.
- **Recommendation generation** — the full Decision Support model; we fix only the dependency boundary.
- **Cohort/population analytics implementation** — how priors are derived; the domain needs only "a labeled prior."
- **Statistical model selection** — implementation.

---

## Part VI — Glossary

- **UnderstandingProfile** — aggregate root; Aurora's per-dimension, revisable confidence in its understanding of one athlete; enforces the understanding ceiling.
- **UnderstandingDimension** — value object; a (response × conditions) question Aurora learns about; may be sport-specific and emergent.
- **UnderstandingLevel** — ordinal value object: Unknown < Thin < Working < Trusted < Mature.
- **UnderstandingAssessment** — projection/read model handed to Decision Support: level + fragility + staleness + safe voice ceiling + reasons.
- **PersonalKnowledge** — the *state* of earned understanding (high level + surviving PersonalPattern); not a separate object.
- **PopulationKnowledge** — value object; a labeled prior; may seed hypotheses, never promote understanding.
- **PersonalPattern** — value object; a specific athlete-specific regularity that survived challenge.
- **TestedHypothesis** — a `Hypothesis` (DM-001) in a tested lifecycle state; Understanding consumes its outcomes.
- **Surprise** — value object (+ event); new evidence meaningfully contradicting believed understanding of a dimension.
- **Contradiction** — value object; a single conflicting outcome; raw material of surprise.
- **Fragility** — value object; how exposed a level is (few conditions, recent near-miss, thin trail).
- **Staleness** — value object; how long since fresh confirming evidence; drives decay.
- **Promotion** — a level rising, earned by survived, varied challenge.
- **Demotion** — a level falling, from surprise or staleness; graceful, recorded.
- **Decay** — graceful, reversible loss of level toward Unknown over time/disuse/context change.
- **Revival** — archived understanding restored when fresh confirming evidence returns.

---

## Final Reflection

> **What is the smallest UnderstandingProfile model Aurora needs so it can avoid mistaking repetition for understanding?**

[ASSUMPTION] Four things:

1. **`UnderstandingDimension`** — so understanding is always *about a specific (response × conditions) question*, never a global verdict. Without it, "understanding" has no grain and repetition in one narrow case masquerades as knowing the athlete.
2. **`UnderstandingLevel`** (the ordinal, with `Unknown` explicit) — so "how well do I know this?" is a first-class, *separate* quantity from "how sure am I of this claim?"
3. **A promotion rule keyed to *survived challenge across varied conditions*, not repetition** — this single rule is what makes "ten identical confirmations" stay at Thin while "one survived surprise across two phases" reaches Working. It is the literal difference between repetition and understanding.
4. **`Surprise`** (recorded, never discarded) — because understanding that cannot be *lowered* by contradiction will inevitably drift into false confidence; the capacity to fall is what keeps the level honest.

[FACT] Strip any one: without dimensions, understanding is global (the forbidden verdict); without a separate level, claim confidence impersonates understanding; without the survived-challenge rule, repetition *is* promotion; without surprise, the level can only ever rise. The four together are the smallest structure that can tell *earned* understanding from *repeated* coincidence.

> **What is the fastest way this model could create dangerous overconfidence?**

[ASSUMPTION] **Letting anything other than survived, athlete-specific challenge raise a level — most insidiously, letting population knowledge or sheer repetition promote understanding.**

This is the fastest route to danger because it produces overconfidence that is *invisibly wrong*. If "athletes usually adapt to this block" could nudge a dimension toward Trusted, or if ten identical easy weeks could promote "load tolerance," then Aurora would hold a high *understanding* level — and therefore speak with a high *voice ceiling* — about an athlete it has never actually tested. Every downstream recommendation would inherit that unearned authority. And because the level *looks* earned (it has a number, a history, a trail), nothing downstream can catch it: Decision Support reads a legitimate-seeming "Trusted," matches its voice to it, and confidently asserts a population truth as a personal finding — the exact error the Understanding Model called Aurora's worst, now laundered through a model that was supposed to prevent it.

[FACT] This is why invariants 2 and 3 are load-bearing and non-negotiable: a level *never* exceeds survived athlete-specific evidence, and population knowledge *never* promotes it. The level's only currency is challenge survived. The moment any other currency is accepted — repetition, priors, time, agreement — the profile stops being a guard against overconfidence and becomes a generator of it.

---

## Success Criterion

> **"What gives Aurora the right to say it understands this athlete in this dimension — and what would take that right away?"**

[ASSUMPTION]
- **What grants the right:** in a specific dimension, athlete-specific hypotheses have *repeatedly survived meaningful, varied opportunities to be contradicted*, with forward predictions that held — recorded as an earned `UnderstandingLevel` with its `UnderstandingEvidence` trail. The right is always *bounded* (this dimension, these conditions) and always *provisional*.
- **What takes it away:** a `Surprise` the model didn't allow for; accumulating contradictions; `Staleness` from time or disuse; or a context change (`PurposeChanged`, injury, sport change) that invalidates the conditions the understanding was earned under. Any of these demotes the level — gracefully, with cause recorded, possibly all the way back to `Unknown`.

The right to claim understanding is *earned by survived challenge, bounded by dimension and condition, and revocable by surprise or staleness* — never granted by repetition, priors, or the passage of time.

---

## Open Questions Carried Forward

1. [QUESTION] Should understanding be per-(athlete×dimension) aggregates instead of one profile, if dimension updates contend? (Decision 1 reversal.)
2. [QUESTION] How are dimension *inter-dependencies* modeled (aerobic underpinning taper understanding)?
3. [QUESTION] What are the qualitative promotion gates per level, if "survived challenge" needs sharpening? (Decision 5 reversal.)
4. [QUESTION] Should demotion require convergent/repeated contradiction, or can a single strong surprise demote a level? (Decision 6 reversal.)
5. [QUESTION] Do positive surprises (athlete exceeds model) and negative surprises demote certainty symmetrically, or differently?
6. [QUESTION] How far does a `PurposeChanged` reach in demoting purpose-dependent dimensions? (Shared with DM-002, foundation-level.)
7. [QUESTION] Can long-lived hypotheses' *confidence trajectory* feed understanding, not just discrete lifecycle events? (Decision 9 reversal.)

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fourth Domain Modeling paper. It resolves how understanding matures, decays, and revises; it defers thresholds, formulas, the full dimension taxonomy, and the full Decision Support model.*

*Inputs: [Foundation Index](../README.md) · [Understanding](../domain/UNDERSTANDING_MODEL.md) · [Athlete Model](../domain/ATHLETE_MODEL.md) · [Evidence](../domain/EVIDENCE_MODEL.md) · [Decision](../domain/DECISION_MODEL.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning Model](./CORE_REASONING_MODEL.md) · [Athlete Aggregate](./ATHLETE_AGGREGATE.md) · [Observation & Signal](./OBSERVATION_SIGNAL_MODEL.md)*
