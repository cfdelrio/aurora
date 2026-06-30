# Aurora — Specification 036 — First Operator-Mediated Reflection Session Contract

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral contract** for the
> first operator-mediated, athlete-facing manual reflection **session** — the Tier 1 / caller side that
> supplies a contract-satisfying `RenderingRequest` to `offlineReflectionRuntime`. It is **behavioral-only**:
> it implements no code, writes no technical spec, adds no CLI/runtime shell/script, modifies no production
> code/test, edits no package file, adds no DB/auth/deployment/CI/SDK file, amends no guard (AC20 untouched),
> revives no `reflection-composition` module, and creates no production whole-core composer. Recent sequence:
> `bc3e561` (Spec 035) → `f3948b2` (Tech Spec 035A) → `52cb193` (Impl 035-A) → `268ccf2` (Impl 035-B) →
> `0c6f8d2` (Docs) → `e80e2d8` (Roadmap checkpoint). Validation at authorship: `tsc --noEmit` clean;
> `node --test` 779/779.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines the session
**contract**; it adds no CLI/shell/script/code.

---

## 1. Context

`[FACT]` Aurora has `offlineReflectionRuntime` (Impl 032R-A) enforcing the three-tier external renderable
contract: **Tier 1** caller guarantees · **Tier 2** `admitExternalRenderable` wired before rendering
(Impl 035-A/B) · **Tier 3** downstream mandatory `validateDraft`. The runtime is operator-mediated, offline,
render-only, delivery withheld, creates no `AthleteDecision`, and receives the renderable via its
injected-renderable seam. The missing boundary is the **Tier 1 / caller side**:

> How does a trusted operator assemble a contract-satisfying `RenderingRequest` and run a first reflection
> session — **without** creating a production whole-core composer (AC20)?

`[FACT]` AC20 keeps the observation→renderable whole-core composition a **test harness** (Impl 006); the
production `renderableFromTerminalOutput` maps a real `TerminalOutput` to a `RenderableDomainOutput` without
owning the whole core.

---

## 2. Central Question

> How can a trusted operator run Aurora's first athlete-facing manual reflection session by supplying a
> contract-satisfying `RenderingRequest` to `offlineReflectionRuntime`, while preserving AC20, athlete
> decision ownership, delivery withheld, no-default-live-call, and mandatory downstream `validateDraft`?

The contract must distinguish:

```text
operator-mediated session ≠ operator smoke · operator mediation ≠ athlete decision · session contract ≠ CLI ·
session contract ≠ runtime shell · session contract ≠ deployment · session contract ≠ whole-core composer ·
caller-supplied renderable ≠ truth · admitted ≠ evidence-backed fact · validated draft ≠ recommendation quality ·
rendered reflection ≠ AthleteDecision · delivery withheld ≠ delivery failure
```

---

## 3. Required Analysis (grounded in the real surfaces)

1. **Session actor.** A trusted **operator**, invoking the runtime on the athlete's behalf.
2. **Product user.** The **athlete** (Spec 033 primary persona).
3. **Decision owner.** The **athlete** exclusively (`AthleteDecision` is `athlete-declared`/`athlete-reported`,
   Impl 009).
4. **What the operator may do.** Gather the athlete's manual training input; assemble a contract-satisfying
   `RenderingRequest` (preferably a real `TerminalOutput` → `renderableFromTerminalOutput`, produced in the
   Impl 006 test harness — not a production whole-core composer); invoke `offlineReflectionRuntime` once;
   convey the resulting reflection to the athlete.
5. **What the operator must not do.** Make/declare the athlete's decision; fabricate the renderable's claims;
   present the reflection as a prescription; deliver automatically; enable a live call; create an
   `AthleteDecision`; run a production whole-core composer.
6. **Athlete manual input.** Passed via the runtime command's injected manual-intake step (`runManualIntake`);
   intake rejection → `input-rejected` (unchanged).
7. **What `RenderingRequest`/renderable must be supplied.** A `RenderingRequest` whose `RenderableDomainOutput`
   satisfies the Spec 035 contract (provenance, supported kind, claim fields, agency, uncertainty visible,
   traceability where required, support voice ceiling).
8. **Caller/operator Tier 1 guarantees.** That the renderable's `allowedClaims` actually trace to real
   evidence, inference is framed (not asserted as fact), and no prescription/unsupported certainty is
   smuggled in — guaranteed by assembling from a real `TerminalOutput` (the safe path), never machine-proven.
