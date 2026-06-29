# Aurora — Operator Session Runbook (Caller Assembly Checklist)

> **Status (2026-06-29).** Operational checklist — **docs-only, not executable**. It is the human-facing
> companion to the executable proof `src/modules/__tests__/operator-session-runbook.test.ts` (Implementation
> 038-A), and it realizes Spec 038 (`bdfe185`) / Tech Spec 038A (`017f1b6`). It describes how a **trusted
> operator** assembles and runs Aurora's **offline, operator-mediated reflection session** using the existing
> runtime — and how the **athlete alone** decides afterward. It introduces **no** runtime surface.

> **What this runbook is NOT.** `runbook ≠ CLI` · `runbook ≠ runtime shell` · `runbook ≠ deployment` ·
> `runbook ≠ API/UI` · `runbook ≠ live-provider enablement` · `runbook ≠ production whole-core composer`. It is a
> procedure a human follows, backed by an executable test — nothing more.

---

## 0. Roles

- **Operator** — a *trusted mediator/scribe*. Assembles inputs, runs the runtime, reviews the withheld
  reflection, and may later transcribe the athlete's own reported decision. **The operator never decides** —
  `operator mediation ≠ athlete decision`; `operator scribe ≠ decision source`.
- **Athlete** — the *product user* and **sole decision owner**. Provides manual input, receives the reflection,
  and alone declares/reports any decision (`athlete-declared` / `athlete-reported`).

*Aurora advises; the athlete decides. Aurora never presents inference as fact.*

---

## 1. Preflight

- [ ] **No live provider by default.** Use a deterministic/fake provider client. A live call is never on by
      default and is out of scope for this runbook.
- [ ] **No delivery.** The runtime withholds delivery on every path; do not wire a delivery sink.
- [ ] **No CLI/script assumptions.** There is no operator-session CLI, script, or package command — this is a
      procedure over two pure functions (`offlineReflectionRuntime`, `admitExternalRenderable`).
- [ ] **No secrets / no `process.env`.** Use an injected, fake secret ref; read no environment.

---

## 2. Caller assembly obligations

- [ ] Assemble the **athlete manual input** (`submission`) — a well-formed submission the injected manual-intake
      step accepts (valid `athleteRef`, occasion, reporter, entries).
- [ ] Assemble the **`RenderingRequest`** (a `RenderableDomainOutput` wrapped for the runtime) **before**
      invoking the runtime. *Caller assembly ≠ proof of truth* — assembling a renderable does not make its claims
      true.

---

## 3. Preferred assembly path

- [ ] **Prefer** building the renderable from a real, domain-approved **`TerminalOutput`** via
      **`renderableFromTerminalOutput(...)`**. This makes the Tier 1 guarantees (claims/voice/uncertainty/agency/
      traceability) **inherited from the domain decision** rather than asserted by hand.
- [ ] The whole-core composition that produces the `TerminalOutput` stays a **test-only** assembly (AC20):
      `TerminalOutput preferred path ≠ production whole-core composer`. Do **not** build a production whole-core
      composer or revive a `reflection-composition` module.
- [ ] A hand-built admissible renderable is *permitted but discouraged*; if used, the operator personally owns
      every Tier 1 guarantee in §4.

---

## 4. Tier 1 guarantees the caller must make (NOT machine-proven)

- [ ] **Provenance / `sourceCaseRef`** present (the session/reflection link).
- [ ] **Claim fields** present (a `support` renderable needs ≥ 1 `allowedClaim`; `forbiddenClaims` honored).
- [ ] **Uncertainty visible** where required (`uncertaintyVisibleRequired`).
- [ ] **Agency preserved** (`agencyRequired`).
- [ ] **Traceability** present where required (`traceability.status` + non-empty summary).
- [ ] **Safe voice** — within the support ceiling (no prescriptive/`Recommendation`/`Silence` voice).
- [ ] The caller does **not** treat the renderable as truth, **admission** as an evidence-backed fact, or
      **`validateDraft`** as recommendation quality. *admission success ≠ evidence-backed fact* ·
      *validateDraft success ≠ recommendation quality*.

---

## 5. Runtime invocation

- [ ] Run **`admitExternalRenderable(request)`** — the Tier 2 **structural** gate. It runs **before** rendering.
      It proves *shape*, never *truth*.
