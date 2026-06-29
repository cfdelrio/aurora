# Aurora — System Conceptual Map

> The reasoning ladder and its guarantees, at a glance. Faithful reproduction of the
> "Mapa conceptual del sistema" diagram, kept in a version-controllable form and tied to the
> modules actually implemented in `src/modules/`.
>
> **Status (post Implementation 028):** the reasoning core is **implemented end-to-end**, and the
> credential chain now has a **provider-neutral async managed-secret seam**. Implementation 028 added
> **`ManagedSecretStoreClient`** (pure TypeScript async interface; `retrieve(secretName):
> Promise<ManagedSecretResolution>`; always resolves; no cloud SDK; injected in all usage),
> **`ManagedSecretCredentialSource`** (`async toEnvironmentCredentialSource()` — pre-fetch pattern;
> `available` → `{ [secretName]: value }`; non-`available` → `{}` → resolver classifies as `missing` →
> no provider call), 4-state **`ManagedSecretResolution`**, and **`FakeManagedSecretStoreClient`** (4
> deterministic scenarios; sentinel `"opaque:test-managed-secret"`). The downstream synchronous
> `EnvironmentProviderCredentialResolver` is **entirely unchanged**. No cloud SDK, no `process.env`
> read, no dependency, no new module, no live-call enablement. +39 tests; **672/672 pass**;
> `tsc --noEmit` clean; process-env seal intact; operator script unchanged; package.json/lockfile
> unchanged. `secret manager = credential source; ≠ live-call enablement ≠ cloud adapter ≠
> production rollout.`
>
> **Status (post Implementation 027):** the reasoning core is **implemented end-to-end**, and the live
> wiring is now **runnable on demand by an operator**. Implementation 027 added a **manual, executable
> `scripts/operator-live-smoke.mjs`** (plain ESM, **outside `src`/`tsconfig.include`/the default test
> glob/both guard scan roots**; verified runnable via Node 22 native type-stripping, no build/dependency)
> and a **pure, typechecked `src` support helper** (`operator-live-smoke-entrypoint.ts`) that holds the
> env-free, injected logic: `parseOperatorSmokeEnv(env)` (exact `AURORA_LIVE_PROVIDER_SMOKE === "1"` opt-in;
> CI truthy blocks), `syntheticSmokeRenderingRequest()` (synthetic, no athlete-sensitive data),
> `operatorSmokeOutput(result)` (redacted projection: `rawRetained: false`, `wiringOnly`, `sideEffects: "none"`),
> `operatorSmokeExitCode(status)` (0 for `passed`/`not-enabled`/`ci-disabled`; 1 for failures). The script
> reads the real opt-in/CI/endpoint flags **outside `src`** (legitimate there — no in-`src` token added, the
> production `process.env` seal intact), resolves the credential **only** through the approved
> `ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver` chain, wires
> `LiveCallPolicy.enabled` + `LiveProviderClient` + `liveProviderHttpTransport` + the unchanged
> serializer/parser/error-mapper, and **calls `liveProviderSmoke` once** — duplicating no smoke semantics,
> bypassing neither `liveProviderSmoke` nor `requestRealProviderRendering` nor the mandatory `validateDraft`.
> It prints **one redacted JSON object** and exits per the policy. **Manual only** (no npm script, not in
> `npm run check`/the default suite, no CI-live lane), persisting/delivering/recording/orchestrating/mutating
> nothing. The Impl 026 `scripts/` guard was **reconciled (strengthened, not weakened)** to allow only the
> approved `operator-live-smoke.mjs`. **No package/lockfile change, no SDK, no dependency.** Module count
> unchanged. **The operator can now run the wire; the wire still proves wiring, not wisdom.**
>
> **Status (post Implementation 026):** the reasoning core is **implemented end-to-end**.
> All five stages exist in code and Implementation 006 composes them into one demonstrated chain
> whose first full output is `DecisionSupport` with `VoiceMode: Reflection` — not `Recommendation`.
> Implementation 007 added a thin, **Purpose-first `athlete` module**. Implementation 008 made
> **projection freshness explicit** on `UnderstandingAssessment` (non-current freshness only lowers the
> voice, via the existing `SafeVoiceCeiling`). Implementation 009 closed the **AthleteDecision feedback
> loop** — the decision returns as athlete-owned `Observation`, **referenced not owned**, with no
> obedience scoring. Implementation 010 added **persistence ports + in-memory repositories + validated
> `toState()`/`reconstitute()`** so every aggregate round-trips without corrupting invariants,
> traceability, freshness, or ownership — **with no production DB/ORM/schema/event-bus/cache/infrastructure
> chosen**. Implementation 011 added the **dependency-neutral `event-recording` module** — an
> **append-only, ref-only** `DomainEventRecord` log (categories `occurrence`/`outcome`) with a
> `TraceabilityEnvelope`, recording *what happened* **without** becoming a command, copied state, a
> projection, source truth, a bus, or event sourcing — **complementing** the aggregate repositories, not
> replacing them. Implementation 012 added a **neutral check-only reprojection harness** (test-support,
> **not a production module**) that recomputes `UnderstandingAssessment` through the owning module,
> recalculates freshness, detects candidates from event records (context only), and **reports**
> drift/findings — **mutating nothing, executing no event, rebuilding nothing from the log, promoting no
> freshness, and turning no projection into truth**. Implementation 013 added the first real **"data in"**
> boundary — an **`observation`-owned Manual Input Adapter** that records manual input faithfully as an
> `ObservationSet` (verbatim words, explicit missing data, provenance `source: "manual"`, quality),
> persists through `ObservationSetRepository`, and rejects the unrepresentable — **without interpreting,
> detecting a `Signal`, reasoning, mutating athlete records, importing `event-recording`, or triggering
> any downstream effect**. Implementation 014 added the first real **"output out"** boundary — a
> **deterministic `rendering` module** that turns a domain-approved `TerminalOutput` into human-facing text
> via a fake renderer + a **mandatory validator**, preserving voice/uncertainty/limitations/freshness/
> traceability/agency — **without becoming domain authority, selecting voice, escalating tone, inventing a
> fact, mutating an aggregate, or writing an event**. Implementation 015 made the output-out cycle
> **auditable**: an append-only **`RenderedMessageRecord`** + a display-safety **`RenderReview`** + a derived
> **`DisplayEligibility`** (repository port + in-memory adapter, inside `rendering`) — **persistence is
> auditability, not authority**: a record is never domain truth, approval strengthens nothing, rejection
> invalidates nothing, failed attempts are never display-eligible, and nothing emits an event or triggers
> delivery. Implementation 016 added the first **delivery / exposure** boundary — a **new downstream
> `delivery` module** that **exposes** a *display-eligible* `RenderedMessageRecord` to a **deterministic
> test-only sink** and records the attempt as an auditable **`DeliveryRecord`** (repository port + in-memory
> adapter). Delivery **verifies** eligibility via `rendering`'s `displayEligibilityOf(record)` (it never
> re-derives it), calls the sink **only** when eligible *and* the target is the supported `test-sink`, and
> **blocks** every ineligible/unsupported request — **without becoming domain authority, mutating the
> rendered record or any aggregate, emitting an event, or triggering reasoning/reprojection/retry**;
> **delivery success is not evidence and delivery failure is not domain invalidation**. Implementation 017
> added a **provider adapter seam** *inside* `rendering` — a **deterministic fake provider** that replaces
> **only** the draft-text step behind the **unchanged mandatory `validateDraft`**: a provider produces an
> **untrusted `ProviderDraft`**, and a `RenderedMessage` exists **only** if that draft passes the validator;
> an unsafe request is refused **before** the provider call and any provider failure/unsafe draft **degrades
> to safe non-rendering**. The provider **never** selects/changes `VoiceMode`, creates a `TerminalOutput`/
> `Recommendation`/`RenderedMessage`/record, persists/reviews/marks-display-eligible/delivers, emits an
> event, or mutates the domain — and **no real provider SDK/API/network/prompt and no new provider/LLM
> module** exist. Implementation 018 added **provider-attempt audit** *inside* `rendering` — an append-only
> **`ProviderAttemptRecord`** (repository port + in-memory adapter) built by **observing** a
> `ProviderRenderOutcome`: it records a **safe summary** (status + reasons, reusing the real `ProviderFailure`
> + `RenderingFailure` catalogs) and **retains no raw draft** (`rawDraftRetained` literal `false`). The audit
> **does not call** the provider / `requestProviderRendering` / `validateDraft`, **creates no
> `RenderedMessage`/record/review/display-eligibility/delivery**, **appends no event**, and **triggers no
> retry/reprojection/reasoning/mutation**; a **validation failure is not domain invalidation**, provider
> success is not recommendation validation, and provider failure does not weaken support quality — it is
> **auditability, not authority**, not model evaluation, and not telemetry infrastructure. Implementation 019
> added a **real-provider-*ready*** boundary *inside* `rendering` — an **additive async** `ProviderClientBoundary`
> proven with a **deterministic fake in-process client** (the existing **sync** seam is untouched): operational
> **`ProviderSecretRef`s** (never raw secrets), **structured `ProviderInstruction`** material (derived, not a
> prompt template), and a **`ProviderOperationalFailure`** catalog mapped **down** to the existing
> `ProviderFailure` (not expanded). The async `requestRealProviderRendering` **reuses** the unchanged
> `providerRenderingRequestFrom` guard + the mandatory **`validateDraft`** and returns the existing
> `ProviderRenderOutcome` (so the raw-free audit observes it by explicit composition). It is
> **real-provider-*ready*, not real-provider-integrated**: **no real SDK/API/network/secret/prompt**, no
> `process.env`, no automatic persistence, and no review/display/delivery/event/retry/mutation. Implementation 020 added the
> first **selected-provider adapter shell** *inside* `rendering/application`, behind that async
> `ProviderClientBoundary`: the provider target (**OpenAI**) is selected at the **doc/decision level (Tech Spec
> 020A) only**, while code stays **vendor-neutral** (`concrete-provider-*`) so **no negative-capability guard is
> weakened and no vendor token leaks into a guarded file**. A **`ConcreteProviderClient`** is **disabled by
> default** (no transport → safe `provider-unavailable`, no I/O — **no live-call path**; a deterministic in-process
> **fixture transport** exists **only for tests**, never a network call), driving a pure **serializer** (structured
> payload from `ProviderInstruction`; no arbitrary-prompt/chain-of-thought field), a pure **parser** (untrusted draft
> + operational metadata only; empty/malformed → safe failures; no raw payload retained; no `RenderedMessage`), and a
> pure **error mapper** (provider-shaped errors → existing `ProviderOperationalFailure` → existing `ProviderFailure`,
> **not expanded**; unknown → safe). A draft becomes a message **only** via the unchanged `validateDraft`; the
> raw-free audit observes the outcome by explicit composition. It adds **no SDK/package dependency, no network, no
> live call, no API key, no `process.env`, no raw secret, no prompt template**, and **no
> retry/scheduler/record/review/display/delivery/event/domain side effect** — a selected-provider **shell**, not live
> integration. Implementation 021 opened the first **opt-in live-provider boundary** *inside* `rendering/application`,
> behind that same async `ProviderClientBoundary`: a **`LiveProviderClient`** (a sibling of `ConcreteProviderClient`,
> reusing the unchanged serializer/parser/error-mapper) driven by an injected **`LiveCallPolicy`** (disabled by
> default; explicit opt-in; no env inference; no global state), an injected **`ProviderCredentialResolver`** (the
> deterministic **`StaticProviderCredentialResolver`** in tests; **no env resolver, no `process.env`**, a non-secret
> sentinel), and a single **`LiveProviderHttpTransport`** — the **only** file permitted a network token (native
> `fetch` + `AbortSignal.timeout` behind an **injected endpoint**; **no SDK, no dependency/lockfile change**). It
> **fails closed before any transport call** when the policy is disabled or the credential is missing/invalid;
> **never calls `validateDraft`** (validation stays with `requestRealProviderRendering`); provider output is an
> **untrusted draft**; failures map **down** onto the existing `ProviderOperationalFailure → ProviderFailure`
> (**not expanded**); the raw-free audit observes by explicit composition. **No default/CI live call or credential,
> no `process.env`/real secret/prompt template, no retry/scheduler, and no record/review/display/delivery/event/
> domain side effect**; the native-network guard exception is **surgical** (one approved file; vendor/SDK/env
> forbidden everywhere; Impl 019/020 guards untouched), and the sync seam, `FakeProviderAdapter`,
> `FakeProviderClient`, and `ConcreteProviderClient` are untouched — a **live-call-capable** boundary, not a
> production rollout. Implementation 022 added the first **injected environment credential resolver** *inside*
> `rendering/application`, behind the **unchanged** injected `ProviderCredentialResolver` port: an
> **`EnvironmentProviderCredentialResolver`** (a sibling of `StaticProviderCredentialResolver`) reads **exactly one
> explicitly configured key** from an **injected `EnvironmentCredentialSource`** (`Readonly<Record<string,string|undefined>>`)
> — **NOT the real `process.env`**, no scan, no fallback, no domain-derived key name — and classifies absent →
> `missing`; blank/control/too-short → `invalid`; else → `available` with the existing **opaque transient
> `ProviderCredentialToken`**. The **raw secret stays transient** (never in failures/outcome/audit/state/metadata/tests);
> **credential availability is NOT live-call enablement** (a `LiveCallPolicy.disabled()` and a missing/invalid
> credential each still block the transport); it **calls no transport/provider/`validateDraft`**, persists/audits/
> mutates nothing, and **expands no catalog**. **`process.env` appears nowhere in `src/`** — so **no structural-guard
> exception was needed** (no dependency change either); the static resolver, the live transport, the concrete shell,
> and the sync seam are untouched — an injected **operational** resolver, not a production secret manager. Implementation
> 023 added the first **one-file process-environment source adapter** *inside* `rendering/application`: a
> **`ProcessEnvironmentCredentialSourceAdapter`** binds the **real process environment** into that same injected
> `EnvironmentCredentialSource` shape — it **feeds, does not replace,** `EnvironmentProviderCredentialResolver`. It
> reads **exactly one explicitly configured neutral key** (`AURORA_PROVIDER_CREDENTIAL`) via an **injected
> `ProcessEnvironmentAccessor`** (called once), returning a source with only that key when present, else an empty
> source; it **classifies nothing** (the resolver still does; a blank/whitespace key name fails closed). The
> **direct `process.env` token now appears in exactly one production file** (via `defaultProcessEnvironmentAccessor` —
> the only real-environment read site), **sealed by a new repo-wide guard** (no existing guard weakened; the network
> token stays confined to the Impl 021 transport file). Because the accessor is **required** (no implicit default),
> the default suite injects a fake and **reads no real environment**; the production factory's real read is never
> exercised by tests. **Credential availability is still not live-call enablement** (a disabled `LiveCallPolicy` and
> a missing/invalid credential each block the transport); the raw secret stays transient (never in
> errors/outcome/audit/state/metadata/tests); the adapter calls no resolver(unless composed)/live-client/transport/
> provider/`validateDraft`, persists/audits/logs nothing, mutates no domain, expands no catalog, and **adds no
> dependency** — a one-file **operational** source adapter, not a production secret manager. Implementation 024
> closed the **occurrence-history gap** at the output-out edge: `event-recording` gained an **additive
> provider/rendering/delivery occurrence event surface** — catalogs extended with `rendering`/`delivery`
> producing modules, five artifact kinds (`ProviderAttemptRecord`/`RenderedMessageRecord`/`RenderReview`/
> `DeliveryRequest`/`DeliveryRecord`; `DisplayEligibility` stays a ref *role*, not a kind), and eight
> occurrence/outcome `DomainEventType`s — plus **eight pure factories** that build `DomainEventRecord`s through
> the existing `DomainEventRecord.record(...)`. The factories are **ref-only, raw-free, and inert**: they
> reference artifacts by id only, **persist nothing**, **call no provider/transport/validator/renderer/delivery
> sink**, **create no downstream artifact**, **mutate no domain**, and **auto-emit from nothing** (recording is
> explicit application composition). `event-recording` stays **dependency-neutral** (imports only `shared-kernel`;
> rendering/delivery/provider import no `event-recording`); the two earlier "catalog not extended" guards were
> **reconciled, not weakened**. **Events record what happened; they do not make anything happen** — an event is
> never a command/retry/delivery trigger, evidence, recommendation quality, an athlete decision, or a domain
> mutation. Implementation 025 added the first **explicit application orchestration boundary** — a **new
> application-composition module** `application-orchestration` whose one surface, **`orchestrateRenderDeliver(command,
> deps)`**, composes the **existing** public services of `rendering`/`delivery`/`event-recording` in a **fixed,
> explicit order** over **injected** collaborators, returning a **closed `OrchestrationOutcome`** (8 kinds) + a
> **ref-only `OrchestrationTrace`** (10-stage catalog). It is an **application-composition module, NOT a domain
> capability module**: it owns **no domain model, no repository, no persistence of its own**, and introduces **no
> bounded context**. Each step is an **explicit call** (provider rendering → provider-attempt audit + explicit save →
> rendered-message record + explicit save → review + explicit save → derived display eligibility → delivery
> (self-persisting) → Impl 024 occurrence events via `append`); **no event or repository write triggers the next
> step**, **delivery is never automatic** (display eligibility is necessary, not sufficient), a **delivery failure
> does not retry**, and an **event-append failure is a non-invalidating `partial-success`** (the completed domain
> steps stand). The trace/result carry **safe refs only** (no raw draft/prompt/payload/provider-response/secret/env
> value/message body). It imports **only the public indexes** of rendering/delivery/event-recording (+ `shared-kernel`)
> and the `ProviderClientBoundary` **abstraction** — **never** live transport / credential-resolver internals /
> process-env adapter / concrete-provider internals / an upstream domain module; **rendering/delivery/event-recording
> import no `application-orchestration`**. **AC20's `ALLOWED_MODULES` was updated additively** (approved module, not a
> weakening). **`validateDraft` stays the only path to a `RenderedMessage`**; **provider success is not evidence**,
> **delivery success is not an athlete decision**, and **nothing here mutates the domain**. **Composition is explicit;
> it is not a hidden side effect, an event bus, a scheduler, a retry engine, or a workflow engine.** Implementation 026
> added the first **"real outside world" wiring check** — a **pure, fully-injected live-provider smoke-test boundary
> helper** inside `rendering/application`, **`liveProviderSmoke(command, deps)`**, that exercises **one** live provider
> call through the **existing** seam (`requestRealProviderRendering(...) → the unchanged mandatory validateDraft`)
> **only** behind explicit, ordered, **fail-closed gates — opt-in → CI → credential → live policy — each stopping
> before any provider call**; the **credential is resolved only after the opt-in and CI gates pass**, and the call
> runs **only** when the credential is available **and** the policy is enabled. It makes **at most one call (no loops,
> no re-issue)** and returns a **closed, redacted `LiveProviderSmokeResult`** (`rawRetained: false`; 9 closed statuses:
> `not-enabled`/`ci-disabled`/`credential-missing`/`credential-invalid`/`live-policy-disabled`/`provider-failed`/
> `validation-failed`/`passed`/`unexpected-failure`) — **no rendered body, no raw draft/prompt/payload/response, no
> secret/credential token, no `process.env` value, no metadata bag**. It is **not an operator script** (none exists;
> **no npm script, no `scripts/`**); it **reads no `process.env`** (opt-in/CI injected; credential via the injected
> resolver); it composes the live client through the **injected `ProviderClientBoundary`** and imports **no** live HTTP
> transport / process-env adapter / concrete-provider internals / `delivery` / `event-recording` /
> `application-orchestration` / upstream-domain module; **no module outside `rendering` imports it**. It **persists
> nothing, delivers nothing, records no event, derives no display eligibility for delivery, creates no rendered-message
> record / review / evidence / athlete decision, and mutates no domain**. The **default suite and CI make no live call
> and need no credential**; the repo-wide `process.env` one-file guard and the live-provider guard (which catches
> `live-provider-smoke.ts`) stay green; **AC20 is untouched** (no new module). **A smoke test proves wiring, not
> wisdom; smoke success is not evidence and smoke failure is not domain failure.** The operator live-smoke entrypoint
> is **realized (Impl 027)**. The remaining
> absences (**a production orchestration *entrypoint* (UI/API/scheduler) that invokes the composition**/**real
> provider/channel/UI/API**/**real LLM provider & prompts**/external FIT
> ingestion/**auto-emission, an event bus, or persistence for the (now-existing, ref-only) provider/rendering/
> delivery occurrence event surface**/**production persistence & event store**/**scheduler & retry**/**full**
> athlete model/**generic projection engine**/**full
> DecisionOutcome**/**production reprojection service & projection repository**/**event sourcing**/production
> service) are **intentional**, not gaps. See
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
    subgraph ATH["Athlete (context, not a stage) — Purpose ✅ Impl 007 · AthleteDecision ✅ Impl 009"]
      A2["Purpose (declarado, versionado, append-only)<br/>PurposeHistory · PurposeVersion · PurposeChanged"]
      AD["AthleteDecision (athlete-owned, append-only) ✅ Impl 009<br/>DecisionChoice · DecisionRationale · DecisionContext<br/>DecisionOutcomeRef (solo referencia) · amend/supersede<br/>divergedFromSupport = hecho neutral, NO score"]
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

    MIN["Entrada manual ✅ Impl 013 (observation/application)<br/>ManualInputSubmission → ingestManualInput<br/>accepted / partially-accepted / rejected<br/>palabras verbatim · missing data explícito · provenance source manual<br/>persiste vía ObservationSetRepository<br/>NO UI/API/LLM · NO interpreta · NO Signal · NO downstream"]
    MIN -- "registra fielmente como ObservationSet (NO significado, NO Signal)" --> O

    O --> S --> R --> U
    U -. "proyecta (derivado, no fuente de verdad)" .-> UA
    UA -. "freshness clampa SafeVoiceCeiling → gate existente" .-> D
    D --> OUT
    REND["Rendering ✅ Impl 014 (downstream, NO dominio)<br/>RenderableDomainOutput (proyección read-only)<br/>fake renderer determinístico + validator OBLIGATORIO<br/>preserva voz/incertidumbre/limitaciones/freshness/traza/agencia<br/>voz puede igualar o suavizar, NUNCA escalar<br/>NO autoridad · NO selecciona voz · NO muta · NO evento · NO persiste"]
    HUMAN["Texto humano (presentación)<br/>RenderedMessage — NO es fuente de verdad"]
    OUT -- "presentación: expresa el TerminalOutput (no decide, no escala voz)" --> REND
    PROV["Provider seam ✅ Impl 017 (DENTRO de rendering, fake/test-only)<br/>FakeProviderAdapter determinístico · reemplaza SOLO el paso draft-text<br/>ProviderRenderingRequest (constrained: sin chain-of-thought / handle / override)<br/>ProviderDraft = texto NO confiable · NO selecciona voz · NO crea TerminalOutput/Recommendation<br/>request inseguro → rechazado ANTES de llamar al provider<br/>NO SDK/API/network/prompt · NO persiste/review/display/delivery/evento/dominio"]
    PROV -- "draft NO confiable → validateDraft OBLIGATORIO (la autoridad)" --> REND
    PROV -. "provider failure / draft inseguro → safe non-rendering (sin RenderedMessage)" .-> PROV
    PAUD["Provider attempt audit ✅ Impl 018 (DENTRO de rendering)<br/>auditProviderAttempt OBSERVA el ProviderRenderOutcome (no llama provider/validateDraft)<br/>ProviderAttemptRecord = safe summary (status + reasons reales)<br/>SIN raw draft (rawDraftRetained literal false) · repository port + in-memory adapter<br/>auditabilidad, NO autoridad · NO crea RenderedMessage/record/review/display/delivery<br/>NO evento · NO retry/reprojection · validation failure ≠ invalidación de dominio"]
    PROV -. "observa el outcome del intento (auditoría, no llama al provider)" .-> PAUD
    RPROV["Real-provider-ready boundary ✅ Impl 019 (DENTRO de rendering, additive)<br/>async ProviderClientBoundary + FakeProviderClient determinístico (in-process)<br/>ProviderInstruction estructurada (derivada, NO prompt template)<br/>ProviderSecretRef operacional (status + ref opaco, NUNCA secret crudo)<br/>ProviderOperationalFailure → mapea DOWN a ProviderFailure (no expande)<br/>requestRealProviderRendering: reusa providerRenderingRequestFrom + validateDraft<br/>cambia SOLO el draft source · sin SDK/red/API key/process.env/prompt real<br/>seam sync intacto · sin persistencia/review/display/delivery/evento/retry automáticos"]
    RPROV -- "draft NO confiable → MISMO validateDraft OBLIGATORIO → ProviderRenderOutcome" --> REND
    RPROV -. "outcome observable por PAUD vía composición explícita (raw-free)" .-> PAUD
    CPROV["Concrete-provider adapter shell ✅ Impl 020 (DENTRO de rendering/application)<br/>proveedor elegido SOLO a nivel doc/decisión (OpenAI, 020A) · código NEUTRAL concrete-provider-*<br/>ConcreteProviderClient implementa ProviderClientBoundary · DISABLED BY DEFAULT (safe failure, sin I/O)<br/>sin live call · fixture transport determinístico SOLO en tests (NO red)<br/>serializer (payload estructurado, NO prompt arbitrario) · parser (draft NO confiable + metadata operacional, sin raw payload)<br/>error-mapper → ProviderOperationalFailure → ProviderFailure (NO expande) · unknown → safe<br/>sin SDK/dependencia · sin secret/process.env/prompt template · sin guard debilitado · sin side effects"]
    CPROV -- "es el client del camino async (Impl 019); draft NO confiable → MISMO validateDraft" --> RPROV
    LPROV["Opt-in live-provider boundary ✅ Impl 021 (DENTRO de rendering/application)<br/>LiveProviderClient implementa ProviderClientBoundary · sibling de ConcreteProviderClient<br/>LiveCallPolicy DISABLED BY DEFAULT · opt-in explícito · sin inferencia de entorno · sin estado global<br/>ProviderCredentialResolver inyectado · StaticProviderCredentialResolver determinístico (tests) · SIN env resolver · SIN process.env<br/>fail-closed ANTES del transport si policy disabled / credential missing/invalid<br/>LiveProviderHttpTransport = ÚNICO archivo con token de red (fetch nativo, endpoint inyectado) · SIN SDK · SIN dependency<br/>reusa serializer/parser/error-mapper · NO llama validateDraft · failures → ProviderOperationalFailure → ProviderFailure (NO expande)<br/>sin live call default/CI · sin secret/prompt · sin retry/scheduler · sin record/review/display/delivery/evento/dominio"]
    LPROV -- "es otro client del camino async; draft NO confiable → MISMO validateDraft (la autoridad)" --> RPROV
    ENVCRED["Injected environment credential resolver ✅ Impl 022 (DENTRO de rendering/application)<br/>EnvironmentProviderCredentialResolver implementa ProviderCredentialResolver · sibling de StaticProviderCredentialResolver<br/>fuente INYECTADA EnvironmentCredentialSource (Readonly Record) · NO process.env real · NO scan · NO fallback · NO key derivada de dominio<br/>lee EXACTAMENTE una key configurada · absent→missing · blank/control/too-short→invalid · else→available<br/>available → ProviderCredentialToken opaco transitorio · secreto crudo NUNCA en failures/outcome/audit/state/metadata/tests<br/>disponibilidad ≠ live-call enablement · NO transport/provider/validateDraft · NO persistencia/evento/dominio · SIN guard exception"]
    ENVCRED -- "provee ProviderCredentialResolution al client (inyectado donde va el static)" --> LPROV
    PENVADP["One-file process-environment source adapter ✅ Impl 023 (DENTRO de rendering/application)<br/>ProcessEnvironmentCredentialSourceAdapter · ALIMENTA, no reemplaza, EnvironmentProviderCredentialResolver<br/>ProcessEnvironmentAccessor INYECTADO (fake en tests) · defaultProcessEnvironmentAccessor = ÚNICO read real de process env<br/>token directo de process env SELLADO en exactamente un archivo aprobado (guard repo-wide nuevo)<br/>lee EXACTAMENTE una key aprobada (AURORA_PROVIDER_CREDENTIAL) · accessor llamado una vez · sin scan · sin fallback<br/>presente → source con solo esa key · ausente → source vacío · NO clasifica (el resolver clasifica)<br/>secreto crudo transitorio · sin real env en tests · sin live-call enablement · sin dependency · sin side effects"]
    PENVADP -- "produce EnvironmentCredentialSource (real env → shape inyectado); el resolver clasifica" --> ENVCRED
    REND --> HUMAN
    RREC["Registro/Review de presentación ✅ Impl 015 (dentro de rendering)<br/>RenderedMessageRecord (append-only, auditable)<br/>RenderReview (display-safety) · status derivado<br/>DisplayEligibility derivada (no delivery, no aprobación de dominio)<br/>repository port + in-memory adapter<br/>auditabilidad, NO autoridad · NO muta dominio · NO evento · NO delivery"]
    REND -- "registra/revisa artefacto de presentación (auditoría, no autoridad)" --> RREC
    DELIV["Delivery / Exposición ✅ Impl 016 (módulo downstream, NO dominio, NO rendering)<br/>requestDelivery · verifica displayEligibilityOf(record) (NO re-deriva)<br/>solo expone records display-eligible · DeliveryTarget cerrado (solo test-sink soportado)<br/>InMemoryTestSink determinístico (NO provider/canal real)<br/>DeliveryOutcome/FailureReason cerrados · bloquea no-elegibles/target no soportado<br/>importa solo shared-kernel + rendering read-only · NO event-recording"]
    DREC["DeliveryRecord (auditable) ✅ Impl 016<br/>repository port + in-memory adapter (mutation isolation)<br/>auditabilidad, NO autoridad · éxito ≠ evidencia · fallo ≠ invalidación de dominio<br/>NO muta rendered record/dominio · NO evento · NO retry/reprojection"]
    RREC -- "expone SOLO si display-eligible (lectura; NO muta, NO aprueba dominio)" --> DELIV
    DELIV -- "registra intento/resultado (auditoría, no autoridad)" --> DREC
    OUT -. "el atleta decide (referenciado, no poseído): DecisionSupportCase guarda solo AthleteDecisionRef" .-> AD
    AD -. "AthleteDecision → SubjectiveObservation (adapter neutral); NO obediencia, NO score, NO Evidence directo" .-> O

    ATH -. context .-> O
    A2 -. "PurposeVersionRef como contexto (Hypothesis.purposeContextRef), no evidencia" .-> R
    A2 -. "PurposeChanged → staleness selectiva (vía adapter), no mutación directa" .-> U
    A2 -. "Purpose → purposeContext; PurposeGate exige alineación con purpose actual" .-> D

    subgraph SEAMS["Support seams (no son etapas del razonamiento)"]
      PERSIST["Persistencia ✅ Impl 010<br/>repository ports + in-memory adapters<br/>toState()/reconstitute() validado<br/>guarda el estado del aggregate (copias, no refs vivas)<br/>responde: ¿qué ES el aggregate ahora?"]
      EVREC["event-recording ✅ Impl 011 · superficie output-out ✅ Impl 024<br/>DomainEventRecord (occurrence/outcome) · catálogo cerrado (34 tipos: 26 core + 8 output-out)<br/>TraceabilityEnvelope · EventPayloadRef (ref-only)<br/>+ Impl 024 (aditivo): ProducingModule += rendering/delivery (NO módulo provider)<br/>+ EventArtifactKind += ProviderAttemptRecord/RenderedMessageRecord/RenderReview/DeliveryRequest/DeliveryRecord (DisplayEligibility = role, NO kind)<br/>+ 8 factories PURAS (vía DomainEventRecord.record) · ref-only · raw-free · NO persisten · NO llaman provider/transport/validator/renderer/sink · NO crean artefacto · NO mutan · NO auto-emit<br/>composición explícita (NO bus) · referencia por string-kind NO es import cross-module<br/>log append-only · causation=linaje / correlation=grupo<br/>responde: ¿qué PASÓ? — NO comando, NO bus, NO ejecución, NO evidencia/calidad/decisión/retry/delivery"]
      REPRO["reprojection-harness ✅ Impl 012<br/>(test-support neutral, NO módulo productivo)<br/>check-only · recompute UnderstandingAssessment vía understanding<br/>recalcula freshness · detecta candidatos desde event records (contexto)<br/>reporta drift/findings · NO muta, NO ejecuta, NO reconstruye, NO promueve<br/>responde: ¿qué vistas derivadas recomputar / marcar stale?"]
    end

    subgraph ORCHL["Application composition (NO dominio · NO stage · NO bus) ✅ Impl 025"]
      ORCH["application-orchestration ✅ Impl 025<br/>orchestrateRenderDeliver(command, deps) — ÚNICA superficie de composición explícita<br/>compone servicios EXISTENTES en orden fijo sobre colaboradores INYECTADOS<br/>OrchestrationOutcome (cerrado, 8 kinds) · OrchestrationTrace (ref-only, 10 stages)<br/>NO domain model · NO repository · NO persistencia propia · NO bounded context<br/>cada paso = llamada explícita · NINGÚN evento/save dispara el siguiente paso<br/>delivery NUNCA automático (display-eligibility necesaria, NO suficiente) · delivery failure NO retry<br/>event-append failure → partial-success (NO invalida los pasos de dominio)<br/>importa SOLO índices públicos (+ shared-kernel) + ProviderClientBoundary (abstracción)<br/>NO live transport/credential-resolver/process-env/concrete-provider internals · NO muta dominio<br/>NO event bus · NO scheduler · NO retry · NO workflow engine · NO side effect oculto"]
      ORES["OrchestrationOutcome + OrchestrationTrace<br/>(solo refs seguras: ids string / enums cerrados / códigos seguros)<br/>NO draft/prompt/payload/secret/env value/cuerpo de mensaje"]
    end
    ORCH -- "1 · llamada explícita (real-provider-ready)" --> RPROV
    ORCH -- "2 · llamada explícita: auditProviderAttempt + save explícito" --> PAUD
    ORCH -- "3 · crea RenderedMessageRecord + save · 4 · appendReview + save · 5 · displayEligibilityOf (derivado, no aserción)" --> RREC
    ORCH -- "6 · SOLO si elegible: deliveryRequest + requestDelivery (auto-persiste)" --> DELIV
    ORCH -- "7 · registra ocurrencias (factories Impl 024) + eventRepository.append (paso terminal, no disparador)" --> EVREC
    ORCH -- "devuelve (solo refs)" --> ORES

    subgraph SMOKEL["Live-provider smoke-test + operator entrypoint (operational WIRING CHECK · NO dominio · NO stage) ✅ Impl 026 · ✅ Impl 027"]
      SMOKE["liveProviderSmoke(command, deps) ✅ Impl 026 (DENTRO de rendering/application)<br/>WIRING CHECK puro/injectado · NO npm script<br/>gates fail-closed EN ORDEN: opt-in → CI → credential → live policy (cada uno PARA antes de cualquier provider call)<br/>credential se resuelve SOLO tras opt-in+CI · call SOLO si credential available + policy enabled<br/>opt-in/CI = indicadores INYECTADOS (NO lee process.env) · resolver/policy/client INYECTADOS<br/>UNA sola call (sin loops, sin re-issue) vía requestRealProviderRendering → validateDraft OBLIGATORIO<br/>NO importa live transport / process-env adapter / concrete provider / delivery / event-recording / application-orchestration<br/>NO persiste · NO entrega · NO evento · NO evidence · NO athlete decision · NO muta dominio<br/>suite default + CI: SIN live call, SIN credential"]
      SMOKERES["LiveProviderSmokeResult (cerrado, REDACTED) ✅ Impl 026<br/>status (9 cerrados) · validationPassed? · providerFailureCode? · reason? · durationMs? · rawRetained: false<br/>NO rendered body · NO draft/prompt/payload/response · NO secret/token · NO process env value · NO metadata bag"]
      OPENTRY["scripts/operator-live-smoke.mjs ✅ Impl 027 (FUERA de src/ · ESM plano · MANUAL ONLY)<br/>FUERA de tsconfig.include / test glob / ambos guard scan roots · Node 22 type-stripping (sin build, sin dependency)<br/>helper src puro (operator-live-smoke-entrypoint.ts): parseOperatorSmokeEnv / syntheticSmokeRenderingRequest<br/>operatorSmokeOutput (redacted: rawRetained:false · wiringOnly · sideEffects:none) · operatorSmokeExitCode<br/>script lee flags reales FUERA de src/ (opt-in/CI/endpoint) · credential SOLO vía adapter chain aprobado<br/>wires LiveCallPolicy.enabled + LiveProviderClient + liveProviderHttpTransport<br/>llama liveProviderSmoke UNA vez · imprime UN JSON redactado · sale 0/1<br/>NO npm script · NO en suite/CI · NO persiste/entrega/registra/orquesta/muta<br/>guard Impl 026 reconciliado (reforzado): SOLO permite operator-live-smoke.mjs"]
      OPOUT["OperatorSmokeOutput (redacted) ✅ Impl 027<br/>status · rawRetained:false · wiringOnly · sideEffects:none · validationPassed? · providerFailureCode? · reason?<br/>exit 0: passed/not-enabled/ci-disabled · exit 1: credential/provider/validation/unexpected failures<br/>NO rendered body · NO secret · NO env value · wiring success ≠ product readiness"]
    end
    SMOKE -- "UNA call explícita (SOLO tras los gates) → MISMO validateDraft OBLIGATORIO" --> RPROV
    SMOKE -- "mapea outcome → resultado seguro (solo refs/códigos)" --> SMOKERES
    OPENTRY -- "llama liveProviderSmoke UNA vez (los gates y la redacción pertenecen al helper)" --> SMOKE
    OPENTRY -- "imprime resultado redactado (un único JSON)" --> OPOUT

    LADDER["Etapas 1–5 + Athlete (ocurrencias)"]
    O -.- LADDER
    D -.- LADDER
    AD -.- LADDER
    LADDER -. "ocurrencias → registro (append-only, ref-only); NO ejecuta nada" .-> EVREC
    LADDER -. "aggregates ⇄ estado (round-trip validado)" .-> PERSIST
    EVREC -. "complementa, NO reemplaza, los repositories" .- PERSIST
    PERSIST -. "estado actual del aggregate (read)" .-> REPRO
    EVREC -. "candidatos/contexto (NO replay, NO comando, NO rebuild)" .-> REPRO
    REPRO -. "recompute vía understanding (no razona, no muta)" .- U
    REPRO -. "reporta drift/freshness/findings (no overwrite, no output)" .-> REPRO