9. **Tier 2 admission.** `admitExternalRenderable` structurally screens the renderable before rendering;
   rejection → `renderable-inadmissible` (fail-closed).
10. **Tier 3 `validateDraft`.** Remains the mandatory downstream gate inside render-only orchestration.
11. **Delivery.** Remains **withheld** (`deliveryWithheld: true`) on every path.
12. **No `AthleteDecision`.** The session creates none; the outcome carries a decision-capture prompt/ref only.
13. **Later athlete decision.** The athlete may **separately** declare/report a decision (athlete-owned);
    operator mediation never becomes that decision.
14. **Impl 006 harness role.** It may **inform** caller assembly (it proves the whole-core chain composes and
    yields a real `TerminalOutput`) but it stays a **test harness**, not a production service (AC20).
15. **`renderableFromTerminalOutput` role.** The **preferred** assembly path — it maps a real `TerminalOutput`
    to a renderable without whole-core production composition; still subject to Tier 2 + Tier 3.
16. **On admission rejection.** `renderable-inadmissible`; no render, no validate, no delivery, no decision.
17. **On validation success.** `reflection-ready` with the safe inference-marked reflection; delivery withheld.
18. **On validation/render failure.** `not-rendered` (Tier 3 / provider/credential fast-path) — fail-closed.
19. **What the session records/persists.** **Nothing new** in this slice (the runtime persists only the
    existing in-memory rendered-message record on the admitted/rendered path; rejected paths persist nothing).
20. **Out of scope.** A CLI/runtime shell; a production whole-core composer; delivery; live calls; deployment/
    provider/DB/auth/CI; persistence beyond existing in-memory; automatic athlete-decision capture.

---

## 4. Product Thesis Requirements

The session must produce an athlete-facing **reflection**, never a prescription; it must never treat operator
action as an athlete decision. Grounded in: *Aurora is not a dashboard / not an AI coach / not "selling AI";
Aurora advises, the athlete decides; Aurora never presents inference as fact.*

---

## 5. Decision Framework & Options

Criteria: athlete agency · operator-role clarity · AC20 preservation · caller-guarantee clarity · admission-
gate compatibility · `validateDraft` compatibility · delivery withholding · no-default-live-call · no
`AthleteDecision` auto-creation · no deployment/provider commitment · fake-testability · least irreversible
commitment.

| Option | Verdict |
| --- | --- |
| **A — Offline session with caller-supplied, admission-gated `RenderingRequest`** | **Selected.** Uses the existing runtime + admission gate; AC20-safe; fully fake-testable; least commitment. |
| **B — Session must always use `TerminalOutput → renderableFromTerminalOutput`** | **Adopted as the preferred assembly path within A** (the safe, Tier-1-satisfying route), not the *sole* path (the harness may hand-build edge cases for proof). |
| C — Session may use any Tier-2-admitted `RenderingRequest` | Subsumed by A: any renderable must pass Tier 2 regardless; B is the *preferred* assembler, but A admits others that satisfy the contract. |
| D — Build a CLI/operator command now | **Rejected** — premature runtime shell; the session contract must be clear first (Roadmap §3). |
| E — Reopen whole-core composition / AC20 amendment | **Rejected** — no AC20-amendment intent; the arc just affirmed AC20. |
| F — Defer the session contract | **Rejected** — the runtime + admission contract are sufficient to define the session now. |

---

## 6. Decision

`[DECISION]` **First operator-mediated reflection session: an offline session in which a trusted operator
supplies a caller-assembled, admission-gated `RenderingRequest` to `offlineReflectionRuntime` on the athlete's
behalf; `TerminalOutput → renderableFromTerminalOutput` is the preferred assembly path.** (Option A, with B
preferred.)

- **Who initiates.** A trusted **operator**, on the athlete's behalf (operator-mediated ≠ operator smoke;
  operator mediation ≠ athlete decision).
- **What input is supplied.** The athlete's manual training input (via `runManualIntake`) **and** a
  `RenderingRequest` whose renderable satisfies the Spec 035 contract — **preferably** assembled from a real
  decision-support `TerminalOutput` via `renderableFromTerminalOutput` (in the Impl 006 harness; never a
  production whole-core composer).
- **What renderable contract must be satisfied.** The Spec 035 Tier 1 guarantees (claims trace to real
  evidence; inference framed, not asserted as fact; no prescription/unsupported certainty) **and** the
  structural fields the Tier 2 admission check verifies.
