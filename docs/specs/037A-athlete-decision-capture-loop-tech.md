# Aurora — Technical Spec 037A — Athlete Decision Capture Loop Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 037 (`0dd7ddc`). It translates the
> post-reflection decision-capture boundary into a TS-strict implementation plan **grounded in the real
> code**. It is **plan only**: it implements no code, modifies no production code/test, edits no package file,
> adds no CLI/runtime shell/script, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard
> (AC20 untouched), and creates no production whole-core composer. Recent sequence: `d39cd21` (Impl 036-A) →
> `d677aff` (Docs) → `0dd7ddc` (Spec 037). Validation at authorship: `tsc --noEmit` clean; `node --test`
> 784/784.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 037-A** and
writes no code/test.

---

## 1. Context recap

`[FACT]` Spec 037 decided: post-reflection athlete decision capture is a **separate input boundary**; sources
are `athlete-declared`/`athlete-reported` only; the operator is a scribe (athlete-reported only); reflection/
delivery/validation/admission/operator-mediation/inference never create an `AthleteDecision`. The decision
machinery already exists (Impl 009). This plan decides *how little* to build.

---

## 2. Surface Gap Analysis (grounded in real code)

1. **`AthleteDecision` (Q1).** `{ id, athleteRef, choice: DecisionChoice, rationale: DecisionRationale,
   context: DecisionContext, source: DecisionReportSource, at, reportConfidence?, divergedFromSupport?,
   outcomeRefs }` (`athlete/domain/athlete-decision.ts`).
2. **`DecisionReportSource` (Q2).** `"athlete-declared" | "athlete-reported"` — "athlete source only — never
   inferred/system." The union **structurally** forbids system/inferred/operator/AI sources.
3. **`athleteDecision(...)` factory (Q3).** `athleteDecision(input: AthleteDecisionInput): AthleteDecision`,
   `AthleteDecisionInput = { id?, athleteRef, choice, rationale?, context?, source, at, reportConfidence?,
   divergedFromSupport?, outcomeRefs? }`.
4. **`recordAthleteDecision(...)` coordinator (Q4).** `recordAthleteDecision(input: RecordDecisionInput):
   AthleteDecisionRecord`, `RecordDecisionInput = { record: AthleteDecisionRecord; decision: AthleteDecision }`
   → `input.record.record(input.decision)`. (Plus `amendAthleteDecision`; `InMemoryAthleteDecisionRecordRepository.save`.)
5. **`DecisionContext` (Q5).** `{ decisionSupportCaseRef?, decisionOpportunityRef?, purposeVersionRef?,
   limitations? }`; built via `decisionContext({...})`.
6. **`decisionSupportCaseRef` / `athleteDecisionRef` usage (Q6).** `DecisionContext.decisionSupportCaseRef`
   is the existing link to the decision-support case that informed the decision. `decision-support.recordAthleteDecisionRef`
   records **only a ref** on the case (never owns the decision). There is **no dedicated "reflection/session
   ref" field** — the reflection's `sourceCaseRef` **is** a decision-support case ref, so
   `decisionSupportCaseRef` is the honest existing link.
7. **`SubjectiveObservation` from a decision (Q7).** `__tests__/decision-observation-adapter.ts`'s
   `decisionAsObservation(decision)` maps an `AthleteDecision` → `SubjectiveObservation` (the decision id in
   `provenance.reference`; choice + rationale as verbatim words; never Signal/Evidence/Understanding).
8. **Existing feedback-loop coverage (Q8).** `__tests__/athlete-decision-feedback-loop.test.ts` proves the
   decision is athlete-owned, the case records only a ref, and re-entry is only via `decisionAsObservation`;
   `divergedFromSupport` neutral; outcome never grades the support.
9. **Repository/in-memory storage (Q9).** `AthleteDecisionRecordRepository.save(record)` +
   `InMemoryAthleteDecisionRecordRepository` exist; capture may use them (in-memory) when recording.
10. **Event-recording behavior (Q10).** Explicit, never auto-emitted; `recordAthleteDecision` emits no event.
11. **`offlineReflectionRuntime` decision-capture prompt (Q11).** `decisionCapture = { kind:
    "athlete-decision-invitation", athleteRef, acceptableSources: ["athlete-declared", "athlete-reported"] }`
    — an invitation only.
