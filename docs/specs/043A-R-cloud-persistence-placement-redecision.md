# Aurora — Specification 043A-R — Cloud Persistence Placement Re-decision (Blocker Note)

> **Status (2026-06-30).** Specification / re-decision phase. This is a **docs-only blocker + placement
> re-decision** triggered when **Implementation 043-A1** hit a true architectural blocker. It implements no code,
> adds no infrastructure, edits no package file, amends no guard (AC20 untouched), weakens no guard, and revives
> no `reflection-composition`. The 043-A1 spike was **fully reverted**; the tree is back to the green baseline:
> `tsc --noEmit` clean; `node --test` **852/852**. It supersedes Tech Spec 043A's **placement** decision only
> (the cloud/persistence *direction* of Spec 043 stands); it answers **where** cloud-operator-runtime persistence
> may live before any implementation resumes.

---

## 0. Phase confirmation

This is a **re-decision / blocker note** — not Implementation, and not yet a tech spec for code. It records the
blocker and re-decides placement so a *next safe* mission can be chosen.

---

## 1. What blocker was found

`[FACT]` **Implementation 043-A1** (cloud persistence ports + in-memory repositories) placed, per Tech Spec 043A,
the records + repository ports + in-memory adapters in `src/modules/application-orchestration/application/`
(`training-session-repository.ts` + adapter, `operator-session-run-repository.ts` + adapter,
`operator-session-envelope-record-repository.ts` + adapter, `decision-capture-link-repository.ts` + adapter). The
slice **type-checked and its own tests passed in isolation (19/19)**, but running the full suite revealed a
**pre-existing guard failure** (871 tests, 1 fail). The entire spike was **reverted** (back to 852/852, working
tree clean). **No guard was weakened; no guard was gamed (no rename-to-dodge); AC20 was not touched.**

## 2. Which guard caught it

`[FACT]` `src/modules/application-orchestration/tests/explicit-orchestration-negative-capability.test.ts` →
**"orchestration owns no domain model and no repository (application-only)"**:

```text
for (const f of productionFiles(moduleDir)) {
  const src = readFileSync(f, "utf8");
  assert.equal(/Repository\s*{/.test(src) && /class\s+\w*Repository/.test(src), false,
    `orchestration must define no repository: ${f}`);
}
```

It fails any `application-orchestration` production file that defines a **repository implementation** (an
`in-memory-…-repository.ts` adapter trips both regexes). This encodes the module's own documented invariant —
`application-orchestration/application/index.ts` header: *"An APPLICATION COMPOSITION module… owns no domain
model, **no repository**, and no persistence; it introduces no bounded context."* The same guard file also
forbids creating `src/api`, `src/infrastructure`, `src/db`, `src/database`, `src/migrations`, and any
event-bus/queue/scheduler/retry/workflow/telemetry/provider module.

## 3. Why 043-A1 cannot proceed as planned

`[FACT]` Tech Spec 043A's placement decision (persistence ports in `application-orchestration/application/`)
**directly violates that guarded invariant**. There is a deeper conflict that blocks *any* in-core placement:

- **`application-orchestration` cannot own repositories/persistence** (guarded — §2; by design it is composition-only).
- **AC20a forbids a new top-level production module** beyond the nine allowlisted (`observation`, `reasoning`,
  `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`,
  `application-orchestration`) + `__tests__`.
- The orchestration guard additionally forbids `src/{api,infrastructure,db,database,migrations}`.

→ **There is no AC20-safe home inside the existing `src/modules/` core for cloud-operator-runtime persistence
ports.** 043-A1 as specified is not implementable without either weakening a guard (forbidden) or making a new
architectural decision (out of scope for an Implementation phase). This is a **true blocker**, mirroring the
Spec 034 / Impl 034-A AC20 episode (revert, do not weaken, escalate).

## 4. Why `application-orchestration` is not the persistence owner

