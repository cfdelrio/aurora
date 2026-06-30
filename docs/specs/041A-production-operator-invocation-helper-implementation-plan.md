# Aurora — Technical Spec 041A — Production Operator Invocation Helper Implementation Plan

> **Status (2026-06-30).** Technical Specification phase for Spec 041 (`c6425a4`). It translates the production
> operator invocation helper boundary into a TS-strict implementation plan **grounded in the real code**. It is
> **plan only**: it implements no code, modifies no production code/test, edits no package file, adds no CLI/runtime
> shell/script/package command, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, adds no provider/live/
> delivery/persistence integration, amends no guard (AC20 untouched), and creates no production whole-core composer.
> Recent sequence: `0fd644b` (Impl 040-A) → `8d8dfff` (Docs) → `9b18cf5` (Roadmap checkpoint) → `c6425a4` (Spec
> 041). Validation at authorship: `tsc --noEmit` clean; `node --test` 832/832.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 041-A** and writes
no code/test.

---

## 1. Context recap

`[FACT]` Spec 041 decided (Option A boundary + Option B chosen, deferred): a **thin production helper** accepts a
caller-assembled `OfflineReflectionRuntimeCommand` + injected `OfflineReflectionRuntimeDependencies`, invokes
`offlineReflectionRuntime` **once**, immediately maps the outcome through `toOperatorSessionEnvelope`, and returns
**only** `OperatorSessionEnvelope` — making the raw `OfflineReflectionRuntimeOutcome` structurally unreachable at
the invocation seam. This plan decides *how* to implement it.

---

## 2. Real-Code Gap Analysis (grounded; no invented type names)

1. **Exported runtime command type (Q1).** `OfflineReflectionRuntimeCommand<TSubmission>` — exported from
   `application-orchestration/application/index.ts` (re-exporting `offline-reflection-runtime.ts`).
2. **Exported runtime deps type (Q2).** `OfflineReflectionRuntimeDependencies<TSubmission>` — same export site.
3. **Runtime function signature (Q3).** `offlineReflectionRuntime<TSubmission>(command:
   OfflineReflectionRuntimeCommand<TSubmission>, deps: OfflineReflectionRuntimeDependencies<TSubmission>):
   Promise<OfflineReflectionRuntimeOutcome>` (async).
4. **Runtime outcome type (Q4).** `OfflineReflectionRuntimeOutcome` (already safe-by-design: `rawRetained: false`,
   ref-only `trace`, `SafeReflectionProjection`, safe `intake`/`admissionReason`).
5. **Envelope type + mapper signature (Q5).** `OperatorSessionEnvelope` + `toOperatorSessionEnvelope(outcome:
   OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope` (pure, synchronous) — both exported from the
   application index (Impl 040-A).
6. **application-orchestration export pattern (Q6).** `index.ts` → `application/index.ts` re-exports functions +
   `export type { ... }` for types. A new helper would add `export { invokeOperatorSession }` + (no new type — it
   reuses existing types).
7. **Async behavior required (Q7).** The helper **must be async** (the runtime is async); it `await`s the runtime,
   then calls the synchronous mapper, returning `Promise<OperatorSessionEnvelope>`.
8. **The 039-A test-only helper (Q8).** `invokeThinOperatorSurface` (+ local `OperatorInvocationResult`) lives
   **inside** `__tests__/thin-operator-invocation-surface.test.ts`. The **pattern** (invoke → narrow) is promoted;
   the **local type** is **not** — the production helper returns the real `OperatorSessionEnvelope` (040-A), and
   the 039-A test is left unchanged.
9. **Import path constraints (Q9).** The helper imports only `offlineReflectionRuntime` + its command/deps/outcome
   types (from `./offline-reflection-runtime.ts`) and `toOperatorSessionEnvelope` + `OperatorSessionEnvelope`
   (from `./operator-session-envelope.ts`) — **no upstream core** (Impl 025 guard).
10. **Negative-capability guard style (Q10).** Sibling `*-negative-capability.test.ts` files read the production
    source as text (with a `stripComments` helper), assert forbidden imports/symbols/`process.env` absent, scan
    for forbidden dirs/scripts, and check `package.json`. The helper guard mirrors this.
11. **Can the runtime throw / return unexpected-failure (Q11)?** The runtime **wraps its whole body in
    try/catch** and returns a safe `unexpected-failure` outcome on any error (offline-reflection-runtime.ts ~174,
    232, 245–246) — it **never throws** and never leaks raw content.
