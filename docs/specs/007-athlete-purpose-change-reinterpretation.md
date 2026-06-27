# Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation

> How Aurora responds when an athlete's declared purpose changes — constraining future interpretation, marking prior understanding stale or limited, and enabling explicit reinterpretation — **without rewriting history, over-trusting old understanding, or ever deciding the athlete's purpose**.
>
> Behavioral specification. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `Purpose (declared, versioned) → PurposeChanged → selective staleness in understanding + reinterpretation of prior reasoning → purpose-aware decision support` |
| **Modules touched (conceptually)** | a future **`athlete`** module (owns `Purpose`); read by `reasoning`, `understanding`, `decision-support` — none of which it imports |
| **Builds on** | Implementations 001–006 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md). Begins retiring the **purpose placeholder** in `decision-support`. |
| **Produces (behavior)** | versioned `Purpose`/`PurposeHistory`, a conceptual `PurposeChanged` event, selective understanding staleness, an explicit traceable reinterpretation outcome, purpose-aware gating |
| **Explicitly does not produce** | the full `athlete` module, UI, API, DB, LLM, automatic purpose inference, training-plan changes, or a rewrite of any prior reasoning |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape — whether `Purpose` ships before the full `Athlete` aggregate, how `PurposeVersion` is referenced, the reinterpretation surface) follows separately as 007A, as with 001A–006A. Implementation does not begin from this document.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/model/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

---

## 1. Summary & Central Question

[FACT] **Central question:** *How should Aurora respond when an athlete's declared purpose changes, without rewriting history, over-trusting old understanding, or letting decision-support ignore the new purpose?*

[FACT] Aurora's reasoning core is complete and reviewed, but `purpose` is still a placeholder fed into `decision-support` as a `PurposeContext` value. The model (Athlete Aggregate, Decisions 3–4) already says purpose is **owned by the athlete, versioned, append-only**, and that a purpose change **reinterprets past evidence**. This slice specifies that behavior — the first real Athlete/Purpose semantics — while keeping every boundary the Core Completion Review locked in.

[ASSUMPTION] **Guiding sentence:** *A purpose change moves the lens forward; it never repaints what was seen through the old one.* Past reasoning stays historically true as reasoning performed under an earlier purpose; future interpretation uses the current purpose; prior understanding may go stale, limited, or require explicit reinterpretation.

---

## 2. Core Principle

[FACT]
- **Purpose is not metadata.** It constrains interpretation (Foundation Principle 4: *purpose constrains interpretation*).
- When purpose changes, Aurora must **not pretend all prior reasoning is still equally valid**.
- But Aurora must **not rewrite the past**. Past reasoning remains true *as reasoning performed under an earlier purpose*.
- **Future interpretation uses the current purpose.** Prior understanding may become **stale**, **limited**, or **require reinterpretation**.
- **Aurora never decides the athlete's purpose** (Decision Model: the one decision Aurora must never make).

[ASSUMPTION] The asymmetry that makes this safe: a purpose change may only **lower** assertiveness or **open questions** — it can mark understanding stale, lower a ceiling, or force inquiry, but it can never *raise* a voice or *strengthen* a claim. Like staleness today, purpose change can only push Aurora toward caution.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] declared `Purpose`; versioned `PurposeHistory`; the conceptual `PurposeChanged` event; how a purpose change affects **future interpretation**, the **`UnderstandingProfile`** (selective staleness/limitation), and **`DecisionSupportCase` gates**; when prior hypotheses remain valid vs. become limited/stale; when **reinterpretation** is required and how it stays explicit and traceable; preserving historical traceability to the purpose version in force; avoiding rewrite of prior reasoning; keeping **declared purpose** distinct from **revealed behavior**.

### Non-Scope
[FACT] the full `athlete` module; UI for editing purpose; database schema; API endpoints; authentication; real Garmin/FIT import; LLM copy generation; training-plan generation; **automatic purpose inference**; replacing declared purpose with behavior; judging whether the athlete's purpose is good or bad.

[DECISION] **No existing module source is modified by this spec.** It defines behavior that a future slice implements, using the seams already present: the `purposeContext` placeholder in `decision-support`, the `markUnderstandingStale` path in `understanding` (whose `StaleReason` already includes `"purpose-change"`), and the `purposeGate` (which already forces inquiry on unknown/ambiguous purpose).

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Athlete Aggregate, Understanding Profile Model, Decision Support Model, and the Foundation):

