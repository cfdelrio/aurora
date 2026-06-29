# Aurora — Roadmap Status Checkpoint (post Implementation 038-A)

> **Status (2026-06-29).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **operator session runbook arc closed** (Spec 038 → Tech Spec
> 038A → Impl 038-A → Docs) and recommends the highest-value next boundary. Validation at authorship:
> `tsc --noEmit` clean; `node --test` **803/803**. Prior checkpoints: `ROADMAP_STATUS_POST_035.md`,
> `ROADMAP_STATUS_POST_037.md`.

---

## 1. The arc just closed (Spec 038 → Impl 038-A)

The post-037 checkpoint recommended a runbook *before* any invocation surface; that arc is now complete:

```text
Roadmap checkpoint post-037 → Spec 038 (operator session runbook / caller-assembly contract)
→ Tech Spec 038A (Option B test-only proof + docs-only checklist; no wrapper/CLI/shell)
→ Impl 038-A (src/modules/__tests__/operator-session-runbook.test.ts +8; docs/runbooks/operator-session-runbook.md)
→ Docs consolidation (CORE_COMPLETION_REVIEW / SYSTEM_MAP / TECHNICAL_BOUNDARY_MAP / PERSISTENCE_AND_EVENT_SURFACE)
```

`[FACT]` The **operator session runbook is now proven end-to-end as a test and documented as a human checklist**:

```text
operator-session runbook
→ athlete manual input
→ caller-assembled RenderingRequest
→ preferred TerminalOutput → renderableFromTerminalOutput
→ offlineReflectionRuntime → admitExternalRenderable → validateDraft
→ reflection-ready → delivery withheld → no AthleteDecision
→ later explicit athlete-declared / athlete-reported capture
→ recordAthleteDecision → SubjectiveObservation only
```

with per-outcome operator obligations proven for `renderable-inadmissible` / `not-rendered` / `input-rejected` /
silence, and the cross-path invariant (never delivers, never auto-creates a decision).

`[FACT]` **AC20 remains closed and is not a pending continuation.** Spec 034 Option C superseded; Tech Spec 034A
on hold; Spec 034R standing (whole-core production composition stays caller-supplied / test harness). The runbook
is the AC20-respecting answer to "then how does a caller assemble and run it?".

---

## 2. Current architectural state

### 2.1 What is now proven end-to-end (test-only)
- The five-stage epistemic kernel + rendering / delivery / event-recording / application-orchestration (Impl 001–029).
- `offlineReflectionRuntime` (Impl 032R-A) — operator-mediated, offline, render-only, delivery withheld.
- Enforced three-tier external renderable contract (Impl 035-A/B): Tier 1 caller guarantees · Tier 2
  `admitExternalRenderable` (before rendering) · Tier 3 mandatory `validateDraft`.
- The first operator-mediated reflection session (Impl 036-A) and the post-reflection decision-capture loop
  (Impl 037-A) — both test-only harnesses.
- The **operator session runbook** (Impl 038-A) — a test-only proof binding the 036-A session and 037-A capture
  into one executable runbook, plus a docs-only checklist.
- **803/803** tests; `tsc --noEmit` clean.

### 2.2 What remains test-only
- The **whole-core composition** (observation→…→`TerminalOutput`→renderable) lives **only** in `__tests__/` (AC20).
- The **session**, the **decision capture**, and now the **runbook** are all **test harnesses** — proofs and a
  procedure, not a production-invocable surface.

### 2.3 What human checklist now exists
- `docs/runbooks/operator-session-runbook.md` — a **docs-only**, non-executable operator checklist (preflight,
  caller-assembly obligations, preferred assembly path, Tier 1 guarantees, runtime invocation, per-outcome
  handling, later capture, scribe rules, silence rules, forbidden behaviors). It is the human companion to the
  test-only proof; it introduces no runtime surface.

### 2.4 What production runtime surface exists
- Still exactly two pure functions: `offlineReflectionRuntime(command, deps)` and `admitExternalRenderable(request)`
  (both in `application-orchestration/application/`). Invocable building blocks, not an invocation surface.

### 2.5 What production invocation surface does NOT exist
- No production **entrypoint / shell / CLI / API / UI / worker** that *invokes* the runtime/runbook. The only
  `scripts/` file is `operator-live-smoke.mjs` (a separate operational smoke), and `package.json` exposes only
  `typecheck` / `test` / `check`. The runbook is followed *by a human reading the checklist + a test proving it* —
  there is no programmatic, reusable invocation handle.
- No deployment target, networked surface, real delivery channel, live-provider default, auth/user/session,
  production DB/schema/migration, or CI live lane.

### 2.6 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*
  → The observation→renderable whole-core composition stays a **test harness**.

### 2.7 What no-default-live-call still means
- No live provider is ever called by default: the runtime/runbook/smoke all use deterministic fakes; a live call
  requires explicit, gated opt-in (Impl 021/026/027) and is never on in the default suite or CI.

