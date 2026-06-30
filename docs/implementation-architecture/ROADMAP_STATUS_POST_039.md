# Aurora — Roadmap Status Checkpoint (post Implementation 039-A)

> **Status (2026-06-29).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **thin operator invocation surface arc closed** (Spec 039 →
> Tech Spec 039A → Impl 039-A → Docs) and recommends the highest-value next boundary. Validation at authorship:
> `tsc --noEmit` clean; `node --test` **810/810**. Prior checkpoints: `ROADMAP_STATUS_POST_035.md`,
> `ROADMAP_STATUS_POST_037.md`, `ROADMAP_STATUS_POST_038.md`.

---

## 1. The arc just closed (Spec 039 → Impl 039-A)

The post-038 checkpoint recommended defining the invocation seam *before* any CLI/helper; that arc is complete:

```text
Roadmap checkpoint post-038 → Spec 039 (thin operator invocation surface boundary)
→ Tech Spec 039A (Option B test-only proof; production helper deferred; reference-only envelope)
→ Impl 039-A (src/modules/__tests__/thin-operator-invocation-surface.test.ts +7; local helper + local envelope)
→ Docs consolidation (CORE_COMPLETION_REVIEW / SYSTEM_MAP / TECHNICAL_BOUNDARY_MAP / PERSISTENCE_AND_EVENT_SURFACE)
```

`[FACT]` The **invocation seam is now proven as a test**: a local `invokeThinOperatorSurface(command, deps)`
accepts a caller-assembled `OfflineReflectionRuntimeCommand` + injected deterministic deps, calls the existing
`offlineReflectionRuntime` (after `admitExternalRenderable`, unchanged), and **narrows** the already-safe outcome
to a **reference-only** envelope (`OperatorInvocationResult`) — exact disposition preserved, `deliveryWithheld`,
`rawRetained: false`, `reflectionRef?` (never `reflection.text`), decision-capture invitation/ref only, ref-only
`traceSummary`; excluding raw output / hidden reasoning / secrets / delivery artifact / `AthleteDecision`.

`[FACT]` **The helper and its envelope are LOCAL to the test.** There is **no production helper, no production
envelope type, and no real caller**. Tech Spec 039A deferred a production helper to "only if a real caller needs
the shipped narrowed envelope."

---

## 2. Current architectural state

### 2.1 What is now proven end-to-end (test-only)
- The five-stage epistemic kernel + rendering / delivery / event-recording / application-orchestration (Impl 001–029).
- `offlineReflectionRuntime` (Impl 032R-A) — operator-mediated, offline, render-only, delivery withheld; the
  enforced three-tier external renderable contract (Impl 035-A/B).
- The first operator-mediated reflection session (Impl 036-A); the post-reflection decision-capture loop
  (Impl 037-A); the operator session runbook (Impl 038-A); the **thin operator invocation surface seam**
  (Impl 039-A) — all **test harnesses**.
- **810/810** tests; `tsc --noEmit` clean.

### 2.2 What remains test-only
- The **whole-core composition** (observation→…→`TerminalOutput`→renderable) lives **only** in `__tests__/` (AC20).
- The **session**, the **decision capture**, the **runbook**, and now the **invocation seam + its envelope** are
  all test artifacts. The invocation helper and the `OperatorInvocationResult` envelope are **defined inside the
  test file** — not production types.

### 2.3 What human checklist exists
- `docs/runbooks/operator-session-runbook.md` — the docs-only operator checklist (Impl 038-A).

### 2.4 What invocation seam is proven
- "Invoke the runbook once" → caller-assembled command + injected deterministic deps → `admitExternalRenderable`
  + `offlineReflectionRuntime` → a **narrowed, reference-only, redacted** envelope mirroring the exact runtime
  dispositions. Proven across `reflection-ready` / `renderable-inadmissible` / `not-rendered` / `input-rejected`
  + the no-live / no-default-secret / no-`process.env` / no-delivery invariants.

### 2.5 What production runtime surface exists
- Still exactly two pure functions: `offlineReflectionRuntime(command, deps)` and `admitExternalRenderable(request)`.

### 2.6 What production invocation surface does NOT exist
- No production invocation **helper**, no production **envelope type**, no **real caller**, no entrypoint / shell /
  CLI / API / UI / worker. `package.json` exposes only `typecheck` / `test` / `check`; the only `scripts/` file is
  `operator-live-smoke.mjs` (separate operational smoke).
- No deployment target, networked surface, real delivery channel, live-provider default, auth/user/session,
  production DB/schema/migration, or CI live lane.

### 2.7 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*
  → The observation→renderable whole-core composition stays a **test harness**.

### 2.8 What no-default-live-call still means
- No live provider by default: runtime/runbook/seam/smoke all use deterministic fakes; live requires explicit,
  gated opt-in (Impl 021/026/027), never on in the default suite or CI.

### 2.9 What delivery-withheld still means
- `offlineReflectionRuntime` never delivers (`deliveryWithheld: true` on every path; no delivery sink); the seam's
  envelope preserves this. Delivery withheld ≠ delivery failure.