1. **Purpose belongs to `Athlete`.**
2. **Purpose is versioned.**
3. **Purpose changes are append-only — never overwrite history.**
4. **Prior reasoning remains traceable to the purpose version under which it occurred.**
5. **Current purpose constrains future interpretation.**
6. **A purpose change may mark understanding dimensions stale or limited** (selectively).
7. **A purpose change does not automatically falsify hypotheses.**
8. **A purpose change may require reinterpretation of prior hypotheses.**
9. **Reinterpretation must be explicit and traceable.**
10. **Declared purpose and revealed behavior are not the same thing.**
11. **Aurora must not infer a new purpose from behavior without athlete confirmation.**
12. **DecisionSupport must not recommend without considering current purpose.**
13. **Missing or ambiguous purpose may force `Inquiry` or `Withholding`.**
14. **The athlete remains owner of purpose.**
15. **Aurora must not decide the athlete's purpose.**

[ASSUMPTION] The *defining* invariants are **3, 4, 7, 9, 11, 15** — together they make "Aurora quietly rewrote the past or chose a new purpose" structurally impossible: the past is append-only and version-tagged, reinterpretation is a *new, traceable* artifact rather than an edit, and a new purpose can only come from the athlete.

---

## 5. Key Concepts (behavioral definitions)

### 5.1 Purpose
[DECISION] A **declared orientation** that constrains how training meaning and decisions are interpreted.

**Examples:** prepare for a race · improve long-term durability · explore a new discipline · recover from injury · enjoy training without performance pressure · sustain consistency.

**Purpose includes:** a purpose **statement**; an **effective date/time**; a **version**; a **source** (e.g. athlete-declared); an optional **rationale**; and any **known uncertainty or ambiguity**.

**Purpose must NOT include:** inferred readiness; capacity; current state; a hidden system objective; a coach command. (It is *given*, never *inferred* — Athlete Aggregate, governing idea.)

### 5.2 PurposeHistory
[DECISION] An **append-only** history of declared purpose versions. It preserves: the prior purpose; the new purpose; the time of change; the source; the reason if known; and **what was known at the time** (so Aurora can read purpose *as of* any past moment). A change is a new `PurposeVersion`, never an overwrite (Athlete Aggregate, Decisions 3–4).

### 5.3 PurposeChanged
[DECISION] A **conceptual domain event** indicating the athlete's declared purpose changed.

**It may trigger:** selective stale-marking in the `UnderstandingProfile`; a lower `SafeVoiceCeiling` in affected dimensions; a reinterpretation queue/review; a decision-support `Inquiry`; a purpose-alignment review.

**It must NOT:** erase prior reasoning; automatically rewrite hypotheses; automatically infer athlete state; automatically generate a recommendation.

### 5.4 Purpose Reinterpretation
[DECISION] An **explicit, traceable** process that evaluates whether prior hypotheses, understanding dimensions, or decision-support assumptions remain valid under the new purpose.

**It may produce one of:** `unchanged` · `limited` · `stale` · `needs-new-hypothesis` · `needs-inquiry` · `not-relevant-under-current-purpose`.

[FACT] Reinterpretation is a **new artifact that references** the original hypothesis and the relevant purpose versions — it never edits the original. It is the explicit, recorded answer to "does this still hold now that the goal changed?", not a silent revision.

### 5.5 Declared vs Revealed Purpose
[DECISION] **Declared purpose** is what the athlete states. **Revealed behavior** may be *evidence* of tension, mismatch, or ambiguity. Revealed behavior must **not** silently replace declared purpose. Aurora **may ask** about the mismatch (an `Inquiry`, or a hypothesis *about* the mismatch); Aurora must **not decide** the purpose for the athlete. (Athlete Aggregate Decision 3: stated purpose is authoritative; divergence is surfaced, never substituted.)

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Declare initial Purpose
- **AC1.1** — *Given* an athlete declares a purpose, *when* it is recorded, *then* a `PurposeVersion` exists, future interpretation can reference it, and **no inference about state or capacity is created**.

### UC2 — Change Purpose
- **AC2.1** — *Given* an existing purpose, *when* the athlete changes it, *then* a **new version is appended**, the **prior version remains preserved and traceable**, a `PurposeChanged` event is produced conceptually, future reasoning uses the new purpose, and **prior reasoning remains tagged to the old purpose version**.

### UC3 — Mark understanding stale after PurposeChanged
- **AC3.1** — *Given* a purpose change that affects an understanding dimension, *when* understanding is reviewed, *then* the relevant `UnderstandingDimension` may be marked **stale or limited**, the **staleness reason references `PurposeChanged`**, the `SafeVoiceCeiling` may lower, and **prior understanding history remains preserved**.