### 2.8 What delivery-withheld still means
- `offlineReflectionRuntime` **never delivers** (`deliveryWithheld: true` on every path; no delivery sink wired;
  `trace.deliveryRecordId`/`deliveryRequestId` stay `undefined`). Delivery withheld ≠ delivery failure.

### 2.9 What the runtime can consume vs. cannot assemble
- **Can consume:** an operator-mediated command (`submission`, `athleteRef`, a **caller-supplied** `RenderingRequest`,
  `operatorMediation`, `timing`) + injected deps (manual-intake step, provider client, config, secret ref,
  rendered-message repo).
- **Cannot assemble:** the renderable from observations itself (whole-core composer — AC20); a live call by
  default; delivery; an `AthleteDecision`; a `process.env` read.

### 2.10 What the operator can mediate vs. what the athlete alone can decide
- **Operator (mediator/scribe):** assemble inputs (preferably `renderableFromTerminalOutput`-projected), run the
  two functions, review the withheld reflection, scribe the athlete's **own reported** decision as
  `athlete-reported`. Never the decision source.
- **Athlete (sole owner):** `athlete-declared` / `athlete-reported` decisions only. Operator mediation ≠ athlete
  decision; operator scribe ≠ decision source; athlete-reported ≠ system-inferred.

### 2.11 What the next irreversible commitment would be
- A **deployment/provider/DB/auth** lane (Spec 030/031, persistence, live provider) or an **AC20 amendment** are
  the hard-to-reverse commitments. The least irreversible next step is a **behavioral, docs-only, fake-testable
  boundary** that defines a *thin, reusable invocation handle* over the runtime — without choosing any of those
  lanes — turning "a human follows a checklist" into "a small, safe, injected invocation seam" that a future
  CLI/API could sit behind.

---

## 3. Correction pressure (carried forward)

`[FACT]` Do **not** recommend: provider/deployment without new evidence (Spec 030/031 deferral holds); an AC20
amendment without a clear product need caller assembly cannot meet; a production whole-core composer (034R
standing); persistence/auth/event integration that prematurely couples the offline loop; or a CLI/script/package
command before its boundary is defined. The next genuine question is **how to expose the existing runtime/runbook
through a thin invocation surface without becoming deployment, live provider, delivery, or whole-core composition.**

---

## 4. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | AC20-safe | No-default-live-call | Delivery-withheld | Athlete-owns-decision | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Needs CLI/script/package | Fake-testable | Least-irreversible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1 — Spec 039: Thin Operator Invocation Surface Boundary** | **High** — defines a small, reusable, injected invocation seam over the runtime/runbook (a future CLI/API could sit behind it) without committing to any surface | **Low** | **Ready** (runtime + runbook + both harnesses exist) | ✅ (boundary; caller assembles; no whole-core composer) | ✅ | ✅ | ✅ | ✅ | No | No (defines the boundary; defers CLI/script) | ✅ | **Yes** |
| 2 — Spec 039: Runbook Session Report / Result Envelope Boundary | Med — a safe, redacted session-report shape aids operator review/audit | Low-Med | Ready | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | ✅ | Yes (but partly subsumed by Option 1, which would carry the result shape) |
| 3 — Spec 039: Production Session Wrapper Boundary | Low-Med | **Med** — a production wrapper risks importing upstream surfaces / adding ceremony without safety | Partial | ✅ only if it imports no core | ✅ | ✅ | ✅ | ✅ | maybe | maybe | partial | No |
| 4 — Reopen Spec 030/031 (provider/deployment) | Low now | Med-High | **Not ready** — no new evidence | ✅ | ✅ | ✅ | ✅ | ✗ forces it | Yes | maybe | partial | No |
| 5 — Persistence / event-recording integration | Medium | Med — invites premature DB/event coupling | Partial | ✅ | ✅ | ✅ | ✅ | ✅ | likely Yes | maybe | ✅ | No |
| 6 — AC20 amendment / production whole-core composition | Low/negative now | **High** — relaxes a defining invariant the arc twice proved | Not justified | ✗ changes AC20 | ✅ | ✅ | ✅ | ✅ | No | No | n/a | No |
| 7 — Stop & stabilize | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | No | No | ✅ | — |

`[FACT]` The runbook proved *that a human can drive the loop*. The next gap is a **thin, reusable invocation
handle** so the loop can be driven *programmatically and safely* — a boundary that names the inputs/outputs and
the safety obligations of "invoke the runbook once" **without** being a CLI, a deployment, a live call, a
delivery, or a whole-core composer. Option 1 defines exactly that, depends only on what exists, and is the least
irreversible.

