# Spec 005 — DecisionSupportCase Gate & Voice Selection

> How Aurora decides the maximum responsible way to speak to the athlete — or chooses not to speak — without turning evidence into command, understanding into authority, or support into decision ownership.
>
> Behavioral specification for the final reasoning-core slice. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `UnderstandingAssessment + traceable reasoning → DecisionSupportCase → Terminal Output (Voice / Inquiry / Withholding)` |
| **Module** | **`decision-support`** (new bounded context; consumes `reasoning`, `understanding`, athlete context) |
| **Builds on** | [Spec 004](./004-understanding-update.md) + Implementation 004 (the `UnderstandingAssessment` + `SafeVoiceCeiling` are inputs) |
| **Produces** | `DecisionSupportCase` (aggregate root), terminal outputs (`DecisionSupport`/`Inquiry`/`Withholding`), `VoiceMode`, gates, `VoiceSelectionPolicy` |
| **Explicitly does not produce** | UI, API, LLM text, training plans, or an owned `AthleteDecision` |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape, the new `decision-support` module, enforcement detail) follows separately, as with 001A–004A. Implementation does not begin from this document.

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

[FACT] **Central question:** *How can Aurora decide the maximum responsible way to speak to the athlete — or choose not to speak — without turning evidence into command, understanding into authority, or support into decision ownership?*

[FACT] The reasoning core is complete up to *understanding*: Aurora can record (001), notice relevance (002), reason toward defeasible claims (003), and hold per-dimension understanding with a `SafeVoiceCeiling` (004). This slice adds the **last piece**: turning reasoning + understanding into **athlete-facing support** — or into a question, or into silence — while the **athlete keeps the decision**.

[ASSUMPTION] **Guiding sentence:** *Aurora does not recommend because it knows something. It recommends only when it can show that speaking is more responsible than staying silent.* The whole spec defends that sentence: **voice is gated, not derived.**

---

## 2. Core Principle

[FACT]
- Aurora does **not** recommend because a claim is strong.
- Aurora speaks **only** when speaking is more responsible than silence.
- **Voice is gated, not derived.** The selected output is constrained by **evidence, traceability, understanding, purpose, risk, and agency**.
- **Aurora owns the integrity of support. The athlete owns the decision.**

---

## 3. Scope & Non-Scope

### In scope
[DECISION] `DecisionOpportunity`; `DecisionSupportCase` (aggregate root); terminal outputs (`DecisionSupport`, `Inquiry`, `Withholding`); `VoiceMode`; `VoiceSelectionPolicy`; the gates (`EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate`, `TraceabilityVerification`); risk assessment; purpose alignment; responsible degradation; when to ask vs. assert; when to withhold; preserving agency; preserving traceability; preventing recommendation without sufficient gates.

### Out of scope
[FACT] UI design; API endpoints; database schema; notification delivery; final message copywriting; LLM generation; coach-marketplace behavior; Garmin/FIT parsing; training-plan generation; automatic athlete decisions; production implementation.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Decision Support Model, Understanding Profile Model, CRM 001, Evidence Model, Domain Modeling index):

1. `DecisionSupportCase` is an **aggregate root**.
2. Aurora owns **support integrity, not `AthleteDecision`**.
3. **Recommendation requires complete traceability.**
4. **Warning requires a risk basis** and must point **toward caution**.
5. Voice **must not exceed the safe voice ceiling** from `UnderstandingAssessment`.
6. **Strong claim evidence does not automatically permit strong voice.**
7. Traceability is **verified, not authored** by `DecisionSupportCase`.
8. **Missing traceability degrades voice** or forces `Inquiry`/`Withholding`.
9. **Purpose must constrain support.**
10. **Risk can raise urgency only toward caution**, never toward stronger recommendation.
11. **Agency must be preserved** in every output.
12. **`Inquiry` is not a `VoiceMode`.**
13. **`Withholding` (silence) is a valid, auditable output.**
14. **`AthleteDecision` is referenced only after the athlete acts**; never owned by `DecisionSupportCase`.
15. **Decision quality is not judged by outcome.**
16. **No command language.**
17. **No shame language.**
18. **No recommendation if gates fail.**

[ASSUMPTION] The defining constraints: **3, 5, 6, 10, 11, 12, 16–18** — together they make "a correct command" structurally impossible and keep silence/asking first-class.

---

## 5. Key Concepts (behavioral definitions)

