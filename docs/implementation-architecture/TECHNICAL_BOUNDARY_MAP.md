# Implementation Architecture 001 — Technical Boundary Map

> How should the implementation be organized so the domain invariants remain enforceable in code?
>
> Implementation architecture, not production code. No frameworks, databases, ORMs, APIs, UI, types, schemas, or deployment.

> **Implementation status (post Impl 021).** The **`rendering`** module now also owns the first
> **opt-in live-provider boundary** (inside `rendering/application`, **not a new module**): a **`LiveCallPolicy`**
> (injected value object; `disabled()`/`enabled({timeoutMs})`; **disabled by default**; never inferred from the
> environment; no global state), a **`ProviderCredentialResolver`** port (+ opaque `ProviderCredentialToken`) with
> a deterministic test/composition-only **`StaticProviderCredentialResolver`** (no env, non-secret sentinel), a
> **`LiveProviderHttpTransport`** (the **only** production file permitted a native network token — `fetch` +
> `AbortSignal.timeout` behind an **injected endpoint**; **no SDK, no dependency/lockfile change**), and a
> **`LiveProviderClient`** that implements the existing async **`ProviderClientBoundary`** (a **sibling** of
> `ConcreteProviderClient`, reusing the unchanged `serializeProviderInstruction`/`parseProviderResponse`/
> `mapProviderError`). It **fails closed before any transport call** when the policy is disabled or the credential
> is missing/invalid; it **never calls `validateDraft`** — validation stays owned by the unchanged
> `requestRealProviderRendering`, so provider output is an **untrusted draft**; transport conditions map **down**
> onto the existing `ProviderOperationalFailure → ProviderFailure` (**not expanded**). **Allowed imports**
> unchanged: `shared-kernel` + read-only `decision-support` *types* + own `rendering` domain/application.
> **Forbidden imports** unchanged: `observation`/`reasoning`/`understanding`/`athlete`/**`event-recording`**/
> **`delivery`**; **no module outside `rendering` imports it**. The native-network guard exception is **surgical**:
> the Impl 014 broad rendering scan and the Impl 017 `/provider-/` scan now allow a network token **only** in
> `live-provider-http-transport.ts` (each asserts it is the *only* network file), while **vendor / SDK / `process.env`
> tokens stay forbidden everywhere** (Impl 019/020 guards untouched). There is **no installed SDK/package dependency**
> (`package.json`/lockfile unchanged), **no `process.env`/env resolver/raw secret/prompt template**, **no default/CI
> live call or credential**, and **no retry/scheduler/record/review/display/delivery/event/domain side effect**. The
> synchronous seam, `FakeProviderAdapter`, `FakeProviderClient`, and `ConcreteProviderClient` are **untouched**.
> Module count is still **nine** (Impl 021 added no module). The slice was **additive** — only
> `rendering/application/index.ts` exports and two rendering network guards changed (surgically); **no documented
> blocker was needed**. No architecture decision below is superseded. The note below is the prior (Impl 020) status.
>

> **Implementation status (post Impl 020).** The **`rendering`** module now also owns the first
> **concrete-provider adapter shell** (inside `rendering/application`, **not a new module**): a
> **`ConcreteProviderClient`** (implements the Impl 019 async `ProviderClientBoundary`), a pure
> **`serializeProviderInstruction`** (+ `ConcreteProviderRequestPayload`), a pure **`parseProviderResponse`**
> (+ `ConcreteProviderResponseShape`), and a pure **`mapProviderError`** (+ `ConcreteProviderErrorKind`/`Shape`).
> The provider target (**OpenAI**) is selected at the **doc/decision level (Tech Spec 020A) only**; production/test
> code stays **vendor-neutral** (`concrete-provider-*`, `providerKind: "concrete"`) so **no negative-capability
> guard is weakened and no vendor token (`openai`/`anthropic`) appears in a guarded provider file**. The client is
> **disabled by default** (no transport → safe `provider-unavailable`, no I/O — **there is no live-call path**; a
> deterministic in-process **fixture transport** exists **only for tests**, never a network call); a non-`present`
> `ProviderSecretRef` fails safe before any transport. The **serializer** projects **only** safe constraints
> (terminal-output kind, voice, style, locale, allowed/forbidden claims, uncertainty visibility, limitations,
> traceability, maxLength) — **no** arbitrary-prompt/chain-of-thought/voice-override/secret field, **no prompt
> template / `src/prompts`**; the **parser** returns an **untrusted draft + operational metadata only** (empty/
> malformed → safe operational failures; **no raw payload retained**; **no `RenderedMessage`**); the **error
> mapper** maps provider-shaped errors to the existing `ProviderOperationalFailure`, which `toProviderFailure` maps
> **down** to the existing `ProviderFailure` (**not expanded**; unknown → safe `provider-unavailable`). A draft
> becomes a message **only** via the unchanged `requestRealProviderRendering` → **`validateDraft`**; the Impl 018
> raw-free audit observes the outcome by **explicit composition** (no automatic persistence). **Allowed imports**
> unchanged: `shared-kernel` + read-only `decision-support` *types* + own `rendering` domain/application.
> **Forbidden imports** unchanged: `observation`/`reasoning`/`understanding`/`athlete`/**`event-recording`**/
> **`delivery`**; **no module outside `rendering` imports it**. There is **no installed SDK/package dependency**
> (`package.json`/lockfile unchanged), **no network/`process.env`/raw secret/prompt template**, and **no
> retry/scheduler/record/review/display/delivery/event/domain side effect**. Module count is still **nine**
> (Impl 020 added no module). The slice was **additive** — only `rendering/application/index.ts` exports changed;
> **no documented blocker was needed**. No architecture decision below is superseded. The note below is the prior
> (Impl 019) status.
>

