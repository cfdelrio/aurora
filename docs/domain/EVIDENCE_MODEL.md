# The Evidence Model — Domain Discovery

> How Aurora can claim a workout had an impact, when impact is never directly observable.
> A domain discovery document about what Aurora knows, infers, believes, and does not know.

---

## The question this document answers

The previous discovery established a hard truth: **impact is never directly observable.** A workout is an event Aurora can see. Its impact is a consequence Aurora cannot.

This raises an uncomfortable question:

**If Aurora can never observe impact, how can it ever claim a workout had one?**

If Aurora cannot answer this honestly, then every recommendation it ever makes is built on sand. So we answer it now, before any model exists.

The short answer: **Aurora claims impact the same way medicine, science, and a good coach do — by reasoning from observable traces back to the most likely cause, and holding the claim as a calibrated, defeasible inference rather than a direct reading.**

Aurora never says *"this happened."* Aurora says *"the evidence supports this, to this degree, and here is what would change my mind."*

This document defines the machinery that makes that sentence honest.

---

## How to read this document

Same discipline as the rest of the domain discovery. Every substantive statement is tagged.

| Tag | Meaning |
|---|---|
| **[FACT]** | Well-established or self-evidently true. |
| **[HYPOTHESIS]** | Reasoned but unproven for our athletes. Must be validated. |
| **[ASSUMPTION]** | A stance Aurora chooses. Not a truth — a commitment. |
| **[QUESTION]** | Open question to resolve before designing. |
| **[UNKNOWN]** | We genuinely don't know. |

---

## The seven concepts

The mission named seven things that are routinely confused: Observation, Signal, Evidence, Hypothesis, Impact, Knowledge, Confidence.

They are not synonyms. They are not interchangeable. They form a ladder, and **Impact sits in the middle of it** — not because it is one rung among others, but because it is the target the whole ladder is built to reach. Everything below Impact is how Aurora climbs toward it. Everything above is what Aurora may responsibly claim once it gets there.

```
                                        ┌─────────────────────────────┐
   what Aurora may                      │  CONFIDENCE                 │
   responsibly claim          ──────►   │  (calibrated degree of      │
                                        │   justified belief)         │
                                        ├─────────────────────────────┤
                                        │  KNOWLEDGE                  │
                                        │  (justified, defeasible     │
                                        │   claim)                    │
                                        └──────────────▲──────────────┘
                                                       │ when support is
                                                       │ strong, convergent,
                                                       │ and survives challenge
   ═══════════════ IMPACT (the unobservable target) ══╪═══════════════
                                                       │ evidence bears on
                                        ┌──────────────┴──────────────┐
                                        │  HYPOTHESIS                 │
                                        │  (a candidate claim about   │
   how Aurora climbs                    │   impact)                   │
   toward the target           ──────►  ├─────────────────────────────┤
                                        │  EVIDENCE                   │
                                        │  (signal pointed at a       │
                                        │   hypothesis)               │
                                        ├─────────────────────────────┤
                                        │  SIGNAL                     │
                                        │  (observation made          │
                                        │   meaningful by context)    │
                                        ├─────────────────────────────┤
                                        │  OBSERVATION                │
                                        │  (what was recorded)        │
                                        └─────────────────────────────┘
```

The direction of reasoning matters: Aurora builds **upward** from observations, but it *aims downward at the cause*. It sees a trace and reasons backward to what most likely produced it. This is inference to the best explanation — the same logic a doctor uses reading a symptom, or a coach uses watching an athlete fade. [FACT] You can reason reliably about unobservable causes from observable effects; all of empirical science does exactly this.

---

### 1. Observation

**The rawest layer. What a device recorded.**

A power value of 250 watts at second 1,432. A heart rate of 156 beats per minute. A timestamp. A coordinate.

An observation is a recording. By itself it carries no meaning — "250" is just a number. And critically: [FACT] **observations are not the same as truth.** Devices drop signal, miscalibrate, and lie. A heart-rate strap reading 210 bpm may reflect electrical interference, not the heart.

- **What Aurora knows here:** that a value was recorded. Nothing more.
- **[ASSUMPTION]** Aurora treats observations as fallible by default. An observation that contradicts everything around it is more likely an artifact than a revelation.

---

### 2. Signal

**An observation that has become meaningful through context.**

250 watts means nothing. 250 watts sustained for 40 minutes, by an athlete whose threshold is 240 watts, *means something* — it says an effort beyond the usual happened. The observation became a **signal** when context made it interpretable.

