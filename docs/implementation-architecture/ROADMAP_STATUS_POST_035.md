# Aurora — Roadmap Status Checkpoint (post Implementation 035-A/035-B)

> **Status (2026-06-29).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the AC20 episode and the enforced external-renderable contract,
> and recommends the highest-value next boundary. Validation at authorship: `tsc --noEmit` clean; `node --test`
> 779/779.

---

## 1. The arc just closed (Spec 030 → Impl 035-B)

A long, disciplined chain resolved into a coherent, enforced product seam:

```text
Spec 030 (defer secret provider) → Spec 031 (defer deployment target) → Spec 032 (defer runtime surface)
→ Spec 033 SELECT athlete-facing manual reflection → Spec 032R SELECT operator-mediated offline runtime
→ Tech Spec 032RA → Impl 032R-A (offlineReflectionRuntime, injected-renderable seam)
→ Spec 034 (Option C: production whole-core composer) → Impl 034-A ATTEMPTED → ⛔ AC20 BLOCKER → reverted
→ Spec 034R (whole-core stays a test harness; production receives caller-supplied renderable)
→ Spec 035 (three-tier external renderable contract) → Tech Spec 035A
→ Impl 035-A (pure Tier 2 admitExternalRenderable) → Impl 035-B (wired before rendering)
```

`[FACT]` The AC20 episode is fully closed: Spec 034 Option C **superseded**; Tech Spec 034A **on hold**;
whole-core composition **remains a test harness** (Impl 006); AC20 **unchanged**; the external renderable seam
is **formalized (Spec 035)** and **enforced (Impl 035-B)** before rendering.

---

## 2. Current architectural state

### 2.1 What is now implemented
- The five-stage epistemic kernel (observation → reasoning → understanding → decision-support → athlete) +
  rendering, delivery, event-recording, application-orchestration (Impl 001–028).
- Provider-neutral managed-secret seam (Impl 028) + provider-neutral cloud-secret adapter contract (Impl 029).
- **Product runtime:** `offlineReflectionRuntime` (Impl 032R-A) — operator-mediated, offline, render-only,
  delivery withheld, no `AthleteDecision`, injected-renderable seam.
- **Enforced three-tier external renderable contract:** Tier 1 caller guarantees · **Tier 2
  `admitExternalRenderable` wired before rendering (Impl 035-A/B)** · Tier 3 downstream mandatory
  `validateDraft`. Additive `renderable-inadmissible` runtime status.
- **779/779** tests; `tsc --noEmit` clean.

### 2.2 What is deliberately NOT implemented
- No production whole-core composer; no `reflection-composition` module (AC20).
- No concrete cloud secret provider (Spec 030 deferred); no production deployment target (Spec 031 deferred).
- No API/server/UI/worker runtime; no auth/user/session; no production DB/schema/migrations.
- No real delivery channel (delivery targets a deterministic test sink); no live-provider default; no CI lane.
- No `Tech Spec 034A` implementation (whole-core production composition).

### 2.3 What AC20 still forbids
- AC20a: any new top-level module beyond the nine allowlisted + `__tests__`.
- AC20b: any **production** file importing all four core surfaces — *"no layer owns the whole core."*
  → The observation→renderable whole-core composition stays a **test harness**.

### 2.4 What the offline runtime can / cannot do
- **Can:** take an operator-mediated command with manual intake + a caller-supplied `RenderingRequest`,
  admit it (Tier 2), render render-only (Tier 3 `validateDraft`), project a safe inference-marked reflection,
  withhold delivery, and invite (never create) an athlete decision.
- **Cannot:** assemble the renderable from observations itself (that would be a whole-core composer, AC20);
  call a live provider by default; deliver; create an `AthleteDecision`; read `process.env`.

### 2.5 What the external renderable contract now enforces (Tier 2)
Structural admissibility only: provenance (`sourceCaseRef`), supported `kind`, claim fields (support needs
≥1 `allowedClaim`), `agencyRequired`, `uncertaintyVisibleRequired`, traceability where required, and the
support voice ceiling (rejects `Recommendation`/`Silence`/absent). Rejection → `renderable-inadmissible`,
fail-closed before any provider call.

### 2.6 What Tier 1 still relies on (NOT machine-proven)
That the renderable's `allowedClaims` actually trace to real evidence, that inference is framed (not
asserted as fact), and that no prescription/unsupported certainty is smuggled in. Today the **only** assembler
that satisfies Tier 1 is the **Impl 006 test harness** (and the production `renderableFromTerminalOutput` from
a real `TerminalOutput`). There is **no documented production/operator session** that assembles and runs one.

### 2.7 What `validateDraft` guarantees / does not
- **Guarantees:** the rendered *draft* stays within the renderable's `allowedClaims`/`forbiddenClaims`/voice/
  uncertainty.
- **Does not guarantee:** that those claims are true, evidence-backed, wise, or high quality (`admitted ≠
  validated draft ≠ recommendation quality`).

### 2.8 Deferred deployment/provider decisions
- Spec 030 (secret provider) and Spec 031 (deployment target) remain deferred — **no new evidence**; the
  offline/local runtime needs neither. They reopen only when a networked surface is chosen.

---

## 3. Next-lane candidates

