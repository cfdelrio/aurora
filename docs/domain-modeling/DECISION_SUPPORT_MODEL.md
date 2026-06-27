# Domain Modeling 005 — The Decision Support & Voice Selection Model

> When does Aurora have the right to turn evidence and understanding into decision support — and when must it withhold, ask, frame, warn, or stay silent?
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

## What This Model Closes

[FACT] This is the last paper of the reasoning core. The four prior modeling papers built the path: observation → signal (DM-003) → hypothesis/evidence (DM-001) → understanding (DM-004), with the athlete as context (DM-002). This paper resolves the final transformation — **inference becomes advice** — and it is where the entire foundation is either honored or betrayed.

[ASSUMPTION] Everything upstream exists so Aurora can *know honestly*. This model exists so Aurora can *speak responsibly* — or choose not to. Its single governing commitment, inherited from the Decision Model:

> **Aurora does not own the decision. It owns only the integrity of the support it provides.**

A recommendation that lacks traceability, purpose alignment, disclosed uncertainty, an understanding-appropriate voice, risk awareness, or preserved agency is not decision support. It is overreach wearing the costume of help.

---

## The Four-Layer Distinction (the spine)

[DECISION] Four distinct things, never collapsed:

```
   DecisionOpportunity   "a choice may need support"        (a moment)
        │  Aurora reasons about whether/how to help
        ▼
   DecisionSupportCase   "Aurora's structured reasoning,    (the aggregate —
        │                 gated, traced, voice-selected"     guards integrity)
        ▼
   Terminal Output ──┬── DecisionSupport (in a VoiceMode)
        │            ├── Inquiry        (ask the athlete)
        │            └── Withholding    (recorded silence)
        ▼
   AthleteDecision       "what the athlete chooses"          (theirs, always —
                                                              not owned here)
```

[FACT] This is the Decision Model's four-layer distinction (Observation/Interpretation/Decision-Support/Decision) realized as objects. Aurora owns the middle two; the `AthleteDecision` is never owned here, only referenced.

---

## Reconciliation With Prior Modeling

[DECISION] **This paper refines, never contradicts, prior decisions. Points flagged:**

1. **`DecisionSupportCase` aggregate, `VoiceMode` value object, `VoiceSelectionPolicy` policy, `Inquiry` first-class output, `TraceabilityChain` value object** (CRM 001). [DECISION] **All confirmed and detailed**; nothing changed.
2. **Understanding caps voice via `UnderstandingAssessment` projection** (DM-004). [DECISION] **Honored**; the assessment's *safe voice ceiling* is the Understanding Gate's output (Decision 8).
3. **Traceability bottoms out at provenance-bearing `Observation`s in an `ObservationSet`** (DM-003); chain is immutable once formed (CRM 001). [DECISION] **Honored** in traceability verification (Decision 9).
4. **Purpose is versioned and owned by Athlete; "purpose unknown" is first-class** (DM-002). [DECISION] **Honored** in the Purpose Gate (Decision 11).
5. **Decision-outcome feeds Understanding only via hypothesis lifecycle / understanding rules** (DM-004). [DECISION] **Honored**; `AthleteDecision` outcome informs Understanding *indirectly*, never by writing levels (Decision 14).

No conflicts.

---

## Part I — The Fifteen Required Modeling Decisions

### Decision 1 — DecisionSupportCase is an aggregate root

[DECISION] **`DecisionSupportCase` is an aggregate root: the guardian of one unit of decision support, from a `DecisionOpportunity` to a terminal output.**

- **Why:** [FACT] The Decision Model's guarantees must hold *together, atomically* at the moment Aurora speaks-or-not: complete trace, voice ≤ understanding, confidence+falsifier, purpose reference, risk awareness, returned decision, recorded withholding. Invariants that must hold together define a consistency boundary → an aggregate. CRM 001 already named it the guardian.
- **Consequence:** Nothing can emit athlete-facing support except by forming a case, and the case *refuses to form a given voice* unless that voice's gates pass. It is the single chokepoint where integrity is enforced.
- **Risk:** A god-object that knows evidence, understanding, purpose, risk, and agency all at once.
- **Reversal Point:** If it accumulates logic, extract the gates and voice selection into policies/services it *consults* (already done — Decisions 7, 8), keeping the case as integrity-guardian and output-recorder only.

### Decision 2 — The DecisionSupportCase invariant

[DECISION] **A `DecisionSupportCase` may emit a given voice only if that voice's gates pass. Specifically: it *never* emits Recommendation/Warning-as-fact unless it holds (a) a complete `TraceabilityChain`, (b) a `VoiceMode` ≤ the safe voice ceiling from `UnderstandingAssessment`, (c) explicit uncertainty (confidence + falsifier), (d) a Purpose reference (or explicit purpose-unknown → Inquiry), (e) a Risk assessment, and (f) preserved agency (no command, decision returned). If any required gate fails, it drops to a lower voice, to `Inquiry`, or to `Withholding` — and records why.**

