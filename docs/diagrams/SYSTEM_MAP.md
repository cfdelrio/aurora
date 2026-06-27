# Aurora — System Conceptual Map

> The reasoning ladder and its guarantees, at a glance. Faithful reproduction of the
> "Mapa conceptual del sistema" diagram, kept in a version-controllable form and tied to the
> modules actually implemented in `src/modules/`.
>
> **Status (post Implementation 008):** the reasoning core is **implemented end-to-end**.
> All five stages exist in code and Implementation 006 composes them into one demonstrated chain
> whose first full output is `DecisionSupport` with `VoiceMode: Reflection` — not `Recommendation`.
> Implementation 007 added a thin, **Purpose-first `athlete` module** — Aurora's first real *given*
> upstream context (declared, versioned, append-only purpose). Implementation 008 made **projection
> freshness explicit** on `UnderstandingAssessment` (a derived view can never quietly become a fact;
> non-current freshness only lowers the voice, via the existing `SafeVoiceCeiling`). The remaining
> absences (UI/API/DB/LLM/event-bus/FIT/**full** athlete model/**generic projection engine**/
> production service) are **intentional**, not gaps. See
> [`../implementation-architecture/CORE_COMPLETION_REVIEW.md`](../implementation-architecture/CORE_COMPLETION_REVIEW.md).

> **Canonical source:** this Markdown/Mermaid document is the **canonical, maintainable, versionable
> source of truth** for the system map. Edit the map here.
>
> **The PNG is a derived export, not a source.** A rendered raster (`aurora-system-map.png`) may be
> added beside this file *later*, once a corrected, final version exists — strictly as a derived
> render of this document, never as the principal artifact. It is intentionally not committed now.

---

## Central Principle

> **Aurora no confunde datos con significado, ni inferencia con hecho, ni comprensión con consejo.**
> *(Aurora does not confuse data with meaning, inference with fact, or understanding with advice.)*

---

## The Reasoning Ladder

```mermaid
flowchart LR
    subgraph ATH["Athlete (context, not a stage) — Purpose-first ✅ Impl 007"]
      A2["Purpose (declarado, versionado, append-only)<br/>PurposeHistory · PurposeVersion · PurposeChanged"]
      A1["Identidad (ref only, slice fino)"]
      A3["Constraints (aún no implementado)"]
      A4["Path-dependent memory (aún no implementado)"]
      A5["Athlete posee contexto declarado, no verdad inferida"]
    end

    O["1 · Observación<br/>(module: observation)<br/>ObservationSet · observaciones crudas<br/>Provenance / Source / Quality<br/>Self-report · Missing data"]
    S["2 · Señal<br/>(module: observation/signal)<br/>ContextualizedObservation<br/>Signal / SignalRejection<br/>Relevancia sin significado<br/>Trazabilidad preservada"]
    R["3 · Reasoning<br/>(module: reasoning)<br/>Hypothesis · EvidenceCase<br/>ClaimConfidence · Falsificadores<br/>Lifecycle"]
    U["4 · Understanding<br/>(module: understanding)<br/>UnderstandingProfile (aggregate = fuente de verdad)<br/>Dimensiones específicas · UnderstandingLevel · Survived challenge<br/>Surprise / Staleness · SafeVoiceCeiling"]
    UA["UnderstandingAssessment (projection / read model) ✅ Impl 008<br/>ProjectionFreshness: current/stale/partial/invalid/unknown<br/>derivedAt · sourceRefs (referencias, no verdad copiada)<br/>RefreshPolicy: pura · selectiva · conservadora<br/>no-current solo BAJA voz; invalid/unknown → ceiling none"]
    D["5 · Decision Support / Voz<br/>(module: decision-support) ✅<br/>DecisionSupportCase · gates · TraceabilityVerification<br/>VoiceSelectionPolicy · VoiceMode<br/>Reflection · Framing · Warning · Recommendation<br/>Agency preservada"]
    OUT["Salida demostrada (Impl 006)<br/>DecisionSupport · VoiceMode: Reflection<br/>(no Recommendation)"]

    O --> S --> R --> U
    U -. "proyecta (derivado, no fuente de verdad)" .-> UA
    UA -. "freshness clampa SafeVoiceCeiling → gate existente" .-> D
    D --> OUT
    OUT -. "la decisión del atleta vuelve como nueva observación (AthleteDecision, aún no implementado)" .-> O

    ATH -. context .-> O
    A2 -. "PurposeVersionRef como contexto (Hypothesis.purposeContextRef), no evidencia" .-> R
    A2 -. "PurposeChanged → staleness selectiva (vía adapter), no mutación directa" .-> U
    A2 -. "Purpose → purposeContext; PurposeGate exige alineación con purpose actual" .-> D
```

