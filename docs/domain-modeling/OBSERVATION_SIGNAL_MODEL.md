# Domain Modeling 003 — The Observation & Signal Model

> When does an observation become a signal — and what stops noise from becoming evidence?
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

[ASSUMPTION] We do not force DDD. An aggregate earns the name only by protecting an invariant across a consistency boundary. If a candidate protects no invariant, it is not an aggregate, and we say so.

---

## Why This Boundary Matters Most

[FACT] This is the *foundation of the foundation*. Every downstream object — `Hypothesis`, `EvidenceCase`, `DecisionSupportCase` — rests on what enters here. The failure cascade is unforgiving:

```
   bad observation → bad signal → bad evidence → false hypothesis → irresponsible decision support
```

[ASSUMPTION] The Evidence Model already named the trap: *observations are not the same as truth* (devices drop signal, miscalibrate, lie; athletes misjudge themselves), and *separating signal from noise is already a judgment, not a given*. This paper models that judgment as a set of objects and invariants — so the act of deciding "this is meaningful" is explicit, auditable, and honest, never a silent assumption baked into raw data.

[FACT] The governing rule, inherited and made structural: **Aurora must never treat raw data as meaning.** The whole model exists to keep three things apart — *what was recorded*, *what was judged meaningful*, and *what is eligible to become evidence* — so that meaning is something Aurora *earns* from data, never something it *reads off* data.

---

## The Spine of the Model

[DECISION] The upstream path is four distinct stages, each its own kind of object:

```
   Observation            "something was recorded / reported / detected" (no meaning)
        │  + context (baseline, purpose, expected range, history)
        ▼
   ContextualizedObservation   "this value, relative to this athlete, here, now"
        │  judged for meaning against a domain question
        ├──────────────► Signal        "meaningful enough for Reasoning to consider"
        └──────────────► SignalRejection "considered and set aside, with a reason"
                              │
   Signal ── eligibility gate ┘ (provenance + quality + context + relevance)
        │
        ▼
   eligible to become Evidence (only when pointed at a Hypothesis — in Reasoning)
```

[FACT] The bottom arrow is the boundary with Domain Modeling 001: a `Signal` becomes `Evidence` *only inside the Reasoning context, only when attached to a `Hypothesis`*. This model produces evidence-*eligible* signals; it never produces evidence. That stays where CRM 001 put it.

---

## Reconciliation With Prior Modeling

[DECISION] **This paper refines, and does not contradict, prior decisions. Two points need explicit flagging:**

1. **`Signal` classification (CRM 001).** CRM 001 classified `Signal` as a **value object** ("protects no independent invariant"). [DECISION] **Confirmed and kept.** This paper details *how* a signal is produced and gated, but a signal remains a value object — meaningful only relative to a baseline it does not own. No conflict.
2. **`ObservationSet` (CRM 001 candidate aggregate).** CRM 001 listed `ObservationSet` as an aggregate candidate "immutability and provenance of what was captured in a session." [DECISION] **Confirmed as an aggregate** below (Decision 2), with its invariant sharpened. No conflict.

[FACT] `AthleteReport`/`SubjectiveObservation` entering as observations (Domain Modeling 002, Decision 9) is **honored and detailed** here, not changed.

---

## Part I — The Fourteen Required Modeling Decisions

### Decision 1 — What Observation is

[DECISION] **An `Observation` is a timestamped, sourced, immutable record that *something was recorded, reported, or detected* — before any meaning is assigned. It always carries provenance (source + time + how it arrived) and a fallibility profile. It can be wrong; it is never silently corrected.**

- **Why:** [FACT] The Evidence Model puts observation at the bottom of the ladder: "a recording… by itself it carries no meaning," and "observations are not the same as truth." Immutability + provenance is what makes the traceability mandate possible — every later claim must walk back *to a specific observation as it actually arrived*.
- **Consequence:** An observation can come from a device, the athlete, a coach, manual entry, an imported plan, a competition result, external context, or be system-derived. *Missing-expected-data* and *device artifacts* are representable as observations (they were "detected" — see Decisions 10, 12). Nothing downstream can claim provenance the observation didn't have.
- **Risk:** Treating *everything* as an observation (including absences and artifacts) could blur "a thing happened" with "a thing notably didn't happen." We mitigate with explicit subtypes (MissingDataObservation, and a quality flag for suspected artifacts).
- **Reversal Point:** If subtyping observations (subjective, missing, derived) creates more confusion than clarity, collapse to one `Observation` with a `kind` discriminator — but never lose provenance.

[DECISION] **Observations are not revised; they are superseded.** [ASSUMPTION] A correction is a *new* observation that supersedes an earlier one, with the supersession recorded. The original is never overwritten — the audit trail of "what Aurora first saw" is itself information (it may have driven a past decision).