### 5.1 DecisionOpportunity
[DECISION] A **domain event / candidate moment** where support *may* be useful. **Not created for every workout** — only when there is a **non-obvious and consequential** choice, uncertainty, risk, or purpose-relevant fork.

**Examples:** continue vs. reduce intensity · rest vs. train · repeat load vs. change stimulus · ask the athlete for missing context · warn about a risk pattern · reflect on a meaningful pattern without advising.

### 5.2 DecisionSupportCase *(aggregate root)*
[DECISION] The guardian of the integrity of one unit of athlete-facing support.

**It includes:** opportunity reference; relevant hypothesis/reasoning references; the relevant `UnderstandingAssessment`; purpose reference; risk assessment; the traceability-verification result; gate results; the selected terminal output; the selected `VoiceMode` (if applicable); degradation reasons; the agency check; an audit trail.

**It must NOT include:** `AthleteDecision` as owned state; raw observations; raw signals; raw `EvidenceCase`s as owned entities; UI copy as source of truth; LLM-generated advice as authority; any command.

[FACT] (CRM 001 / Decision Support Model) The case **does not author claims** — it acts only over already-traced reasoning and an already-computed understanding assessment. It selects a voice or chooses not to speak; it never invents the material it speaks about.

### 5.3 Terminal Outputs
[DECISION] Exactly **three** terminal output categories, all **auditable**:
1. **`DecisionSupport`** — may use a `VoiceMode`.
2. **`Inquiry`** — asks for needed athlete input; **not a `VoiceMode`** (a different axis: acquiring input, not asserting).
3. **`Withholding`** — responsible silence or refusal to assert, with a recorded reason.

### 5.4 VoiceMode
[DECISION] The accepted ladder: **`Silence` < `Reflection` < `Framing` < `Warning` ≈ `Recommendation`.**
- **`Silence`** — the lowest mode; realized as `Withholding`.
- **`Reflection`** — reflects observed/reasoned information without strong interpretation.
- **`Framing`** — offers a cautious interpretation frame.
- **`Warning`** — points toward caution because of risk.
- **`Recommendation`** — proposes an action while preserving agency.

[FACT] **`Warning` and `Recommendation` are not ordered by persuasion** — they are different *high-responsibility* modes (one flags danger, one proposes action). **`Inquiry` is not a `VoiceMode`.**

[FACT] **`SafeVoiceCeiling` (from `understanding`) is not `VoiceMode`.** The ceiling (`none`/`tentative`/`qualified`/`confident`) is the *maximum permitted assertiveness*; `VoiceSelectionPolicy` maps within that ceiling to a concrete `VoiceMode`. The mapping is part of this slice.

### 5.5 VoiceSelectionPolicy
[DECISION] Chooses the **maximum responsible voice, not the most persuasive**. It considers: evidence adequacy, traceability completeness, the understanding safe voice ceiling, purpose alignment, risk, agency.

[FACT] It **may degrade voice**, **may force `Inquiry`**, **may force `Withholding`**, and **must not** choose a stronger voice because claim confidence is high.

### 5.6 Gates
[DECISION] Each gate is a policy whose result the `VoiceSelectionPolicy` consults; a gate's shortfall *constrains* the output (degrade / Inquiry / Withholding), it does not silently pass.

- **`EvidenceGate`** — is the reasoning claim suitable for support? May **pass / limit / fail / require inquiry**.
- **`UnderstandingGate`** — does the `UnderstandingAssessment` permit the requested voice? **Enforces the safe voice ceiling.**
- **`PurposeGate`** — is support aligned with the declared athlete purpose? Missing/ambiguous purpose **may force `Inquiry` or `Withholding`**.
- **`RiskGate`** — checks safety, injury, overtraining, psychological, trust, and adaptation-waste risk. Risk **may escalate toward `Warning` only when caution is required**; it **must not escalate toward `Recommendation`**.
- **`AgencyGate`** — does the output preserve athlete decision ownership? **Rejects commands, shame, coercion, and language that hides uncertainty.**
- **`TraceabilityVerification`** — can the support be traced back through reasoning to signal and observation? **Verified, not invented.** **Recommendation requires complete traceability**; lower voices may allow **partial traceability only if explicitly labeled**.

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Open DecisionSupportCase from a DecisionOpportunity
- **AC1.1** — *Given* a consequential, non-obvious moment, *when* a `DecisionSupportCase` opens, *then* the opportunity is explicit, the purpose reference is considered, the traceability requirement is known, and **no terminal output exists until the gates run**.