### UC4 — Keep unaffected understanding
- **AC4.1** — *Given* a purpose change that does not affect a dimension, *when* understanding is reviewed, *then* that dimension **remains unchanged**, the reason is **explicit**, and **no global reset occurs**.

### UC5 — Reinterpret prior hypothesis under new purpose
- **AC5.1** — *Given* a prior hypothesis useful under the old purpose, *when* it is reinterpreted under the new purpose, *then* the hypothesis is **not rewritten**, the reinterpretation result **references the original hypothesis and the purpose versions**, the result is one of `unchanged`/`limited`/`stale`/`needs-new-hypothesis`/`needs-inquiry`/`not-relevant-under-current-purpose`, and **traceability is preserved**.

### UC6 — Purpose missing or ambiguous
- **AC6.1** — *Given* decision support needs purpose but the current purpose is missing or ambiguous, *when* the case resolves, *then* the **`PurposeGate` forces `Inquiry` or `Withholding`**, **no `Recommendation` is produced**, and Aurora **asks or waits rather than inventing a purpose**.

### UC7 — Revealed behavior conflicts with declared purpose
- **AC7.1** — *Given* athlete behavior inconsistent with the declared purpose, *when* Aurora detects the mismatch, *then* it **does not overwrite purpose**, it **may raise a question or flag ambiguity**, the behavior **may become evidence for a hypothesis about the mismatch**, and **the athlete must confirm** any purpose change.

### UC8 — Purpose change and DecisionSupport
- **AC8.1** — *Given* a `DecisionSupportCase` opened after a purpose change, *when* the gates run, *then* the **current purpose is considered**, **stale understanding constrains the voice**, a `Recommendation` **requires current-purpose alignment** (on top of the existing confident-ceiling + complete-trace requirement), and **agency is preserved**.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: overwrite purpose history; rewrite prior reasoning; treat old reasoning as if it used the new purpose; globally reset all understanding after any purpose change; silently infer purpose from behavior; replace declared purpose with revealed behavior; recommend without current-purpose alignment; treat missing purpose as permission to recommend; store inferred athlete state or capacity in `Athlete`; make Aurora the owner of the athlete's purpose; generate training-plan changes; add UI/API/DB/LLM behavior.

[DECISION] These are **testable negative requirements** (§8).

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- append-only `PurposeHistory` (a change appends; the prior version is still readable);
- the conceptual `PurposeChanged` event is produced on change;
- prior reasoning remains traceable to the **old** purpose version;
- current reasoning uses the **current** purpose;
- **selective** staleness — only affected dimensions are marked, with a reason referencing `PurposeChanged`;
- **no global reset** — unaffected dimensions are untouched, explicitly;
- reinterpretation results reference both the hypothesis and the purpose versions;
- `Inquiry`/`Withholding` when current purpose is missing/ambiguous;
- a `DecisionSupportCase` after a purpose change considers current purpose and lets stale understanding lower the voice.

**Negative (must prove absence):**
- declared purpose is **never overwritten by revealed behavior**;
- **no automatic purpose inference** (a new purpose requires athlete confirmation);
- prior hypotheses are **not rewritten or auto-falsified** by a purpose change;
- a purpose change **cannot raise** a voice or strengthen a claim;
- missing purpose **never** becomes permission to recommend;
- no inferred state/capacity is stored in `Athlete`;
- no UI/API/DB/LLM/training-plan artifact is created.

**Dependency-boundary:**
- a future `athlete` module is read by `reasoning`/`understanding`/`decision-support`; **`athlete` must not depend on `understanding`/`reasoning`/`decision-support`** (the given must not depend on the inferred — Boundary Map §2);
- `reasoning`/`understanding`/`observation` still **⇏** `decision-support`.

[ASSUMPTION] The negative + boundary tests are the contract that *purpose stays the athlete's, the past stays intact, and reinterpretation is explicit*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Existing Core

