# Aurora — Roadmap Status Checkpoint (post Specification 042)

> **Status (2026-06-30).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no runtime/API/UI/CLI/worker/deployment/CI/SDK file, no guard weakened, AC20 untouched.
> It reviews Aurora's architectural state after the **real-caller / operator-use governance gate** (Spec 042) and
> recommends the next state. Validation at authorship: `tsc --noEmit` clean; `node --test` **852/852**. Prior
> checkpoints: `...POST_035/037/038/039/040/041`.

---

## 1. The arc just closed (Spec 042)

```text
Roadmap checkpoint post-041 → Spec 042 (real caller / operator use protocol — explicit per-lane evidence gate)
→ Docs consolidation post-042
```

`[FACT]` The full **product-edge arc is complete and governed**: the reasoning core (Impl 001–029), the offline
runtime (032R-A), the enforced three-tier admission (035-A/B), the session/runbook/capture proofs (036-A/037-A/
038-A, test-only + docs checklist), the thin invocation seam (039-A, test-only), the session
envelope/redaction contract realized in production (040-A), the production invocation helper (041-A,
`invokeOperatorSession`), and now an **explicit per-lane evidence gate** (042) that governs whether Aurora may
grow any caller surface. There is **no open required-work item** that does not cross either the §042 caller gate
or AC20.

---

## 2. Current architectural state

### 2.1 What is now complete
- The **safe invocation chain** end to end: caller-assembled command/deps → `invokeOperatorSession` →
  `offlineReflectionRuntime` (admission-gated, `validateDraft` downstream, delivery withheld) →
  `toOperatorSessionEnvelope` → `OperatorSessionEnvelope` only. **And** the governance gate (042) that decides if/
  when it may be wrapped in a surface.

### 2.2 What is production code
- The reasoning kernel + rendering/delivery/event-recording/application-orchestration; `offlineReflectionRuntime`
  (032R-A); `admitExternalRenderable` (035-A/B); `toOperatorSessionEnvelope` + `OperatorSessionEnvelope` (040-A);
  `invokeOperatorSession` (041-A).

### 2.3 What remains test-only
- The whole-core composition (AC20 — `__tests__/` only); the first session (036-A), decision-capture loop
  (037-A), runbook proof (038-A), and thin invocation seam (039-A).

### 2.4 What remains docs-only
- The operator runbook checklist (038-A) and the real-caller / operator-use protocol gate (042).

### 2.5 What the real-caller gate now governs
- Whether Aurora may build a CLI/script/package command, API/UI/operator tool, persistence/event integration,
  provider/deployment lane (reopen 030/031), live-provider, delivery channel, DB/auth/session, or an AC20
  amendment — each unlocked **only** by its own concrete, recurring, demonstrated evidence (§042 §7).

### 2.6 What lanes are blocked by missing evidence
- **All of them.** No real caller exists; no new deployment/provider evidence; no retention/audit need; no live/
  delivery requirement. Every lane is currently **deferred** by the gate.

### 2.7 What operator use looks like today
- Manual, offline, runbook-driven, behind `invokeOperatorSession`: assemble command + `RenderingRequest`, inject
  deterministic fakes, call the helper, receive **only** the envelope, review manually; delivery withheld; no
  automatic `AthleteDecision`; later decision capture separate + athlete-declared/reported.

### 2.8 What `invokeOperatorSession` enables
- A single safe production handle to run the session once and obtain **only** the redacted
  `OperatorSessionEnvelope` — making the raw `OfflineReflectionRuntimeOutcome` structurally unreachable.

### 2.9 What `OperatorSessionEnvelope` guarantees
- A whitelisted, reference-only projection (exact status, `deliveryWithheld`, `rawRetained: false`,
  `reflectionRef?`+flags never the text, decision-capture invitation/ref, safe codes, ref-only trace summary) —
  excluding raw output / hidden reasoning / secrets / delivery ids / `eventRecordIds` / `AthleteDecision` / stack.

### 2.10 What AC20 still forbids
- **AC20a:** any new top-level production module beyond the nine allowlisted + `__tests__`.
- **AC20b:** any **production** file importing all four core surfaces — *"no layer owns the whole core."*

