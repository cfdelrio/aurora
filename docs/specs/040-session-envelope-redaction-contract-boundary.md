# Aurora — Specification 040 — Session Envelope / Redaction Contract Boundary

> **Status (2026-06-29).** Specification phase. This document defines the **behavioral contract** for a *safe
> session envelope* and its **redaction rules** — the stable contract a future operator invocation helper / CLI /
> API / caller must depend on — the continuation selected by the post-039 roadmap checkpoint (`dbc3e00`). It is
> **behavioral-only**: it implements no code, writes no technical spec, modifies no production code/test, creates
> no production type/helper/wrapper, creates no CLI/runtime shell/script/package command, edits no package file,
> adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20 untouched), and creates no
> production whole-core composer. Recent sequence: `cba9ec4` (Impl 039-A) → `bfb9c98` (Docs) → `dbc3e00` (Roadmap
> checkpoint post-039). Validation at authorship: `tsc --noEmit` clean; `node --test` 810/810.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It defines a behavioral
contract (the safe session envelope + redaction rules); it adds no code and **creates no production type**.

---

## 1. Context

`[FACT]` Impl 039-A proved a thin operator invocation seam test-only, narrowing the runtime outcome to a **local**
reference-only envelope (`OperatorInvocationResult`, defined *inside* the test): `{ status:
OfflineReflectionStatus; deliveryWithheld: true; rawRetained: false; reflectionRef?: string; decisionCapture:
{ kind: "athlete-decision-invitation"; athleteRef; acceptableSources }; admissionReason?: string; safeReason?:
string; traceSummary: { stoppedAt; renderedMessageRecordId?; displayEligibility? } }`. It proved the shape is
*possible* and that the always-excluded set (raw provider output, hidden reasoning, secret material, delivery
artifact, `AthleteDecision`) can be enforced.

`[FACT]` The runtime already returns a **safe, redacted-by-design** `OfflineReflectionRuntimeOutcome`: `{ status:
OfflineReflectionStatus; reflection?: SafeReflectionProjection; deliveryWithheld: true; mediation: { operatorRef };
decisionCapture: DecisionCapturePrompt; intake: { status }; admissionReason?: ExternalRenderableRejectionReason;
trace: OrchestrationTrace; rawRetained: false }`. `OrchestrationTrace` is **all ref ids / safe codes** (`stoppedAt`,
`providerAttemptRecordId?`, `renderedMessageRecordId?`, `renderReviewId?`, `displayEligibility?`,
`deliveryRequestId?`, `deliveryRecordId?`, `eventRecordIds?`, `reasonCode?`). `SafeReflectionProjection` carries
the validated `text` (display-eligible product phrasing) + flags.

`[GAP]` What is missing is a **stable contract**: the 039-A envelope is a **local test type**, free to drift. No
production helper, CLI, API, or caller can safely depend on it until the **safe envelope fields + redaction rules
+ per-disposition mapping** are fixed as a **named behavioral contract**. Spec 040 fixes that contract — so a
future helper (Spec 041, only if a caller appears) is a thin, import-safe carrier of a *stable* shape rather than
a re-invented redaction.

---

## 2. Central Question

> What session result information may be exposed to a future operator invocation helper/caller, what must always
> be redacted or excluded, how do runtime dispositions map into the envelope, and how does the envelope preserve
> no-default-live-call, delivery-withheld, athlete decision ownership, and AC20?

The contract must keep these distinctions legible (never collapse):

```text
safe envelope ≠ raw runtime dump · safe envelope ≠ rendered message persistence · safe envelope ≠ delivery artifact ·
safe envelope ≠ provider output · safe envelope ≠ hidden reasoning · safe envelope ≠ secret material ·
safe envelope ≠ AthleteDecision · safe envelope ≠ recommendation quality proof · safe envelope ≠ truth proof
```

---

## 3. Product Thesis Alignment

*Aurora advises; the athlete decides. Aurora never presents inference as fact. Aurora is not a dashboard. Aurora
is not an AI coach. Aurora is not "selling AI."*

The envelope must **not** turn an operational result into truth, delivery, a decision, or recommendation quality.
It is a safe, reference-only report of a withheld session — nothing more.

---

## 4. Required Analysis (grounded in the real code; no invented type names)

1. **What the runtime outcome contains today.** The `OfflineReflectionRuntimeOutcome` (§1) — already
   redacted-by-design (`rawRetained: false`, ref-only `trace`, `SafeReflectionProjection`, safe `intake.status` /
   `admissionReason`).