12. **How to handle thrown errors safely (Q12).** **Preserve runtime behavior** — because the runtime never
    throws, the helper needs **no try/catch**: it awaits the runtime (safe outcome) and maps it. (If a future
    change ever made the runtime throw, a helper catch mapping to a safe `unexpected-failure` envelope could be
    added then — not now.)
13. **Prove raw outcome is not exposed (Q13).** The helper's return type is `Promise<OperatorSessionEnvelope>`
    (compile-level); tests assert the returned object has only envelope keys, carries no `reflection`/`text`/raw
    fields, and the helper source never returns the outcome directly.
14. **Prove mapper is mandatory (Q14).** A guard test asserts the helper source calls `toOperatorSessionEnvelope`
    and does **not** return `outcome` directly (no `return outcome`, no `{ outcome, ... }`).
15. **Prove no `process.env` (Q15).** Guard scans the helper source for the env token (absent).
16. **Prove no live provider/default secret (Q16).** The helper creates no deps and resolves no secret — deps are
    injected verbatim; a test runs with deterministic fakes and a throwing client on stopped paths.
17. **Prove no delivery (Q17).** `deliveryWithheld` stays `true` in the returned envelope; the helper imports no
    delivery module and calls no sink.
18. **Prove no event persistence (Q18).** The helper records/imports no event-recording; the envelope exposes no
    `eventRecordIds`.
19. **Prove no `AthleteDecision` (Q19).** The helper constructs no decision; the envelope carries only the
    decision-capture invitation/ref.
20. **Preserve AC20 (Q20).** No new module; production file imports no upstream core; consumes a caller-supplied
    renderable; composes no whole core.

`[FACT]` Decisive consequence: the implementation is a **~3-line async function** — `await
offlineReflectionRuntime(command, deps)` → `toOperatorSessionEnvelope(outcome)` → return — plus an export and two
test files. All inputs/outputs already exist and are exported; the runtime already handles errors safely; the only
new behavior is the **guarantee** that an invocation yields **only** the envelope.

---

## 3. Central Question

> How should Aurora implement a thin production operator invocation helper that invokes `offlineReflectionRuntime`
> once, immediately maps the outcome through `toOperatorSessionEnvelope`, and returns only `OperatorSessionEnvelope`
> — preserving injected deps, no-default-live-call, delivery-withheld, no `AthleteDecision`, no persistence, no
> CLI/API/deployment, and AC20?

**Answer:** a **production application-level async helper** `invokeOperatorSession(command, deps):
Promise<OperatorSessionEnvelope>` in `application-orchestration/application/operator-session-invocation.ts`, that
awaits the runtime and returns only the mapped envelope — with tests + a negative-capability guard. No try/catch
(the runtime never throws); no deps creation; no env/secret/live/delivery/persistence/decision.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Implementation scope → **Option B: production application-level helper returning only `OperatorSessionEnvelope`**

Implementation 041-A adds the thin helper + an export + tests + a negative-capability guard. Rejected: **A**
(documented-only) — leaves the leakage open for production callers; **C** (test-only) — does not protect production
callers; **D** (returns raw outcome + envelope) — preserves the leakage the helper exists to close; **E/F**
(CLI/script/package, API/UI) — premature surfaces (must sit behind the helper); **G** (assembles whole-core) —
AC20b; **H** (live/secret/delivery integration) — opt-in/deferred; **I** (persistence) — deferred. Option B makes
`toOperatorSessionEnvelope` mandatory and exposes no raw outcome.

### `[DECISION]` Decision 2 — Placement → **`src/modules/application-orchestration/application/operator-session-invocation.ts`** (+ `application/index.ts` export)

The helper invokes an **application runtime** and returns an **application envelope**, so it belongs in the
`application-orchestration` application layer. **Not** `rendering`; **not** inside `operator-session-envelope.ts`
(keep the *mapper* and the *invocation* concerns in separate files); **not** inside `offline-reflection-runtime.ts`
(the runtime stays unchanged); **not** a new `src/modules/session` (AC20a). It imports **only** the runtime
function + its types and the mapper + envelope type — **no upstream core** (Impl 025).

### `[DECISION]` Decision 3 — Helper name and signature → **`invokeOperatorSession`**

```text
export async function invokeOperatorSession<TSubmission>(
  command: OfflineReflectionRuntimeCommand<TSubmission>,
  deps: OfflineReflectionRuntimeDependencies<TSubmission>,
): Promise<OperatorSessionEnvelope>
```

Generic over `TSubmission` (mirroring the runtime). Repo-consistent (`invoke…` / `verb-noun`). Body:
`const outcome = await offlineReflectionRuntime(command, deps); return toOperatorSessionEnvelope(outcome);`

### `[DECISION]` Decision 4 — Return strategy → **only `OperatorSessionEnvelope`**

