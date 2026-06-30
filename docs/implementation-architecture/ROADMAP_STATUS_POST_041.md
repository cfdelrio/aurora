# Aurora — Roadmap Status Checkpoint (post Implementation 041-A)

> **Status (2026-06-30).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **production operator invocation helper arc closed** (Spec 041
> → Tech Spec 041A → Impl 041-A → Docs) and recommends the highest-value next boundary. Validation at authorship:
> `tsc --noEmit` clean; `node --test` **852/852**. Prior checkpoints: `...POST_035`, `...POST_037`, `...POST_038`,
> `...POST_039`, `...POST_040`.

---

## 1. The arc just closed (Spec 041 → Impl 041-A)

The post-040 checkpoint recommended a production invocation helper once the envelope contract was stable; that arc
is complete:

```text
Roadmap checkpoint post-040 → Spec 041 (production operator invocation helper boundary)
→ Tech Spec 041A (Option B: thin async helper returning only the envelope)
→ Impl 041-A (operator-session-invocation.ts: invokeOperatorSession; +20; production)
→ Docs consolidation (CORE_COMPLETION_REVIEW / SYSTEM_MAP / TECHNICAL_BOUNDARY_MAP / PERSISTENCE_AND_EVENT_SURFACE)
```

`[FACT]` Aurora now has a **production safe invocation handle**:

```text
caller-assembled command + injected deps → invokeOperatorSession(...) → offlineReflectionRuntime(command, deps)
→ toOperatorSessionEnvelope(outcome) → OperatorSessionEnvelope only
```

It makes `toOperatorSessionEnvelope` **mandatory** and the raw `OfflineReflectionRuntimeOutcome` **structurally
unreachable** through the helper. The invocation chain (seam 039 → mapper 040 → helper 041) is now **complete**.

---

## 2. Current architectural state

### 2.1 What is now production code
- The five-stage kernel + rendering / delivery / event-recording / application-orchestration (Impl 001–029);
  `offlineReflectionRuntime` (Impl 032R-A); `admitExternalRenderable` (Impl 035-A/B); the `OperatorSessionEnvelope`
  type + `toOperatorSessionEnvelope` mapper (Impl 040-A); and now `invokeOperatorSession` (Impl 041-A).

### 2.2 What remains test-only
- The whole-core composition lives **only** in `__tests__/` (AC20). The first session (036-A), decision-capture
  loop (037-A), operator runbook (038-A), and the thin invocation seam (039-A — `invokeThinOperatorSurface`, local
  to its test) are test harnesses/proofs.

### 2.3 What remains docs-only
- The operator runbook checklist (`docs/runbooks/operator-session-runbook.md`).

### 2.4 What `invokeOperatorSession` proves / does not do
- **Proves:** there is now **one safe production handle** to run the offline reflection session — it runs the
  runtime once and returns **only** the redacted envelope, so redaction is unbypassable at the invocation seam.
- **Does not do:** it is **not** a CLI/script/package command, API/UI, deployment, runtime shell, live-provider
  enablement, delivery, persistence, `AthleteDecision` capture, or whole-core composition. It creates no deps,
  reads no process environment, resolves no secret, calls no live provider/delivery directly, persists nothing,
  and imports no upstream core. **It is not invoked by any production caller** — only by tests.

### 2.5 What `OperatorSessionEnvelope` guarantees
- A whitelisted, reference-only projection: exact `status`, `deliveryWithheld`, `rawRetained: false`,
  `reflectionRef?`+flags (never `reflection.text`), decision-capture invitation/ref, safe `admissionReason?`/
  `safeReason?`, `intakeStatus`, `mediation`, ref-only `traceSummary` — excluding raw output / hidden reasoning /
  secrets / delivery ids / `eventRecordIds` / `AthleteDecision` / raw stack.

### 2.6 What raw-outcome leakage is now prevented at the helper seam
- A caller using `invokeOperatorSession` **cannot** receive or forward the raw `OfflineReflectionRuntimeOutcome`
  (its `reflection.text`, full `trace`, etc.) — the helper's return type and body guarantee envelope-only.

### 2.7 What production caller surface does NOT exist
- No entrypoint / CLI / script / package command / API / UI / worker that **calls** `invokeOperatorSession`.
  `package.json` exposes only `typecheck` / `test` / `check`; the only `scripts/` file is `operator-live-smoke.mjs`.
- No deployment target, networked surface, real delivery channel, live-provider default, auth/user/session,
  production DB/schema/migration, or CI live lane.

### 2.8 Whether a real caller exists
- **No.** `invokeOperatorSession` (and the mapper, and the seam) are exercised only by tests. There is **no real
  caller and no concrete use case** driving a surface.

### 2.9 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*

### 2.10 What no-default-live-call still means
- No live provider by default: runtime/runbook/seam/mapper/helper/smoke all use deterministic fakes; live requires
  explicit, gated opt-in (Impl 021/026/027), never on in the default suite or CI.