[FACT] **Athlete / Purpose is now an implemented upstream context (Impl 007), Purpose-only.** It is
**not** a pipeline stage and **not** the full Athlete aggregate. The edges from `Purpose` are
**explicit seams**, not hidden coupling: `athlete` imports no downstream module; purpose reaches
`reasoning` as a `PurposeVersionRef` *context handle* (carried in the existing
`Hypothesis.purposeContextRef` slot — **context, not evidence**), reaches `understanding` only as
**selective staleness** applied by a neutral adapter (**never a direct mutation, never a global
reset**), and reaches `decision-support` as a `PurposeContext` the `PurposeGate` evaluates (**purpose
context ≠ voice** — the case still selects the `VoiceMode`).

[FACT] **Projection freshness (Implementation 008).** `UnderstandingAssessment` is a **projection /
read model** of the `UnderstandingProfile` aggregate (the source of truth) — **not** a fact. It carries
explicit `ProjectionFreshness` (`current`/`stale`/`partial`/`invalid`/`unknown`), `derivedAt`, and
`sourceRefs` (references, never copied truth). Non-current freshness can **only lower** the voice;
`invalid`/`unknown` clamp `SafeVoiceCeiling` to `none` (→ `Withholding`). Freshness reaches
`decision-support` **only through the clamped `SafeVoiceCeiling`** — the consumer was **not modified**
and reads no freshness directly. The `RefreshPolicy` is **pure, deterministic, selective**
(by source-ref intersection) and **conservative**; **refresh = recompute** a new view, never edit the
old one. There is **no generic projection engine and no top-level `projection` module** — freshness is
local to `understanding` for this one projection.

[FACT] **End-to-end proof (Implementation 006).** A single synthetic chain runs all five stages and
lands on `DecisionSupport` with `VoiceMode: Reflection`. A single `supported` outcome earns
`UnderstandingLevel: Working` → `SafeVoiceCeiling: tentative` → max voice `Reflection`; complete
traceability and clean gates are **not** enough for `Recommendation` (that also requires a
`confident` ceiling). Restraint is structural, not a runtime preference.

[FACT] **Athlete is not a pipeline stage.** It is the cross-cutting context every stage consults
(purpose, identity, constraints, path-dependent memory). **Understanding sits above the flow**,
governing how assertively Decision Support may speak. The flow is **cyclic**: the athlete's
decision returns as a new observation.

---

## Operational Reasoning Ladder

```text
Observation  >  Signal  >  Hypothesis  >  Understanding  >  Voice
```

---

## The Five Stages