`[FACT]` **Why Option 1 over Option 2/3.** Option 2 (session-report shape) is valuable but **subsumed** — a thin
invocation surface would naturally define its result/envelope shape, so Option 1 can carry it. Option 3 (a
production wrapper) is the riskier sibling: it presupposes the *boundary* Option 1 defines and risks importing
upstream surfaces or adding ceremony without safety — sequencing it first repeats the "shell before contract"
mistake the post-035 checkpoint flagged. Define the boundary (Option 1) before building any wrapper/CLI.

`[FACT]` **Why the rest wait.** **Option 4** has no new deployment/provider evidence (the 030/031/032 deferral
chain holds). **Option 5** invites premature DB/event coupling the offline loop does not need. **Option 6**
relaxes AC20 with no overwhelming need (the arc twice demonstrated its worth). **Option 7** is unnecessary — the
tree is green and coherent, and Option 1 is low-risk.

---

## 5. Recommendation

`[RECOMMENDATION] Next mission: Spec 039 — Thin Operator Invocation Surface Boundary.`

- **Why this is next.** The runbook proved a human can drive the loop and the checklist documents how; the
  missing piece is a **thin, reusable, injected invocation seam** that names the inputs, the safe result/envelope,
  and the safety obligations of invoking the runbook once — so a future CLI/API/operator tool can sit *behind* a
  defined boundary instead of hard-coding the sequence. Spec 039 should define this **behaviorally, docs-only**,
  evaluating: a documented invocation surface; a test-only invocation helper; manual function-level invocation; a
  deferred script/CLI; a deferred package command; a production wrapper **rejected unless it adds safety** — all
  with no live-provider default, no delivery default, no DB/auth/deployment, and no whole-core composer.
- **Why alternatives are deferred.** A session-report shape (Option 2) is subsumed by Option 1; a production
  wrapper (Option 3) presupposes this boundary; Spec 030/031 (Option 4) lack new evidence; persistence/event
  integration (Option 5) invites premature coupling; an AC20 amendment / production whole-core composition
  (Option 6) lacks justification and stays out of scope; stopping (Option 7) is unnecessary.
- **Risks that must be preserved.** `runbook ≠ CLI`; `invocation surface ≠ deployment`; `invocation surface ≠
  live call`; `invocation surface ≠ delivery`; `invocation surface ≠ whole-core composer`; AC20 intact (caller
  assembles; no production whole-core composer; no `reflection-composition` revival); athlete remains sole
  decision owner (`operator mediation ≠ athlete decision`); no-default-live-call; delivery-withheld;
  `reflection-ready ≠ delivered`; `reflection-ready ≠ AthleteDecision`; fully fake-testable; no premature
  deployment/provider/DB/auth/CI/SDK; no new CLI/script/package command.
- **Files/specs to read next.** `038-operator-session-runbook-caller-assembly-contract.md`,
  `038A-operator-session-runbook-implementation-plan.md`, `docs/runbooks/operator-session-runbook.md`,
  `034R-observation-to-renderable-composition-boundary-ac20-redecision.md`,
  `032R-product-runtime-surface-revisit.md`, `033-product-interaction-model-boundary.md`;
  `src/modules/application-orchestration/application/offline-reflection-runtime.ts`,
  `src/modules/application-orchestration/application/external-renderable-admission.ts`,
  `src/modules/__tests__/operator-session-runbook.test.ts`.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  **thin operator invocation surface**: what "invoke the runbook once" means as a reusable seam; the input it
  takes and the **safe, redacted result/envelope** it returns; what it may trust vs. must not trust; the closed
  dispositions it surfaces (mirroring the runtime statuses); whether the implementation is documented-usage /
  test-only helper / (rejected) production wrapper; and the forbidden behaviors — with AC20, no-default-live-call,
  delivery-withheld, and athlete-decision-ownership preserved; CLI/script/package explicitly deferred. Then
  `Tech Spec 039A` + an implementation only if it warrants code (likely a test-only invocation helper first).

---

## 6. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **803/803**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C superseded; Tech Spec 034A on hold; Spec 034R standing (caller-supplied renderable); no
production whole-core composer; no `reflection-composition` module; `offlineReflectionRuntime` unchanged and
admission-gated; `validateDraft` mandatory downstream; delivery withheld; no `AthleteDecision` auto-created;
decision capture is explicit athlete-declared/reported input only, re-entering solely as a `SubjectiveObservation`;
the operator runbook is a test-only proof + a docs-only checklist (no invocation surface); no
package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
```text
runbook ≠ CLI ≠ runtime shell ≠ deployment · invocation surface ≠ deployment ≠ live call ≠ delivery ≠ whole-core composer ·
caller assembly ≠ proof of truth · admission success ≠ evidence-backed fact · validateDraft success ≠ recommendation quality ·
reflection-ready ≠ delivered ≠ AthleteDecision · delivery withheld ≠ delivery failure · operator mediation ≠ athlete decision ·
operator scribe ≠ decision source · silence ≠ decision · decision feedback ≠ Signal/Evidence ·
Aurora advises; the athlete decides; Aurora never presents inference as fact.
```
