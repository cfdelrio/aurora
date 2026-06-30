# Aurora — Roadmap Status Checkpoint (post Implementation 037-A)

> **Status (2026-06-29).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **reflection-to-decision loop closed test-only** (Impl
> 036-A session + Impl 037-A decision capture) and recommends the highest-value next boundary. Validation at
> authorship: `tsc --noEmit` clean; `node --test` **795/795**. Prior checkpoint: `ROADMAP_STATUS_POST_035.md`.

---

## 1. The arc just closed (Spec 035 → Impl 037-A)

The enforced external-renderable seam matured into a **fully proven (test-only) reflection-to-decision loop**:

```text
Spec 035 (three-tier external renderable contract) → Tech Spec 035A
→ Impl 035-A (pure Tier 2 admitExternalRenderable) → Impl 035-B (wired before rendering)
→ Spec 036 (first operator-mediated reflection session contract) → Tech Spec 036A
→ Impl 036-A (TEST-ONLY whole-core session harness → reflection-ready, delivery withheld, no AthleteDecision)
→ Spec 037 (post-reflection athlete decision capture boundary) → Tech Spec 037A (Option A+C: documented usage)
→ Impl 037-A (TEST-ONLY documented-usage harness: athlete-declared/reported capture, session-linked)
→ Docs consolidation (CORE_COMPLETION_REVIEW / SYSTEM_MAP / TECHNICAL_BOUNDARY_MAP / PERSISTENCE_AND_EVENT_SURFACE)
```

`[FACT]` The **whole loop is now proven end-to-end as a test**:

```text
manual input
→ test-only whole-core responsible-reflection harness
→ TerminalOutput → renderableFromTerminalOutput → RenderingRequest
→ offlineReflectionRuntime → admitExternalRenderable → validateDraft
→ reflection-ready → delivery withheld → decision-capture invitation/ref
→ explicit athlete-declared / athlete-reported input
→ athleteDecision(...) → decisionContext({ decisionSupportCaseRef: sourceCaseRef }) → recordAthleteDecision(...)
→ SubjectiveObservation feedback only
```

`[FACT]` **The AC20 episode remains fully closed and is *not* a pending continuation.** Spec 034 Option C is
**superseded**; Tech Spec 034A is **on hold/superseded**; Spec 034R **selected** that whole-core production
composition stays **caller-supplied** and the whole-core chain stays a **test harness**. Any future lane that
resembles observation→renderable composition must be framed explicitly (see §5), not silently revived.

---

## 2. Current architectural state

### 2.1 What is now proven end-to-end (test-only)
- The five-stage epistemic kernel + rendering / delivery / event-recording / application-orchestration (Impl 001–029).
- `offlineReflectionRuntime` (Impl 032R-A) — operator-mediated, offline, render-only, delivery withheld, injected-renderable seam.
- Enforced three-tier external renderable contract (Impl 035-A/B): Tier 1 caller guarantees · Tier 2 `admitExternalRenderable` (wired before rendering) · Tier 3 mandatory `validateDraft`.
- The **first operator-mediated reflection session** (Impl 036-A) — test-only whole-core harness, five cases (safe, inadmissible, validation-failure, input-rejected, cross-path no-decision/no-delivery).
- The **post-reflection athlete decision capture loop** (Impl 037-A) — test-only documented-usage harness, 11 cases (athlete-declared/reported capture, session-linked; operator-scribe-not-source; no-auto-creation; feedback re-entry as `SubjectiveObservation` only).
- **795/795** tests; `tsc --noEmit` clean.

### 2.2 What remains test-only (the crucial framing)
- The **whole-core composition** (observation→…→`TerminalOutput`→renderable) lives **only** in `__tests__/` (AC20).
- The **session** (Impl 036-A) and the **decision capture** (Impl 037-A) are **test harnesses**, not production services. Nothing outside `__tests__/` *invokes* the loop or *documents how a caller legitimately assembles and sequences it*.

### 2.3 What production runtime surface exists
- Exactly one: the pure application-level **function** `offlineReflectionRuntime(command, deps)` in `application-orchestration/application/` + the pure Tier-2 function `admitExternalRenderable(request)`. They are **invocable building blocks**, not an invocation surface.

### 2.4 What production runtime surface does NOT exist
- No production **entrypoint / shell / CLI / API / UI / worker** that invokes the runtime (the only `scripts/` file is `operator-live-smoke.mjs`, a separate operational smoke, not a session entrypoint).
- No documented **production/operator procedure (runbook)** for assembling a Tier-1-satisfying `RenderingRequest` and sequencing the full loop (session → reflection-ready → capture).
- No deployment target, no networked surface, no real delivery channel, no live-provider default, no auth/user/session, no production DB/schema/migration, no CI live lane.

### 2.5 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*
  → The observation→renderable whole-core composition stays a **test harness**.

### 2.6 What the runtime can consume vs. cannot assemble
- **Can consume:** an operator-mediated command (`submission`, `athleteRef`, a **caller-supplied** `RenderingRequest`, `operatorMediation`, `timing`) + injected deps (manual-intake step, provider client, config, secret ref, rendered-message repo).
- **Cannot assemble:** the renderable from observations itself (that would be a whole-core composer — AC20). It also cannot call a live provider by default, deliver, create an `AthleteDecision`, or read `process.env`.