| # | Stage | Module | Holds | Implemented |
|---|---|---|---|---|
| 1 | **Observación** | `observation` | `ObservationSet`, raw observations, Provenance/Source/Quality, self-report, missing data | ✅ Impl 001 |
| 2 | **Señal** | `observation/signal` | `ContextualizedObservation`, `Signal`/`SignalRejection`, relevance-without-meaning, preserved traceability | ✅ Impl 002 |
| 3 | **Reasoning** | `reasoning` | `Hypothesis`, `EvidenceCase`, claim confidence, falsifiers, lifecycle | ✅ Impl 003 |
| 4 | **Understanding** | `understanding` | `UnderstandingProfile`, dimension-specific, `UnderstandingLevel`, survived challenge, surprise/staleness, `SafeVoiceCeiling` | ✅ Impl 004 |
| 5 | **Decision Support / Voz** | `decision-support` | `DecisionSupportCase`, gates, `TraceabilityVerification`, `VoiceSelectionPolicy`, `VoiceMode` (Reflection/Framing/Warning/Recommendation), terminal outputs, preserved agency | ✅ Impl 005 |
| — | **End-to-end proof** | `src/modules/__tests__` | First full chain composed; output `DecisionSupport` · `VoiceMode: Reflection` (not Recommendation) | ✅ Impl 006 |
| ※ | **Athlete / Purpose** *(context, not a stage)* | `athlete` | `Athlete` (thin), `Purpose`/`PurposeVersion`/`PurposeHistory` (append-only), `PurposeChanged`, `PurposeVersionRef`, `PurposeReinterpretationStatus` (type only). **No** inferred state/capacity/constraints/path-memory | ✅ Impl 007 (Purpose-first) |
| ◇ | **Projection freshness** *(on `UnderstandingAssessment`)* | `understanding` | `ProjectionFreshness` (5 states), `derivedAt`, source refs, `RefreshTrigger`/`Policy`; non-current only lowers voice (invalid/unknown → ceiling `none`); flows downstream via `SafeVoiceCeiling`. **No** generic engine / `projection` module / `ImpactAssessment` | ✅ Impl 008 |

---

## Non-Negotiable Invariants

- **Trazabilidad end-to-end** — every claim traceable back to provenance-bearing observations.
- **Incertidumbre explícita** — "I don't know yet" is a first-class, representable output.
- **Comprensión por dimensión** — understanding is dimension-specific, never global.
- **El atleta decide** — Aurora supports decisions; it never owns them.
- **El silencio también es una salida válida** — responsible withholding is auditable, not absence.

---

## Distinctions the Map Must Not Collapse

[FACT] Pairs the code keeps as distinct, unrepresentable-to-confuse concepts:

| Distinct concepts | Why they are not the same |
|---|---|
| `SafeVoiceCeiling` **≠** `VoiceMode` | The ceiling (from `understanding`: none/tentative/qualified/confident) is the *maximum permitted assertiveness*; the `VoiceMode` (Silence/Reflection/Framing/Warning/Recommendation) is what `decision-support` actually selects within it. The ceiling is mapped to a voice; it is never a voice. |
| `Signal` **≠** `Evidence` | A `Signal` asserts only *possible relevance to a future question*. It becomes an `EvidenceCase` **only** when attached inside a `Hypothesis` — there is no standalone evidence. |
| `ClaimConfidence` **≠** `UnderstandingLevel` | Confidence is *in a claim* (calibrated, defeasible, per-hypothesis); understanding level is *in Aurora's grasp of this athlete* (per-dimension, earned by survived challenge). The `ReasoningOutcome` adapter deliberately drops claim confidence so it cannot leak into understanding. |
| `DecisionSupportCase` **≠** `AthleteDecision` | Aurora owns the *integrity of support*; the athlete owns the *decision*. The case only **references** an `AthleteDecision` after the fact (`AthleteDecisionRef`); it never owns one. |
| thin `Athlete`/`Purpose` module **≠** full `Athlete` aggregate | Only the Purpose slice is implemented (Impl 007); state/capacity/constraints/path-memory are not. |
| declared `Purpose` **≠** inferred athlete state | `athlete` owns the *given* (athlete-declared/accepted, versioned); it never holds readiness/capacity/fatigue/current-state. |
| `PurposeChanged` **≠** reasoning rewrite | A purpose change appends history and may stale understanding selectively; it never edits or auto-falsifies prior hypotheses. |
| `PurposeVersionRef` **≠** proof old reasoning used the new purpose | It is a context handle tagging which purpose was in force; it does not retroactively re-evaluate past reasoning. |
| revealed behavior **≠** declared purpose | Behavior may create an inquiry/hypothesis about a mismatch; it never silently overwrites the athlete's declared purpose. |
| purpose context **≠** decision-support voice | Purpose feeds the `PurposeGate`; the case still selects the `VoiceMode`. |
| selective staleness **≠** global understanding reset | A purpose change stales only the named dimension(s); other dimensions stay fresh. |
| projection (`UnderstandingAssessment`) **≠** source of truth | The `UnderstandingProfile` aggregate is the truth; the assessment is its derived, labeled view (Impl 008). |
| `ProjectionFreshness` **≠** traceability | Freshness says *how safe to consume*; `sourceRefs`/trace say *what it came from* — different axes. |
| projection `sourceRefs` **≠** copied source state | References back to real artifacts, never embedded/re-authored truth. |
| refresh **≠** mutate the old projection | Refresh *recomputes* a new view; `applyFreshness` never edits the old one (it stays auditable). |
| stale/partial/invalid/unknown **≠** permission to recommend | Non-current freshness can only *constrain*; invalid/unknown → ceiling `none` → `Withholding`. |
| `SafeVoiceCeiling` clamp **≠** decision-support owning freshness | The consumer reads the clamped ceiling; it never reads freshness — `decision-support` was not modified. |
| local freshness slice **≠** generic projection engine | Freshness lives in `understanding` for one projection; no engine / no `projection` module exists. |

