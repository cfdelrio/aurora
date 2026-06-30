# Aurora — Roadmap Status Checkpoint (post Implementation 040-A)

> **Status (2026-06-29).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **session envelope / redaction contract arc closed** (Spec 040
> → Tech Spec 040A → Impl 040-A → Docs) and recommends the highest-value next boundary. Validation at authorship:
> `tsc --noEmit` clean; `node --test` **832/832**. Prior checkpoints: `ROADMAP_STATUS_POST_035.md`,
> `ROADMAP_STATUS_POST_037.md`, `ROADMAP_STATUS_POST_038.md`, `ROADMAP_STATUS_POST_039.md`.

---

## 1. The arc just closed (Spec 040 → Impl 040-A)

The post-039 checkpoint recommended stabilizing the envelope/redaction contract *before* any production helper;
that arc is complete:

```text
Roadmap checkpoint post-039 → Spec 040 (session envelope / redaction contract boundary)
→ Tech Spec 040A (Option C: production pure type + mapper; helper deferred)
→ Impl 040-A (operator-session-envelope.ts: OperatorSessionEnvelope + toOperatorSessionEnvelope; +22; production)
→ Docs consolidation (CORE_COMPLETION_REVIEW / SYSTEM_MAP / TECHNICAL_BOUNDARY_MAP / PERSISTENCE_AND_EVENT_SURFACE)
```

`[FACT]` The envelope/redaction contract is now **production code** — a pure, synchronous, whitelist-only mapper
`toOperatorSessionEnvelope(outcome: OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope` (+ the
`OperatorSessionEnvelope` type) in `application-orchestration`, which **constructs the envelope field-by-field
(never spreads the raw outcome)**, preserves exact status / `deliveryWithheld` / `rawRetained: false`, exposes
only `reflectionRef` + safe flags (never `reflection.text`), the decision-capture invitation/ref, and a ref-only
trace summary; always excluding raw provider output / hidden reasoning / secrets / delivery ids / `eventRecordIds`
/ `AthleteDecision` / raw stack. It is a **safety addition, not a product surface**.

`[FACT]` The post-039 blocker ("no stable envelope contract; the type is local/test-only") is **resolved**: the
contract is now a real, exported, enforceable production type + mapper.

---

## 2. Current architectural state

### 2.1 What is now production code
- The five-stage kernel + rendering / delivery / event-recording / application-orchestration (Impl 001–029);
  `offlineReflectionRuntime` (Impl 032R-A); the Tier 2 `admitExternalRenderable` (Impl 035-A/B); and now the
  **`OperatorSessionEnvelope` type + `toOperatorSessionEnvelope` mapper** (Impl 040-A) — a pure projection.

### 2.2 What remains test-only
- The whole-core composition (observation→…→`TerminalOutput`→renderable) lives **only** in `__tests__/` (AC20).
- The first session (036-A), the decision-capture loop (037-A), the operator runbook (038-A), and the **thin
  invocation seam** (039-A — `invokeThinOperatorSurface` + its `OperatorInvocationResult`, **local to the test**)
  are all test harnesses/proofs.

### 2.3 What remains docs-only
- The operator runbook checklist (`docs/runbooks/operator-session-runbook.md`).

### 2.4 What the envelope mapper proves / does not do
- **Proves:** the redaction contract is **enforceable in code** — a whitelist projection that cannot leak an
  unsafe field by accident (it never spreads the raw outcome) and covers all six dispositions.
- **Does not do:** it does **not** invoke the runtime, a provider, or delivery; **does not** create an
  `AthleteDecision`; **does not** persist or emit events; **does not** read `process.env`; **does not** import
  upstream core. It is a pure function over an outcome a caller already holds — **it does not force its own use.**

### 2.5 What invocation seam exists only as proof
- 039-A proved "invoke the runbook once" as a **local test helper** (`invokeThinOperatorSurface`) returning a
  **local** envelope. There is **no production invocation handle** that binds the runtime to the mapper.

### 2.6 What production invocation surface does NOT exist
- No production invocation **helper**, no real **caller**, no entrypoint / shell / CLI / API / UI / worker.
  `package.json` exposes only `typecheck` / `test` / `check`; the only `scripts/` file is `operator-live-smoke.mjs`.
- No deployment target, networked surface, real delivery channel, live-provider default, auth/user/session,
  production DB/schema/migration, or CI live lane.

### 2.7 Whether a real caller exists
- **No.** The mapper and the seam are used only by tests. No production code path calls `offlineReflectionRuntime`
  and consumes its outcome.

### 2.8 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*

### 2.9 What no-default-live-call still means
- No live provider by default: runtime/runbook/seam/mapper/smoke all use deterministic fakes; live requires
  explicit, gated opt-in (Impl 021/026/027), never on in the default suite or CI.

### 2.10 What delivery-withheld still means
- `offlineReflectionRuntime` never delivers (`deliveryWithheld: true` always; no delivery sink); the mapper
  preserves this and exposes no delivery ids. Delivery withheld ≠ delivery failure.