[FACT] Not every observation is a signal. Some are noise — artifacts, irrelevant fluctuation, recording errors. Separating signal from noise is the first act of interpretation, and it is already a judgment, not a given.

- **What Aurora knows here:** that something interpretable occurred — relative to a baseline, a context, a history.
- **[QUESTION]** How does Aurora decide what is signal and what is noise without throwing away the rare, real, surprising observation that *looks* like noise?

---

### 3. Evidence

**A signal in relation to a specific question.**

This is the concept most often skipped, and the most important. A signal is not evidence in general. **A signal becomes evidence only when pointed at a claim.**

"Threshold-level power sustained for 40 minutes" is *evidence about fitness*. The very same signal is *not evidence* about the athlete's technique, mood, or competitive readiness. Evidence does not exist in the abstract — it exists relative to a hypothesis.

[FACT] Evidence has two properties that a mere signal does not:
- **Direction** — it points *for* or *against* a claim.
- **Weight** — it bears on the claim strongly or weakly.

A single signal can be evidence for one hypothesis, evidence against another, and irrelevant to a third — simultaneously.

- **What Aurora knows here:** which way a signal points, and how hard, *with respect to a particular question.*
- **[ASSUMPTION]** Aurora never collects "evidence" in a vacuum. It always asks "evidence *for what?*" first. Evidence without a question is just data wearing a costume.

---

### 4. Hypothesis

**A candidate claim about impact — the thing evidence bears on.**

"This training block raised the athlete's aerobic capacity." "Yesterday's session left more fatigue than its numbers suggest." "This athlete's consistency is building durability that will matter in three months."

These are hypotheses. [ASSUMPTION] **Every Aurora claim about impact is, in its nature, a hypothesis** — because impact is unobservable, so no claim about it can ever be a direct reading. The question is never "is this a hypothesis or a fact?" It is always "how well-supported is this hypothesis?"

[FACT] A hypothesis worth holding is one that could, in principle, be wrong — and that something could show to be wrong. A claim that no possible observation could contradict is not a hypothesis. It is a belief immune to evidence, and Aurora must not trade in those.

- **What Aurora knows here:** what it is claiming, and — crucially — what would count against the claim.
- **[QUESTION]** For each kind of impact hypothesis, what observation *would* falsify it? If we can't name one, should Aurora make the claim at all?

---

### 5. Impact — the target

**The actual consequence. Unobservable. The thing every hypothesis is about.** (Defined fully in [`TRAINING_IMPACT_DISCOVERY.md`](./TRAINING_IMPACT_DISCOVERY.md).)

Impact is what Aurora wants to know and can never see. It is the center of the ladder because everything below is reaching toward it and everything above is what Aurora dares to say about it.

[FACT] Aurora's relationship to impact is permanently indirect. It will never close the gap to direct observation. The best it can ever do is assemble enough convergent evidence that a hypothesis about impact becomes safe to act on.

[ASSUMPTION] This permanent indirectness is not a flaw to be engineered away. It is the condition of the domain. A good coach lives with the same limitation and is useful anyway. Aurora's job is to be honest about the gap, not to pretend it closed.

---

### 6. Knowledge

**A hypothesis whose support has become strong enough to act on. Justified belief — never certainty.**

When evidence for a hypothesis is strong, convergent, and has survived attempts to knock it down, Aurora may stop calling it a hypothesis and start treating it as something it *knows*.

But [FACT] this knowledge is **defeasible** — it can be overturned by new evidence. The athlete's FTP "rose" until a retest under fatigue says otherwise. Knowing, for Aurora, is not the end of inquiry. It is a hypothesis promoted by the weight of evidence, on the standing understanding that it can be demoted again.

[ASSUMPTION] Aurora draws a hard line: **knowledge ≠ certainty.** Certainty is not available in this domain and claiming it is dishonest. What is available is *well-justified, revisable belief* — and that is enough to act on, if its confidence is stated truthfully.

- **What Aurora knows here:** the claims it has earned the right to make, and the standing awareness that it may have to take them back.

---

### 7. Confidence

**The calibrated degree to which evidence justifies a claim. The number that must never lie.**

Every piece of knowledge Aurora holds carries a confidence — not as decoration, but as the honest measure of how much the evidence supports it.