### 2.11 What 034R decided
- Spec 034R **superseded** Spec 034 Option C: whole-core production composition stays **caller-supplied / a test
  harness**; the production runtime receives a caller-assembled `RenderingRequest`; **AC20 is inviolable**.

### 2.12 Why old Spec 034 Option C must not be revived
- It proposed a production `reflection-composition` module composing all four core surfaces — a direct **AC20b
  violation** (proven by the reverted Impl 034-A spike). 034R closed it; AC20 remains *vigente*. Any future
  observation→renderable ergonomics must be a **new, AC20-safe** boundary (caller assembles; no production
  whole-core composer), **not** a resurrection of 034 Option C.

### 2.13 Whether any non-surface, AC20-safe core boundary remains genuinely valuable
- **Conceivably one:** an *AC20-safe caller-assembly ergonomics* boundary that reduces the operator's manual
  `RenderingRequest` assembly **without** production whole-core composition (i.e. small, composable, per-stage
  helpers the caller wires — never one production file owning the core). **But there is no evidence it is needed
  now:** the runbook + `renderableFromTerminalOutput` (in the test harness) already make assembly tractable, and
  without a real caller the ergonomics burden is hypothetical. It is a *candidate to surface from a future
  checkpoint if a real caller appears*, not a required next step.

### 2.14 Whether stable/hold is the honest next state
- **Yes.** The arc is complete and governed; every remaining lane is gated on evidence that does not yet exist;
  the one conceivable core boundary (§2.13) lacks a driving need. The honest, disciplined next state is a
  **deliberate hold with explicit, documented re-entry triggers** (already enumerated by §042 §7) — not a
  manufactured next build.

---

## 3. Options

| Option | Verdict |
| --- | --- |
| **B — Roadmap pause / stable-hold with explicit re-entry triggers from Spec 042** | **Selected.** Honest, disciplined, durable: the arc is complete and governed; re-entry is already defined per-lane by §042 §7. Makes the hold explicit rather than implicit. |
| A — Stable / hold until real-caller evidence appears | **Adopted within B** — B is A made explicit (it names the re-entry triggers + reading list), so it strictly dominates a bare hold. |
| C — New AC20-safe caller-assembly ergonomics boundary | **Deferred (not rejected).** Only worth specifying if a real caller / repeated manual assembly burden appears; today it lacks driving evidence. If ever taken, it must be a NEW AC20-safe boundary (caller assembles; no production whole-core composer), explicitly **not** old Spec 034. |
| D — Reopen old Spec 034 / reflection-composition | **Rejected.** Superseded by 034R; AC20 *vigente*; reviving it re-introduces the AC20b violation. |
| E — CLI/script boundary | **Rejected.** No §042 CLI-lane evidence (repeated/error-prone local operation). |
| F — API/UI/operator tool boundary | **Rejected.** No §042 API/UI-lane evidence (identified remote/sessionful caller). |
| G — Persistence/event integration | **Rejected.** No §042 persistence-lane evidence (retention/audit/multi-session/handoff). |
| H — Provider/deployment reopen (030/031) | **Rejected.** No new deployment/provider evidence. |
| I — AC20 amendment / production whole-core composition | **Rejected.** No proven need beyond caller assembly + the helper; AC20 inviolable. |

---

## 4. Recommendation

`[RECOMMENDATION] Next mission: Stable / hold until real-caller evidence appears, with re-entry governed by Spec 042.`

- **Current confirmed state.** The reasoning core + the safe product edge (runtime → admission → validateDraft →
  reflection-ready/withheld → envelope → helper) are **complete in production**; the session/capture/runbook proofs
  are test-only; the caller gate (042) is in place. **852/852**; `tsc --noEmit` clean; AC20 intact. **No real
  caller, no surface, no deployment/provider/persistence.**
- **Why stable/hold is appropriate.** Every remaining lane is gated on evidence that does not exist; the one
  conceivable non-surface boundary (AC20-safe caller-assembly ergonomics) lacks a driving need; manufacturing a
  build now would violate the very discipline Spec 042 codified. The honest next state is a **deliberate, explicit
  hold** whose re-entry conditions are already written down (042 §7).
