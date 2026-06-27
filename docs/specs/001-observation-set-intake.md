# Spec 001 — ObservationSet Intake & Provenance

> How Aurora records what it observed without accidentally claiming what it means.
>
> Behavioral specification for the first implementation slice. Not implementation, not persistence, not API.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (per Engineering Playbook Guardian phase discipline) |
| **Slice** | First implementation slice — the trustworthy root of the reasoning chain |
| **Module** | `observation` (Technical Boundary Map §1) |
| **Produces** | `ObservationSet` aggregate + its value objects |
| **Explicitly produces nothing downstream** | no `Signal`, no `Hypothesis`, no `Evidence`, no inference |

[ASSUMPTION] This is a **behavioral/domain spec**, not a technical spec. Per the [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) and the Guardian's phase discipline, it defines *behavior, use cases, acceptance criteria, and validation strategy* — and defers persistence, API, schema, types, and framework to a later technical spec. It references the existing [`spec-process.md`](./spec-process.md) conventions (status header, ubiquitous-language discipline, acceptance-criteria-as-tests) but follows the mission's required structure.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from a domain/architecture decision already accepted. |
| **[DECISION]** | A specification commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block this spec. |

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora accept observations from different sources while preserving enough provenance, quality, time, and source information so that downstream reasoning can remain trustworthy?*

[ASSUMPTION] This slice builds **only the trustworthy root** of the reasoning chain. It is the foundation everything later rests on: per the Domain Modeling index, *the fastest way to poison every downstream recommendation is a conclusion masquerading as an observation.* This spec exists to make that impossible at intake — to record *what was observed* in a way that physically cannot encode *what it means*.

[FACT] The slice maps to the `observation` module (boundary map §1), whose protected invariants are exactly: *raw observation is never treated as meaning*, *provenance is never lost*, *signal ≠ evidence*. It owns the `ObservationSet` aggregate and stops there — it does not detect signals, create hypotheses, infer impact, or generate decision support.

---

## 2. Scope & Non-Scope

### In scope
[DECISION] Creating an `ObservationSet`; adding raw observations; preserving source and provenance; preserving observation quality; representing athlete self-report as `SubjectiveObservation`; representing missing expected data as `MissingDataObservation`; representing incomplete/suspicious observations; superseding an observation without overwriting history; structurally rejecting any attempt to treat an observation as meaning.

### Out of scope (this slice)
[FACT] Garmin/FIT parsing; signal detection; baseline calculation; hypothesis creation; evidence cases; impact assessment; understanding updates; decision support; persistence technology; API endpoints; UI; database schema; types; ML/statistical detection.

[ASSUMPTION] Anything that requires *interpreting* an observation is out of scope by definition — interpretation is the next slice (Signal Detection), and the boundary between them is the load-bearing seam this spec protects.

---

## 3. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve these (from Observation & Signal Model, Evidence Model, and the Domain Modeling index):

1. **Raw observation is never meaning.** No field, flag, or method may turn an observation into a claim about fatigue, readiness, impact, or quality-as-conclusion.
2. **Provenance is never lost.** Every observation carries source + time + how it arrived.
3. **Source and time are preserved** on every observation, always.
4. **Quality limitations travel downstream.** A quality concern is attached and never strippable.
5. **Observations are immutable; superseded, never overwritten.** A correction is a new observation that supersedes; the original remains.
6. **Athlete self-report is fallible but meaningful.** Preserved verbatim; neither auto-true nor dismissed.
7. **Missing data is representable** when its absence changes interpretation — without becoming evidence.
8. **An ObservationSet may be incomplete, but incompleteness is explicit.** A gap is never silent.
9. **No `Signal` is created in this slice.**
10. **No `Evidence` is created in this slice.**

[ASSUMPTION] Rules 1, 9, and 10 are the *defining* constraints — this slice's correctness is judged first by what it *refuses* to produce.

---

## 4. Ubiquitous Language (this slice)

[FACT] Terms used exactly as defined in the [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md):