[FACT] Confidence is not a feeling and not a sales figure. It is a property of the evidence: how strong, how convergent, how well it has survived challenge. [ASSUMPTION] Aurora's confidence must be **calibrated** — when Aurora says "80% confident" across many claims, it should be right about 80% of the time. A confidence that is systematically too high is a lie with a number attached.

[ASSUMPTION] And confidence must be **falsifiable**: Aurora should always be able to say *what would lower it.* "I'm confident you adapted — and a flat retest next week would make me much less so." A confidence that nothing could shake is not confidence. It is faith, and faith has no place in a recommendation.

- **What Aurora knows here:** not just what it claims, but exactly how much it is entitled to claim it.

This directly honors the manifesto: *"Predicción sin confianza, no predecimos"* — prediction without confidence, we do not predict.

---

## What Aurora knows, infers, believes, and does not know

The deliverable demands these four be drawn apart explicitly. They map onto the ladder.

### What Aurora KNOWS (directly)
[FACT] Only the bottom of the ladder. Aurora knows **what was recorded** and, after interpretation, **what is interpretable** — observations and signals. It knows the athlete produced these numbers, in this context, relative to this history.

It does **not** know impact. It never will, directly.

### What Aurora INFERS
The middle and top. From signals, related as evidence, Aurora infers **hypotheses about impact** — and, when evidence is strong and convergent, promotes some to **knowledge**. Everything Aurora "knows" about impact is actually something it *infers* and holds defeasibly.

### What Aurora BELIEVES
[ASSUMPTION] Below the line of present evidence sit Aurora's **priors** — beliefs it brings to the encounter before this athlete's data speaks. Exercise physiology ("a sufficient stimulus, recovered from, produces adaptation"). The thesis's commitments ("understanding improves decisions"). These are reasoned beliefs, not athlete-specific evidence. They shape interpretation but must never masquerade as evidence *from* the athlete. [QUESTION] How does Aurora keep its priors visible, so a population-level belief is never mistaken for a personal finding?

### What Aurora DOES NOT KNOW
[UNKNOWN] Stated plainly:
- Impact that has occurred but not yet left a trace — **latent impact** (from A-002). Absence of evidence here is *not* evidence of absence.
- The dimensions that may leave no trace at all (much of technical and mental impact).
- The individual lag and magnitude of a specific athlete's response.
- Everything happening in recovery and life that Aurora cannot observe.

[ASSUMPTION] **Aurora must be able to say "I don't know this yet."** A model that has no representation for its own ignorance will fill the gap with false confidence. The four categories above exist so that ignorance has somewhere honest to live.

---

## Grades of evidence

[ASSUMPTION] Not all evidence is equal, and Aurora must not pretend it is. A provisional hierarchy, strongest to weakest:

| Grade | What it is | Example | Caveat |
|---|---|---|---|
| **Confirmed** | A later, direct performance result validates the hypothesis in hindsight. | A retest shows higher threshold after the block. | Strongest, but **delayed** — often arrives weeks late. |
| **Convergent** | Several independent signals point the same way at once. | Load balance, resting HR, and reported freshness all improve together. | Strong *because* independent. Beware signals that only look independent. |
| **Suggestive** | A single signal points one way. | Resting HR alone trends down. | Could be coincidence, could be artifact. Hold loosely. |
| **Prior** | Population-level expectation, not this athlete's data. | "Athletes usually adapt to this kind of block." | A belief, not athlete-specific evidence. Useful as a default, dangerous as a conclusion. |
| **Absent** | No signal at all. | Nothing changed in the data. | [FACT] **Does not mean no impact.** May be latent impact, or impact in an unobservable dimension. |

[FACT] **Convergence beats precision.** One very precise signal is weaker than several rough signals that independently agree. Triangulation from imperfect measures is how reliable inference is built in every empirical field. [HYPOTHESIS] This will be true for Aurora's domain specifically.

---

## The two errors Aurora must fear

[ASSUMPTION] Aurora can fail in two opposite directions, and they are not equally cheap:

- **False positive — claiming an impact that did not occur.** Aurora tells the athlete they adapted when they did not. The athlete trusts a phantom. This erodes the one thing Aurora cannot operate without: trust in its honesty.
- **False negative — missing an impact that did occur.** Aurora stays silent on a real change (often a latent or invisible one). A missed insight.

[ASSUMPTION] Given the thesis — that Aurora's entire value rests on being a trustworthy companion — **the false positive is the more dangerous error.** A companion who occasionally says "I don't know yet" stays trusted. A companion who confidently asserts things that turn out false becomes noise. When forced to choose, Aurora errs toward honest silence over confident fiction. [QUESTION] Is this asymmetry always right, or are there decisions (e.g. injury risk) where a false negative is the costlier error and the balance should flip?