### Decision 2 — ObservationSet is an aggregate

[DECISION] **`ObservationSet` is an aggregate root** — the consistency boundary for "everything observed about one occasion (typically a workout, but also a report episode or a contextual capture)."

- **Why:** [FACT] It protects a real invariant that must hold *atomically*: provenance, timing, and source integrity of every observation used downstream. CRM 001's traceability mandate requires a guaranteed-intact bottom of the chain; that guarantee needs an owner.
- **Consequence:** Observations are added to a set; the set guarantees each retains source/time/provenance and immutability. The set *can be incomplete* (a workout with no HR stream) and *can be amended later* (a late athlete report about that session) — amendment adds, never mutates.
- **Risk:** "One occasion" is fuzzy — a workout plus a next-day report *about* that workout: one set or two linked sets? Drawing the boundary wrong fragments provenance or over-couples unrelated observations.
- **Reversal Point:** If "occasion" proves ambiguous in practice, switch the grouping key from "occasion" to "provenance episode" (one set per coherent capture event) and link sets explicitly.

### Decision 3 — The ObservationSet invariant

[DECISION] **An `ObservationSet` guarantees: every observation in it (a) retains its source, time, and provenance; (b) is immutable (corrections supersede, never overwrite); (c) carries its quality limitations; and (d) records its own completeness status (what was expected and present/absent). The set may be incomplete or low-quality, but it may never *hide* that it is.**

- **Why:** [FACT] Architecture Discovery's "no recommendation without traceability" and "uncertainty is first-class" both bottom out here. If the set could silently drop provenance or hide a gap, every downstream confidence figure would be a lie by omission.
- **Consequence:** Completeness and quality travel as first-class facts, not afterthoughts. "We're missing your HR for this session" is representable at the source.
- **Risk:** Carrying completeness/quality on every set adds weight to the simplest capture; over-modeling quality could slow the common happy path.
- **Reversal Point:** If quality/completeness metadata is almost never consulted downstream, demote it from a guaranteed field to an on-demand assessment — but keep provenance and immutability non-negotiable.

### Decision 4 — Source is a value object; trust is contextual, never absolute

[DECISION] **`Source` is a value object (device / athlete-report / coach-report / manual / imported-plan / competition-result / external-context / system-derived). `SourceTrust` is *contextual*, not a fixed ranking — modeled as a per-(source × question) fallibility profile, never as a global hierarchy.**

- **Why:** [FACT] The foundation is explicit on both sides: *human report is evidence, not noise*, **and** human report is fallible; device data is measurable **and** fallible. Ranking one absolutely above the other would betray one of those truths. A device is more trustworthy about power output; the athlete is the *only* source on felt heaviness or life stress. Trust depends on *what is being asked*.
- **Consequence:** The same fact from two sources can conflict, and the model **preserves the disagreement** rather than resolving it prematurely — a conflict becomes its own signal (Decision 7) often routed to `Inquiry`. Neither source auto-wins.
- **Risk:** Contextual trust is harder to reason about than a fixed hierarchy; without care it could degrade into ad-hoc per-case judgments.
- **Reversal Point:** If contextual trust proves unmanageable, fall back to *default* per-source fallibility profiles that context can adjust — but never a single global "device > athlete" or vice versa.

### Decision 5 — ObservationQuality is a value object that can change as later data arrives

[DECISION] **`ObservationQuality` is a value object attached to an observation (complete / partial / missing / inconsistent / corrupted / suspicious / stale / low-confidence / source-conflicted / context-missing). It is assigned at the Signal/contextualization layer, not at raw capture, and it *can be re-assessed* when later observations arrive.**

- **Why:** [FACT] Quality is a *judgment relative to context* (an isolated 210bpm reading looks suspicious only against a baseline). Like signal/noise discrimination, it is interpretation, so it belongs above raw capture. And the Evidence Model's "an observation that contradicts everything around it is more likely an artifact" means quality can only be judged once there's an "around it" — which may arrive later.
- **Consequence:** A reading flagged `suspicious` today can be re-graded `corrupted` (or vindicated) tomorrow. Low-quality observations *can still become signals* (held loosely), and high-quality observations *can be irrelevant* (quality ≠ relevance). Quality always travels downstream (invariant).
- **Risk:** Re-assessable quality means a signal's basis can shift under it; downstream consumers must tolerate quality changing post-hoc.
- **Reversal Point:** If retroactive quality changes destabilize downstream reasoning, freeze quality at the moment a signal is formed and require a *new* signal for a re-graded observation.

[DECISION] **Candidate invariant accepted and strengthened:** *no downstream signal may hide the quality limitations of the observations it came from.* This is non-negotiable — quality is part of the traceability chain.

### Decision 6 — ContextualizedObservation is the explicit middle stage