2. **Which fields are safe to expose directly.** `status`, `deliveryWithheld` (always `true`), `rawRetained`
   (always `false`), `decisionCapture` (already an invitation/ref), `admissionReason?` (closed code), `intake.status`
   (safe summary), `mediation.operatorRef` (operational marker, not decision ownership).
3. **Which fields must be narrowed.** `trace` (full `OrchestrationTrace` → a **ref-only `traceSummary`** subset);
   `reflection` (`SafeReflectionProjection` → a **`reflectionRef`** / safe flags, **not** the `text`); any failure
   detail → a **safe closed code** (`safeReason` from `trace.reasonCode`).
4. **Which fields must never be exposed.** Raw provider output / raw rendered draft (the runtime never returns
   these anyway), hidden reasoning, secret material (`ProviderSecretRef` value), `process.env` values, delivery
   artifact (`deliveryRecordId`/`deliveryRequestId` are always absent — and excluded from the envelope), any
   `AthleteDecision` shape, and any raw exception/stack.
5. **What the local 039-A envelope proved.** That the narrowing is feasible and the excludes are enforceable
   (field checks + JSON banned-substring scan) across every disposition.
6. **What remains unstable because it is local/test-only.** The envelope's **field set, names, and redaction
   rules** — currently a local test type with no contract; any future surface would re-invent them and risk drift.
7. **What fields a stable envelope should contain.** §6 (Required Envelope Contract).
8. **What fields a stable envelope must exclude.** §8 (Required Redaction Rules) — always-excluded set.
9. **How each runtime status maps to envelope disposition.** §7 (Required Disposition Mapping) — exact
   `OfflineReflectionStatus` values, no rename.
10. **How `trace` should be summarized safely.** A **whitelisted ref-only subset**: `stoppedAt`,
    `renderedMessageRecordId?`, `displayEligibility?` (and optionally `reasonCode?` as `safeReason`). **Never** the
    delivery ids or event ids exposed as artifacts.
11. **How `reflection` should be referenced safely.** A `reflectionRef` (e.g. `trace.renderedMessageRecordId`) +
    safe boolean flags (`validationPassed`, `uncertaintyPreserved`, …) **only** — **never** `reflection.text`
    (which could be confused with a delivered artifact).
12. **How `decisionCapture` should be represented safely.** Verbatim as the invitation/ref
    (`{ kind: "athlete-decision-invitation", athleteRef, acceptableSources }`) — never an `AthleteDecision`.
13. **How `admissionReason` / `safeReason` should be represented.** Closed safe codes only
    (`ExternalRenderableRejectionReason` / `trace.reasonCode`), never raw text.
14. **How `rawRetained` must behave.** Always `false`, re-asserted on the envelope.
15. **How `deliveryWithheld` must behave.** Always `true`; no delivery ids exposed. Delivery withheld ≠ failure.
16. **How no-live-provider default is represented.** The envelope reflects a session run with deterministic deps;
    it carries no provider/live marker and no secret — a live call would be a separate, gated, opt-in concern.
17. **How no-delivery default is represented.** `deliveryWithheld: true` + the absence of any delivery artifact.
18. **How later decision capture remains separate.** The envelope carries only the `decisionCapture` invitation/
    ref; a captured `AthleteDecision` is produced by the separate Impl 037-A flow and **never** appears here.
19. **Whether a production type is needed now or later.** **Later** — this spec fixes the *behavioral* contract;
    a production type/helper is deferred to a future tech spec, warranted only if a real caller appears.
20. **What remains outside scope.** A production type/helper/wrapper, a CLI/script/package command, an API/UI,
    deployment/provider/DB/auth/CI/SDK, live-provider enablement, real delivery, **envelope persistence**, and the
    observation→renderable production composition (034R: caller-supplied / test harness).

`[FACT]` Decisive consequence: the runtime outcome is already safe; the contract's job is to fix a **stable,
whitelisted, reference-only projection** of it (and the redaction rules) so future surfaces share one safe shape
instead of re-deriving it. The substance is the **contract**, not any helper that would carry it.

---

## 5. Decision Framework & Options

Evaluated on: redaction safety · caller usability · future helper compatibility · least irreversible commitment ·
AC20 preservation · no-default-live-call preservation · delivery-withheld preservation · athlete decision
ownership · fake-testability · no premature production surface · no DB/auth/CI/deployment dependency.