### 2.10 What the safe envelope proves / does not prove
- **Proves:** the disposition can be surfaced **reference-only** — refs/codes, not raw content — and that the
  narrowing **excludes** raw provider output / hidden reasoning / secrets / delivery artifact / `AthleteDecision`
  while preserving `status` / `deliveryWithheld` / `rawRetained: false`.
- **Does not prove:** that the reflection's claims are true/wise/high-quality (admission ≠ truth; `validateDraft`
  success ≠ recommendation quality); that any caller exists; that the envelope shape is a **stable contract** (it
  is currently a local test type, free to drift).

### 2.11 What remains deferred from Specs 030/031/032
- **Spec 030** (secret provider), **031** (deployment target), **032** (runtime surface, resolved offline by
  032R/033) — all still deferred with **no new evidence**. The offline loop needs none of them.

### 2.12 What a production helper would add / risk
- **Would add (only):** a **shipped, stable, reference-only envelope + redaction contract** a real caller (CLI/
  API/operator tool) could depend on; a single guarded place that narrows the runtime outcome.
- **Would risk:** ceremony without a caller (a forward-only wrapper adds no safety — Tech Spec 039A); importing
  upstream core surfaces (Impl 025 guard); drifting from the runtime's own redaction. **It is premature without a
  real caller and without a stable envelope contract for it to carry.**

### 2.13 What the next irreversible commitment would be
- A **deployment/provider/DB/auth** lane or an **AC20 amendment** are the hard-to-reverse commitments. Shipping a
  production helper is mid-weight (reversible but real). The **least irreversible** next step is a **behavioral,
  docs-only contract** that fixes the **safe session envelope + redaction rules** as a stable boundary — the
  artifact every future helper/CLI/API/caller would depend on — *without* shipping any of them.

---

## 3. Correction pressure (carried forward)

`[FACT]` Do **not** recommend: a production helper *merely because a test-only helper exists* (it must add a
concrete safety boundary beyond ceremony, and a real caller should justify it); a CLI/script/package command
before a helper/boundary justifies it; API/UI/deployment without new product evidence; provider/deployment
without new evidence (030/031/032 deferral holds); persistence/auth/event integration that prematurely couples
the offline loop; or an AC20 amendment caller assembly can avoid. **No real caller exists yet** — so the missing
piece is the **stable envelope/redaction contract**, not a helper without one.

---

## 4. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | AC20-safe | No-default-live-call | Delivery-withheld | Athlete-owns-decision | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Needs CLI/script/package | Real caller exists? | Fake-testable | Least-irreversible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **2 — Spec 040: Session Envelope / Redaction Contract Boundary** | **High** — fixes the stable safe-envelope + redaction contract every future helper/CLI/API/caller must depend on | **Low** | **Ready** (the local envelope already proven in 039-A) | ✅ (a contract; no module owns the core) | ✅ | ✅ | ✅ | ✅ | No | No | n/a (contract precedes caller) | ✅ | **Yes** |
| 1 — Spec 040: Production Application-Level Operator Invocation Helper | Med | **Med** | Partial — **no stable envelope contract yet, no real caller** | ✅ if import-safe | ✅ | ✅ | ✅ | ✅ | No | No | **No** | ✅ | No (ships code without a caller/contract) |
| 3 — Spec 040: Operator CLI / Script Boundary | Low now | Med-High | Not ready (presupposes helper + envelope) | ✅ if offline | needs care | ✅ | ✅ | ✅ | maybe | Yes | No | partial | No |
| 4 — Reopen Spec 030/031 (provider/deployment) | Low now | Med-High | **Not ready** — no new evidence | ✅ | ✅ | ✅ | ✅ | ✗ forces it | Yes | maybe | No | partial | No |
| 5 — Persistence / event-recording integration | Medium | Med — premature DB/event coupling | Partial | ✅ | ✅ | ✅ | ✅ | ✅ | likely Yes | maybe | No | ✅ | No |
| 6 — API/UI/operator tool surface | Low now | **High** — deployment-shaped | Not ready | ✅ if offline | needs care | ✅ | ✅ | ✗ likely | Yes | Yes | No | partial | No |
| 7 — AC20 amendment / production whole-core composition | Low/negative now | **High** — relaxes a defining invariant | Not justified | ✗ changes AC20 | ✅ | ✅ | ✅ | ✅ | No | No | No | n/a | No |
| 8 — Stop & stabilize | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | n/a | ✅ | — |

`[FACT]` 039-A proved the envelope *can* be narrowed safely, but only as a **local test type**. Before any helper,
CLI, API, or caller can exist, the **safe envelope shape + redaction rules** must be a **stable, named contract** —
otherwise each surface would re-invent (and risk drifting) the redaction. Option 2 fixes exactly that, depends
only on what 039-A already proved, ships no code, and is the **least irreversible**.