- **Why:** [FACT] This is the Decision Model + Architecture Discovery turned into one enforceable rule. Each clause guards a named overreach: (a) untraceable advice, (b) population-to-person error, (c) false certainty, (d) purpose-blind optimization, (e) risk blindness, (f) autonomy violation.
- **Consequence:** The mission's candidate invariant is **accepted and strengthened**: not "never recommend without X" but "voice level is itself gated, and any shortfall *degrades the voice* rather than blocking all output." Aurora almost always has *something* honest it may say (even if only Inquiry or recorded silence).
- **Risk:** Six gates per case could make the common, healthy path heavy.
- **Reversal Point:** If gating overhead dominates, precompute gate-passability for routine low-risk opportunities, reserving full gating for medium+ risk — never skipping it for high risk.

### Decision 3 — DecisionOpportunity is a domain event (becoming a value object when acted on)

[DECISION] **A `DecisionOpportunity` is a domain event: a detected moment where a choice may need support. When a case opens, the opportunity is carried as a value object describing the choice and its trigger. It is not an aggregate (it protects no invariant) and not an entity (it has no lifecycle of its own beyond detection).**

- **Why:** [FACT] Opportunities *arrive* (athlete asks, risk spikes, purpose/behavior diverge, surprise fires, missing data, a planned session looms). "Something happened that may warrant support" is the textbook shape of a domain event. It needs no consistency boundary; the *case* provides that.
- **Consequence (sub-questions resolved):** An opportunity can be **athlete-requested**, **Aurora-detected**, **scheduled** (a planned hard session tomorrow), or **emergent** from risk / purpose-conflict / missing-data / surprise. **Not every workout creates one** — only choices that are non-obvious and consequential (Decision Model's definition of a decision). An opportunity **can expire** (the moment to choose passes) — modeled as the opportunity going stale, recorded, not silently dropped.
- **Risk:** Over-detection floods Aurora with opportunities (and cases) for trivial or already-obvious choices — the "speaking because it has data" failure.
- **Reversal Point:** If over-detection occurs, gate *opportunity detection itself* by the Decision Model's "would speaking help more than silence?" test before a case is even opened.

### Decision 4 — Terminal outputs: DecisionSupport, Inquiry, Withholding (all result types; some emit events)

[DECISION] **The three terminal outputs are *result types* of a `DecisionSupportCase`. `DecisionSupport` carries a `VoiceMode` and content. `Inquiry` carries a question. `Withholding` carries a reason. All three are auditable; `Withholding` and `Inquiry` emit domain events (`RecommendationWithheld`, `InquiryRaised`) because Aurora's silences and questions must be accountable.**

- **Why:** [FACT] CRM 001 fixed three terminal outputs; Architecture Discovery made silence and questions first-class precisely so they are *visible and accountable*, not absences. A withholding that left no trace would be indistinguishable from a miss.
- **Consequence (sub-questions resolved):**
  - **Withholding always requires a reason** (weak evidence / thin understanding / not-Aurora's-decision / incomplete traceability / risk-too-high-to-infer).
  - **Inquiry always includes a question** and **can be combined with cautious framing** ("here's the trade-off as I see it — but which matters more to you?").
  - **Withholding can be visible to the athlete** ("I don't have enough to advise here yet") or genuinely silent — both are recorded.
  - **A withheld recommendation can later become support** when the missing gate clears (more evidence, an Inquiry answered, understanding matured).
- **Risk:** Treating Inquiry-with-framing as a blurred output could erode the clean line between "asking" and "advising."
- **Reversal Point:** If the blur causes confusion, forbid combining Inquiry with any voice above Reflection.

[DECISION] **Candidate principle accepted:** silence is not absence of output; responsible silence is representable (`Withholding` with reason).

### Decision 5 — The official VoiceModes

[DECISION] **Five `VoiceMode`s on one ordered assertiveness axis: `Silence` < `Reflection` < `Framing` < `Warning` ≈ `Recommendation`. `Inquiry` is NOT a VoiceMode (Decision 6). `Silence` IS the lowest VoiceMode *and* corresponds to the `Withholding` output — they are two views of the same thing (the mode chosen vs. the result emitted).**

| VoiceMode | Meaning | Prerequisites | Allowed claims | Forbidden claims | vs. Understanding | vs. Risk | Example | Failure mode |
|---|---|---|---|---|---|---|---|---|
| **Silence** | No support offered | A reason | none | any assertion | any level (incl. Unknown) | may be wrong when risk is high & hidden | *(Withholding, with reason)* | Silence that hides real risk |
| **Reflection** | Surface the athlete's own pattern | A traced, athlete-specific pattern | "you often choose X when Y" | "you should…" | Working+ on the pattern | low–med | "You tend to add intensity when confidence dips." | Reflection that's really a covert command |
| **Framing** | Present trade-offs without choosing | ≥2 defensible paths, traced | "A preserves X; B protects Y" | a hidden preferred answer | Working+; or priors-as-priors at Thin | any | "Push and keep schedule, or recover and protect quality." | Framing that buries a recommendation |
| **Warning** | Flag elevated risk | Convergent risk signals | "this raises injury/breakdown risk" | a diagnosis; a guarantee | may fire even at Thin if risk is high | high–critical | "These signals raise injury risk; not a normal training day." | Warning as fear-mongering or as fact |
| **Recommendation** | Suggest a preferred option | Complete trace + sufficient understanding + confidence+falsifier | "the evidence supports X (conf, falsifier)" | a command; certainty | Trusted+ (lead personal); Working with caveats | low–high (flips to Warning for safety) | "Evidence supports an easy day — and a strong warm-up would change my mind." | Recommendation exceeding understanding |

- **Why:** [FACT] The ladder, prerequisites, and understanding/risk relationships come straight from the Decision Model and DM-004's level→voice table.
- **Consequence (sub-questions resolved):**
  - **A Recommendation can include a Warning** (recommend the safer path *and* name the risk).
  - **A Warning can exist without a Recommendation** (flag risk, leave the choice open) — and may fire on weaker evidence than a Recommendation, because the false-negative cost flips for safety (Evidence/Decision Models).
  - **Framing must not hide a preference** — a framing with a buried answer is a disguised Recommendation (failure mode).
  - **Reflection sits below Framing** (it surfaces a pattern; it doesn't even lay out options).
- **Risk:** Five discrete modes may be too coarse for real conversational nuance.
- **Reversal Point:** Adjust the *number* of modes while keeping the ordinal, gated structure and the Warning-as-safety-exception.

### Decision 6 — Inquiry is not a VoiceMode; it is a separate terminal output

[DECISION] **"Ask the athlete" is *never* a VoiceMode. `Inquiry` is a separate terminal output on a different axis: acquiring input, not asserting support.** (Confirms CRM 001.)

- **Why:** [FACT] The five VoiceModes all sit on *how strongly Aurora asserts*. Asking is categorically different — it is Aurora admitting it lacks something only the athlete can supply. Putting it on the assertiveness ladder would mean treating "I need to know X" as a degree of recommendation, which it isn't.
- **Consequence:** A clean two-axis model: *assertiveness* (the VoiceMode ladder, ending in DecisionSupport or Silence/Withholding) and *acquisition* (Inquiry). The gate logic can route to either axis.
- **Risk / Reversal:** as CRM 001 — if Inquiry and Reflection collapse in practice, revisit; until then, distinct.

### Decision 7 — VoiceSelectionPolicy is a domain policy choosing the maximum *responsible* voice

[DECISION] **`VoiceSelectionPolicy` is a domain policy, consulted by the `DecisionSupportCase`. It consumes the five gate results (evidence, understanding, purpose, risk, agency) and returns either a `VoiceMode`+content, an `Inquiry`, or a `Withholding`. It selects the *maximum responsible* voice — never the most persuasive.**

- **Why:** [FACT] CRM 001 split *the chosen mode* (value object) from *the act of choosing* (policy). The Decision Model's selection rule — voice = the *minimum* of what evidence, understanding, and ownership permit, with risk able to *raise* to Warning — is behavior, testable in isolation, not data on the case.
- **Consequence (sub-questions resolved):**
  - It **can choose Withholding** (no gate supports any voice) and **Inquiry** (a gate fails on something only the athlete can resolve).
  - It **can choose a lower voice than evidence permits** (e.g., Framing despite strong evidence, when the decision is the athlete's to own — goal/competition decisions cap at Framing/Reflection).
  - **Risk can raise voice to Warning** on weaker evidence (safety exception).
  - **Low understanding caps voice** (the ceiling from `UnderstandingAssessment`).
  - **Unclear purpose forces Inquiry**; **incomplete traceability forces a drop** (to a weaker-traceability voice or Withholding).
- **Risk:** "Maximum responsible" is a judgment; mis-tuned, it either over-speaks or over-hedges (Decision Model failure modes 1 and 7).
- **Reversal Point:** If it systematically over- or under-speaks, encode explicit per-gate qualitative rules (non-numeric) before reaching for tuning.

[DECISION] **Candidate rule accepted:** the policy chooses the maximum *responsible* voice, not the most persuasive.

### Decision 8 — The five gates

[DECISION] **Five gates, each a policy/domain-service the `VoiceSelectionPolicy` consults; their *results* are value objects. A gate failure never necessarily blocks *all* output — it constrains *which* outputs remain responsible.** (Full table in Part II; risk and purpose detailed in Decisions 10–11.)

| Gate | Asks | On shortfall → |
|---|---|---|
| **Evidence Gate** | Traceable hypothesis? Sufficient for the claim? Contradictions surfaced? Falsifier named? Uncertainty explicit? | Lower voice; or Withholding if nothing traceable. |
| **Understanding Gate** | Relevant dimension's level? Stale? Fragile? → *safe voice ceiling* (from `UnderstandingAssessment`, DM-004). | Cap voice at the ceiling; lead with priors-as-priors if Thin. |
| **Purpose Gate** | Current purpose? Ambiguous? Aligned? Behavior conflicting? | Inquiry if purpose unknown/ambiguous; surface divergence. |
| **Risk Gate** | Downside if Aurora is wrong? Low/Med/High/Critical? Escalate? | Raise to Warning; force escalation/Inquiry at Critical. |
| **Agency Gate** | Preserves choice? No command? No shame? Decision returned? | Rewrite to preserve agency, or drop voice; never emit a command. |

- **Why:** [FACT] The gates *are* the Decision Model's and Architecture Discovery's preconditions, made explicit and ordered. Making them separate policies keeps each testable and keeps the case from becoming a god-object.
- **Consequence (sub-questions resolved):** Gates are **policies/services** (behavior), their **results value objects** (data). A single gate failure usually **degrades the voice** rather than blocking output: *traceability incomplete* → no Recommendation but maybe Framing/Reflection or Inquiry; *purpose unknown* → Inquiry; *understanding thin* → cap to Framing-with-priors; *risk critical* → Warning + escalation; *agency at risk* → rewrite or drop.
- **Risk:** Five gates interacting could produce surprising combined verdicts hard to explain.
- **Reversal Point:** If combined verdicts are opaque, make the `VoiceSelectionPolicy` emit a *gate-by-gate rationale* (it largely does, via the gate events) so every voice choice is explainable.

### Decision 9 — Traceability verification

[DECISION] **The `DecisionSupportCase` *verifies* (does not author) a `TraceabilityChain` before any assertive output. A `Recommendation` requires a *complete* chain to provenance-bearing observations; weaker outputs have *weaker* requirements: `Warning` may fire on an incomplete-but-convergent chain *when risk is high*; `Framing`/`Reflection` may proceed with priors explicitly labeled; `Inquiry` and `Withholding` need no chain. "Traceability incomplete" is itself a valid reason for `Inquiry` or `Withholding`.**

- **Why:** [FACT] CRM 001: the chain is built upstream and *verified* at the speaking boundary; it is immutable once formed; Decision Support never authors claims, only acts on traced ones. Architecture Discovery: an incomplete chain caps the *top* of the voice ladder but may still permit reflection/framing-as-prior/inquiry/silence. The safety exception for Warning mirrors the risk asymmetry.
- **Consequence (sub-questions resolved):** Complete traceability = every link resolves down to observation/report/context (DM-003). Recommendation: complete, required. Warning: convergent-enough + high risk may suffice (better to warn imperfectly than stay silent on danger). Framing/Reflection: priors allowed if *labeled as priors*. Broken chain → degrade or Inquiry.
- **Risk:** The Warning exception could be abused to warn on thin evidence routinely.
- **Reversal Point:** If Warnings proliferate on thin chains, require that a thin-chain Warning *also* raise an `Inquiry` (warn + ask), never warn-and-stop.

[DECISION] **Candidate invariant accepted, refined:** a *Recommendation* never exists without a complete `TraceabilityChain`; weaker outputs have proportionally weaker (but always *labeled*) traceability requirements.

### Decision 10 — Risk is a multi-kind, multi-level assessment; risk can override understanding for safety

[DECISION] **`RiskAssessment` is a value object produced by a `RiskGate` policy. Risk is *multi-kind* (injury, overtraining, goal-misalignment, psychological harm, loss-of-trust, wasted-adaptation) and leveled `Low/Med/High/Critical`. High risk can *raise* voice to Warning on weaker evidence and can *force* escalation/Inquiry — but it cannot *raise* a Recommendation's understanding ceiling; it can only push toward Warning, escalation, or silence.**

- **Why:** [FACT] The Decision Model defines risk decisions and the false-positive/false-negative *flip* for safety, and lists loss-of-trust as a first-class risk. Risk is the one input allowed to *increase* assertiveness — but only into Warning (flagging danger), never into a confident personal Recommendation on thin understanding (that would just relocate overreach).
- **Consequence (sub-questions resolved):** Risk is **not injury-only** — it includes overtraining, goal-misalignment, psychological harm, trust erosion, and missed adaptation. **High risk can override low understanding** *toward caution* (warn/escalate/withhold), not toward confident advice. **Critical risk forces** human escalation or Inquiry, never a solo confident call.
- **Risk:** A broad risk taxonomy could make every opportunity "risky," desensitizing the Warning.
- **Reversal Point:** If Warnings desensitize, narrow *Warning-eligible* risk to safety/health + irreversible goal harm, leaving softer risks to Framing/Reflection.

### Decision 11 — Purpose alignment enforcement

[DECISION] **The `PurposeGate` reads the Athlete's *current* `PurposeVersion` (DM-002). A `DecisionSupportCase` cannot evaluate decision *quality* without a purpose or an explicit purpose-unknown. Purpose-unknown or ambiguous → `Inquiry`. Behavior-conflicting-with-stated-purpose → surface the divergence (Framing/Reflection), never silently substitute. Conflicting purposes → Framing of the trade-off, never resolution by Aurora.**

- **Why:** [FACT] DM-002 made purpose versioned, owned by Athlete, with "unknown" first-class; the Decision Model makes purpose the referent for whether a change is progress, and forbids purpose-blind optimization.
- **Consequence (sub-questions resolved):** No purpose → no quality evaluation → Inquiry. Recent purpose change → evaluate against the *version current at the relevant time* (purpose is versioned for exactly this). Stated/revealed divergence → surfaced, not resolved. [QUESTION] Which version *Impact* evaluates against when they diverge remains open (shared, foundation-level).
- **Risk:** Forcing Inquiry on every ambiguous purpose could nag athletes who haven't articulated a goal.
- **Reversal Point:** If purpose-Inquiry nags, allow low-risk support under explicit "assuming general fitness" framing, while still flagging that purpose is unknown.

[DECISION] **Candidate invariant accepted:** `DecisionSupportCase` cannot evaluate decision quality without Purpose or explicitly-modeled unknown Purpose.

### Decision 12 — Athlete agency is an invariant *and* a constraint on language

[DECISION] **`AgencyPreservation` is both an invariant on the `DecisionSupportCase` and a constraint on output form. Every assertive output must: avoid commands, avoid shame, distinguish support from decision, and *return the decision* to the athlete. The `AgencyGate` verifies this before emission.**

- **Why:** [FACT] The Decision Model's core principle (companion, not commander) and its "challenge the decision, never the dignity" rule. Agency is not advice content — it is a property of *how* anything is said, which is why it's both an invariant (must hold) and a language constraint (shapes form).
- **Consequence (sub-questions resolved):** Aurora **can challenge without commanding** (dissent + evidence + returned decision). It **can strongly recommend while preserving agency** (strong evidence-based recommendation still ends "the decision is yours" + falsifier). Outputs that **violate agency**: imperatives for non-safety matters, character judgments, shame, hidden coercion. The case **proves agency** by the AgencyGate result recorded in its audit.
- **Risk:** Ritualized "the decision is yours" could become noise the athlete tunes out (Decision Model's flagged risk).
- **Reversal Point:** If the close ritualizes into invisibility, vary its form; never drop the *substance* (returned decision + no command).

[DECISION] **Candidate principle accepted:** Aurora may challenge the decision, but never the dignity of the athlete.

### Decision 13 — Withholding

[DECISION] **`Withholding` is a terminal output (= the `Silence` VoiceMode realized): a recorded choice not to offer support, always with a reason, emitting `RecommendationWithheld` when a recommendation was genuinely considered. It may be silent or communicated. It is responsible only when safer or more honest than speaking.**

- **Why:** [FACT] Architecture Discovery made silence accountable; the Decision Model makes honest silence a valid and sometimes superior output. A withholding with no recorded reason is indistinguishable from a miss — the distinction is trust-critical.
- **Consequence (sub-questions resolved):** Always reasoned; `RecommendationWithheld` is a domain event; preserves trust by refusing false authority. **Better than Framing** when even laying out options would imply unearned understanding. **Dangerous** when silence hides real risk — which is exactly why the Risk Gate can override silence into a Warning.
- **Risk:** Over-withholding (excessive caution, Decision Model failure 7) makes Aurora useless.
- **Reversal Point:** If withholding dominates where evidence/understanding actually suffice, audit withholding reasons against later-confirmed outcomes and recalibrate the gates toward speaking.

[DECISION] **Candidate principle accepted:** withholding is responsible only when safer or more honest than speaking.

### Decision 14 — AthleteDecision relates by reference, is never owned

[DECISION] **`AthleteDecision` is a separate domain event/value object, *referencing* the `DecisionSupportCase` that preceded it (if any), never owned by it. It records the choice and any divergence from Aurora's support, *without judgment*. Its eventual outcome informs `UnderstandingProfile` only through the hypothesis-lifecycle/understanding rules (DM-004) — never by writing levels directly.**

- **Why:** [FACT] The Decision Model: Aurora never owns the decision. DM-004: understanding updates from tested hypothesis outcomes, not from raw events. Recording dissent neutrally honors agency (no moralizing).
- **Consequence (sub-questions resolved):** The athlete **can decide against** Aurora's support; dissent is recorded neutrally. The decision **becomes a future Observation** (DM-003), whose downstream effects may test hypotheses, which may move understanding — *indirectly*. Aurora **avoids judging** by recording process and outcome separately and never labeling the choice good/bad by its result.
- **Risk:** Recording dissent could drift into a "compliance score" — the exact moralizing the foundation forbids.
- **Reversal Point:** If dissent records start being used to grade athletes, strip them to neutral outcome-linkage only, with no compliance semantics.

[DECISION] **Candidate rule accepted:** `AthleteDecision` is not owned by `DecisionSupportCase` but can reference it.

### Decision 15 — What this model never owns

[DECISION] **The Decision Support model never owns: the athlete's decision; the truth of hypotheses or their confidence (Reasoning); understanding levels (Understanding); the athlete's purpose/state/capacity (Athlete); raw evidence/signals (upstream); or the *generation of new claims*. It selects voice and emits support over *already-traced, already-understood* material — it never manufactures the material it speaks about.**

- **Why:** [FACT] Architecture Discovery's anti-collapse principle, and CRM 001's rule that Decision Support is structurally forbidden from inventing claims. Its job is *selection and responsible emission*, not inference.
- **Consequence:** A clean seam: Reasoning supplies traced hypotheses, Understanding supplies the voice ceiling, Athlete supplies purpose/constraints, and Decision Support decides *whether and how to speak*. Each context does one thing.
- **Risk:** The seam tempts leakage — a case quietly "strengthening" a borderline hypothesis to justify a stronger voice.
- **Reversal Point:** If cases start nudging upstream confidence, enforce that a case may only *read* hypotheses/assessments, never write them.

---

## Part II — Candidate Concept Classification

| Concept | Classification | Home | Note |
|---|---|---|---|
| `DecisionSupportCase` | **Aggregate root** | Decision Support | The integrity guardian. |
| `DecisionOpportunity` | **Domain event** (→ value object when carried) | Decision Support | A choice that may need support. |
| `DecisionSupport` | **Value object** (result type) | Decision Support | Carries VoiceMode + content. |
| `Withholding` | **Value object** (result type) + event | Decision Support | Recorded silence with reason. |
| `Inquiry` | **Value object** (result type) + event | Decision Support | A question; separate axis. |
| `VoiceMode` | **Value object** (ordinal) | Decision Support | Silence<Reflection<Framing<Warning≈Recommendation. |
| `VoiceSelectionPolicy` | **Policy** | Decision Support | Chooses max responsible voice. |
| `EvidenceGate` | **Policy / domain service** | Decision Support | Traceable + sufficient + falsified. |
| `UnderstandingGate` | **Policy** (reads `UnderstandingAssessment`) | Decision Support | Produces safe voice ceiling. |
| `PurposeGate` | **Policy** (reads Athlete purpose) | Decision Support | Alignment / ambiguity → Inquiry. |
| `RiskGate` | **Policy / domain service** | Decision Support | Multi-kind, multi-level; safety override. |
| `AgencyGate` | **Policy** | Decision Support | Verifies agency preservation. |
| `RiskAssessment` | **Value object** | Decision Support | Kind + level + escalation flag. |
| `PurposeAlignment` | **Value object** | Decision Support | Aligned / misaligned / unknown / conflicting. |
| `AgencyPreservation` | **Invariant + value object** (gate result) | Decision Support | Both a rule and a recorded result. |
| `TraceabilityVerification` | **Domain service** | Decision Support | Verifies (not authors) the chain. |
| `AthleteDecision` | **Domain event / value object** | Athlete-facing | Referenced, never owned. |
| `DecisionQuality` | **Value object** (process-based) | Decision Support | Judged by reasoning integrity (Decision below). |
| `SupportQuality` | **Value object / projection** | Decision Support | Aurora's review of its *own* support's integrity. |
| `RecommendationWithheld` | **Domain event** | Decision Support | Emitted by Withholding. |

[ASSUMPTION] Only **`DecisionSupportCase`** is an aggregate. Gates are policies/services; their results, voice modes, outputs, and assessments are value objects; opportunities, withholdings, inquiries, and athlete decisions are events/value objects. Nothing else protects an independent invariant.

### Decision Quality vs. Support Quality

[DECISION] **`DecisionQuality` is judged by *reasoning integrity, not outcome* (Decision Model: good decision ≠ good outcome). Aurora evaluates the quality of *its own support* (`SupportQuality`) by whether its gates were honestly met; it does *not* grade the *athlete's* decision quality, and never by outcome.**

- **Why:** [FACT] The Decision Model forbids outcome bias and moralizing. Aurora may reflect on whether *it* reasoned well; it must not sit in judgment of the athlete's choice, especially by results (which are luck-laden in an uncertain domain).
- **Consequence:** `SupportQuality` review feeds Aurora's own calibration (and, via hypothesis outcomes, understanding) — process-based, retrospective, self-directed. A bad outcome from a well-gated support is *not* a quality failure.
- **Risk / Reversal:** If `SupportQuality` ever starts grading athletes, strip it to self-review only.

[DECISION] **Candidate principle accepted:** Aurora evaluates the quality of its support by reasoning integrity, not outcome alone.

---

## Part III — Invariants

[DECISION] (Mission candidates, challenged and refined.)

1. **Recommendation-level output requires a complete `TraceabilityChain`.** Weaker voices have weaker-but-labeled requirements.
2. **`VoiceMode` never exceeds the safe voice ceiling** from `UnderstandingAssessment`.
3. **Decision support is purpose-aligned or explicitly purpose-uncertain.** No quality judgment without purpose.
4. **High risk is never hidden by low-confidence language.** The Risk Gate can override silence/soft voice into a Warning.
5. **Athlete agency is preserved in every output.** No commands (non-safety), no shame; the decision is returned.
6. **Withholding is auditable when a recommendation was considered.** Silence carries a recorded reason.
7. **Inquiry creates a path to new observation.** A question answered re-enters as a `SubjectiveObservation`/`InquiryResponse` (DM-003).
8. **`DecisionSupportCase` never owns the athlete's decision.** It references it; it does not contain it.
9. **Decision/support quality is never judged by outcome alone.** Reasoning integrity governs; Aurora self-reviews, never moralizes.
10. **Decision Support never authors claims.** It speaks only over already-traced, already-understood material.

[ASSUMPTION] Invariants 1, 2, and 5 are the three that most directly keep a companion from becoming a commander: speak only what's traceable, only as strongly as you understand, and always leave the choice with the athlete.

---

## Part IV — Domain Events

[DECISION] "Domain" = meaningful across boundaries; "internal" = within Decision Support.

| Event | What happened | Emitted by | Who cares | Domain / internal |
|---|---|---|---|---|
| `DecisionOpportunityDetected` | A choice may need support | Decision Support / Reasoning / Athlete | Decision Support | **Domain** |
| `DecisionSupportRequested` | Athlete explicitly asked | Athlete | Decision Support | **Domain** |
| `DecisionSupportCaseOpened` | A case began | Decision Support | (internal) | Internal |
| `TraceabilityVerified` | Chain resolved complete | TraceabilityVerification | (internal → enables Recommendation) | Internal-leaning |
| `TraceabilityIncomplete` | Chain could not resolve | TraceabilityVerification | Decision Support (degrade/Inquiry) | **Domain** |
| `EvidenceGatePassed` / `EvidenceGateFailed` | Evidence sufficiency verdict | EvidenceGate | VoiceSelectionPolicy | Internal |
| `UnderstandingGateCappedVoice` | Voice ceiling applied | UnderstandingGate | VoiceSelectionPolicy, traceability | **Domain** |
| `PurposeGatePassed` / `PurposeAmbiguityDetected` | Purpose verdict | PurposeGate | Decision Support (Inquiry) | **Domain** (ambiguity) |
| `RiskGateRaisedWarning` | Risk forced a Warning | RiskGate | Decision Support, athlete | **Domain** |
| `AgencyGatePassed` | Output preserves agency | AgencyGate | (internal) | Internal |
| `VoiceModeSelected` | A voice was chosen | VoiceSelectionPolicy | (internal) | Internal |
| `DecisionSupportGenerated` | Support emitted (umbrella) | Decision Support | Athlete, traceability record | **Domain** |
| `RecommendationGenerated` / `WarningGenerated` / `FramingGenerated` / `ReflectionGenerated` | Specific voice emitted | Decision Support | Athlete | **Domain** |
| `InquiryRaised` | A question was asked | Decision Support | Athlete, Ingestion (future obs) | **Domain** |
| `RecommendationWithheld` | Support was withheld, with reason | Decision Support | traceability, calibration | **Domain** |
| `AthleteDecisionRecorded` | The athlete chose | Athlete-facing | Understanding (indirectly), record | **Domain** |
| `SupportQualityReviewed` | Aurora self-reviewed a case's integrity | Decision Support | calibration | **Domain** |

[FACT] No payload schemas (non-goal). [ASSUMPTION] The trust-critical events are `RecommendationWithheld`, `InquiryRaised`, `UnderstandingGateCappedVoice`, and `RiskGateRaisedWarning` — they make Aurora's *restraint, questions, humility, and caution* visible and auditable.

---

## Part V — Things We Refuse to Model Yet

[ASSUMPTION] Out of scope, with reason:

- **Exact recommendation text / phrasing** — Decision-Support *content*/product, not domain structure.
- **UI rendering & notification timing** — delivery, not domain.
- **Scoring formulas / exact risk thresholds** — foundation-level non-goal; we model risk *responsibility and levels*, not math.
- **Medical escalation protocols** — Aurora escalates (names the need); the clinical workflow is outside the domain (Decision Model: not a medical system).
- **Coach collaboration workflow** — a future actor; Inquiry can target a coach, but the workflow is premature.
- **Training plan generation** — downstream of decision support; not this model.
- **LLM prompting / generation strategy** — implementation of *how* voice content is produced.
- **A/B testing recommendation language** — product experimentation, not domain.
- **The exact qualitative gate rules per voice** — deferred until real cases sharpen them (Decision 7 reversal).

---

## Part VI — Glossary

- **DecisionSupportCase** — aggregate root; guardian of one unit of decision support from opportunity to terminal output; enforces the gates.
- **DecisionOpportunity** — domain event (carried as a value object); a non-obvious, consequential choice that may need support.
- **DecisionSupport** — result-type value object; emitted support carrying a `VoiceMode` and content.
- **Withholding** — result-type value object (+ `RecommendationWithheld` event); recorded silence with a reason; the `Silence` VoiceMode realized.
- **Inquiry** — result-type value object (+ `InquiryRaised` event); a question to the athlete (or coach/context); a separate axis from assertiveness.
- **VoiceMode** — ordinal value object: Silence < Reflection < Framing < Warning ≈ Recommendation.
- **VoiceSelectionPolicy** — domain policy; chooses the maximum *responsible* voice from the gate results.
- **EvidenceGate** — policy/service; verifies a traceable, sufficient, falsified, uncertainty-explicit hypothesis.
- **UnderstandingGate** — policy; reads `UnderstandingAssessment`; produces the safe voice ceiling.
- **PurposeGate** — policy; checks current purpose, alignment, ambiguity; routes to Inquiry on unknown.
- **RiskGate** — policy/service; produces a multi-kind, multi-level `RiskAssessment`; can override toward Warning/escalation.
- **AgencyGate** — policy; verifies the output preserves athlete agency.
- **RiskAssessment** — value object; kind(s) + level (Low/Med/High/Critical) + escalation flag.
- **PurposeAlignment** — value object; aligned / misaligned / unknown / conflicting.
- **AgencyPreservation** — invariant + recorded gate result; no command, no shame, decision returned.
- **TraceabilityVerification** — domain service; verifies (never authors) the `TraceabilityChain` before assertive output.
- **AthleteDecision** — domain event/value object; the athlete's choice, referencing the case, recorded without judgment; never owned here.
- **DecisionQuality** — value object; judged by reasoning integrity, not outcome.
- **SupportQuality** — value object/projection; Aurora's self-review of its own support's integrity.

---

## Final Reflection

> **What is the smallest DecisionSupportCase model Aurora needs so it can speak responsibly?**

[ASSUMPTION] Five things:

1. **The `DecisionSupportCase` aggregate** — one boundary where all integrity guarantees hold together, or no assertive output forms.
2. **A `TraceabilityVerification`** — so nothing assertive is said that can't be walked back to an observation; the difference between a finding and a guess.
3. **The `UnderstandingGate`'s safe voice ceiling** — so Aurora never speaks more strongly than it *knows this athlete*, not just more strongly than the evidence reads.
4. **The `VoiceMode` ladder + `VoiceSelectionPolicy`** — so the strength of speech is a deliberate, gated choice (including Silence and Inquiry), never a reflex of having data.
5. **The `AgencyGate`** — so every output returns the decision to the athlete; the one guarantee that keeps support from becoming instruction.

[FACT] Strip any one and responsibility breaks: without the case, guarantees scatter; without traceability, advice is ungrounded; without the understanding ceiling, the population-to-person error re-enters at the last step; without gated voice selection, Aurora over-speaks; without the agency gate, a companion issues commands. The model is small because each piece removes one specific way to overreach.

> **What is the fastest way this model could turn a companion into a commander?**

[ASSUMPTION] **Letting the strength of the voice be driven by the strength of the *claim* rather than gated by understanding, purpose, and agency — most concretely, emitting a Recommendation whenever the evidence looks strong, without checking the understanding ceiling or returning the decision.**

This is the fastest path to commander because it is the most *natural* one. Strong evidence *feels* like license to advise strongly; it is the obvious thing to build. But a Recommendation justified by claim-strength alone severs the voice from everything that makes it responsible: it may speak with Trusted-level force on Thin personal understanding (population-to-person error at the moment of speech), it may optimize a metric against the athlete's actual purpose, and — most corrosively — it slides from "the evidence supports X, and the decision is yours" to "do X." The instant the autonomy-preserving close is dropped and the voice tracks claim-confidence instead of the gates, Aurora has stopped supporting a person's decision and started issuing instructions to a subject. The evidence might even be right. That is exactly what makes it dangerous: a *correct* command is still a command, and a companion who commands — however well — is no longer a companion.

[FACT] This is why voice is gated, not derived: the strongest *responsible* thing Aurora may say is the minimum of what evidence permits, what it understands of *this* athlete, what their purpose warrants, and what preserves their agency — raised toward Warning only for safety. The gates are not friction on good advice. They are the difference between a companion and a commander.

---

## Success Criterion

> **"Given evidence, understanding, risk, purpose, and agency, what is the strongest responsible thing Aurora may say — including the possibility that it should ask or say nothing?"**

[ASSUMPTION] Aurora can now answer: **the strongest responsible output is the one the `VoiceSelectionPolicy` returns as the maximum that passes all five gates** —
- bounded *above* by the **Understanding Gate's** safe voice ceiling (never speak beyond what you know of *this* athlete),
- grounded by the **Evidence Gate** and **TraceabilityVerification** (never assert what you can't trace),
- shaped by the **Purpose Gate** (aligned, or ask),
- raised toward **Warning** only by the **Risk Gate** for safety,
- and constrained in form by the **Agency Gate** (always return the decision).

If no voice passes, the responsible output is **`Inquiry`** (when the athlete holds the missing piece) or **`Withholding`** (when nothing honest can be said) — both recorded, both accountable. The strongest responsible thing to say is sometimes nothing; the model's job is to know which, and to prove why.

---

## Open Questions Carried Forward

1. [QUESTION] The exact qualitative rules per gate per voice (Decision 7 reversal) — await real cases.
2. [QUESTION] Which purpose version does *Impact* (and thus quality) evaluate against when stated/revealed diverge? (Shared, foundation-level.)
3. [QUESTION] How is `RiskAssessment` produced without formulas — what qualitative inputs feed the level?
4. [QUESTION] Can Inquiry target a coach/third party, and what changes when it does?
5. [QUESTION] How is the autonomy-preserving close kept meaningful rather than ritual? (Shared with Decision Model.)
6. [QUESTION] Does `SupportQuality` self-review feed Aurora's calibration directly, or only via understanding/hypothesis outcomes?

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fifth Domain Modeling paper and the closing piece of the reasoning core. It resolves how inference becomes responsible advice; it defers phrasing, delivery, thresholds, and escalation workflows.*

*Inputs: [Foundation Index](../README.md) · [Decision](../domain/DECISION_MODEL.md) · [Evidence](../domain/EVIDENCE_MODEL.md) · [Understanding](../domain/UNDERSTANDING_MODEL.md) · [Athlete Model](../domain/ATHLETE_MODEL.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning](./CORE_REASONING_MODEL.md) · [Athlete Aggregate](./ATHLETE_AGGREGATE.md) · [Observation & Signal](./OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile](./UNDERSTANDING_PROFILE_MODEL.md)*
