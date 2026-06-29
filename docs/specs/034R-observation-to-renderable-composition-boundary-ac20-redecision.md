# Aurora — Specification 034R — Observation-to-Renderable Composition Boundary (AC20-Respecting Re-decision)

> **Status (2026-06-29).** Specification phase. This document **supersedes** the selected Option C of Spec 034
> (`09e4487`) after Implementation 034-A surfaced the **AC20** blocker (`68029b9`). It re-decides the
> observation-to-renderable boundary **under AC20, without amending AC20**. It is **behavioral-only**: it
> implements no code, writes no technical spec, amends no guard, reintroduces no `reflection-composition`
> module, approves no split workaround, and modifies no production code/test/package. Recent sequence:
> `52a93f4` (Impl 032R-A) → `a4f8302` (Docs post 032R-A) → `09e4487` (Spec 034) → `7ba0818` (Tech Spec 034A)
> → `68029b9` (AC20 blocker record). Validation at authorship: `tsc --noEmit` clean; `node --test` 737/737.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document **re-decides** the Spec 034 boundary under AC20. It writes no code, amends no guard,
  and authorizes no implementation by itself.
- `[DECISION]` AC20 is treated as **inviolable** here; the re-decision must fit AC20, not the reverse.

---

## 1. Context

`[FACT]` Spec 034 selected **Option C** — a new production `reflection-composition` module composing all four
core surfaces. Implementation 034-A attempted it and was **stopped and reverted** (tree green, 737/737)
because it violates **AC20** — the defining acceptance criterion enforced by
`src/modules/__tests__/end-to-end-responsible-reflection.test.ts`:

```text
AC20a — no new top-level module beyond the nine allowlisted (observation, reasoning, understanding,
        decision-support, athlete, event-recording, rendering, delivery, application-orchestration).
AC20b — no PRODUCTION file may import all four core surfaces (observation/reasoning/understanding/
        decision-support) — "no layer owns the whole core."
```

`[FACT]` AC20 is the codification of **"the whole-core composition remains a test harness, not a production
service."** The maintainer's decision (recorded in `68029b9`) is to **keep AC20 fully intact and pause Option
C**. This spec records the corrected boundary.

---

## 2. Central Question

> Given AC20, what is the correct production boundary for observation-to-renderable composition if **no
> production file may own the whole core** and **no new top-level module may be created**?

The answer must preserve: AC20 unchanged; no new top-level module; no production file imports all four core
surfaces; whole-core composition remains a test harness; `offlineReflectionRuntime` keeps receiving an
injected `RenderingRequest` / renderable; Spec 034 Option C superseded; Tech Spec 034A superseded/on hold.

---

## 3. Required Analysis

1. **What Spec 034 selected.** Option C — a new dedicated production `reflection-composition` application
   module composing observation→reasoning→understanding→decision-support→rendering into a
   `RenderableDomainOutput`/`RenderingRequest`.
2. **Why Option C looked valid pre-AC20.** Spec 034 cited the Impl 006 end-to-end test as proof the chain is
   composable, and reasoned a downstream module could import the four public surfaces (the allowed import
   *direction*). It promoted the harness's "compose, author nothing" discipline to a production service.
3. **Exactly how AC20 blocks it.** AC20a rejects the new `reflection-composition` top-level module outright;
   AC20b rejects **any** production file that imports all four core surfaces. Option C does both. The block is
   structural, not incidental.
4. **Why `application-orchestration` is not precedent.** It was allowlisted into AC20 because it composes the
   **render/deliver tail** (rendering/delivery/event-recording) — it imports **none** of the four cores, so it
   satisfies AC20b. A whole-core composer imports all four — a categorically different (forbidden) shape.
5. **Why splitting the composer violates AC20's spirit.** Distributing the four imports across files to dodge
   the per-file `includes(...)` check would still make the **module** own the whole core, and AC20a still
   forbids the new module. It is an end-run around "no layer owns the whole core," not a respect of it. Rejected.
6. **Why decision-support must not own upstream.** A whole-core composer inside `decision-support` would make
   it import observation/reasoning/understanding (its upstream) — a dependency inversion the module-boundary
   guards and the domain model forbid (Spec 034 already rejected this as Option B).
7. **Why the Impl 006 path remains valid as a test harness.** `end-to-end-responsible-reflection.test.ts`
   *is* AC20's sanctioned home for whole-core composition: it lives in the neutral `__tests__/` root, owns no
   module, authors nothing, and proves the chain stays restrained. AC20 protects exactly this arrangement.
