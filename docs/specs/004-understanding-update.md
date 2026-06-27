# Spec 004 — Understanding Update from Hypothesis Lifecycle

> How Aurora learns the athlete from what its hypotheses survived, contradicted, or failed — without confusing confidence with understanding.
>
> Behavioral specification for the understanding slice. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `Hypothesis lifecycle outcome → UnderstandingProfile update → UnderstandingAssessment` |
| **Module** | **`understanding`** (new bounded context; consumes `reasoning` outcomes) |
| **Builds on** | [Spec 003](./003-hypothesis-lifecycle.md) + Implementation 003 (lifecycle outcomes are the input) |
| **Produces** | `UnderstandingProfile` (aggregate root), `UnderstandingDimension`, `UnderstandingLevel`, `Surprise`, `UnderstandingAssessment` |
| **Explicitly produces nothing downstream** | no `DecisionSupportCase`, `VoiceMode`, recommendation, warning, `Inquiry`, `AthleteDecision` |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape, the new `understanding` module, enforcement detail) follows separately, as with 001A/002A/003A. Implementation does not begin from this document.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/model. |
| **[DECISION]** | A specification commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora update its understanding of a specific athlete from hypothesis outcomes without mistaking repetition, confidence, or population knowledge for personal understanding?*

[FACT] Implementation 003 gave Aurora a hypothesis lifecycle: claims that get supported, weakened, contradicted, falsified, retired, or promoted-to-working-knowledge. This slice consumes those **outcomes over time** and turns them into Aurora's *understanding of the person* — per-dimension, revisable, and earned only by **survived challenge**.

[ASSUMPTION] **Guiding sentence:** *Aurora does not understand better because it accumulated evidence. It understands better when a hypothesis about the athlete survived real challenge — or died in a way that taught it something.* The whole spec defends that sentence and the distinction it implies between **claim confidence** (Spec 003) and **understanding confidence** (here).

---

## 2. Core Principle

[FACT]
- Understanding is **not** evidence volume.
- Understanding is **not** claim confidence.
- Understanding is **not** population knowledge.
- Understanding grows **only** when athlete-specific hypotheses **survive meaningful challenge across relevant conditions**.
- Understanding may **also improve** when a hypothesis is falsified, contradicted, or surprised in a way that teaches Aurora what it misunderstood.

[FACT] Aurora must never say *"I understand this athlete"* globally. It may hold only **dimension-specific, revisable** understanding.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] `UnderstandingProfile` (aggregate root); `UnderstandingDimension`; `UnderstandingLevel`; consuming **Hypothesis lifecycle outcomes**; promotion by survived challenge; demotion by surprise/contradiction/falsification/staleness/purpose-or-context change; marking stale; recording **why** understanding changed; distinguishing claim confidence from understanding confidence; representing **fragility**; producing `UnderstandingAssessment` (read-only, for future DecisionSupport); preserving traceability back to relevant Hypotheses.

### Out of scope
[FACT] `DecisionSupportCase`; `VoiceMode`; recommendation; warning; `Inquiry`; `AthleteDecision`; impact projection *implementation*; database schema; API; UI; ML models; scoring formulas; Garmin/FIT parsing; production implementation.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Understanding Profile Model, CRM 001, Athlete Aggregate, Evidence Model, Domain Modeling index):

1. Understanding is **dimension-specific, never global**.
2. `UnderstandingProfile` is an **aggregate root**.
3. It consumes **Hypothesis lifecycle outcomes** — not raw Observations, raw Signals, or standalone EvidenceCases.
4. **Claim confidence is not understanding level.**
5. **Evidence volume alone** must not promote understanding.
6. **Repetition alone** must not promote understanding.
7. **Population knowledge** must not promote personal understanding.
8. **Promotion requires survived challenge across relevant conditions.**
9. **Surprise is first-class** and may demote or reopen understanding.
10. **Staleness** may demote understanding gradually.
11. **Purpose or constraint changes** may limit or reset relevant understanding.
12. **Mature understanding is not permanent.**
13. **Demotion is not failure** — it is preservation of epistemic honesty.
14. `UnderstandingAssessment` may expose a **safe voice ceiling** for future DecisionSupport but must **not generate advice**.
15. **No `DecisionSupport`** is created in this slice.
16. **No recommendation** is generated in this slice.

[ASSUMPTION] Rules 1, 4, 5–8, 14–16 are the *defining* constraints — the slice's correctness is judged first by what it refuses (no global understanding; no promotion by volume/repetition/priors; no advice).

---

## 5. Key Concepts (behavioral definitions)