- **ObservationSet** — aggregate; the consistency boundary for everything observed about one occasion; guards provenance, immutability, quality-carry, completeness.
- **Observation** — immutable, timestamped, sourced record that something was recorded/reported/detected; no meaning.
- **Provenance** — source + time + how it arrived; carried by every observation.
- **Source** — origin (device / athlete-report / coach-report / manual / imported-plan / competition-result / system-derived).
- **ObservationQuality** — quality-before-meaning (complete/partial/missing/inconsistent/corrupted/suspicious/stale/source-conflicted/context-missing); re-assessable; always travels.
- **SubjectiveObservation** — value subtype of Observation; self-report with the athlete's words preserved.
- **MissingDataObservation** — value subtype of Observation; expected-but-absent data.
- **Supersession** — a new observation replacing an earlier one in *relevance*, with the original retained and the reason recorded.

[FACT] **Occasion** = the grouping unit for one `ObservationSet` (typically a workout; also a report episode or a contextual capture). [QUESTION] Whether "occasion" or "provenance episode" is the right grouping key is carried forward (Observation & Signal Model reversal).

---

## 5. Actors

[ASSUMPTION] Conceptual actors only — no UI, no API.

| Actor | Role in this slice |
|---|---|
| **Athlete** | Source of `SubjectiveObservation`s (felt experience, pain, sleep, why they stopped). |
| **System importer** | A generic ingest path that hands Aurora raw recorded observations for an occasion. |
| **Future Garmin/FIT importer** | A *specialization* of system importer (out of scope to build; the model must not preclude it). |
| **Coach / manual reporter** | A source of manually-entered or coach-reported observations. |
| **Aurora application service** | The coordinator (boundary map §9) that creates the set and adds observations; it *coordinates, never reasons* — it assigns no meaning. |

---

## 6. Main Use Cases & Acceptance Criteria

[DECISION] Acceptance criteria in Given/When/Then; these become the test suite (§8).

### UC1 — Create ObservationSet from recorded workout-like input
A `System importer` hands Aurora a set of raw observations for one occasion.

**Acceptance criteria:**
- **AC1.1** — *Given* raw observations with source and timestamps, *when* Aurora creates an `ObservationSet`, *then* the set exists with its occasion identity, source, and time range preserved.
- **AC1.2** — *Given* each raw value (e.g., a heart-rate sample), *when* recorded, *then* it is stored as an `Observation` with `Provenance` and **no inferred meaning** (no fatigue/readiness/impact, no "hard"/"easy" label).
- **AC1.3** — *Given* the set, *when* inspected, *then* every observation's source and time are retrievable, and the set's **completeness status** is explicit (what was expected vs. present).
- **AC1.4** — *Given* any observation in the set, *when* its provenance is requested, *then* a traceable provenance reference resolves (the root that a future `TraceabilityChain` will reach).

### UC2 — Add athlete self-report
The `Athlete` reports something subjective ("I felt heavy", "my shoulder hurt", "I slept badly", "I stopped because something felt wrong").

**Acceptance criteria:**
- **AC2.1** — *Given* an athlete report, *when* recorded, *then* it becomes a `SubjectiveObservation` with the **original wording preserved verbatim**.
- **AC2.2** — *Given* the report, *when* recorded, *then* its source (`athlete-report`) and time are preserved.
- **AC2.3** — *Given* the report, *when* stored, *then* it is **not** marked true, confirmed, or factual (not unquestioned truth), **and not** discarded or down-ranked for being subjective (not noise).
- **AC2.4** — *Given* one report containing multiple statements ("shoulder hurt" + "slept badly"), *when* recorded, *then* it **may** yield multiple `SubjectiveObservation`s, each independently attributed.
- **AC2.5** — *Given* an `InquiryResponse` (a report answering a future `Inquiry`), *when* recorded, *then* it is a `SubjectiveObservation` that retains a link back to the prompting question. *(Inquiry itself is out of scope; only the linkage shape must not be precluded.)*

### UC3 — Represent missing expected data
Expected data is absent (no HR recorded, no sleep data, workout stopped early, missing report, no purpose declared).