The helper returns **only** `OperatorSessionEnvelope`; it **never** returns the raw
`OfflineReflectionRuntimeOutcome`, **never** a tuple `{ outcome, envelope }`, and **never** exposes
`reflection.text` / raw provider output / hidden reasoning / secrets / delivery artifact / delivery ids /
`eventRecordIds` / `AthleteDecision`. Enforced at the **type level** (return type) **and** by guard tests.

### `[DECISION]` Decision 5 — Error strategy → **preserve runtime behavior; no helper try/catch**

Because `offlineReflectionRuntime` already wraps its body in try/catch and returns a safe `unexpected-failure`
outcome on any error (never throwing, never leaking), the helper adds **no** try/catch: it awaits the runtime and
maps the (always-safe) outcome. This avoids inventing broad error semantics and keeps the helper a pure pass-through
to the mapper. (Documented assumption: if the runtime is ever changed to throw, a helper catch mapping to a safe
`unexpected-failure` envelope — exposing no stack/secret/raw exception — would be added then.)

### `[DECISION]` Decision 6 — Dependency behavior → **injected only**

Deps are **always injected**; the helper **creates no deps**, **reads no `process.env`**, **resolves no secrets**,
**selects no provider**, **calls no live client** except through the runtime via the explicitly-supplied deps,
**creates no delivery sink**, and **persists nothing**.

### `[DECISION]` Decision 7 — Relationship to future CLI/API → **deferred; must sit behind the helper**

CLI/API/operator-tool/deployment remain **deferred**. A future surface must **call `invokeOperatorSession`** and
receive only `OperatorSessionEnvelope`. 041-A adds **no** script/package/API/deployment surface.

### `[DECISION]` Decision 8 — Guards → **a new negative-capability test mirroring the existing style**

Add `operator-session-invocation-negative-capability.test.ts` proving the helper source: imports only the runtime
+ mapper (+ their types) and **no** upstream core / provider / delivery / secret module; reads no `process.env`;
calls `toOperatorSessionEnvelope` and never returns the raw outcome; constructs no `AthleteDecision`; records no
events; creates no forbidden dir/script; leaves `offlineReflectionRuntime`, the operator script, and package files
unchanged. Plus the functional tests assert the returned envelope is safe across all six dispositions. All existing
guards stay green unchanged.

---

## 5. Required File Layout (Implementation 041-A)

```text
src/modules/application-orchestration/application/operator-session-invocation.ts                    (new — invokeOperatorSession)
src/modules/application-orchestration/application/index.ts                                          (edit — export the helper)
src/modules/application-orchestration/tests/operator-session-invocation.test.ts                      (new — functional tests)
src/modules/application-orchestration/tests/operator-session-invocation-negative-capability.test.ts  (new — guard)
```

**Must NOT create:** `src/modules/{session,runtime,api,server,ui,frontend,worker,auth,db}/`,
`scripts/operator-session.mjs`, `scripts/run-operator-session.mjs`. **Must NOT edit:** `package.json`,
`package-lock.json`, `scripts/operator-live-smoke.mjs`, `offline-reflection-runtime.ts`,
`operator-session-envelope.ts`. **Must NOT integrate with:** a deployment target, provider selection, cloud-secret
adapters, delivery sinks, event persistence, an auth/session/user system.

---

## 6. Required Test Plan (Implementation 041-A)

1. The helper invokes `offlineReflectionRuntime` once. 2. It invokes `toOperatorSessionEnvelope`. 3. It returns
**only** `OperatorSessionEnvelope`. 4. It does **not** expose the raw `OfflineReflectionRuntimeOutcome`. 5–10. each
disposition (`reflection-ready` / `renderable-inadmissible` / `not-rendered` / `input-rejected` / `recording-failed`
/ `unexpected-failure`) returns a safe envelope only. 11. `deliveryWithheld` preserved. 12. `rawRetained: false`.
13. no `reflection.text`. 14. no raw provider output. 15. no hidden reasoning. 16. no secrets. 17. no delivery
artifact/ids. 18. no `eventRecordIds`. 19. no `AthleteDecision`. 20. no `process.env`. 21. no real-secret
resolution by default. 22. no live provider by default. 23. no delivery sink call. 24. creates no `AthleteDecision`.
25. persists no events/session records. 26. assembles no whole-core chain. 27. no CLI/script/package command. 28.
no API/UI/deployment. 29. package/lockfile unchanged. 30. operator-live-smoke unchanged. 31.
`offlineReflectionRuntime` unchanged. 32. AC20 remains green.