8. **Why `offlineReflectionRuntime` should keep the injected-renderable seam.** Impl 032R-A already accepts
   the `RenderingRequest` in its command (the renderable is supplied). This seam is precisely what lets the
   product runtime exist **without** a production whole-core owner — it is the AC20-compatible contract.
9. **What production code remains valid today.** Everything: the four core modules + their coordinators/repos;
   rendering (incl. the production `renderableFromTerminalOutput`); delivery (test sink); the
   `application-orchestration` render/deliver tail; and `offlineReflectionRuntime` (render-only, delivery
   withheld). None owns the whole core; none is affected.
10. **What the product-runtime path can do without a production whole-core composer.** It can render-only +
    withhold delivery over a renderable that was assembled **outside** any production whole-core owner — e.g.
    by a test harness, or by a future explicitly-contracted caller that supplies a safe `RenderingRequest`.
    The bridge survives as a **capability proven in tests + a wiring contract**, not a production module.

---

## 4. Re-decision Options Evaluated

**Option A — Keep whole-core composition as a test harness; production receives an injected
`RenderingRequest`/renderable.** **Selected.** AC20 unchanged; no new module; no production whole-core owner;
the Impl 006 harness remains the canonical proof; `offlineReflectionRuntime` keeps its injected-renderable
seam. Lowest risk; preserves the invariant the architecture has protected since Impl 006.

**Option B — Deliberately amend AC20 to allow exactly one approved whole-core production composer.**
*Not chosen here.* This relaxes a defining invariant and is a separate, explicit architecture decision
requiring its own spec + maintainer sign-off **before** any implementation. There is no overwhelming evidence
to amend AC20 now (the product runtime works via the injected seam). If ever pursued, it must be `Spec 035 —
AC20 Amendment Boundary`, not folded into this re-decision.

**Option C — Split the composer across files/modules to dodge the literal AC20 check.** *Rejected* — a
workaround that violates AC20's spirit (the module would still own the whole core) and still fails AC20a.

**Option D — Put the composition inside `application-orchestration` with injected collaborators.** *Rejected*
— violates the Impl 025 guard (application-orchestration must not import observation/reasoning/understanding);
application-orchestration is the render/deliver **tail**, not a whole-core owner.

**Option E — Put the composition inside `decision-support`.** *Rejected* — inverts dependencies (Analysis §6).

---

## 5. Decision

`[DECISION]` **Observation-to-renderable production composition remains caller-supplied; whole-core
composition remains a test harness.** (Option A.)

- **Spec 034 Option C is superseded.** No production `reflection-composition` module exists or will be created
  under current invariants.
- **Tech Spec 034A is superseded / on hold.** No Implementation 034-A proceeds.
- **AC20 remains unchanged** (AC20a + AC20b intact). No guard is weakened; no split workaround is approved.
- **`offlineReflectionRuntime` keeps receiving an injected `RenderingRequest` / renderable** (Impl 032R-A
  seam). This is the AC20-compatible contract by which the product runtime renders without a production
  whole-core owner.
- **The Impl 006 harness (`end-to-end-responsible-reflection.test.ts`) remains the canonical proof** of
  whole-core compatibility and restraint — the sanctioned home for whole-core composition.
- **Production modules may consume renderables but may not own the whole-core chain.** A `RenderableDomainOutput`
  may be assembled (e.g. via `renderableFromTerminalOutput` from a `TerminalOutput`) and handed to the render
  path; no production file may import all four core surfaces to assemble it end-to-end.
- **Future callers/operators may build a `RenderingRequest` outside Aurora's production whole-core boundary**
  — in a test harness today, or via a formally-contracted external assembly seam (a candidate next spec, §8).

`[ASSUMPTION]` The headline: **the observation-to-renderable bridge survives as a proven capability + a wiring
contract, not as a production module.** AC20 is not an obstacle to route around; it is the architecture's
statement that no single production layer may own reasoning-to-rendering — and the injected-renderable seam is
exactly how Aurora honors that while still shipping a product runtime.

---

## 6. Required Behavioral Rules (preserved by the corrected boundary)

```text
ObservationSet ≠ Evidence · Signal ≠ Evidence · Hypothesis ≠ Fact · Understanding ≠ Stored Truth ·
RenderableDomainOutput ≠ RenderedMessage · RenderingRequest ≠ provider call · renderable-ready ≠ validated draft ·
validated draft ≠ recommendation quality · renderable reflection ≠ AthleteDecision · delivery success ≠ athlete decision ·
operator action ≠ athlete decision · provider output ≠ truth · reflection ≠ prescription ·
application composition ≠ domain authorship · test harness ≠ production service
```