**Acceptance criteria:**
- **AC3.1** — *Given* data expected for an occasion but absent, *when* the set is recorded, *then* a `MissingDataObservation` is **representable** marking what was expected and absent.
- **AC3.2** — *Given* a `MissingDataObservation`, *when* stored, *then* it does **not** become evidence and carries **no** inferred meaning (no "under-recovered", no "incomplete effort").
- **AC3.3** — *Given* missing data, *when* recorded, *then* it **may** raise the set's explicit uncertainty/incompleteness, *without* any downstream inference in this slice.
- **AC3.4** — *Given* data that is *absent because Aurora cannot even contextualize it* (e.g., no baseline exists yet), *when* encountered, *then* that is **not** a `MissingDataObservation` (which is *expected-and-absent*); it is left for later stages. *(Boundary clarity; this slice records only expected-and-absent.)*

### UC4 — Flag observation quality
Aurora identifies a quality limitation (partial, suspicious, inconsistent, corrupted, source-conflicted, stale, context-missing).

**Acceptance criteria:**
- **AC4.1** — *Given* an observation with a quality concern, *when* recorded, *then* an `ObservationQuality` status **and reason** are attached.
- **AC4.2** — *Given* a quality-flagged observation, *when* read by anything downstream, *then* the quality limitation **travels with it** and cannot be stripped.
- **AC4.3** — *Given* a high-quality observation, *when* stored, *then* it is **not** thereby treated as meaningful (quality ≠ relevance ≠ meaning).
- **AC4.4** — *Given* a low-quality observation, *when* stored, *then* it is **not** automatically discarded (held, flagged).
- **AC4.5** — *Given* two observations of the same fact from different sources that disagree, *when* recorded, *then* the **conflict is preserved** as `source-conflicted` quality and **not silently resolved** (no source auto-wins).

### UC5 — Supersede an observation
A later correction or amendment arrives for the same occasion.

**Acceptance criteria:**
- **AC5.1** — *Given* an existing observation and a later correction, *when* Aurora supersedes, *then* the **original observation remains** retrievable.
- **AC5.2** — *Given* a supersession, *when* applied, *then* the new observation is marked as superseding the original, **with a recorded reason**.
- **AC5.3** — *Given* a superseded observation, *when* the set's history is inspected "as of" the earlier time, *then* downstream traceability can still **explain what was known at the time** (no overwrite of history).
- **AC5.4** — *Given* any supersession, *when* applied, *then* **no observation is ever mutated in place** — supersession adds; it never edits.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: infer fatigue; infer readiness; infer impact; create signals; create hypotheses; create evidence; generate recommendations; overwrite observations; hide source conflicts; drop quality limitations; treat athlete report as absolute truth; treat device data as absolute truth.

[DECISION] **These are testable negative requirements** (§8) — not aspirations. The slice is *incorrect* if any appears, even if convenient.

---

## 8. Validation Strategy

[ASSUMPTION] No code yet; this defines the test suite the implementation must satisfy. Tests are behavioral/unit-level against the domain model (no persistence/API needed to validate the model).

**Positive tests (behavior present):**
- `ObservationSet` creation preserves occasion identity, source, time range, completeness status (AC1.1–1.3).
- Provenance is present and resolvable on every observation (AC1.4).
- `SubjectiveObservation` preserves verbatim wording, source, time; multiple statements → multiple observations; inquiry-response linkage shape (AC2.*).
- `MissingDataObservation` is representable for expected-and-absent data and raises explicit incompleteness (AC3.1, 3.3).
- `ObservationQuality` status + reason attach and travel; source-conflict preserved (AC4.*).
- Supersession retains original, records reason, preserves "as-of" history, never mutates (AC5.*).

**Negative tests (behavior structurally absent — the defining tests):**
- **No `Signal` object is produced** by any intake operation.
- **No `Hypothesis` / `EvidenceCase` / `Evidence` object is produced.**
- **No inference field** (fatigue/readiness/impact/"hard"/"easy") exists on any observation.
- **No mutation path** exists that overwrites an existing observation.
- **No code path** strips or hides an `ObservationQuality` or a source conflict.
- **No flag** marks a `SubjectiveObservation` as confirmed-true or marks device data as absolute.
- **`MissingDataObservation` cannot be consumed as evidence** (no API surface offers it as such in this slice).