### 5.1 UnderstandingProfile *(aggregate root)*
[DECISION] Aurora's **dimension-specific** understanding of **one athlete**.

**It includes:** athlete reference; dimensions; **level per dimension**; the **evidence of survived challenges** (which hypothesis outcomes earned each level); **fragility**; **staleness**; the **relevant hypothesis outcomes** consumed; **promotion/demotion history**; **reasons for change**.

**It must NOT include:** raw observations; raw signals; `EvidenceCase`s as owned entities; athlete state; capacity; decision support; recommendations; **a global understanding score**.

[FACT] (CRM 001 / DM-002) `UnderstandingProfile` is a **separate aggregate from `Athlete`** — *Athlete describes the athlete; UnderstandingProfile describes Aurora's confidence in its understanding of the athlete.* It references the athlete; it never writes the athlete's attributes.

### 5.2 UnderstandingDimension
[DECISION] A specific **athlete-response pattern under conditions** — **emergent, not a fixed taxonomy**.

**Examples:** response to high-intensity load after poor sleep · recovery pattern after repeated butterfly sessions · tolerance to abrupt volume increase · technical fatigue under sustained effort · subjective heaviness after normal external load.

[FACT] A dimension is about *(response × conditions)*, not a global trait. Dimensions must be **specific enough to avoid global profiling**, remain **traceable to hypothesis outcomes**, and **never become an `Athlete` attribute**.

### 5.3 UnderstandingLevel
[DECISION] The accepted levels: **`Unknown` < `Thin` < `Working` < `Trusted` < `Mature`.**
- **`Unknown`** — no athlete-specific basis yet; a valid, explicit state (not a null).
- **`Thin`** — sparse athlete-specific evidence; barely met; not a basis for confident interpretation.
- **`Working`** — supports **cautious** interpretation; hypotheses partially confirmed, lightly held.
- **`Trusted`** — requires **survived challenge across varied relevant conditions** with forward predictions that held.
- **`Mature`** — Trusted *and* Aurora knows the **edges** of the model; **still revisable** (not permanent).

### 5.4 Survived Challenge
[DECISION] A hypothesis **survives challenge** when:
- a **declared falsifier could have invalidated it** (and did not);
- relevant **contradictory/weakening evidence appeared or could have appeared**;
- it **remained useful under varied relevant conditions**;
- the survival is **athlete-specific**;
- the survival is **traceable**.

[FACT] **Repeated supporting evidence under the same condition is not enough.** Survival requires real exposure to being wrong, across variation — not accumulation under identical conditions.

### 5.5 Surprise
[DECISION] A **first-class** outcome: Aurora observed something **materially inconsistent** with its current understanding. Surprise may be **positive, negative, ambiguous, noise, or context-shift related**.

[FACT] Surprise may trigger: **demotion**, **fragility increase**, **stale marking**, **hypothesis reopening**, **new hypothesis proposal** (as a suggestion to reasoning, not done here), or **explicit uncertainty**. **Surprise must not be hidden** — a confirmation teaches little; a surprise tells Aurora *where* its model is wrong.

### 5.6 Staleness
[DECISION] Understanding may become **stale** when: time passes without relevant testing; athlete **purpose changes**; **constraints change**; **training context changes**; or evidence **no longer covers current conditions**.

[FACT] **Staleness pushes toward caution, not stronger voice** — a stale dimension *lowers* the safe voice ceiling, never raises it.

### 5.7 UnderstandingAssessment
[DECISION] A **read-only** assessment of a dimension for future DecisionSupport. **May include:** dimension; level; fragility; staleness; **safe voice ceiling**; reasons; traceability references.

[FACT] It **must not** generate recommendations, **must not** choose `VoiceMode`, and **must not** own decisions. It is the *interface* the future `decision-support` module reads; it carries the ceiling, never the speech.

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Initialize UnderstandingProfile
- **AC1.1** — *Given* a new athlete, *when* a `UnderstandingProfile` is initialized, *then* **no global understanding score** exists.
- **AC1.2** — *Then* relevant dimensions start `Unknown` (or explicitly `Thin` **only** when an athlete-specific basis exists).
- **AC1.3** — *Then* no recommendation is generated.

### UC2 — Create / identify an UnderstandingDimension
- **AC2.1** — *Given* a Hypothesis outcome referring to an athlete-specific response pattern, *when* processed, *then* a relevant `UnderstandingDimension` is identified or created, **specific enough to avoid global profiling**.
- **AC2.2** — *Then* the dimension is **traceable to hypothesis outcomes** and is **not** stored as an `Athlete` attribute.

