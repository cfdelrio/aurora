# Aurora — Specification 037 — Athlete Decision Capture Loop Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral boundary** for capturing
> an athlete decision *after* an Aurora reflection — the continuation of the loop proven by Impl 036-A. It is
> **behavioral-only**: it implements no code, writes no technical spec, modifies no production code/test, adds
> no CLI/runtime shell/script, edits no package file, adds no DB/auth/deployment/CI/SDK file, amends no guard
> (AC20 untouched), and creates no production whole-core composer. Recent sequence: `f44c9d6` (Spec 036) →
> `bad14e4` (Tech Spec 036A) → `d39cd21` (Impl 036-A) → `d677aff` (Docs). Validation at authorship:
> `tsc --noEmit` clean; `node --test` 784/784.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a boundary;
it adds no code.

---

## 1. Context

`[FACT]` The first operator-mediated reflection session (Impl 036-A) produces, on the happy path: a validated
athlete-facing reflection (`reflection-ready`), `deliveryWithheld: true`, a **decision-capture prompt/ref**
(`{ kind: "athlete-decision-invitation", athleteRef, acceptableSources: ["athlete-declared",
"athlete-reported"] }`), and **no `AthleteDecision`**. The loop's continuation — *how the athlete later
declares or reports a decision* — is unspecified.