### 2.11 What athlete decision ownership still means
- Only `athlete-declared`/`athlete-reported` decisions exist, captured by the separate Impl 037-A flow; the
  envelope carries only the decision-capture **invitation/ref**, never an `AthleteDecision`. Operator mediation ≠
  athlete decision.

### 2.12 What remains deferred from Specs 030/031/032
- **Spec 030** (secret provider), **031** (deployment target), **032** (runtime surface, resolved offline by
  032R/033) — all still deferred with **no new evidence**.

### 2.13 What a production invocation helper would add / risk
- **Would add (a concrete safety boundary, not ceremony):** a **single safe invocation handle** that runs the
  runtime and **mandatorily** maps the outcome through `toOperatorSessionEnvelope`, returning the
  `OperatorSessionEnvelope` **only** — structurally preventing any caller from receiving (or forwarding) the raw
  `OfflineReflectionRuntimeOutcome`. The mapper alone does not force its own use; a helper makes redaction
  **unbypassable at the invocation boundary** — the invocation analogue of what the mapper did for the envelope.
- **Would risk:** drifting toward a product surface (CLI/API) if not held to a thin function; importing upstream
  core (Impl 025 guard); adding a live/delivery default. Mitigated by keeping it a thin, injected, fake-default,
  application-level function that calls only the runtime + the mapper.

### 2.14 What the next irreversible commitment would be
- A **deployment/provider/DB/auth** lane or an **AC20 amendment** are the hard-to-reverse commitments. A thin
  invocation helper is mid-weight but reversible. The **least irreversible** value-adding step is a **behavioral
  boundary spec** for that helper (no implementation yet), since the contract it would carry (040-A) now exists.

---

## 3. Correction pressure (carried forward)

`[FACT]` Do **not** recommend a helper *merely because the envelope exists* — only if it adds a concrete safety/
usability boundary beyond ceremony (single safe handle; mandatory `toOperatorSessionEnvelope`; no raw-outcome
leakage; injected deps; no live/delivery default; no `AthleteDecision`; future-caller compatible). Do **not**
recommend a CLI/script/package command before a helper boundary justifies it; API/UI/deployment without new
product evidence; provider/deployment without new evidence; persistence/auth/event integration that prematurely
couples the offline loop; or an AC20 amendment caller assembly can avoid.

`[FACT]` The honest read: the post-039 deferral of a helper rested on **two** reasons — (a) no stable envelope
contract and (b) no real caller. **(a) is now resolved (040-A).** (b) remains. But a helper's safety value —
making redaction **unbypassable** at the invocation boundary — does **not** depend on a caller existing, exactly
as the mapper's redaction value did not. So a helper now clears the "beyond ceremony" bar **as a safety
boundary**, provided it stays a thin function and CLI/API stay deferred behind it.

---

## 4. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | Real caller? | AC20-safe | No-default-live-call | Delivery-withheld | Athlete-owns-decision | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Needs CLI/script/package | Uses envelope safely | Fake-testable | Least-irreversible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1 — Spec 041: Production Operator Invocation Helper Boundary** | **High** — the single safe handle that makes `toOperatorSessionEnvelope` unbypassable and never leaks the raw outcome | **Low** (if held to a thin function) | **Ready** (runtime + admission + mapper all exist) | No (but safety value is caller-independent) | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | ✅ (mandates it) | ✅ | **Yes** (boundary spec first) |
| 2 — Spec 041: Caller / Operator Tool Boundary | Med | Med-High — tool-shaped, drifts toward a surface | Not ready (no caller; presupposes the helper) | No | ✅ if offline | needs care | ✅ | ✅ | ✅ | maybe | maybe | ✅ | partial | No |
| 3 — Spec 041: CLI / Script Boundary | Low now | High — deployment-shaped | Not ready (presupposes helper) | No | ✅ if offline | needs care | ✅ | ✅ | ✗ likely | maybe | Yes | ✅ | partial | No |
| 4 — Reopen Spec 030/031 (provider/deployment) | Low now | Med-High | **Not ready** — no new evidence | No | ✅ | ✅ | ✅ | ✅ | ✗ forces it | Yes | maybe | n/a | partial | No |
| 5 — Persistence / event-recording integration | Medium | Med — premature DB/event coupling | Partial | No | ✅ | ✅ | ✅ | ✅ | ✅ | likely Yes | maybe | partial | ✅ | No |
| 6 — API/UI/operator tool surface | Low now | **High** — deployment-shaped | Not ready | No | ✅ if offline | needs care | ✅ | ✅ | ✗ likely | Yes | Yes | ✅ | partial | No |
| 7 — AC20 amendment / production whole-core composition | Low/negative now | **High** — relaxes a defining invariant | Not justified | n/a | ✗ changes AC20 | ✅ | ✅ | ✅ | ✅ | No | No | n/a | n/a | No |
| 8 — Stop & stabilize | — | — | — | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | n/a | ✅ | — |

`[FACT]` With the envelope contract now real, the one missing safety boundary is the **invocation handle** that
*binds* the runtime to the mapper so redaction is **unbypassable**. Option 1 fills exactly that, depends only on
what exists, stays AC20-safe and fake-testable, and — framed as a **boundary spec first** — is the least
irreversible value-adding step.