| Option | Verdict |
| --- | --- |
| **A — Behavioral envelope contract only; no production type yet** | **Selected (core).** Fixes the stable safe-envelope + redaction contract; ships no code; least irreversible; AC20-safe; fully fake-testable. |
| **B — A stable production envelope type in a future tech spec** | **Adopted as direction (deferred).** A production type/helper is warranted **only if a real caller appears**; deferred to `Tech Spec 040A` / a later slice. |
| C — Keep the envelope local/test-only indefinitely | **Rejected.** A future caller/helper needs a stable, shared contract; leaving it local invites drift. |
| D — Expose the raw `OfflineReflectionRuntimeOutcome` to future callers | **Rejected.** Too broad/unstable as an external seam; couples callers to internal fields. |
| E — Include reflection text / provider output in the envelope | **Rejected.** Risks unsafe disclosure and delivery confusion (`reflection.text` ≠ a delivered artifact). |
| F — Include an `AthleteDecision` in the envelope | **Rejected.** Decision capture stays a separate flow; the envelope carries only the invitation/ref. |
| G — Treat the envelope as a persisted session record | **Rejected.** Persistence is a deferred, separate boundary. |
| H — Defer the envelope contract | **Rejected.** 039-A proved enough to define the contract now. |

---

## 6. Decision

`[DECISION]` **Session envelope / redaction contract = a behavioral contract (Option A) with a production type
deferred (Option B).** A future operator invocation surface must expose a **stable, whitelisted, reference-only
envelope** that **preserves** the exact runtime disposition, `deliveryWithheld: true`, `rawRetained: false`, safe
refs/reason codes, and a redacted trace summary, while **always excluding** raw provider output, hidden reasoning,
secret material, delivery artifacts, and any `AthleteDecision`. A production type/helper remains **deferred** to a
future tech spec, warranted only if a real caller needs the shipped envelope.

**Which fields are safe (exposed directly).** `status`, `deliveryWithheld` (`true`), `rawRetained` (`false`),
`decisionCapture` (invitation/ref), `admissionReason?` (closed code), `intake.status` (safe summary),
`mediation.operatorRef` (operational marker, not ownership).

**Which fields are narrowed.** `trace` → a ref-only `traceSummary` (`stoppedAt`, `renderedMessageRecordId?`,
`displayEligibility?`); `reflection` → `reflectionRef` + safe flags (never `text`); failure detail → `safeReason`
(closed code from `trace.reasonCode`).

**Which fields are always excluded.** Raw provider output, raw rendered draft, hidden reasoning, secret material /
`process.env` values, delivery artifact ids, any `AthleteDecision` shape, raw exception/stack, and any raw runtime
internal not explicitly whitelisted.

**How dispositions map.** Exact `OfflineReflectionStatus` values, no rename (§7).

**How `reflection-ready` is represented.** `status: "reflection-ready"`, `deliveryWithheld: true`,
`rawRetained: false`, a `reflectionRef` + safe flags (no `text`), `decisionCapture` invitation/ref;
`traceSummary` with `renderedMessageRecordId`.

**How `renderable-inadmissible` is represented.** `status` + `admissionReason` (safe code) +
`traceSummary.stoppedAt: "stopped"`; no `reflectionRef`; no provider/render/validate/delivery/decision artifact.

**How `not-rendered` is represented.** `status` + optional `safeReason` (closed code); no `reflectionRef`; no raw
provider output; no delivery artifact.

**How `input-rejected` is represented.** `status` + `intake.status`; no admission/rendering artifact; no
`reflectionRef`.

**How `recording-failed` / `unexpected-failure` are represented.** `status` + a `safeReason` closed code only —
**no** raw exception/stack, secrets, provider output, or hidden reasoning.

**How `deliveryWithheld` is preserved.** Always `true`; no delivery ids in the envelope.

**How `rawRetained: false` is enforced.** Always `false` on the envelope; the whitelist guarantees no raw content.

**How `decisionCapture` remains invitation/ref only.** Verbatim `{ kind, athleteRef, acceptableSources }`; never a
decision.

**Why `AthleteDecision` remains separate.** Decision capture is the explicit Impl 037-A flow, post-session; the
envelope is a session report, not a decision record.

**Why this is not persistence.** The envelope is a transient, in-memory safe projection; persistence is a
deferred, separate boundary (no repository/DB/record introduced).

**Why this is not CLI/API/deployment/helper implementation.** This spec fixes a *contract*; no type, helper,
transport, or surface is built — those are deferred and must sit behind the contract.