```

[FACT] **Reprojection is a neutral, check-only support seam (Implementation 012), not a stage and not a
production module.** It lives under `src/modules/__tests__/reprojection-harness/`. It answers *"given
current aggregate/source state and occurrence history, what derived views should be recomputed or
considered stale?"* — it **recomputes** `UnderstandingAssessment` **through the owning `understanding`
function** (it coordinates, it does not reason), **recalculates** the 5-state freshness (re-deriving only
the **same or a more cautious** view — never promoting), reads **event records as candidates/context
only**, and **reports** drift/findings. The dashed edges into it are **reads**, not control flow: a run
**executes no event, rebuilds no aggregate from the log** (empty repos → `event-record-only`/
`missing-source`), **mutates no repository**, and creates **no** `TerminalOutput`/recommendation/
`SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord`. `check-only` is the only implemented
mode; `refresh-derived`/`mark-stale` are reserved and throw. There is **no production `reprojection`
module, scheduler, event sourcing, or projection repository**.

[FACT] **Manual Input Adapter — the first real "data in" boundary (Implementation 013).** It lives in
`observation/application` and is an **ingress into `ObservationSet`**, drawn *before* Observation/Signal/
Reasoning. It records manual input **faithfully** — verbatim subjective `words`, **explicit** missing
data, **provenance** (`source: "manual"`) and quality — via the existing `recordObservationSet`, and
persists **only** through `ObservationSetRepository`. Its outcomes are `accepted` / `partially-accepted`
(faithful entries only + reported limitations) / `rejected` (saves nothing). The ingress arrow shows
**faithful recording, not interpretation**: there is **no arrow** from manual input to `Signal`,
`Evidence`, `Hypothesis`, `Understanding`, or `DecisionSupport`; the adapter **detects no `Signal`**,
**infers nothing** (no fatigue/readiness/impact), **invents no value**, **mutates no `AthleteDecisionRecord`**,
and **imports no downstream module or `event-recording`**. An optional `ObservationSetRecorded` is composed
**only in a neutral harness** from a **ref-only** event candidate — neutral, not command execution. There
is **no UI/API/LLM/external integration**. *Manual input is source material, never meaning.*

[FACT] **Rendering — the first real "output out" boundary (Implementation 014).** It lives in
`src/modules/rendering` and sits **downstream of `decision-support`**, drawn *after* the `TerminalOutput`.
`decision-support` owns the `TerminalOutput` and the `VoiceMode`; rendering owns **phrasing only**: it reads
a **read-only `RenderableDomainOutput`** projection and produces human-facing text via a **deterministic
fake renderer** (no provider, no model, no randomness) that **must pass a mandatory validator** before
becoming a `RenderedMessage`. The presentation arrow from the terminal output to rendering is **one-way**:
there is **no arrow back** to Observation/Reasoning/Understanding/DecisionSupport, **no mutation** of any
aggregate, and **no event-writing** arrow. **Voice may match or soften, never escalate**; `Inquiry` stays a
question; `Withholding` stays a refusal; `Recommendation` preserves conditions/uncertainty/traceability/
agency; invented facts/citations, hidden uncertainty/limitations, unsupported style/locale, and unsafe
athlete-state/purpose/compliance language are **rejected** (safe non-render). A `RenderedMessage` is **not
domain authority** — not `Evidence`/`Observation`/`Understanding`/`AthleteDecision`, not source truth (it
re-enters only if the athlete separately reports it via the manual adapter). There is **no real LLM
provider, prompt template, UI, API, or external call**. *Generated text is a presentation artifact, never authority.*

[FACT] **Rendered-message record / review — the first auditable output-out cycle (Implementation 015).**
**Inside `rendering`** (not a new module), downstream of the renderer: an **append-only `RenderedMessageRecord`**
(auditable presentation artifact that **preserves the source domain output ref**, terminal-output kind,
`VoiceMode`, validation/preservation flags, renderer kind, `createdAt`), an **append-only `RenderReview`**
history (closed 5-decision / 11-reason catalogs; **display-safety only**) with **derived** current status,
and a **derived `DisplayEligibility`** (rendered + `approved-for-display` + not superseded + source ref +
flags intact). It lives behind a **repository port + in-memory adapter** (deep-copy round-trip, mutation
isolation, validated reconstitution). The audit/review edge is **one-way**: **no arrow back** to the domain,
**no mutation** of any output, **no event-writing** arrow, **no delivery**. **Persistence is auditability,
not authority**: a record is **not** domain truth (`≠ Observation/Evidence/Understanding/DecisionSupport/
AthleteDecision`); **approval** changes no `VoiceMode`/traceability/freshness/`SupportQuality` and creates no
`Recommendation`; **rejection** invalidates nothing; **failed** attempts are auditable but never
display-eligible/approvable; **revision/supersession** preserve the old record (no overwrite, no deletion);
**display eligibility is not delivery**. **`rendering` imports no `event-recording` and auto-emits nothing**
(a `RenderedMessageRecord`/`RenderReview` may now be **referenced by id** in a ref-only `event-recording`
event — Impl 024 — but `rendering` neither creates nor emits one), the repo is **in-memory** (no production
DB), and there is **no delivery/UI/API/provider**.
*Persisting or approving rendered text improves auditability and display safety only.*

[FACT] **Delivery — the first exposure boundary (Implementation 016).** A **new downstream `delivery`
module** (`src/modules/delivery`), drawn *after* rendered-message record/review/display-eligibility. It is
**exposure, not rendering and not domain**: `rendering` owns display eligibility; delivery only **attempts
to expose** an *already display-eligible* `RenderedMessageRecord` to a target and records the attempt.
`requestDelivery` **verifies** eligibility by calling `rendering`'s `displayEligibilityOf(record)` — it
**does not re-derive or reinterpret** it — and the deterministic **`InMemoryTestSink`** is called **only**
when the record is eligible *and* the target is the supported **`test-sink`**; **not-reviewed / rejected /
superseded / failed-render / missing-ref** records and **unsupported/reserved targets** are **blocked**
without calling the sink (raw rendering reasons retained, mapped to a closed `DeliveryFailureReason`). The
exposure edge is **one-way**: **no arrow back** to Observation/Reasoning/Understanding/DecisionSupport/
Rendering, **no mutation** of the rendered record or any aggregate, **no event-writing** arrow. A
**`DeliveryRecord`** is **auditability, not authority** — not source truth / `Evidence` / `Observation` /
`Understanding` / `DecisionSupport` / `AthleteDecision`; **delivery success is not evidence** and **delivery
failure is not domain invalidation**; the audit repo is a **port + in-memory adapter** (mutation isolation,
validated reconstitution). **`delivery` imports only `shared-kernel` + read-only `rendering`** (no
`event-recording`) **and auto-emits nothing** (a `DeliveryRequest`/`DeliveryRecord` may now be **referenced by
id** in a ref-only `event-recording` event — Impl 024 — but `delivery` neither creates nor emits one), and
there is **no real provider/channel, UI/API, scheduler, retry, or event bus**. *A delivered message is still a
presentation artifact, never authority; exposing it never makes it true.*

[FACT] **Provider adapter seam — the safest way to add a generation provider (Implementation 017).**
*Inside* `rendering` (not a new module), the provider seam replaces **only** the draft-text step the
`FakeRenderer` performs: `requestProviderRendering` builds a **constrained `ProviderRenderingRequest`** from
the authoritative `RenderingRequest` (carrying only domain-approved fields — no raw reasoning, no
chain-of-thought, no mutable handle, no override-voice/hide-uncertainty/prompt-injection field), asks a
`ProviderAdapter` (the deterministic **`FakeProviderAdapter`**) for an **untrusted `ProviderDraft`**, and
feeds that draft into the **unchanged mandatory `validateDraft({ draft, renderable, request })`**. **A
`RenderedMessage` exists only if the validator passes** — the provider can never construct one. The seam is
**one-way and constrain-only**: an **unsafe request is refused before the provider call** (closed
`ProviderFailure`: `unsupported-style`/`unsupported-locale`/`unsafe-provider-request`), a provider failure
maps to a closed reason (`provider-unavailable`/`-timeout`/`-rate-limited` are **fake-configurable**, no real
semantics), and a **validation failure** maps to `provider-output-failed-validation` with the underlying
`RenderingFailure[]` — **every** failure path **degrades to safe non-rendering**. The provider **selects no
voice**, creates no `TerminalOutput`/`Recommendation`/`RenderedMessage`/`RenderedMessageRecord`, and
**persists/reviews/marks-display-eligible/delivers/emits-an-event/mutates nothing**; there is **no arrow**
from the provider to DecisionSupport/Observation/Reasoning/Understanding/Athlete, to the record/review, to
display eligibility, or to delivery. The seam imports only its own `rendering` surfaces + read-only
`decision-support` *types*; **no module outside `rendering` imports it**, and there is **no real provider
SDK/API/network/prompt and no `provider`/`llm` top-level module**. *A provider drafts; the validator decides;
the domain stays the source of truth.*

[FACT] **Provider attempt audit — remembering the attempt, never the draft (Implementation 018).** *Inside*
`rendering` (not a new module), the audit **observes** an already-computed `ProviderRenderOutcome` and records
an append-only **`ProviderAttemptRecord`** behind a **repository port + in-memory adapter**. `auditProviderAttempt`
is a **pure mapping** — it **does not call** `requestProviderRendering` / `ProviderAdapter` / `validateDraft`
(observe-only) — that classifies the outcome into a closed status (`validation-passed` / `validation-failed` /
`provider-failed` / `unsafe-request-blocked`; `requested`/`draft-produced` reserved) and captures a **safe
summary**: refs (renderable/source ref, terminal-output kind, domain `VoiceMode`), provider adapter kind, and
**reasons reusing the real `ProviderFailure` + `RenderingFailure` catalogs** (no invented parallel catalog).
**No raw draft is retained** — `ProviderDraftSummary` is reason/count-based, `rawDraftRetained` is the literal
`false`, and reconstitution **rejects** any `draft`/`text`/`content`/`prompt` field or `rawDraftRetained: true`.
The audit is **one-way and auditability-not-authority**: a `ProviderAttemptRecord` is **not** a `ProviderDraft`
/ source truth / `Evidence` / `Observation` / `Understanding` / `AthleteDecision` / `DecisionSupport` /
`TerminalOutput` / `RenderedMessage` / `RenderedMessageRecord`; there is **no arrow** from it back to the
provider/validator, to the domain, to the rendered-message record/review, to display eligibility, or to
delivery; it **appends no event** and **triggers no retry/reprojection/reasoning/mutation**. A **validation
failure is not domain invalidation**, provider success is not recommendation validation, and provider failure
does not weaken `SupportQuality`. It imports only its own `rendering` surfaces + read-only `decision-support`
*types*; **no module outside `rendering` imports it**; and there is **no `event-recording` import and no
auto-emit** (a `ProviderAttemptRecord` may now be **referenced by id** in a ref-only `event-recording` event
— Impl 024 — but the audit neither imports `event-recording` nor emits one), **no real provider
SDK/network/prompt, model evaluation, or telemetry infrastructure**. *The audit
remembers what the seam did; the draft never becomes authority.*

[FACT] **Real-provider-ready boundary — preparing for a real mouth without touching one (Implementation
019).** *Inside* `rendering` (not a new module), an **additive async** path makes a real provider *pluggable*
while **changing only the draft source** — the existing **synchronous** seam (`ProviderAdapter`/
`FakeProviderAdapter`/`requestProviderRendering`) is **untouched**. An async **`ProviderClientBoundary`** (the
only place network/SDK/secret concerns would ever live) is proven with a **deterministic `FakeProviderClient`**
(in-process; no real provider). A **`ProviderSecretRef`** carries only a `ProviderCredentialStatus`
(`present`/`missing`/`invalid`) + an opaque ref — **never a raw secret** (no secret in records/responses/
errors; no `process.env`); a **`ProviderInstruction`** is **structured and derived** from the constrained
`ProviderRenderingRequest` (no prompt template, no arbitrary prompt text, no chain-of-thought); a
**`ProviderOperationalFailure`** catalog maps **down** to the existing `ProviderFailure` (**not expanded**) via
`toProviderFailure`. The async **`requestRealProviderRendering`** **reuses** the unchanged
`providerRenderingRequestFrom` guard (rejecting unsafe requests **before** any client call), a **credential
fast-path** (a non-`present` secret fails safely before the call), and the **same mandatory `validateDraft`**;
it returns the **existing `ProviderRenderOutcome`** — so the Impl 018 raw-free audit observes a real attempt
**unchanged** (by explicit composition; **no automatic persistence**). The boundary is **one-way and
constrain-only**: **no arrow** to Observation/Reasoning/Understanding/Athlete/`event-recording`/`delivery`, to
the rendered-message record/review, to display eligibility, or to delivery; provider output is **untrusted
draft text** (only `validateDraft` makes a message); **provider metadata is operational, not evidence**; every
failure **degrades to safe non-rendering** with **no automatic retry**; and there is **no review/display/
delivery/event/domain-mutation** side effect. It imports only its own `rendering` surfaces + read-only
`decision-support` *types*; **no module outside `rendering` imports it**; and there is **no real provider
SDK/API/network/`process.env`/prompt-template** and **no `provider`/`llm`/`telemetry`/`evaluation` top-level
module**. *This is real-provider-**ready**, not real-provider-**integrated**: a real provider changes the draft
source, never the authority model.*

[FACT] **Concrete-provider adapter shell — selecting a vendor in docs, staying neutral in code (Implementation
020).** *Inside* `rendering/application` (not a new module), the **first selected-provider adapter** plugs into
the Impl 019 async `ProviderClientBoundary`: a **`ConcreteProviderClient`** plus a pure
**`serializeProviderInstruction`**, **`parseProviderResponse`**, and **`mapProviderError`**. The provider target
(**OpenAI**) is recorded at the **doc/decision level (Tech Spec 020A) only**; production/test code stays
**vendor-neutral** (`concrete-provider-*`, `providerKind: "concrete"`) so **no negative-capability guard is
weakened and no vendor token (`openai`/`anthropic`) appears in a guarded provider file**. The client is **disabled
by default** — with no transport it returns a safe `provider-unavailable` and does **no work** (there is **no
live-call code path**); a non-`present` `ProviderSecretRef` fails safe (`missing-`/`invalid-credential`) **before**
any transport; the only non-default behavior is a **deterministic in-process fixture transport used only by tests**
(never a network call). The **serializer** projects **only** safe constraints (terminal-output kind, voice, style,
locale, allowed/forbidden claims, uncertainty visibility, limitations, traceability, maxLength) — it has **no field**
for an arbitrary prompt, chain-of-thought, hidden reasoning, voice override, or secret (unrepresentable; **no prompt
template / `src/prompts`**). The **parser** returns an **untrusted draft + operational metadata only** (empty →
`provider-returned-empty-response`, malformed → `provider-returned-malformed-response`; **no raw payload retained**;
it **never** builds a `RenderedMessage`; metadata is operational, never evidence). The **error mapper** maps
provider-shaped errors to the existing `ProviderOperationalFailure`, which `toProviderFailure` maps **down** to the
existing `ProviderFailure` (**not expanded**; unknown → safe `provider-unavailable`, no leak). A draft becomes a
message **only** via the unchanged `requestRealProviderRendering` → **`validateDraft`**, and the Impl 018 raw-free
audit observes the outcome by **explicit composition** (no automatic persistence). There is **no arrow** from the
shell to Observation/Reasoning/Understanding/Athlete/`event-recording`/`delivery`, to the record/review, to display
eligibility, or to delivery; it imports only its own `rendering` surfaces + read-only `decision-support` *types*,
**no module outside `rendering` imports it**, and there is **no installed SDK/package dependency**
(`package.json`/lockfile unchanged), **no network/`process.env`/raw secret**, and **no
retry/scheduler/record/review/display/delivery/event/domain side effect**. *A selected-provider **shell** prepares
the vendor deterministically; it is not a live integration, and it weakens nothing.*

[FACT] **Opt-in live-provider boundary — a real call only when explicitly enabled (Implementation 021).** *Inside*
`rendering/application` (not a new module), the first live-call edge plugs into the Impl 019 async
`ProviderClientBoundary`: a **`LiveProviderClient`** (a **sibling** of `ConcreteProviderClient`, reusing the
unchanged `serializeProviderInstruction`/`parseProviderResponse`/`mapProviderError`) driven by an injected
**`LiveCallPolicy`** (disabled by default; explicit opt-in; **never inferred from the environment**; no global
state), an injected **`ProviderCredentialResolver`** (the deterministic **`StaticProviderCredentialResolver`** in
tests/composition; **no env resolver and no `process.env`**; a non-secret sentinel used transiently, never
persisted/audited/logged/in errors), and a single **`LiveProviderHttpTransport`** — the **only** production file
permitted a network token (native `fetch` + `AbortSignal.timeout` behind an **injected endpoint** — no hard-coded
vendor URL; **no SDK, no dependency/lockfile change**; no retry/persist/validate/secret-in-errors). The client
**fails closed before any transport call** when the policy is disabled or the credential is missing/invalid (→ safe
`provider-unavailable`/`missing-credential`/`invalid-credential`); it **never calls `validateDraft`** — validation
stays owned by the unchanged `requestRealProviderRendering` — so provider output is an **untrusted draft** that
becomes a message only at the gate. Transport conditions map **down** onto the existing
`ProviderOperationalFailure → ProviderFailure` (**not expanded**; unknown → safe `provider-unavailable`); provider
metadata stays **operational, not evidence**; the Impl 018 raw-free audit observes the outcome **only by explicit
composition** (no automatic persistence). There is **no arrow** from the live boundary to Observation/Reasoning/
Understanding/Athlete/`event-recording`/`delivery`, to the record/review, to display eligibility, or to delivery;
it imports only its own `rendering` surfaces + read-only `decision-support` *types*, **no module outside `rendering`
imports it**, and there is **no default/CI live call or credential**, **no retry/scheduler/event bus**, and **no
record/review/display-eligibility/delivery/event/domain mutation**. The native-network guard exception is
**surgical** — the Impl 014 broad scan and the Impl 017 `/provider-/` scan now allow a network token **only** in
`live-provider-http-transport.ts` (each with a positive "exactly one network file" assertion), while **vendor / SDK
/ env tokens stay forbidden everywhere** (Impl 019/020 guards untouched); the synchronous seam,
`FakeProviderAdapter`, `FakeProviderClient`, and `ConcreteProviderClient` are **untouched**. *A live call is
operational I/O: it changes the draft source, never the authority model — live-call-**capable**, not a production
rollout.*

[FACT] **Injected environment credential resolver — a credential from an injected source, never the real
environment (Implementation 022).** *Inside* `rendering/application` (not a new module), an
**`EnvironmentProviderCredentialResolver`** implements the **unchanged** injected `ProviderCredentialResolver`
port (a **sibling** of `StaticProviderCredentialResolver`). It is fed an **injected `EnvironmentCredentialSource`**
(`Readonly<Record<string,string|undefined>>` — a deterministic map in tests; a future infra slice may snapshot the
real environment into it) and an **explicit, neutral configured key name**, and reads **exactly that one key** —
**no real `process.env`**, **no scan**, **no fallback list**, **no key derived from domain data**. It classifies
absent → `missing`; blank/whitespace → `invalid`; control chars / line breaks → `invalid`; too-short → `invalid`;
else → `available` with the existing **opaque transient `ProviderCredentialToken`** (a blank/whitespace key name
fails closed → `invalid`). The **raw secret stays transient**: it never enters a failure, the provider-client
outcome, the raw-free audit, persisted state, provider metadata, or tests; failures are the stable, non-secret
`missing`/`invalid` states. **Credential availability is NOT live-call enablement** — composed into a
`LiveProviderClient`, a `LiveCallPolicy.disabled()` still blocks the transport, and a missing/invalid credential
blocks it even when the policy is enabled. The resolver **calls no transport / provider / `validateDraft`**, creates
no record/review/display-eligibility/delivery/event, mutates no domain, and **expands no failure catalog**. There is
**no arrow** from it to Observation/Reasoning/Understanding/Athlete/`event-recording`/`delivery`, to the
record/review, to display eligibility, or to delivery; it imports only its own `rendering` surfaces (+ `shared-kernel`
if needed), and **no module outside `rendering` imports it**. **`process.env` appears nowhere in `src/`** — the
resolver file is scanned by the Impl 017 `/provider-/` and Impl 021 `/provider-credential/` guards (both forbid the
env token) plus a dedicated negative-capability test, so **no guard was weakened and no exception was needed**; **no
dependency was added**. *An injected **operational** resolver supplies a transient credential; it reads no real
environment and is not a production secret manager.*

[FACT] **One-file process-environment source adapter — the real environment, bound through exactly one auditable
file (Implementation 023).** *Inside* `rendering/application` (not a new module), a
**`ProcessEnvironmentCredentialSourceAdapter`** binds the **real process environment** to the resolver's injected
`EnvironmentCredentialSource` shape — it **feeds, does not replace,** `EnvironmentProviderCredentialResolver`. Its
`toEnvironmentCredentialSource()` reads **exactly one explicitly configured neutral key**
(`AURORA_PROVIDER_CREDENTIAL`) via an **injected `ProcessEnvironmentAccessor`** called **once** — **no scan, no
fallback, no domain-derived key name** — and returns a source containing **only** that key when a value is present,
else an **empty source**; it **classifies nothing** (a blank value passes through; a blank/whitespace key name fails
closed to empty). **Classification stays in `EnvironmentProviderCredentialResolver`.** The adapter **requires** an
injected accessor (no implicit default), so the default suite injects a fake and **reads no real environment**;
**`defaultProcessEnvironmentAccessor` — wired only by the `processEnvironmentCredentialSourceAdapter(keyName?)`
production factory — is the ONLY direct `process.env` read site in the codebase** and is never exercised by the
default suite. The **direct `process.env` token appears in exactly one production file**, **sealed by a new repo-wide
guard** that scans all production `src/` files and asserts the token's single home — **no existing
provider/network/vendor/SDK/prompt guard was weakened**, and the network token stays confined to the Impl 021
transport file. **Credential availability is NOT live-call enablement** (a `LiveCallPolicy.disabled()` and a
missing/invalid credential each still block the transport); the **raw secret stays transient** (never in
errors/outcome/audit/state/metadata/tests). There is **no arrow** from the adapter to Observation/Reasoning/
Understanding/Athlete/`event-recording`/`delivery`, to the record/review, to display eligibility, or to delivery; it
**calls no resolver (unless the caller composes it) / live client / transport / provider / `validateDraft`**,
persists/audits/logs nothing, mutates no domain, expands no catalog, and **adds no dependency**. It imports only its
own `rendering` surfaces (+ `shared-kernel` if needed), and **no module outside `rendering` imports it**. *The real
environment is bound through one auditable file; the adapter is an **operational** source, not a secret manager, and
it never makes the value domain truth.*

[FACT] **Provider / rendering / delivery event surface — the output-out edge becomes occurrence-traceable
(Implementation 024).** *Inside* `event-recording` (not a new module; still dependency-neutral), the closed
catalogs gained an **additive** output-out vocabulary and `event-recording/application` gained **eight pure
factories**. Catalogs: `ProducingModule` += `rendering`/`delivery` (**provider events are produced by
`rendering`** — the provider edge lives inside it — and **no `provider` producing module** was added);
`EventArtifactKind` += `ProviderAttemptRecord`/`RenderedMessageRecord`/`RenderReview`/`DeliveryRequest`/
`DeliveryRecord` (**`DisplayEligibility` is id-less → a ref `role`, never a kind**); `DomainEventType` += eight
occurrence/outcome types (`ProviderAttemptRecorded`, `ProviderDraftValidationFailed/Passed`,
`RenderedMessageRecorded`, `RenderReviewRecorded`, `DisplayEligibilityDerived`, `DeliveryRequestRecorded`,
`DeliveryOutcomeRecorded`) — every prior entry intact. The **factories are pure**: each builds a
`DomainEventRecord` through the existing `DomainEventRecord.record(...)` and **returns** it — it **persists
nothing**, **calls no provider / live transport / validator / renderer / delivery sink**, **creates no
rendered-message record / review / delivery record / provider attempt**, **mutates no domain**, and has **no
side effect**; recording is **explicit application composition only**. Payloads stay **ref-only and raw-free**
(`kind`/`id`/`role?`/`ownerModule?`; no raw draft/prompt/payload/provider-response/secret/env value/
chain-of-thought/copied body/metadata bag). The edges are **observational, not control flow**: **rendering /
delivery / provider import no `event-recording` and emit nothing automatically** (referencing an artifact by
**string kind is not a cross-module import** — `event-recording` still imports only `shared-kernel`); appending
or reading a record **executes nothing**. The two earlier "catalog not extended" guards (Impl 015/018) were
**reconciled, not weakened** (the rendering-internal audit symbols stay forbidden outside `rendering`; the
factories stay pure). A provider/delivery success event is **never** evidence, recommendation quality, an
athlete decision, a retry, or a delivery command; **there is no event bus / queue / scheduler / telemetry / DB,
and no auto-emission or persistence-as-events**. *Events record what happened; they make nothing happen.*

[FACT] **Application orchestration — explicit composition, never a workflow engine (Implementation 025).** A
**new application-composition module** `application-orchestration` (drawn as a distinct composition layer, **not**
a reasoning stage and **not** a support seam in the ladder). Its one surface, **`orchestrateRenderDeliver(command,
deps)`**, composes the **existing** public services in a **fixed, explicit order** over **injected** collaborators:
`requestRealProviderRendering` → (selected) `auditProviderAttempt` + explicit `providerAttemptRepository.save` →
`RenderedMessageRecord.fromRenderedMessage` + explicit `renderedMessageRecordRepository.save` → (selected)
`renderReview` + `record.appendReview` + explicit save → `displayEligibilityOf` (**derived, never asserted**) →
(selected **and** eligible) `deliveryRequest` + `requestDelivery` (**self-persists**) → (selected) the Impl 024
occurrence-event factories + `eventRepository.append`. The arrows from `ORCH` are **explicit calls, not automatic
event flow**: **no event or repository write triggers the next step** (the function's control flow does), **delivery
is never automatic** (display eligibility is **necessary, not sufficient**), a **delivery failure does not retry**,
and an **event-append failure returns a non-invalidating `partial-success`** (the completed domain steps stand). It
is an **application-composition module, NOT a domain capability module**: it owns **no domain model, no repository,
no persistence of its own**, and introduces **no bounded context**. The **persistence asymmetry is honored** —
audit/record/review **return** records persisted explicitly (a review is appended to the rendered-message record;
**no separate review repository**), `requestDelivery` **self-persists**, the event repo uses **`append`**. The
result/trace are **safe refs only** (string ids / closed enums / safe codes — **no raw draft/prompt/payload/
provider-response/secret/env value/message body**). It imports **only the public indexes** of
rendering/delivery/event-recording (+ `shared-kernel`) and the `ProviderClientBoundary` **abstraction** — there is
**no arrow** to live HTTP transport / credential-resolver internals / process-env adapter / concrete-provider
internals, to Observation/Reasoning/Understanding/Athlete mutation surfaces, or to an event bus / scheduler / retry,
and **no arrow from rendering/delivery/event-recording back into orchestration**. `validateDraft` (inside
`requestRealProviderRendering`) stays the **only** path to a `RenderedMessage`; **provider success is not evidence**,
**a validation pass is not recommendation quality**, **delivery success is not athlete understanding or an athlete
decision**, and **nothing here mutates the domain**. **AC20's `ALLOWED_MODULES` was extended additively** (approved
module, not a weakening; the guard still rejects every other unapproved top-level module). *Composition is explicit;
an injected collaborator is not a global service locator; an event-recording step is not an event-triggered step.*

[FACT] **Live-provider smoke-test — a wiring check, not wisdom (Implementation 026).** A **pure, fully-injected
smoke-test boundary helper** inside `rendering/application` (drawn as a distinct operational wiring-check box near
the rendering/provider seam, **not** a reasoning stage, **not** a support seam, **not** an operator script). Its one
surface, **`liveProviderSmoke(command, deps)`**, exercises **one** live provider call through the **existing**
`requestRealProviderRendering(...)` seam (so the **unchanged mandatory `validateDraft`** stays the only path to a
`RenderedMessage`), and **only** behind explicit, ordered, **fail-closed gates — opt-in → CI → credential → live
policy — each stopping before any provider call** (the `SMOKE → RPROV` arrow fires **only** after all four pass).
The **credential is resolved only after the opt-in and CI gates pass**, and the call runs **only** when the
credential is available **and** the policy is enabled; it makes **at most one call (no loops, no re-issue)** and
returns a **closed, redacted `LiveProviderSmokeResult`** (`rawRetained: false`; 9 closed statuses) — **no rendered
body, no raw draft/prompt/payload/response, no secret/credential token, no `process.env` value, no metadata bag**.
**Opt-in/CI are injected indicators** (the helper **reads no `process.env`**); the credential resolver, live policy,
and client are **injected**. There is **no arrow** from the smoke helper to `delivery`, `event-recording`,
`application-orchestration`, the live HTTP transport internals, the process-env adapter, concrete-provider internals,
Observation/Reasoning/Understanding/Athlete mutation surfaces, an event bus/scheduler/retry, telemetry/model
evaluation, or a DB; it **persists nothing, delivers nothing, records no event, derives no display eligibility for
delivery, creates no rendered-message record / review / evidence / athlete decision, and mutates no domain**. the **default suite and CI make no live call and need no
credential**; the repo-wide `process.env` one-file guard and the live-provider guard (which catches
`live-provider-smoke.ts`) stay green; **AC20 is untouched** (no new module). The **operator entrypoint is
realized (Impl 027)**. *A smoke test proves wiring, not wisdom; smoke success is not evidence and smoke
failure is not domain failure; provider reachable is not provider output trusted; validation pass is not
wisdom.*

[FACT] **Operator live-smoke entrypoint — the live wiring is now runnable on demand (Implementation 027).**
`scripts/operator-live-smoke.mjs` (plain ESM, **outside `src`/`tsconfig.include`/the default test glob/both
guard scan roots**; verified runnable via **Node 22 native type-stripping** with no build/dependency) is a
**thin adapter** around `liveProviderSmoke` — it reads the real opt-in/CI/endpoint flags **outside `src`**
(legitimate there: no in-`src` token added; the production `process.env` seal intact), resolves the credential
**only** via the approved `ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver`
chain, wires the existing public live surfaces, and **calls `liveProviderSmoke` once** — duplicating no smoke
semantics, bypassing neither `liveProviderSmoke` nor `requestRealProviderRendering` nor the mandatory
`validateDraft`. It prints **one redacted JSON object** (`OperatorSmokeOutput`: `rawRetained: false`,
`wiringOnly`, `sideEffects: "none"`) and exits 0 for `passed`/`not-enabled`/`ci-disabled`, 1 for failures.
**Manual only** — no npm script, not in `npm run check` or the default suite, no CI-live lane;
persisting/delivering/recording/orchestrating/mutating nothing. The **decidable logic** lives in the pure,
typechecked, env-free `src` helper (`operator-live-smoke-entrypoint.ts`). The Impl 026 `scripts/` guard was
**reconciled (strengthened, not weakened)**: scripts/ may exist only for the approved `operator-live-smoke.mjs`.
**No package/lockfile change, no SDK, no dependency.** *The operator can now run the wire; the wire still proves
wiring, not wisdom; operator success is not product readiness.*

[FACT] **Provider-neutral managed-secret credential-source boundary (Implementation 028).** A **`ManagedSecretStoreClient`** pure TypeScript interface (async `retrieve(secretName): Promise<ManagedSecretResolution>`, always resolves — never rejects; implementations catch all exceptions internally; no cloud SDK; injected in all usage) + a **4-state `ManagedSecretResolution`** discriminated union (`available`/`missing`/`invalid`/`unavailable`) + a **`ManagedSecretCredentialSource`** class (async `toEnvironmentCredentialSource()`: retrieves ONE configured secret, maps `available` → `{ [secretName]: value }`, non-`available` → `{}` → downstream resolver classifies as `missing` → no provider call; **pre-fetch pattern** — the downstream synchronous `EnvironmentProviderCredentialResolver` chain is **unchanged**) + a **`FakeManagedSecretStoreClient`** (4 deterministic scenarios, default `available`, sentinel `"opaque:test-managed-secret"`, no real secret, no SDK, constructed explicitly — never a global singleton) now exist inside `rendering/application/`. **+39 tests; 672/672 pass; `tsc --noEmit` clean; `process.env` one-file seal intact; operator script unchanged; `package.json`/lockfile unchanged.** The seam is **provider-neutral and async** — a real cloud adapter implementing `ManagedSecretStoreClient` is the next slice. *secret manager = credential source; managed-secret seam ≠ live-call enablement ≠ cloud adapter ≠ production rollout.*

[FACT] **`event-recording` and persistence are *support seams*, not stages and not a bus.** Neither sits
in the epistemic ladder. Persistence (Impl 010) answers *"what is the aggregate now?"* (state round-trip);
`event-recording` (Impl 011) answers *"what happened?"* (an append-only, ref-only log of occurrences).
The dashed edges into them are **observational, not control flow** — a stage's occurrence is *recorded*,
never *commanded*; appending a `DomainEventRecord` executes nothing. The two seams **complement** each
other and never merge: a record references artifacts (by `kind`+`id`), it never copies aggregate state,
and the log is **not** an event-sourcing rebuild path (aggregates rebuild via `reconstitute`). There is
**no event bus, publish/subscribe, handler, or async delivery** anywhere in the map.

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

[FACT] **AthleteDecision feedback loop (Implementation 009).** The athlete's decision is an
**athlete-owned, append-only** `AthleteDecision` inside `athlete` — `decision-support` records **only an
`AthleteDecisionRef`** (referenced, never owned). The loop's return arrow goes **back to Observation**:
a reported decision re-enters as a `SubjectiveObservation` via a **neutral harness adapter** (`athlete`
imports no `observation`), then travels the **full ladder** (Signal → EvidenceCase → Hypothesis →
Understanding) — **never** jumping straight to Signal/Evidence/Understanding. `divergedFromSupport` is
**neutral fact, not a compliance score**; following ≠ obedience-success, not-following ≠ failure; a
**modification is first-class** (no binary compliance); `DecisionOutcomeRef` is a **reference only** (no
full outcome object), and a **good/bad outcome never grades `SupportQuality`** (integrity-at-the-time).
There is **no compliance/obedience scoring and no outcome-based validation**.

[FACT] **Persistence ports + in-memory repositories (Implementation 010).** Persistence is a **seam
around the aggregates, not a stage and not a driver of the domain**. Each persisted boundary
(`ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `DecisionSupportCase`, `Athlete`,
`AthleteDecisionRecord`) gained an additive, **validated** `toState()` / `reconstitute(state)` and a
module-owned **repository port** (`save`/`findById`/`exists`) with an **in-memory adapter**.
Adapters store **deep-copied state, not live references** (so loads are independent and mutation-isolated),
and **`reconstitute` validates invariants and rejects invalid state** — never a raw field bag. Round-trip
preserves append-only history, supersession, traceability refs, and (via a test helper) projection
freshness; `PurposeHistory` persists **through `Athlete`**; the `DecisionSupportCase` repo persists only an
`AthleteDecisionRef`, never an owned decision. **No technology is chosen** — no production DB/ORM/schema/
migrations, no event bus, no cache, no `src/infrastructure`, no projection repository, no event records.

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
| ⌨ | **Entrada manual** *(ingress into ObservationSet, not a reasoning stage)* | `observation/application` | `ManualInputSubmission` → `ingestManualInput` → `accepted`/`partially-accepted`/`rejected`; verbatim words, explicit missing data, provenance `source: "manual"`, quality; persists via `ObservationSetRepository`. Records source material, never meaning; detects no Signal; imports no downstream module / `event-recording`. **No** UI/API/LLM/external integration | ✅ Impl 013 |
| 1 | **Observación** | `observation` | `ObservationSet`, raw observations, Provenance/Source/Quality, self-report, missing data | ✅ Impl 001 |
| 2 | **Señal** | `observation/signal` | `ContextualizedObservation`, `Signal`/`SignalRejection`, relevance-without-meaning, preserved traceability | ✅ Impl 002 |
| 3 | **Reasoning** | `reasoning` | `Hypothesis`, `EvidenceCase`, claim confidence, falsifiers, lifecycle | ✅ Impl 003 |
| 4 | **Understanding** | `understanding` | `UnderstandingProfile`, dimension-specific, `UnderstandingLevel`, survived challenge, surprise/staleness, `SafeVoiceCeiling` | ✅ Impl 004 |
| 5 | **Decision Support / Voz** | `decision-support` | `DecisionSupportCase`, gates, `TraceabilityVerification`, `VoiceSelectionPolicy`, `VoiceMode` (Reflection/Framing/Warning/Recommendation), terminal outputs, preserved agency | ✅ Impl 005 |
| — | **End-to-end proof** | `src/modules/__tests__` | First full chain composed; output `DecisionSupport` · `VoiceMode: Reflection` (not Recommendation) | ✅ Impl 006 |
| 🗣 | **Rendering** *(downstream presentation, not a reasoning stage, not domain)* | `rendering` | `RenderableDomainOutput` (read-only projection) → deterministic fake renderer + **mandatory validator** → `RenderedMessage`/`RenderOutcome`; voice may match/soften, never escalate; Inquiry stays a question, Withholding a refusal; uncertainty/limitations/freshness/traceability preserved; invented facts/escalation/unsafe requests rejected (safe non-render). Not domain authority; mutates/emits nothing; imports only `shared-kernel` + read-only `decision-support` types. **No** real LLM provider / prompt / UI / API / external call | ✅ Impl 014 |
| 🗄 | **Rendered-message record / review** *(audit of presentation, not domain; inside rendering)* | `rendering` (`domain`+`application`) | Append-only `RenderedMessageRecord` (source ref/kind/voice/flags preserved) + append-only `RenderReview` (closed catalogs; display-safety) + derived `DisplayEligibility`; repository port + in-memory adapter (mutation isolation, validated reconstitution). Auditability not authority; approval/rejection touch no domain; failed never display-eligible; revision/supersession preserve the old record. **No** events / delivery / production DB / UI / API / provider | ✅ Impl 015 |
| 📤 | **Delivery / exposure** *(downstream exposure, not rendering, not domain)* | `delivery` (`domain`+`application`) | `requestDelivery` verifies `displayEligibilityOf(record)` (never re-derives), exposes only display-eligible records to a deterministic `InMemoryTestSink`, records an auditable `DeliveryRecord` (closed `DeliveryTarget`/`DeliveryOutcome`/`DeliveryFailureReason`; only `test-sink` supported); repository port + in-memory adapter (mutation isolation, validated reconstitution). Blocks not-reviewed/rejected/superseded/failed-render/missing-ref/unsupported-target without calling the sink. Success ≠ evidence; failure ≠ domain invalidation; mutates no rendered record/aggregate; imports only `shared-kernel` + read-only `rendering`; **imports no `event-recording` and auto-emits nothing** (a `DeliveryRequest`/`DeliveryRecord` may now be referenced by id in a ref-only event — Impl 024 — but `delivery` neither creates nor emits one). **No** real provider/channel / UI / API / scheduler / retry / event bus / production DB | ✅ Impl 016 |
| 🔌 | **Provider adapter seam** *(draft source behind rendering, fake/test-only, not a stage, not a module)* | `rendering` (`domain`+`application`) | `requestProviderRendering` builds a constrained `ProviderRenderingRequest` (rejects unsafe style/locale/empty before any call), `ProviderAdapter`/deterministic `FakeProviderAdapter` returns an untrusted `ProviderDraft`, then the **unchanged `validateDraft`** decides; `RenderedMessage` only if it passes. Closed `ProviderFailure` (network-flavored members fake-configurable); validation failure → `provider-output-failed-validation` + underlying `RenderingFailure[]`; every failure → safe non-rendering. Provider selects no voice, creates no `TerminalOutput`/`Recommendation`/`RenderedMessage`/record, persists/reviews/marks-display-eligible/delivers/emits/mutates nothing; imports only own `rendering` surfaces + read-only `decision-support` types. **No** real SDK / API / network / prompt templates / provider-LLM module / persistence / events / delivery side effect | ✅ Impl 017 |
| 📋 | **Provider attempt audit** *(observe-only audit of the seam, inside rendering, not a stage, not a module)* | `rendering` (`domain`+`application`) | `auditProviderAttempt` **observes** a `ProviderRenderOutcome` (does not call provider/`requestProviderRendering`/`validateDraft`) and records an append-only `ProviderAttemptRecord` — closed `ProviderAttemptStatus` (`validation-passed`/`validation-failed`/`provider-failed`/`unsafe-request-blocked`; `requested`/`draft-produced` reserved); reasons reuse the real `ProviderFailure` + `RenderingFailure` catalogs; **safe summary, no raw draft** (`rawDraftRetained` literal `false`; reconstitution rejects raw draft/text/content/prompt). Repository port + in-memory adapter (mutation isolation, validated reconstitution). Auditability not authority; creates no `RenderedMessage`/record/review/display/delivery; appends no event; triggers no retry/reprojection/mutation; validation failure ≠ domain invalidation. **No** `event-recording` import / auto-emit (a `ProviderAttemptRecord` may now be referenced by id in a ref-only event — Impl 024 — but the audit neither imports `event-recording` nor emits one) / real SDK / network / prompt / telemetry / model evaluation | ✅ Impl 018 |
| 🔗 | **Real-provider-ready boundary** *(additive async path behind rendering, fake/in-process, not a stage, not a module)* | `rendering` (`domain`+`application`) | Async `requestRealProviderRendering` changes **only the draft source**: reuses `providerRenderingRequestFrom` (unsafe-request guard) + a credential fast-path, asks the async `ProviderClientBoundary` (deterministic `FakeProviderClient`) for an untrusted draft, then the **unchanged `validateDraft`** decides; returns the existing `ProviderRenderOutcome`. `ProviderSecretRef` (status + opaque ref, never a raw secret), structured `ProviderInstruction` (derived, no prompt template), `ProviderOperationalFailure` → `toProviderFailure` mapped **down** to the existing `ProviderFailure` (not expanded). The **sync seam (Impl 017) is untouched**; raw-free audit observes the outcome by explicit composition (no automatic persistence). Real-provider-**ready, not integrated**. **No** real SDK / API / network / `process.env` / prompt templates / `provider`-`llm`-`telemetry` module / retry-scheduler / review-display-delivery-event side effect / domain mutation | ✅ Impl 019 |
| 🧩 | **Concrete-provider adapter shell** *(first selected-provider adapter behind the async boundary, inside rendering, not a stage, not a module)* | `rendering` (`application`) | First **selected-provider** adapter behind the Impl 019 `ProviderClientBoundary`: provider target (**OpenAI**) chosen **doc-level (020A) only**; code stays **vendor-neutral** (`concrete-provider-*`, `providerKind: "concrete"`) — **no guard weakened, no vendor token in guarded files**. `ConcreteProviderClient` is **disabled by default** (no transport → safe `provider-unavailable`, no I/O; **no live-call path**; deterministic in-process fixture transport for **tests only**, never network); non-`present` credential fails safe. Pure `serializeProviderInstruction` (structured payload; no arbitrary-prompt/chain-of-thought/secret field; no prompt template), pure `parseProviderResponse` (untrusted draft + operational metadata only; empty/malformed → safe failures; no raw payload; no `RenderedMessage`), pure `mapProviderError` (→ existing `ProviderOperationalFailure` → existing `ProviderFailure`, **not expanded**; unknown → safe). Draft → message only via unchanged `validateDraft`; raw-free audit by explicit composition; imports only own `rendering` surfaces + read-only `decision-support` types. **No** installed SDK/package dependency / network / `process.env` / raw secret / prompt template / retry-scheduler / record-review-display-delivery-event side effect / domain mutation. A selected-provider **shell**, not live integration | ✅ Impl 020 |
| 📡 | **Opt-in live-provider boundary** *(first live-call edge behind the async boundary, inside rendering, not a stage, not a module)* | `rendering` (`application`) | `LiveProviderClient` implements the async `ProviderClientBoundary` (sibling of `ConcreteProviderClient`, reusing serializer/parser/error-mapper); injected `LiveCallPolicy` (**disabled by default**; explicit opt-in; no env inference; no global state); injected `ProviderCredentialResolver` + deterministic `StaticProviderCredentialResolver` (**no env resolver, no `process.env`**, non-secret sentinel); `LiveProviderHttpTransport` = the **only** network-token file (native `fetch` + `AbortSignal.timeout`, **injected endpoint**, **no SDK/dependency**). **Fails closed before transport** if policy disabled or credential missing/invalid; **never calls `validateDraft`** (validation stays with `requestRealProviderRendering`); provider output untrusted; failures → existing `ProviderOperationalFailure → ProviderFailure` (**not expanded**); raw-free audit by explicit composition. Surgical network-guard exception (one approved file; vendor/SDK/env forbidden everywhere; Impl 019/020 guards untouched). **No** default/CI live call or credential / SDK-package dependency / `process.env` / raw secret / prompt template / retry-scheduler / record-review-display-delivery-event side effect / domain mutation. Live-call-**capable**, not a production rollout | ✅ Impl 021 |
| 🔑 | **Injected environment credential resolver** *(operational credential resolution, inside rendering, not a stage, not a module)* | `rendering` (`application`) | `EnvironmentProviderCredentialResolver` implements the existing `ProviderCredentialResolver` (sibling of `StaticProviderCredentialResolver`); reads **exactly one explicitly configured key** from an **injected `EnvironmentCredentialSource`** (`Readonly<Record<string,string\|undefined>>`) — **no real `process.env`**, no scan, no fallback, no domain-derived key. Classifies absent→missing; blank/control/too-short→invalid; else→available with the existing opaque transient `ProviderCredentialToken` (blank key name fails closed). Raw secret stays transient (never in failures/outcome/audit/state/metadata/tests). **Availability ≠ live-call enablement** (disabled policy + missing/invalid credential each block transport); calls no transport/provider/`validateDraft`; expands no catalog. **`process.env` nowhere in `src/`** — no guard exception, no dependency. **No** persistence/review/display/delivery/event side effect / domain mutation. An injected **operational** resolver, not a production secret manager | ✅ Impl 022 |
| 🌱 | **One-file process-environment source adapter** *(real-environment binding, inside rendering, not a stage, not a module)* | `rendering` (`application`) | `ProcessEnvironmentCredentialSourceAdapter` binds the **real process environment** into the resolver's injected `EnvironmentCredentialSource` shape — it **feeds, does not replace**, `EnvironmentProviderCredentialResolver`. Reads **exactly one configured neutral key** (`AURORA_PROVIDER_CREDENTIAL`) via an **injected `ProcessEnvironmentAccessor`** (called once; no scan/fallback/domain-derived name); present → source with only that key; absent → empty; **classifies nothing** (resolver still does; blank key name fails closed). `defaultProcessEnvironmentAccessor` is the **only** direct `process.env` read site — **sealed to this one file by a new repo-wide guard** (no existing guard weakened; network token stays in the Impl 021 transport file). Accessor is **required** (no implicit default) → default suite uses a fake, reads no real env. **Availability ≠ live-call enablement** (disabled policy / missing credential block transport); raw secret stays transient (never in errors/outcome/audit/state/metadata/tests); calls no resolver(unless composed)/live-client/transport/provider/`validateDraft`; **adds no dependency**. **No** persistence/review/display/delivery/event side effect / domain mutation. A one-file **operational** source adapter, not a secret manager | ✅ Impl 023 |
| ※ | **Athlete / Purpose** *(context, not a stage)* | `athlete` | `Athlete` (thin), `Purpose`/`PurposeVersion`/`PurposeHistory` (append-only), `PurposeChanged`, `PurposeVersionRef`, `PurposeReinterpretationStatus` (type only). **No** inferred state/capacity/constraints/path-memory | ✅ Impl 007 (Purpose-first) |
| ◇ | **Projection freshness** *(on `UnderstandingAssessment`)* | `understanding` | `ProjectionFreshness` (5 states), `derivedAt`, source refs, `RefreshTrigger`/`Policy`; non-current only lowers voice (invalid/unknown → ceiling `none`); flows downstream via `SafeVoiceCeiling`. **No** generic engine / `projection` module / `ImpactAssessment` | ✅ Impl 008 |
| ↩ | **AthleteDecision feedback** *(context, not a stage)* | `athlete` | `AthleteDecision` (athlete-owned, append-only), `DecisionChoice`/`Rationale`/`Context`, `DecisionOutcomeRef` (ref only), `AthleteDecisionRecord` (amend/supersede); re-enters as `SubjectiveObservation` (neutral adapter). **No** compliance/obedience score / full `DecisionOutcome` / pattern engine | ✅ Impl 009 |
| 💾 | **Persistence** *(seam around aggregates, not a stage)* | each module's `application/` | Validated `toState()`/`reconstitute()` + repository ports (`save`/`findById`/`exists`) + in-memory adapters for the 6 boundaries; state copies (deep-copied), invalid-state rejected, round-trip preserves invariants/traceability/freshness/history. **No** DB/ORM/schema/migrations / event bus / cache / `infrastructure` / projection repository | ✅ Impl 010 |
| 🧾 | **Event recording** *(seam beside persistence, not a stage)* | `event-recording` | `DomainEventRecord` (occurrence/outcome) over a closed **34-type catalog (26 reasoning-core + 8 output-out, Impl 024)**; `TraceabilityEnvelope`; **ref-only** `EventPayloadRef`; **append-only** `DomainEventRecordLog` + repository port + in-memory adapter; causation=lineage, correlation=grouping; validated on construct *and* reconstitute. Records *what happened* (refs, never copied state); **complements**, never replaces, the repositories. **No** event bus / publish-subscribe / handlers / async delivery / DB / schema / serialization / event sourcing; imports only `shared-kernel`; no domain module imports it | ✅ Impl 011 |
| 🧷 | **Provider / rendering / delivery event surface** *(additive output-out occurrence surface, inside `event-recording`, not a stage, not a bus)* | `event-recording` (`domain`+`application`) | Additive catalogs: `ProducingModule` += `rendering`/`delivery` (provider events produced by `rendering`; **no `provider` module**); `EventArtifactKind` += `ProviderAttemptRecord`/`RenderedMessageRecord`/`RenderReview`/`DeliveryRequest`/`DeliveryRecord` (`DisplayEligibility` = ref *role*, not a kind); `DomainEventType` += 8 occurrence/outcome types. **8 pure factories** build records via the existing `DomainEventRecord.record(...)` — **ref-only, raw-free, inert**: persist nothing, call no provider/transport/validator/renderer/delivery sink, create no downstream artifact, mutate nothing, **auto-emit from nothing** (explicit composition only). `event-recording` stays dependency-neutral (string-kind reference ≠ import); rendering/delivery/provider import no `event-recording`. Two earlier "catalog not extended" guards reconciled, not weakened. **No** event bus / queue / scheduler / telemetry / DB / auto-emission / persistence-as-events; an event is never a command/retry/delivery trigger, evidence, quality, athlete decision, or domain mutation | ✅ Impl 024 |
| 🔁 | **Reprojection** *(neutral check-only seam, not a stage, not a module)* | `__tests__/reprojection-harness` | `runReprojection` + `ReprojectionRun`/`Result`/`Finding`/`Mode`/`Target`/`InputSet`; recomputes `UnderstandingAssessment` via the owning module; recalculates freshness; pure event→candidate map; reports drift/findings. `check-only` only (`refresh-derived`/`mark-stale` reserved + throw). **Mutates nothing**, executes no event, rebuilds no aggregate from the log, promotes no freshness, creates no output. **No** production `reprojection` module / scheduler / event sourcing / projection repository / service layer; no domain module imports it | ✅ Impl 012 |
| 🎼 | **Application orchestration** *(explicit composition layer, NOT a domain capability, not a stage, not a bus)* | `application-orchestration` (`application/`) | `orchestrateRenderDeliver(command, deps)` composes the **existing** rendering/provider-audit/record/review/display/delivery/event services in a **fixed, explicit order** over **injected** collaborators → closed `OrchestrationOutcome` (8 kinds: `delivered`/`delivery-failed`/`rendered`/`review-rejected`/`display-ineligible`/`provider-not-rendered`/`recording-failed`/`partial-success`) + ref-only `OrchestrationTrace` (10-stage catalog). Owns **no domain model / repository / persistence of its own** / bounded context. Each step is an **explicit call**; **no event or repository save triggers the next step**; **delivery is never automatic** (display eligibility necessary, not sufficient); a **delivery failure does not retry**; an **event-append failure → non-invalidating `partial-success`**. Persistence asymmetry honored (audit/record/review return → explicit save; review appended to the record; `requestDelivery` self-persists; events `append`). Trace/result are **safe refs only** (no raw draft/prompt/payload/secret/env value/message body). Imports **only public module indexes** (+ `shared-kernel`) + the `ProviderClientBoundary` abstraction; **no** live transport/credential-resolver/process-env/concrete-provider internals; rendering/delivery/event-recording import it back. `validateDraft` stays the only path to a `RenderedMessage`; provider success ≠ evidence; delivery success ≠ athlete decision; no domain mutation. **AC20 updated additively.** **No** event bus / queue / scheduler / retry / workflow engine / telemetry / DB / UI / API / dependency change | ✅ Impl 025 |
| 🔌🧪 | **Live-provider smoke-test** *(operational wiring check inside rendering, NOT a stage, NOT a module, NOT an operator script)* | `rendering` (`application`) | `liveProviderSmoke(command, deps)` exercises **one** live provider call through the existing `requestRealProviderRendering(...)` seam (so the unchanged mandatory `validateDraft` stays the only path to a `RenderedMessage`), **only** behind explicit fail-closed gates — **opt-in → CI → credential → live policy, each stopping before any provider call** (credential resolved only after opt-in + CI pass; call only when credential available + policy enabled). **At most one call, no loops, no re-issue.** Returns a closed, redacted `LiveProviderSmokeResult` (`rawRetained: false`; 9 closed statuses: `not-enabled`/`ci-disabled`/`credential-missing`/`credential-invalid`/`live-policy-disabled`/`provider-failed`/`validation-failed`/`passed`/`unexpected-failure`) — **no rendered body / raw draft / prompt / payload / response / secret / env value / metadata bag**. Opt-in/CI are **injected indicators** (reads no `process.env`); resolver/policy/client **injected**. Imports **no** live HTTP transport / process-env adapter / concrete-provider internals / `delivery` / `event-recording` / `application-orchestration` / upstream-domain; carries no network/vendor/secret/retry token; imported by no module outside `rendering`. **Persists nothing, delivers nothing, records no event, creates no rendered-message record / review / evidence / athlete decision, mutates no domain.** Default suite + CI: **no live call, no credential**; `process.env` one-file guard + live-provider guard green; AC20 untouched (no module). No operator script, no npm script, no `scripts/` (**operator entrypoint realized Impl 027**). *A smoke test proves wiring, not wisdom.* | ✅ Impl 026 |
| 🖥️⚙️ | **Manual operator live-smoke entrypoint** *(thin operational adapter outside `src`, NOT a stage, NOT a module, NOT a domain capability)* | `scripts/operator-live-smoke.mjs` (outside `src`/`tsconfig.include`/default test glob/both guard scan roots) + `src/modules/rendering/application/operator-live-smoke-entrypoint.ts` (pure `src` support helper, typechecked, env-free) | Plain ESM; runnable via **Node 22 native type-stripping** (no build, no dependency). Reads `AURORA_LIVE_PROVIDER_SMOKE`, `AURORA_CI`, `AURORA_PROVIDER_CREDENTIAL` outside `src` (legitimate, no new in-`src` env token); credential via **approved chain** (`ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver`). Support helper exports: `parseOperatorSmokeEnv(env)`, `syntheticSmokeRenderingRequest()`, `operatorSmokeOutput(result)`, `operatorSmokeExitCode(status)`. Calls `liveProviderSmoke` **exactly once** through existing `ProviderClientBoundary` → existing `requestRealProviderRendering` → unchanged mandatory `validateDraft`. Prints **one redacted `OperatorSmokeOutput` JSON** (`rawRetained: false`, `wiringOnly`, `sideEffects: "none"`) — **no raw credential / draft / prompt / payload / provider-response / secret / env value surfaced**. Exit codes: `0` for `passed`/`not-enabled`/`ci-disabled`; `1` for operational failures. **No npm script** (manual only); **excluded from default test suite** (not in test glob, not a spec file); **no CI live lane**. Impl 026 `scripts/` guard **reconciled (strengthened, not weakened)**: "no `scripts/` yet" → "if `scripts/` exists, may only contain `operator-live-smoke.mjs`". Module count unchanged; no new in-`src` `process.env` read; production `process.env` seal untouched. **Persists nothing, delivers nothing, records no event, creates no rendered-message record / review / evidence / athlete decision, mutates no domain.** *Smoke proves wiring, not wisdom; operator success is not evidence; a redacted exit code is not domain truth.* | ✅ Impl 027 |
| 🔐 | **Managed-secret credential source** *(provider-neutral async seam inside rendering, NOT a stage, NOT a module)* | `rendering` (`application`) | `ManagedSecretStoreClient` interface (async `retrieve(secretName): Promise<ManagedSecretResolution>`, always resolves, no cloud SDK, injected in all usage). 4-state `ManagedSecretResolution` (`available`/`missing`/`invalid`/`unavailable`). `ManagedSecretCredentialSource.toEnvironmentCredentialSource()` (pre-fetch pattern: retrieves ONE configured secret; `available` → `{ [secretName]: value }`; non-`available` → `{}` → downstream resolver classifies `missing` → no provider call). `FakeManagedSecretStoreClient` (4 deterministic scenarios; default `available`; sentinel `"opaque:test-managed-secret"`; no real secret; no SDK; constructed explicitly — never a global singleton). Downstream synchronous `EnvironmentProviderCredentialResolver` chain **unchanged**. No cloud SDK, no `process.env` read, no dependency change. *secret manager = credential source; ≠ live-call enablement ≠ cloud adapter ≠ production rollout.* | ✅ Impl 028 |

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
| `AthleteDecision` **≠** Aurora output | The decision is the athlete's fact, not Aurora's product (Impl 009). |
| `AthleteDecisionRef` **≠** ownership | A reference recorded after the fact; `decision-support` never owns/mutates the decision. |
| divergence **≠** noncompliance · following **≠** obedience-success · not-following **≠** failure | `divergedFromSupport` is neutral fact; no valence/score is produced. |
| `DecisionOutcomeRef` **≠** outcome judgement | A handle to a separate, later observation; the outcome never grades the support. |
| `AthleteDecision → Observation` **≠** `AthleteDecision → Evidence` | Re-entry is observation-only; the full ladder runs afterward. |
| `SupportQuality` **≠** outcome quality | Integrity at the time of support; a good/bad outcome does not change it. |
| decision pattern **≠** athlete label | A pattern must become a falsifiable hypothesis; no personality tag / compliance profile. |
| decision rationale **≠** declared-purpose overwrite | Rationale may prompt inquiry/hypothesis; purpose changes only by athlete declaration/acceptance. |
| persistence ports **≠** production database | Impl 010 is ports + in-memory adapters; no DB/ORM/schema/migrations chosen. |
| in-memory repository **≠** infrastructure layer | Adapters are module-local test support; there is no `src/infrastructure`. |
| `toState()` **≠** domain authority · `reconstitute()` **≠** raw field-bag bypass | State export is an adapter contract; rehydration validates invariants and rejects invalid state. |
| persisted state **≠** current truth · repository round-trip **≠** event sourcing | A store is "as-of"; it replays nothing and owns no occurrences (event records are future work). |
| traceability refs **≠** database foreign keys | The domain trace is reference handles; any FK would be an adapter detail, not the meaning. |
| projection-freshness survival helper **≠** projection repository | Freshness survival is proven by a test `Map`; no production projection store exists. |
| state copy **≠** live domain-object reference | Adapters deep-copy on save and load; two finds are independent. |
| event record **≠** command | A `DomainEventRecord` records *what happened*; appending executes/mutates nothing (Impl 011). |
| event record **≠** aggregate · **≠** projection · **≠** source truth | It references artifacts; the aggregate/projection/source remains authoritative and is resolved from the refs. |
| event record **≠** event-bus message | Records are stored, never delivered/dispatched; there is no bus, publish/subscribe, or handler. |
| event log **≠** event sourcing | The log records occurrences; aggregates rebuild via `reconstitute`, not by replaying the log. |
| payload ref **≠** copied state | `EventPayloadRef` is `kind`/`id`/`role?`/`ownerModule?` only; copied state / arbitrary bags are unrepresentable. |
| traceability envelope **≠** database foreign key | The envelope carries domain `kind`+`id` handles; it invents no traceability and uses no FK. |
| causation **≠** handler trigger · correlation **≠** command chain | Causation is lineage, correlation is grouping; neither executes anything. |
| `DomainEventRecordRepository` **≠** production event store | Impl 011 is an append-only in-memory log; no store/serialization tech is chosen. |
| `TerminalOutputSelected` event **≠** `AthleteDecision` | It records the output kind via a `DecisionSupportCase` ref + role; it is not the athlete's decision. |
| `AthleteDecisionRecorded` event **≠** compliance score | The record carries no obedience/compliance/outcome-correctness field. |
| `ProjectionFreshnessChanged` event **≠** projection made current | It carries a freshness *status label*; it cannot assert a view `current`. |
| event record **≠** aggregate repository | Records answer *what happened?*; repositories answer *what is the aggregate now?* — complementary seams, neither replaces the other. |
| reprojection harness **≠** production service | Impl 012 is a neutral test-support seam under `__tests__/`; no production `reprojection` module/service exists. |
| check-only **≠** a write path | The only implemented mode reads and reports; `refresh-derived`/`mark-stale` are reserved and throw. |
| reprojection **≠** event sourcing | A run recomputes derived views from current state; it never rebuilds aggregates from the event log (`reconstitute` is the rebuild path). |
| event records as candidates **≠** event execution | Events identify *what to check* via a pure map; appending/considering them executes nothing. |
| recomputed projection **≠** source truth | A recompute is a labeled view; the `UnderstandingProfile` aggregate remains the truth. |
| drift report **≠** overwrite | Divergence is reported (`changed` + differences); the stored view/repository is never overwritten. |
| freshness recalculation **≠** freshness promotion | A run re-derives the same or a more cautious freshness; completing a run never makes a view `current`. |
| stale/invalid finding **≠** recommendation · DecisionSupport review finding **≠** `TerminalOutput` | A finding is diagnostic; it creates no athlete-facing output and no terminal output. |
| `AthleteDecision` outcome **≠** `SupportQuality` rewrite · purpose-related stale finding **≠** `Purpose` overwrite | Outcome never grades support; a purpose-change can mark a view stale but never edits `Purpose`/understanding. |
| manual input **≠** meaning · adapter **≠** reasoning · saved `ObservationSet` **≠** `Signal` detection | The adapter records source material faithfully; it never interprets, never detects a signal (Impl 013). |
| subjective words **≠** inferred fatigue/readiness · missing data **≠** invented value | Words are verbatim; missing data is an explicit observation; nothing is inferred or invented. |
| partial acceptance **≠** silent interpretation · rejection **≠** accidental data loss | Ambiguity is a reported limitation or an explicit rejection (which saves nothing) — never a silent guess. |
| source quality **≠** athlete quality | `ManualInputQuality`/`ObservationQuality` describe the *input record*, never the athlete. |
| event candidate **≠** event command · `ObservationSetRecorded` **≠** downstream execution | The adapter returns a ref-only candidate; the harness records an inert occurrence; nothing executes. |
| athlete-decision report as observation **≠** `AthleteDecisionRecord` mutation | A reported decision is recorded as a subjective observation only; the athlete-decision aggregate is untouched. |
| Manual Input Adapter **≠** UI/API/LLM/external integration | It is an in-process `observation` boundary; how input is collected/submitted is future. |
| rendering **≠** reasoning · generated text **≠** domain authority · renderer **≠** voice selector | Rendering is downstream presentation; `decision-support` owns voice + terminal output (Impl 014). |
| `VoiceMode` **≠** style request · style request **≠** permission to escalate voice | A safe style affects phrasing only; "be decisive" is not a safe style → `unsupported-style-request`. |
| fake renderer **≠** LLM provider · validator **≠** model quality | The renderer is deterministic and provider-free; the mandatory validator is the safety guarantee. |
| renderable output **≠** raw reasoning internals | A `RenderableDomainOutput` is a read-only projection of a completed terminal output, not internals. |
| rendered message **≠** `Evidence`/`Observation`/`Understanding`/`AthleteDecision` · **≠** source truth | A `RenderedMessage` is a presentation artifact; it re-enters only if the athlete reports it back manually. |
| Recommendation rendering **≠** recommendation creation · Inquiry rendering **≠** answer · Withholding rendering **≠** advice | The renderer phrases what the domain decided; it never creates/answers/advises. |
| traceability summary **≠** invented citation · rendering failure **≠** unsafe fallback | Summaries cite only present refs; a failure is a safe non-render, never unsafe text. |
| rendered-message persistence **≠** domain authority · review approval **≠** stronger evidence | A record audits a presentation artifact; approval is display-safety only (Impl 015). |
| display eligibility **≠** delivery · presentation review **≠** reasoning review | Eligibility is a derived read; review judges display, never the domain's truth. |
| persisted rendered text **≠** `Observation`/`Evidence`/`Understanding`/`DecisionSupport`/`AthleteDecision` · source-ref preservation **≠** source-truth conversion | The record carries no domain field; keeping the ref does not make the text true. |
| review rejection **≠** domain invalidation · revision **≠** overwrite · supersession **≠** deletion | The domain output is untouched; old records stay immutable and auditable. |
| failed render audit **≠** displayable message · repository persistence **≠** production DB · rendered-message record **≠** event record | Failed attempts are never display-eligible; the repo is in-memory; the record emits no event. |
| delivery **≠** rendering · delivery **≠** domain reasoning · display eligibility **≠** delivery | Delivery is downstream exposure; `rendering` owns eligibility; delivery only exposes an already-eligible record (Impl 016). |
| delivery verifies `displayEligibilityOf` **≠** delivery re-derives eligibility | Delivery calls rendering's derivation and maps its raw reasons; it never reinterprets safety with a parallel rule set. |
| `DeliveryRecord` **≠** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport` | A delivery record carries no domain field and no domain-write handle; it is an audit entry, not a domain artifact. |
| delivery success **≠** support validation · delivery failure **≠** domain invalidation | A delivered/failed outcome never grades `SupportQuality`/voice/traceability and never invalidates the domain output. |
| `test-sink` **≠** real provider/channel · `InMemoryTestSink` **≠** email/SMS/push/WhatsApp/UI/API | The sink is deterministic and in-process; a real channel would later implement the same `DeliverySink` interface. |
| delivery audit **≠** event record · delivery repository **≠** production DB · no delivery event **≠** missing auditability | A `DeliveryRecord` is not a `DomainEventRecord`; the repo is in-memory; auditability comes from the record, not from events. |
| accepted/delivered outcome **≠** athlete outcome · delivered text **≠** source truth | A delivery result is not the athlete's decision/outcome; delivered text re-enters only if the athlete reports it via the manual adapter. |
| delivery retry/scheduler **≠** implemented · `accepted-for-delivery` **≠** produced this slice | No retry/scheduler/event-bus exists; `accepted-for-delivery` is a reserved (future two-phase) outcome, not produced by the single-shot service. |
| provider draft **≠** rendered message · provider adapter **≠** renderer authority | A `ProviderDraft` is untrusted text; only `validateDraft` produces a `RenderedMessage` — the validator, not the provider, is the authority (Impl 017). |
| provider draft **≠** domain truth · **≠** `TerminalOutput`/`Recommendation`/`Evidence`/`Observation`/`Understanding`/`AthleteDecision` | A provider draft carries no domain field/write path; it never becomes any domain artifact. |
| provider draft **≠** rendered-message record · provider success **≠** display eligibility · provider success **≠** delivery | A successful provider rendering produces a transient `RenderedMessage` only; it records/reviews/marks-eligible/delivers nothing. |
| provider failure **≠** domain invalidation · validation failure **≠** review rejection | A provider/validation failure degrades to safe non-rendering; it leaves the domain output and the review/record untouched. |
| fake provider **≠** real provider integration · provider seam **≠** SDK/API/network/prompt implementation | The seam is deterministic and in-process; a real adapter would implement the same `ProviderAdapter` port behind the same validator, later. |
| provider request **≠** raw private reasoning | `ProviderRenderingRequest` carries only domain-approved fields; chain-of-thought / hypotheses / mutable handles / override fields are unrepresentable. |
| provider attempt record **≠** provider draft · **≠** source truth | A `ProviderAttemptRecord` is a safe summary of what the seam did; it retains no raw draft and is never authority (Impl 018). |
| provider attempt record **≠** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`/`TerminalOutput` | The record carries no domain field/write handle; it is an audit artifact, not a domain artifact. |
| provider attempt record **≠** `RenderedMessage`/`RenderedMessageRecord` · audit **≠** rendered-message persistence/review | The audit creates no message/record/review; only a validated `RenderedMessage` may later be recorded (Impl 015). |
| provider attempt audit **≠** display eligibility/delivery/event record | The audit marks nothing display-eligible, delivers nothing, and appends no event (it imports no `event-recording`). |
| provider attempt audit **≠** model evaluation/telemetry infrastructure | The audit is for safety debugging/traceability of attempts; it infers no athlete state and grades no model/recommendation quality. |
| audit observes outcome **≠** audit calls provider/validator | `auditProviderAttempt` reads a `ProviderRenderOutcome`; it never calls the provider / `requestProviderRendering` / `validateDraft`. |
| validation failure **≠** domain invalidation · provider success **≠** recommendation validation · provider failure **≠** support-quality weakening | An attempt outcome is a rendering-attempt fact; it never grades the domain output or `SupportQuality`. |
| no raw draft retention **≠** no auditability | `rawDraftRetained` is literal `false`; auditability comes from the safe summary (status + reasons), not from raw text. |
| real-provider-ready boundary **≠** real provider integration · fake client **≠** real SDK/network | Impl 019 is additive and proven with a deterministic in-process client; no real SDK/API/network/secret/prompt exists. |
| secret ref **≠** secret · `ProviderSecretRef` **≠** raw key | A `ProviderSecretRef` is a status + opaque ref; raw secrets are never held, persisted, logged, audited, or in errors; no `process.env`. |
| provider instruction **≠** arbitrary prompt · **≠** production prompt template | `ProviderInstruction` is structured/derived from the constrained request; no caller prompt, chain-of-thought, or prompt-template file. |
| async client boundary **≠** automatic retry/scheduler · failure mapping **≠** expanding provider authority | `requestRealProviderRendering` calls the client at most once; `ProviderOperationalFailure` maps **down** to the existing `ProviderFailure` (not expanded). |
| real-provider draft **≠** rendered message · sync seam untouched **≠** duplicated authority | Only the unchanged `validateDraft` makes a message; the async path reuses the same gate — the sync seam (Impl 017) is unchanged, not a second authority. |
| `ProviderRenderOutcome` **≠** provider-attempt persistence · real-provider path **≠** delivery/eventing | The async service returns an outcome only; the raw-free audit is explicit composition; nothing is persisted/delivered/evented automatically. |
| provider operational metadata **≠** evidence · provider success **≠** recommendation validation · provider failure **≠** domain invalidation | Latency/cost/finish-reason are operational; success/failure never grade the domain output or `SupportQuality`. |
| provider target selected **≠** live provider integration · vendor doc decision **≠** vendor token in production code | Impl 020 records OpenAI at the doc/decision level (020A); the concrete shell makes no live call, and code stays vendor-neutral (`concrete-provider-*`). |
| concrete-provider shell **≠** SDK client · disabled-by-default client **≠** live-call adapter · fixture transport **≠** network | `ConcreteProviderClient` defaults to a safe failure with no I/O; the deterministic in-process transport is test-only — there is no SDK, no live-call path, and no network. |
| selected-provider shell **≠** weakening negative-capability guards · no SDK dependency **≠** no provider plan | The vendor stays doc-level and code neutral, so every guard stays intact; the plan is real (020A) while `package.json`/lockfile are unchanged. |
| serializer **≠** arbitrary prompt · serializer **≠** production prompt template | `serializeProviderInstruction` projects only safe constraints from `ProviderInstruction`; there is no arbitrary-prompt/chain-of-thought field and no `src/prompts`. |
| parser output **≠** rendered message · provider metadata **≠** evidence · raw payload **≠** retained | The parser returns an untrusted draft + operational metadata only and builds no `RenderedMessage`; only `validateDraft` makes a message; no raw payload survives. |
| provider-shaped error **≠** domain invalidation · `ProviderOperationalFailure` mapping **≠** expanding `ProviderFailure` | `mapProviderError` maps down to the existing closed catalogs (unknown → safe `provider-unavailable`); a provider failure never invalidates the domain output. |
| provider success **≠** persistence/review/delivery · composed audit **≠** automatic audit persistence | A concrete-shell success returns an outcome only; the raw-free audit is explicit composition — nothing is persisted/reviewed/delivered automatically. |
| live-provider boundary **≠** production rollout · opt-in capability **≠** enabled-by-default live call | Impl 021's `LiveProviderClient` can make a real call, but only when explicitly enabled via the injected `LiveCallPolicy`; disabled by default, it is capable, not deployed. |
| native HTTP transport **≠** SDK dependency · one approved network file **≠** broad network permission | Native `fetch` is sealed in `live-provider-http-transport.ts` (the only network-token file); no package/lockfile change, and every other file stays network-free. |
| credential resolver port **≠** real secret manager · static resolver **≠** production credential mechanism · injected credential token **≠** persisted secret | The resolver is injected; the static one returns a non-secret sentinel; no `process.env`/env resolver/real secret exists; the token is used transiently and never persisted/audited/logged. |
| disabled policy **≠** transport invocation · missing credential **≠** transport invocation · invalid credential **≠** domain failure | The live client fails closed *before* any transport call; a missing/invalid credential maps to a safe operational failure, never a domain invalidation. |
| transport response **≠** rendered message · parsed draft **≠** validated message · provider metadata **≠** evidence · transport failure **≠** domain invalidation | The live client returns only an untrusted `ProviderClientResponse`; only `validateDraft` makes a message; metadata is operational; a transport failure degrades to safe non-rendering. |
| fetch exception **≠** weakened vendor/env/SDK guards · live-capable client **≠** retry/scheduler/event bus | The surgical exception allows a network token in one file only; vendor/SDK/`process.env` stay forbidden everywhere; the client retries nothing and schedules nothing. |
| injected env source **≠** real process environment · environment-like resolver **≠** production secret manager | Impl 022's resolver reads an injected map (deterministic in tests); `process.env` appears nowhere in `src/`; binding the real environment / a secret manager is a later infra slice. |
| configured key lookup **≠** environment scan · available credential **≠** live-call enablement | The resolver reads exactly one configured key (no scan/fallback); an available credential still does nothing until a separate, explicit `LiveCallPolicy` is enabled. |
| credential resolver **≠** transport/provider/validator call · opaque token **≠** persisted secret | The resolver only classifies a value; it invokes no transport/provider/`validateDraft`; the token is transient and never persisted/audited/logged. |
| credential failure **≠** domain failure · secret absence **≠** support-quality downgrade · raw credential **≠** metadata/audit/traceability | A missing/invalid credential is an operational state; it never invalidates domain output, grades support, or enters provider metadata/audit/traceability. |
| no `process.env` token **≠** no future production secret plan · injected tests **≠** CI credential requirement | The injected-map decision keeps the resolver env-free; Impl 023 binds the real environment behind one approved file; the default suite still needs no real credential. |
| process-env adapter **≠** secret manager · direct process-environment binding **≠** broad environment access | Impl 023 reads the real `process.env` through one approved file, one configured key; a managed secret store is a later slice. |
| default accessor **≠** default test behavior · fake-accessor tests **≠** production secret wiring · production factory **≠** live call enabled by default | `defaultProcessEnvironmentAccessor` (the one real read) is wired only by the production factory; tests inject a fake; constructing the adapter does not enable any live call. |
| adapter output **≠** credential classification · adapter **≠** resolver · one-file token confinement **≠** guard weakening | The adapter only produces an `EnvironmentCredentialSource`; the resolver classifies; the `process.env` token is sealed to one file by a *new* repo-wide guard (nothing was excepted). |
| raw environment value **≠** domain data / audit payload / provider metadata · process-env adapter **≠** `validateDraft` / persistence / review / display / delivery / event | The real value flows only into the injected source and (when enabled) the transport header; it is never domain truth, never audited, and the adapter triggers no downstream effect. |
| event catalog expansion **≠** event bus · event factory **≠** event persistence (Impl 024) | The Impl 024 surface is additive catalogs + pure factories that *return* records; there is no bus, no handler, no async delivery, and nothing is persisted by the factories. |
| event record **≠** command / retry trigger / delivery trigger · event record **≠** evidence / quality judgment / domain mutation | A `DomainEventRecord` is inert: appending/reading executes nothing; it never triggers a retry/delivery, never grades the domain, and never mutates an aggregate. |
| provider attempt event **≠** provider attempt audit · provider validation event **≠** validator execution | The event *references* the raw-free `ProviderAttemptRecord` by id; recording an event runs no provider/validator — the audit (Impl 018) and the validator (Impl 014/017) are separate. |
| rendered-message event **≠** rendered-message creation · review event **≠** display command · display-eligibility event **≠** delivery command | Each event records that an artifact/derivation happened; it creates no record/review, displays nothing, and delivers nothing. |
| delivery request event **≠** delivery send · delivery outcome event **≠** athlete saw/understood/accepted | A delivery event is an exposure-audit occurrence; it sends nothing and implies no athlete reception/decision. |
| provider success event **≠** recommendation correctness · delivery success event **≠** athlete decision | A success occurrence is operational history; it never becomes recommendation quality, evidence, or the athlete's decision. |
| ref-only event payload **≠** copied state / raw content store · event-recording vocabulary string **≠** cross-module import | Payloads carry `kind`/`id`/`role?`/`ownerModule?` only (no raw draft/prompt/payload/secret/env value); a kind string like `ProviderAttemptRecord` is a name, not an import — `event-recording` imports only `shared-kernel`. |
| event history read **≠** replay side effect · guard reconciliation **≠** boundary weakening (Impl 024) | Reading an event runs nothing; the two earlier "catalog not extended" guards were updated for the approved expansion while the rendering-internal audit symbols stay forbidden outside `rendering` and the factories stay pure. |
| application orchestration **≠** domain module · **≠** bounded context · **≠** persistence owner (Impl 025) | `application-orchestration` owns no domain model, no repository, and no persistence; it composes existing services over injected collaborators and returns a result + trace. |
| application orchestration **≠** workflow engine / event bus / scheduler / retry engine | There is no bus/handler/queue/scheduler/retry/workflow; `orchestrateRenderDeliver` is a single function whose control flow makes each explicit call. |
| explicit composition **≠** hidden side effect · injected collaborator **≠** global service locator | Every side-effecting collaborator is passed in via `ExplicitOrchestrationDependencies`; nothing is resolved from a global, and composition is visible in the call sequence. |
| event-recording step **≠** event-triggered step · repository save **≠** implicit next step (Impl 025) | No event append or repository save triggers the next step; the function's control flow does — recording occurrences is the **terminal** step, never a trigger. |
| display eligibility **≠** automatic delivery | Delivery runs only when explicitly selected *and* eligible; eligibility is necessary, not sufficient — there is no automatic delivery arrow off `displayEligibilityOf`. |
| delivery failure **≠** retry · event-append failure **≠** domain invalidation (Impl 025) | A delivery failure returns `delivery-failed` with no retry; an event-append failure returns a non-invalidating `partial-success` — the completed domain steps stand. |
| provider success **≠** evidence · validation pass **≠** recommendation quality · delivery success **≠** athlete understanding/decision (Impl 025) | Orchestration coordinates boundaries; it never reclassifies an operational success as evidence, recommendation quality, athlete understanding, or an athlete decision. |
| ref-only trace **≠** raw content storage · AC20 allowlist update **≠** guard weakening (Impl 025) | The `OrchestrationTrace`/result carry only string ids / closed enums / safe codes; AC20 gained `application-orchestration` additively while still rejecting every other unapproved module. |
| smoke boundary helper **≠** operator script · **≠** npm script · **≠** default/CI live test (Impl 026) | `liveProviderSmoke` is a pure, injected helper; no `scripts/`, no npm script, and the default suite + CI make no live call and need no credential. |
| smoke helper **≠** application-orchestration delivery path · **≠** delivery · **≠** event recording · **≠** domain reasoning | It composes only the rendering/provider seam (`requestRealProviderRendering`); it persists/delivers/records/mutates nothing and imports no delivery/event-recording/orchestration internal. |
| smoke success **≠** product readiness · **≠** evidence · **≠** recommendation quality · **≠** athlete decision · smoke failure **≠** domain failure | A `passed` result means the wire works behind the unchanged validator — never that the output is good, true, owned, or shippable; a failure is operational, not a domain verdict. |
| provider reachable **≠** provider output trusted · validation pass **≠** wisdom (Impl 026) | Reaching the provider proves transport; only `validateDraft` makes a message, and passing it proves safety-of-form, not correctness. |
| injected opt-in/CI indicators **≠** env read · credential available **≠** automatic live call · live policy enabled for the helper **≠** global production live enablement | The helper reads no `process.env` (opt-in/CI injected); the call runs only after all four gates pass; enabling the policy for one smoke call enables nothing globally. |
| redacted smoke result **≠** raw provider transcript (Impl 026) | The closed `LiveProviderSmokeResult` carries safe codes only (`rawRetained: false`) — no rendered body / draft / prompt / payload / response / secret / env value / metadata bag. |
| `ManagedSecretCredentialSource` **≠** cloud adapter / production secret store (Impl 028) | The provider-neutral seam (interface + pre-fetch class + fake client) is in place inside `rendering/application/`; a real cloud SDK adapter implementing `ManagedSecretStoreClient` (AWS Secrets Manager / GCP / Azure / Vault) is the next slice. |
| managed-secret credential source **≠** live-call enablement (Impl 028) | Credential availability — even from a real secret manager — does not enable a live call; a disabled `LiveCallPolicy` and a missing/invalid credential each independently block the transport. |
| `ManagedSecretResolution: available` **≠** credential classified available by resolver | The resolution is an intermediate step; the value is placed into the `EnvironmentCredentialSource` map and then classified by the downstream `EnvironmentProviderCredentialResolver` — the resolver remains the authority. |
| non-`available` managed-secret resolution **≠** domain failure | `missing`/`invalid`/`unavailable` each produce an empty `EnvironmentCredentialSource`; the resolver classifies the result as `missing`; no provider call occurs; the domain output is untouched. |
| `FakeManagedSecretStoreClient` **≠** real secret manager | The fake is deterministic and in-process (sentinel `"opaque:test-managed-secret"`); it exercises the seam without touching any real store, network, or credential. |

