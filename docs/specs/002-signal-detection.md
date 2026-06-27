# Spec 002 — Signal Detection from Contextualized Observations

> How Aurora notices that something may matter — without claiming what it means.
>
> Behavioral specification for the second implementation slice. Not implementation; no changes to Implementation 001.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | Second slice — the first responsible act of interpretation |
| **Module** | `observation` (a `signal` sub-boundary within it — [Boundary Map §1](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md)) |
| **Builds on** | [Spec 001](./001-observation-set-intake.md) + [Tech Spec 001A](./001-observation-set-intake-tech.md) + Implementation 001 |
| **Produces** | `ContextualizedObservation`, `Signal`, `SignalRejection`, `SignalDetectionPolicy` |
| **Explicitly produces nothing downstream** | no `Hypothesis`, `Evidence`, `Impact`, `Understanding`, `DecisionSupport` |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (language-level shape, where `Signal` lives, enforcement details) follows separately, mirroring how Spec 001 → Tech Spec 001A worked. Implementation does not begin from this document.

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

[FACT] **Central question:** *How can Aurora identify that something observed, in context, may matter — without claiming what it means, without creating evidence, and without inferring impact?*

[FACT] Implementation 001 gave the `observation` module the ability to **record without interpreting**. This slice adds the **first, smallest act of interpretation**: deciding that a contextualized observation *may be relevant to a future reasoning question* — and recording, auditably, when it is not.

[ASSUMPTION] The boundary this slice protects is the most delicate in the whole system. It is the exact seam where *data becomes meaning-worthy*. Cross it carelessly and "a conclusion masquerading as an observation" poisons everything downstream ([Domain Modeling index](../domain-modeling/README.md)). The whole spec is about crossing it **honestly**: a Signal asserts *relevance*, never *cause, impact, or athlete state*.

---

## 2. Core Principle

[FACT] A `Signal` does not say what is happening to the athlete. It says:

> *"This contextualized observation may be relevant to a future reasoning question."*

[FACT] A Signal is **not** Evidence, **not** a Hypothesis, **not** Impact, **not** Decision Support. (Evidence Model: a signal becomes evidence *only when pointed at a hypothesis* — which happens in the `reasoning` module, Spec 003, never here.)

[ASSUMPTION] The act of separating signal from noise *is already a judgment* (Evidence Model). This slice makes that judgment **explicit, bounded, and auditable** — never a silent side effect of looking at data.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] Contextualizing observations; defining `ContextualizedObservation`, `Signal`, `SignalRejection`, `SignalDetectionPolicy`; preserving provenance and quality from observations; using baseline / expected range / declared purpose as contextual inputs; producing auditable detection outcomes; rejecting observations as noise/insufficient/irrelevant **without deleting them**.

### Out of scope
[FACT] Hypothesis creation; `EvidenceCase`; `ImpactAssessment`; `UnderstandingProfile`; `DecisionSupportCase`; recommendations; warnings; voice selection; Garmin/FIT parsing; persistence; API; UI; ML models; scoring formulas; production implementation.

[ASSUMPTION] Anything that asks *"what does this mean / what caused it / what should the athlete do"* is out of scope by definition — that is reasoning and decision support, downstream.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Observation & Signal Model, Evidence Model, and Domain Modeling index):

1. Raw observation is never meaning.
2. **A contextualized observation is not yet a signal.**
3. **A Signal is not Evidence.**
4. A Signal must preserve traceability back to the originating `ObservationSet` and `Observation`.
5. Observation quality limitations must travel into signal detection (and onward).
6. Source conflict must not be hidden.
7. Missing data may produce a signal **only when its absence is meaningful in context**.
8. `SignalRejection` is auditable, not silent deletion.
9. `SignalDetectionPolicy` may identify relevance, direction, and quality — **but not causal explanation**.
10. No `Hypothesis` is created in this slice.
11. No `Evidence` is created in this slice.
12. No `Impact` is inferred in this slice.

[ASSUMPTION] Rules 2, 3, 9, 10–12 are the *defining* constraints. The slice's correctness is judged first by what it **refuses** to produce or assert.

---

## 5. Key Concepts (behavioral definitions)

### 5.1 ContextualizedObservation

[DECISION] An `Observation` (from Spec 001) **paired with the contextual frame against which it could be interpreted** — but *not yet judged meaningful*. It is the explicit "a number → could mean something" stage, naming *which context was applied* (for traceability).

