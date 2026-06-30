# Aurora — Specification 042 — Real Caller / Operator Use Protocol Boundary

> **Status (2026-06-30).** Specification phase. This document defines the **behavioral decision gate** for
> introducing any caller surface (CLI/API/UI/tooling), persistence/event integration, provider/deployment lane,
> live-provider/delivery integration, DB/auth/session work, or AC20 amendment around `invokeOperatorSession(...)`,
> and the **manual operator-use protocol** for running a session today without a premature surface. It is the
> continuation selected by the post-041 roadmap checkpoint (`136f588`). It is **behavioral/governance-only**: it
> implements no code, writes no technical spec, modifies no production code/test, creates no CLI/runtime shell/
> script/package command, edits no package file, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, adds no
> provider/live/delivery/persistence integration, amends no guard (AC20 untouched), and creates no production
> whole-core composer. Recent sequence: `5dea083` (Impl 041-A) → `f3be69b` (Docs) → `136f588` (Roadmap checkpoint
> post-041). Validation at authorship: `tsc --noEmit` clean; `node --test` 852/852.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a decision gate
+ a manual-use protocol; it builds no surface and adds no code.

---

## 1. Context

`[FACT]` Aurora has a **complete, safe invocation chain**: the thin seam (Spec 039), the session
envelope/redaction contract (Spec 040, `OperatorSessionEnvelope` + `toOperatorSessionEnvelope`), and the
production helper (Spec 041, `invokeOperatorSession(command, deps): Promise<OperatorSessionEnvelope>`). The helper
runs the runtime once and returns **only** the redacted envelope.

`[FACT]` There is **no real caller** and **no caller surface**: no CLI, script/package command, API/UI, deployment
target, DB/auth/session, persistence/event integration, or live-provider default. `invokeOperatorSession` (and the
mapper, and the seam) are exercised **only by tests**.

`[GAP]` Five+ checkpoints have deferred surfaces on the same implicit ground — "no real caller / no new evidence."
That deferral is correct but **implicit and re-litigated each time**. What is missing is an **explicit decision
gate**: *what evidence must exist before each lane is built*, and *how an operator runs a session today* without
prematurely creating a surface. Spec 042 fixes that gate.

---

## 2. Central Question

> What evidence is required before Aurora creates **any** caller surface, CLI, API, persistence integration,
> provider/deployment lane, or UI/tooling around `invokeOperatorSession(...)` — and how should an operator use the
> system **today**, manually and offline, without creating a premature surface?

The gate must keep these distinctions legible (never collapse):

