# Aurora — Specification 041 — Production Operator Invocation Helper Boundary

> **Status (2026-06-30).** Specification phase. This document defines the **behavioral boundary** for a *production
> operator invocation helper* — the single safe handle that invokes the offline reflection runtime once and returns
> only an `OperatorSessionEnvelope` — the continuation selected by the post-040 roadmap checkpoint (`9b18cf5`). It
> is **behavioral-only**: it implements no code, writes no technical spec, modifies no production code/test, creates
> no CLI/runtime shell/script/package command, edits no package file, adds no API/UI/worker/DB/auth/deployment/CI/
> SDK file, adds no provider/live/delivery/persistence integration, amends no guard (AC20 untouched), and creates no
> production whole-core composer. Recent sequence: `0fd644b` (Impl 040-A) → `8d8dfff` (Docs) → `9b18cf5` (Roadmap
> checkpoint post-040). Validation at authorship: `tsc --noEmit` clean; `node --test` 832/832.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a boundary; it
adds no code.

---

## 1. Context

`[FACT]` Impl 040-A shipped a production pure mapper: `toOperatorSessionEnvelope(outcome:
OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope` (+ the `OperatorSessionEnvelope` type) in
`application-orchestration/application/operator-session-envelope.ts`. It makes the redaction contract
**enforceable** — but it **does not force its own use**.

`[GAP]` A caller can still invoke `offlineReflectionRuntime(command, deps)` directly and **handle the raw
`OfflineReflectionRuntimeOutcome`** (which carries `reflection.text`, the full `trace`, etc.), bypassing the
mapper. The missing safety boundary is a **single production invocation handle** that runs the runtime and returns
**only** the narrowed `OperatorSessionEnvelope`, making raw-outcome leakage **structurally unavailable** at the
invocation seam. Spec 039 proved this seam test-only (`invokeThinOperatorSurface`, a *local* helper); Spec 040
made the envelope a stable production contract. Spec 041 names the **production helper boundary** that binds them.

---

## 2. Central Question

> Can Aurora add a **thin production helper** that accepts a caller-assembled command + injected deps, invokes
> `offlineReflectionRuntime(...)`, immediately maps the outcome through `toOperatorSessionEnvelope(...)`, and
> returns **only** `OperatorSessionEnvelope` — without becoming a CLI, API, deployment, live-provider enablement,
> delivery, persistence, decision capture, or whole-core composition?

The helper must keep these distinctions legible (never collapse):