### 2.7 What the operator can mediate vs. what the athlete alone can decide
- **Operator (scribe / mediator):** assemble + supply the contract-satisfying `RenderingRequest`, invoke the runtime, convey the athlete's **own reported** decision as `athlete-reported`. The operator is **never** the decision source.
- **Athlete (sole decision owner):** `athlete-declared` / `athlete-reported` decisions only. Operator mediation ≠ athlete decision; operator scribe ≠ decision source; athlete-reported ≠ system-inferred.

### 2.8 What is still deferred from Specs 030/031/032
- **Spec 030** (secret provider selection), **Spec 031** (deployment target), **Spec 032** (runtime surface, already resolved offline by 032R/033) — all still deferred with **no new evidence**. The offline/local loop needs none of them; they reopen only when a *networked* surface is deliberately chosen.

### 2.9 What the next irreversible commitment would be
- Picking a **deployment/provider/DB/auth** lane (Spec 030/031, persistence, live provider) or **amending AC20** are the genuinely hard-to-reverse commitments. The least irreversible next step is a **behavioral, docs-only, fake-testable contract** that captures what the loop already does — *how a caller assembles and sequences it* — without choosing any of those lanes.

---

## 3. Correction pressure — Spec 034 is NOT an ordinary pending continuation

`[FACT]` Do **not** treat "Spec 034" as a normal next item. Option C is superseded; 034A is on hold; 034R fixed
that whole-core production composition stays **caller-supplied** and the whole-core chain stays a **test
harness**. If a future lane resembles observation→renderable composition, it must be framed as **one of**:

```text
(a) a NEW AC20-respecting caller-assembly / runbook / session-surface boundary (caller assembles; no whole-core composer)
(b) an EXPLICIT AC20 amendment proposal (with stated risk)
(c) a DELIBERATE re-open decision with clear, recorded risk
```

This checkpoint recommends **(a)** and explicitly does **not** recommend a production whole-core composer or an
AC20 amendment.

---

## 4. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | AC20-safe | Athlete-owns-decision | No-default-live-call | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Needs CLI/script/package | Fake-testable | Least-irreversible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1 — Spec 038: Operator Runtime *Invocation Surface* Boundary** | High | **Med** — a "surface" leans toward an entrypoint/shell that presupposes the runbook + risks premature packaging | Partial (assembly contract undefined) | ✅ (if it stays a boundary) | ✅ | needs care | ✅ if offline | maybe | likely | partial | No |
| **2 — Spec 038: Operator Session *Runbook / Caller Assembly* Contract** | **High** — documents how a caller legitimately assembles a Tier-1 renderable + sequences the whole loop (session → reflection-ready → capture) | **Low** | **Ready** (runtime + admission + both harnesses exist) | ✅ (caller assembles; no whole-core composer) | ✅ | ✅ | ✅ | No | No | ✅ | **Yes** |
| 3 — Spec 038: Post-reflection Decision Feedback Re-entry Boundary | Med — but the re-entry already exists (Impl 009 `decisionAsObservation`) and is proven by 037-A | Low | Ready | ✅ | ✅ | ✅ | ✅ | No | No | ✅ | Yes (but low marginal value) |
| 4 — Reopen Spec 030/031 (deployment/provider) | Low now | Med-High | **Not ready** — no new deployment evidence | ✅ | ✅ | ✅ | ✗ forces it | Yes | maybe | partial | No |
| 5 — Reopen observation→renderable production composition / AC20 amendment | Low/negative now | **High** — relaxes a defining invariant the arc just proved | Not justified | ✗ changes AC20 | ✅ | ✅ | ✅ | No | No | n/a | No |
| 6 — Persistence / event-recording integration | Medium | Med — invites premature DB/event coupling | Partial | ✅ | ✅ | ✅ | ✅ | likely Yes | maybe | ✅ | No |
| 7 — Stop & stabilize | — | — | — | ✅ | ✅ | ✅ | ✅ | No | No | ✅ | — |

`[FACT]` The question is no longer *"can the loop exist?"* (it is proven, twice) but *"how is the existing
operator-mediated offline runtime invoked or packaged without turning it into deployment, UI/API, live
provider, or whole-core composition?"* The honest first answer is **not an entrypoint** — it is the **contract
for how a caller assembles and sequences the loop**, which an entrypoint would otherwise hard-code prematurely.

`[FACT]` **Why Option 2 over Option 1.** Both target the invocation gap, but Option 1 ("invocation *surface*")
biases toward a runtime shell/entrypoint — and §2.4 shows the *assembly + sequencing contract* it would
encode is still undocumented. Building the surface first risks a shell without a contract (the same sequencing
mistake the post-035 checkpoint flagged for CLI-before-session). Option 2 fixes the contract behaviorally,
docs-only, fully fake-testable, with the **least irreversible** commitment; a thin invocation surface can
follow it deliberately.