- **Why surface lanes are deferred.** CLI/API/UI/persistence/provider/deployment/live/delivery each fail their
  §042 §7 evidence threshold today (no real caller, no new deployment/provider/retention/live/delivery evidence).
- **Why old Spec 034 is not pending.** 034 Option C was **superseded by 034R**; it required a production
  whole-core composer that violates **AC20b** (the reverted 034-A spike proved this). AC20 remains *vigente*. Any
  future observation→renderable ergonomics must be a **new AC20-safe boundary**, never a revival of 034.
- **Which evidence would restart work (per lane, from 042 §7).**
  - *CLI/script* ← repeated, error-prone manual local sessions (offline, behind the helper, no deployment).
  - *API/UI* ← an identified user/caller needing remote/sessionful interaction, with explicit auth/session/
    deployment requirements.
  - *Persistence/event* ← a proven retention / audit / multi-session / handoff / decision-linking need the
    in-memory + test harnesses cannot meet.
  - *Provider/deployment (030/031)* ← a selected/constrained deployment target or runtime surface; live calls
    required by real use; a secret source required by deployment.
  - *Live-provider* ← explicit opt-in need; fake insufficient for target use; configured secret source; cost/
    failure/privacy understood; safe fallback defined.
  - *Delivery* ← a selected, athlete-consented channel with review/approval + failure semantics.
  - *AC20 amendment* ← a proven product need caller assembly + the helper cannot satisfy, with a risk review + a
    separate amendment spec.
  - *AC20-safe caller-assembly ergonomics (Option C)* ← a real caller + repeated manual assembly burden, framed
    as a new AC20-safe boundary (not Spec 034).
- **What files/specs to read before restarting.** This checkpoint;
  `042-real-caller-operator-use-protocol-boundary.md` (the gate + §7 thresholds);
  `041-...` + `operator-session-invocation.ts`; `040-...` + `operator-session-envelope.ts`;
  `038-...` + `docs/runbooks/operator-session-runbook.md`; `034R-...-ac20-redecision.md`; and the AC20 guard test
  `src/modules/__tests__/end-to-end-responsible-reflection.test.ts`.
- **What risks must remain protected during the hold.** AC20 intact (no production whole-core composer; no
  `reflection-composition` revival; no top-level module sprawl); no-default-live-call; delivery-withheld; athlete
  sole decision owner (`decisionCapture invitation/ref ≠ AthleteDecision`); any future surface sits **behind**
  `invokeOperatorSession` and receives **only** the envelope; no premature deployment/provider/DB/auth/CI/SDK; no
  CLI/script/package without §042 evidence.

`[ASSUMPTION]` The headline: **Aurora's safe reflection product edge is complete and governed; the disciplined
next state is a deliberate hold, not another build.** Work resumes only when a lane's §042 evidence threshold is
met — at which point that lane gets its own spec (and any observation→renderable ergonomics would be a *new*
AC20-safe boundary, never a revival of Spec 034). Until then: manual, offline, behind `invokeOperatorSession`,
envelope-only. *Aurora advises; the athlete decides.*

---

## 5. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **852/852**. AC20 unchanged; whole-core composition remains a test harness;
Spec 034 Option C **superseded (034R)**; Tech Spec 034A on hold; no production whole-core composer; no
`reflection-composition` module; `offlineReflectionRuntime` unchanged and admission-gated; `validateDraft`
mandatory downstream; delivery withheld; no `AthleteDecision` auto-created; decision capture explicit
athlete-declared/reported only; the session envelope/redaction contract is a production pure mapper + type;
`invokeOperatorSession` returns only the envelope; **the real-caller gate (042) governs all surface/integration
lanes; no real caller exists; the roadmap is on a deliberate, explicit hold**; no package/dependency/runtime/API/
UI/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
```text
stable/hold ≠ abandonment · explicit hold ≠ implicit drift · re-entry by evidence ≠ re-entry by inertia ·
new AC20-safe boundary ≠ revived Spec 034 · invokeOperatorSession seam ≠ product surface ·
OperatorSessionEnvelope ≠ raw runtime outcome · reflection-ready ≠ delivered ≠ AthleteDecision ·
deliveryWithheld ≠ delivery failure · AC20 seam ≠ whole-core composer · Aurora advises; the athlete decides;
Aurora never presents inference as fact.
```