`[FACT]` It is, by **explicit design and guard**, a *pure application composition* module: it wires existing
public services over injected collaborators and returns closed results; it owns **no domain model, no repository,
no persistence, and no bounded context**. Persistence of training sessions / operator runs / envelopes is a
**stateful bounded context** — precisely what `application-orchestration` must not absorb. Hosting repositories
there would dissolve the composition/ownership boundary the guard protects (the same boundary that has kept the
runtime, mapper, and helper clean).

## 5. Why `event-recording` is not automatically the right home

`[FACT]` `event-recording` owns a specific bounded context: append-only **domain occurrence events**
(`DomainEventRecord` + its repository). Training-session **metadata**, operator-run records, and
`OperatorSessionEnvelopeRecord` are **not domain events** — they are operational/runtime persistence. Folding
generic operator-runtime persistence into `event-recording` would **stretch its bounded context into a generic
datastore**, eroding exactly the kind of boundary clarity the architecture has guarded throughout. (A genuinely
event-shaped record could later live there, but the §6.4 records of 043A are not that.)

## 6. Why test-only adapters are not enough

`[FACT]` Interface-only port files in `application-orchestration` would technically pass the guard (an
`interface …Repository {}` with no `class …Repository` does not trip it), and the adapters could be pushed into
`__tests__/`. But that **hides an unresolved production-placement decision inside tests**: the cloud worker
(043-A3) and the deployment slice (043-A4) need *production* persistence adapters with a real home. Test-only
adapters would let the slice "pass" while leaving the actual question — where production persistence lives —
unanswered, accreting debt. That is a workaround, not a resolution.

## 7. Why AC20 should not be amended casually

`[FACT]` AC20 is the project's defining invariant ("no layer owns the whole core"), reaffirmed as **inviolable
by default** in Spec 034R after the 034 episode. An AC20 amendment (adding a tenth top-level module) is a
**deliberate, separately-approved** act with a stated risk review — not a convenience to unblock an
implementation slice. A persistence module that imports **zero** core surfaces would not violate AC20b's *spirit*
(AC20b forbids a production file importing **all four** core surfaces), so AC20a (the allowlist) is the only
formal obstacle — but relaxing it still re-opens the boundary and must be an explicit decision, not a side effect.

## 8. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — Keep persistence ports in `application-orchestration` | **Rejected.** Violates the guarded "no repository/persistence" invariant (§2–§4). |
| B — Move them to `event-recording` | **Rejected.** Training-session/operator-run/envelope records are not domain events; this stretches a bounded context into a generic datastore (§5). |
| C — Interface-only ports in `application-orchestration`, adapters test-only | **Rejected.** Hides unresolved production placement in tests (§6); the worker/deployment still need a real home. |
| D — Amend AC20 + add a new persistence/operator-runtime module | **Deferred (not casual).** A *legitimate* eventual candidate (a persistence module importing zero core surfaces is AC20b-clean), but requires an **explicit, separately-approved AC20a amendment** with risk review — not done here (§7). |
| **E — Defer cloud persistence until its home is deliberately decided in a dedicated boundary spec** | **Selected.** Preserves AC20 and every guard; stops before implementation; routes the home decision to its own spec (§9). |
| F — Use existing persistence/event surfaces without expanding bounded context | **Rejected as a home.** No existing surface fits operator-runtime persistence without the §5 bounded-context erosion; "reuse" here would be A or B in disguise. |

## 9. Decision

`[DECISION]` **Pause Implementation 043-A; re-decide persistence placement before any code (Option E).** Cloud
operator-runtime persistence ports **do not have an AC20-safe home inside the current `src/modules/` core**, and
neither `application-orchestration` (guarded composition-only) nor `event-recording` (domain events only) is the
right owner. Therefore **no persistence is implemented now**; the **home decision is escalated to a dedicated
boundary spec** that chooses, with stated trade-offs, between the **two live candidates**:

- **(i) An out-of-`src` deployment/runtime layer** (a repo-root directory *outside* `src/modules/`, like
  `scripts/operator-live-smoke.mjs` lives outside `src`) that owns the persistence adapters + the operator worker
  and **imports only Aurora's public application surface** (`invokeOperatorSession`, `OperatorSessionEnvelope`).
  **AC20-untouched** (nothing new under `src/modules/`); app-orch invariant intact; `event-recording` not
  stretched. *Trade-off:* out-of-`src` TS is not in `tsconfig.include`/the default test glob, so a typecheck/test
  strategy for that layer must be defined (cf. the 027 `operator-live-smoke-entrypoint.ts` in-`src` helper +
  out-of-`src` `.mjs` split).