---

## The traceability mandate

This is the operational core of the mission: *every future recommendation must be traceable back to evidence.*

[ASSUMPTION] Aurora adopts this as a non-negotiable rule:

> **No claim about impact may be made unless it can be traced, link by link, back down the ladder: Knowledge → Hypothesis → Evidence → Signal → Observation. If the chain breaks, the claim is not made.**

Consequences of the rule:

- A recommendation that cannot show its evidence is not a recommendation. It is an opinion, and Aurora does not offer opinions dressed as findings.
- When Aurora has only a **prior** (population belief) and no athlete-specific evidence, it must say so: *"Athletes usually respond this way — but I don't yet see it in you."* The belief is offered as a belief, never as a finding.
- When the chain bottoms out at an **absent** signal, Aurora must distinguish *"no impact"* from *"no evidence of impact yet."* These are different sentences and only one of them is honest when impact may be latent.
- Confidence travels with the claim, always, and so does its falsifier — *what would change my mind.*

[FACT] This is exactly the standard the manifesto already set: *"las decisiones son inteligibles o no existen"* — decisions are intelligible or they do not exist. The Evidence Model is how that principle becomes enforceable rather than aspirational.

---

## Open questions

Carried forward; these block model design.

1. **[QUESTION]** What observation would *falsify* each kind of impact hypothesis? If none exists, the hypothesis should not be claimed.
2. **[QUESTION]** How does Aurora separate genuinely independent signals from signals that merely appear independent (and so overstate convergence)?
3. **[QUESTION]** How does Aurora keep priors visible, so a population belief is never reported as a personal finding?
4. **[QUESTION]** Is the false-positive-is-worse asymmetry universal, or does it flip for safety-critical claims like injury risk?
5. **[QUESTION]** How should confidence *change over time* as latent impact becomes observable — should yesterday's "I don't know yet" automatically reopen as new evidence arrives?
6. **[QUESTION]** How does Aurora represent "absent signal" so it is never silently read as "no impact"?

---

## Unknowns

- **[UNKNOWN]** Whether confidence can actually be calibrated in this domain with the data available, or whether honest calibration requires more athlete feedback than we can get.
- **[UNKNOWN]** How much of impact lives permanently in the "absent signal" zone — invisible not just for now, but always.
- **[UNKNOWN]** Whether athletes will trust an honest "I don't know yet" more than a confident guess, or less. The thesis assumes more. This is not yet proven.

---

## Hypotheses to carry forward

- **[HYPOTHESIS]** Convergent, traceable evidence can support impact claims reliable enough to beat the athlete's own intuition often enough to be worth trusting.
- **[HYPOTHESIS]** Calibrated confidence is achievable in this domain and will, over time, make Aurora more trusted than a system that always sounds certain.
- **[ASSUMPTION]** Honest silence in the absence of evidence builds more trust than confident assertion — and trust is the asset Aurora cannot afford to spend.

---

## Final reflection

> **How can Aurora claim a workout had an impact, if impact is never directly observable?**

The same way every honest knower of unobservable things does it: not by seeing the cause, but by reading its traces and reasoning to the best explanation — then stating the claim as a calibrated, defeasible inference, with its evidence attached and its falsifier named.

Aurora's authority does not come from certainty. It comes from **traceability**. A coach who says "trust me" is worth less than a coach who says "here's what I saw, here's what I think it means, here's how sure I am, and here's what would change my mind." Aurora is built to be the second coach.

The deepest commitment in this model is not about evidence at all. It is about the courage to say *"I don't know yet"* — and to keep the gap between **knowing**, **inferring**, and **believing** visible at all times, so the athlete always knows which one they are being handed.

A recommendation traceable to evidence is a gift. A recommendation that cannot show its evidence is a guess wearing the costume of authority. Aurora gives the first and refuses the second.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*Reference: [`THE_AURORA_THESIS.md`](../foundation/THE_AURORA_THESIS.md) · [`TRAINING_IMPACT_DISCOVERY.md`](./TRAINING_IMPACT_DISCOVERY.md) · Methodology: [Engineering Playbook — Domain Discovery (DDD²)](https://github.com/cfdelrio/engineering-playbook/blob/main/playbook/15-domain-discovery.md)*