### 2.11 What delivery-withheld still means
- `offlineReflectionRuntime` never delivers (`deliveryWithheld: true` always; no delivery sink); the envelope +
  helper preserve this. Delivery withheld ≠ delivery failure.

### 2.12 What athlete decision ownership still means
- Only `athlete-declared`/`athlete-reported` decisions exist, captured by the separate Impl 037-A flow; the
  envelope carries only the decision-capture invitation/ref. Operator mediation ≠ athlete decision.

### 2.13 What remains deferred from Specs 030/031/032
- **Spec 030** (secret provider), **031** (deployment target), **032** (runtime surface, resolved offline by
  032R/033) — all still deferred with **no new evidence**.

### 2.14 What a CLI/operator tool/API would add / risk
- **Would add:** an actual way to *run* `invokeOperatorSession` outside tests (operator ergonomics).
- **Would risk:** a **premature product surface with no caller/use case** — deployment shape, transport,
  live/delivery temptation, and irreversibility — exactly the "shell before a real need" trap the prior checkpoints
  flagged. There is **no evidence** a caller needs it now.

### 2.15 What persistence/event integration would add / risk
- **Would add:** a record of sessions/decisions over time.
- **Would risk:** prematurely coupling the offline loop to a DB/event surface the loop does not need, and choosing
  a persistence technology with no driving requirement.

### 2.16 What the next irreversible commitment would be
- A **CLI/API/deployment/provider/DB/auth** lane or an **AC20 amendment** are the hard-to-reverse commitments —
  and each is currently **unjustified** (no caller, no evidence). The **least irreversible** value-adding step is a
  **docs-only governance boundary** that names *what evidence must exist before a surface is built* — converting
  the implicit "no caller yet" deferral into an explicit, testable decision rule.

---

## 3. Correction pressure (carried forward)

`[FACT]` Do **not** recommend a CLI/script/package command *merely because `invokeOperatorSession` exists*; nor
API/UI/deployment without new product evidence; nor provider/deployment without new evidence; nor persistence/auth/
event integration that prematurely couples the offline loop; nor an AC20 amendment caller assembly + the helper can
avoid. **A caller surface should be recommended only if the repo shows a real caller need — and it does not.** With
no real caller, the right move is a **discovery/use-protocol boundary** (or stop-and-stabilize), not a premature
surface.

`[FACT]` The invocation chain is **complete and safe** (seam → mapper → helper). The binding constraint on every
remaining lane is the **same**: there is no real caller or new deployment/provider evidence. So the highest-value
artifact now is the one that **defines the gate** those lanes must pass — not another build.

---

## 4. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | Real caller? | AC20-safe | No-default-live-call | Delivery-withheld | Athlete-owns-decision | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Needs CLI/script/package | Sits behind helper safely | Fake-testable | Least-irreversible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **6 — Spec 042: Real Caller / Operator Use Protocol Boundary** | **High** — names what counts as a real caller + the evidence gate any surface must pass; prevents premature-surface drift | **Low** (docs-only governance) | **Ready** | n/a (defines the test for one) | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | ✅ (codifies it) | ✅ | **Yes** |
| 8 — Stop & stabilize until a real caller/use case appears | Med (honest pause) | None | Ready | No | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | ✅ | ✅ | Yes |
| 1 — Spec 042: Operator Caller Surface Boundary | Low now | Med — surface w/o caller | Not ready (no caller) | No | ✅ if offline | needs care | ✅ | ✅ | ✅ | maybe | maybe | ✅ | partial | No |
| 2 — Spec 042: CLI / Script behind invokeOperatorSession | Low now | High — deployment-shaped | Not ready | No | ✅ if offline | needs care | ✅ | ✅ | ✗ likely | maybe | Yes | ✅ | partial | No |
| 3 — Spec 042: API/UI Operator Tool behind invokeOperatorSession | Low now | **High** — deployment-shaped | Not ready | No | ✅ if offline | needs care | ✅ | ✅ | ✗ likely | Yes | Yes | ✅ | partial | No |
| 4 — Reopen Spec 030/031 (provider/deployment) | Low now | Med-High | **Not ready** — no new evidence | No | ✅ | ✅ | ✅ | ✅ | ✗ forces it | Yes | maybe | n/a | partial | No |
| 5 — Persistence / event-recording integration | Medium | Med — premature DB/event coupling | Partial | No | ✅ | ✅ | ✅ | ✅ | ✅ | likely Yes | maybe | partial | ✅ | No |
| 7 — AC20 amendment / production whole-core composition | Low/negative now | **High** — relaxes a defining invariant | Not justified | n/a | ✗ changes AC20 | ✅ | ✅ | ✅ | ✅ | No | No | n/a | n/a | No |

`[FACT]` The invocation chain is complete; the gating fact everywhere is "no real caller / no new evidence." The
single highest-value, least-irreversible step is to **make that gate explicit** — Option 6 — so future missions
have a concrete test for *when* a surface (Options 1/2/3), persistence (5), or provider/deployment (4) becomes
justified, instead of drifting into one prematurely.