---

## What the System Still Does Not Have (intentional)

[FACT] The reasoning core is complete in code; `athlete` holds Purpose + AthleteDecision; projection
freshness is explicit on `UnderstandingAssessment`; **persistence is ports + in-memory repositories**
(Impl 010); **event/outcome records are an append-only, ref-only log** (Impl 011); **reprojection is a
neutral check-only harness** (Impl 012); **a real manual "data in" boundary records faithful
`ObservationSet`s** (Impl 013); **a deterministic "output out" rendering boundary expresses terminal
outputs as human-facing text** (Impl 014); **rendered messages are conserved + reviewed as auditable
presentation artifacts** (Impl 015); **a downstream delivery boundary exposes display-eligible messages to a
deterministic test sink + audit records** (Impl 016); **a provider adapter seam inside `rendering` lets a
deterministic fake provider draft text behind the unchanged mandatory validator** (Impl 017); **provider
attempts are audited inside `rendering` as safe-summary records with no raw draft retention** (Impl 018); **a
real-provider-*ready* async client boundary (fake in-process client, secret refs, structured instructions,
failure mapping) makes a real provider pluggable behind the same validator** (Impl 019); **the first
selected-provider adapter shell prepares a chosen vendor (OpenAI, doc-level) in vendor-neutral code — a
disabled-by-default `ConcreteProviderClient` + deterministic serializer/parser/error-mapper — behind the same
validator, with no live call/SDK/secret/prompt and no guard weakened** (Impl 020); **the first opt-in
live-provider boundary can make a *real* call only when explicitly enabled — a fail-closed `LiveCallPolicy`, an
injected credential resolver, and native `fetch` sealed in one approved transport file — behind the same
validator, with no SDK/dependency, no env read, no default/CI live call, and no downstream side effect** (Impl
021); **the first injected environment credential resolver resolves a credential from an *injected* source map (one
configured key; the existing opaque transient token) — without requiring a real
credential, enabling a live call by itself, leaking a secret, or adding a dependency** (Impl 022); **the first
one-file process-environment source adapter binds the real `process.env` through *exactly one approved file*
(sealed by a new repo-wide guard) into that injected source — feeding, not replacing, the resolver — with an
injected accessor so tests read no real environment, no live-call enablement, no secret leakage, and no
dependency or existing-guard change** (Impl 023); **the output-out edge is now occurrence-traceable through a
ref-only provider/rendering/delivery event surface — additive catalogs + eight pure factories that record what
happened (by id only), persisting nothing, calling nothing, mutating nothing, and auto-emitting from nothing**
(Impl 024); **the existing services are now explicitly composed through an application orchestration boundary —
`orchestrateRenderDeliver(command, deps)` wires rendering/provider-audit/record/review/display/delivery/event in a
fixed, explicit order over injected collaborators, returning a closed outcome + a ref-only trace, owning no domain
model/repository/persistence, with no event/save triggering a step, no automatic delivery, no retry, and no domain
mutation** (Impl 025); **the live-provider path is now verifiable by a pure, injected smoke-test wiring check —
`liveProviderSmoke(command, deps)` makes one bounded call through the existing seam behind the unchanged validator,
only behind explicit fail-closed opt-in → CI → credential → live-policy gates (each stopping before any call),
returning a closed redacted result, reading no environment, importing no transport/adapter/delivery/event/
orchestration internal, and persisting/delivering/recording/mutating nothing — with no operator script, no npm
script, and no default/CI live call** (Impl 026); **the operator can now run the wiring check on demand —
`scripts/operator-live-smoke.mjs` (outside `src/`/`tsconfig.include`/the default test glob/both guard scan roots)
reads the real opt-in/CI/credential flags outside `src`, wires the approved `ProcessEnvironmentCredentialSourceAdapter
→ EnvironmentProviderCredentialResolver` chain, calls `liveProviderSmoke` exactly once, and prints one redacted
`OperatorSmokeOutput` JSON — no npm script, no CI live lane, persisting/delivering/recording/mutating nothing**
(Impl 027); **a provider-neutral managed-secret credential-source seam is now in place — a `ManagedSecretStoreClient`
pure TypeScript interface (async `retrieve`, always resolves, no cloud SDK, injected in all usage), a
`ManagedSecretCredentialSource` async pre-fetch class (maps `available` → `EnvironmentCredentialSource`; non-`available`
→ empty → resolver classifies `missing` → no call; downstream synchronous resolver chain unchanged), and a
`FakeManagedSecretStoreClient` (4 deterministic scenarios; sentinel `"opaque:test-managed-secret"`) — inside
`rendering/application/`, no cloud SDK, no `process.env` read, no dependency, and no cloud adapter** (Impl 028);
the following are **deliberately absent**, not failures:

- **No UI** · **No API** · **No real delivery channel** — delivery exists only as a **downstream boundary with a deterministic `test-sink` + audit records** (Impl 016); there is **no email/SMS/push/WhatsApp/web channel or provider** · **No external/FIT/wearable ingestion** (the real ingress is the in-process **manual adapter**, Impl 013) · **No production DB/ORM/schema/migrations** (persistence is ports + in-memory only) · **No cache**
- **No real LLM provider SDK / production secret-env mechanism / production live-call rollout** — the rendering boundary is proven with a **deterministic fake renderer + mandatory validator** (Impl 014), Impl 017 added a **provider adapter seam with a deterministic fake provider** behind the **unchanged** `validateDraft`, Impl 019 added a **real-provider-*ready* async client boundary**, Impl 020 added the **vendor-neutral selected-provider shell** (disabled by default), and Impl 021 added the **opt-in live-provider boundary** — a fail-closed `LiveCallPolicy`, an injected credential resolver, and native `fetch` sealed in one approved transport file — Impl 022 added the **injected environment credential resolver** (one configured key from an injected source map), and Impl 023 added the **one-file process-environment source adapter** (the real `process.env` bound through one approved, guard-sealed file) — so a real call is **possible only when explicitly enabled** behind the same validator and a credential can be resolved from the real environment through one auditable file; but **no production live call, no real SDK/installed dependency, no production secret manager, no production prompts, and no `provider`/`llm`/`telemetry`/`evaluation` module** exist (real-provider-**ready, shelled, live-call-capable, and credential-resolving from the real environment through one approved file**, not **deployed**); generated/drafted text must never become domain truth, the vendor never leaks into a guarded provider file, the network token lives in exactly one approved file, and `process.env` is sealed to exactly one approved file
- **No real delivery provider/channel** — the delivery boundary is proven with a **deterministic `InMemoryTestSink`** (Impl 016); a real channel would implement the same `DeliverySink` interface behind the same eligibility gate; **delivery success/failure never affects domain state**
- **No auto-emission / event bus / persistence for the (now-existing, ref-only) provider/rendering/delivery occurrence event surface** — the surface itself exists (Impl 024): a `RenderedMessageRecord`/`DeliveryRecord`/`ProviderAttemptRecord` is **still not** an event record but can now be **referenced by id** in one. `rendering`/`delivery` still import no `event-recording` and **auto-emit nothing**; the factories persist nothing and the catalog expansion is additive/string-literal. A production composition that records these (plus an eventual bus/persistence) remains future
- **No provider telemetry / model-evaluation infrastructure** — provider-attempt audit (Impl 018) is auditability/safety-debugging only (safe summaries, no raw draft); it grades no model/recommendation quality and infers no athlete state
- **No scheduler / retry / background-job layer** — `requestDelivery` is synchronous and deterministic; retries/cancellation lifecycles are deferred (Impl 016)
- **No event bus / publish-subscribe / handlers / async delivery** — event records are *stored, never delivered or executed*; `PurposeChanged`, refresh triggers, and decision feedback are returned/derived values, not bus messages
- **No event sourcing / production event store / serialization format** — the `event-recording` log records occurrences; aggregates rebuild via `reconstitute`, not by replaying the log
- **No Garmin/FIT adapter** (the first input is a synthetic fixture)
- **No *full* `athlete` model** — Purpose + AthleteDecision slices are implemented; **inferred state, capacity,
  readiness, fatigue, constraints, and path-dependent memory are not** (risk still enters as a placeholder)