`[FACT]` **Why the others wait.** **Option 3**'s re-entry boundary already exists (Impl 009) and is proven by
037-A — low marginal value. **Option 4** has no new deployment/provider evidence (the 030/031/032 deferral
chain holds). **Option 5** relaxes AC20 with no overwhelming need (and the arc just demonstrated AC20's
worth). **Option 6** invites premature DB/event coupling the offline loop does not need. **Option 7** is
unnecessary — the tree is green and coherent, and Option 2 is low-risk.

---

## 5. Recommendation

`[RECOMMENDATION] Next mission: Spec 038 — Operator Session Runbook / Caller Assembly Contract.`

- **Why this is next.** The runtime, the admission gate, the session harness, and the decision-capture harness
  all exist and are proven test-only — but **nothing documents, as a contract, how a caller (operator or
  harness) legitimately assembles a Tier-1-satisfying `RenderingRequest` and sequences the full loop**:
  manual intake → admission → render-only → `validateDraft` → reflection-ready → delivery withheld →
  decision-capture invitation → explicit athlete-declared/reported capture → `recordAthleteDecision` →
  `SubjectiveObservation` re-entry. Spec 038 names the caller's Tier-1 obligations, the legitimate assembly
  paths (the Impl 006 harness / `renderableFromTerminalOutput` from a real `TerminalOutput` — **not** a
  production whole-core composer), the required sequencing and closed dispositions (incl.
  `renderable-inadmissible`/`not-rendered`/`input-rejected`), and the forbidden behaviors — purely
  behaviorally, with AC20 intact and zero deployment/provider/DB/auth commitments.
- **Why alternatives are deferred.** An invocation *surface*/entrypoint (Option 1) presupposes this contract;
  the feedback re-entry (Option 3) already exists; Spec 030/031 (Option 4) lack new evidence; an AC20
  amendment / production whole-core composer (Option 5) lacks justification and is explicitly out of scope;
  persistence/event integration (Option 6) invites premature coupling; stopping (Option 7) is unnecessary.
- **Risks that must be preserved.** AC20 intact (caller assembles the renderable; **no** production whole-core
  composer; **no** `reflection-composition` revival); athlete remains sole decision owner (athlete-declared/
  reported only; operator scribe ≠ source); no-default-live-call (deterministic fake provider; delivery
  withheld); `validateDraft` stays Tier 3 mandatory; no premature deployment/provider/DB/auth/CI/SDK; no new
  CLI/script/package; fully fake-testable; Aurora advises, the athlete decides; Aurora never presents inference
  as fact.
- **Files/specs to read next.** `036-first-operator-mediated-reflection-session-contract.md`,
  `036A-first-operator-mediated-reflection-session-tech.md`,
  `037-athlete-decision-capture-loop-boundary.md`, `037A-athlete-decision-capture-loop-tech.md`,
  `035-external-renderable-assembly-contract-boundary.md`,
  `034R-observation-to-renderable-composition-boundary-ac20-redecision.md`;
  `src/modules/application-orchestration/application/offline-reflection-runtime.ts`,
  `src/modules/application-orchestration/application/external-renderable-admission.ts`,
  `src/modules/__tests__/first-operator-mediated-reflection-session.test.ts`,
  `src/modules/__tests__/post-reflection-athlete-decision-capture.test.ts`.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  **operator session runbook / caller-assembly contract**: the caller/operator role and inputs; the Tier-1
  obligations a caller must satisfy when assembling a `RenderingRequest` (and the legitimate, AC20-safe ways to
  do so); the required end-to-end sequencing of intake → admission → render-only → `validateDraft` →
  reflection-ready → delivery withheld → decision-capture invitation → explicit athlete-declared/reported
  capture → re-entry as `SubjectiveObservation`; the closed session dispositions; and the forbidden behaviors —
  with AC20, no-default-live-call, delivery-withheld, and athlete-decision-ownership preserved. Then
  `Tech Spec 038A` + an implementation **only** if it warrants code (likely a documented-usage / runbook test
  harness first, since AC20 keeps whole-core assembly in tests).

---

## 6. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **795/795**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C superseded; Tech Spec 034A on hold; Spec 034R standing (caller-supplied renderable); no
production whole-core composer; no `reflection-composition` module; `offlineReflectionRuntime` injected-renderable
seam guarded by the Tier 2 admission check; `validateDraft` mandatory downstream; delivery withheld; no
`AthleteDecision` auto-created; decision capture is explicit athlete-declared/reported input only, re-entering
solely as a `SubjectiveObservation`; no package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK change.
This checkpoint is docs-only.
```text
reflection-ready ≠ AthleteDecision · validated reflection ≠ AthleteDecision · delivery withheld ≠ delivery failure ·
operator mediation ≠ AthleteDecision · operator scribe ≠ decision source · athlete-reported ≠ system-inferred ·
silence ≠ decision · observed behavior ≠ decision · following Aurora ≠ obedience-success ·
decision feedback as SubjectiveObservation ≠ Signal/Evidence · invocation surface ≠ deployment ≠ whole-core composer ·
Aurora advises; the athlete decides; Aurora never presents inference as fact.
```