`[FACT]` **Why Option 1 over Options 2/3/6.** A "caller/tool" (2), CLI/script (3), or API/UI (6) are *surfaces*
that presuppose the helper and drift toward deployment; the helper boundary must come first and they stay deferred
**behind** it. **Why over 4/5/7.** No new provider/deployment evidence (4); persistence/event (5) prematurely
couples the offline loop; an AC20 amendment (7) is unjustified. **Why not 8.** The tree is green, but a thin
helper adds a real, caller-independent safety guarantee — stabilizing is not the highest-value move.

---

## 5. Recommendation

`[RECOMMENDATION] Next mission: Spec 041 — Production Operator Invocation Helper Boundary.`

- **Why this is next.** The mapper (040-A) makes redaction enforceable but **does not force its own use**: a
  caller could still call `offlineReflectionRuntime` and read the raw outcome. The missing safety boundary is a
  **single, thin, production invocation handle** that runs the runtime and **mandatorily** returns only a
  `toOperatorSessionEnvelope(...)` result — making raw-outcome leakage **structurally impossible** at the
  invocation boundary. The post-039 blocker (no stable contract) is resolved by 040-A, so this is now well-founded.
  Spec 041 should define it **behaviorally, docs-only** (no implementation), specifying: a thin application-level
  function accepting a **caller-assembled `OfflineReflectionRuntimeCommand` + injected deterministic deps**, that
  calls `offlineReflectionRuntime`, immediately maps the outcome through `toOperatorSessionEnvelope`, returns the
  `OperatorSessionEnvelope` **only** (never the raw outcome), and the forbidden behaviors.
- **Why alternatives are deferred.** A caller/tool (2), CLI/script (3), and API/UI (6) presuppose the helper and
  drift toward a surface; Spec 030/031 (4) lack new evidence; persistence/event (5) prematurely couples the loop;
  an AC20 amendment (7) is unjustified; stopping (8) forgoes a real caller-independent safety gain.
- **Risks that must be preserved.** The helper must be a **thin function**, not a surface: `invocation helper ≠
  CLI ≠ script ≠ package command ≠ API/UI ≠ deployment ≠ live-provider enablement ≠ delivery mechanism ≠
  whole-core composer ≠ AthleteDecision creator`; it must **return only `OperatorSessionEnvelope`** (no raw
  outcome leakage), use **injected deps** (deterministic fake by default), call **no** live provider / real
  secret / `process.env` / delivery sink, create **no** `AthleteDecision`, persist **nothing**, and import **no**
  upstream core (Impl 025). AC20 intact; delivery-withheld; athlete-decision-ownership; fully fake-testable; CLI/
  API/deployment/persistence/provider stay deferred **behind** it.
- **Files/specs to read next.** `040-session-envelope-redaction-contract-boundary.md`,
  `040A-session-envelope-redaction-contract-implementation-plan.md`,
  `src/modules/application-orchestration/application/operator-session-envelope.ts`,
  `src/modules/application-orchestration/application/offline-reflection-runtime.ts`,
  `src/modules/__tests__/thin-operator-invocation-surface.test.ts` (the 039-A local helper to promote),
  `039-thin-operator-invocation-surface-boundary.md`, `038-operator-session-runbook-caller-assembly-contract.md`,
  `034R-...-ac20-redecision.md`.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  **production operator invocation helper boundary**: its input (caller-assembled command + injected deps), its
  single safe output (`OperatorSessionEnvelope` only), its mandatory use of `toOperatorSessionEnvelope`, what it
  may/ must not call, the disposition pass-through, and the forbidden behaviors — with AC20, no-default-live-call,
  delivery-withheld, and athlete-decision-ownership preserved; CLI/API/script/package/deployment/persistence
  explicitly deferred. Then `Tech Spec 041A` + an implementation only if it warrants code (likely a thin
  application-level helper, promoting the 039-A local seam, with negative-capability guards).

---

## 6. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **832/832**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C superseded; Tech Spec 034A on hold; Spec 034R standing (caller-supplied renderable); no
production whole-core composer; no `reflection-composition` module; `offlineReflectionRuntime` unchanged and
admission-gated; `validateDraft` mandatory downstream; delivery withheld; no `AthleteDecision` auto-created;
decision capture is explicit athlete-declared/reported input only; the operator runbook is a test-only proof +
docs-only checklist; the thin invocation seam is a test-only proof; the session envelope/redaction contract is a
**production pure mapper + type** (no helper/caller/CLI/persistence); no package/dependency/runtime/API/UI/CLI/
worker/deployment/CI/SDK change. This checkpoint is docs-only.
```text
envelope mapper ≠ invocation helper · invocation helper ≠ CLI ≠ script ≠ package command ≠ API/UI ≠ deployment ≠ live-provider enablement ≠ delivery mechanism ≠ whole-core composer ≠ AthleteDecision creator ·
safe envelope ≠ raw runtime dump · reflectionRef ≠ reflection text · decisionCapture invitation/ref ≠ AthleteDecision ·
reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure · admission success ≠ truth ·
validateDraft success ≠ recommendation quality · Aurora advises; the athlete decides; Aurora never presents inference as fact.
```