The functional tests exercise the helper through the **real** runtime with deterministic fakes (reusing the
036-A/039-A wiring: whole-core assembly in `__tests__/`… — but since this test lives in
`application-orchestration/tests/`, prefer **fixture renderables** (`req`/`supportRenderable`) for admitted/safe
and inadmissible paths, the `voice-escalating` fake for `not-rendered`, and an empty-`athleteRef` submission for
`input-rejected`; `recording-failed`/`unexpected-failure` may be covered by mapping fixture outcomes if not
reachable, consistent with 040-A). A throwing client proves stopped paths never render.

---

## 7. Boundary / Import Rules

**Allowed:** `application-orchestration` importing its own `offlineReflectionRuntime` + command/deps/outcome types,
and `toOperatorSessionEnvelope` + `OperatorSessionEnvelope`; tests using deterministic fake deps + typed command
fixtures (+ rendering fixtures for renderables). **Forbidden:** a production whole-core composer; a
`reflection-composition` module; `application-orchestration` production files importing upstream core; a
CLI/runtime shell; a script/package command; an API/UI/operator tool; automatic delivery / live provider /
real-secret resolution / `AthleteDecision` creation; DB/auth/session/deployment files; SDK/dependency changes.

---

## 8. Required Distinctions

```text
invocation helper ≠ CLI ≠ script ≠ package command ≠ deployment ≠ API/UI ≠ live-provider enablement ≠ delivery
mechanism ≠ persistence/session record ≠ whole-core composer ≠ AthleteDecision creator ≠ truth validator ≠
recommendation quality proof · OperatorSessionEnvelope ≠ raw runtime outcome · reflection-ready ≠ delivered ≠
AthleteDecision · deliveryWithheld ≠ delivery failure · decisionCapture invitation ≠ AthleteDecision ·
Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 9. Relationship To Existing Architecture

- **Spec 041** — implements its production invocation-helper boundary as a thin async function.
- **Spec 040 / Impl 040-A** — `toOperatorSessionEnvelope` + `OperatorSessionEnvelope`; the helper makes the mapper
  mandatory.
- **Spec 039 / Impl 039-A** — the test-only seam pattern promoted to production (the 039-A test stays unchanged).
- **Impl 032R-A** — `offlineReflectionRuntime`, awaited unchanged; its internal try/catch makes a helper catch
  unnecessary.
- **Impl 025** — the application-orchestration import guard the helper must honor (no upstream core).
- **Spec 034R / AC20** — whole-core composition stays a test harness; the helper composes no core.

---

## 10. Open Questions (deferred to Implementation 041-A / a later slice)

1. Final helper name (`invokeOperatorSession` proposed) — confirm at implementation.
2. Whether the functional test reuses whole-core assembly (in `__tests__/`) or fixture renderables (in
   `application-orchestration/tests/`); default: fixture renderables, to keep the test in the module's own `tests/`.
3. Whether a future helper catch is ever needed (only if the runtime is changed to throw — not now).
4. When a future CLI/API is considered (deferred until a real caller appears).
5. Whether any docs/runbook updates are needed after implementation (likely the Docs consolidation post 041).

---

## 11. Implementation Task Preview

**Next mission: Implementation 041-A — production operator invocation helper.** Add
`operator-session-invocation.ts` (`invokeOperatorSession(command, deps): Promise<OperatorSessionEnvelope>` =
`await offlineReflectionRuntime(...)` → `toOperatorSessionEnvelope(...)`), export it from `application/index.ts`,
and add `operator-session-invocation.test.ts` + `…-negative-capability.test.ts` proving the helper returns only
the envelope, the mapper is mandatory, the raw outcome is never exposed, and the no-env/no-live/no-delivery/
no-decision/no-persistence guards; no runtime/mapper/CLI change. After it lands, **Docs consolidation post 041**.

---

## 12. Success Criteria

Can Aurora implement a thin production helper `invokeOperatorSession(command, deps):
Promise<OperatorSessionEnvelope>` that awaits `offlineReflectionRuntime` once, maps through
`toOperatorSessionEnvelope`, and returns **only** the envelope — making the raw outcome structurally unreachable —
**without** a try/catch (the runtime never throws), deps creation, `process.env`, live provider, real secret,
delivery, persistence, `AthleteDecision`, CLI/API/deployment, whole-core composition, or an AC20 amendment? **Yes —
via Option B:** a thin async helper in `application-orchestration/application/`, exported from its index, with
functional + negative-capability tests; implementation is `Implementation 041-A`. Validation at authorship: `tsc
--noEmit` clean; `node --test` 832/832; no code, test, package, runtime, CLI, deployment, CI, SDK, or dependency
change introduced by this document; AC20 untouched.