- **What the runtime may trust.** The renderable's **structure** (Tier 2) and that `validateDraft` will keep
  the draft within it (Tier 3).
- **What the runtime must not trust.** That the claims are true/evidence-backed/wise/high-quality — that is
  the operator's Tier 1 guarantee, never re-derived (`admitted ≠ true`).
- **What the session returns.** The `offlineReflectionRuntime` outcome — `reflection-ready` (safe
  inference-marked reflection, delivery withheld) | `renderable-inadmissible` | `not-rendered` |
  `recording-failed` | `unexpected-failure` | `input-rejected` — conveyed by the operator to the athlete.
- **On `renderable-inadmissible`.** The session stops fail-closed: no render, no `validateDraft`, no delivery,
  no `AthleteDecision`; `deliveryWithheld: true`; a safe `admissionReason`.
- **On `reflection-ready`.** The athlete receives the validated, inference-marked reflection; delivery
  remains withheld; the outcome carries a decision-capture prompt/ref only.
- **How delivery remains withheld.** The runtime never delivers; the operator conveying a reflection to the
  athlete is **not** "delivery" in the system sense (no `DeliverySink`, no `DeliveryRecord`).
- **How `AthleteDecision` remains future, athlete-owned.** The session creates none; the athlete may later
  **separately** declare/report a decision (`athlete-declared`/`athlete-reported`); operator action never
  becomes it.
- **How AC20 remains intact.** No production whole-core composer; the whole-core assembly (when a real
  `TerminalOutput` is used) stays in the test harness; the session imports/owns no all-four-core production
  file.
- **How no deployment/provider decision is created.** The session is offline/local; it needs no deployment
  target, no secret provider, no DB/auth/CI; deterministic fake provider only.
- **What the next technical spec must decide.** Whether the session is **documented usage** of
  `offlineReflectionRuntime` (a test-level session harness) or a **thin wrapper** function; the session
  command/report shape; how a deterministic fake-provider test represents a full session; how later athlete
  decision capture is positioned. (`Tech Spec 036A`.)

### 6.1 Recommended next mission

```text
Tech Spec 036A — First Operator-Mediated Reflection Session Implementation Plan
```

`[DECISION]` Next, a TS-strict plan deciding whether Impl 036 is a **test-level session harness** (most
likely, since AC20 keeps whole-core assembly in tests) or a **thin documented-usage wrapper** over
`offlineReflectionRuntime` — with deterministic fake-provider tests of a full safe session and a rejected
session, preserving AC20, delivery-withheld, no-default-live-call, mandatory `validateDraft`, and athlete
decision ownership. If 036A concludes no production code is warranted (pure documented usage + harness tests),
recommend **Docs consolidation post 036** instead.

---

## 7. Required Behavioral Rules

**Must require:** operator action is mediation only; the athlete remains the product user and decision owner;
the `RenderingRequest` is admitted (Tier 2) before rendering; a rejected renderable stops before provider
rendering; an admitted renderable still goes through `validateDraft` (Tier 3); delivery remains withheld; no
`AthleteDecision` is created; no live provider call by default; no deployment/provider/DB/auth/CI requirement;
AC20 unchanged; whole-core composition remains a test harness.

**Must forbid:** operator action treated as athlete decision; renderable treated as truth; `admitted` treated
as evidence-backed fact; `validateDraft` treated as recommendation quality; delivery success treated as
athlete decision; automatic delivery; automatic live call; a production whole-core composer; a
`reflection-composition` module; an AC20 amendment; a CLI/runtime shell implementation.

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Safe session.** *Given* an operator has athlete manual input and a contract-satisfying
`RenderingRequest`, *when* the operator runs the session, *then* `offlineReflectionRuntime` may return a
validated reflection with delivery withheld.

**UC2 — Inadmissible renderable.** *Given* the supplied renderable fails Tier 2 admission, *when* the session
runs, *then* it returns `renderable-inadmissible`, does not render, does not validate, does not deliver, and
creates no `AthleteDecision`.

**UC3 — Validation failure.** *Given* the renderable is admitted but the provider draft violates
`validateDraft`, *when* the session runs, *then* it fails closed through existing rendering/orchestration
behavior (`not-rendered`).

**UC4 — Athlete decision.** *Given* the athlete later acts/decides based on the reflection, *when* the
decision is captured, *then* it is `athlete-declared`/`athlete-reported`, never operator-inferred.