12. **`reflection-ready` refs for linking (Q12).** The outcome carries `reflection` (incl. `kind`) +
    `trace.renderedMessageRecordId` + the renderable's `sourceCaseRef` (a decision-support case ref) — usable
    as `decisionSupportCaseRef`.
13. **Session harness refs (Q13).** Impl 036-A uses `SOURCE_CASE_REF = "case:036a"` (the case ref) and
    `ATHLETE` — both available as link refs.
14. **Auth/identity/session persistence (Q14).** **Absent** — capture uses a safe `athleteRef` string; no
    auth; no session store.
15. **Delivery-success-as-decision (Q15).** **Absent and forbidden** (Impl 016; the runtime withholds
    delivery anyway).
16. **No-auto-creation guards (Q16).** `offline-reflection-runtime` and `first-operator-mediated-reflection-session`
    tests already assert no `AthleteDecision` is created on any session path; the source union forbids
    non-athlete sources type-level.

`[FACT]` Decisive consequence: the existing `athleteDecision(...)` + `recordAthleteDecision(...)` +
`decisionContext({ decisionSupportCaseRef })` **already enforce** source honesty (type-level) and support
context linking (via `decisionSupportCaseRef`). A new production wrapper would add **no safety**. What is
missing is only **executable proof** that a *post-reflection* decision is captured this way (linked to the
session) and never auto-created.

---

## 3. Central Question

> Should post-reflection capture be documented usage of existing `recordAthleteDecision(...)`, a thin
> session-linked boundary, or no new code — preserving source honesty, no auto-creation, no inference, and no
> premature persistence/auth/event/deployment?

**Answer:** **documented usage of the existing factory + coordinator, proven by a test-only harness** (no new
production code). The existing source union + `DecisionContext.decisionSupportCaseRef` already provide the
required guarantees; the harness proves the post-reflection capture, the session link, the no-auto-creation
invariants, and the feedback-loop re-entry.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Scope → **Option A + C: documented usage proven by a test-only harness; no new production code**

Implementation 037-A is a **single test** demonstrating post-reflection capture via the existing
`athleteDecision(...)` + `recordAthleteDecision(...)` + `decisionContext({ decisionSupportCaseRef })`, with
the feedback re-entry via `decisionAsObservation`. Rejected: **B** (thin boundary) — adds no safety over the
existing union/coordinator/context; **D** (integrate into `offlineReflectionRuntime`) — the runtime must never
auto-create a decision; **E** (persistence/event/auth-backed capture) — premature coupling. If, during
implementation, the existing surfaces turn out to lack a needed guarantee, escalate to **B** (a thin
athlete-application boundary) — but the §2 analysis indicates they do not.

### `[DECISION]` Decision 2 — Placement → **`src/modules/__tests__/post-reflection-athlete-decision-capture.test.ts`**

It composes athlete surfaces + the `decisionAsObservation` adapter (which lives in `__tests__/`) + (optionally)
a runtime/session ref — a cross-module documented-usage proof, so it belongs in the neutral `__tests__/` root.
**Not** `offline-reflection-runtime` (no runtime change); **not** `event-recording` (no event persistence);
**not** a new production module. (If Decision 1 ever escalates to B, the thin boundary would live in
`src/modules/athlete/application/` with its own tests — but 037-A does not.)

### `[DECISION]` Decision 3 — Function shape → **none (no new production function)**

037-A adds no production function. The harness uses the existing `athleteDecision(...)` and
`recordAthleteDecision(...)` directly. (A future candidate, only if B is ever chosen:
`capturePostReflectionAthleteDecision(command, deps)` requiring `source ∈ {athlete-declared, athlete-reported}`
+ athlete content + a `decisionSupportCaseRef`/session link — not built here.)

### `[DECISION]` Decision 4 — Source enforcement → **type-level union + harness assertions**