**What the next technical spec must decide.** Whether the contract is realized as a **production type** or stays
**test-fixtured** first; the exact type name + module placement (if any); the exact mapping from
`OfflineReflectionRuntimeOutcome`; whether redaction utilities are needed; how to test whitelist exposure; how to
represent `reflectionRef` without exposing a delivery artifact; and whether a future helper wraps the runtime or
only normalizes its outcome. (`Tech Spec 040A`.)

`[ASSUMPTION]` The headline: **039-A proved a safe envelope is possible; Spec 040 fixes it as a stable
whitelisted reference-only contract** — exact disposition, `deliveryWithheld`, `rawRetained: false`, refs/codes,
redacted trace summary; always excluding raw output / hidden reasoning / secrets / delivery artifact /
`AthleteDecision` — so any future helper/CLI/API/caller carries one safe shape instead of re-inventing redaction.

---

## 7. Required Disposition Mapping

For each exact `OfflineReflectionStatus`:

| Disposition | Safe fields exposed | reason code | trace summary | reflectionRef | decisionCapture | deliveryWithheld | rawRetained | Must exclude | Operator interpretation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **reflection-ready** | status, intake.status, mediation marker | — | `stoppedAt` + `renderedMessageRecordId` (+ `displayEligibility?`) | **yes** (ref + safe flags, no text) | invitation/ref | `true` | `false` | reflection text, raw output, delivery artifact, `AthleteDecision` | a validated, **withheld** reflection exists; review manually; invite (never create) a decision |
| **renderable-inadmissible** | status, `admissionReason` | safe `admissionReason` | `stoppedAt: "stopped"` | no | invitation/ref | `true` | `false` | provider/render/validate/delivery/decision artifacts | stop; do not strip safety to force admission |
| **not-rendered** | status | `safeReason?` (closed) | `stoppedAt` (+ safe code) | no | invitation/ref | `true` | `false` | raw provider output, invalid draft, delivery artifact | stop/revise; provider output is not safe; no delivery |
| **input-rejected** | status, `intake.status` | — | `stoppedAt` (pre-admission) | no | invitation/ref | `true` | `false` | admission/rendering artifacts | correct the athlete manual input; do not proceed |
| **recording-failed** | status | `safeReason?` (closed) | `stoppedAt` (+ safe code) | no | invitation/ref | `true` | `false` | raw exception/stack, secrets, output, reasoning | safe stop; nothing delivered or decided |
| **unexpected-failure** | status | `safeReason?` (closed) | `stoppedAt` (+ safe code) | no | invitation/ref | `true` | `false` | raw exception/stack, secrets, output, reasoning | safe stop; nothing delivered or decided |

---

## 8. Required Redaction Rules

The contract must require:

```text
WHITELIST exposure, not blacklist exposure · reference-only by default · safe CODE over raw text where possible ·
safe SUMMARY over raw trace where possible · no secrets ever · no raw provider output ever · no hidden reasoning ever ·
no delivery artifact ever · no AthleteDecision ever · no field that implies delivery or decision ownership
```

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Reflection-ready envelope.** *Given* a `reflection-ready` outcome, *when* enveloped, *then* it exposes
disposition, `deliveryWithheld`, `rawRetained: false`, a safe reflection ref/summary, and the decision-capture
invitation/ref — but **no** reflection text, raw provider output, delivery artifact, or `AthleteDecision`.

**UC2 — Inadmissible envelope.** *Given* `renderable-inadmissible`, *when* enveloped, *then* it exposes
`admissionReason`/`safeReason` and trace summary only — **no** provider/render/validate/delivery/decision artifacts.

**UC3 — Not-rendered envelope.** *Given* `not-rendered`, *when* enveloped, *then* it exposes a safe failure
disposition/reason and **no** raw provider output or invalid draft.

**UC4 — Input-rejected envelope.** *Given* `input-rejected`, *when* enveloped, *then* it exposes a safe intake
status/code and **no** admission/rendering artifacts.

**UC5 — Recording/unexpected failure.** *Given* `recording-failed` or `unexpected-failure`, *when* enveloped,
*then* it exposes a safe failure code only — **no** raw exception stack, secrets, provider output, or hidden
reasoning.

**UC6 — Later athlete decision.** *Given* an envelope carries a decision-capture invitation/ref, *when* the
athlete later declares/reports a decision, *then* capture occurs in a **separate** flow and the envelope itself
still contains **no** `AthleteDecision`.

**UC7 — Future helper.** *Given* a future helper implements the envelope, *when* it returns a result, *then* it
**must** use whitelist mapping and preserve the no-live / no-delivery / no-decision guarantees.

**UC8 — Persistence.** *Given* an envelope is produced, *when* persistence is considered, *then* the envelope is
**not** automatically a persisted session record.