- **(ii) A separately-approved AC20a amendment** adding **one** persistence/operator-runtime module that owns
  these repositories and **imports zero core surfaces** (AC20b-clean). *Trade-off:* relaxes AC20a (the allowlist)
  — must carry an explicit risk review and its own amendment spec; reaffirms that the module owns persistence
  only, never composes the core.

`[ASSUMPTION]` Until that spec decides, Aurora stays at the **852/852 stable baseline**: the safe invocation chain
(`invokeOperatorSession` → envelope-only) is complete and unchanged; cloud persistence is **deferred**, not
abandoned. The cloud/persistence *direction* of Spec 043 stands; only 043A's *placement* is superseded.

## 10. What the next safe mission should be

`[RECOMMENDATION] Next mission: Spec 043B — Operator Runtime Persistence Home & Boundary.` A behavioral,
docs-only Specification that **chooses the home** (candidate (i) out-of-`src` deployment/runtime layer vs (ii) a
separately-approved AC20a-amendment persistence module), defines how that home is typechecked/tested, fixes which
records it owns (the 043A §6.4 set), and confirms the invariants any home must preserve: imports only Aurora's
**public application surface** (never `offlineReflectionRuntime` directly, never upstream core), runs sessions
**only behind `invokeOperatorSession`**, persists **only** `OperatorSessionEnvelope` (never the raw outcome),
keeps deterministic fakes by default / delivery withheld / no automatic `AthleteDecision`, and either **preserves
AC20** ((i)) or **amends AC20a explicitly with risk review** ((ii)). **Tech Spec 043B-A** and implementation
follow only after the home is decided. (If the maintainer prefers, the re-decision could instead be folded into a
revised **Tech Spec 043A-R2**, but a fresh boundary spec is cleaner given AC20 is in scope.)

`[FACT]` Forbidden until 043B decides: keeping persistence in `application-orchestration`; placing it in
`event-recording`; test-only adapters as a stand-in for production; a casual AC20 amendment; a new core module; any
implementation code, migration, IaC, Dockerfile, package change, provider/live, or delivery.

---

## 11. Relationship To Existing Architecture

- **Spec 043 / Tech Spec 043A** — the cloud/persistence *direction* + slicing stand; 043A's *placement* (ports in
  `application-orchestration`) is **superseded** by this note.
- **`explicit-orchestration-negative-capability` guard** — the invariant that caught the blocker (app-orch owns no
  repository/persistence); **unchanged**.
- **AC20 / Spec 034R** — inviolable by default; an amendment (candidate (ii)) is a separate, explicit decision.
- **Spec 041 / 040 / 038** — `invokeOperatorSession`, `OperatorSessionEnvelope`, the runbook: any future home runs
  behind the helper and persists only the envelope.
- **Spec 042** — the persistence + provider/deployment lanes remain *entered* (the evidence is real); only the
  *home* is being re-decided.

## 12. Validation & invariants at this note

`tsc --noEmit` clean; `node --test` **852/852** (spike fully reverted). AC20 unchanged; no guard weakened or
gamed; `application-orchestration` remains composition-only (no repository/persistence); `event-recording`
unchanged; no new top-level module; no `src/{api,infrastructure,db,database,migrations}`; no code/test/package/
dependency change introduced by this note. The cloud persistence home is **deferred to Spec 043B**.

```text
true blocker ≠ weaken a guard · revert ≠ abandon · app-orch ≠ persistence owner · event-recording ≠ generic datastore ·
test-only adapter ≠ production home · AC20 amendment ≠ casual unblock · deferred persistence ≠ dropped direction ·
any future home runs behind invokeOperatorSession and persists only OperatorSessionEnvelope ·
Aurora advises; the athlete decides.
```