### UC3 — Promote after survived challenge
- **AC3.1** — *Given* a Hypothesis that **survived meaningful challenge across relevant conditions**, *when* processed, *then* the relevant dimension's `UnderstandingLevel` **may promote**, with an **explicit, traceable reason**.
- **AC3.2** — *Then* promotion is **dimension-specific**, **not based on repetition alone**, and **creates no DecisionSupport**.

### UC4 — Do not promote from repetition alone
- **AC4.1** — *Given* multiple similar supporting outcomes **under the same condition**, *when* processed, *then* claim evidence may strengthen but the **`UnderstandingLevel` must not promote solely from repetition**; **fragility may remain high**; the reason is recorded.

### UC5 — Demote after contradiction or falsification
- **AC5.1** — *Given* a Hypothesis outcome that **contradicts or falsifies** current understanding, *when* processed, *then* the relevant `UnderstandingLevel` **may demote**, fragility increases (or a limitation is recorded), the **contradiction remains visible**, the **reason is explicit**, and **prior understanding is not deleted**.

### UC6 — Detect surprise
- **AC6.1** — *Given* a Hypothesis outcome that **materially violates** expected understanding, *when* processed, *then* a `Surprise` is **recorded and classified**; understanding **may demote / become fragile / mark stale**; the surprise **may suggest reopening or proposing hypotheses**; and **no DecisionSupport is generated**.

### UC7 — Mark understanding stale
- **AC7.1** — *Given* relevant time / purpose / constraint / context change, *when* processed, *then* the affected dimension **may be marked stale**, the **safe voice ceiling may lower**, previous understanding **remains traceable**, and **history is not deleted**.

### UC8 — Population knowledge as fallback only
- **AC8.1** — *Given* population knowledge suggests an expectation but athlete-specific outcomes are sparse, *when* processed, *then* population knowledge **may seed a Hypothesis elsewhere** but **must not promote `UnderstandingLevel`**; understanding **remains `Unknown` or `Thin`** unless athlete-specific tested outcomes justify more; the **limitation is explicit**.

### UC9 — Produce UnderstandingAssessment
- **AC9.1** — *Given* a consumer asks how well Aurora understands a dimension, *when* an `UnderstandingAssessment` is produced, *then* it includes **level, fragility, staleness, safe voice ceiling, reasons, and traceability**.
- **AC9.2** — *Then* it **does not recommend**, **does not choose `VoiceMode`**, and is **read-only**.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: produce a **global understanding score**; promote understanding from **evidence volume alone**; promote from **repetition alone**; promote personal understanding from **population knowledge**; treat **claim confidence as understanding level**; treat **Mature as permanent**; hide **surprise**; **delete demoted understanding history**; store inferred athlete **state/capacity** in `Athlete`; consume **raw Observations** directly; consume **raw Signals** directly without a Hypothesis outcome; create `DecisionSupportCase`; choose `VoiceMode`; generate `Recommendation`; generate `Warning`; create `Inquiry`; record `AthleteDecision`.

[DECISION] These are **testable negative requirements** (§8).

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- Initialize `UnderstandingProfile` with **no global score**.
- Dimension-specific updates; dimensions traceable to hypothesis outcomes.
- **Promotion by survived challenge** (across varied relevant conditions) with traceable reason.
- **No promotion by repetition alone** (same-condition repeats stay capped, fragility high).
- **No promotion from population knowledge** (stays Unknown/Thin; limitation explicit).
- **Claim confidence ≠ understanding level** (a high-confidence single claim does not raise the level).
- **Demotion** after contradiction/falsification; contradiction visible; history preserved.
- **Surprise** recorded and classified.
- **Staleness** lowers the safe voice ceiling, preserves history.
- **Mature demotion** on new contradictory evidence.
- `UnderstandingAssessment` is **read-only** and exposes level/fragility/staleness/ceiling/reasons/traceability.
- **Safe voice ceiling exposed without choosing a `VoiceMode`.**

**Negative (must prove absence):**
- No `DecisionSupportCase`/`VoiceMode`/`Recommendation`/`Warning`/`Inquiry`/`AthleteDecision` object created.
- No **global understanding score**; no promotion from volume/repetition/priors; no `Mature`-as-permanent; no deleted demotion history; surprise never hidden.
- Understanding **does not consume raw Observations or raw Signals** — only Hypothesis lifecycle outcomes.

**Dependency-boundary:**
- `understanding` **may depend on** `reasoning` outcomes.
- `reasoning` **must NOT depend on** `understanding` (re-checked over the import graph).
- `understanding` **must NOT depend on** `decision-support`.
- `observation` still imports neither.

