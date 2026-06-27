# Spec 013 — Manual Input Adapter

> Aurora's first real **"data in"** boundary: a manual ingestion adapter that turns manually supplied athlete/training information into a **faithful `ObservationSet`** — preserving provenance, source, verbatim words, missing data, and quality — and **refuses** what it cannot represent. It records *source material*, never *meaning*: it detects no `Signal`, infers no state, and produces no advice.
>
> Behavioral specification. Not implementation; no UI; no API; no LLM; no external integration; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no UI/API/LLM) |
| **Slice** | `ManualInputSubmission → adapter (validate / normalize / faithfully map) → ObservationSet (accepted / partially-accepted / rejected) → persist via port (+ optional ObservationSetRecorded)` |
| **Builds on** | Spec/Impl 001 (ObservationSet intake) · 002 (Signal boundary) · 009 (AthleteDecision feedback) · 010 (repositories) · 011 (event records) · 012 (reprojection harness) |
| **Produces (behavior)** | a `ManualInputAdapter` boundary + `ManualInputSubmission`/`IngestionOutcome`/`Rejection`/`Quality`/`Normalization`/`AdapterProvenance`; faithful-recording-vs-interpretation rules; the test contract |
| **Explicitly does not produce** | UI/forms, API/endpoints, auth, DB/schema, FIT/wearable import, LLM extraction, semantic interpretation, Signal/Evidence/Hypothesis/Understanding/DecisionSupport, recommendations, scheduler, event bus |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict submission/outcome shapes, where the adapter lives, how it reuses `recordObservationSet` + `ObservationSetRepository`, the rejection catalog) follows separately as **013A**. Implementation does not begin from this document, and **no UI/API/LLM/storage technology is chosen here**.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora accept manually supplied athlete/training information and persist it as faithful `ObservationSet`s without converting input into meaning, inference, coaching output, or recommendations?*