**UC5 — Operator smoke distinction.** *Given* operator smoke exists, *when* a reflection session is
considered, *then* smoke remains operational wiring proof and is **not** a product reflection session.

**UC6 — AC20.** *Given* the session uses caller-supplied renderable input, *when* it is specified/implemented,
*then* no production whole-core composer is introduced.

**UC7 — TerminalOutput path.** *Given* a caller has a valid `TerminalOutput`, *when* it is converted via
`renderableFromTerminalOutput`, *then* that is the preferred assembly path but still subject to Tier 2
admission and Tier 3 validation.

**UC8 — Delivery withheld.** *Given* a reflection is produced, *when* the session completes, *then* delivery
remains withheld and the output is not considered delivered.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- Operator mediation is not an athlete decision. ✅
- The athlete remains the decision owner. ✅
- The `RenderingRequest` is admitted before rendering. ✅
- The `renderable-inadmissible` path fails closed. ✅
- The admitted path still goes through `validateDraft`. ✅
- Delivery remains withheld. ✅
- No `AthleteDecision` is created. ✅
- No live provider call by default. ✅
- No CLI/runtime shell is introduced by this spec. ✅ (docs-only).
- No deployment/provider/DB/auth/CI decision is introduced. ✅
- AC20 remains unchanged. ✅
- Whole-core composition remains a test harness only. ✅
- `TerminalOutput → renderableFromTerminalOutput` is positioned as the preferred assembly path. ✅
- All existing tests remain green (779/779). ✅

---

## 10. Relationship To Existing Architecture

- **Spec 033** — athlete-facing manual reflection (the interaction model this session realizes).
- **Spec 032R / Impl 032R-A** — operator-mediated offline runtime + the injected-renderable seam the session
  drives.
- **Spec 034R** — whole-core production composition stays caller-supplied; this session is the caller side.
- **Spec 035 / Impl 035-A / 035-B** — the external renderable contract + Tier 2 admission the session must
  satisfy and pass.
- **Impl 014** — `validateDraft` remains the mandatory downstream gate.
- **Impl 009** — `AthleteDecision` stays athlete-declared/reported; the session creates none.
- **Impl 006 / AC20** — the whole-core harness remains the (test-only) proof and assembly site; no production
  owner of the whole core.

---

## 11. Forbidden Behaviors

```text
implementation code · technical implementation plan · CLI/runtime shell creation · script creation ·
package script changes · deployment/CI files · DB/schema/migrations · auth/session/user implementation ·
SDK/dependency changes · AC20 amendment · reflection-composition module · production whole-core composer ·
automatic live call · automatic delivery · AthleteDecision auto-creation · operator decision treated as
athlete decision · renderable treated as truth · admission treated as evidence-backed fact ·
validateDraft treated as recommendation quality
```

---

## 12. Open Questions For Tech Spec 036A

1. The exact session function name, if any (vs. documented usage of `offlineReflectionRuntime`).
2. Whether the session is documented usage or a thin wrapper.
3. The exact operator/session command shape.
4. The exact `RenderingRequest` assembly expectations (and how the harness builds a real `TerminalOutput`).
5. The exact output/session report shape.
6. Whether any session record is needed without persistence.
7. How deterministic fake-provider tests should represent a full session (safe + rejected + validation-fail).
8. How later athlete decision capture should be triggered or withheld.

---

## 13. Success Criteria

Can a trusted operator run Aurora's first athlete-facing manual reflection session — supplying a
contract-satisfying `RenderingRequest` to `offlineReflectionRuntime` — **while preserving** AC20, athlete
decision ownership, delivery withheld, no-default-live-call, and mandatory downstream `validateDraft`, and
**without** a CLI/runtime shell, a production whole-core composer, or any deployment/provider/DB/auth/CI
commitment? **Yes — via Option A (with B preferred):** an offline, operator-mediated session that supplies a
Tier-1-guaranteed, Tier-2-admitted, Tier-3-validated renderable (preferably from a real `TerminalOutput` via
`renderableFromTerminalOutput`, assembled in the test harness), returning a safe inference-marked reflection
with delivery withheld and no `AthleteDecision`. Next: `Tech Spec 036A`. Validation at authorship:
`tsc --noEmit` clean; `node --test` 779/779; no code, test, package, runtime, CLI, deployment, CI, SDK, or
dependency change; AC20 untouched.