`[FACT]` The decision machinery **already exists** (Impl 009): `AthleteDecision` (athlete domain) with
`source: DecisionReportSource = "athlete-declared" | "athlete-reported"` ("athlete source only — never
inferred/system"), the `athleteDecision(...)` factory + `recordAthleteDecision`/`amendAthleteDecision`
coordinator + `InMemoryAthleteDecisionRecordRepository`; `decision-support.recordAthleteDecisionRef` records
**only a ref** (never owns the decision); and the feedback loop where an `AthleteDecision` re-enters **only**
as a `SubjectiveObservation` via `decisionAsObservation` (never Signal/Evidence/Understanding). `divergedFromSupport`
is neutral factual metadata; following Aurora is **not** obedience-success.

`[GAP]` What is missing is the **boundary** that connects a *post-reflection* athlete decision to the
reflection/session context (the `decision-capture` prompt/ref), with the source constraints preserved and
**never** auto-created by reflection/delivery/validation/operator/inference.

---

## 2. Central Question

> After Aurora produces a validated reflection, how may an athlete decision be captured as **athlete-declared
> or athlete-reported** input — without treating reflection, delivery, operator action, admission, validation,
> or inferred behavior as the decision itself?

The boundary must preserve:

```text
AthleteDecision must be athlete-declared or athlete-reported · reflection-ready ≠ AthleteDecision ·
validated reflection ≠ AthleteDecision · delivery withheld ≠ AthleteDecision · delivery success ≠ AthleteDecision ·
operator mediation ≠ AthleteDecision · operator action ≠ AthleteDecision · admission success ≠ AthleteDecision ·
validateDraft success ≠ AthleteDecision · inferred behavior ≠ AthleteDecision
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora helps the athlete
understand how training transforms them and where it is taking them, so they decide better and sustain
decisions under pressure.* The boundary protects athlete agency: Aurora may **invite** decision capture; it
must **never** decide for the athlete.

---

## 4. Required Analysis (grounded in the real code)

1. **What `offlineReflectionRuntime` returns after `reflection-ready`.** A safe reflection projection +
   `deliveryWithheld: true` + a `decisionCapture` invitation (prompt/ref) + `mediation` (operational) +
   ref-only trace. **No `AthleteDecision`.**
2. **What the decision-capture prompt/ref means today.** An **invitation** addressed to the athlete
   (`athleteRef`) naming the only acceptable sources (`athlete-declared`/`athlete-reported`). It is not a
   decision and creates none.
3. **What `AthleteDecision` represents.** An athlete-owned record: `{ id, athleteRef, choice, rationale,
   context, source, at, reportConfidence?, divergedFromSupport?, outcomeRefs }`.
4. **Valid sources.** `DecisionReportSource = "athlete-declared" | "athlete-reported"` only.
5. **Forbidden sources.** Anything inferred/system/AI/operator-as-decider — structurally impossible
   (the union has no such member).
6. **Can operator-mediated sessions capture athlete decisions?** Yes — but **only** as the athlete's own
   reported decision (`athlete-reported`); the operator is a scribe, never the decider.
7. **Operator-reported input.** Valid only when it represents the **athlete's** reported decision content,
   marked `athlete-reported`; never `operator-decided` (no such source).
8. **Can `reflection-ready` trigger a decision automatically?** **No.**
9. **Can delivery success trigger a decision automatically?** **No** (delivery success ≠ athlete decision,
   Impl 016).
10. **Can silence/no-response be a decision?** **No.**
11. **Can later athlete behavior be inferred as a decision?** **No** — observed behavior may seed hypotheses
    (re-entering only as a `SubjectiveObservation`), never an `AthleteDecision` without athlete-declared/reported
    input.
12. **Does capture require persistence now?** **No** beyond the existing in-memory
    `AthleteDecisionRecordRepository` (when a future flow records one).
13. **Does capture require event recording now?** **No** — event-recording stays explicit, never auto-emitted.
14. **Does capture require auth/user identity now?** **No** — the offline/operator-mediated context uses a
    safe `athleteRef`; auth is a separate, deferred decision.
15. **Should capture link to reflection/session refs?** **Yes** — via `DecisionContext` (which already carries
    `decisionSupportCaseRef`/`athleteDecisionRef`) and/or the reflection's `sourceCaseRef`, so a captured
    decision is traceable to the session that informed it.
16. **Should capture update understanding/reasoning later?** Only through the **existing** feedback loop
    (Impl 009): the decision re-enters as a `SubjectiveObservation`; it never directly mutates understanding.
17. **Does a feedback loop already exist?** **Yes** (Impl 009). What remains missing is the *post-reflection
    capture boundary* linking it to the session context — the subject of this spec.

---

## 5. Decision Framework & Options

Criteria: athlete agency · source honesty · traceability to reflection/session · no inference-as-fact ·
operator-role clarity · persistence/event/auth requirements (kept minimal) · feedback-loop readiness · least
irreversible commitment · fake-testability.

| Option | Verdict |
| --- | --- |
| A — Decision capture stays entirely out of session; future athlete-declared/reported input only | Partly right (capture is separate) but under-specified — it leaves the session→decision link undefined. |
| **B — A decision-capture contract linked to reflection/session refs; no implementation yet** | **Selected.** Defines the boundary + linkage using existing `AthleteDecision` source constraints; implementation deferred. |
| **C — Operator-reported decision valid only when explicitly `athlete-reported`** | **Adopted within B** — the operator is a scribe; `athlete-reported` is the only valid operator-conveyed source. |
| D — Infer decision from athlete behavior or silence | **Rejected** — violates "never inferred/system"; behavior re-enters only as a `SubjectiveObservation`. |
| E — Treat `reflection-ready` or delivery success as an implicit decision | **Rejected** — reflection/delivery ≠ decision. |
| F — Defer the boundary | **Rejected** — existing `AthleteDecision` concepts are sufficient to define it now. |

---

## 6. Decision

`[DECISION]` **Athlete decision capture is a separate, post-reflection input boundary: an athlete decision may
be captured only as `athlete-declared` or `athlete-reported` input, linked to the reflection/session context;
reflection, delivery, validation, admission, operator mediation, and inferred behavior never create an
`AthleteDecision`.** (Option B, with C adopted.)

- **Who may supply the decision input.** The **athlete** (declaring/reporting their own decision), or a
  trusted **operator acting as scribe** recording the athlete's **own reported** decision. The athlete is the
  sole decision owner; the operator never decides.
- **Valid source labels.** `athlete-declared` (the athlete states a decision directly) and `athlete-reported`
  (the athlete, or an operator on their behalf, reports a decision the athlete made).
- **Forbidden source labels.** Any inferred/system/AI/operator-as-decider source — structurally impossible
  (`DecisionReportSource` has no such member) and contractually forbidden.
- **How operator-reported input must be framed.** Marked `athlete-reported`, representing the athlete's own
  reported decision content; never recorded as the operator's decision.
- **What refs/context link the decision to the reflection/session.** The capture should carry a
  `DecisionContext` (using the existing `decisionSupportCaseRef`/`athleteDecisionRef` fields) and/or the
  reflection's `sourceCaseRef`, so the captured decision is traceable to the session that informed it —
  without that link *causing* a decision.
- **What the runtime must not do automatically.** `offlineReflectionRuntime` must create **no**
  `AthleteDecision`; `reflection-ready`/`renderable-inadmissible`/`not-rendered`/`input-rejected`, delivery
  success, admission success, `validateDraft` success, operator mediation, athlete silence, and observed
  later behavior must **never** be turned into a decision.
- **Persistence / event recording scope.** Out of scope here. A future flow may record an `AthleteDecision`
  through the **existing** in-memory `AthleteDecisionRecordRepository`; event recording stays explicit (never
  auto-emitted). No new persistence/event surface is mandated by this spec.
- **How future feedback-loop implementation should proceed.** Reuse the **existing** Impl 009 path: a captured
  `AthleteDecision` re-enters reasoning **only** as a `SubjectiveObservation` (`decisionAsObservation`), never
  as Signal/Evidence/Understanding; `divergedFromSupport` stays neutral; following Aurora is not
  obedience-success and diverging is not failure.
- **What the next technical spec must decide.** Whether capture is **documented usage** of the existing
  `recordAthleteDecision` coordinator linked to a session ref, or a **thin capture boundary** that adapts the
  `decision-capture` invitation + reflection refs into an `AthleteDecisionInput` (source-constrained); the
  command/outcome shapes; whether to persist in-memory and/or record an event; and how to test it with
  deterministic fakes. (`Tech Spec 037A`.)

`[ASSUMPTION]` The headline: **the decision is the athlete's; Aurora only invites and links it.** The
machinery to record an athlete-owned decision already exists (Impl 009); Spec 037 fixes the *boundary* so a
post-reflection decision is captured honestly (athlete-sourced, session-linked) and is never manufactured by
the system.

---

## 7. Required Behavioral Rules

**Must require:** `AthleteDecision` source is `athlete-declared` or `athlete-reported` only; operator-reported
input is valid only if it represents the athlete's reported decision content; decision capture stays separate
from reflection rendering; capture is linkable to reflection/session context; capture preserves uncertainty
and agency; following Aurora is not success; ignoring Aurora is not failure; no response is not a decision.

**Must forbid:** `AthleteDecision` auto-creation; operator action / delivery success / `reflection-ready` /
`validateDraft` success / admission success / inferred behavior / silence treated as an athlete decision; a
system-created or AI-created `AthleteDecision`.

---

## 8. Required Use Cases (Given / When / Then)

**UC1 — Athlete declares.** *Given* a `reflection-ready` output, *when* the athlete explicitly declares a
decision, *then* a future capture flow may create an `AthleteDecision` with source `athlete-declared`.

**UC2 — Athlete reports later.** *Given* time has passed after a reflection, *when* the athlete reports what
they decided/did, *then* a future flow may create an `AthleteDecision` with source `athlete-reported`.

**UC3 — Operator reports the athlete's decision.** *Given* an operator mediates, *when* they record the
athlete's own reported decision, *then* it is marked `athlete-reported` and is not treated as an operator
decision.

**UC4 — Reflection produced, no input.** *Given* a `reflection-ready` outcome, *when* no explicit athlete
input follows, *then* no `AthleteDecision` is created.

**UC5 — Delivery success.** *Given* a future delivery succeeds, *when* no decision is declared/reported,
*then* no `AthleteDecision` is created.

**UC6 — Athlete silence.** *Given* the athlete does not respond, *when* the session is evaluated, *then*
silence is not a decision.

**UC7 — Inferred behavior.** *Given* the athlete later trains differently, *when* Aurora observes it, *then*
it may form hypotheses (via a `SubjectiveObservation`) but must not classify it as an `AthleteDecision`
without athlete-declared/reported input.

**UC8 — Following Aurora.** *Given* the athlete follows a reflection, *when* the outcome is evaluated, *then*
following Aurora is not obedience-success and not automatic recommendation-quality proof.

---

## 9. Required Acceptance Criteria (Given / When / Then)

- `AthleteDecision` source is `athlete-declared`/`athlete-reported` only. ✅
- An operator report is not an operator decision. ✅
- `reflection-ready` does not create an `AthleteDecision`. ✅
- Delivery success does not create an `AthleteDecision`. ✅
- `validateDraft` success does not create an `AthleteDecision`. ✅
- Admission success does not create an `AthleteDecision`. ✅
- Silence does not create an `AthleteDecision`. ✅
- Inferred behavior does not create an `AthleteDecision`. ✅
- Following Aurora is not obedience-success. ✅
- Decision capture can be linked to reflection/session refs. ✅
- No implementation/code is added by this spec. ✅ (docs-only).
- All existing tests remain green (784/784). ✅

---

## 10. Relationship To Existing Architecture

- **Spec 033** — athlete-facing manual reflection (the interaction model).
- **Spec 036 / Impl 036-A** — the reflection session that *invites* (never creates) a decision.
- **Impl 035-B / 032R-A** — the admission-gated runtime that returns the `decision-capture` invitation.
- **Impl 009** — the `AthleteDecision` feedback loop (athlete-declared/reported; re-enters only as a
  `SubjectiveObservation`); this spec links it to the post-reflection session.
- **Impl 016** — delivery success ≠ athlete decision.
- **Impl 014** — `validateDraft` ≠ recommendation quality.
- **AC20** — whole-core composition remains a test harness; capture introduces no production whole-core
  composer.

---

## 11. Forbidden Behaviors

```text
implementation code · technical implementation plan · automatic AthleteDecision creation · system-created
decision · AI-created decision · operator-created decision unless explicitly athlete-reported · reflection-ready
treated as decision · rendering validation treated as decision · delivery success treated as decision · silence
treated as decision · inferred behavior treated as decision · following Aurora treated as obedience-success ·
CLI/runtime shell creation · script creation · package script changes · deployment/CI files · DB/schema/migrations ·
auth/session/user implementation · SDK/dependency changes · AC20 amendment · production whole-core composer
```

---

## 12. Open Questions For Tech Spec 037A

1. The exact decision-capture function name (or documented usage of `recordAthleteDecision`).
2. The exact input command shape.
3. The exact reflection/session ref shape linking the decision to the session.
4. The exact valid source enum usage (`athlete-declared`/`athlete-reported`).
5. The exact output/outcome shape.
6. Whether to use the existing `athleteDecision(...)` factory / `recordAthleteDecision` coordinator.
7. Whether to persist in-memory only.
8. Whether to record an event/outcome record (default: no, unless explicit).
9. Whether to integrate with the existing feedback-loop tests (Impl 009).
10. Whether capture lives in the `athlete` application surface or a small new boundary (must not own the whole
    core; must not be a production whole-core composer).

---

## 13. Success Criteria

After Aurora produces a validated reflection, can an athlete decision be captured **only** as
`athlete-declared` or `athlete-reported` input, linked to the reflection/session context, **without** the
system ever manufacturing it from reflection/delivery/validation/admission/operator/inference/silence, and
**without** adding code, CLI, persistence/event/auth, or amending AC20? **Yes — via Option B (with C):** a
separate post-reflection capture boundary over the existing `AthleteDecision` source constraints and Impl 009
feedback loop, session-linked, with implementation deferred to `Tech Spec 037A`. Validation at authorship:
`tsc --noEmit` clean; `node --test` 784/784; no code, test, package, runtime, CLI, deployment, CI, SDK, or
dependency change; AC20 untouched.