`DecisionReportSource` makes system/inferred/operator/AI/delivery/reflection/validation/silence/behavior
sources **structurally impossible** as a decision source. The harness asserts: `athlete-declared` and
`athlete-reported` accepted; an operator-conveyed decision is recorded **only** as `athlete-reported`; and a
TypeScript-level negative (a non-union source is a compile error) is documented (the test exercises the valid
union and notes the impossibility of others).

### `[DECISION]` Decision 5 — Linking requirements → **`decisionContext({ decisionSupportCaseRef })` using the reflection's `sourceCaseRef`**

The minimal honest link is `DecisionContext.decisionSupportCaseRef` set to the reflection's `sourceCaseRef`
(a decision-support case ref). `[GAP]` There is **no** dedicated reflection/session-id field and **no**
persistence-backed session id; the plan deliberately uses the **existing** `decisionSupportCaseRef` as the
link rather than inventing one. `purposeVersionRef`/`decisionOpportunityRef` may also be carried when known.

### `[DECISION]` Decision 6 — Output behavior → **existing types; no new status union**

The harness asserts on the existing `AthleteDecision` / `AthleteDecisionRecord` results (e.g. recorded
decision present, `source` correct, `context.decisionSupportCaseRef` linked). No new status union is
introduced (037-A adds no production type). (If B were chosen later: a closed `captured | rejected-invalid-source
| rejected-missing-athlete-content | rejected-missing-context-ref` — not built here.)

### `[DECISION]` Decision 7 — Feedback-loop behavior → **reuse Impl 009; re-entry only as `SubjectiveObservation`**

The harness records the decision via `recordAthleteDecision`, then demonstrates re-entry via
`decisionAsObservation` → `SubjectiveObservation` (never Signal/Evidence; no reasoning/understanding update;
`divergedFromSupport` neutral; following Aurora not obedience-success).

### `[DECISION]` Decision 8 — Persistence/event/auth → **none new**

No DB; no auth; no user/session system; no event recording (none added — `recordAthleteDecision` records
none); no delivery integration; no runtime integration. The harness may use the existing in-memory
`AthleteDecisionRecordRepository` only.

### `[DECISION]` Decision 9 — Tests & guards

A single `__tests__/` harness (Decision 2) covering §6 below. No production file changes, so existing AC20 /
application-orchestration / scripts-package guards keep passing unchanged.

---

## 5. Required File Layout (Implementation 037-A)

```text
src/modules/__tests__/post-reflection-athlete-decision-capture.test.ts   (new — documented-usage harness)
```

**No production file changes.** **Must NOT create:** `src/modules/{session,runtime,api,server,ui,frontend,
worker,auth,db}/`, `scripts/decision-capture.mjs`. **Must NOT edit:** `package.json`, `package-lock.json`,
`scripts/operator-live-smoke.mjs`. **Must NOT integrate with:** `offlineReflectionRuntime`, delivery, provider
adapters, cloud-secret adapters, a deployment target.

---

## 6. Required Test Plan (Implementation 037-A)

Deterministic; documented usage of existing surfaces:

1. An `athlete-declared` post-reflection decision is captured (built via `athleteDecision` + recorded via
   `recordAthleteDecision`).
2. An `athlete-reported` post-reflection decision is captured.
3. An operator-conveyed decision is recorded **only** as `athlete-reported` content (operator is a scribe).
4. A system/inferred/operator/AI source is impossible (type-level) — documented; the harness exercises only
   the valid union.