[FACT] This slice builds on, and does not change, Implementations 001–006:
- **`observation`** may capture an athlete self-report *about* purpose as a `SubjectiveObservation` (the existing intake path) — it never decides purpose.
- **`reasoning`** may reference the **purpose version** as context (a hypothesis was reasoned *under* a given purpose); it does not own purpose and is not rewritten by a change.
- **`understanding`** may become **stale/limited** when purpose changes — the existing `markUnderstandingStale` path already accepts a `"purpose-change"` reason, and staleness already lowers the `SafeVoiceCeiling`. This slice gives that path a real trigger.
- **`decision-support`** must use **current-purpose alignment** — the existing `PurposeGate` already forces inquiry on unknown/ambiguous purpose; the placeholder `PurposeContext` is the seam a real, versioned purpose snapshot will fill.
- **No existing module bypasses `Athlete`/`Purpose` once implemented** — purpose is read in (as a snapshot/value), never owned downstream.

[DECISION] No edits to 001–006 source. Purpose is introduced *additively*; the lower modules continue to receive purpose as passed-in input values (Boundary Map §2: athlete is a read-only leaf coordinated via the application layer, never imported by `observation`).

---

## 10. Open Questions (do not block this spec)

[QUESTION]
- the exact shape of the `athlete` module;
- whether `Purpose` ships **before** the full `Athlete` aggregate (a thin purpose-only slice);
- how purpose versions are **referenced by `Hypothesis`** (a version handle vs. a snapshot);
- **how deep** reinterpretation should go (all history vs. a bounded window — carried from CRM 001 / Athlete Aggregate Q6);
- whether reinterpretation is **synchronous or queued**;
- **how affected dimensions are determined** (which dimensions a given purpose change touches);
- how **purpose ambiguity** is represented;
- how **revealed behavior** should trigger an `Inquiry`;
- how purpose changes interact with the future **persistence/event surface**.

[ASSUMPTION] None block the behavioral spec: Aurora can record a versioned purpose, append a change, selectively stale affected understanding, reinterpret prior reasoning explicitly and traceably, and gate decision support on current purpose — regardless of how the above resolve. Technical-implementation questions are deferred to 007A.

---

## 11. Success Criterion

> **"How does Aurora preserve purpose as the athlete's declared context while allowing future interpretation to change when the athlete's purpose changes?"**

[ASSUMPTION] Answerable from this spec: an athlete declares a **versioned `Purpose`**; a change **appends a new version** and emits a conceptual `PurposeChanged`, leaving the prior version and all prior reasoning **intact and traceable to the purpose in force at the time**. The change may **selectively** mark affected understanding dimensions **stale/limited** (with a reason referencing `PurposeChanged`, lowering the `SafeVoiceCeiling`) while leaving unaffected dimensions untouched — **no global reset**. Prior hypotheses are **never rewritten or auto-falsified**; instead an **explicit, traceable reinterpretation** records whether each remains `unchanged`/`limited`/`stale`/`needs-new-hypothesis`/`needs-inquiry`/`not-relevant`. Decision support **gates on the current purpose** — missing/ambiguous purpose forces `Inquiry`/`Withholding`, a `Recommendation` requires current-purpose alignment, and stale understanding can only lower the voice. **Declared purpose is never replaced by revealed behavior, and Aurora never decides the purpose** — at most it asks. Future interpretation moves with the new purpose; the past stays exactly as it was reasoned.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a purpose change quietly rewrites or falsifies past hypotheses. **Defense:** invariants 3,4,7,9 — append-only history, version-tagged reasoning, reinterpretation as a *new* artifact; negative test that no prior hypothesis is mutated/auto-falsified.
- **Risk:** any purpose change triggers a global understanding reset. **Defense:** invariant 6 + UC4 — selective staleness only; a test that unaffected dimensions are untouched.
- **Risk:** revealed behavior silently becomes the new declared purpose. **Defense:** invariants 10,11,15 + UC7 — divergence is surfaced/asked, never substituted; the athlete confirms; negative test.
- **Risk:** missing purpose is treated as permission to recommend. **Defense:** invariant 13 + UC6 — `PurposeGate` forces `Inquiry`/`Withholding`; negative test (no Recommendation without current purpose).
- **Risk:** a purpose change is used to *raise* assertiveness. **Defense:** the safety asymmetry (§2) — purpose change can only lower voice / open questions; negative test.
- **Risk:** the given depends on the inferred (`athlete` imports `understanding`/`reasoning`). **Defense:** dependency-boundary test (`athlete ⇏ understanding/reasoning/decision-support`).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the seventh Specification and the first Athlete/Purpose behavior. It defines how a purpose change constrains future interpretation, selectively stales understanding, and triggers explicit reinterpretation — without rewriting history or deciding the athlete's purpose; it defers the `athlete` module shape, persistence, and all implementation to later specs.*

*Inputs: [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · Process: [spec-process.md](./spec-process.md)*
