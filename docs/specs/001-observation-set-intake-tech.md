# Tech Spec 001A — ObservationSet Intake Implementation Plan

> The smallest safe implementation plan for Spec 001 — recording raw observations so they remain raw, immutable, sourced, quality-aware, and traceable, while making Signal / Hypothesis / Evidence / Meaning structurally impossible.
>
> Technical spec, not production code. Implementation does not begin until explicitly approved.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — blocked on one prerequisite decision (language)* |
| **Phase** | Specification → (gateway to) Implementation |
| **Implements** | [Spec 001 — ObservationSet Intake & Provenance](./001-observation-set-intake.md) |
| **Module** | `observation` ([Technical Boundary Map §1](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md)) |
| **Blocking prerequisite** | Implementation language (see §0 — recommended, requires approval) |

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture decision. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block (unless marked blocking). |

[FACT] **Central question:** *How can Aurora implement ObservationSet intake so raw observations remain raw, immutable, sourced, quality-aware, and traceable — while making Signal, Hypothesis, Evidence, and Meaning structurally impossible in this slice?*

[ASSUMPTION] This spec is deliberately **language-neutral in everything except §0**. Domain objects, invariants, layout shape, and tests are described so that the spec survives whatever language is chosen — only syntax changes. This keeps the unresolved language decision from contaminating the plan.

---

## 0. Prerequisite Decision — Implementation Language *(blocking)*

[FACT] **Repository inspection result:** the `aurora` repo is currently **docs-only**. There is no `src/`, no package manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.), and no language or framework chosen anywhere in the repo. The README states plainly: *"Estamos construyendo el dominio y la arquitectura. El código viene después."* The [Technical Boundary Map §11](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) explicitly deferred language choice and carried *"compile-time vs runtime traceability enforcement — finalize when an implementation language is chosen"* as an open question.

[FACT] A tech spec cannot reach implementation without a language. Per the Engineering Playbook Guardian and the global commit policy, this choice must be **surfaced and recommended, never silently invented.** A *language* is recommended here; **no framework** is chosen (Spec 001 needs none).

### Decision *(proposed — requires explicit user approval before implementation)*

[DECISION] **Recommend TypeScript (strict mode), pure domain objects, no framework, no runtime dependencies beyond a test runner.**

#### Why
- [FACT] The boundary map's traceability strategy ([§6/§11](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md)) prefers *compile-time/type-level enforcement where it makes illegal states unrepresentable*. TypeScript's discriminated unions, `readonly`, branded/opaque types, and `never` let us model "an Observation has no slot for meaning" and "no Recommendation without a Chain" **at the type level** — directly serving Negative Capability (§6).
- [FACT] A strong structural type system lets the *forbidden* outputs of this slice be literally inexpressible from the `observation` module, not merely untested.
- [ASSUMPTION] TypeScript is broadly known, has zero-framework domain modeling, and a fast test loop — fitting "smallest safe slice."

#### Consequence
- Makes structural enforcement (§6) achievable in the type system, not only in tests.
- Commits the first module to a Node-family toolchain (test runner, tsconfig) — a small, reversible footprint at this stage.