- [ ] Invoke **`offlineReflectionRuntime(command, deps)`** with injected deterministic deps (manual-intake step,
      fake provider client, config, fake secret ref, rendered-message repo, renderer/adapter kinds, timing). The
      **mandatory `validateDraft`** stays downstream (Tier 3) for any admitted renderable.

---

## 6. Outcome handling — `reflection-ready`

- [ ] Operator **may** review/present the validated reflection **manually**, under **delivery-withheld**
      conditions.
- [ ] Operator **must not** treat it as **delivered** (`reflection-ready ≠ delivered`).
- [ ] Operator **must not** create an `AthleteDecision` (`reflection-ready ≠ AthleteDecision`).
- [ ] Operator **may** invite a **later** athlete-declared/reported decision (the outcome carries an
      `athlete-decision-invitation` — an invitation only).

---

## 7. Outcome handling — `renderable-inadmissible`

- [ ] Operator **stops**.
- [ ] **No** provider call, rendering, `validateDraft`, or delivery occurs.
- [ ] Operator **must not** remove safety fields (provenance, claims, uncertainty, agency, voice ceiling) to
      force admission.
- [ ] **No** `AthleteDecision`.

---

## 8. Outcome handling — `not-rendered`

- [ ] Operator **stops or revises** the caller assembly / provider-draft path.
- [ ] Provider output is **not** safe (it failed the downstream `validateDraft`); do not treat it as safe.
- [ ] **No** delivery. **No** `AthleteDecision`.

---

## 9. Outcome handling — `input-rejected`

- [ ] Operator **stops and corrects** the athlete manual input.
- [ ] **No** admission or rendering occurs.
- [ ] **No** `AthleteDecision`.

---

## 10. Later decision capture (separate, explicit, athlete-sourced)

- [ ] Capture happens **only later**, on **explicit** athlete input — `athlete-declared` or `athlete-reported`
      **only**.
- [ ] Build the decision with `athleteDecision(...)` and link it to the session with
      `decisionContext({ decisionSupportCaseRef: <the reflection's sourceCaseRef> })`.
- [ ] Record it with `recordAthleteDecision({ record, decision })` (the existing in-memory
      `AthleteDecisionRecordRepository` is sufficient; no new persistence is required).
- [ ] Feedback re-enters **only** as a `SubjectiveObservation` (`decisionAsObservation`) — **never** as a
      `Signal`/`Evidence`, and it triggers no direct reasoning/understanding update.

---

## 11. Operator / scribe rules

- [ ] An operator-conveyed decision is valid **only** as `athlete-reported` content representing the athlete's
      **own** reported decision.
- [ ] The `operatorRef` is **session metadata** — never the decision's source or owner. *operator scribe ≠
      decision source*.

---

## 12. Silence / no-response rules

- [ ] If the athlete does not respond, **no `AthleteDecision`** is created. *silence ≠ decision*.
- [ ] Later **observed behavior** is **not** a decision either; it may only re-enter as a `SubjectiveObservation`
      (it may seed hypotheses, never an `AthleteDecision` without athlete-declared/reported input).
- [ ] Following Aurora is **not** obedience-success; diverging is **not** failure.

---

## 13. Forbidden behaviors

```text
automatic delivery · automatic live-provider call · automatic AthleteDecision creation ·
system-created decision · AI-created decision · operator-created decision (unless explicitly athlete-reported) ·
reflection-ready treated as delivery · reflection-ready treated as decision · delivery success treated as decision ·
silence treated as decision · inferred behavior treated as decision · following Aurora treated as obedience-success ·
removing safety fields to force admission · treating admission as truth · treating validateDraft as recommendation quality ·
CLI/runtime shell · script/package command · production whole-core composer · reflection-composition module ·
deployment/provider/DB/auth/CI/SDK decision · AC20 amendment
```

---

## 14. Core distinctions (keep legible)

```text
runbook ≠ CLI · runbook ≠ runtime shell · runbook ≠ deployment · caller assembly ≠ truth ·
admission success ≠ evidence-backed fact · validateDraft success ≠ recommendation quality ·
reflection-ready ≠ delivered · reflection-ready ≠ AthleteDecision · operator mediation ≠ athlete decision ·
operator scribe ≠ decision source · silence ≠ decision · decision feedback ≠ Signal/Evidence ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```