[ASSUMPTION] The negative + boundary tests are the contract that *Aurora learns from what its hypotheses survived, not from how much it accumulated*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Implementation 003

[FACT] This slice **builds on, and does not change,** Implementation 003:
- **Hypothesis lifecycle outcomes** are the input to `UnderstandingProfile`.
- **EvidenceCases do not directly promote** understanding; **Signals do not directly promote** understanding.
- The `observation` module remains **upstream**; the `reasoning` module remains **independent of understanding** (`reasoning ⇏ understanding`).
- Understanding consumes **tested outcomes**, not raw evidence volume.
- **`promoted-to-working-knowledge` (a reasoning lifecycle state) is NOT automatically `Mature` understanding** — it is one input among the outcomes; understanding levels are earned separately, by survived challenge across conditions.

[DECISION] No edits to Spec 003 files or to the `reasoning`/`observation` source. The `understanding` module is **new and additive**; it imports the `reasoning` outcome surface (read-only) and `shared-kernel`.

---

## 10. Out-of-Scope Follow-Up Specs

[ASSUMPTION]
- **Spec 005 — DecisionSupportCase Gate & Voice Selection** (consumes `UnderstandingAssessment`'s ceiling).
- **Spec 006 — First End-to-End Responsible Reflection.**
- **Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation.**
- **Spec 008 — Projection Refresh and Staleness Strategy.**

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- Exact representation of Hypothesis lifecycle outcomes as events (vs. reading hypothesis state).
- How dimensions are named and deduplicated.
- How much variation counts as "varied relevant conditions."
- Exact promotion threshold; exact demotion threshold.
- How staleness decays over time.
- How purpose changes map to affected dimensions.
- Whether the safe voice ceiling is qualitative only. *([ASSUMPTION] qualitative first.)*
- Whether `UnderstandingAssessment` is a projection or value object in implementation. *([ASSUMPTION] a read-only projection over the profile.)*
- First concrete dimension worth implementing.
- Compile-time vs. runtime enforcement depth.

[ASSUMPTION] None block the behavioral spec: Aurora can hold per-dimension levels, promote only by survived challenge, demote on surprise/contradiction/staleness, refuse promotion by volume/repetition/priors, and expose a read-only assessment — regardless of how the above resolve.

---

## 12. Success Criterion

> **"How does Aurora learn the athlete from what its hypotheses survived, contradicted, or failed — without confusing confidence with understanding?"**

[ASSUMPTION] Answerable from this spec: Aurora holds a per-dimension `UnderstandingProfile` (never a global score) that consumes **Hypothesis lifecycle outcomes** — never raw observations, signals, or evidence volume. A level **promotes only when an athlete-specific hypothesis survived meaningful challenge across varied relevant conditions** (repetition and population priors never promote); it **demotes** on contradiction, falsification, surprise, or staleness, always preserving history and the contradiction, with an explicit reason. **Claim confidence is held entirely separate from understanding level** (a sure single claim does not make Aurora understand the person). Aurora exposes a read-only `UnderstandingAssessment` carrying level, fragility, staleness, and a **safe voice ceiling** — but no advice, no `VoiceMode`. And it confuses nothing because understanding is structurally per-dimension, earned only by survived challenge, and the module produces no decision/recommendation and cannot depend on decision-support — proven by negative and boundary tests. Aurora learns from what it survived, not from what it piled up.

---

## Known Risks

[ASSUMPTION]
- **Risk:** evidence volume / repetition quietly promotes a level. **Defense:** promotion keyed to *survived challenge across conditions*; UC4 + negative test that same-condition repeats don't promote.
- **Risk:** population priors leak into personal level. **Defense:** invariant 7 + UC8 + negative test.
- **Risk:** claim confidence is read as understanding. **Defense:** invariant 4 + a test that a high-confidence single claim leaves the level unchanged.
- **Risk:** `promoted-to-working-knowledge` is treated as `Mature`. **Defense:** §9 + a test that a promoted hypothesis alone does not yield Mature.
- **Risk:** demotion deletes history / hides surprise. **Defense:** invariants 9, 13 + tests preserving history and surprise.
- **Risk:** understanding reaches toward decision-support, or reasoning reaches toward understanding. **Defense:** dependency-boundary tests (`reasoning ⇏ understanding`; `understanding ⇏ decision-support`).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fourth Specification. It defines the behavioral contract for updating understanding from hypothesis outcomes; it defers the technical spec, persistence, and all decision support to later specs.*

*Inputs: [Spec 003](./003-hypothesis-lifecycle.md) · [Tech Spec 003A](./003-hypothesis-lifecycle-tech.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