---

## 10. Required Acceptance Criteria (Given / When / Then)

- A safe envelope is not a raw runtime dump. ✅
- Status/disposition is preserved (exact `OfflineReflectionStatus`). ✅
- `deliveryWithheld` is preserved (`true`). ✅
- `rawRetained` is `false`. ✅
- Reflection text is excluded. ✅
- Raw provider output is excluded. ✅
- Hidden reasoning is excluded. ✅
- Secrets are excluded. ✅
- Delivery artifact is excluded. ✅
- `AthleteDecision` is excluded. ✅
- `decisionCapture` is invitation/ref only. ✅
- Later decision capture remains separate. ✅
- Admission success is not truth. ✅
- `validateDraft` success is not recommendation quality. ✅
- `reflection-ready` is not delivered. ✅
- The envelope is not a persistence record. ✅
- No production type/helper is added by this spec (docs-only). ✅
- AC20 remains unchanged. ✅
- All existing tests remain green (810/810). ✅

---

## 11. Relationship To Existing Architecture

- **Spec 039 / Impl 039-A** — the invocation seam + local envelope proof; this spec fixes that envelope as a
  stable contract.
- **Spec 038 / Impl 038-A** — the runbook the seam invokes; the envelope reports its dispositions.
- **Spec 037 / Impl 037-A** — post-reflection decision capture stays a **separate** flow; the envelope carries
  only the invitation/ref.
- **Spec 036 / Impl 036-A** — the session path whose outcome the envelope narrows.
- **Spec 035 / Impl 035-A/B** — admission; `admissionReason` is a safe closed code in the envelope.
- **Impl 032R-A** — `offlineReflectionRuntime`, whose already-safe `OfflineReflectionRuntimeOutcome` the envelope
  projects.
- **Impl 014** — `validateDraft`; the envelope's `reflection-ready` ≠ recommendation quality.
- **Impl 027** — operator live smoke stays operational; the envelope is a session report, not a smoke result.
- **Spec 034R / AC20** — whole-core composition stays a test harness; the contract owns no core.

---

## 12. Forbidden Behaviors

```text
implementation code · technical implementation plan · production type creation · helper/wrapper creation ·
CLI/runtime shell creation · script creation · package script changes · API/UI creation · deployment/CI files ·
DB/schema/migrations · auth/session/user implementation · SDK/dependency changes · AC20 amendment ·
reflection-composition module · production whole-core composer · automatic live call · automatic real-secret resolution ·
automatic delivery · automatic AthleteDecision creation · raw provider output in envelope · hidden reasoning in envelope ·
secret material in envelope · delivery artifact in envelope · AthleteDecision in envelope ·
raw reflection text if it can be confused with a delivered artifact · raw exception stack in envelope ·
envelope treated as a persisted record
```

---

## 13. Open Questions For Tech Spec 040A

1. Exact production type name if selected.
2. Exact module placement if a type/helper is selected.
3. Whether implementation is test-only first or application-level.
4. Exact mapping from `OfflineReflectionRuntimeOutcome` to the envelope.
5. Whether redaction utilities already exist or need to be created.
6. How to test whitelist exposure.
7. How to represent the trace summary.
8. How to represent the reflection ref without exposing a delivery artifact.
9. How to represent unexpected errors safely.
10. Whether a future helper should wrap the runtime or only normalize the outcome.
11. When a CLI/API should be considered.
12. Whether envelope persistence is ever needed.

---

## 14. Success Criteria

Can Aurora fix a **stable safe session envelope + redaction contract** — exposing only whitelisted, reference-only
fields (exact disposition, `deliveryWithheld`, `rawRetained: false`, `reflectionRef?` + safe flags,
decision-capture invitation/ref, `admissionReason?`, `safeReason?`, ref-only trace summary) and always excluding
raw provider output / hidden reasoning / secrets / delivery artifact / `AthleteDecision` — with a per-disposition
mapping that preserves no-default-live-call, delivery-withheld, and athlete-decision-ownership, **without** a
production type/helper, CLI/script/package command, API/UI, persistence, deployment/provider decision, a
production whole-core composer, or an AC20 amendment? **Yes — via Option A (with B deferred):** a behavioral
envelope/redaction contract over the already-safe runtime outcome, with the production type/helper deferred to
`Tech Spec 040A` / a later slice. Validation at authorship: `tsc --noEmit` clean; `node --test` 810/810; no code,
test, package, runtime, CLI, deployment, CI, SDK, or dependency change; AC20 untouched.