**Contextual inputs it may carry (all read-only, none owned here):**
- athlete **purpose** (read from the Athlete context; may be "unknown"),
- known **constraints**,
- **expected range** for the quantity,
- **baseline** reference,
- workout/session **context**,
- **time relation** (e.g., relative to recent efforts),
- **source reliability in this context** (contextual, not a global ranking),
- the observation's **quality** (carried from Spec 001, never stripped).

[FACT] Contextualization gives an observation an **interpretive frame, not a conclusion**. A `ContextualizedObservation` carries no relevance verdict, no direction, no meaning — it is the *input* to `SignalDetectionPolicy`, not its output.

[ASSUMPTION] If a required context is *absent* (no baseline, no purpose), contextualization still succeeds but records the gap — which becomes a rejection reason (`missing-baseline`, `missing-purpose`) rather than a fabricated frame.

### 5.2 Signal

[DECISION] A value object (per [CRM 001](../domain-modeling/CORE_REASONING_MODEL.md) / Boundary Map: `Signal` is a value object) indicating a contextualized observation **may be relevant to a reasoning question**.

**A Signal answers:**
- relevant to **what kind of future question**? (a *question topic*, e.g. "aerobic response" — not an answer)
- in **what direction**? (e.g., "above expected" / "below expected" / "deviates" — directional, not causal)
- with **what quality**? (carried from the observation)
- from **what source**(s)?
- traceable to **which observations** / which `ObservationSet`?
- with **what uncertainty or limitation**?

**A Signal must NOT answer:**
- what caused it,
- what impact it had,
- whether the athlete is fatigued / recovered / ready,
- whether the athlete should change training,
- whether the observation is evidence.

[FACT] "Direction" here is *directional relative to a context* (above/below/deviates from expected range or baseline) — it is **not** a causal or impact direction. "Threshold-power sustained beyond the usual" is a signal about *what was observed relative to expectation*; it is not a claim about fitness (Evidence Model: the same signal is evidence for fitness only once pointed at that hypothesis, downstream).

### 5.3 SignalRejection

[DECISION] An **auditable outcome** explaining why a `ContextualizedObservation` did **not** become a Signal. It is recorded, not a silent drop, and the original observation remains fully preserved and traceable.

**Possible reasons (enumerated):**
`insufficient-quality` · `insufficient-context` · `expected-normal-variation` · `source-conflict-unresolved` · `duplicate-redundant` · `irrelevant-to-current-question` · `missing-baseline` · `missing-purpose` · `noise` · `stale-context`.

[FACT] (Architecture Discovery / Observation & Signal Model): rejection is first-class precisely so silence is **accountable** — to distinguish "Aurora considered this and set it aside, here's why" from "Aurora missed it." Rejected candidates can become meaningful later; rejection is never deletion.

### 5.4 SignalDetectionPolicy

[DECISION] A **domain policy** (lives in the `observation`/`signal` boundary, per Boundary Map §7) that decides whether a `ContextualizedObservation` becomes a `Signal` or a `SignalRejection`.

**It may decide:** relevance · direction · signal strength/salience (qualitative) · quality eligibility · rejection reason.

**It must NOT decide:** evidence · hypothesis · impact · decision support · athlete state · capacity · readiness · fatigue.

[ASSUMPTION] The policy is the *judgment* (behavior); `Signal`/`SignalRejection` are its *outputs* (values) — the same split used for `VoiceMode`/`VoiceSelectionPolicy`. No scoring formula is specified (non-goal); the spec defines the policy's *responsibility and limits*, not its math.

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Contextualize a measured observation
*(HR / pace / duration / stroke count / lap time / early stop)*
- **AC1.1** — *Given* a measured `Observation` with provenance, *when* contextualized, *then* a `ContextualizedObservation` is produced with **provenance preserved** and traceable to the `ObservationSet`/`Observation`.
- **AC1.2** — *Given* a quality-limited observation, *when* contextualized, *then* the **quality limitation remains visible** on the `ContextualizedObservation`.
- **AC1.3** — *Given* a `ContextualizedObservation`, *when* created, *then* **no Signal exists yet** and **no meaning is inferred** — it awaits `SignalDetectionPolicy`.

### UC2 — Detect a candidate signal
*(unusually high HR for expected effort; "felt heavy" after normal load; missing HR where expected; abrupt stop vs. planned session)*
- **AC2.1** — *Given* a `ContextualizedObservation` that appears relevant against context, *when* the policy evaluates it, *then* a `Signal` is produced.
- **AC2.2** — *Given* a produced `Signal`, *when* inspected, *then* it carries **provenance back to `ObservationSet`/`Observation`**, its **quality**, its **uncertainty/limitation**, a **question-topic**, a **direction**, and **source(s)** — and **nothing else**.
- **AC2.3** — *Given* a produced `Signal`, *when* inspected, *then* it **does not become Evidence** and exposes no path to do so.