### UC2 — Produce Reflection
- **AC2.1** — *Given* evidence exists but understanding or traceability does not permit a stronger voice, *when* the case resolves, *then* `DecisionSupport` is produced with `VoiceMode = Reflection`, reflecting what is known **without overinterpreting**, uncertainty visible, agency preserved.

### UC3 — Produce Framing
- **AC3.1** — *Given* evidence and understanding permit cautious interpretation, *when* resolved, *then* `DecisionSupport` with `VoiceMode = Framing` explains a possible frame, **does not command**, and **does not imply certainty**.

### UC4 — Produce Warning
- **AC4.1** — *Given* `RiskGate` indicates a safety concern, *when* resolved, *then* `Warning` may be selected, pointing **toward caution**, with an **explicit risk basis**, **without becoming a command**, and **without requiring recommendation-level certainty**.

### UC5 — Produce Recommendation
- **AC5.1** — *Given* **all gates permit**, *when* `Recommendation` is selected, *then* **complete traceability is verified**, the **safe voice ceiling permits Recommendation**, **purpose alignment is explicit**, **risk is assessed**, **agency is preserved**, and the output is **phrased as support, not command**.

### UC6 — Force Inquiry
- **AC6.1** — *Given* needed context is missing, *when* resolved, *then* `Inquiry` is produced stating **what input is needed**, **is not a `VoiceMode`**, and **makes no assertion beyond what is justified**.

### UC7 — Withhold
- **AC7.1** — *Given* speaking would not be responsible, *when* resolved, *then* `Withholding` is produced with an **auditable reason**, silence is **not treated as failure**, and **no unsupported claim is emitted**.

### UC8 — Degrade voice
- **AC8.1** — *Given* a stronger voice was considered but a gate limits it, *when* resolved, *then* voice is **degraded**, the **degradation reason is recorded**, the output **does not exceed the weakest relevant gate**, and **claim strength alone cannot override the gate**.

### UC9 — Preserve agency
- **AC9.1** — *Given* any output, *when* inspected, *then* it **does not command**, **does not shame**, **preserves athlete choice**, and **surfaces uncertainty** where relevant.

### UC10 — Record AthleteDecision reference later
- **AC10.1** — *Given* the athlete acts after support, *when* an `AthleteDecision` is recorded later, *then* the `DecisionSupportCase` **references but does not own** it, the **outcome does not retroactively define whether support was good**, and **`SupportQuality` is about the integrity of support, not the outcome**.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: recommend without complete traceability; recommend above the understanding safe voice ceiling; **derive voice directly from claim confidence**; treat `Warning` as a command; treat `Recommendation` as the athlete's decision; create an `AthleteDecision` inside `DecisionSupportCase`; hide uncertainty; hide gate failures; hide degradation reasons; use missing purpose as permission to recommend anyway; treat `Withholding` as failure; treat `Inquiry` as a `VoiceMode`; let risk escalate toward stronger `Recommendation`; use command language; use shame language; judge athlete decision quality by outcome; generate UI copy as the source of domain truth; use LLM text as authority.

[DECISION] These are **testable negative requirements** (§8).

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- opening a `DecisionSupportCase` (no output before gates run);
- each gate (`Evidence`/`Understanding`/`Purpose`/`Risk`/`Agency`/`TraceabilityVerification`);
- `Recommendation` requires **complete traceability**;
- voice **does not exceed** the safe voice ceiling;
- **risk can force a cautionary `Warning`** but **not a stronger `Recommendation`**;
- **`Inquiry`** when context is missing; **`Withholding`** when speaking is irresponsible;
- **voice degradation** with a recorded reason;
- agency preserved; `Inquiry` is not a `VoiceMode`; `AthleteDecision` referenced but not owned; `SupportQuality` is not outcome quality.

**Negative (must prove absence):**
- **claim confidence cannot override** the `UnderstandingGate` (high confidence + Thin understanding ⇒ voice still capped).
- **no `Recommendation` without complete traceability**; **none above the ceiling**; **none if any gate fails**.
- **no command language; no shame language**; uncertainty never hidden; gate failures/degradation never hidden.
- **risk never escalates toward `Recommendation`**; **`Inquiry` never typed as a `VoiceMode`**; **`AthleteDecision` never owned**.
- no UI/API/DB/LLM/training-plan artifact created.

**Dependency-boundary:**
- `decision-support` **may depend on** `reasoning`, `understanding`, and athlete context.
- `reasoning`, `understanding`, `observation` **must NOT depend on** `decision-support` (re-checked over the import graph).