- **No compliance/obedience scoring and no outcome-based validation** (Impl 009): `divergedFromSupport` is
  neutral fact; the outcome never grades `SupportQuality`; **no full `DecisionOutcome` object / no pattern engine**
- **No reinterpretation engine** (the `PurposeReinterpretationStatus` type ships; the engine does not)
- **No generic projection engine and no top-level `projection` module** — freshness is local to
  `understanding` for the one concrete projection; **no `ImpactAssessment`** second projection yet
- **No production reprojection service / scheduler / projection repository** — reprojection is proven as a *neutral check-only harness* (Impl 012); a production recompute service, an event-driven/scheduled refresh, and a projection store are deferred
- **An explicit application orchestration boundary exists (Impl 025)** — `application-orchestration` composes the existing rendering/audit/record/review/display/delivery/event services over injected collaborators in explicit ordered steps (no domain model/repository/persistence of its own; no event bus/scheduler/retry/workflow; no automatic delivery; no event-triggered step; no domain mutation; AC20 updated additively) — but **no production orchestration *entrypoint*** (a UI/API/use-case surface, or a scheduler/event-driven trigger, that *invokes* `orchestrateRenderDeliver`) exists yet; the remaining cross-module purpose/refresh/decision/reprojection seams still live in the neutral test harness
- **A live-provider smoke-test boundary helper exists (Impl 026)** — `liveProviderSmoke(command, deps)` in `rendering/application` verifies the live path with **one** bounded call through the existing seam behind the unchanged validator, gated fail-closed (opt-in → CI → credential → live policy, each before any call), redacted, reading no env, importing no transport/adapter/delivery/event/orchestration internal, persisting/delivering/recording/mutating nothing — **no npm script** and **no CI-live lane** exist; the default suite + CI make no live call and need no credential. The operator live-smoke entrypoint (outside `src/`) was realized in Impl 027. *A smoke test proves wiring, not wisdom.*
- **An operator live-smoke entrypoint exists (Impl 027)** — `scripts/operator-live-smoke.mjs` (plain ESM, outside `src/`/`tsconfig.include`/the default test glob/both guard scan roots, runnable via Node 22 native type-stripping) reads the real opt-in/CI/credential env flags outside `src`, wires the approved `ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver` credential chain, calls `liveProviderSmoke` exactly once, and prints one redacted `OperatorSmokeOutput` JSON (`rawRetained: false`, `wiringOnly`, `sideEffects: "none"`) — **no npm script, no CI live lane, persisting/delivering/recording/mutating nothing** — but **no cloud adapter behind the managed-secret seam**, **no production secret rollout**, and **no production orchestration entrypoint** exist yet. *Smoke proves wiring, not wisdom; operator success is not evidence; a redacted exit code is not domain truth.*
- **A provider-neutral managed-secret credential-source seam exists (Impl 028)** — `ManagedSecretStoreClient` (pure TypeScript async interface; always resolves; no cloud SDK; injected in all usage), `ManagedSecretCredentialSource` (async pre-fetch class; `available` → `{ [secretName]: value }` → fed into unchanged synchronous `EnvironmentProviderCredentialResolver`; non-`available` → empty → resolver classifies `missing` → no call), and `FakeManagedSecretStoreClient` (4 deterministic scenarios; sentinel `"opaque:test-managed-secret"`) now exist inside `rendering/application/` — no cloud SDK, no `process.env` read, no dependency change — but **no cloud adapter implementing `ManagedSecretStoreClient`** (AWS Secrets Manager / GCP / Azure / Vault) exists yet; the seam is in place; a real adapter is the next slice. *secret manager = credential source; managed-secret seam ≠ live-call enablement ≠ cloud adapter ≠ production rollout.*