#### Risk
- [QUESTION] A different long-term target (e.g., Rust/Kotlin/F# for even stronger "make illegal states unrepresentable", or Python for ML-adjacent later stages) might be preferred for the wider platform. Choosing TS now for one pure-domain slice could imply a stack it shouldn't.

#### Reversal Point
- The slice is **pure domain objects + tests with no framework and no persistence** (§3, §8), so the *domain model is portable*. If a different language is chosen before more slices land, only this slice's syntax is rewritten — the objects, invariants, and tests transfer directly. Revisit if the platform's broader stack decision (a separate architecture decision) lands on a non-TS language.

[FACT] **Until this decision is approved, implementation does not begin.** Everything below is written to hold under TS but to transfer to any strongly-typed language.

---

## 1. Implementation Scope

[DECISION] **Allowed (this slice builds exactly this):**
- the `observation` module boundary (no outbound deps except `shared-kernel` per boundary map §2);
- `ObservationSet` aggregate;
- `Observation` and its subtypes `SubjectiveObservation`, `MissingDataObservation`;
- `Provenance`, `Source`, `ObservationQuality` value objects;
- `ObservationId`, `ObservationSetId` identifiers;
- supersession behavior (append-only history);
- the test suite (§7).

[FACT] **Forbidden (must not appear, by boundary and by test):**
- `Signal`, `SignalDetectionPolicy`, `SignalEligibility`;
- `Hypothesis`, `EvidenceCase`, `ImpactAssessment`;
- `UnderstandingProfile`, `DecisionSupportCase`, recommendation logic;
- Garmin/FIT parser; database schema; API endpoint; UI.

[ASSUMPTION] The slice is "done" when intake works *and* the negative tests (§6/§7) prove meaning cannot be produced.

---

## 2. Proposed File / Module Layout

[FACT] No existing convention to honor (docs-only repo). [DECISION] **Adopt a domain-first layout, materialized only once §0 is approved.** Shape (TS shown; folders are language-neutral):

```text
src/
  shared-kernel/
    ids.ts                 # ObservationId, ObservationSetId (branded id types)
    provenance.ts          # Provenance reference primitives, Source
    time.ts                # timestamp primitives
    epistemic.ts           # epistemic tag value type (FACT/HYPOTHESIS/...) — primitives only
  modules/
    observation/
      domain/
        observation.ts             # Observation + subtypes (SubjectiveObservation, MissingDataObservation)
        observation-quality.ts     # ObservationQuality (status + reason)
        observation-set.ts         # ObservationSet aggregate (creation, add, supersede, completeness)
        index.ts                   # PUBLIC surface — exports ONLY intake operations
      application/
        record-observation-set.ts  # coordinator: create set, add observations (coordinates, never reasons)
      tests/
        observation-set.intake.test.ts
        observation.immutability.test.ts
        observation.supersession.test.ts
        subjective-observation.test.ts
        missing-data.test.ts
        quality-and-provenance.test.ts
        negative-capability.test.ts   # the defining tests (§6)
```

[ASSUMPTION] `shared-kernel` holds only the minimal primitives the boundary map §3 allows (ids, provenance refs, source, time, epistemic tags) — nothing meaning-bearing. The `observation` module imports `shared-kernel` and **nothing else** (no `reasoning`, etc.) — enforced by there being no such modules and, later, by a dependency lint rule.

---

## 3. Domain Objects

[FACT] Conceptual fields only — **no database schema, no over-modeling.** "Field" means a property the object must carry, not a column.

### `ObservationSetId` / `ObservationId`
- **Responsibility:** stable, opaque identity.
- **Fields:** an opaque value (branded type, not a bare string).
- **Invariant:** unique; never reused; never parsed for meaning.
- **Must not:** encode interpretation or ordering semantics beyond identity.

### `Source`
- **Responsibility:** name where an observation came from.
- **Fields:** a closed set — `device | athlete-report | coach-report | manual | imported-plan | competition-result | system-derived`.
- **Invariant:** every observation has exactly one source.
- **Must not:** carry a trust *ranking* (trust is contextual, deferred — Observation & Signal Model Decision 4).

### `Provenance`
- **Responsibility:** make every observation traceable to its origin.
- **Fields:** source (above), capture time, arrival/recording time, and a reference handle (the root a future `TraceabilityChain` resolves to).
- **Invariant:** an `Observation` cannot exist without complete `Provenance`.
- **Must not:** be mutable or strippable.

### `ObservationQuality`
- **Responsibility:** record quality-before-meaning.
- **Fields:** status (`complete | partial | missing | inconsistent | corrupted | suspicious | stale | source-conflicted | context-missing`) + a reason.
- **Invariant:** travels with its observation; never silently removed.
- **Must not:** imply relevance or meaning (quality ≠ meaning); re-assessment adds, never overwrites (§4).

### `Observation`
- **Responsibility:** an immutable record that something was recorded/reported/detected.
- **Fields:** id, provenance, quality, and an **opaque measured value** (e.g., kind + magnitude + unit for device data) — *no interpretation*.
- **Invariant:** immutable; has source+time+provenance; carries quality.
- **Must not:** have any field expressing meaning (`fatigue`, `readiness`, `impact`, `interpretation`, `isHard`, `score`, …). **This absence is the point** (§6).

### `SubjectiveObservation` *(subtype of Observation)*
- **Responsibility:** an athlete self-report at the bottom of the ladder.
- **Fields:** the athlete's **verbatim wording** (preserved exactly), plus base Observation fields (source = `athlete-report`); optional link to a prompting inquiry (shape only — `InquiryResponse`).
- **Invariant:** original wording never altered; fallible but never marked true/confirmed, never discarded as noise.
- **Must not:** be structured in a way that loses the raw words.

### `MissingDataObservation` *(subtype of Observation)*
- **Responsibility:** record that *expected* data was absent.
- **Fields:** what was expected, that it is absent, base provenance.
- **Invariant:** representable; raises set incompleteness; **can never be consumed as evidence**.
- **Must not:** carry meaning ("under-recovered") or be auto-promoted to a signal.

### `ObservationSet` *(aggregate root)*
- **Responsibility:** the consistency boundary for one occasion's observations.
- **Fields:** id, occasion identity, source(s), time range, an **append-only collection** of observations, supersession records, and an explicit **completeness status** (expected vs. present).
- **Invariant:** every contained observation retains provenance + immutability + quality; incompleteness is always explicit; supersession never overwrites.
- **Must not:** produce a Signal/Hypothesis/Evidence; resolve a source conflict; assign meaning.

---

## 4. Immutability and Supersession

[DECISION]
- **Observations are immutable values.** Once constructed, no field changes (TS: `readonly` + `Object.freeze` at construction; conceptually: value objects).
- **A correction is a new observation + a supersession record** held by the `ObservationSet`. The original observation **remains in the set's history**.
- **Supersession carries a reason** and a timestamp.
- **"As-of" reconstruction:** the set can answer *"which observations were active as of time T"* by walking supersession records — so downstream traceability can explain **what was known at the time** (Spec 001 AC5.3).
- **Quality re-assessment is also non-destructive** (Observation & Signal Model Decision 5): a re-assessed quality is a new quality record linked to the observation, never an in-place edit.

[FACT] No observation and no quality assessment is ever mutated in place. Append-only is the mechanism; "superseded, never overwritten" is the invariant.

---

## 5. Quality and Provenance Enforcement

[DECISION] **Enforce at construction (smart constructors / factory functions), not by later validation:**
- No `Observation` can be constructed without `Source`, capture time, and complete `Provenance` — the constructor refuses (returns a failure result / throws) otherwise.
- `ObservationQuality` is part of the observation value and is returned with it on every read — there is no read path that omits it.
- The `ObservationSet` exposes its **completeness status** as a first-class, always-present property; an incomplete set cannot hide its incompleteness.

[FACT] Construction-time enforcement is chosen over after-the-fact checks for the same reason the boundary map enforces traceability at construction: an invariant that *can* be bypassed eventually *is*. Make the illegal object unconstructable.

---

## 6. Negative Capability *(the defining section)*

[DECISION] **The `observation` module is made structurally incapable of producing meaning by three layers:**

1. **Boundary:** the module imports only `shared-kernel`. It has no reference to `reasoning`, `understanding`, or `decision-support` (they don't exist yet, and a dependency rule will forbid importing them later). It therefore *cannot* construct a `Signal`, `Hypothesis`, `Evidence`, `Impact`, `Understanding`, or `DecisionSupport` — those types are not in scope.
2. **Type shape:** `Observation` and its subtypes have **no field that can hold an interpretation**. There is no optional "meaning" slot to fill. In a strong type system this makes "an observation with a fatigue verdict" *unrepresentable*, not merely *untested*.
3. **Public surface:** the module's `index` exports **only intake operations** (create set, add observation, supersede, read with quality/provenance). No detection, scoring, or inference function is exported or exists.

[FACT] Enforced by both **module boundaries** (layers 1–3) **and tests** (§7 negative tests). The slice is incorrect if any path can yield meaning — even a convenient `looksHard` boolean.

---

## 7. Validation Strategy (tests before implementation)

[DECISION] Tests are written to the Spec 001 acceptance criteria. The **negative tests are the defining ones.**

**Positive:**
1. Creates `ObservationSet` with source, time range, provenance, explicit completeness (Spec 001 AC1.*).
2. Preserves subjective report **verbatim**; one report → may yield multiple observations (AC2.*).
3. Represents missing expected data as `MissingDataObservation`, raising incompleteness (AC3.1/3.3).
4. Records `ObservationQuality` status + reason; quality travels and is not strippable (AC4.1/4.2).
5. Preserves **incomplete** status visibly (AC1.3/3.3).
6. Supersedes **without overwriting**; original retrievable; reason recorded; "as-of" history reconstructable (AC5.*).
7. Exposes **source conflict** (`source-conflicted`) **without resolving it** (AC4.5).

**Negative (must prove absence):**
8. The module **exports no** `Signal` / `Hypothesis` / `EvidenceCase` / `Evidence` constructor (surface test).
9. No observation object has an inferred-meaning field (`fatigue`/`readiness`/`impact`/`isHard`/`score`) — structural/type test.
10. No code path mutates an existing observation in place (immutability test).
11. No code path strips or hides a quality flag or a source conflict.
12. No `SubjectiveObservation` can be marked confirmed-true; no source marked absolute.
13. `MissingDataObservation` offers **no** API to be consumed as evidence.

[ASSUMPTION] Tests 8–13 are the contract that intake *cannot manufacture meaning*. If any cannot be written/passed, the model is wrong, not the test.

---

## 8. Persistence Decision

[DECISION] **For this slice: pure domain objects + an in-memory repository used only by tests. No production persistence, no database, no schema.**

#### Why
- [FACT] The boundary map deferred persistence to a later architecture paper; projections/persistence are not this slice's concern. This slice validates the **model's correctness and its negative capability** — neither needs a database.
- An in-memory repository lets the supersession/"as-of"-history tests (§7.6) exercise the aggregate fully without committing to a storage mechanism.
- [ASSUMPTION] Choosing persistence now would be premature and would risk leaking storage convenience into the domain (boundary map failure mode #8/#1).

#### Reversal Point
- When a second slice needs durable observation history, write a persistence-architecture paper (immutable, append-only store; how "as-of" reconstruction is served) and introduce a real repository behind the same interface the in-memory one satisfies.

[FACT] No database tables are defined here.

---

## 9. Open Questions

[QUESTION] Carried forward; none block implementation once §0 is approved:
- Real importer format (what the first `System importer` actually hands in).
- Persistence mechanism for immutable observation history (deferred — §8 reversal).
- Duplicate detection (a quality/rejection concern; likely interpretation → Spec 002, not intake).
- Exact `Source` taxonomy (the closed set in §3 is provisional).
- External context intake (season/calendar) — not this slice.
- Future Garmin/FIT adapter (the model must not preclude an adapter; building it is out of scope).
- [QUESTION] "Occasion" vs. "provenance episode" as the `ObservationSet` grouping key (carried from Spec 001 / Observation & Signal Model).

[ASSUMPTION] None require resolution to build a raw, immutable, sourced, quality-aware, meaning-free intake.

---

## 10. Implementation Task Preview

[DECISION] The task that follows this tech spec **once §0 is approved**:

> **Implementation 001 — Build ObservationSet domain model and tests**

**Scope:** the `observation` module (§1–§6), pure domain objects + in-memory test repository (§8), full test suite (§7). No other module.

**Acceptance criteria (gate to "done"):**
- [ ] All §7 positive tests pass (AC mapping to Spec 001 documented in tests).
- [ ] All §7 negative tests pass — the module **cannot** produce `Signal`/`Hypothesis`/`Evidence`/meaning.
- [ ] Every `Observation` is immutable, has `Source` + time + complete `Provenance`, and carries `ObservationQuality`.
- [ ] `SubjectiveObservation` preserves verbatim wording; `MissingDataObservation` cannot become evidence.
- [ ] Supersession preserves originals and supports "as-of" reconstruction; nothing is overwritten.
- [ ] Source conflicts are exposed, not resolved.
- [ ] The `observation` module imports only `shared-kernel`.
- [ ] No persistence/API/UI introduced.

[FACT] **Implementation does not begin until the user explicitly approves** both this tech spec and the §0 language decision (per mission and global policy).

---

## Success Criterion

> **"Can Aurora record what it observed while making it impossible to accidentally claim what it means?"**

[ASSUMPTION] After this tech spec, an implementer can build the slice **without deciding any domain question in code**: the objects, fields, invariants, immutability/supersession mechanics, enforcement points, and the full (especially negative) test suite are all specified. The one open decision — language — is surfaced as a blocking prerequisite with a recommendation, not buried in implementation. Meaning is made impossible by three structural layers (boundary, type shape, public surface), each backed by a test. The trustworthy root can be built; interpretation waits for Spec 002.

---

## Known Risks

[ASSUMPTION]
- **Risk:** language chosen later differs from §0, forcing a rewrite. **Defense:** the slice is pure domain + tests, no framework/persistence — the model and tests transfer; only syntax changes (§0 reversal).
- **Risk:** a convenience field (`looksHard`) creeps onto `Observation`. **Defense:** negative tests §7.9 + the type-shape rule (§6.2) + boundary rule (§6.1).
- **Risk:** provenance omitted on some construction path. **Defense:** construction-time enforcement (§5) + test that no observation exists without resolvable provenance.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical spec for Spec 001. It defines the minimal implementation plan and surfaces the language prerequisite; it does not implement. Implementation awaits explicit approval.*

*Inputs: [Spec 001](./001-observation-set-intake.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