> **Implementation status (post Impl 019).** The **`rendering`** module now also owns a **real-provider-*ready***
> boundary (inside `rendering/domain` + `rendering/application`, **not a new module**): a `ProviderSecretRef`
> (+ `ProviderCredentialStatus`), a non-secret `ProviderClientConfig`, a structured `ProviderInstruction`
> (+ `providerInstructionFrom`), `ProviderClientRequest`/`ProviderClientResponse` (+ operational metadata only),
> a closed `ProviderOperationalFailure` (+ `toProviderFailure` mapping), an **async `ProviderClientBoundary`**
> port, a deterministic **`FakeProviderClient`**, a **`RealProviderAdapter`**, and an async
> **`requestRealProviderRendering`** service. It **changes only the draft source**: the existing
> **synchronous** seam (`ProviderAdapter`/`FakeProviderAdapter`/`requestProviderRendering`, Impl 017) is
> **untouched**; the async path **reuses** the unchanged `providerRenderingRequestFrom` guard + the mandatory
> **`validateDraft`** and returns the existing `ProviderRenderOutcome` (so the Impl 018 raw-free audit observes
> it by explicit composition). **Allowed imports** unchanged: `shared-kernel` + read-only `decision-support`
> *types* + own `rendering` domain/application. **Forbidden imports** unchanged:
> `observation`/`reasoning`/`understanding`/`athlete`/**`event-recording`**/**`delivery`**; **no module
> outside `rendering` imports it**. **Real-provider-*ready*, not real-provider-*integrated*:** the
> `FakeProviderClient` is in-process and deterministic; a **`ProviderSecretRef`** is an operational reference
> (status + opaque ref), **never a raw secret** (no secret in records/responses/errors; **no `process.env`**);
> a **`ProviderInstruction`** is structured/derived (no prompt template / arbitrary prompt / chain-of-thought);
> `ProviderOperationalFailure` maps **down** to the existing `ProviderFailure` (**catalog not expanded**);
> provider output is **untrusted draft** (only `validateDraft` makes a message); **provider metadata is
> operational, not evidence**; every failure **degrades to safe non-rendering** with **no automatic retry**;
> and there is **no automatic persistence / review / display-eligibility / delivery / event / domain
> mutation** and **no real SDK/API/network/prompt or `provider`/`llm`/`telemetry`/`evaluation` top-level
> module**. This slice introduces the codebase's **first `async` surface**, isolated to the real-ready path.
> Module count is still **nine** (Impl 019 added no module). The slice was **additive** — **no documented
> blocker was needed**. No architecture decision below is superseded. The note below is the prior (Impl 018)
> status.
>
> **Implementation status (post Impl 018).** The **`rendering`** module now also owns a **provider-attempt
> audit** (inside `rendering/domain` + `rendering/application`, **not a new module**): an append-only
> **`ProviderAttemptRecord`** (+ `ProviderAttemptStatus`, `ProviderAttemptFailureReason`, `ProviderDraftSummary`),
> a **`ProviderAttemptRecordRepository` port + in-memory adapter**, and an observe-only **`auditProviderAttempt`**
> service. The audit **observes** an already-computed `ProviderRenderOutcome` (Impl 017) and records a **safe
> summary** — status (`validation-passed`/`validation-failed`/`provider-failed`/`unsafe-request-blocked`;
> `requested`/`draft-produced` reserved) + reasons (**reusing the real `ProviderFailure` + `RenderingFailure`
> catalogs**, no invented parallel catalog) — with **no raw draft retention** (`rawDraftRetained` literal
> `false`; reconstitution rejects raw draft/text/content/prompt fields). **Allowed imports** unchanged:
> `shared-kernel` + read-only `decision-support` *types* + own `rendering` domain/application. **Forbidden
> imports** unchanged: `observation`/`reasoning`/`understanding`/`athlete`/**`event-recording`**/**`delivery`**;
> **no module outside `rendering` imports the audit**. **The audit is observe-only, auditability not
> authority:** it **does not call** the provider / `requestProviderRendering` / `validateDraft`; a
> `ProviderAttemptRecord` is not a `ProviderDraft`/source-truth/`Evidence`/`Observation`/`Understanding`/
> `AthleteDecision`/`DecisionSupport`/`TerminalOutput`/`RenderedMessage`/`RenderedMessageRecord`; it **creates
> no review/display-eligibility/delivery**, **appends no event**, **triggers no retry/reprojection/reasoning/
> mutation**, and a **validation failure is not domain invalidation** (provider success ≠ recommendation
> validation; provider failure ≠ `SupportQuality` weakening). It is **not model evaluation or telemetry
> infrastructure**; there is **no provider event / event-catalog expansion / real provider SDK/API/network/
> prompt** and **no `provider-audit`/`telemetry`/`evaluation` top-level module**. Module count is still
> **nine** (Impl 018 added no module). The slice was **additive** — **no documented blocker was needed**. No
> architecture decision below is superseded. The note below is the prior (Impl 017) status.
>
> **Implementation status (post Impl 017).** The **`rendering`** module now also owns a **provider adapter
> seam** (inside `rendering/domain` + `rendering/application`, **not a new module**): a constrained
> **`ProviderRenderingRequest`** (+ `providerRenderingRequestFrom` guard), an untrusted **`ProviderDraft`**, a
> closed **`ProviderFailure`** catalog, a **`ProviderAdapter`** port, a deterministic **`FakeProviderAdapter`**,
> and a **`requestProviderRendering`** service. The provider **replaces only the draft-text step** the
> `FakeRenderer` performs: it produces an untrusted draft that becomes a `RenderedMessage` **only** by passing
> the **unchanged mandatory `validateDraft`** — the validator, not the provider, remains the authority.
> **Allowed imports** unchanged: `shared-kernel` + read-only `decision-support` *types* + own `rendering`
> domain/application. **Forbidden imports** unchanged: `observation`/`reasoning`/`understanding`/`athlete`/
> **`event-recording`**/**`delivery`**; **no module outside `rendering` imports the provider seam**. **The
> provider is a draft source, not authority:** it **never** selects/changes `VoiceMode`, creates a
> `TerminalOutput`/`Recommendation`/`RenderedMessage`/`RenderedMessageRecord`, persists/reviews/marks-display-
> eligible/delivers, emits an event, or mutates the domain; an **unsafe request is refused before the provider
> call** and any provider failure/unsafe draft **degrades to safe non-rendering** (a validation failure →
> `provider-output-failed-validation` + the underlying `RenderingFailure[]`). The seam is **fake/test-only**:
> **no real SDK/API/network/`process.env`/prompt-templates-as-code**, and **no `provider`/`llm`/`openai`/
> `anthropic`/`model` top-level module**. Module count is still **nine** (Impl 017 added no module). The slice
> was **additive** — **no documented blocker was needed**. No architecture decision below is superseded. The
> note below is the prior (Impl 016) status.
>
> **Implementation status (post Impl 016).** A new **`delivery`** module now realizes the first
> **delivery / exposure** boundary — **downstream exposure**, not rendering and not domain. It **exposes** a
> *display-eligible* `RenderedMessageRecord` to a target and records the attempt: `requestDelivery` **verifies**
> eligibility by calling `rendering`'s **`displayEligibilityOf(record)`** (it does **not** re-derive or
> reinterpret it), calls a **deterministic `InMemoryTestSink`** **only** when the record is eligible *and* the
> target is the supported **`test-sink`**, and **blocks** every ineligible (not-reviewed / rejected /
> superseded / failed-render / missing-ref) or unsupported-target request without calling the sink. The
> attempt is persisted as an auditable **`DeliveryRecord`** behind a **`DeliveryRecordRepository` port +
> in-memory adapter** (deep-copy round-trip, mutation isolation, validated reconstitution). **Allowed
> imports:** `shared-kernel` + **read-only `rendering`** types/functions + own `delivery` domain/application.
> **Forbidden imports:** `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`/**`event-recording`**.
> **`rendering` must not import `delivery`**, and **no upstream module imports `delivery`**. **Delivery is
> exposure, not authority:** a `DeliveryRecord` is not domain truth (`≠ Observation/Evidence/Understanding/
> DecisionSupport/AthleteDecision`); **delivery success is not evidence** and **delivery failure is not domain
> invalidation**; delivery **mutates no rendered-message record and no aggregate**, **triggers no
> reasoning/reprojection/retry**, and the **test sink is not a real provider/channel**. A `DeliveryRecord` is
> **not** an event record (the event catalog is **not** expanded), and there is **no delivery event / real
> provider/channel / UI / API / scheduler / retry / event bus / production DB**. The delivery audit repository
> lives **inside `delivery/application`**. Two **documented test-only** blocker fixes landed (the e2e
> `ALLOWED_MODULES` set gained `delivery`; the Impl 015 forbidden-layer test dropped its obsolete `delivery`
> entry). Module count is now **nine** (the six domain modules + `event-recording` + `rendering` + `delivery`;
> the `reprojection-harness` remains a neutral `__tests__` seam, not a module). No architecture decision below
> is superseded. The note below is the prior (Impl 015) status.
>
> **Implementation status (post Impl 015).** The **`rendering`** module now also owns **rendered-message
> record/review persistence** (inside `rendering/domain` + `rendering/application`, **not a new module**): an
> append-only **`RenderedMessageRecord`** (auditable presentation artifact; source-domain-output ref preserved),
> an append-only **`RenderReview`** (display-safety only; closed decision/reason catalogs) with derived status,
> a derived **`DisplayEligibility`**, and a **`RenderedMessageRecordRepository` port + in-memory adapter**
> (deep-copy round-trip, mutation isolation, validated reconstitution). **Allowed imports** unchanged:
> `shared-kernel` + read-only `decision-support` types + own `rendering` domain/application. **Forbidden
> imports** unchanged: `observation`/`reasoning`/`understanding`/`athlete`/**`event-recording`**. **Persistence
> is auditability, not authority:** a record is not domain truth; approval changes no domain (voice/traceability/
> freshness/`SupportQuality`); rejection invalidates nothing; **display eligibility is derived, not delivery**;
> a `RenderedMessageRecord` is **not** an event record (the event catalog is **not** expanded, no
> `RenderedMessageRecorded`/`RenderReviewed`); there is **no production DB / delivery / UI / API / provider**.
> Module count is still **eight** (Impl 015 added no module). No architecture decision below is superseded.
> The note below is the prior (Impl 014) status.
>
> **Implementation status (post Impl 014).** A new **`rendering`** module now realizes the first **output-out**
> boundary — downstream **presentation**, not domain. It turns a domain-approved `TerminalOutput` into
> human-facing text via a **read-only `RenderableDomainOutput` projection**, a **deterministic fake renderer**
> (no provider), and a **mandatory validator** that preserves voice/uncertainty/limitations/freshness/
> traceability/agency and refuses escalation/invention/hidden-uncertainty (safe non-render). **Allowed imports:**
> `shared-kernel` + **read-only `decision-support` types** only. **Forbidden imports:** `observation`,
> `reasoning`, `understanding`, `athlete`, `event-recording`. **No existing module imports `rendering`.**
> **Rendering is presentation-only, not LLM-provider integration, and generated text is not domain authority:**
> `decision-support` owns the `TerminalOutput`/`VoiceMode`; the renderer phrases only; the validator (not the
> renderer) is the guarantee; rendering **mutates no aggregate, writes no event, persists nothing**, and no
> **real LLM provider / prompt templates / UI / API / external call** exists. The module count is now **eight**
> (the six domain modules + `event-recording` + `rendering`; the `reprojection-harness` remains a neutral
> `__tests__` seam, not a module). No architecture decision below is superseded. The note below is the prior
> (Impl 013) status.
>
> **Implementation status (post Impl 013).** The **`observation`** application boundary now includes a
> **Manual Input Adapter** (`observation/application/manual-input-*`, `ingestManualInput`) — Aurora's first
> real **"data in"** boundary. Its only domain output is an `ObservationSet`: it reuses `recordObservationSet`
> and persists through **`ObservationSetRepository`**, preserving provenance (`source: "manual"`)/quality/
> verbatim words, representing missing data explicitly, and rejecting the unrepresentable (saving nothing).
> **Allowed imports:** `observation` domain/application + `shared-kernel` only. **Forbidden imports:**
> `event-recording`, `reasoning`, `understanding`, `decision-support`, `athlete` — `observation` stays
> `event-recording`-free; the optional `ObservationSetRecorded` is composed only in a **neutral harness**
> (which may compose `observation` + `event-recording`). **Ingestion is not interpretation:** the adapter
> detects no `Signal`, infers nothing, mutates no `AthleteDecisionRecord`, and triggers no downstream effect.
> The dependency direction is unchanged (`observation` remains the upstream leaf importing only
> `shared-kernel`); no architecture decision below is superseded; **no UI/API/LLM/external integration/DB/
> event-bus/scheduler** exists. The note below is the prior (Impl 012) status.
>
> **Implementation status (post Impl 012).** A **neutral, check-only reprojection harness** now exists as
> **test-support / coordination** under `src/modules/__tests__/reprojection-harness/` — **not a production
> module** (no `src/modules/reprojection`). It is the cross-module coordinator (like the purpose/decision
> adapters): it composes `understanding`, `event-recording`, and read access to repositories, and **no
> production module depends on it**. It **recomputes** `UnderstandingAssessment` *through the owning module's
> existing function*, **recalculates** freshness, reads **event records as candidates/context only**, and
> **reports** drift/findings. **Reprojection is not event sourcing and not a write path:** `check-only` is
> the only implemented mode (it mutates no repository, appends no record, creates no `TerminalOutput`/
> recommendation/`SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord`); it never replays events
> as commands and never rebuilds aggregates from the log (empty repos → `event-record-only`/`missing-source`);
> `refresh-derived`/`mark-stale` are reserved and throw. The support-seam picture is now: **repositories
> preserve aggregate *state* (Impl 010) · event records preserve *occurrence history* (Impl 011) ·
> reprojection *recomputes derived views and reports drift/freshness* (Impl 012) — none replaces the
> others.** No architecture decision below is superseded; **no scheduler / event bus / event sourcing /
> projection repository / production service layer** exists. The note below is the prior (Impl 011) status.
>
> **Implementation status (post Impl 011).** A new **dependency-neutral `event-recording` module** now
> realizes the **event surface** (§8 here) and the persistence paper's event records: an **append-only,
> ref-only** `DomainEventRecord` (categories `occurrence`/`outcome`) over a **closed catalog**, with a
> reusable `TraceabilityEnvelope` and an in-memory log + repository port. It **imports only
> `shared-kernel`** and **no domain module imports it** (the event catalog stays out of `shared-kernel`,
> so the kernel never becomes event-aware); application/harness coordination composes records from domain
> refs. The persistence/event boundary now reads: **repositories preserve aggregate *state* (Impl 010);
> event records preserve *occurrence history* (Impl 011); neither replaces the other.** An event record is
> **not a command** — appending executes/mutates nothing; payloads carry **refs, not copied state**;
> causation/correlation are lineage/grouping, never an execution chain; and there is **no event bus,
> publish/subscribe, handler, async delivery, or event sourcing**. No architecture decision below is
> superseded; the module count is now **seven** (the six below + `event-recording`). The note below is the
> prior (Impl 010) status.
>
> **Implementation status (post Impl 010).** Persistence is now realized as **repository ports +
> in-memory adapters + validated `toState()`/`reconstitute()`** per aggregate (Spec/Impl 010), in each
> module's `application/` layer — **no production DB/ORM/schema/migrations, no event bus, no cache, no
> `src/infrastructure`, no `persistence`/`repositories` module, no technology chosen.** Repositories
> *preserve* aggregates (validated reconstitution, state copies not live references); they **never create
> meaning** and the **domain's `toState()` drives the store, never the reverse**. The lines below remain
> the intended boundaries; the note below is the prior (Impl 009) status.
>
> **Implementation status (post Impl 009).** This map describes the *intended* boundaries; the code
> now realizes them. Implemented modules: `observation` (001/002), `reasoning` (003), `understanding`
> (004; **+ projection freshness on `UnderstandingAssessment`, 008**), `decision-support` (005),
> end-to-end composition (006), and `athlete` — **Purpose (007) + AthleteDecision (009)** (declared,
> versioned, append-only purpose; athlete-owned, append-only decisions; no inferred
> state/capacity/constraints/path-memory yet). Projection freshness (§5 here) is realized **locally in
> `understanding`**: `UnderstandingAssessment` is a read model carrying explicit freshness + source
> references, non-current freshness only lowers the voice (via the existing `safeVoiceCeiling`), and
> refresh recomputes — **no generic projection engine, no top-level `projection` module, no persistence**.
> The **AthleteDecision feedback loop** (009) is realized with the decision **referenced — never owned —**
> by `decision-support` and re-entering reasoning **only as a `SubjectiveObservation`** (via a neutral
> adapter), with **no compliance/obedience scoring and no outcome-based validation**. Every dependency
> rule below holds in code, including `athlete` as an upstream leaf that imports only `shared-kernel`, and
> projections remaining read models (never sources of truth). No architecture decision here is superseded.
> For the implemented-vs-absent ledger see [`CORE_COMPLETION_REVIEW.md`](./CORE_COMPLETION_REVIEW.md) and
> [`../diagrams/SYSTEM_MAP.md`](../diagrams/SYSTEM_MAP.md).

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[DECISION]** | An architectural commitment, with reasoning. |
| **[HYPOTHESIS]** | Reasoned but unproven; must be validated. |
| **[ASSUMPTION]** | A stance chosen, not a truth. |
| **[QUESTION]** | Open, carried forward. |
| **[UNKNOWN]** | We genuinely don't know. |

Where this document resolves a previously-open question, it uses **Decision / Why / Consequence / Risk / Reversal Point**.

[ASSUMPTION] This is the first step *out* of domain modeling. Its only job is to place the accepted domain model into technical boundaries such that the eleven non-negotiable invariants ([domain modeling index §6](../domain-modeling/README.md)) are *enforceable in code* — not to choose any technology. Per the Engineering Playbook Guardian's phase discipline, this phase is permitted *technical boundaries, module structure, dependency direction, enforcement points* — and forbidden *frameworks, databases, APIs, schemas, deployment, code*.

---

## The Architectural Mandate

[FACT] The domain modeling index named three collapses implementation must never allow, plus the foundation's traceability and agency guarantees. This architecture is **wrong** if it permits any of:

- recommendation without traceability,
- stored inferred athlete state as if it were fact,
- a global understanding level,
- population knowledge promoting personal understanding,
- raw observations treated as signals,
- `DecisionSupportCase` owning `AthleteDecision`,
- `VoiceMode` chosen only from claim confidence,
- Purpose ignored during decision support.

[ASSUMPTION] Every boundary, dependency rule, and enforcement point below exists to make one or more of these *structurally impossible* — not merely discouraged.

---

## 1. Proposed Technical Boundary Map

[DECISION] **Six domain modules, plus a deliberately minimal `shared-kernel`. Projections, policies, and events are *not* their own top-level modules — they live inside the module that owns the invariant they serve.**

- **Why:** [FACT] The domain modeling index settled on five aggregates across five contexts (with Reasoning as one bounded context holding Evidence+Impact). One module per aggregate-owning context keeps each invariant inside one boundary. Making `projections`, `policies`, or `events` top-level modules would scatter logic *away* from the invariant it protects — the opposite of what enforceability requires (a `VoiceSelectionPolicy` in a global `policies` module could be invoked bypassing the `DecisionSupportCase` that must own its result).
- **Consequence:** six modules — `observation`, `reasoning`, `athlete`, `understanding`, `decision-support`, plus `shared-kernel`. Projections/policies/services live *within* their owning module.
- **Risk:** Six modules may be finer than the first implementation needs; `signal` folded into `observation` (below) could later deserve to split.
- **Reversal Point:** if `signal` logic grows independent of capture, or `reasoning` splits Evidence from Impact under real load, promote sub-packages to modules.

[DECISION] **`signal` is a sub-boundary inside `observation`, not a separate module.** [Why] DM-003 placed Signal detection at the Ingestion/Signal seam and made `ObservationSet` the only aggregate there; Signal is a value object with no aggregate of its own. Keeping signal detection beside capture keeps the "raw → meaning" judgment in one place. [Reversal] split if signal detection acquires its own persistence or independent lifecycle.

| Module | Responsibility | Owns | Must not own | Inbound deps (who depends on it) | Outbound deps (what it depends on) | Protected invariants | Failure modes prevented |
|---|---|---|---|---|---|---|---|
| **`shared-kernel`** | The minimal vocabulary every module must agree on | Identifiers, timestamps, provenance references, epistemic tags, traceability *references* (not the chain), domain result primitives | Any aggregate, any policy, any meaning, any inference | everything | nothing | none of its own (it holds primitives, not invariants) | Dumping-ground coupling (kept minimal — §3) |
| **`observation`** (incl. `signal`) | Capture what was recorded/reported/detected; turn it into contextualized observations and signals (or recorded rejections) | `ObservationSet` (aggregate); `Observation`, `ContextualizedObservation`, `Signal`, `SignalRejection`, `ObservationQuality`, `Provenance`, `Source` (value objects); `SignalDetectionPolicy`, `SignalEligibility` | Hypotheses, meaning-as-claim, evidence direction/weight | reasoning | shared-kernel; *reads* baselines from athlete/understanding (via passed inputs, not a hard dep — see §2) | Raw observation never treated as meaning; provenance never lost; signal ≠ evidence | Observation→meaning collapse |
| **`reasoning`** | Weigh signals as evidence against impact hypotheses; run the hypothesis lifecycle | `Hypothesis` (aggregate root) incl. `EvidenceCase` (entity); `ImpactAssessment` (projection); `SurpriseDetection` (service) | The decision to communicate; understanding levels; the athlete's attributes | understanding, decision-support | shared-kernel; observation (consumes signals) | Hypothesis always falsifiable/calibrated/traceable; signal becomes evidence only when attached to a hypothesis | Claim-as-fact; orphan claims |
| **`athlete`** | Hold the *given* truth about the person; project the *inferred* | `Athlete` (thin aggregate) — identity, purpose(+history), constraints, path-dependent memory; `CurrentState`, `CapacityProfile` (projections) | Inferred state/capacity *as facts*; hypotheses; understanding | reasoning, understanding, decision-support (all *read*) | shared-kernel | Purpose versioned; given vs. inferred boundary; path-dependent memory permanent | Inference→attribute collapse; stale-athlete-model |
| **`understanding`** | Track per-dimension, revisable confidence in understanding *this athlete* | `UnderstandingProfile` (aggregate); `UnderstandingDimension`, `UnderstandingLevel`, `Surprise` (value objects); `UnderstandingAssessment` (projection); promotion/demotion/decay policies | The athlete's attributes; claim confidence; the decision | decision-support | shared-kernel; consumes reasoning lifecycle outcomes; reacts to athlete events | Dimension-specific never global; level ≤ survived athlete-specific evidence; population never promotes | Global-understanding; population-to-person |
| **`decision-support`** | Turn evidence + understanding into responsible advice, or ask, or withhold | `DecisionSupportCase` (aggregate); `VoiceMode`, `TraceabilityChain`, `RiskAssessment` (value objects); `VoiceSelectionPolicy`, the five gates, `TraceabilityVerification` | The athlete's decision; the generation of new claims | (top of the stack; the athlete-facing edge) | shared-kernel; reads reasoning (hypotheses), understanding (assessment), athlete (purpose/constraints) | Voice gated not derived; recommendation needs complete trace; agency preserved | Support→decision collapse; claim-strength→voice; untraceable advice |

---

## 2. Dependency Rules

[DECISION] **Dependencies flow *up the epistemic ladder*: `decision-support` → `reasoning`/`understanding`/`athlete` → `observation` → `shared-kernel`. Lower modules never depend on higher ones. `understanding` and `decision-support` consume lower modules' *events/outputs*, not the reverse.**

```
   shared-kernel
      ▲
   observation                    (depends only on shared-kernel)
      ▲
   reasoning                      (depends on observation, shared-kernel)
      ▲           ▲
   understanding  │               (consumes reasoning lifecycle outcomes; reacts to athlete events)
      ▲           │
   decision-support               (reads reasoning, understanding, athlete)
                  │
   athlete  ──────┘               (depends only on shared-kernel; read by reasoning/understanding/decision-support)
```

[FACT] Answering the mission's questions explicitly:
- **Can `decision-support` depend on `reasoning`?** [DECISION] **Yes** — it reads hypotheses (already traced). It must *read*, never *write* them (it cannot author or strengthen claims).
- **Can `reasoning` depend on `decision-support`?** [DECISION] **No, forbidden.** Reasoning must not know whether or how a claim will be communicated, or it would tailor inference to the desired advice.
- **Can `understanding` consume `reasoning` lifecycle events?** [DECISION] **Yes** — that is its only legitimate input (DM-004: understanding is earned from *tested hypothesis outcomes*, never raw signals).
- **Can `athlete` depend on `understanding`?** [DECISION] **No, forbidden.** *Athlete describes the athlete; UnderstandingProfile describes Aurora's confidence in understanding the athlete* (DM-002/004). If `athlete` depended on `understanding`, inference could leak back as a stored attribute — the inference→attribute collapse.
- **Can `observation` know about hypotheses?** [DECISION] **No, forbidden** — the load-bearing rule: raw observation must never know what it means.
- **Where do projections live?** With the module that owns their source of truth (§5).
- **Where do policies live?** Inside the module that owns the invariant they serve (§7).
- **What belongs in shared kernel?** Only the minimal cross-module vocabulary (§3).

### Explicit forbidden dependencies
[DECISION]
- `observation` ⇏ `reasoning` / `understanding` / `decision-support` *(observation must not know meaning)*.
- `reasoning` ⇏ `decision-support` *(reasoning must not know how it will be used)*.
- `athlete` ⇏ `understanding` / `reasoning` / `decision-support` *(the given must not depend on the inferred)*.
- `understanding` ⇏ `decision-support` *(the voice ceiling must not be shaped by the voice that consumes it)*.
- Any module ⇏ another via *projection-as-input-of-truth* *(projections are read models, never authoritative inputs — §5)*.

[ASSUMPTION] **Cross-cutting reads without hard dependencies:** `observation` needs athlete *baselines* and `understanding`/`reasoning` need athlete *purpose/priors*. To avoid a dependency cycle (athlete is read by all yet depends on none), these are passed *into* the lower module as plain input values by the coordinating application service (§9), not imported as a module dependency. The athlete module is a leaf that everything *reads from* via the application layer, never a thing `observation` imports.

---

## 3. Shared Kernel

[DECISION] **The shared-kernel holds only: stable identifiers, timestamps, `Provenance` *references*, `Source` metadata, epistemic tags (`[FACT]`/`[HYPOTHESIS]`/`[ASSUMPTION]`/`[UNKNOWN]` as a value type), traceability *reference handles*, and generic domain result primitives (e.g., a Result/Outcome wrapper). Nothing that carries meaning, inference, or an invariant.**

- **Why:** [FACT] These are the vocabulary every module must agree on to *link* and *attribute* — without them, traceability and provenance can't cross boundaries. But the shared kernel is, by reputation, the most dangerous module: anything placed there couples every module to it. So it holds *references and primitives*, never *concepts that protect invariants*.
- **Consequence / the specific rulings the mission asks:**
  - **`TraceabilityChain`:** [DECISION] **owned by `decision-support`, not shared.** The shared kernel holds only lightweight *reference handles* (IDs that let a chain be assembled); the chain *object* and its verification belong where it is enforced. [Why] putting the chain in the kernel would let any module assemble or assert one, defeating the single guardian. [Risk] cross-module assembly needs the reference handles to be stable. [Reversal] if assembly proves to need more shared structure, share a *read-only* chain *view*, never the constructable chain.
  - **`Purpose`:** [DECISION] **owned by `athlete`, referenced elsewhere by handle — not shared as a mutable type.** [Why] purpose is versioned and owned by the athlete (DM-002); sharing it invites edits outside the aggregate. Other modules receive a purpose *value snapshot* passed in, not the owned type.
  - **`VoiceMode`:** [DECISION] **local to `decision-support`, not shared.** [Why] only decision-support emits or reasons about voice; nothing else needs the type. Sharing it would invite another module to set a voice.
- **Risk:** Even a minimal kernel drifts toward a dumping ground over time.
- **Reversal Point:** if anything meaning-bearing is proposed for the kernel, that is the signal to stop and relocate it to an owning module.

[ASSUMPTION] **Conservative default:** when unsure whether something belongs in the kernel, it does *not*. The kernel grows only by explicit decision.

---

## 4. Aggregate Placement

[FACT] Conceptual placement only — no repositories, no persistence (deferred).

| Aggregate | Owning module | Repository-boundary candidate (conceptual) | Allowed collaborators | Emits | Consumes | Invariant enforcement point |
|---|---|---|---|---|---|---|
| `ObservationSet` | `observation` | one boundary per occasion | (none above; read by reasoning) | `ObservationSetCreated`, `SignalDetected`, `SignalRejected`, `MissingDataDetected` | device/report inputs | at construction/amendment of the set (provenance + immutability + completeness) |
| `Hypothesis` (owns `EvidenceCase`) | `reasoning` | one boundary per hypothesis | reads signals from observation; read by understanding & decision-support | `HypothesisRaised/Supported/Weakened/PromotedToKnowledge/Falsified`, `SurpriseDetected` | `SignalDetected` | at every lifecycle transition (falsifier present, confidence calibrated, traceable, no silent transition) |
| `Athlete` | `athlete` | one boundary per athlete | read by reasoning, understanding, decision-support | `PurposeChanged`, `ConstraintDeclared`, `AthleteReportSubmitted`, `InjuryReported` | athlete inputs/reports | at declaration acceptance (purpose versioned; hard constraint/path-memory never dropped; given-vs-inferred boundary) |
| `UnderstandingProfile` | `understanding` | one boundary per athlete *(per-dimension internally)* | consumes reasoning outcomes; reacts to athlete events; read by decision-support | `UnderstandingLevelPromoted/Demoted`, `UnderstandingMarkedStale` | hypothesis lifecycle events; athlete events | at level change (per-dimension; ≤ survived evidence; population never promotes; cause recorded) |
| `DecisionSupportCase` | `decision-support` | one boundary per case | reads reasoning, understanding, athlete | `DecisionOpportunityDetected`, `DecisionSupportCaseOpened`, `TraceabilityVerified`, `VoiceModeSelected`, `DecisionSupportGenerated`, `InquiryRaised`, `RecommendationWithheld` | opportunities; reads of hypotheses/assessment/purpose | at output emission (the gate invariant — §6, no voice without its gates) |

---

## 5. Projections and Read Models

[DECISION] **Each projection is owned by the module that owns its *source of truth*, is refreshed from that module's events, always exposes staleness, and may never be used as an authoritative input or written as a fact.**

| Projection | Owning module | Refreshed by | May be stale? | Staleness exposed how | Must never |
|---|---|---|---|---|---|
| `ImpactAssessment` | `reasoning` | hypothesis lifecycle events | yes (derived) | carries "as of" + underlying hypotheses' confidence | become an editable source of truth for impact (the Hypothesis is) |
| `CurrentState` | `athlete` | inference (reasoning) + athlete reports | yes — *expires to `unknown`* | per-dimension validity window + `StateStaleness` | persist a last-known value as if current |
| `CapacityProfile` | `athlete` | reasoning hypotheses | yes | `CapacityEstimate` carries confidence + staleness | be stored as an authoritative athlete attribute |
| `UnderstandingAssessment` | `understanding` | profile level/decay changes | yes | carries fragility + staleness + reasons | be read as a claim; only ever a *voice ceiling* |

[FACT] **Core principle (load-bearing):** *a projection is not an aggregate; a projection must not become the source of truth for inferred reality.* The architectural defense: projections live in a read-only sub-boundary of their module, constructed *from* events, never accepting direct writes, and every consumer receives them with staleness attached so "stale" cannot be silently read as "current."

[DECISION] **What a projection must never do:** accept a write; be passed as an authoritative input to another module's invariant decision *without* its staleness; or outlive its source without re-derivation. [Why] each is a route to the projection→fact collapse. [Reversal] if a citable, frozen snapshot is genuinely needed, introduce an explicit immutable `*Snapshot` value object (flagged in DM-001/002), still derived, never authoritative.

---

## 6. Traceability Enforcement Strategy

[DECISION] **Two-layer enforcement, mirroring the domain model: (1) provenance is *born* at `observation` and carried immutably by every artifact via shared-kernel reference handles; (2) the `TraceabilityChain` is *assembled and verified* inside `decision-support` by `TraceabilityVerification`, which the `DecisionSupportCase` must call before any assertive output. A Recommendation is structurally impossible without a verified complete chain.**

| Question | Answer |
|---|---|
| Where is provenance born? | `observation` — every `Observation` carries `Provenance` at capture; `ObservationSet` guarantees it. |
| Where is traceability assembled? | `decision-support`, at case formation, by walking reference handles down through hypothesis → evidence → signal → observation. |
| Where is traceability verified? | `decision-support`, by `TraceabilityVerification`, before emission. |
| Which outputs require complete traceability? | **Recommendation** (and Warning-as-fact). |
| Can partial traceability support Reflection/Framing? | Yes — with priors **explicitly labeled** as priors; never presented as personal findings. |
| What happens when traceability is incomplete? | Voice degrades (to Reflection/Framing-as-prior), or routes to `Inquiry`, or `Withholding` — all recorded. "Incomplete" is itself a valid reason for Inquiry. |
| What module prevents orphan claims? | `decision-support` — it may only *read* already-traced hypotheses from `reasoning`; it cannot author claims, so an untraceable claim cannot enter the speaking boundary. |

[DECISION] **Enforcement is at construction, not after the fact.** The `DecisionSupportCase` aggregate refuses to reach a Recommendation state unless `TraceabilityVerification` has returned a complete chain — the invariant is a *precondition of the output existing*, not a check run on it later.

- **Why:** [FACT] The domain modeling index's final reflection: untraceable advice possible *even once* collapses trust irrecoverably. "Discouraged" is not enough; it must be impossible by construction.
- **Risk:** assembling the chain at the top requires every lower artifact to have kept its reference handle; one producer omitting a handle breaks assembly.
- **Reversal Point:** if breaks recur, make a provenance handle a *mandatory construction parameter* of every reasoning artifact (no artifact exists without naming its input) — turning a convention into an impossibility-to-omit.
- [QUESTION] How much of this is enforced at compile-time (type-level "no Recommendation without a Chain") vs. runtime verification? Carried to §11.

---

## 7. Policy and Domain Service Placement

[DECISION] **Every policy/service lives inside the module that owns the invariant it serves, and is invoked only through that module's aggregate — never as a free-floating, independently-callable function.**

| Policy / Service | Owning module | Inputs | Outputs | May decide | Must NOT decide | Failure if misplaced |
|---|---|---|---|---|---|---|
| `SignalDetectionPolicy` | `observation` | contextualized observations + baselines (passed in) | `Signal` or `SignalRejection` | whether something is meaningful enough to consider | what it *means for impact* | if in `reasoning`, observation→meaning collapse |
| `SignalEligibility` (gate) | `observation` | a signal | eligible / not (4-part: which hypothesis / direction / quality / source) | whether a signal may become evidence | the evidence's weight | if in `decision-support`, noise reaches advice |
| `SurpriseDetection` (service) | `reasoning` | new evidence vs. current model | `Surprise` / `SurpriseDetected` | that a contradiction occurred | how to respond to it | if in `understanding`, detection entangles with response |
| `ContradictionResponsePolicy` | `understanding` | a surprise | response (lower confidence / reopen / demote / ask) | how to react to surprise | the truth of the claim | if in `reasoning`, response entangles with weighing |
| promotion/demotion/decay policies | `understanding` | hypothesis outcomes, time | level changes | understanding level movement | claim confidence; athlete attributes | if in `reasoning`, repetition could promote |
| `EvidenceGate` | `decision-support` | hypotheses + traceability | pass / degrade | whether evidence suffices for a voice | the hypothesis's content | if in `reasoning`, reasoning tailors to advice |
| `UnderstandingGate` | `decision-support` | `UnderstandingAssessment` | safe voice ceiling | the voice cap | the understanding level itself | if it could raise the level, population-to-person at the edge |
| `PurposeGate` | `decision-support` | athlete purpose (read) | aligned / ambiguous→Inquiry | whether purpose permits a voice | the athlete's purpose | if it could set purpose, agency violation |
| `RiskGate` | `decision-support` | hypotheses, context | `RiskAssessment` + escalation | raise toward Warning for safety | a diagnosis | if it could raise a Recommendation's ceiling, overreach relocated |
| `AgencyGate` | `decision-support` | candidate output | preserves-agency / rewrite / drop | whether form preserves agency | the decision itself | if absent, commands leak |
| `VoiceSelectionPolicy` | `decision-support` | all five gate results | a `VoiceMode` / `Inquiry` / `Withholding` | the maximum *responsible* voice | the athlete's decision; new claims | if outside the case, voice chosen bypassing gates |
| `TraceabilityVerification` (service) | `decision-support` | reference handles | complete / incomplete chain | whether the chain resolves | the claim's truth | if optional, untraceable advice |

[FACT] **The unifying rule:** a policy may *read* across modules (via passed inputs) but is *owned and invoked* by one module's aggregate, so its result cannot be produced in a way that bypasses the invariant guardian.

---

## 8. Event Surface

[DECISION] **Each module declares a small set of *public* domain events (cross-module contracts) and keeps the rest *internal* (process events). Internal events must not cross module boundaries; public events are the only legitimate cross-module coupling besides explicit reads.**

| Module | Public domain events (cross-module) | Internal process events (do not cross) |
|---|---|---|
| `observation` | `ObservationSetCreated`, `SignalDetected`, `SignalRejected`, `MissingDataDetected` | `ObservationCaptured`, `ObservationContextualized`, `ObservationQualityFlagged` |
| `reasoning` | `HypothesisPromotedToKnowledge`, `HypothesisFalsified`, `SurpriseDetected`, `ImpactRevised` | `HypothesisRaised`, `HypothesisSupported`, `HypothesisWeakened`, `EvidenceAttached` |
| `athlete` | `PurposeChanged`, `ConstraintDeclared`, `ConstraintExpired`, `AthleteReportSubmitted`, `InjuryReported`, `AthleteIdentityUpdated` | declaration-extraction internals |
| `understanding` | `UnderstandingLevelPromoted`, `UnderstandingLevelDemoted`, `UnderstandingMarkedStale`, `PopulationKnowledgeUsed`/`PersonalKnowledgePreferred` | `ContradictionRecorded`, `UnderstandingDimensionOpened`, `UnderstandingArchived` |
| `decision-support` | `DecisionSupportGenerated`, `InquiryRaised`, `RecommendationWithheld`, `AthleteDecisionRecorded` | `DecisionSupportCaseOpened`, `TraceabilityVerified`, `VoiceModeSelected`, gate pass/fail events |

[FACT] Rationale per the mission:
- **Public** events are the *trust-critical, cross-context* facts (a signal was detected, a hypothesis was promoted, understanding moved, support was generated/withheld/asked).
- **Internal** events are the fine-grained steps of a single module's process; exposing them as public contracts would let other modules couple to *how* a module works, not just *what* it concludes — the "events leak internal process as public contract" failure (§12).
- [ASSUMPTION] **Should-not-cross examples:** `HypothesisRaised` (a raw, untested claim — others must not react to it as if meaningful), `ObservationContextualized` (mid-process), `VoiceModeSelected` (internal to a case before emission). [QUESTION] The exact public/internal split is carried to §11.

[FACT] No payload schemas (non-goal).

---

## 9. Application Services

[DECISION] **Application services *coordinate* modules and own transaction boundaries; they contain *no domain reasoning*. They pass the cross-cutting reads (athlete baselines/purpose) into lower modules so those modules need no hard dependency on `athlete`.**

| Service | Purpose | Modules coordinated | Transaction-boundary candidate | Must NOT decide | Relies on invariant |
|---|---|---|---|---|---|
| Record workout observations | Persist a faithful, attributed `ObservationSet` | observation | one `ObservationSet` | what anything means | provenance/immutability |
| Process observation set into signals | Run signal detection/rejection over a set | observation (+ athlete baselines passed in) | per set | signal weight/direction | raw ≠ meaning |
| Raise/update hypothesis | Attach eligible signals as evidence; move lifecycle | reasoning (reads observation) | one `Hypothesis` | the voice; the level | falsifiable/traceable hypothesis |
| Update understanding from lifecycle | Apply promotion/demotion/decay from hypothesis outcomes | understanding (consumes reasoning events) | one `UnderstandingProfile` (dimension) | claim confidence; athlete facts | survived-challenge promotion |
| Open decision support case | Assemble inputs, run gates, select voice | decision-support (reads reasoning/understanding/athlete) | one `DecisionSupportCase` | the athlete's decision; new claims | the gate invariant |
| Generate terminal output | Emit DecisionSupport / Inquiry / Withholding | decision-support | within the case txn | the decision | voice gated + traceable |
| Record athlete decision | Capture the choice + any divergence, neutrally | athlete-facing (references the case) | one `AthleteDecision` | judge the choice; write understanding directly | agency (no judgment) |

[FACT] **The rule the index demands:** application services coordinate; they must not contain domain reasoning. A gate's verdict, a voice choice, a level change — all live in the owning module's policy/aggregate, never in the coordinating service. The service only sequences calls and bounds the transaction.

---

## 10. Transaction and Consistency Boundaries

[DECISION] **Each aggregate is one atomic transaction boundary. Cross-aggregate effects are eventual, propagated by public events. Projections may lag and always expose staleness. A decision that cannot tolerate a stale input must *read fresh* or *route to Inquiry*, never silently consume stale data.**

| Question | Answer |
|---|---|
| What must happen atomically? | Changes *within* one aggregate (a hypothesis lifecycle transition; a profile level change; a case's gate-verified emission). |
| What can happen eventually? | Cross-aggregate reactions: understanding updating after a hypothesis promotes; a projection refreshing after events. |
| Which projections may lag? | All four (`ImpactAssessment`, `CurrentState`, `CapacityProfile`, `UnderstandingAssessment`) — by nature. |
| Which decisions cannot tolerate stale projections? | Recommendation/Warning — they must read a *fresh* `UnderstandingAssessment` and current purpose, or degrade/Inquiry. |
| What if `UnderstandingAssessment` is stale? | The `UnderstandingGate` treats stale as a *lower ceiling* (fragility/staleness lower the safe voice) — staleness can only make Aurora *more* cautious, never less. |
| What if Purpose changed during a case? | The case must re-read purpose before emission; a `PurposeChanged` mid-case invalidates the case's purpose alignment and forces re-evaluation (possibly Inquiry). |
| How are revisions handled? | Never silent overwrite — hypothesis revisions, level changes, and superseded observations are all recorded with cause; the chain assembled for a past output is immutable. |

[FACT] No infrastructure chosen — these are *consistency needs*, not mechanisms. [ASSUMPTION] The safety asymmetry holds at the consistency layer too: **stale data may only push Aurora toward caution (lower voice / Inquiry / Withholding), never toward greater assertiveness.**

---

## 11. Open Questions From Domain Modeling

[QUESTION] Carried forward; resolved only where the architecture *requires* it.

- [QUESTION] **Stated vs. revealed purpose** — which `Impact` evaluates against. *Domain-level; not forced by this architecture.* The `athlete` module stores stated as authoritative and surfaces divergence; resolution deferred.
- [QUESTION] **Depth of reinterpretation after `PurposeChanged`** — all history or a bounded window. *Affects how far `reasoning` reopens hypotheses on a purpose-change event; deferred.*
- [QUESTION] **Exact projection refresh strategy** (on-read / on-event / maintained). *Architecturally constrained — must expose staleness and never accept writes — but the mechanism is deferred to a persistence-architecture paper.*
- [QUESTION] **Compile-time vs. runtime traceability enforcement.** Resolved *partially* below.
- [QUESTION] **Event public/private surface** — the exact split (§8 proposes one; needs validation against the first slice).
- [QUESTION] **Module granularity under real load** — whether `signal` splits from `observation`, `reasoning` splits Evidence/Impact, or `athlete`/`understanding` split per-dimension. *Reversal points noted; not forced now.*
- [QUESTION] **First implementation slice** — which behavior ships first.

### Partial resolution — traceability enforcement layer
[DECISION] **Prefer compile-time/type-level enforcement where it makes untraceable output *unrepresentable*; fall back to runtime verification where types cannot express it.**
- **Why:** [FACT] the index demands traceability be impossible by construction; a type-level guarantee ("a Recommendation cannot be constructed without a verified Chain") is stronger than a runtime check that can be forgotten.
- **Consequence:** the `decision-support` boundary should be designed so that the *only* way to obtain a Recommendation value is to supply a verified complete chain — pushing as much of the invariant into construction as the eventual language allows.
- **Risk:** over-reliance on type tricks can make the model rigid or language-specific before a language is even chosen (and choosing one is a non-goal here).
- **Reversal Point:** if type-level enforcement forces premature language commitment, specify it as a *runtime precondition with an explicit, tested guard* until the implementation-language decision is made.

---

## 12. Architectural Failure Modes

[ASSUMPTION] Each is a way the boundaries could fail, with its defense.

| # | Failure | Why dangerous | Architectural defense |
|---|---|---|---|
| 1 | **Projection becomes fact** | Inferred reality stored as truth; loses confidence/staleness/traceability | Projections are read-only sub-boundaries, refreshed from events, always carrying staleness; never accept writes (§5) |
| 2 | **Observation becomes meaning** | Corrupts the root of every chain invisibly | `observation` cannot depend on `reasoning`; meaning requires `ContextualizedObservation` + `SignalDetectionPolicy` (§1–2) |
| 3 | **Inference becomes Athlete attribute** | The athlete reduced to a cached profile of conclusions | `athlete` cannot depend on `understanding`/`reasoning`; state/capacity are projections, not stored attributes (§2, §5) |
| 4 | **DecisionSupportCase owns AthleteDecision** | Companion becomes commander; agency lost | `AthleteDecision` is a separate, athlete-facing concern referencing the case; `decision-support` may not own it (§4, §9) |
| 5 | **VoiceMode derived from claim confidence** | A correct command is still a command | Voice produced only by `VoiceSelectionPolicy` from *five gate results*, inside the case (§7); claim-strength is one input, never the driver |
| 6 | **Understanding becomes global** | Population-to-person error structurally enabled | `UnderstandingProfile` indexed per-dimension; `UnderstandingGate` reads a per-dimension ceiling (§4, §7) |
| 7 | **Traceability optional** | Untraceable advice = trust collapse | Recommendation unobtainable without verified complete chain; enforced at construction (§6) |
| 8 | **Shared kernel dumping ground** | Universal coupling; meaning leaks everywhere | Kernel holds only references/primitives; meaning-bearing things relocated to owning modules; grows only by explicit decision (§3) |
| 9 | **Application service contains domain reasoning** | Invariants escape their guardian, become unenforceable | Services only coordinate + bound transactions; all reasoning in module policies/aggregates (§9) |
| 10 | **Internal events leak as public contract** | Other modules couple to *how* a module works | Strict public/internal event split; raw/mid-process events never cross boundaries (§8) |

---

## 13. Non-Goals

[FACT] This document does **not**: choose a framework, choose a database, define a schema, define an API, define UI, define types, define deployment, implement code, define ML algorithms, or define confidence formulas. It defines *technical boundaries and enforcement points only*.

---

## Final Reflection

> **What must the implementation make structurally impossible?**

[ASSUMPTION] **Producing an athlete-facing recommendation that is either untraceable or stronger than the gates permit.**

The single thing the boundaries exist to make *unrepresentable* — not merely discouraged — is a `DecisionSupportCase` reaching a Recommendation without a verified complete `TraceabilityChain` and a `VoiceMode` bounded by the per-dimension understanding ceiling, purpose, risk, and agency. Every module placement and dependency rule converges here: `observation` can't smuggle meaning to the root; `reasoning` can't be shaped by how it'll be used; `athlete` can't absorb inference as fact; `understanding` can't go global or be promoted by population priors; `decision-support` can't author claims or own the decision. If the implementation makes *just this one thing* structurally impossible — untraceable or un-gated advice — then the other ten failure modes have nowhere left to do their damage, because they all ultimately surface as a recommendation that shouldn't have been made. Make the bad recommendation unconstructable, and the architecture has done its job.

> **What is the most dangerous architecture shortcut Aurora could take at this stage?**

[ASSUMPTION] **Letting an application service reach across modules and "just compute" a recommendation directly — coordinating *and* reasoning in one place because it's faster than routing through the aggregates and gates.**

This is the most dangerous shortcut because it is the most *tempting* and the most *invisible*. An application service already touches every module to coordinate; adding "and while I'm here, if confidence is high, emit a recommendation" feels efficient and reads like ordinary glue code. But the instant reasoning lives in the coordinator, every invariant guardian is bypassed at once: the gates don't run, the traceability isn't verified at construction, the voice isn't gated, the understanding ceiling isn't consulted, purpose isn't checked — and none of it *looks* wrong, because the service is "supposed to" talk to all those modules anyway. It is failure mode #9 acting as a carrier for #5, #6, and #7 simultaneously. The defense is the rule that application services *coordinate, never reason* — and it must be held even when (especially when) routing through the aggregate feels like ceremony. The ceremony *is* the enforcement.

---

## Success Criterion

> **"Where does each core domain object live, who may depend on whom, and where are Aurora's trust-preserving invariants enforced?"**

[ASSUMPTION] Answerable from this page: **six modules** (`observation` incl. `signal`, `reasoning`, `athlete`, `understanding`, `decision-support`, `shared-kernel`), each owning its aggregate and the policies/projections serving its invariants (§1, §4, §5, §7); **dependencies flow up the epistemic ladder** with explicit forbidden edges (`observation⇏reasoning`, `reasoning⇏decision-support`, `athlete⇏understanding`, `understanding⇏decision-support`) and athlete as a read-only leaf coordinated via the application layer (§2); and **invariants are enforced at construction inside the owning aggregate** — provenance at `observation`, hypothesis integrity at `reasoning`, given-vs-inferred at `athlete`, the per-dimension ceiling at `understanding`, and the gate + traceability invariant at `decision-support` (§6, §10). The three collapses are prevented by dependency direction; traceability and gated voice are enforced at the `decision-support` construction boundary.

---

## Open Questions Carried Forward

1. [QUESTION] Compile-time vs. runtime traceability enforcement — partially resolved (§11); finalize when an implementation language is chosen.
2. [QUESTION] Exact public/internal event split (§8) — validate against the first slice.
3. [QUESTION] Projection refresh mechanism (§5/§11) — deferred to a persistence-architecture paper.
4. [QUESTION] Module granularity under load — `signal`/`observation`, Evidence/Impact, per-dimension understanding (§1) — reversal points noted.
5. [QUESTION] First implementation slice — which behavior ships first (the natural next implementation-architecture paper).
6. [QUESTION] Domain-level carries unaffected by this architecture: stated vs. revealed purpose; depth of purpose-change reinterpretation.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the first Implementation Architecture paper. It maps the domain model to technical boundaries and enforcement points; it defers persistence, language, framework, API, and the first implementation slice.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Architecture Discovery](../architecture/ARCHITECTURE_DISCOVERY.md) · [Core Reasoning](../domain-modeling/CORE_REASONING_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Observation & Signal](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support](../domain-modeling/DECISION_SUPPORT_MODEL.md)*