`[FACT]` **Why Option 2 over Option 1.** Option 1 (a production helper) is the *carrier*; Option 2 (the
envelope/redaction contract) is the *substance* the carrier would carry. Tech Spec 039A already established a
production helper adds safety **only via the narrowed envelope** — so the envelope contract must be fixed first.
With **no real caller**, shipping a helper now is ceremony-without-a-caller against an unstable (local) envelope;
defining the contract first lets a helper (Spec 041, if a caller appears) be a thin, import-safe carrier of a
*stable* type.

`[FACT]` **Why the rest wait.** **Option 3/6** (CLI/API) presuppose the helper + contract and add deployment
shape. **Option 4** has no new deployment/provider evidence. **Option 5** invites premature DB/event coupling.
**Option 7** relaxes AC20 with no need. **Option 8** is unnecessary — the tree is green and Option 2 is low-risk.

---

## 5. Recommendation

`[RECOMMENDATION] Next mission: Spec 040 — Session Envelope / Redaction Contract Boundary.`

- **Why this is next.** 039-A proved a reference-only envelope is *possible* but left it as a **local test type**.
  No real caller, helper, CLI, or API can safely exist until the **safe session envelope shape and its redaction
  rules** are a **stable, named contract** — what fields are exposed (refs/codes, dispositions), what is always
  excluded (raw provider output, hidden reasoning, secrets, delivery artifact, `AthleteDecision`), how each
  runtime disposition maps, and the `deliveryWithheld` / `rawRetained: false` invariants. Spec 040 should define
  this **behaviorally, docs-only**, evaluating whether the contract stays documented / test-fixtured or warrants a
  future production type, so a later helper (Spec 041, only if a caller appears) is a thin, import-safe carrier of
  a *stable* contract rather than a re-invented redaction.
- **Why alternatives are deferred.** A production helper (Option 1) needs this contract first and has no caller; a
  CLI/API (Options 3/6) presupposes both; Spec 030/031 (Option 4) lack new evidence; persistence/event (Option 5)
  invites premature coupling; an AC20 amendment (Option 7) lacks justification; stopping (Option 8) is
  unnecessary.
- **Risks that must be preserved.** `safe envelope ≠ raw runtime dump`; `invocation surface ≠ CLI ≠ deployment ≠
  live call ≠ delivery ≠ whole-core composer`; AC20 intact (no production whole-core composer; no
  `reflection-composition` revival; the contract owns no core); athlete remains sole decision owner
  (`decision-capture invitation ≠ AthleteDecision`); no-default-live-call; delivery-withheld; `reflection-ready ≠
  delivered ≠ AthleteDecision`; `admission success ≠ truth`; `validateDraft success ≠ recommendation quality`;
  fully fake-testable; no premature deployment/provider/DB/auth/CI/SDK; no new CLI/script/package command.
- **Files/specs to read next.** `039-thin-operator-invocation-surface-boundary.md`,
  `039A-thin-operator-invocation-surface-implementation-plan.md`,
  `src/modules/__tests__/thin-operator-invocation-surface.test.ts` (the local `OperatorInvocationResult`),
  `src/modules/application-orchestration/application/offline-reflection-runtime.ts` (the
  `OfflineReflectionRuntimeOutcome` it narrows), `external-renderable-admission.ts`,
  `docs/runbooks/operator-session-runbook.md`, `034R-...-ac20-redecision.md`.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  **session envelope / redaction contract**: the exact safe fields exposed (status/disposition, `deliveryWithheld`,
  `rawRetained: false`, `reflectionRef?`, decision-capture invitation/ref, `admissionReason?`, `safeReason?`,
  ref-only trace summary); the **always-excluded** set (raw provider output, hidden reasoning, secrets, delivery
  artifact, `AthleteDecision`); the per-disposition mapping; whether it stays documented / test-fixtured or
  warrants a future production type; and the forbidden behaviors — with AC20, no-default-live-call,
  delivery-withheld, and athlete-decision-ownership preserved; helper/CLI/API explicitly deferred. Then
  `Tech Spec 040A` + an implementation only if it warrants code (likely a test-only contract/fixture proof first).

---

## 6. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **810/810**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C superseded; Tech Spec 034A on hold; Spec 034R standing (caller-supplied renderable); no
production whole-core composer; no `reflection-composition` module; `offlineReflectionRuntime` unchanged and
admission-gated; `validateDraft` mandatory downstream; delivery withheld; no `AthleteDecision` auto-created;
decision capture is explicit athlete-declared/reported input only, re-entering solely as a `SubjectiveObservation`;
the operator runbook is a test-only proof + docs-only checklist; the thin invocation seam is a test-only proof
with a **local** reference-only envelope (no production helper/type/caller); no package/dependency/runtime/API/UI/
CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
```text
invocation surface ≠ CLI ≠ script ≠ package command ≠ deployment ≠ API/UI ≠ live-provider enablement ≠ delivery mechanism ≠ whole-core composer ≠ AthleteDecision creator ·
safe envelope ≠ raw runtime dump · reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure ·
admission success ≠ truth · validateDraft success ≠ recommendation quality · decision-capture invitation ≠ AthleteDecision ·
Aurora advises; the athlete decides; Aurora never presents inference as fact.
```