[DECISION] **`ContextualizedObservation` is a distinct value object: an observation interpreted relative to athlete baseline, purpose, sport, workout type, phase, recent history, current-state projection, and expected range. It is *not yet* a signal — it is the raw material a signal-judgment operates on.**

- **Why:** [FACT] The Evidence Model: "250 watts means nothing. 250 watts sustained for 40 minutes by an athlete whose threshold is 240 watts *means something*." The transition from "a number" to "means something" requires context, and naming that intermediate state prevents the silent collapse of observation into signal. It also makes explicit *which* context was used — essential for traceability.
- **Consequence:** Contextualization is a named responsibility with named inputs (baseline, purpose, expected range…). If the required context is *absent* (no baseline, no purpose), contextualization can fail — yielding a rejection reason (`no baseline`, `no purpose`) rather than a false signal.
- **Risk:** A third stage between observation and signal adds modeling surface; if contextualization and signal-judgment always happen together, the separation may be ceremony.
- **Reversal Point:** If `ContextualizedObservation` never exists independently of a `Signal` decision, fold it into the signal-formation step as an internal phase, keeping the *inputs* explicit even if the intermediate object disappears.

### Decision 7 — Signal is a value object (confirmed), produced against a domain question

[DECISION] **A `Signal` is a value object: a contextualized observation (or coherent group) judged *meaningful enough for Reasoning to consider*, relative to a domain question. It has no identity of its own and belongs to a `SignalSet` for a given occasion. The act of judging is a `SignalDetectionPolicy` (domain service); the `Signal` is its output.**