`[FACT]` **Why Option 6 over Option 8.** Both are restraint; Option 8 (stop) leaves the deferral *implicit* and
re-litigated each checkpoint, whereas Option 6 *codifies* the decision rule (what counts as a caller, what evidence
unlocks which lane) — a reusable governance artifact, and still docs-only/least-irreversible. (If even Option 6
reads as premature, Option 8 is the honest fallback.) **Why over 1/2/3.** Surfaces without a caller are premature
and deployment-shaped. **Why over 4/5/7.** No new provider/deployment evidence; persistence prematurely couples the
loop; an AC20 amendment is unjustified.

---

## 5. Recommendation

`[RECOMMENDATION] Next mission: Spec 042 — Real Caller / Operator Use Protocol Boundary.`

- **Why this is next.** The invocation chain (seam → mapper → helper) is **complete and safe**, but there is **no
  real caller** and **no new deployment/provider evidence**. Every remaining lane (CLI/API/persistence/provider/
  deployment) is gated on the same missing fact. The highest-value, least-irreversible move is **not** to build a
  surface speculatively, but to **define the gate**: a behavioral, docs-only boundary that states **what counts as
  a real caller**, **what minimum evidence justifies a CLI/API/tooling surface**, **how an operator supplies
  `command`/`deps` today without deployment** (via the runbook + `invokeOperatorSession`), **what must remain
  behind `invokeOperatorSession`**, **how no-live/no-delivery/no-decision/AC20 are preserved**, **what stays
  manual**, and **what is explicitly deferred**. This converts the recurring "no caller yet" deferral into an
  explicit, testable decision rule, preventing premature-surface drift.
- **Why alternatives are deferred.** A caller surface / CLI / API (Options 1/2/3) is premature without a caller and
  is deployment-shaped; Spec 030/031 (4) lack new evidence; persistence/event (5) prematurely couples the offline
  loop; an AC20 amendment (7) is unjustified; stop-and-stabilize (8) is the honest fallback but leaves the gate
  implicit. (If the maintainer prefers, Option 8 is acceptable in place of Option 6.)
- **Risks that must be preserved.** AC20 intact; no production whole-core composer / no `reflection-composition`
  revival; athlete remains sole decision owner (`decisionCapture invitation/ref ≠ AthleteDecision`);
  no-default-live-call; delivery-withheld; everything that runs the session must sit **behind**
  `invokeOperatorSession` and receive **only** the envelope; `OperatorSessionEnvelope ≠ raw runtime outcome`; no
  premature deployment/provider/DB/auth/CI/SDK; no new CLI/script/package command (the protocol spec defines *when*
  one becomes justified, it does not build one).
- **Files/specs to read next.** `041-production-operator-invocation-helper-boundary.md`,
  `041A-...-implementation-plan.md`, `operator-session-invocation.ts`, `operator-session-envelope.ts`,
  `docs/runbooks/operator-session-runbook.md`, `038-operator-session-runbook-caller-assembly-contract.md`,
  `034R-...-ac20-redecision.md`, and this checkpoint.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  **real caller / operator use protocol**: the definition of a real caller; the minimum evidence that unlocks a
  CLI / API / operator-tool / persistence / provider lane (and which evidence unlocks which lane); how an operator
  runs a session today (runbook + `invokeOperatorSession`, manual, offline, fake deps); the invariants any future
  surface must preserve behind the helper; what remains manual/deferred; and the forbidden behaviors — with AC20,
  no-default-live-call, delivery-withheld, and athlete-decision-ownership preserved. Then `Tech Spec 042A` only if
  it warrants any artifact (likely docs/checklist-only), else **Docs consolidation post 042**.

---

## 6. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **852/852**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C superseded; Tech Spec 034A on hold; Spec 034R standing (caller-supplied renderable); no
production whole-core composer; no `reflection-composition` module; `offlineReflectionRuntime` unchanged and
admission-gated; `validateDraft` mandatory downstream; delivery withheld; no `AthleteDecision` auto-created;
decision capture is explicit athlete-declared/reported input only; the operator runbook is a test-only proof +
docs-only checklist; the session envelope/redaction contract is a production pure mapper + type; the production
operator invocation helper (`invokeOperatorSession`) returns only the envelope; **no real caller, no
CLI/API/deployment/persistence/provider surface**; no package/dependency/runtime/API/UI/CLI/worker/deployment/CI/
SDK change. This checkpoint is docs-only.
```text
invocation helper ≠ CLI ≠ script ≠ package command ≠ deployment ≠ API/UI ≠ live-provider enablement ≠ delivery mechanism ≠ persistence/session record ≠ whole-core composer ≠ AthleteDecision creator ·
OperatorSessionEnvelope ≠ raw runtime outcome · reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure ·
decisionCapture invitation/ref ≠ AthleteDecision · admission success ≠ truth · validateDraft success ≠ recommendation quality ·
a production helper without a caller ≠ a product surface · Aurora advises; the athlete decides; Aurora never presents inference as fact.
```