[ASSUMPTION] Each was excluded so the core's invariants could be proven *before* the surfaces most
likely to erode them are introduced. **Spec 007 (purpose change), Spec 008 (projection freshness),
Spec 009 (athlete-decision feedback), Spec 010 (persistence ports + in-memory repositories), Spec 011
(domain event/outcome records + traceability envelope), Spec 012 (reprojection harness), Spec 013
(manual input adapter), Spec 014 (rendering boundary), Spec 015 (rendered-message record/review), Spec
016 (delivery boundary), Spec 017 (provider adapter seam), Spec 018 (provider-attempt audit), Spec 019
(real-provider-ready boundary), Spec 020 (concrete-provider adapter shell), Spec 021 (opt-in live-provider
boundary), Spec 022 (injected environment credential resolver), Spec 023 (one-file process-environment source
adapter), Spec 024 (ref-only provider/rendering/delivery occurrence event surface), Spec 025 (explicit
application orchestration boundary), Spec 026 (opt-in live-provider smoke-test boundary), Spec 027 (manual
operator live-smoke entrypoint), and Spec 028 (provider-neutral managed-secret credential-source boundary) are done
(Impl 007/008/009/010/011/012/013/014/015/016/017/018/019/020/021/022/023/024/025/026/027/028).** The
next responsible mission — now that the live path is **verifiable by a pure, injected wiring check** (Impl 026), the
**operator can run the wiring check on demand** (Impl 027), and the **managed-secret credential-source seam is in
place** (Impl 028) — is a **cloud adapter behind the managed-secret seam** (Spec 029: a real AWS Secrets Manager /
GCP / Azure / Vault adapter implementing `ManagedSecretStoreClient`, behind the same injected resolver seam, never
weakening a guard); then a production orchestration **entrypoint** (UI/API/scheduler that invokes the composition),
a real endpoint/live-call rollout, an event-bus/persistence for the event surface, a real channel/transport and
storage backend, and the reasoning reinterpretation engine — each adding the rest without collapsing any distinction
above. See the Core Completion Review for the full ledger.