- **Why:** [FACT] CRM 001 already settled Signal = value object (protects no independent invariant; meaningful only relative to a baseline it doesn't own). The Understanding Model's four-way discrimination (coincidence / noise / artifact / real) is the *judgment*, which is behavior → a policy, separate from the value it emits.
- **Consequence (resolving the sub-questions):**
  - One observation **can** produce multiple signals (relevant to different questions); multiple observations **can** produce one signal (a sustained effort across many samples).
  - A signal **can point at multiple candidate hypotheses** — direction/weight are assigned only later, *as evidence*, inside Reasoning.
  - A signal **can be neutral** (interpretable but not yet leaning).
  - A signal **can expire** (staleness via the Athlete-Model time schedule) and **can be rejected later** (re-graded to noise when context changes) — but it is *superseded*, not mutated (it's a value object).
- **Risk:** "Meaningful enough" is a threshold judgment we are explicitly *not* formularizing; without care it becomes arbitrary.
- **Reversal Point:** If "meaningful enough" can't be made consistent as a policy, Reasoning may need to pull *all* contextualized observations and judge meaning itself — collapsing Signal into Reasoning. (We'd flag that as a boundary change.)

### Decision 8 — Signal classification

[DECISION] **`Signal` = value object. `SignalSet` = value object collection (per occasion). `SignalDetectionPolicy` = domain service. `SignalRejection` = value object (+ a domain event). `SignalEligibility` = a policy/gate, not a stored thing.** (Full table in Part II.)

- **Why / Consequence / Risk / Reversal:** as Decision 7; the supporting objects inherit the same value-object rationale (none protect an independent invariant).

### Decision 9 — Noise/Rejection is an explicit, recorded outcome — not an absence

[DECISION] **Rejecting a signal is a *first-class domain outcome*, not the mere absence of a signal. A `SignalRejection` value object records what was considered, the reason, and the context — and emits `SignalRejected`. Aurora records rejections *when the rejection affects trust, future interpretation, or silence*.**

- **Why:** [FACT] Architecture Discovery made `SignalRejectedAsNoise` first-class precisely so silence is *accountable*: the system must distinguish "Aurora considered this and set it aside" from "Aurora missed it." That distinction is trust-critical and bias-checkable (it guards against the Understanding Model's confirmation-bias-in-rejection failure).
- **Consequence:** Rejection reasons are an enumerated, auditable set: insufficient data, likely artifact, below meaningful threshold, no baseline, no purpose, conflicting source, stale, context missing, duplicate, not relevant to any current hypothesis, too weak alone. **Rejected noise can become meaningful later** — a rejection is not deletion; a recurrence or new context can resurrect the consideration.
- **Risk:** Recording every rejection could drown the system in audit noise about noise; over-recording is its own cost.
- **Reversal Point:** The candidate principle handles this — record rejections *selectively* (only when they affect trust/interpretation/silence), not universally. If even that floods, raise the bar to "rejections that contradicted an active hypothesis or a prior."

[DECISION] **Candidate principle accepted:** record considered-but-rejected signals when rejection affects trust, future interpretation, or silence — not all rejections, always.

### Decision 10 — Missing data: observation vs. signal

[DECISION] **A `MissingDataObservation` ("something expected was absent") is a first-class observation. The *absence becoming meaningful* is a `Signal` like any other — there is no separate "MissingDataSignal" type; meaning-of-absence is judged by the same SignalDetectionPolicy.**

- **Why:** [FACT] The Evidence Model's hardest rule lives here: *absence of evidence ≠ evidence of absence* — but absence *can* be meaningful in context (a missing post-failure report; an expected adaptation that never showed → latent impact). Modeling missing-expected-data as an observation lets that absence enter the ladder honestly; judging it as a normal signal avoids a parallel pipeline.
- **Consequence:** Missing data raises uncertainty explicitly; it can **trigger `Inquiry`** ("you stopped early — what happened?") when only the athlete can resolve it. *Unexpected* absence (no baseline exists, no purpose declared) is contextualization failure → rejection reason, not a MissingDataObservation. The distinction: MissingDataObservation = *expected and absent*; "no context" = *can't even contextualize*.
- **Risk:** Deciding what was "expected" requires a model of expectation (baseline, plan); over-eager expectation generates false missing-data observations.
- **Reversal Point:** If "expected" is too hard to pin down, restrict MissingDataObservation to absences against an *explicit* plan or an established baseline, ignoring softer expectations.

### Decision 11 — Athlete self-report enters as SubjectiveObservation, possibly many, preserving the athlete's words

[DECISION] **`AthleteReport` is a `Source`; what it produces is one or more `SubjectiveObservation`s (a value-object subtype of Observation). One report can yield many observations ("shoulder hurt" + "slept badly" = two). The athlete's own words are preserved verbatim alongside any structured extraction. An `InquiryResponse` is a `SubjectiveObservation` that links back to the `Inquiry` that prompted it.**

- **Why:** [FACT] Domain Modeling 002 decided self-report enters as observation and fans out; the Decision Model and Understanding Model insist it is *fallible but irreplaceable* — neither unquestioned truth nor dismissed subjectivity. Preserving raw words guards against premature structuring throwing away meaning ("something felt wrong" resists tidy fields).
- **Consequence (the examples classified):**
  - "I felt unusually heavy" → SubjectiveObservation (state-relevant; contextualize vs. baseline).
  - "My shoulder hurt" → SubjectiveObservation → may declare a **constraint/injury** (routes to Athlete per DM-002) *and* be a signal.
  - "I slept badly" → SubjectiveObservation (recovery context).
  - "I felt ready despite the data" → SubjectiveObservation that *conflicts* with device-derived state → `source-conflicted`, often → `Inquiry`/surfaced, never auto-resolved.
  - "I stopped because something felt wrong" → SubjectiveObservation + likely `MissingDataObservation` (workout cut short) → strong `Inquiry` candidate.
  - "I skipped because I was unmotivated" → SubjectiveObservation (motivation/state) + MissingDataObservation (no session).
- **Risk:** Verbatim preservation plus structured extraction risks double-counting one report as two pieces of evidence for the same claim (DM-002's flagged risk).
- **Reversal Point:** If double-counting appears, separate "the report as observation" from "declarations extracted from it" explicitly, so the same words can't be counted twice toward one hypothesis.

[DECISION] **A self-report can be ambiguous, and ambiguity is representable** (low `ReportConfidence`, or a `context-missing` flag). Ambiguity is a legitimate trigger for follow-up `Inquiry` rather than a guess.

### Decision 12 — Provenance ownership

[DECISION] **Provenance is *carried by every Observation* (intrinsic, immutable) and *guaranteed intact by the ObservationSet* (the owner). No object downstream may assert provenance an observation didn't record; the ObservationSet is the guardian, exactly as `DecisionSupportCase` guards the *completeness* of the chain at the top (CRM 001).**

- **Why:** [FACT] Two-layer protection mirrors CRM 001's traceability model: per-artifact links (here, provenance on each observation) + a guardian (here, ObservationSet at the bottom; DecisionSupportCase at the top). The chain is only as strong as its origin.
- **Consequence:** The bottom of every `TraceabilityChain` resolves to a provenance-bearing observation in some ObservationSet. Traceability is structurally anchored.
- **Risk:** If observations can be created outside an ObservationSet, the guarantee leaks.
- **Reversal Point:** If leaks occur, make ObservationSet membership a *precondition of an observation existing at all* — no orphan observations.

### Decision 13 — Signal eligibility for Evidence

[DECISION] **A `Signal` is eligible to become Evidence only if it can answer four things: *relevant to which hypothesis-question, in what tentative direction, with what quality, and from what source(s)?* `SignalEligibility` is a gate (policy), not a stored attribute.**

- **Why:** [FACT] CRM 001: evidence = "a signal pointed at a hypothesis," with direction and weight. A signal that can't name its target question, carry its quality, or cite its source can't honor the traceability mandate once it becomes evidence. The gate enforces the preconditions *before* the Reasoning context is allowed to treat the signal as evidence.
- **Consequence (sub-questions resolved):**
  - **Weak signals can be evidence** — at low weight ("suggestive" grade), held loosely. Eligibility ≠ strength.
  - **Conflicting signals can be evidence** — pointing opposite ways at the same hypothesis is exactly what the EvidenceCase represents.
  - **Absence of an expected signal can be evidence** — via MissingDataObservation → signal (Decision 10), with the `absent` grade from CRM 001, *never* read as "no impact."
- **Risk:** A strict four-part gate could exclude a genuinely meaningful but hard-to-attribute signal.
- **Reversal Point:** If real meaningful signals get blocked for lacking a clean target question, relax the gate to "relevant to *some* open question or capable of *raising* one," letting signals seed new hypotheses (Decision in Part on Reasoning relationship).

[DECISION] **Candidate invariant accepted:** a Signal cannot become Evidence unless it answers "relevant to which hypothesis, in what direction, with what quality, from what source?"

### Decision 14 — What this model must never infer

[DECISION] **The Observation & Signal model must never infer: impact, adaptation, capability, athlete state-as-fact, a hypothesis, a recommendation, evidence direction/weight (that's Reasoning), understanding level (that's Understanding), or a resolution of a source conflict (that's surfaced, not decided here).**

- **Why:** [FACT] Architecture Discovery's "contexts must not collapse observation into impact." This model's entire job is to stop *before* meaning-as-conclusion. It judges "is this meaningful enough to consider?" — never "what does it mean for the athlete?"
- **Consequence:** A clean seam: this model hands Reasoning *evidence-eligible signals with provenance, quality, and context*, and nothing more. Reasoning does the weighing; Understanding does the confidence; Decision Support does the speaking.
- **Risk:** The seam can tempt leakage — a "signal" that quietly encodes a conclusion ("fatigue signal") rather than a contextualized fact ("power down 6% at matched HR, vs. baseline").
- **Reversal Point:** If signals keep smuggling conclusions, enforce that a signal names only *the contextualized fact and its candidate questions*, never an interpretation verb.

---

## Part II — Candidate Concept Classification

| Concept | Classification | Home | Protects / Note |
|---|---|---|---|
| `Observation` | **Value object** (immutable) | Ingestion | Carries provenance + fallibility; bottom of the ladder. |
| `ObservationSet` | **Aggregate root** | Ingestion | Provenance/time/source integrity, immutability, completeness of one occasion. |
| `Source` | **Value object** | Ingestion | Where an observation came from. |
| `SourceTrust` | **Value object** (contextual, per source×question) | Ingestion/Signal | Fallibility profile; never a global ranking. |
| `ObservationQuality` | **Value object** (re-assessable) | Signal | Quality before meaning; travels downstream. |
| `ContextualizedObservation` | **Value object** | Signal | Observation interpreted vs. baseline/purpose/expected range. |
| `Signal` | **Value object** | Signal | Contextualized observation judged meaningful; no independent invariant. |
| `SignalSet` | **Value object collection** | Signal | Signals for one occasion. |
| `SignalRejection` | **Value object** (+ event) | Signal | Considered-and-set-aside, with reason; auditable. |
| `MissingDataObservation` | **Value object** (subtype of Observation) | Ingestion | Expected-but-absent. |
| `AthleteReport` | **Source** + produces observations | Ingestion | Human input as first-class. |
| `SubjectiveObservation` | **Value object** (subtype of Observation) | Ingestion | Self-report at the bottom of the ladder; words preserved. |
| `InquiryResponse` | **Value object** (subtype of SubjectiveObservation) | Ingestion | Links back to the `Inquiry` that prompted it. |
| `Provenance` | **Value object** | Ingestion | Source + time + arrival; carried by every Observation. |
| `Baseline` | **Value object** (a projection input) | from Athlete/Reasoning | Reference for contextualization; not owned here. |
| `ExpectedRange` | **Value object** | Signal | What "normal" looks like for this athlete/question. |
| `SignalEligibility` | **Policy / gate** | Signal→Reasoning boundary | The four-part precondition for becoming evidence. |
| `Noise` | **Not an object** — the *outcome* of rejection | Signal | Noise = a `SignalRejection`, not a thing in itself. |
| `SignalDetectionPolicy` | **Domain service** | Signal | Judges meaning (the four-way discrimination). |

[ASSUMPTION] Only **`ObservationSet`** is an aggregate here. Everything else protects no *independent* invariant: observations and signals are immutable values; rejection, quality, eligibility are values/policies. `Noise` is explicitly *not* an object — it is the recorded *result* of a rejection judgment, which prevents "noise" from being a quiet wastebasket.

---

## Part III — Invariants

[DECISION] The model protects these (mission candidates, challenged and refined):

1. **Provenance is never lost.** Every observation carries source, time, and arrival; the ObservationSet guarantees it.
2. **Observations are immutable.** Corrections supersede with a record; originals are never overwritten (what Aurora first saw may have driven a past decision).
3. **Quality limitations travel downstream.** No signal may hide the quality of the observations beneath it.
4. **Raw observation is never treated as meaning.** Meaning requires contextualization and an explicit signal judgment — there is no shortcut from value to claim.
5. **Signals are contextualized before becoming evidence-eligible.** A signal with no named context cannot pass the eligibility gate.
6. **Rejections are auditable when they affect trust, interpretation, or silence.** Set-aside is a recorded outcome, not an absence.
7. **Self-report is preserved as fallible-but-meaningful.** Words kept verbatim; never auto-true, never dismissed for being subjective.
8. **Missing-expected-data is represented when its absence changes interpretation.** Absence can enter the ladder; it is never silently read as "nothing happened" *or* as "no impact."
9. **Source conflict is preserved, not pre-resolved.** Disagreement between sources is kept as a signal (often → Inquiry), never collapsed by an automatic winner.

[ASSUMPTION] Invariant 4 is the one the whole model exists to protect; 1–3 and 5–9 are its concrete guards.

---

## Part IV — Domain Events

[DECISION] "Domain event" = meaningful across boundaries; "internal" = within the Ingestion/Signal contexts.

| Event | What happened | Emitted by | Who cares | Domain / internal |
|---|---|---|---|---|
| `ObservationSetCreated` | A capture occasion began | Ingestion | Signal | **Domain** |
| `ObservationCaptured` | A value was recorded | Ingestion | Signal | Internal-leaning (within capture) |
| `AthleteReportSubmitted` | A self-report arrived | Ingestion | Signal, Athlete, Understanding | **Domain** (shared w/ DM-002) |
| `InquiryResponseRecorded` | An athlete answered an Inquiry | Ingestion | Signal, Reasoning, Decision Support | **Domain** |
| `ObservationQualityFlagged` | A quality concern was assigned/changed | Signal | Reasoning (eligibility), traceability | **Domain** |
| `ObservationSetAmended` | A late observation joined an occasion | Ingestion | Signal, Reasoning | **Domain** |
| `ObservationContextualized` | Context applied to an observation | Signal | (internal to signal formation) | Internal |
| `SignalDetected` | A meaningful signal was formed | Signal | Reasoning, Understanding | **Domain** |
| `SignalRejected` | A candidate was set aside as noise, with reason | Signal | Understanding (bias-check), traceability | **Domain** |
| `SignalMarkedEvidenceEligible` | A signal passed the eligibility gate | Signal | Reasoning | **Domain** |
| `MissingDataDetected` | Expected data was absent | Signal | Reasoning, Decision Support (Inquiry) | **Domain** |
| `ConflictingObservationDetected` | Two observations of one fact disagree | Signal | Reasoning, Decision Support (Inquiry) | **Domain** |
| `BaselineUnavailable` | Contextualization lacked a baseline | Signal | Decision Support (voice cap), Understanding | **Domain** |
| `SourceConflictDetected` | Two *sources* disagree on a fact | Signal | Reasoning, Decision Support | **Domain** |

[FACT] No payload schemas (non-goal). [ASSUMPTION] `SignalRejected`, `MissingDataDetected`, and the conflict/baseline events are the trust-critical ones — they make Aurora's *uncertainty and silences* visible, exactly as Architecture Discovery requires.

---

## Part V — Relationships to Reasoning and Understanding

### To Reasoning (Hypothesis) — Key Question 11

[DECISION] **The Signal model decides *meaning-worthiness* and *eligibility*; the Reasoning context decides *what a signal does to a hypothesis*. The boundary: Signal hands over eligible signals; Reasoning raises/strengthens/weakens/reopens.**

- [ASSUMPTION] A signal **can** seed a new hypothesis, strengthen/weaken an existing one, reopen a retired one, or trigger `SurpriseDetection` — but *which* of these happens is **Reasoning's** call (or a Reasoning policy), informed by a `VoiceSelectionPolicy`-like `SignalRoutingPolicy`. The Signal model must not pre-decide direction or weight.
- [DECISION] A signal **can trigger `Inquiry` instead of evidence** when it is a source/observation conflict or a meaningful absence only the athlete can resolve. [QUESTION] Does the *Signal* context raise that Inquiry, or does it hand the conflict to *Decision Support* which owns `Inquiry`? **Leaning:** Signal emits `ConflictingObservationDetected`/`MissingDataDetected`; Decision Support decides whether to raise the `Inquiry` (it owns the terminal output). Flagged.

### To Understanding — Key Question 12

[DECISION] **`UnderstandingProfile` consumes *tested hypotheses over time*, not raw signals. Signals influence understanding only *through* Reasoning.**

- **Why:** [FACT] The Understanding Model defines understanding as earned by *survived challenge* — i.e., by hypotheses that were tested, confirmed, or contradicted. A raw signal hasn't been tested against anything yet. Letting signals raise understanding directly would reward mere repetition (the Understanding Model's explicit anti-pattern).
- **Consequence:** Repeated *signals* don't raise understanding; repeated *confirmed hypotheses* do. Contradictory signals lower understanding only via the surprise they cause in Reasoning. Noisy observations *prevent* understanding from improving by failing to produce stable hypotheses. A signal *can* reveal Aurora doesn't understand a dimension — but it does so by producing a surprise in Reasoning, not by writing to Understanding directly.
- **Risk:** A purely indirect path could miss a case where the *pattern of signals themselves* (not any hypothesis) is the thing to learn.
- **Reversal Point:** If signal-level patterns turn out to carry understanding that never surfaces as a hypothesis, allow Understanding to observe signal *streams* read-only — but never let an untested signal raise a level.

[ASSUMPTION] We do not resolve the full Understanding model here (deferred, as the mission allows); we fix only the *dependency direction*: signals → Reasoning → Understanding.

---

## Part VI — Things We Refuse to Model Yet

[ASSUMPTION] Out of scope, with reason:

- **Garmin/device field mappings & FIT parsing** — ingestion *implementation*; the domain only needs "an observation with provenance."
- **Signal thresholds / "meaningful enough" numbers** — non-goal; we model the *judgment's responsibility and inputs*, never its math.
- **Statistical noise-detection formulas** — same; the four-way discrimination is a *responsibility*, not an algorithm here.
- **Baseline & expected-range calculation** — these are *inputs* from Athlete/Reasoning projections; how they're computed is deferred.
- **Confidence math** — foundation-level non-goal; confidence is calibrated/falsifiable/travels, not computed.
- **ML signal detection** — an implementation strategy; the domain must be expressible without it.
- **UI forms for athlete report** — product/UI; the domain needs only "a SubjectiveObservation with words preserved."
- **Device integration error handling** — operational; surfaces as `ObservationQuality` flags, not as its own domain.
- **Source-conflict *resolution* logic** — we model that conflict is *preserved and surfaced*; how Aurora eventually adjudicates (often via Inquiry) is Reasoning/Decision-Support behavior.

---

## Part VII — Glossary

- **Observation** — immutable, timestamped, sourced record that something was recorded/reported/detected; no meaning yet. Can be wrong; superseded, never overwritten.
- **ObservationSet** — aggregate root; the consistency boundary for all observations of one occasion; guarantees provenance, immutability, quality-carry, and completeness status.
- **Source** — value object; origin of an observation (device, athlete-report, coach, manual, plan, competition, external, system-derived).
- **Provenance** — value object; source + time + how it arrived; carried by every observation.
- **SourceTrust** — value object; contextual (per source × question) fallibility profile; never a global ranking.
- **ObservationQuality** — value object; quality-before-meaning (complete/partial/missing/suspicious/stale/source-conflicted…); re-assessable; always travels downstream.
- **ContextualizedObservation** — value object; an observation interpreted relative to baseline, purpose, expected range, history — the input to a signal judgment.
- **Signal** — value object; a contextualized observation (or group) judged meaningful enough for Reasoning to consider, relative to a domain question.
- **SignalSet** — value-object collection of signals for one occasion.
- **SignalRejection** — value object (+ `SignalRejected` event); a considered-and-set-aside candidate with an enumerated reason.
- **Noise** — not an object; the *outcome* of a rejection judgment.
- **MissingDataObservation** — value object; expected-but-absent data, entered as a first-class observation.
- **AthleteReport** — a Source; produces one or more SubjectiveObservations.
- **SubjectiveObservation** — value object subtype of Observation; self-report with the athlete's words preserved; fallible, irreplaceable.
- **InquiryResponse** — SubjectiveObservation linked to the Inquiry that prompted it.
- **Baseline** — value object input (from Athlete/Reasoning projections); the athlete-specific reference for contextualization.
- **ExpectedRange** — value object; what "normal" looks like for this athlete and question.
- **SignalEligibility** — policy/gate; the four-part precondition (which hypothesis / direction / quality / source) for a signal to become evidence.

---

## Final Reflection

> **What is the smallest observation/signal model Aurora needs so it can reason without confusing data with meaning?**

[ASSUMPTION] Five things, and a guardian:

1. **`Observation`** (immutable, with `Provenance`) — what was recorded/reported/detected, carrying its source and time.
2. **`ObservationSet`** (the guardian) — guaranteeing that provenance, immutability, quality, and completeness survive intact to the bottom of every future trace.
3. **`ObservationQuality`** — so a reading's limitations are never hidden from anything built on it.
4. **`ContextualizedObservation`** — the explicit "a number → means something" step, naming the context (baseline, purpose, expected range) it was judged against.
5. **`Signal`** (+ its mirror, `SignalRejection`) — the judged-meaningful outcome, *and* the recorded set-aside, so both "considered and kept" and "considered and rejected" are first-class.

[FACT] The minimum is small but it is *exactly* the chain `recorded → contextualized → judged-meaningful (or rejected)`, with provenance and quality carried throughout and a guardian at the bottom. Remove the `ContextualizedObservation` step and observation silently becomes meaning. Remove `SignalRejection` and silence becomes unaccountable. Remove `ObservationQuality` or `Provenance` and the traceability chain rots from its root. Each earns its place by keeping *data* and *meaning* apart while keeping them *linked*.

> **What is the fastest way this model could poison every downstream recommendation?**

[ASSUMPTION] **Letting a conclusion masquerade as an observation or a signal — treating raw or reported data as meaning at the point of entry.**

This is the fastest poison because it is upstream of *everything* and invisible to everything below it. If a "signal" called `fatigue` enters the system as if it were an observed fact — rather than as a contextualized observation ("power down 6% at matched heart rate vs. baseline") still awaiting a hypothesis — then every downstream object inherits a conclusion it never earned. The `EvidenceCase` weighs a verdict instead of a fact; the `Hypothesis` is confirmed by its own restatement; the `DecisionSupportCase` finds a complete-looking traceability chain that bottoms out in an *interpretation wearing the costume of a recording*. And because the corruption sits at the root, traceability cannot catch it — the chain is intact; it just begins with a lie. One contaminated observation type, and every recommendation built on it is confidently, untraceably wrong.

[FACT] This is why the model's central invariant is *raw observation is never treated as meaning*, and why `Signal` must name only the contextualized fact and its candidate questions — never an interpretation verb. The boundary between data and meaning is not a nicety of layering; it is the point at which Aurora's entire honesty is either preserved or quietly forfeited, before a single hypothesis is even raised.

---

## Success Criterion

> **"What makes an observed fact meaningful enough to become a signal — and what prevents noise from becoming evidence?"**

[ASSUMPTION]
- **What makes it a signal:** an observation, with intact provenance and assessed quality, becomes a `ContextualizedObservation` against a baseline/purpose/expected range, and is then *judged meaningful relative to a domain question* by the `SignalDetectionPolicy`. Meaning is earned through context and judgment — never read off the raw value.
- **What prevents noise from becoming evidence:** two gates. First, the `SignalDetectionPolicy` can issue a recorded `SignalRejection` (artifact, too weak, no baseline, stale, duplicate…) so a candidate is *considered and set aside accountably*. Second, even a real signal must pass `SignalEligibility` — naming its target hypothesis, tentative direction, quality, and source — before the Reasoning context will treat it as evidence. Between the rejection outcome and the eligibility gate, noise has two independent chances to be stopped, and both are auditable.

The model is correct exactly to the degree that it keeps *what was recorded*, *what was judged meaningful*, and *what is eligible to become evidence* as three distinct, linked things — and never lets the first silently become the third.

---

## Open Questions Carried Forward

1. [QUESTION] Does the *Signal* context or *Decision Support* raise an `Inquiry` from a detected conflict/absence? (Leaning: Signal emits the event, Decision Support owns the Inquiry.)
2. [QUESTION] Is "occasion" the right grouping key for `ObservationSet`, or should it be "provenance episode"?
3. [QUESTION] How is "expected" defined for `MissingDataObservation` — only against explicit plans/baselines, or softer expectations too?
4. [QUESTION] Should `ObservationQuality` freeze at signal-formation, or remain re-assessable as later data arrives? (Leaning: re-assessable, with a reversal if it destabilizes downstream.)
5. [QUESTION] Could signal-level *patterns* ever carry understanding that never becomes a hypothesis (a read-only Understanding path)?
6. [QUESTION] When self-report yields both an observation and a declaration, how is double-counting toward one hypothesis prevented? (Shared with DM-002.)

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the third Domain Modeling paper. It resolves the upstream Observation → Signal boundary; it defers ingestion implementation, thresholds, formulas, and the full Understanding model.*

*Inputs: [Foundation Index](../README.md) · [Evidence](../domain/EVIDENCE_MODEL.md) · [Athlete Model](../domain/ATHLETE_MODEL.md) · [Understanding](../domain/UNDERSTANDING_MODEL.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning Model](./CORE_REASONING_MODEL.md) · [Athlete Aggregate](./ATHLETE_AGGREGATE.md)*