[FACT] Through Implementation 012 Aurora can reason, persist, record, and recompute — but every proof has run on a **synthetic fixture**. This slice adds the first **real ingestion boundary**: a human types what happened; the adapter records it **faithfully** as observations and stops. It is the narrowest possible "data in" — manual, in-process, no transport — chosen so the ingestion *discipline* (record, don't interpret) is proven before any UI/API/parser is built on top of it.

[FACT] The danger this slice guards is the oldest one in the model — **observation becoming meaning** (Boundary Map failure #2) — now at the moment data *enters*. The adapter is a boundary **into `observation`**; it is **not** reasoning, **not** UI, **not** API, **not** LLM parsing, **not** a coaching agent.

---

## 2. Core Principle

[FACT] **Manual input is source material. It is not meaning.**

[FACT] The adapter **may**: normalize format, validate required fields, record provenance/source/uncertainty/quality, represent missing data explicitly, and reject malformed or unrepresentable input.

[FACT] The adapter **must not infer**: fatigue, readiness, adaptation, capacity, intent, correctness, impact, risk, athlete identity, or a training recommendation.

[DECISION] The **only** valid output is an **ingestion outcome**:
- **accepted** as an `ObservationSet`,
- **partially-accepted** with missing/ambiguous data represented (and limitations reported),
- **rejected** with explicit reasons and **no domain mutation**.

[ASSUMPTION] The guiding sentence: *the adapter is a faithful scribe, not an interpreter — it writes down what was reported, with its provenance and its uncertainty, and it refuses what it cannot write down faithfully.* If the adapter ever "understands" the input, it is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the manual input boundary behavior; manually supplied training/session notes, subjective reports, and missing data; an optional manually-reported athlete decision; adapter provenance (`source: "manual"`); source/reporter information; input validation; **meaning-neutral normalization**; quality/uncertainty labeling of the *input*; partial acceptance; rejection; persistence through the existing **`ObservationSetRepository`** (reusing the `recordObservationSet` coordinator); an **optional** append-only `ObservationSetRecorded` event; the adapter's outcome shape; and the negative constraints preventing reasoning shortcuts.

### Non-Scope
[FACT] UI forms; API endpoints; authentication; database schema; production persistence backend; file-upload parsing; Garmin/FIT import; wearable integration; LLM extraction; natural-language semantic interpretation; automatic signal detection; automatic hypothesis creation; automatic understanding update; automatic decision support; recommendations; training-plan generation; notifications; background jobs; scheduler; event bus.

[DECISION] **No UI/API/LLM/storage technology is chosen.** The adapter is an in-process boundary callable from a test/harness; *how* input is collected or submitted later is explicitly future work.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The adapter must satisfy **all**:

1. Manual input is **not** `Signal`.
2. Manual input is **not** `Evidence`.
3. Manual input is **not** `Hypothesis`.
4. Manual input is **not** `Understanding`.
5. Manual input is **not** `DecisionSupport`.
6. Manual input is **not** an `AthleteDecision` **unless explicitly reported as such**.
7. The adapter **creates or rejects an `ObservationSet`; it does not reason.**
8. The adapter **preserves provenance.**
9. The adapter **preserves source/reporter.**
10. The adapter **preserves uncertainty/quality.**
11. The adapter **represents missing data explicitly** when accepted.
12. The adapter **rejects input it cannot faithfully represent.**
13. The adapter **does not silently "fix"** ambiguous meaning.
14. The adapter **does not infer** athlete state/capacity/readiness.
15. The adapter **does not overwrite `Purpose`.**
16. The adapter **does not create or mutate `UnderstandingProfile`.**
17. The adapter **does not create a `DecisionSupportCase`.**
18. The adapter **does not create recommendations.**
19. The adapter **does not use event records as commands.**
20. The adapter **does not bypass `ObservationSetRepository`.**

[ASSUMPTION] The *defining* invariants are **1, 7, 12, 13, 14** — together they make "the adapter quietly interpreted the input (detected a signal, inferred a state, fixed an ambiguity, or smuggled inference as fact)" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 ManualInputSubmission
[DECISION] The **raw manually supplied input** entering Aurora. It may include: an **athlete reference**, a **submission time**, a **reported occurrence time** (the occasion), a **reporter/source**, a **session label/context**, **raw text**, **structured fields**, **subjective statements**, **missing/unknown fields**, **external constraints**, and optional relations to **purpose**, an **athlete decision**, or a **previous support case**.
- It **must not be treated as interpreted truth** — it is a report, faithfully recorded, with its own fallibility.

### 5.2 ManualInputAdapter
[DECISION] The boundary that transforms a `ManualInputSubmission` into a `ManualInputIngestionOutcome`. It **may**: validate required fields; normalize timestamps/units/labels (meaning-neutral, §5.6); preserve raw wording; map **clearly reported** statements into observation forms (`measured`/`subjective`/`missing-data` — the existing `RawObservationInput` kinds); create explicit missing-data observations; assign **input** quality/uncertainty; and return rejection reasons. It **must not** infer signals, impact, readiness, fatigue, purpose, compliance, or support correctness.
- **Decision — the adapter reuses, never reimplements, intake:** it builds the existing `RawObservationInput`s and calls the existing `recordObservationSet` coordinator, then persists via `ObservationSetRepository`. *Why:* the intake invariants (immutability, provenance/quality required, no meaning field) already live in `observation`; the adapter must not duplicate or weaken them. *Consequence:* the adapter is thin glue around a proven intake. *Reversal:* if manual input needs an observation shape `observation` doesn't expose, add it **in `observation`** (additive), never inline in the adapter.

### 5.3 ManualInputIngestionOutcome
[DECISION] The adapter's result. Allowed: **`accepted`** · **`partially-accepted`** · **`rejected`**.
- `accepted`/`partially-accepted` include an `ObservationSet` (or `ObservationSetRef`) and, for partial, the **limitations** for what was not represented.
- `rejected` includes **explicit reasons** and causes **no domain mutation** (nothing persisted, no event appended).

### 5.4 ManualInputRejection
[DECISION] A **transparent refusal** to record input as observation because it cannot be faithfully represented. Examples: missing athlete reference; impossible/contradictory timestamp; contradictory required fields; unsupported input kind; an ambiguous report with **no safe representation**; malformed source/provenance; or **input attempting to smuggle inference as fact** (e.g. a field asserting "fatigued: true" as a measured datum). A rejection is auditable, not an error swallowed.

### 5.5 ManualInputQuality
[DECISION] A quality/uncertainty assessment **of the input as source material — not of the athlete**. Examples: `complete`, `partial`, `ambiguous`, `conflicting`, `low-confidence`, `unverifiable`, `source-limited`. It maps onto the existing `ObservationQuality` carried by every observation.
- **Quality must constrain later interpretation but must never become meaning** — it says *how trustworthy the record is*, never *what it means*.

### 5.6 Normalization
[DECISION] **Mechanical, meaning-neutral** transformation. **Allowed:** timestamp parsing; unit normalization **only when explicit**; trimming/structuring raw reported text (while **preserving** the raw form); mapping known field names to observation fields; keeping the raw input alongside the normalized form when relevant. **Forbidden:** semantic interpretation; causal inference; coaching judgment; readiness/fatigue/impact labels; "correcting" the athlete's intent.

### 5.7 AdapterProvenance
[DECISION] Provenance (`source: "manual"`) recording: **who/what submitted** the input, **when** it was submitted (and the reported occurrence time), **what original input** was used, **how** it was normalized, and **what limitations** exist. It reuses the existing `Provenance` (`source`, `captureTime`, `recordingTime`, `reference`); the reference handle ties the observation back to the submission.

---

## 6. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). **Negative criteria are defining.**

### UC1 — Accept a simple subjective session report
- **AC1.1** — *Given* an athlete reports *"I felt heavy in today's session"*, *when* the adapter ingests it, *then* Aurora records a **`SubjectiveObservation`** inside an `ObservationSet` with **raw words**, source, provenance, and quality — and **no** `Signal`/`Evidence`/`Hypothesis`/`Understanding` is created.

### UC2 — Accept missing data explicitly
- **AC2.1** — *Given* a report missing duration or intensity, *when* the report is still faithfully recordable, *then* the `ObservationSet` contains explicit **missing-data observations** rather than invented values.

### UC3 — Partial acceptance
- **AC3.1** — *Given* a submission with some valid and some ambiguous fields, *when* the valid parts are faithfully representable, *then* the adapter returns **`partially-accepted`**, records **only** the faithful observations, and **reports limitations** for the ambiguous parts (never inferring them).

### UC4 — Reject unrepresentable input
- **AC4.1** — *Given* a submission that cannot be associated with an athlete or an occurrence time, *when* ingestion is attempted, *then* the adapter **rejects** it with explicit reasons and creates **no `ObservationSet`**.

### UC5 — Preserve raw wording
- **AC5.1** — *Given* a subjective statement, *when* accepted, *then* the **raw words are preserved** (verbatim), never replaced by a generated summary.

### UC6 — Do not infer readiness/fatigue
- **AC6.1** — *Given* an athlete writes *"I felt exhausted"*, *when* the adapter records it, *then* it records a **subjective report** and creates **no** readiness/fatigue state and **no `Signal`**.

### UC7 — Athlete decision report
- **AC7.1** — *Given* the athlete manually reports what they chose after support, *when* the adapter records it, *then* the report may become an **athlete-decision-related observation** or route to the existing **AthleteDecision** slice (Impl 009) — but it **must not** become compliance scoring or outcome validation.

### UC8 — Optional event record
- **AC8.1** — *Given* an `ObservationSet` is accepted and persisted, *when* event recording is available, *then* an **`ObservationSetRecorded`** event **may** be appended as a **ref-only** occurrence record — and it **must not** execute downstream work.

### UC9 — Persist through the repository port
- **AC9.1** — *Given* an accepted `ObservationSet`, *when* the adapter persists it, *then* it uses **`ObservationSetRepository`** and does not bypass aggregate invariants.

### UC10 — No reasoning side effects
- **AC10.1** — *Given* any ingestion outcome, *when* ingestion completes, *then* **no** `Signal`, `EvidenceCase`, `Hypothesis`, `UnderstandingProfile` update, `DecisionSupportCase`, `TerminalOutput`, recommendation, or projection refresh is created by the adapter.

---

## 7. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given valid manual subjective input, when ingested, then an `ObservationSet` is created with **provenance/source/quality**.
- Given missing but representable data, when ingested, then missing data is **recorded explicitly**.
- Given ambiguous fields, when partially accepted, then ambiguous pieces are **reported as limitations**, not inferred.
- Given unrepresentable input, when rejected, then **no `ObservationSet` is saved**.
- Given raw subjective words, when accepted, then **raw wording is preserved**.
- Given athlete-reported exhaustion, when accepted, then **no fatigue/readiness/impact meaning** is created.
- Given accepted input, when persisted, then it goes through **`ObservationSetRepository`**.
- Given event recording is used, when `ObservationSetRecorded` is appended, then payload is **ref-only** and **no downstream command executes**.
- Given any ingestion, when complete, then **no Signal/Evidence/Hypothesis/Understanding/DecisionSupport** is produced.
- Given this slice is implemented later, then **no UI/API/LLM/external integration/DB/schema/scheduler/event bus** is created.

---

## 8. Explicit Forbidden Behaviors

[FACT] This spec forbids: input-as-`Signal`; input-as-`Evidence`; input-as-`Hypothesis`; input-as-`Understanding`; input-as-recommendation; the adapter creating `DecisionSupport`; creating a `TerminalOutput`; updating `UnderstandingProfile`; detecting `Signal`s; attaching `Evidence`; inferring fatigue/readiness/impact/capacity; overwriting `Purpose`; scoring compliance; validating support correctness from outcome; using LLM extraction; silently summarizing subjective words; inventing missing values; bypassing `ObservationSetRepository`; using event records as commands; and creating UI/API/DB/event-bus/scheduler.

[DECISION] These are **testable negative requirements** (§9).

---

## 9. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative + boundary tests are defining.**

**Positive:**
- valid subjective input creates an `ObservationSet` (verbatim words; provenance/source/quality preserved);
- missing data represented explicitly;
- partial acceptance records only the faithful fields + reports limitations;
- rejection saves nothing (no persisted set, no event);
- persistence goes through `ObservationSetRepository`;
- an optional `ObservationSetRecorded` event is **ref-only** and inert.

**Negative (must prove absence):**
- **no** `Signal`/`EvidenceCase`/`Hypothesis`/`UnderstandingProfile`-update/`DecisionSupportCase`/`TerminalOutput`/recommendation/projection-refresh side effect;
- **no** inferred fatigue/readiness/impact/capacity field on any observation;
- **no** `Purpose` overwrite; **no** `UnderstandingProfile` create/mutate;
- **no** compliance / outcome-correctness scoring (UC7 routes to the athlete-decision slice without valence);
- **no** invented missing values; **no** silent summarization of subjective words;
- **no** LLM/API/UI/DB/event-bus/scheduler file or token (structural guard).

**Dependency-boundary:**
- the adapter imports only `observation` (+ optionally `event-recording`, `athlete` for UC7) and `shared-kernel`; it **never** imports `reasoning`/`understanding`/`decision-support`; upstream→downstream boundaries stay green;
- **all 295 Impl 001–012 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *the adapter records source material and never interprets it*. If they cannot be written/passed, the adapter design is wrong.

---

## 10. Relationship To Existing Architecture

[FACT] This spec builds on, without altering, the existing boundaries:
- **Spec/Impl 001 (ObservationSet intake)** — the adapter **reuses `recordObservationSet`** + the observation value objects; it is a *source of inputs* to intake, not a new intake.
- **Spec/Impl 002 (Signal detection)** — **stays separate**: the adapter never calls `detectSignals` and never produces a `Signal`.
- **Spec/Impl 009 (AthleteDecision feedback)** — a manually-reported decision may route to the existing `AthleteDecisionRecord` / re-enter as a `SubjectiveObservation`, with **no compliance/outcome grading**.
- **Spec/Impl 010 (repositories)** — accepted sets persist via `ObservationSetRepository` (validated `reconstitute`; no bypass).
- **Spec/Impl 011 (event records)** — an optional `ObservationSetRecorded` is a **ref-only occurrence record**, not a command.
- **Spec/Impl 012 (reprojection harness)** — reprojection may **later** check derived views; it is **never** a side effect of ingestion.

[DECISION] The boundary picture stays intact: **the Manual Input Adapter writes source material only**; `observation` remains the first domain boundary; `Signal` detection, `reasoning`, `understanding`, and `decision-support` stay separate; event records record occurrence, not command execution; reprojection checks derived views, never triggered by ingestion.

---

## 11. Open Questions (do not block this spec)

[QUESTION] where the adapter lives technically; the exact input payload shape; whether manual input supports structured fields only or raw text **plus** fields; whether athlete-decision reports route through `AthleteDecisionRecord` or observation first; how a UI will collect input later; how an API will submit it later; how authentication/source identity will work; whether LLM extraction is ever allowed **behind a separate boundary**; how units and time zones are normalized; how duplicate submissions are detected; how privacy/deletion applies to manual input.

[ASSUMPTION] None block this slice: Aurora can accept a manual submission and record it faithfully as an `ObservationSet` (or reject it) regardless of how these resolve. Technical-implementation questions are deferred to 013A.

---

## 12. Success Criterion

> **"Can Aurora accept manually supplied athlete/training input as faithful `ObservationSet`s without interpreting it as meaning or triggering reasoning?"**

[ASSUMPTION] Answerable from this spec: a **`ManualInputAdapter`** turns a **`ManualInputSubmission`** into a **`ManualInputIngestionOutcome`** (`accepted`/`partially-accepted`/`rejected`) by **validating**, **meaning-neutrally normalizing**, and **faithfully mapping** clear reports into the existing observation forms (verbatim subjective `words`, explicit `missing-data`, `measured`), **preserving** provenance/source/quality, **representing** missing/ambiguous data explicitly (or reporting it as a limitation), and **rejecting** what it cannot faithfully represent — persisting accepted sets through **`ObservationSetRepository`** and optionally appending a **ref-only `ObservationSetRecorded`** event. It **infers nothing** (no fatigue/readiness/impact/capacity/intent/correctness), **detects no `Signal`**, **creates no `Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`/recommendation**, **overwrites no `Purpose`**, **scores no compliance**, **invents no missing value**, and **summarizes no subjective words** — and **no UI/API/LLM/external-integration/DB/schema/scheduler/event-bus** is chosen, with **all 295 existing tests green** — proving the first real "data in" is a *faithful scribe*, never an interpreter.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the adapter interprets (detects a signal / infers a state). **Defense:** invariants 1/7/14 + UC6/UC10 — it only builds observation forms and calls `recordObservationSet`; negative tests assert no `Signal`/state field.
- **Risk:** ambiguity is silently "fixed" or a value invented. **Defense:** invariants 11/13 + UC2/UC3 — missing data is explicit; ambiguity becomes a limitation or a rejection; negative test that no value is invented.
- **Risk:** raw words are summarized. **Defense:** invariant 10 + UC5 — verbatim `words` preserved; no LLM; negative test.
- **Risk:** a decision report becomes compliance/outcome grading. **Defense:** invariant 6 + UC7 — routes to the athlete-decision slice without valence; negative test for absence of any score.
- **Risk:** ingestion triggers downstream work (signal/understanding/refresh). **Defense:** invariant 7/19 + UC10 — the event is ref-only and inert; reprojection is never a side effect; negative test.
- **Risk:** persistence bypasses intake invariants. **Defense:** invariant 20 + UC9 — persist only via `ObservationSetRepository`; the adapter reuses `recordObservationSet`, never raw construction.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the thirteenth Specification and the first real ingestion boundary. It defines a manual input adapter that records source material faithfully as `ObservationSet`s — preserving provenance and uncertainty, representing missing data, rejecting the unrepresentable — and chooses no UI/API/LLM/storage technology, detects no signal, and infers no meaning. Manual input is source material, never meaning; the adapter is a scribe, never an interpreter.*

*Inputs: [Spec 001](./001-observation-set-intake.md) · [Spec 002](./002-signal-detection.md) · [Spec 009](./009-athlete-decision-feedback-loop.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