5. Missing decision content (no choice) is rejected by the existing factory/aggregate (fail closed).
6. Missing reflection/session context: a decision **without** `decisionSupportCaseRef` is allowed by the
   domain but the harness asserts the *post-reflection* capture carries the link (the boundary's expectation).
7. `reflection-ready` alone creates no `AthleteDecision` (re-assert via the session harness / runtime outcome).
8. Delivery success alone creates no `AthleteDecision`.
9. `validateDraft` success alone creates no `AthleteDecision`.
10. Silence/no-response creates no `AthleteDecision`.
11. Observed later behavior may seed a hypothesis (via `SubjectiveObservation`) but creates no `AthleteDecision`
    without athlete-sourced input.
12. The captured decision links to the reflection via `context.decisionSupportCaseRef` (= the session's
    `sourceCaseRef`).
13. The captured decision re-enters only as a `SubjectiveObservation` (`decisionAsObservation`).
14. No Signal/Evidence is created directly.
15. No reasoning/understanding update is triggered directly.
16. No delivery call is made; 17. no provider/live call is made; 18. no event persistence is introduced;
    19. no DB/auth/session/deployment file is introduced.
20. `offlineReflectionRuntime` remains unchanged; 21. AC20 remains green; 22. all existing tests remain green.

---

## 7. Boundary / Import Rules

**Allowed (in the `__tests__/` harness):** athlete module surfaces (`athleteDecision`, `recordAthleteDecision`,
`decisionContext`, `AthleteDecisionRecord`, `InMemoryAthleteDecisionRecordRepository`); the
`decisionAsObservation` adapter; shared-kernel; the runtime/session refs as opaque strings. **Forbidden:**
`offlineReflectionRuntime` importing decision capture; a decision-capture production file importing
rendering/provider/delivery; non-athlete source values; auto-creation from reflection-ready/delivery success;
DB/auth/session/CI/deployment files; package scripts.

---

## 8. Required Distinctions

```text
reflection-ready ≠ AthleteDecision · validated reflection ≠ AthleteDecision · delivery success ≠ AthleteDecision ·
delivery withheld ≠ delivery failure · admission success ≠ AthleteDecision · validateDraft success ≠ AthleteDecision ·
operator mediation ≠ AthleteDecision · operator scribe ≠ decision source · athlete-reported ≠ system-inferred ·
observed behavior ≠ decision · silence ≠ decision · following Aurora ≠ obedience-success ·
AthleteDecision re-entry as SubjectiveObservation ≠ Signal/Evidence · Aurora advises; the athlete decides
```

---

## 9. Relationship To Existing Architecture

- **Spec 037** — implements its capture boundary as documented usage + a test harness.
- **Impl 009** — reuses `AthleteDecision` (source-constrained), `recordAthleteDecision`, and the
  `decisionAsObservation` re-entry; adds nothing to them.
- **Impl 036-A** — the reflection session provides the link ref (`sourceCaseRef`/`athleteRef`) and proves no
  decision is created in-session.
- **Impl 016 / 014** — delivery success ≠ decision; `validateDraft` ≠ recommendation quality.
- **AC20** — no production whole-core composer; the harness lives in `__tests__/`.

---

## 10. Open Questions (deferred to Implementation 037-A / a later slice)

1. Whether the harness records into an in-memory `AthleteDecisionRecordRepository` or just constructs +
   records on the aggregate.
2. Whether to add a dedicated reflection/session ref field later (vs. reusing `decisionSupportCaseRef`).
3. Whether a thin `athlete/application` boundary (Decision 1 → B) is ever warranted (only if a future caller
   needs source/context enforcement beyond the factory).
4. How/whether to record an explicit `DomainEventRecord` for a captured decision (a later, explicit slice).

---

## 11. Implementation Task Preview

**Next mission: Implementation 037-A — post-reflection athlete decision capture harness (test-only).** Add
`src/modules/__tests__/post-reflection-athlete-decision-capture.test.ts` demonstrating capture via the
existing `athleteDecision` + `recordAthleteDecision` + `decisionContext({ decisionSupportCaseRef })`, the
feedback re-entry via `decisionAsObservation`, and the no-auto-creation invariants; no production change.
After it lands, **Docs consolidation post 037**.

---

## 12. Success Criteria

Can Aurora prove post-reflection athlete decision capture — `athlete-declared`/`athlete-reported` only,
session-linked, never auto-created — **without** new production code, a runtime change, a thin wrapper,
persistence/auth/event coupling, or an AC20 amendment? **Yes — via Option A + C:** documented usage of the
existing source-constrained factory + coordinator + `DecisionContext.decisionSupportCaseRef`, proven by a
single `__tests__/` harness; implementation is `Implementation 037-A`. Validation at authorship:
`tsc --noEmit` clean; `node --test` 784/784; no code, test, package, runtime, CLI, deployment, CI, SDK, or
dependency change introduced by this document; AC20 untouched.