---

## How This Maps to the Repository

- The five stages correspond to the technical boundary map in
  [`../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md`](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md).
- The full conceptual foundation is indexed at [`../README.md`](../README.md) and
  [`../domain-modeling/README.md`](../domain-modeling/README.md).
- Dependencies flow up the ladder only: `observation → reasoning → understanding → decision-support`,
  with `Athlete` and `Understanding` as cross-cutting contexts. Lower modules never import higher ones
  (enforced by dependency-boundary tests in each module's `tests/`).
- `athlete` (Impl 007 + 009) is an **upstream leaf**: it imports only `shared-kernel` and **never** imports
  `observation`/`reasoning`/`understanding`/`decision-support`. Purpose and decisions reach downstream
  through **explicit seams** — a `PurposeVersionRef` context handle into `Hypothesis.purposeContextRef`, a
  `PurposeContext` into `decision-support`, selective `markUnderstandingStale("purpose-change")` into
  `understanding`, and an `AthleteDecision` → `SubjectiveObservation` re-entry — all applied by neutral
  harness/application adapters, not by `athlete` reaching out (enforced by `athlete`'s boundary test).
- **Persistence (Impl 010)** lives in each module's `application/`: a repository **port** + **in-memory
  adapter** per aggregate, plus a validated `toState()`/`reconstitute()` on the aggregate. Ports/adapters
  import only their **owning module + `shared-kernel`** (enforced by a persistence-boundary test); there is
  **no `src/infrastructure`** and **no `persistence`/`repositories` module**. The store preserves the
  model; it never becomes it.
- **Event recording (Impl 011 + Impl 024 output-out surface)** lives in `src/modules/event-recording/` as a
  **dependency-neutral** leaf beside `shared-kernel`: `domain/` (the `DomainEventRecord`, closed catalog —
  now **34 types: 26 reasoning-core + 8 output-out**, with `ProducingModule` including `rendering`/`delivery`
  and `EventArtifactKind` including the five output-out kinds — `TraceabilityEnvelope`, ref-only
  `EventPayloadRef`, append-only `DomainEventRecordLog`) + `application/` (the repository **port** +
  **in-memory adapter**, **plus the eight pure Impl 024 provider/rendering/delivery occurrence factories**).
  It **imports only `shared-kernel`** and **no domain module imports it** (enforced by `event-recording`'s
  boundary + negative-capability tests; the Impl 024 catalog additions are string-literal — referencing
  `ProviderAttemptRecord`/… by kind is not a cross-module import); the **event catalog stays out of
  `shared-kernel`**. Application/harness coordination composes records from domain refs; the records are
  append-only, ref-only, and inert — the factories persist nothing, call no provider/transport/validator/
  renderer/delivery sink, and auto-emit from nothing (explicit composition only). They **complement** the
  repositories, never replace them, and there is **no event bus, handler, async delivery, or event sourcing**.
- **Reprojection (Impl 012)** lives in `src/modules/__tests__/reprojection-harness/` as a **neutral
  test-support / coordination seam — not a production module**. It is the cross-module coordinator (like the
  purpose/decision adapters): it imports the modules it coordinates (`understanding`, `event-recording`,
  read access to repositories) and **no production module imports it** (enforced by a structural guard). It
  **recomputes only through the owning module's functions** (`produceUnderstandingAssessment`,
  `applyFreshness`), is **check-only** (mutates nothing; `refresh-derived`/`mark-stale` reserved + throw),
  reads **event records as candidates/context only**, and **reports** drift/findings. There is **no
  production `reprojection` module, scheduler, event sourcing, or projection repository** (structural guard).
- **Manual Input Adapter (Impl 013)** lives in `src/modules/observation/application/manual-input-*`,
  exported additively from `observation/index.ts`. It is an **`observation`-owned ingress** whose only
  domain output is an `ObservationSet`: it builds the existing `RawObservationInput`s, calls
  `recordObservationSet`, and persists via `ObservationSetRepository`. It **imports only `observation` +
  `shared-kernel`** — **no `event-recording`, `reasoning`, `understanding`, `decision-support`, or
  `athlete`** (structural guard; `observation` stays `event-recording`-free). The optional
  `ObservationSetRecorded` is composed **only** in `src/modules/__tests__/manual-input-event-recording.test.ts`
  (neutral harness) from a ref-only candidate. There is **no `src/modules/{manual-input,ingestion}` and no
  `src/{adapters,api,ui,infrastructure}`** (structural guard).
- **Rendering (Impl 014)** lives in `src/modules/rendering/` (`domain/` + a single public `index.ts`): the
  `RenderableDomainOutput` + `renderableFromTerminalOutput`, `RenderingRequest`, `RenderedMessage`/
  `RenderOutcome`, the closed `RenderingFailure` catalog, the `RenderingPolicy`, the **mandatory**
  `RenderingValidator`, and the deterministic **fake renderer**. It **imports only `shared-kernel` +
  read-only `decision-support` types** (`import type`) and **no domain module imports it** (structural
  guard). The real-vs-fake composition is exercised in `src/modules/__tests__/decision-support-rendering.test.ts`
  (neutral harness). There is **no `src/{llm,api,ui,infrastructure}` and no `src/modules/{llm,openai,provider}`**
  and **no provider/network call** (structural guard).
- **Rendered-message record / review (Impl 015)** also lives **inside `rendering`**: `domain/` adds
  `rendered-message-record.ts` (+ `ids.ts`, `render-review.ts`, `display-eligibility.ts`) and `application/`
  adds the `RenderedMessageRecordRepository` **port** + `InMemoryRenderedMessageRecordRepository`, surfaced
  additively from `rendering/index.ts`. The repo files import only **own module + `shared-kernel`**
  (persistence-boundary compliant); `rendering` still imports **no `event-recording`** and **auto-emits
  nothing** (a `RenderedMessageRecord`/`RenderReview` may now be *referenced by id* in a ref-only
  `event-recording` event — Impl 024 — but `rendering` neither imports the module nor emits one; structural
  guard, reconciled for the Impl 024 catalog). The record is append-only/auditable, the review append-only, the
  display eligibility derived — **auditability, not authority**; **no production DB / delivery / UI / API**.
- **Delivery (Impl 016)** lives in `src/modules/delivery/` (`domain/` + `application/` + a single public
  `index.ts`): `domain/` adds the ids, the closed `DeliveryTarget`/`DeliveryOutcome`/`DeliveryFailureReason`,
  `DeliveryRequest`, `DeliveryEligibilityCheck` (+ the raw-reason→failure-reason mapping), the `DeliverySink`
  interface + deterministic `InMemoryTestSink`, and the auditable `DeliveryRecord` (validated `toState`/
  `reconstitute`); `application/` adds the `DeliveryRecordRepository` **port** + `InMemoryDeliveryRecordRepository`
  + the `requestDelivery` service. It **imports only `shared-kernel` + read-only `rendering`** (the rendering
  import lives only in `delivery-service.ts`, keeping the `-repository`/`in-memory-` files persistence-boundary
  compliant); it imports **no** `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`/
  `event-recording`, **`rendering` does not import `delivery`**, and **no upstream module imports `delivery`**
  (structural guards). Two **documented test-only** blocker fixes landed: `delivery` was added to the e2e
  `ALLOWED_MODULES` set, and the Impl 015 forbidden-layer test dropped its now-obsolete `delivery` entry.
  There is **no `src/{api,ui,infrastructure}` and no `src/modules/{provider,channel,notification,scheduler,
  event-bus,llm}`**, **no real channel/provider**, and `delivery` **auto-emits nothing** (a `DeliveryRequest`/
  `DeliveryRecord` may now be *referenced by id* in a ref-only `event-recording` event — Impl 024 — but
  `delivery` neither imports `event-recording` nor emits one; structural guard).
- **Provider adapter seam (Impl 017)** lives **inside `rendering`** (no new module): `domain/`
  (`provider-rendering-request.ts` + the `providerRenderingRequestFrom` guard, `provider-draft.ts`,
  `provider-failure.ts`) and `application/` (`provider-adapter.ts` port, `fake-provider-adapter.ts`,
  `provider-rendering-service.ts`), surfaced additively from `rendering/index.ts`. The provider files import
  only their own `rendering` surfaces + read-only `decision-support` *types* (type-only); they import **no**
  `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`, and **no module outside
  `rendering` imports the seam** (structural guards). The service reuses the **unchanged** `validateDraft`;
  there is **no `src/{providers,prompts,api,ui,infrastructure}` and no `src/modules/{provider,llm,openai,
  anthropic,model}`**, **no SDK/network/`process.env`/prompt token** (structural guard), and the slice was
  **additive** — **no documented blocker was needed**.
- **Real-provider-ready boundary (Impl 019)** also lives **inside `rendering`** (no new module): `domain/`
  (`provider-secret-ref.ts`, `provider-client-config.ts`, `provider-instruction.ts`,
  `provider-client-response.ts`, `provider-operational-failure.ts`) and `application/`
  (`provider-client-boundary.ts` async port, `fake-provider-client.ts`, `real-provider-adapter.ts`,
  `real-provider-rendering-service.ts`), surfaced additively from `rendering/index.ts`. It imports only its
  own `rendering` surfaces + read-only `decision-support` *types*; it imports **no** upstream module / `delivery`
  / `event-recording`, and **no module outside `rendering` imports it** (structural guards). The async path
  reuses the **unchanged** `providerRenderingRequestFrom` + `validateDraft`; the **synchronous Impl 017 seam is
  untouched**. There is **no `src/{providers,prompts,api,ui,infrastructure}` and no `src/modules/{provider,llm,
  openai,anthropic,model,telemetry,evaluation}`**, **no real SDK/network/`fetch(`/`node:http(s)`/`process.env`/
  prompt-template token**, and **no raw secret** (structural guard). The slice was **additive** — **no
  documented blocker was needed**.
- **Provider attempt audit (Impl 018)** also lives **inside `rendering`** (no new module): `domain/`
  (`provider-attempt-record.ts`, `provider-attempt-status.ts`, `provider-attempt-failure-reason.ts`,
  `provider-draft-summary.ts`) and `application/` (`provider-attempt-record-repository.ts` port,
  `in-memory-provider-attempt-record-repository.ts`, `provider-attempt-audit-service.ts`), surfaced additively
  from `rendering/index.ts`. The repo-named files import only own `rendering` domain + `shared-kernel`
  (persistence-boundary compliant); the audit files import only own `rendering` surfaces + read-only
  `decision-support` *types*, and **import no `event-recording`/`delivery`/upstream module**. The audit
  **observes** a `ProviderRenderOutcome` and **does not call** the provider/`requestProviderRendering`/
  `validateDraft` (structural guard). The record is append-only/auditable, **no raw draft retained** —
  **auditability, not authority**; there is **no `src/modules/{provider-audit,telemetry,evaluation}`**, **no
  `event-recording` import and no auto-emit** (a `ProviderAttemptRecord` may now be *referenced by id* in a
  ref-only `event-recording` event — Impl 024 — but the audit neither imports the module nor emits one;
  structural guard, reconciled for the Impl 024 catalog), and **no SDK/network/prompt token** (structural
  guard); the slice was **additive** — **no documented blocker was needed**.
- **Concrete-provider adapter shell (Impl 020)** also lives **inside `rendering/application`** (no new module):
  `concrete-provider-client.ts` (the `ConcreteProviderClient`), `concrete-provider-prompt-serializer.ts`,
  `concrete-provider-response-parser.ts`, and `concrete-provider-error-mapper.ts`, surfaced additively from
  `rendering/application/index.ts` (the only existing-file change). The files use **neutral** names and contain
  **no vendor token** — the provider target (OpenAI) lives only in Spec 020A — so the Impl 017/019
  negative-capability guards (which scan every `provider-`/real-provider file for `openai`/`anthropic`/`axios`/
  `node:http(s)`/`fetch(`/`http(s)://`/`process.env`) pass **unchanged**; a slice-specific
  `concrete-provider-negative-capability.test.ts` re-asserts them plus a **package guard** (no runtime dependency;
  devDeps remain `typescript` + `@types/node`). They import only own `rendering` surfaces + read-only
  `decision-support` *types*, **no module outside `rendering` imports them**, and there is **no
  `src/{providers,prompts,api,ui,infrastructure}` and no `src/modules/{provider,llm,openai,anthropic,model,
  telemetry,evaluation}`**. The client is **disabled by default** (deterministic fixture transport for tests only;
  no live call); a draft reaches a message only via the unchanged `validateDraft`. The slice was **additive** —
  **no documented blocker was needed**, and **`package.json`/lockfile are unchanged**.
- **Opt-in live-provider boundary (Impl 021)** also lives **inside `rendering/application`** (no new module):
  `live-call-policy.ts` (`LiveCallPolicy`, disabled by default), `provider-credential-resolver.ts` (the port +
  opaque token) + `static-provider-credential-resolver.ts` (deterministic, test/composition only),
  `live-provider-http-transport.ts` (the **only** file with a native network token — `fetch` behind an injected
  endpoint), and `live-provider-client.ts` (`LiveProviderClient` implements `ProviderClientBoundary`), surfaced
  additively from `rendering/application/index.ts`. `LiveProviderClient` is a **sibling** of `ConcreteProviderClient`
  (async network transport vs sync fixture), reusing the same pure serializer/parser/error-mapper; it **fails closed
  before transport** and **never calls `validateDraft`**. The native-network guard exception is **surgical**: the
  Impl 014 broad rendering scan and the Impl 017 `/provider-/` scan now allow a network token **only** in
  `live-provider-http-transport.ts` (each asserts it is the *only* network file), while **`process.env` / `openai` /
  `anthropic` / `axios` stay forbidden everywhere**, including that file; the Impl 019/020 guards are **untouched**.
  A slice-specific `live-provider-negative-capability.test.ts` re-asserts the posture plus a **package guard** (no
  runtime dependency; devDeps remain `typescript` + `@types/node`). There is **no `src/{providers,prompts,api,ui,
  infrastructure}` and no `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`**, **no env
  resolver / `process.env`**, and **no SDK/package change**. The slice was **additive** — **no documented blocker
  was needed**, and **`package.json`/lockfile are unchanged**.
- **Injected environment credential resolver (Impl 022)** also lives **inside `rendering/application`** (no new
  module): `environment-provider-credential-resolver.ts` (`EnvironmentProviderCredentialResolver` +
  `EnvironmentCredentialSource` / `EnvironmentResolverConfig` / `CredentialValidationPolicy`), surfaced additively
  from `rendering/application/index.ts`. It implements the **existing** injected `ProviderCredentialResolver` port
  (sibling of `StaticProviderCredentialResolver`) and reads **one configured key** from an **injected** source map —
  it does **not** read the real `process.env`, so **`process.env` appears nowhere in `src/`** and **no guard
  exception was needed** (the file is already scanned by the Impl 017 `/provider-/` and Impl 021 `/provider-credential/`
  guards — both forbid the env token — plus a dedicated `environment-secret-negative-capability.test.ts` that also
  asserts no dependency change). It imports only its own `rendering` surfaces (+ `shared-kernel` if needed); **no
  module outside `rendering` imports it**; the static resolver and live transport are untouched. There is **no
  `src/modules/{secrets,config,infrastructure,…}`** and **no SDK/package change**. The slice was **additive** — **no
  documented blocker was needed**, and **`package.json`/lockfile are unchanged**.
- **One-file process-environment source adapter (Impl 023)** also lives **inside `rendering/application`** (no new
  module): `process-environment-credential-source-adapter.ts` (`ProcessEnvironmentCredentialSourceAdapter` +
  `ProcessEnvironmentAccessor` / `defaultProcessEnvironmentAccessor` / `processEnvironmentCredentialSourceAdapter`
  factory / `APPROVED_PROVIDER_CREDENTIAL_KEY`), surfaced additively from `rendering/application/index.ts`. It binds
  the real process environment into the existing injected `EnvironmentCredentialSource` shape and **feeds, does not
  replace**, `EnvironmentProviderCredentialResolver`. The **direct `process.env` token lives in exactly this one
  production file** (the `defaultProcessEnvironmentAccessor` read) — a **new** `process-environment-negative-capability.test.ts`
  scans all production `src/` files and asserts the token's single home (the test builds the token regex indirectly,
  so it is not itself a token site) plus a package guard (no dependency). **No existing provider/network/vendor/SDK/prompt
  guard was weakened**; the network token stays confined to `live-provider-http-transport.ts`. The accessor is
  **required** (no implicit default), so the default suite injects a fake and reads no real env. It imports only its
  own `rendering` surfaces (+ `shared-kernel` if needed); **no module outside `rendering` imports it**; the resolver,
  static resolver, and live transport are untouched. There is **no `src/modules/{secrets,config,infrastructure,…}`**
  and **no SDK/package change**. The slice was **additive** — **no documented blocker was needed**, and
  **`package.json`/lockfile are unchanged**.