| Option | Product value | Arch risk | Dependency readiness | AC20-safe | Athlete-owns-decision | No-default-live-call | Avoids premature deploy/provider | Needs DB/auth/CI/deploy | Fake-testable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1 — Spec 036: First Operator-Mediated Reflection Session Contract** | **High** — completes the loop: defines how a caller/operator assembles a Tier-1-satisfying `RenderingRequest` and runs the runtime end-to-end | Low | **Ready** (runtime + admission + harness all exist) | ✅ (no whole-core composer; harness assembles) | ✅ | ✅ | ✅ | No | ✅ |
| 2 — Reopen Spec 030/031 (deployment/provider) | Low now | Med-High | **Not ready** — no deployment evidence | ✅ | ✅ | ✅ | ✗ would force it | Yes | partial |
| 3 — AC20 amendment path | Low/negative now | **High** — relaxes a defining invariant | Not justified (no overwhelming need) | ✗ changes AC20 | ✅ | ✅ | ✅ | No | n/a |
| 4 — Runtime shell / CLI / operator command | Medium | Med — premature before session contract | Partial (session behavior undefined) | ✅ | ✅ | needs care | ✅ (if offline) | maybe | partial |
| 5 — Persistence / event-recording integration | Medium | Med — invites premature DB/event coupling | Partial | ✅ | ✅ | ✅ | likely Yes | ✅ | 
| 6 — Stop & stabilize | — | — | — | ✅ | ✅ | ✅ | ✅ | No | ✅ |

`[FACT]` The single missing piece that makes everything else *meaningful* is the **caller/session side** (Tier
1): the runtime and its admission gate exist, but nothing documents how an operator actually assembles a
contract-satisfying renderable and runs a first reflection session. Option 1 fills exactly that gap, depends
only on what already exists, and respects every invariant.

`[FACT]` Why the others wait: **Option 2** has no new deployment/provider evidence (the deferral chain is
still valid); **Option 3** relaxes AC20 with no overwhelming product need (and the arc just proved AC20's
worth); **Option 4** (CLI/runtime shell) presupposes the session behavior Option 1 defines — sequencing it
first risks a shell without a contract; **Option 5** invites premature DB/event coupling the offline runtime
does not need; **Option 6** is unnecessary — the tree is green and coherent, and Option 1 is low-risk.

---

## 4. Recommendation

`[RECOMMENDATION] Next mission: Spec 036 — First Operator-Mediated Reflection Session Contract.`

- **Why this is next.** The product runtime (`offlineReflectionRuntime`) and its Tier 2 admission gate are in
  place and safe, but the **caller/session contract** that supplies a Tier-1-satisfying `RenderingRequest`
  and runs a first end-to-end athlete-facing reflection is undocumented. Spec 036 defines that session
  behaviorally — who assembles the renderable (the Impl 006 harness / `renderableFromTerminalOutput` from a
  real `TerminalOutput`), what the operator does, what the athlete receives, and what stays impossible —
  **without** a whole-core production composer (AC20-safe) and **without** deployment/provider commitments.
- **Why alternatives are deferred.** Spec 030/031 lack new evidence; AC20 amendment lacks justification; a
  CLI/runtime shell is premature before the session contract; persistence/event integration invites premature
  coupling; stopping is unnecessary. (See §3.)
- **Risks to preserve in Spec 036.** AC20 intact (no whole-core composer; harness assembles the renderable);
  athlete remains sole decision owner (athlete-declared/reported; operator mediation ≠ athlete decision);
  no-default-live-call (deterministic fake provider; delivery withheld); `validateDraft` stays Tier 3
  mandatory; no premature deployment/provider/DB/auth/CI; fully fake-testable.
- **Files/specs to read next.** `035-external-renderable-assembly-contract-boundary.md`,
  `035A-external-renderable-admission-check-tech.md`, `034R-...-ac20-redecision.md`,
  `032R-operator-mediated-offline-reflection-runtime-tech.md`, `033-product-interaction-model-boundary.md`;
  `offline-reflection-runtime.ts`, `external-renderable-admission.ts`,
  `__tests__/end-to-end-responsible-reflection.test.ts`, `__tests__/decision-support-rendering.test.ts`.
- **What the next prompt should ask for (high level).** A Specification (behavioral, docs-only) defining the
  first operator-mediated reflection **session**: the operator's role and inputs; how a Tier-1-satisfying
  `RenderingRequest` is assembled (preferably a real `TerminalOutput` via `renderableFromTerminalOutput`, in
  the harness — not a production whole-core composer); how the athlete receives the reflection and owns the
  decision; the closed session dispositions (incl. `renderable-inadmissible`); and the forbidden behaviors —
  with AC20, no-default-live-call, delivery-withheld, and athlete-decision-ownership preserved. Then
  `Tech Spec 036A` + `Implementation 036` if the session warrants code (likely a test-level session harness
  first, since AC20 keeps the whole-core assembly in tests).

---

## 5. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **779/779**. AC20 unchanged; whole-core composition remains a test
harness; Spec 034 Option C superseded; Tech Spec 034A on hold; no production whole-core composer; no
`reflection-composition` module; `offlineReflectionRuntime` injected-renderable seam guarded by the Tier 2
admission check; `validateDraft` mandatory downstream; delivery withheld; no `AthleteDecision` auto-created;
no package/dependency/runtime/API/UI/CLI/worker/deployment/CI change.