### UC3 — Reject as not-a-signal
- **AC3.1** — *Given* a `ContextualizedObservation` that does not qualify, *when* evaluated, *then* a `SignalRejection` is produced with an **explicit enumerated reason**.
- **AC3.2** — *Given* a rejection, *when* recorded, *then* the **original observation remains preserved** and the rejection is **auditable** (traceable to the observation).
- **AC3.3** — *Given* a rejection, *when* produced, *then* **no downstream meaning** is inferred.

### UC4 — Preserve source conflict
- **AC4.1** — *Given* two conflicting sources, *when* the policy evaluates, *then* it **may** reject (`source-conflict-unresolved`), **lower quality**, or produce a `Signal` **marked as conflicted** — but the **conflict is never silently resolved**.
- **AC4.2** — *Given* a conflict, *when* any outcome is produced, *then* **provenance to both sources remains traceable**.

### UC5 — Missing data as possible signal
- **AC5.1** — *Given* a `MissingDataObservation`, *when* contextualized, *then* it may be evaluated.
- **AC5.2** — *Given* missing data whose **absence matters in context**, *when* evaluated, *then* a `Signal` **may** be produced — but **never Evidence**.
- **AC5.3** — *Given* missing data with **insufficient context**, *when* evaluated, *then* a `SignalRejection` (`insufficient-context` / `missing-baseline`) is produced.
- **AC5.4** — *Given* any missing-data outcome, *then* absence is **never read as "no impact"** (Evidence Model: absence of evidence ≠ evidence of absence).

### UC6 — Self-report as possible signal
- **AC6.1** — *Given* a `SubjectiveObservation`, *when* contextualized, *then* the **original wording remains preserved and traceable**.
- **AC6.2** — *Given* self-report, *when* evaluated, *then* it is **neither dismissed for being subjective nor treated as absolute truth**; it **may** produce one or more `Signal`s.
- **AC6.3** — *Given* ambiguous or insufficiently-contextualized self-report, *when* evaluated, *then* a `SignalRejection` may be produced; **ambiguity may be carried forward, but no `Inquiry` is created** (Inquiry is Decision Support, downstream).

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: create `Hypothesis`; create `Evidence`; create `Impact`; create `Understanding`; create `DecisionSupport`; infer fatigue; infer readiness; infer capacity; generate recommendations; silently drop rejected signals; resolve source conflicts without preserving the conflict; strip quality limitations; treat self-report as unquestioned truth; treat device data as unquestioned truth; treat high-quality observation as automatically meaningful; treat low-quality observation as automatically useless.

[DECISION] These are **testable negative requirements** (§8), not aspirations. The slice is incorrect if any appears.

---

## 8. Validation Strategy

[ASSUMPTION] Tests written to these acceptance criteria; the **negative and boundary tests are the defining ones.**

**Positive:**
- `ContextualizedObservation` preserves provenance + quality (AC1.*).
- `Signal` preserves provenance + quality + uncertainty; names only topic/direction/source (AC2.*).
- `SignalRejection` preserves provenance + an enumerated reason; original observation intact (AC3.*).
- Source conflict preserved across all outcomes (AC4.*).
- Missing-data signal eligibility (signal only if absence matters; rejection otherwise) (AC5.*).
- Self-report signal eligibility; verbatim wording traceable (AC6.*).

**Negative (must prove absence):**
- A `Signal` has **no** field for fatigue / readiness / impact / evidence / recommendation / cause / meaning / verdict.
- No `Hypothesis`, `EvidenceCase`, `ImpactAssessment`, `UnderstandingProfile`, or `DecisionSupportCase` object is produced anywhere in this slice.
- No rejected candidate is deleted (every rejection remains retrievable).
- No code path strips a quality limitation or silently resolves a source conflict.

**Dependency-boundary:**
- Signal detection **does not depend on** `reasoning` or `decision-support` modules (it cannot import them). Per Boundary Map §2: `observation ⇏ reasoning`. A test/lint asserts the `signal` boundary imports only `observation` domain + `shared-kernel`.

[ASSUMPTION] The negative + boundary tests are the contract that *Aurora notices relevance without claiming meaning*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Implementation 001