[ASSUMPTION] The negative tests matter most: a future implementer should be able to demonstrate, by test, that intake *cannot* manufacture meaning. If those tests can't be written, the boundary is wrong.

---

## 9. Consistency & Behavioral Notes

[FACT] From the boundary map (§4, §10):
- The `ObservationSet` is **one atomic transaction boundary** — creating a set and adding its observations is consistent within the aggregate; cross-aggregate effects (signal detection later) are out of scope.
- Provenance is **born here** (boundary map §6, layer 1) — this slice is the origin every future `TraceabilityChain` resolves to. Its correctness is therefore disproportionately important: a missing provenance handle here breaks traceability *everywhere* downstream.
- The application service that drives intake **coordinates, never reasons** (boundary map §9) — it assigns no meaning, runs no detection.

[ASSUMPTION] **Re-assessable quality:** an `ObservationQuality` may be re-evaluated when later observations arrive (Observation & Signal Model, Decision 5). This slice must allow a quality *re-assessment* to be recorded as such — but a re-assessment is itself non-destructive (it does not overwrite the prior assessment any more than supersession overwrites an observation).

---

## 10. Out-of-Scope Follow-Up Specs

[ASSUMPTION] Likely next specs, in dependency order:
- **Spec 002 — Signal Detection from Contextualized Observations** (the next slice up the ladder; first interpretation).
- **Spec 003 — Hypothesis Lifecycle & EvidenceCase** (Reasoning core).
- **Spec 004 — DecisionSupportCase Gate** (voice selection + traceability verification).
- **Spec 005 — First End-to-End Responsible Reflection** (the thinnest full path: observation → … → a single Reflection-level output, the lowest-risk way to validate the whole chain).

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- What exact raw workout format will the first importer use?
- Will Garmin/FIT parsing be implemented directly or through an adapter? *(The model must not preclude an adapter; the choice is deferred.)*
- How much context is required at intake time vs. supplied later at contextualization? *(This slice records raw + provenance; contextualization is Spec 002.)*
- How are duplicate observations detected? *(Duplicate is a listed quality/rejection reason in the model, but de-dup logic is interpretation — likely Spec 002.)*
- How much source-conflict *resolution* belongs in intake vs. later stages? *(This slice only **preserves** conflict; resolution is downstream.)*
- What persistence mechanism stores immutable observation history? *(Deferred to a technical spec; not resolved here.)*

[ASSUMPTION] None of these block intake: the slice records raw, attributed, immutable observations with explicit quality and completeness, and refuses meaning — regardless of how the above resolve.

---

## 12. Success Criterion

> **"How do we record what Aurora observed without accidentally claiming what it means?"**

[ASSUMPTION] Answerable from this spec: Aurora records every observation as an **immutable, sourced, timestamped, provenance-bearing** value within an `ObservationSet` whose **completeness is explicit**; self-report is preserved **verbatim** as fallible-but-meaningful; expected-but-absent data is a first-class `MissingDataObservation` that **cannot become evidence**; quality limitations and source conflicts **attach and travel, never stripped or silently resolved**; corrections **supersede without overwriting**, preserving "as-of" history. And it claims nothing about meaning because the slice **structurally cannot produce a Signal, Hypothesis, or Evidence** — proven by negative tests. The trustworthy root is established; interpretation begins only in Spec 002.

---

## Known Risks

[ASSUMPTION]
- **Risk:** intake quietly grows an inference field "for convenience" (a "looksHard" flag). **Defense:** negative tests (§8) + the boundary rule that `observation` cannot depend on `reasoning`.
- **Risk:** provenance handle omitted on some path, silently breaking downstream traceability. **Defense:** provenance as a mandatory construction input for every observation (boundary map §6 reversal); a test asserting no observation exists without resolvable provenance.
- **Risk:** "occasion" grouping proves ambiguous (a next-day report about a workout). **Defense:** flagged open question; supersession + linkage shapes keep it amendable without overwrite.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the first Specification. It defines the behavioral contract for ObservationSet intake; it defers persistence, API, types, and all interpretation to later specs.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · Process: [spec-process.md](./spec-process.md)*