---

## 7. Acceptance Criteria (Given / When / Then)

- **AC20 unchanged.** *Given* this re-decision, *when* `end-to-end-responsible-reflection.test.ts` runs,
  *then* AC20a + AC20b pass unmodified. ✅
- **No new top-level module.** *Given* this spec, *when* `src/modules/` is inspected, *then* only the nine
  allowlisted modules + `__tests__` exist (no `reflection-composition`). ✅
- **No production whole-core owner.** *Given* this spec, *when* production files are scanned, *then* none
  imports all four core surfaces. ✅
- **Spec 034 Option C superseded.** *Given* this spec, *when* read, *then* Option C is explicitly superseded. ✅
- **Tech Spec 034A authorizes no implementation.** *Given* this spec, *when* read, *then* 034A is
  superseded/on hold. ✅
- **Injected-renderable seam preserved.** *Given* `offlineReflectionRuntime`, *when* inspected, *then* it
  still receives a `RenderingRequest` in its command (unchanged). ✅
- **Whole-core chain is test-harness only.** *Given* the chain, *when* its only composition site is found,
  *then* it is `__tests__/end-to-end-responsible-reflection.test.ts`. ✅
- **No split workaround approved.** *Given* this spec, *when* read, *then* Option C-split is rejected. ✅
- **No application-orchestration upstream imports approved.** ✅ (Option D rejected.)
- **No decision-support dependency inversion approved.** ✅ (Option E rejected.)
- **No runtime/API/UI/CLI/worker code added; no DB/auth/deployment/CI/SDK files; no package change.** ✅
  (docs-only).
- **All existing tests remain green.** *Given* this docs-only spec, *when* `node --test` runs, *then*
  737/737. ✅

---

## 8. Relationship To Existing Architecture

- **Impl 006** — the whole-core responsible-reflection **harness** remains the sanctioned (and only)
  whole-core composition site; AC20 protects it.
- **AC20** — "no production owner of the whole core" stands unchanged; this re-decision conforms to it.
- **Impl 025** — `application-orchestration` is the render/deliver **tail**, not a whole-core owner (and is
  guarded from upstream imports).
- **Impl 032R-A** — `offlineReflectionRuntime` receives an injected `RenderingRequest`; this is the
  AC20-compatible production contract.
- **Spec 034** — Option C superseded by this re-decision.
- **Tech Spec 034A** — superseded / on hold; authorizes no implementation.

---

## 9. Forbidden Behaviors

```text
implementing code · writing a technical spec · amending AC20 · weakening any guard ·
reintroducing the reflection-composition module · splitting the composition to route around AC20 ·
placing a whole-core composer in application-orchestration or decision-support ·
adding a new top-level module · adding runtime/API/UI/CLI/worker files ·
adding DB/auth/deployment/CI/SDK files · package/lockfile changes · production rollout claim
```

---

## 10. Recommended Next Mission

`[DECISION]` **Spec 035 — External Renderable Assembly Contract Boundary** *(recommended)* — a behavioral
spec that formalizes **how a caller supplies a safe `RenderingRequest` to `offlineReflectionRuntime` without a
production whole-core composer**: what the caller must guarantee (faithful renderable, inference framed as
reflection, traceability preserved, no fabricated claim), what stays the test harness's role, and what the
runtime may assume vs. must re-check. This turns the injected-renderable seam into an explicit, testable
contract — the AC20-respecting way to make the bridge real.

Alternatively, if no new contract is needed yet: **Docs consolidation post 034R** (fold the supersession +
re-decision into the four canonical docs). If the maintainer ever wants a production whole-core owner, that is
a separate, deliberate **Spec 035 — AC20 Amendment Boundary** with explicit sign-off — not part of this
re-decision.

---

## 11. Success Criteria

Can Aurora preserve the observation-to-renderable bridge as an architectural capability **without** creating a
production whole-core owner, **without** amending AC20, and **without** weakening any guard? **Yes — via Option
A:** the whole-core composition remains a test harness (Impl 006), production consumes renderables via the
`offlineReflectionRuntime` injected-renderable seam, Spec 034 Option C is superseded, and Tech Spec 034A
authorizes no implementation. The bridge lives on as a proven capability + a wiring contract, with `Spec 035 —
External Renderable Assembly Contract Boundary` as the recommended way to formalize the seam. Validation at
authorship: `tsc --noEmit` clean; `node --test` 737/737; no code, test, package, runtime, deployment, CI, SDK,
or dependency change; AC20 untouched.