```text
real caller ≠ hypothetical future UI · real caller ≠ developer convenience · real caller ≠ package-script desire ·
real caller ≠ deployment target · real caller ≠ provider choice · real caller ≠ persistence need ·
real caller ≠ athlete decision · real caller ≠ operator curiosity
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."*

The protocol must **not** convert operator use into an athlete decision, delivery, truth, or product deployment.
It governs *when* Aurora is allowed to grow a surface — and protects against growing one before there is a real
need.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **What exists today.** The complete invocation chain: `invokeOperatorSession` → `offlineReflectionRuntime` →
   `toOperatorSessionEnvelope` → `OperatorSessionEnvelope` only; the operator runbook proof + docs checklist; the
   admission-gated runtime; the decision-capture flow (Impl 037-A); deterministic fakes.
2. **What does not exist today.** A real caller; a CLI/script/package command; an API/UI/worker; a deployment
   target; a live-provider default; a real delivery channel; DB/auth/session; persistence/event integration.
3. **What an operator can do today.** Follow the runbook, assemble a command + `RenderingRequest` outside
   production modules, inject deterministic deps, call `invokeOperatorSession`, receive only the envelope, review
   it manually, and (separately, later) capture an athlete-declared/reported decision.
4. **What an operator cannot do today.** Run a session via a CLI/API/UI; deliver; persist sessions; call a live
   provider by default; have Aurora auto-create a decision.
5. **What counts as a real caller.** A concrete, identified consumer of `invokeOperatorSession` with a stated,
   recurring need that manual/offline use demonstrably fails to meet — *evidence*, not a hypothesis (see §7).
6. **What does not count as a real caller.** The helper/envelope/runbook existing; developer convenience; a demo
   wish; a hypothetical future athlete UI; operator curiosity; "clean architecture" preference.
7. **What evidence unlocks a CLI/script lane.** §7 — repeated, error-prone manual local invocation; still offline/
   manual; still behind `invokeOperatorSession`; no deployment.
8. **What evidence unlocks an API/UI lane.** §7 — an identified user/caller needing remote/sessionful interaction;
   explicit auth/session/deployment requirements; a clear product user.
9. **What evidence unlocks persistence/event integration.** §7 — a proven need to retain outcomes across runs /
   audit / multi-session analysis / operator handoff / decision-linking the in-memory + test harnesses cannot meet.
10. **What evidence unlocks provider/deployment reopening (Spec 030/031).** §7 — a selected/constrained deployment
    target or runtime surface; real platform/environment signal; live calls required by real use; a secret source
    required by deployment.
11. **What evidence unlocks live-provider integration.** §7 — an explicit live opt-in need; the deterministic fake
    insufficient for the target use; a configured secret source; operator understanding of cost/failure/privacy
    risk; a defined safe fallback.
12. **What evidence unlocks delivery-channel integration.** §7 — a selected channel; an athlete-consented delivery
    path; review/approval semantics; delivery-failure semantics.
13. **What evidence unlocks DB/auth/session work.** Subsumed by the persistence (§9) and API/UI (§8) lanes — only
    once those thresholds are met; never speculatively.
14. **What evidence would justify revisiting AC20.** §7 — a proven product need that **caller assembly +
    `invokeOperatorSession` cannot satisfy**, requiring production whole-core composition that cannot remain a test
    harness, with an explicit risk review + a separate amendment spec. (None exists.)
15. **What must always sit behind `invokeOperatorSession`.** Any future surface (CLI/API/UI/tooling) that runs a
    session must call the helper and receive **only** the envelope — never the runtime/mapper directly, never the
    raw outcome.
16. **How command/deps are supplied today.** The operator/caller assembles the `OfflineReflectionRuntimeCommand`
    (incl. a Tier-1-satisfying `RenderingRequest`, preferably `renderableFromTerminalOutput`-projected, per Spec
    038) and injects `OfflineReflectionRuntimeDependencies` (deterministic fakes by default) — **outside**
    production modules.
17. **How manual operation works without deployment.** Entirely in-process/offline: assemble → call the helper →
    read the envelope. No transport, entrypoint, or deployed surface.
18. **How athlete decision capture remains separate.** The envelope carries only the decision-capture invitation/
    ref; a captured `AthleteDecision` is the separate Impl 037-A athlete-declared/reported flow.
19. **What remains explicitly deferred.** CLI/script/package, API/UI/worker, deployment/provider (030/031),
    live-provider, delivery channel, persistence/event, DB/auth/session, AC20 amendment — until §7 evidence exists.
20. **What the next technical spec would be allowed to do (if any).** At most a **docs-only** artifact (e.g. a
    surface-readiness checklist/matrix) and/or a runbook note referencing `invokeOperatorSession`. **No** code,
    surface, or guard change. (Likely no Tech Spec is warranted → Docs consolidation post 042.)

`[FACT]` Decisive consequence: the binding constraint on every remaining lane is identical — **no real caller /
no new evidence**. The highest-value artifact is the **gate itself**, not a build. This spec makes the gate
explicit and reusable.

---

## 5. Decision Framework & Options

Evaluated on: evidence quality · least irreversible commitment · AC20 preservation · no-default-live-call
preservation · delivery-withheld preservation · athlete decision ownership · operator usability · future caller
compatibility · avoidance of premature deployment/provider choice · avoidance of premature persistence/auth ·
fake-testability.

| Option | Verdict |
| --- | --- |
| **A — Real-caller evidence gate + manual operator protocol** | **Selected.** Turns the recurring implicit deferral into an explicit, testable decision rule; preserves manual/offline use; docs-only; least irreversible. |
| B — CLI/script boundary now | **Rejected.** No concrete caller evidence; premature, deployment-adjacent. |
| C — API/UI/operator tool boundary now | **Rejected.** No identified user/caller; deployment-shaped. |
| D — Persistence/event integration now | **Rejected.** No retention/audit need proven; would prematurely couple the offline loop. |
| E — Provider/deployment reopen now | **Rejected.** No new deployment/provider evidence (030/031 deferral holds). |
| F — Live-provider/delivery integration now | **Rejected.** No-default-live-call and delivery-withheld still hold. |
| G — AC20 amendment / production whole-core composition | **Rejected.** Caller assembly + the helper satisfy current needs; no proven need. |
| H — Stop and stabilize without an explicit gate | **Rejected (as primary).** Restraint is right, but leaving the gate implicit invites re-litigation each checkpoint; Option A captures the same restraint as a rule. (Acceptable fallback if the maintainer prefers no new doc.) |

---

## 6. Decision

`[DECISION]` **Real caller / operator use protocol (Option A).** Aurora will **not** create CLI, script/package
command, API/UI, persistence/event, provider/deployment, live-provider, delivery, DB/auth/session, or
AC20-amendment work **until caller evidence meets the explicit thresholds in §7**. Until then, operator use remains
**manual and offline** through the runbook + `invokeOperatorSession`, with caller-assembled `command`/`deps`,
deterministic fakes by default, delivery withheld, no automatic `AthleteDecision`, and `OperatorSessionEnvelope` as
the only invocation result.

**What evidence is required.** Per-lane thresholds in §7 — each lane is unlocked only by its own concrete,
recurring, demonstrated need; one lane's evidence never unlocks another.

**What evidence is insufficient.** The existence of the helper/envelope/runbook; developer convenience; a demo
wish; a hypothetical future UI; operator curiosity; architectural preference.

**How a session is run today.** §8 — assemble command + `RenderingRequest`, inject fake deps, call
`invokeOperatorSession`, receive only the envelope, review manually; capture a decision (if any) separately.

**What remains manual.** Command/deps assembly, invocation, envelope review, and decision capture — all
in-process/offline, no surface.

**What remains behind `invokeOperatorSession`.** Every future session-running surface; none may bypass the helper
or touch the raw outcome.

**What remains deferred.** All lanes in §5 B–G until §7 evidence exists.

**What future specs are allowed.** Only docs-only artifacts (a surface-readiness checklist/matrix; a runbook note)
unless/until a lane's §7 threshold is met — at which point that lane gets its **own** spec.

**What future specs are forbidden without evidence.** Any spec that builds a CLI/API/UI/persistence/provider/
deployment/live/delivery surface, or amends AC20, without first meeting the corresponding §7 threshold.

`[ASSUMPTION]` The headline: **Aurora's safe invocation chain is complete; Spec 042 fixes the gate that keeps it
from growing a surface prematurely.** It names what counts as a real caller, what evidence unlocks each lane, and
how an operator runs a session today manually/offline behind `invokeOperatorSession` — turning five checkpoints of
implicit restraint into one explicit, testable rule.

---

## 7. Required Evidence Thresholds (per lane)

**CLI / script lane.** *Sufficient:* repeated manual sessions; the same operator steps recurring; human error
caused by manual invocation; a need for reproducible local invocation — **still offline/manual, still behind
`invokeOperatorSession`, no API/deployment required**. *Insufficient:* developer convenience alone; a desire to
demo; the helper existing.

**API / UI / operator-tool lane.** *Sufficient:* an identified user/caller; an interaction model beyond the local
operator; a need for remote/sessionful interaction; understood auth/session requirements; deployment-target
pressure; a clear product user. *Insufficient:* the helper exists; the envelope exists; a hypothetical future
athlete UI.

**Persistence / event-integration lane.** *Sufficient:* a need to retain session outcomes across runs; an audit/
compliance requirement; a multi-session analysis requirement; an operator-handoff requirement; a decision-linking
requirement the existing in-memory/test harnesses cannot satisfy. *Insufficient:* the session envelope exists; the
operator "may want history someday."

**Provider / deployment lane (reopen Spec 030/031).** *Sufficient:* a selected or constrained deployment target; a
selected runtime surface; a real platform/environment signal; live-provider calls required by real use; a secret
source required by deployment. *Insufficient:* existing provider adapters; existing secret adapters; the operator
smoke existing.

**Live-provider lane.** *Sufficient:* an explicit live opt-in need; the test fake insufficient for the target use;
a configured secret source; operator understanding of cost/failure/privacy risk; defined safe fallback behavior.
*Insufficient:* the live smoke works; a provider exists.

**Delivery lane.** *Sufficient:* an explicit delivery channel selected; an athlete-consented delivery path; defined
review/approval semantics; needed delivery-failure semantics. *Insufficient:* `reflection-ready` exists; the
envelope exists.

**AC20 amendment lane.** *Sufficient:* caller assembly **cannot** satisfy a proven product need; production
whole-core composition is **required** and cannot remain a test harness; an explicit risk review **and** a separate
amendment spec. *Insufficient:* convenience; clean-architecture preference; a CLI/API desire.

---

## 8. Required Current Operator Protocol (run a session today, no new surface)

```text
1. Follow docs/runbooks/operator-session-runbook.md.
2. Assemble an OfflineReflectionRuntimeCommand OUTSIDE Aurora production modules.
3. Provide a caller-assembled RenderingRequest (preferably renderableFromTerminalOutput-projected; Tier-1 satisfied).
4. Inject deterministic dependencies by default (fake provider client, in-memory repos, fake secret ref).
5. Call invokeOperatorSession(command, deps).
6. Receive ONLY OperatorSessionEnvelope.
7. Manually review the envelope's safe fields (status, reflectionRef/flags, decisionCapture invitation/ref, traceSummary).
8. Do NOT deliver automatically.
9. Do NOT infer an AthleteDecision.
10. If the athlete later declares/reports a decision, use the SEPARATE athlete-decision capture flow (Impl 037-A).
```

`[FACT]` Distinctions: **manual use protocol ≠ CLI · manual use protocol ≠ deployment · manual use protocol ≠
production whole-core composition · manual use protocol ≠ delivery · manual use protocol ≠ athlete decision.**

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Manual operator session today.** *Given* an operator has a caller-assembled command + deterministic deps,
*when* they follow the runbook and call `invokeOperatorSession`, *then* they receive **only**
`OperatorSessionEnvelope` and no delivery/decision occurs.

**UC2 — CLI evidence threshold.** *Given* manual sessions are repeated and error-prone, *when* the same local
steps recur and no deployment is needed, *then* a CLI/script boundary **may be considered** — behind
`invokeOperatorSession`, offline.

**UC3 — API/UI evidence threshold.** *Given* a real user/caller requires remote or sessionful interaction, *when*
auth/session/deployment requirements are explicit, *then* an API/UI boundary **may be considered** — behind
`invokeOperatorSession`.

**UC4 — Persistence evidence threshold.** *Given* outcomes must be retained across runs or audited, *when* the
in-memory/test harnesses are insufficient, *then* a persistence/event boundary **may be considered**.

**UC5 — Provider/deployment threshold.** *Given* a real deployment target or live use case exists, *when*
platform/secret/provider constraints are explicit, *then* Specs 030/031 **may be reopened**.

**UC6 — No evidence.** *Given* no caller evidence exists, *when* a lane is proposed, *then* the protocol **defers**
it and preserves manual/offline operation.

**UC7 — Athlete decision remains separate.** *Given* an envelope includes a decision-capture invitation/ref, *when*
the athlete later decides, *then* capture remains athlete-declared/reported and **separate** from operator
invocation.

**UC8 — AC20 remains intact.** *Given* caller assembly still satisfies the use case, *when* a future surface is
considered, *then* AC20 **must remain unchanged**.

---

## 10. Required Acceptance Criteria (Given / When / Then)

- A real caller requires evidence. ✅
- CLI requires repeated/error-prone local-operation evidence. ✅
- API/UI requires real remote/sessionful-caller evidence. ✅
- Persistence requires retention/audit/multi-session evidence. ✅
- Provider/deployment requires platform/live-use evidence. ✅
- Live provider requires explicit opt-in evidence. ✅
- Delivery requires athlete-consented-channel evidence. ✅
- AC20 amendment requires proven need beyond caller assembly. ✅
- Manual operator use remains possible today. ✅
- Manual operator use sits behind `invokeOperatorSession`. ✅
- `invokeOperatorSession` returns only `OperatorSessionEnvelope`. ✅
- No automatic delivery. ✅
- No automatic `AthleteDecision`. ✅
- No default live provider. ✅
- No automatic persistence. ✅
- No CLI/API/deployment added by this spec. ✅
- No implementation/code is added by this spec (docs-only). ✅
- AC20 remains unchanged. ✅
- All existing tests remain green (852/852). ✅

---

## 11. Relationship To Existing Architecture

- **Spec 041 / Impl 041-A** — `invokeOperatorSession`; the protocol governs *when* a surface may sit behind it.
- **Spec 040 / Impl 040-A** — `OperatorSessionEnvelope`; the only invocation result.
- **Spec 039 / Impl 039-A** — the thin invocation seam proof.
- **Spec 038 / Impl 038-A** — the operator runbook (the manual protocol's basis).
- **Spec 037 / Impl 037-A** — post-reflection decision capture stays separate.
- **Spec 035 / Impl 035-A/B** — external renderable admission (Tier 2).
- **Impl 032R-A** — `offlineReflectionRuntime`, invoked behind the helper.
- **Specs 030/031** — provider/deployment remain deferred without new evidence (§7).
- **Spec 034R / AC20** — whole-core composition stays a test harness; no production whole-core composer.

---

## 12. Forbidden Behaviors

```text
implementation code · technical implementation plan · CLI/runtime shell creation · script creation ·
package script changes · API/UI creation · deployment/CI files · DB/schema/migrations · auth/session/user implementation ·
SDK/dependency changes · AC20 amendment · reflection-composition module · production whole-core composer ·
automatic live call · automatic real-secret resolution · automatic delivery · automatic AthleteDecision creation ·
automatic persistence · raw runtime outcome exposure · operator behavior treated as athlete decision ·
silence treated as decision · envelope treated as a delivered artifact
```

---

## 13. Open Questions For Future Tech Spec

1. Is any implementation needed for the protocol, or is it docs-only? (Default: docs-only.)
2. Should the evidence thresholds become a standalone checklist doc?
3. Should the runbook be updated to reference `invokeOperatorSession` explicitly?
4. Should docs add a "surface-readiness" matrix?
5. What would count as first real-caller evidence in practice?
6. If repeated manual sessions happen, should a CLI be local-only and no-package-script first?
7. If persistence becomes needed, what is the minimum event/session record boundary?
8. If deployment becomes needed, should Specs 030/031 be reopened first?

---

## 14. Success Criteria

Can Aurora fix an explicit decision gate — defining what counts as a real caller and what concrete evidence
unlocks each lane (CLI / API/UI / persistence / provider-deployment / live-provider / delivery / DB-auth-session /
AC20 amendment) — plus a manual offline operator-use protocol (runbook + `invokeOperatorSession`, caller-assembled
command/deps, deterministic fakes, delivery withheld, no automatic `AthleteDecision`, envelope-only result) —
**without** building any surface, persistence, provider/deployment, or AC20 amendment, and **without** code? **Yes
— via Option A:** a behavioral governance boundary that turns recurring implicit deferral into an explicit,
testable rule, with implementation (if any) deferred to a docs-only `Tech Spec 042A` / **Docs consolidation post
042**. Validation at authorship: `tsc --noEmit` clean; `node --test` 852/852; no code, test, package, runtime,
CLI, deployment, CI, SDK, or dependency change; AC20 untouched.