[ASSUMPTION] The negative + boundary tests are the contract that *speaking is gated, not derived, and the decision stays the athlete's*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Implementation 004

[FACT] This slice **builds on, and does not change,** Implementation 004:
- `UnderstandingAssessment` provides a **safe voice ceiling**; **`SafeVoiceCeiling` is not a `VoiceMode`** — this slice maps within it.
- `DecisionSupportCase` **consumes** the assessment but **selects** the final output.
- **Staleness and fragility constrain voice** (they already lower the ceiling in `understanding`).
- **`understanding` does not know about `decision-support`** (`understanding ⇏ decision-support`).
- Decision support **must preserve athlete agency**.

[DECISION] No edits to Spec 004 files or to the `understanding`/`reasoning`/`observation` source. The `decision-support` module is **new and additive**; it imports the `reasoning`, `understanding`, and athlete-context surfaces read-only.

---

## 10. Out-of-Scope Follow-Up Specs

[ASSUMPTION]
- **Spec 006 — First End-to-End Responsible Reflection** (the thinnest full path: observation → … → a single Reflection).
- **Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation.**
- **Spec 008 — Projection Refresh and Staleness Strategy.**
- **Spec 009 — AthleteDecision Feedback Loop.**

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- Exact representation of `TraceabilityVerification` (the chain shape it walks).
- Exact language model for command/shame rejection (rule-based vs. lexical).
- Exact `RiskAssessment` taxonomy.
- Exact purpose-alignment representation.
- How athlete context is provided technically.
- Whether `DecisionOpportunity` is an event or a value object in implementation.
- Whether terminal outputs are entities or value objects.
- How `SupportQuality` is represented.
- How to reference `AthleteDecision` later.
- Whether `Recommendation` and `Warning` need separate structures.
- How much voice selection should be compile-time vs. runtime enforced.
- First concrete `DecisionOpportunity` worth implementing.

[ASSUMPTION] None block the behavioral spec: Aurora can open a case, run gates, select the maximum responsible voice (or ask, or withhold), and keep the decision with the athlete — regardless of how the above resolve.

---

## 12. Success Criterion

> **"How does Aurora decide how strongly it may speak — or whether it must stay silent — without taking ownership of the athlete's decision?"**

[ASSUMPTION] Answerable from this spec: a `DecisionSupportCase` opens from a genuine `DecisionOpportunity` and produces **no output until its gates run**. The `VoiceSelectionPolicy` selects the **maximum responsible voice** — the minimum of what evidence, complete traceability, the understanding **safe voice ceiling**, purpose alignment, and agency permit — with **risk able to raise only toward a cautionary `Warning`, never toward a stronger `Recommendation`**. **Claim confidence never overrides the understanding ceiling.** If a gate falls short, the voice **degrades** (reason recorded), or the case produces an **`Inquiry`** (when only the athlete holds the missing input) or a **`Withholding`** (recorded silence). Every output **preserves agency** — no command, no shame, uncertainty visible — and the **`AthleteDecision` is referenced only after the fact, never owned**, with `SupportQuality` judged by reasoning integrity, not outcome. Aurora speaks only when it can show speaking is more responsible than silence — a correct command is still a command, and the case is structurally forbidden from issuing one.

---

## Known Risks

[ASSUMPTION]
- **Risk:** voice gets derived from claim strength (the natural, tempting path). **Defense:** invariant 6 + `UnderstandingGate` cap + a negative test (high confidence + Thin understanding ⇒ capped).
- **Risk:** `RiskGate` is used to justify a strong `Recommendation`. **Defense:** invariant 10 — risk may only raise toward `Warning`/caution; negative test.
- **Risk:** `Withholding`/`Inquiry` treated as failure or as a voice. **Defense:** invariants 12–13; both first-class, auditable; `Inquiry` on a separate axis.
- **Risk:** the case quietly owns the decision or judges it by outcome. **Defense:** invariants 2, 14, 15 — reference-only, `SupportQuality` ≠ outcome.
- **Risk:** `decision-support` is reached by an upstream module. **Defense:** dependency-boundary tests (`reasoning`/`understanding`/`observation ⇏ decision-support`).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fifth Specification and the final reasoning-core slice. It defines the behavioral contract for decision support and voice selection; it defers the technical spec, persistence, delivery, and all generation/UI to later specs.*

*Inputs: [Spec 004](./004-understanding-update.md) · [Tech Spec 004A](./004-understanding-update-tech.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