[FACT] This slice **builds on, and does not change,** Implementation 001:
- `ObservationSet` remains the source of raw observations.
- Signal detection **consumes observations but never mutates them** (they are frozen; Spec 001).
- **Provenance born in `observation` is preserved** into `ContextualizedObservation` and `Signal`.
- **Quality limitations travel forward** unchanged.
- **Superseded observations remain traceable** (signal detection reads `active()` / `activeAsOf()`; it does not alter history).
- The `observation` recording code **must not be changed to "know" about reasoning** — the new `signal` sub-boundary may read observations, but the intake side stays meaning-free.

[DECISION] No edits to existing Spec 001 files or Implementation 001 source are part of this spec. The `signal` capability is **additive**.

---

## 10. Out-of-Scope Follow-Up Specs

[ASSUMPTION] Likely next specs, in dependency order:
- **Spec 003 — Hypothesis Lifecycle & EvidenceCase** (where a Signal first becomes Evidence, in `reasoning`).
- **Spec 004 — Understanding Update from Hypothesis Lifecycle.**
- **Spec 005 — DecisionSupportCase Gate & Voice Selection.**
- **Spec 006 — First End-to-End Responsible Reflection.**

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- What baseline representation is needed for first implementation? *(Baseline is a read-only contextual input; its shape is a tech-spec concern.)*
- How much purpose context is required for signal detection? *(Some signals may be purpose-independent, e.g. "HR far above expected range"; others need purpose. Carried.)*
- Should `Signal` live inside the `observation` module or a separate `signal` submodule under it? *(Boundary Map §1 leans: `signal` sub-boundary inside `observation`; finalize in tech spec.)*
- What source-conflict strategies are allowed before reasoning? *(This slice permits reject / lower-quality / mark-conflicted; preference deferred.)*
- How much duplicate detection belongs in signal detection vs. later? *(`duplicate-redundant` is a rejection reason here; depth deferred.)*
- What is the minimum first signal type worth implementing? *(Likely a measured "deviates from expected range" signal — simplest, purpose-light.)*
- Should signal strength be qualitative only at first? *([ASSUMPTION] yes — qualitative salience, no numeric score; non-goal forbids formulas.)*
- How should detection policies be registered/selected? *(Tech-spec concern.)*
- How much of signal eligibility is compile-time vs. runtime enforced? *(Carried from Boundary Map §11; finalize in tech spec.)*

[ASSUMPTION] None block the behavioral spec: Aurora can contextualize, detect-or-reject auditably, preserve provenance/quality/conflict, and refuse meaning — regardless of how the above resolve.

---

## 12. Success Criterion

> **"How does Aurora notice that something may matter without claiming what it means?"**

[ASSUMPTION] Answerable from this spec: Aurora pairs an immutable `Observation` with a named contextual frame (`ContextualizedObservation`), then a bounded `SignalDetectionPolicy` either produces a `Signal` — which asserts only *relevance, direction, quality, source, traceability, and uncertainty*, never cause/impact/state — or an auditable `SignalRejection` with an enumerated reason that **preserves** the original. Provenance and quality travel from Spec 001 untouched; source conflict stays visible; missing data and self-report are eligible without becoming evidence or truth. And it claims nothing about meaning because a `Signal` has **no field** for fatigue/readiness/impact/evidence and the `signal` boundary **cannot reach** the reasoning module — proven by negative and dependency tests. Relevance is noticed; meaning waits for Spec 003.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a "direction" field drifts from *directional-vs-expected* into *causal/impact* meaning. **Defense:** AC2.2 enumerates allowed Signal fields; negative test forbids cause/impact/meaning fields; direction is defined as relative-to-context only.
- **Risk:** rejection becomes a silent filter. **Defense:** `SignalRejection` is a first-class recorded outcome with enumerated reason; test that no candidate is deleted.
- **Risk:** signal detection reaches "up" toward reasoning for convenience. **Defense:** dependency-boundary test (`observation ⇏ reasoning`).
- **Risk:** missing/absent data silently read as "no impact." **Defense:** AC5.4 + Evidence Model rule; rejection/`Signal` never assert absence-of-impact.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the second Specification. It defines the behavioral contract for signal detection; it defers the technical spec, persistence, enforcement detail, and all evidence/impact reasoning to later specs.*

*Inputs: [Spec 001](./001-observation-set-intake.md) · [Tech Spec 001A](./001-observation-set-intake-tech.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · Process: [spec-process.md](./spec-process.md)*