---

## What the System Still Does Not Have (intentional)

[FACT] The reasoning core is complete in code, `athlete` exists Purpose-first, and projection
freshness is explicit on `UnderstandingAssessment`; the following are **deliberately absent**, not
failures:

- **No UI** · **No API** · **No DB / persistence** · **No cache**
- **No LLM rendering** boundary (generated text must never become domain truth)
- **No event bus** (`PurposeChanged` and refresh triggers are returned/derived values, not bus events)
- **No Garmin/FIT adapter** (the first input is a synthetic fixture)
- **No *full* `athlete` model** — the Purpose-first slice is implemented; **inferred state, capacity,
  readiness, fatigue, constraints, and path-dependent memory are not** (risk still enters as a placeholder)
- **No reinterpretation engine** (the `PurposeReinterpretationStatus` type ships; the engine does not)
- **No generic projection engine and no top-level `projection` module** — freshness is local to
  `understanding` for the one concrete projection; **no `ImpactAssessment`** second projection yet
- **No production orchestration service** (cross-module purpose/refresh seams live in the neutral test harness)

[ASSUMPTION] Each was excluded so the core's invariants could be proven *before* the surfaces most
likely to erode them are introduced. **Spec 007 (purpose change) and Spec 008 (projection freshness)
are done (Impl 007/008).** The next responsible missions (Spec 009 athlete-decision loop, reasoning
purpose-version awareness, then persistence/event surface and input adapters) add the rest without
collapsing any distinction above. See the Core Completion Review for the full ledger.

---

## How This Maps to the Repository

- The five stages correspond to the technical boundary map in
  [`../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md`](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md).
- The full conceptual foundation is indexed at [`../README.md`](../README.md) and
  [`../domain-modeling/README.md`](../domain-modeling/README.md).
- Dependencies flow up the ladder only: `observation → reasoning → understanding → decision-support`,
  with `Athlete` and `Understanding` as cross-cutting contexts. Lower modules never import higher ones
  (enforced by dependency-boundary tests in each module's `tests/`).
- `athlete` (Impl 007) is an **upstream leaf**: it imports only `shared-kernel` and **never** imports
  `observation`/`reasoning`/`understanding`/`decision-support`. Purpose reaches downstream through
  **explicit seams** — a `PurposeVersionRef` context handle into `Hypothesis.purposeContextRef`, a
  `PurposeContext` into `decision-support`, and selective `markUnderstandingStale("purpose-change")`
  into `understanding` — applied by neutral harness/application adapters, not by `athlete` reaching out
  (enforced by `athlete`'s boundary test).

---

*This diagram is documentation, not code. It tracks the implemented system; update it as new slices land.*