- **Provider / rendering / delivery event surface (Impl 024)** lives **inside `event-recording`** (no new module):
  `domain/` additively extends the closed catalogs (`producing-module.ts` += `rendering`/`delivery`;
  `event-payload-ref.ts` += the five output-out artifact kinds; `domain-event-type.ts` += eight occurrence/outcome
  types + their catalog entries — every prior entry intact), and `application/` adds
  `provider-rendering-delivery-events.ts` (the **eight pure factories**) surfaced additively from
  `event-recording/application/index.ts`. The factory file imports **only** `event-recording`'s own `domain/` +
  `shared-kernel` — **no rendering/delivery/provider import** (import-scan guard); each factory builds a
  `DomainEventRecord` via the existing `DomainEventRecord.record(...)` and persists/calls/mutates/emits nothing
  (negative-capability scan forbids `validateDraft`/provider seam/`LiveProviderClient`/`DeliverySink`/`.save`/
  `.append`/`fetch`). Payloads stay ref-only (allowed keys only) and raw-free (serialized-state leak scan).
  The Impl 015/018 "catalog not extended" guards were **reconciled** (the rendering-internal audit symbols stay
  forbidden outside `rendering`; referencing an artifact by string kind is allowed). There is **no
  `src/modules/{event-bus,queue,scheduler,telemetry,evaluation,provider}` / `api` / `db`** and **no SDK/package
  change** (devDeps stay `typescript` + `@types/node`). The slice was **additive** — **no production module
  modified beyond the catalog/exports**, and **`package.json`/lockfile are unchanged**.
- **Application orchestration (Impl 025)** lives in `src/modules/application-orchestration/` as a new
  **application-composition module** (not a domain capability): `application/` holds `orchestrate-render-deliver.ts`
  (the single `orchestrateRenderDeliver` surface), `orchestration-command.ts`, `orchestration-dependencies.ts`,
  `orchestration-result.ts` (the closed `OrchestrationOutcome`), and `orchestration-trace.ts` (the ref-only
  `OrchestrationTrace` + closed `OrchestrationStage` catalog), surfaced through `application/index.ts` and the
  module's `index.ts`. It has **no `domain/` directory and defines no repository** — every side-effecting
  collaborator (provider client, repositories, sink, event repo) is **injected** via
  `ExplicitOrchestrationDependencies`. It imports **only the public indexes** of `rendering`/`delivery`/
  `event-recording` (+ `shared-kernel`) and the `ProviderClientBoundary` abstraction (import-scan guard forbids any
  live-transport/credential-resolver/process-env/concrete-provider internal and any upstream domain module); a
  negative-capability scan asserts the trace/result are ref-only/raw-free (no `bearer`/`authorization`/`apikey`/
  `secret`/`process.env`/message-body marker), and structural guards assert no `src/modules/{workflow,event-bus,
  queue,scheduler,retry,telemetry,evaluation,provider}` / `api` / `db` and that **`rendering`/`delivery`/
  `event-recording` import no `application-orchestration`**. The **AC20 `ALLOWED_MODULES`** set in
  `src/modules/__tests__/end-to-end-responsible-reflection.test.ts` was **extended additively** to admit the new
  module (a documented approved-module update, not a guard weakening — the guard still rejects every other
  unapproved top-level module). The slice was **additive** — the only existing-file change is the documented AC20
  update — and **`package.json`/lockfile are unchanged** (devDeps stay `typescript` + `@types/node`).
- **Live-provider smoke-test boundary (Impl 026)** lives **inside `rendering`** (no new module):
  `application/live-provider-smoke.ts` holds `liveProviderSmoke(command, deps)` + the closed `LiveProviderSmokeStatus`
  / `LIVE_PROVIDER_SMOKE_STATUSES` + the closed command/dependencies/result types, surfaced additively through
  `rendering/application/index.ts` (re-exported by the module's `index.ts`). It is a **pure, fully-injected** helper
  (Tech Spec 026A **Option C**) — **not an operator script** (none exists; **no npm script, no `scripts/`**). It
  imports `requestRealProviderRendering` + the `ProviderClientBoundary` / `LiveCallPolicy` / `ProviderCredentialResolver`
  types and **nothing else side-effecting**: an import-scan guard asserts it imports **no** live HTTP transport
  (`live-provider-http-transport`) / process-env adapter (`process-environment-credential-source-adapter`) /
  concrete-provider internal / `delivery` / `event-recording` / `application-orchestration` / upstream-domain module,
  and references no `liveProviderHttpTransport` / `LiveProviderClient` / `orchestrateRenderDeliver` symbol; a token
  scan asserts **no** network/vendor/`process.env`/retry/scheduler token; a redaction scan asserts the result carries
  no rendered body / raw draft / prompt / payload / response / secret / token / env value. Because the filename
  matches `live-provider`, the **existing Impl 021 live-provider guard also catches it** and stays green; the
  repo-wide **`process.env` one-file guard** stays green (the helper is not a new token site); **AC20 is untouched**
  (no new module). Tests (`rendering/tests/live-provider-smoke-boundary.test.ts` + `…-negative-capability.test.ts`)
  are deterministic, fakes only — **no live network, no real env, no CI credential**. The slice was **additive** — the
  only existing-file change is the `rendering/application/index.ts` exports — and **`package.json`/lockfile are
  unchanged** (devDeps stay `typescript` + `@types/node`). The **operator entrypoint (outside `src/`) was realized in
  Impl 027.**
- **Manual operator live-smoke entrypoint (Impl 027)** is **outside `src/`** (no new module, no new in-`src` file):
  `scripts/operator-live-smoke.mjs` (plain ESM, outside `src/`/`tsconfig.include`/the default test glob/both guard
  scan roots) + `src/modules/rendering/application/operator-live-smoke-entrypoint.ts` (pure `src` support helper,
  typechecked, env-free). The `.mjs` reads `AURORA_LIVE_PROVIDER_SMOKE`, `AURORA_CI`, `AURORA_PROVIDER_CREDENTIAL`
  **outside `src`** (legitimate; no new in-`src` `process.env` token; the production `process.env` seal intact),
  wires the approved `ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver` credential
  chain, calls `liveProviderSmoke` **exactly once**, and prints one redacted `OperatorSmokeOutput` JSON. The support
  helper exports `parseOperatorSmokeEnv`/`syntheticSmokeRenderingRequest`/`operatorSmokeOutput`/`operatorSmokeExitCode`
  — typechecked, env-free, tested with fakes only. **No npm script; excluded from the default test suite; no CI live
  lane; persists/delivers/records/mutates nothing.** The Impl 026 `scripts/` guard was **reconciled (strengthened, not
  weakened)**: "no `scripts/` yet" → "if `scripts/` exists, may only contain `operator-live-smoke.mjs`". Module count
  unchanged; **`package.json`/lockfile unchanged** (devDeps stay `typescript` + `@types/node`). The slice was
  **additive** — the only `src/` change is the new support-helper file and `rendering/application/index.ts` exports.
  *Smoke proves wiring; operator success is not evidence.*
- **Provider-neutral managed-secret credential-source boundary (Impl 028)** lives **inside `rendering/application`**
  (no new module): `managed-secret-credential-source.ts` holds `ManagedSecretStoreClient` (async interface; always
  resolves; no cloud SDK; injected), `ManagedSecretResolution` (4-state discriminated union), `ManagedSecretCredentialSource`
  (async pre-fetch class; `toEnvironmentCredentialSource()`; `available` → `{ [secretName]: value }`; non-`available`
  → `{}` → downstream resolver classifies `missing` → no provider call; pre-fetch pattern — the synchronous
  `EnvironmentProviderCredentialResolver` chain is **unchanged**), `ManagedSecretSourceConfig`, `ManagedSecretClientScenario`,
  and `FakeManagedSecretStoreClient` (4 deterministic scenarios; default `available`; sentinel `"opaque:test-managed-secret"`;
  no real secret; no SDK; constructed explicitly — never a global singleton), surfaced additively from
  `rendering/application/index.ts`. **No cloud SDK, no `process.env` token, no dependency change** — a new
  `managed-secret-negative-capability.test.ts` re-asserts: no `process.env` in the new file; process-env seal intact
  (exactly one approved file); no vendor/SDK/network/retry token; no forbidden import; no module outside `rendering`
  imports the new symbols; operator script unchanged and not referencing `ManagedSecretCredentialSource`; and a package
  guard. **`package.json`/lockfile unchanged** (devDeps stay `typescript` + `@types/node`). The slice was **additive**
  — the only existing-file changes are `rendering/application/index.ts` exports. *secret manager = credential source;
  managed-secret seam ≠ live-call enablement ≠ cloud adapter ≠ production rollout.*

---

*This diagram is documentation, not code. It tracks the implemented system; update it as new slices land.*