```text
invocation helper ≠ CLI · invocation helper ≠ script · invocation helper ≠ package command ·
invocation helper ≠ deployment · invocation helper ≠ API/UI · invocation helper ≠ live-provider enablement ·
invocation helper ≠ delivery mechanism · invocation helper ≠ persistence/session record ·
invocation helper ≠ whole-core composer · invocation helper ≠ AthleteDecision creator ·
invocation helper ≠ truth validator · invocation helper ≠ recommendation quality proof
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."*

The helper must **not** convert operational invocation into truth, delivery, a decision, recommendation quality,
or a product deployment. It is the safe-by-construction entry point that runs the session once and hands back only
the redacted envelope.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **What the helper would receive.** A **caller-assembled** `OfflineReflectionRuntimeCommand<TSubmission>`
   (`submission`, `athleteRef`, `request`, `operatorMediation`, `timing`, `ids?`) — assembled **outside** the
   helper (the helper assembles nothing).
2. **What the helper would call.** `offlineReflectionRuntime(command, deps)` **once**, then
   `toOperatorSessionEnvelope(outcome)` — both existing, unchanged. Nothing else.
3. **What the helper would return.** **Only** `OperatorSessionEnvelope` (`Promise<OperatorSessionEnvelope>`, since
   the runtime is async).
4. **Why returning only `OperatorSessionEnvelope` matters.** It makes the mapper **mandatory** at the invocation
   boundary: a caller using the helper **cannot** receive or forward the raw `OfflineReflectionRuntimeOutcome`
   (`reflection.text`, full `trace`, etc.). Redaction becomes **unbypassable** — the invocation analogue of the
   enforceable whitelist the mapper gave the envelope.
5. **Why returning `OfflineReflectionRuntimeOutcome` must be forbidden.** Returning the raw outcome (or both raw +
   envelope) re-opens exactly the leakage the helper exists to close (`reflection.text` / full trace exposure).
6. **What the helper must not assemble.** The `RenderingRequest` / renderable (caller-assembled; the whole-core
   composition stays a test harness — AC20), the deps as live clients, a real secret, or an `AthleteDecision`.
7. **What the helper must not infer.** That an admitted renderable is true; that a reflection is a decision; that
   silence/behavior is a decision.
8. **What the helper must not persist.** Anything — no repository, session record, or event.
9. **What the helper must not deliver.** Anything — it calls no delivery sink; `deliveryWithheld` stays `true`.
10. **What the helper must not create.** An `AthleteDecision` (capture stays the separate Impl 037-A flow).
11. **How no-default-live-call is preserved.** The helper uses the **injected** deps verbatim; it resolves no real
    secret and calls no live provider by itself; live behavior stays behind the existing opt-in gates.
12. **How delivery-withheld is preserved.** The runtime never delivers; the envelope carries `deliveryWithheld:
    true` and no delivery ids; the helper adds no delivery.
13. **How athlete decision ownership is preserved.** The envelope carries only the decision-capture invitation/ref;
    the helper creates no decision; later capture is the separate athlete-declared/reported flow.
14. **How AC20 remains intact.** The helper lives in `application-orchestration/application/`, imports **no**
    upstream core (Impl 025 guard), composes no whole core, and consumes a caller-supplied renderable.
15. **How a future CLI/API/operator tool would sit behind this helper.** Such a surface would **call the helper**,
    receive only the `OperatorSessionEnvelope`, and add only transport/formatting — never the runtime/mapper
    directly, never the raw outcome.
16. **Why this is not provider/deployment selection.** No provider is chosen, no deployment target; the helper
    only wires existing functions over injected deps.
17. **Why this is not persistence/event integration.** The helper persists nothing and emits no events.
18. **Why this is not a runtime shell.** It is a thin library function, not an executable entrypoint/process.
19. **What remains outside scope.** CLI/script/package command, API/UI/worker, deployment/provider/DB/auth/CI/SDK,
    live-provider enablement, real delivery, persistence, decision capture, and whole-core composition.
20. **What a future tech spec must decide.** The exact helper name, module placement, async return type, error
    handling if the runtime throws, the import strategy, and the tests proving the mapper is mandatory and the raw
    outcome is never exposed. (`Tech Spec 041A`.)

`[FACT]` Decisive consequence: the runtime + mapper already exist; the helper adds **one safety guarantee** — that
the **only** thing an invocation produces is a redacted envelope — which the mapper alone cannot enforce. This is a
safety boundary, not a product surface, and its value does not depend on a caller existing (exactly as the
mapper's did not).

---

## 5. Decision Framework & Options

Evaluated on: redaction safety · raw-outcome-leakage prevention · caller usability · least irreversible commitment
· AC20 preservation · no-default-live-call preservation · delivery-withheld preservation · athlete decision
ownership · fake-testability · future CLI/API compatibility · no premature deployment/provider choice · no
DB/auth/CI/deployment dependency · no package-script requirement.

| Option | Verdict |
| --- | --- |
| **A — Behavioral boundary only; production helper deferred** | **Selected (this spec).** Defines the boundary now; implementation deferred to `Tech Spec 041A`. |
| **B — Production application-level helper that returns only `OperatorSessionEnvelope`** | **Adopted as the chosen direction (implementation deferred).** The thin helper that makes the mapper mandatory and exposes no raw outcome. |
| C — A test-only helper remains sufficient | **Rejected.** The 039-A test helper does not protect *production* callers; only a production helper makes leakage structurally unavailable. |
| D — A helper that returns both raw outcome and envelope | **Rejected.** Preserves the very raw-outcome leakage the helper exists to close. |
| E — CLI/script/package command now | **Rejected — premature surface.** Must sit behind the helper. |
| F — API/UI/operator tool now | **Rejected — premature surface, deployment-shaped.** |
| G — A helper that assembles the whole-core chain | **Rejected.** AC20b forbids a production whole-core composer; the renderable stays caller-assembled. |
| H — A helper with live-provider/default-secret/delivery integration | **Rejected.** Live/provider/delivery remain opt-in/deferred; the helper uses injected deps only and delivers nothing. |
| I — A persistence/session-record helper | **Rejected.** Persistence is deferred; the helper records nothing. |
| J — Defer the helper indefinitely | **Rejected.** The envelope is now stable; the helper prevents leakage today. |

---

## 6. Decision

`[DECISION]` **Production operator invocation helper = a thin application-level function (Option A boundary now +
Option B chosen, implementation deferred).** It accepts a **caller-assembled `OfflineReflectionRuntimeCommand`**
and **injected `OfflineReflectionRuntimeDependencies`**, invokes `offlineReflectionRuntime` **once**, immediately
maps the outcome through `toOperatorSessionEnvelope`, and returns **only** `OperatorSessionEnvelope`. CLI, API/UI,
scripts, package commands, live-provider defaults, delivery, persistence, `AthleteDecision` capture, and
whole-core composition all remain **deferred / out of scope**.

**What inputs the helper accepts.** The existing `OfflineReflectionRuntimeCommand<TSubmission>` (caller-assembled —
the helper assembles no renderable).

**What dependencies are injected.** The existing `OfflineReflectionRuntimeDependencies<TSubmission>` —
deterministic fakes by default; no global service locator; no `process.env`.

**What it calls.** `offlineReflectionRuntime(command, deps)` once, then `toOperatorSessionEnvelope(outcome)` —
unchanged.

**What it returns.** **Only** `OperatorSessionEnvelope` (async — `Promise<OperatorSessionEnvelope>`).

**Why the raw outcome is not exposed.** Returning only the envelope makes `toOperatorSessionEnvelope` **mandatory**
and the raw `OfflineReflectionRuntimeOutcome` (incl. `reflection.text`, full `trace`) **structurally
unreachable** through the helper.

**How dispositions pass through via the envelope.** The envelope's exact `status` (`reflection-ready` /
`renderable-inadmissible` / `not-rendered` / `input-rejected` / `recording-failed` / `unexpected-failure`) +
safe fields are surfaced by the mapper; the helper renames/reinterprets nothing.

**How `deliveryWithheld` is preserved.** The runtime never delivers; the envelope carries `deliveryWithheld:
true`; the helper adds no delivery.

**How no-default-live-call is preserved.** Injected deps verbatim; no real-secret resolution; no live call by the
helper; no `process.env`.

**How decision capture remains separate.** The envelope carries only the decision-capture invitation/ref; capture
is the separate Impl 037-A athlete-declared/reported flow.

**Why this is not CLI/script/API/deployment.** The helper is a thin library function, not a transport, entrypoint,
or deployed surface; CLI/API stay deferred **behind** it.

**Why this is not persistence.** It records nothing and emits no events.

**Why this is not whole-core composition.** It consumes a caller-supplied renderable; the whole-core composition
stays a test harness (AC20).

**What the next technical spec must decide.** The exact helper name + module placement (likely
`application-orchestration/application/`, promoting the 039-A local seam); the async return type; error handling
if the runtime throws unexpectedly; the import strategy; and tests proving the mapper is mandatory, the raw
outcome is never exposed, and no `process.env` / live provider / default secret / delivery / persistence /
`AthleteDecision`. (`Tech Spec 041A`.)

`[ASSUMPTION]` The headline: **the mapper made redaction possible; the helper makes it unavoidable.** One thin
production handle runs the session once and returns only the redacted `OperatorSessionEnvelope` — so no caller
(today's tests or tomorrow's CLI/API) can touch the raw runtime outcome. It is a safety boundary, not a product
surface.

---

## 7. Required Helper Boundary

```text
input:  caller-assembled OfflineReflectionRuntimeCommand
deps:   injected OfflineReflectionRuntimeDependencies (deterministic fakes by default)
call:   offlineReflectionRuntime(command, deps)   (once)
map:    toOperatorSessionEnvelope(outcome)
return: OperatorSessionEnvelope only
```

**The helper may expose (via the envelope only):** `status`, `deliveryWithheld`, `rawRetained`,
`reflectionRef`/`reflectionFlags`, `decisionCapture` invitation/ref, `admissionReason`, `safeReason`,
`traceSummary`.

**The helper must not expose:** `OfflineReflectionRuntimeOutcome` (raw), `reflection.text`, raw provider output,
hidden reasoning, secret material, delivery artifact, delivery ids, `eventRecordIds`, `AthleteDecision`, raw
exception/stack.

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Safe helper invocation.** *Given* a caller-assembled command + deterministic deps, *when* the helper is
invoked once, *then* it calls the runtime and returns **only** `OperatorSessionEnvelope`.

**UC2 — Reflection-ready.** *Given* the runtime returns `reflection-ready`, *when* the helper maps it, *then* the
caller receives an envelope with delivery withheld, safe reflection refs/flags, the decision-capture
invitation/ref, and **no** raw runtime outcome.

**UC3 — Inadmissible.** *Given* `renderable-inadmissible`, *when* the helper maps it, *then* the caller receives a
safe `admissionReason` via the envelope and **no** provider/render/delivery/decision artifact.

**UC4 — Not-rendered.** *Given* `not-rendered`, *when* the helper maps it, *then* the caller receives a safe
failure disposition and **no** raw provider output or invalid draft.

**UC5 — Input rejected.** *Given* `input-rejected`, *when* the helper maps it, *then* the caller receives a safe
intake disposition and **no** admission/rendering artifact.

**UC6 — Recording/unexpected failure.** *Given* `recording-failed` or `unexpected-failure`, *when* the helper maps
it, *then* the caller receives a safe failure code only and **no** raw stack/secrets.

**UC7 — No live provider default.** *Given* deps are injected, *when* no explicit live-provider deps are supplied,
*then* the helper cannot resolve real secrets or call a live provider by itself.

**UC8 — No delivery.** *Given* runtime delivery stays withheld, *when* the helper returns, *then* it has called no
delivery sink and cannot represent the result as delivered.

**UC9 — Decision capture remains separate.** *Given* the envelope carries a decision-capture invitation/ref, *when*
the athlete later decides, *then* capture happens through the existing separate athlete-declared/reported flow.

**UC10 — Future CLI/API.** *Given* a future CLI/API wants to run a session, *when* designed, *then* it **must sit
behind** this helper and receive **only** `OperatorSessionEnvelope`.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- The helper accepts a caller-assembled command. ✅
- The helper accepts injected deps. ✅
- The helper calls `offlineReflectionRuntime` once. ✅
- The helper calls `toOperatorSessionEnvelope`. ✅
- The helper returns **only** `OperatorSessionEnvelope`. ✅
- The helper does **not** return the raw `OfflineReflectionRuntimeOutcome`. ✅
- The helper does **not** expose `reflection.text`. ✅
- The helper does **not** expose raw provider output. ✅
- The helper does **not** expose hidden reasoning. ✅
- The helper does **not** expose secrets. ✅
- The helper does **not** expose delivery artifact/ids. ✅
- The helper does **not** expose `eventRecordIds`. ✅
- The helper does **not** expose `AthleteDecision`. ✅
- The helper does **not** read `process.env`. ✅
- The helper does **not** resolve real secrets by default. ✅
- The helper does **not** call a live provider by default. ✅
- The helper does **not** call a delivery sink. ✅
- The helper does **not** persist session/events. ✅
- The helper does **not** create an `AthleteDecision`. ✅
- The helper does **not** assemble the whole-core chain. ✅
- The helper adds **no** CLI/script/package command. ✅
- The helper adds **no** API/UI/deployment. ✅
- AC20 remains unchanged. ✅
- No implementation/code is added by this spec (docs-only). ✅
- All existing tests remain green (832/832). ✅

---

## 10. Relationship To Existing Architecture

- **Spec 040 / Impl 040-A** — `OperatorSessionEnvelope` + `toOperatorSessionEnvelope`; the helper makes that
  mapper **mandatory** at the invocation seam.
- **Spec 039 / Impl 039-A** — the test-only invocation seam proof; the helper promotes that pattern to a
  production safety boundary.
- **Spec 038 / Impl 038-A** — the operator runbook the helper invokes once.
- **Spec 037 / Impl 037-A** — decision capture stays a separate flow.
- **Spec 035 / Impl 035-A/B** — admission; surfaced as the envelope's `admissionReason`.
- **Impl 032R-A** — `offlineReflectionRuntime`, invoked unchanged.
- **Impl 027 / 021/022/023/028/029** — operator live smoke + live-provider/secret boundaries stay
  operational/opt-in/deferred; the helper enables none by default.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the helper composes no core.

---

## 11. Forbidden Behaviors

```text
implementation code · technical implementation plan · CLI/runtime shell creation · script creation ·
package script changes · API/UI creation · deployment/CI files · DB/schema/migrations · auth/session/user implementation ·
SDK/dependency changes · AC20 amendment · reflection-composition module · production whole-core composer ·
caller assembly inside helper · automatic live call · automatic real-secret resolution · automatic delivery ·
automatic AthleteDecision creation · raw runtime outcome exposure · raw provider output exposure ·
hidden reasoning exposure · secret material exposure · delivery artifact exposure · eventRecordIds exposure ·
AthleteDecision exposure · raw exception stack exposure · envelope treated as a persisted record
```

---

## 12. Open Questions For Tech Spec 041A

1. Exact helper function name.
2. Exact module placement.
3. Exact import strategy.
4. Whether the helper should be async (because `offlineReflectionRuntime` is async).
5. Exact return type.
6. Exact error handling if the runtime throws unexpectedly.
7. Exact tests proving `toOperatorSessionEnvelope` is mandatory.
8. Exact tests proving the raw outcome is not exposed.
9. Exact tests proving no `process.env` / live provider / default secret / delivery.
10. Whether the helper should be production application-level only.
11. Whether a future CLI/API remains deferred.
12. Whether any docs/runbook changes are needed after implementation.

---

## 13. Success Criteria

Can Aurora add a **thin production helper** that accepts a caller-assembled `OfflineReflectionRuntimeCommand` +
injected deps, invokes `offlineReflectionRuntime` once, immediately maps through `toOperatorSessionEnvelope`, and
returns **only** `OperatorSessionEnvelope` — making raw-outcome leakage structurally unavailable — **without**
becoming a CLI/script/package command, API/UI, deployment, live-provider enablement, delivery mechanism,
persistence/session record, `AthleteDecision` creator, or whole-core composer, and **without** an AC20 amendment?
**Yes — via Option A (boundary) + Option B (chosen, deferred):** a production invocation-helper boundary over the
existing runtime + mapper, with implementation deferred to `Tech Spec 041A`. Validation at authorship: `tsc
--noEmit` clean; `node --test` 832/832; no code, test, package, runtime, CLI, deployment, CI, SDK, or dependency
change; AC20 untouched.
