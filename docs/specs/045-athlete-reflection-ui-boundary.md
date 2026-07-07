# Aurora — Specification 045 — Athlete Reflection UI Boundary

> **Status (2026-07-07).** Specification phase, auditing UI-001 (`fa1d12e`). It is **docs-only**: it
> changes no code, no test, moves no file, deletes no file, reverts nothing, adds no UI/screen/route,
> selects no framework, adds no HTTP/API/server/auth/persistence, approves no production whole-core
> composer, captures no AthleteDecision, and neither weakens nor amends AC20. Base: `tsc --noEmit`
> clean; `node --test` **1132/1132**. It answers one question: is UI-001 a legitimate prototype
> artifact, or did it accidentally introduce a production composition surface incompatible with prior
> decisions and the intent of AC20?

---

## 0. Phase confirmation

This is the **Specification** phase — an audit and a boundary decision. Nothing is implemented,
moved, or reverted here; any separation work it decides is routed to a future Tech Spec 045-A.

---

## 1. Required audit — exact implementation of `fa1d12e`

`[FACT]` Files introduced by `fa1d12e` (verified against `git show fa1d12e --stat`; every file read
directly for this audit — not taken from the prior report):

```text
.gitignore                                                    (+1 line: athlete-home.html)
src/athlete-home/index.ts                                     (public surface)
src/athlete-home/view-model/athlete-home-view-model.ts        (types only)
src/athlete-home/view-model/assemble-athlete-home.ts          (pure assembler)
src/athlete-home/page/render-athlete-home.ts                  (HTML renderer)
src/athlete-home/sample/athlete-home-sample-scenario.ts       (sample scenario)
src/athlete-home/sample/generate-athlete-home-page.ts         (dev-only page generator)
src/athlete-home/tests/athlete-home-view-model.test.ts        (10 tests)
src/athlete-home/tests/render-athlete-home.test.ts            (10 tests)
src/athlete-home/tests/athlete-home-negative-capability.test.ts (11 guards)
```

No pre-existing file other than `.gitignore` was touched. The generated `athlete-home.html` is
**gitignored, never tracked**.

`[FACT]` **Per-file audit** (all import statements verified line-by-line):

| File | Production TS? | Imports from core | Import kind | Executes domain behavior? |
| --- | --- | --- | --- | --- |
| `view-model/athlete-home-view-model.ts` | yes | `understanding/index`, `decision-support/index` | **`import type` only** | no — types only |
| `view-model/assemble-athlete-home.ts` | yes | `athlete/index`, `understanding/index`, `decision-support/index` | **`import type` only** | no — pure mapping, zero domain calls |
| `page/render-athlete-home.ts` | yes | **none** — imports only the view-model types | n/a | no |
| `index.ts` | yes (public surface) | none directly; **re-exports the sample scenario** (line 24) | value re-export | transitively exposes execution |
| `sample/athlete-home-sample-scenario.ts` | **ambiguous** (under `src/`, not a test file) | `shared-kernel/time`, `athlete/index`, `observation/index`, `reasoning/index`, `understanding/index`, `decision-support/index` | **value imports** | **YES** — executes the full chain |
| `sample/generate-athlete-home-page.ts` | development-only executable | none directly (imports renderer + sample) | value imports | transitively yes; writes one file |
| `tests/*` (3 files) | no — tests | n/a | n/a | test-only |

`[FACT]` **Question 7 — whole-chain reach.** Exactly one file reaches
Observation → Signal → Hypothesis → Understanding → Decision Support in one execution path:
`sample/athlete-home-sample-scenario.ts`. It imports all four core surfaces
(`observation/index`, `reasoning/index`, `understanding/index`, `decision-support/index`) **plus**
`athlete/index` — a near-whole-core composition (five public surfaces), executed as values, not
types.

`[FACT]` **Question 8 — what the sample is.** By banner and by usage it declares itself
"SAMPLE DATA — NOT PRODUCTION LOGIC" and is consumed only by the three UI-001 test files and the
dev-only generator. But by **placement** (under `src/athlete-home/sample/`, not under any `tests/`
path) and above all by **exposure** (re-exported from `src/athlete-home/index.ts`, the slice's
public surface), it is **ambiguous**: banner says demo fixture; the public export makes it
structurally available as a reusable production composer. This is the single most important audit
finding of this spec.

`[FACT]` **Question 9.** Generated output (`athlete-home.html`) is ignored, never tracked.

`[FACT]` **Question 10 — runtime entry points.** No server, no listener, no route, no daemon
exists. `sample/generate-athlete-home-page.ts` is a one-shot, directly-invoked development
executable (writes one static file and exits). It is a dev tool, not a runtime surface — but note
it is invocable from a `src/` path without any test context.

---

## 2. Required AC20 audit

`[FACT]` The AC20 guards live in `src/modules/__tests__/end-to-end-responsible-reflection.test.ts`:

```text
1. Scan boundary          : modulesDir = src/modules/ ONLY (dirname(test) + "..").
2. Scans src/athlete-home? : NO.
3. Why not                 : the guard was written when all production code lived under src/modules/;
                             src/operator-runtime/ already established the "consumer outside the
                             scan" precedent, and src/athlete-home/ inherited that position.
4. Technical pass           : YES — UI-001 passes AC20 because it is entirely outside the scan:
                             the "no new top-level module" check reads src/modules/ children only,
                             and the "no production file imports all four surfaces" check collects
                             files under src/modules/ only.
5. Intent violation?        : PARTIALLY — see below.
6. Whole-core execution?    : the sample executes a near-whole-core chain (four core surfaces +
                             athlete), the same chain as the e2e harness.
7. Equivalent to the e2e    : in CONTENT yes (same chain, same style, deliberately mirrored);
   harness?                   in ROLE no — the e2e harness lives in __tests__/ (excluded from every
                             production-file classification and not importable as a public
                             surface), while the sample lives under src/athlete-home/sample/ AND is
                             re-exported from the slice's public index.
8. Production import path   : within the current repo, NO production file imports the sample
   to the sample?             (verified: UI-001's own NC6 test forbids view-model/page files from
                             referencing it; NC10 verifies src/modules and src/operator-runtime
                             never import athlete-home). BUT the public re-export in index.ts IS a
                             production-surface path to it — one import statement away for any
                             future consumer.
9. Reusable as production   : YES, realistically — another developer importing
   composition?               `sampleAthleteHomeViewModel` from the athlete-home public surface
                             would be running whole-core composition in production without
                             tripping any existing guard. The banner is advisory, not structural.
10. New guard required?     : YES (specified in §12, NOT added here).
```

`[DISTINCTION — central to this spec]`
```text
passing current AC20 guard ≠ automatically compliant with AC20 intent
```
The **renderer, view model, and assembler comply with both letter and intent**: the assembler
consumes three public surfaces as `import type` only — it cannot execute domain behavior at all,
which is a *stronger* position than AC20 demands. The **sample scenario complies with the letter
only**: its content is test-harness-equivalent, but its placement and public re-export make it more
permissive than the existing e2e harness — an unguarded seam through which production whole-core
composition could enter without any future reviewer noticing. AC20 itself is not weakened or
amended by this spec.

---

## 3. Required classification of UI-001

```text
Option A — Prototype artifact              : fits the renderer/view-model/assembler/generator and
                                             the generated page — but ignores the sample's public
                                             exposure, so it under-describes reality.
Option B — Production presentation surface : REJECTED as a present-tense classification — nothing
                                             upstream exists (no runtime, no query layer, no real
                                             athlete lookup); calling this "production" today would
                                             be aspirational, not factual.
Option C — Mixed state requiring separation : MATCHES the audited source exactly — the
                                             renderer/view-model work is legitimate prototype; the
                                             sample composition's placement/exposure must be
                                             isolated before the boundary can be called safe.
Option D — Revert                           : REJECTED — nothing in fa1d12e corrupts domain
                                             behavior, weakens an existing guard, adds a dependency,
                                             or touches production modules; 1132/1132 holds. The
                                             defect is placement/exposure of one file, which
                                             separation fixes at far lower cost than reversion.
```

`[DECISION]` **UI-001 is classified as Option C — mixed state requiring separation.** The smallest
classification justified by actual source: everything except the sample's public exposure is a
clean prototype; that one seam requires isolation.

---

## 4. Decision area 1 — prototype versus production

`[DECISION]` **UI-001 is a PROTOTYPE — explicitly non-production visual/product evidence — plus one
development tool, with one file in an ambiguous position pending separation.**

Component classification:

```text
view model      : prototype presentation contract (types) — legitimate, production-grade in QUALITY,
                  prototype in STATUS.
assembler       : prototype — pure, type-only consumption of three public surfaces; may later be
                  promoted verbatim if a production boundary is approved.
renderer        : prototype — framework-free by design; explicitly non-binding on the future stack.
sample scenario : demo fixture in intent; ambiguous in placement/exposure; must be isolated (§7).
page generator  : development-only executable; acceptable while clearly non-runtime.
generated page  : untracked visual evidence artifact; not a product surface.
```

As prototype, the consequences are explicit:

```text
where it may live      : src/athlete-home/ (outside src/modules/, like operator-runtime) — acceptable.
what it may import     : PUBLIC module surfaces only; type-only in production-classified files.
what it may execute    : nothing domain-shaped in view-model/page files; the sample executes the
                         chain ONLY as demo/test input, post-separation only from a test/demo path.
what may consume it    : tests, the dev generator, and human review. Nothing else.
what must never depend : src/modules/*, src/operator-runtime/*, any future production runtime —
  on it                  none may import athlete-home while it is prototype-classified (NC10
                         already guards the first two).
```

---

## 5. Decision area 2 — UI input contract

```text
Input A — TerminalOutput only      : REJECTED as sole contract — cannot carry Purpose (declared,
                                     athlete-owned) or UnderstandingAssessment; the screen's central
                                     question ("what does Aurora understand about me") needs both.
Input B — AthleteHomeViewModel     : SELECTED as the PRESENTATION contract — the typed, discriminated
                                     shape the renderer consumes. The critical question "who may
                                     construct it" is answered strictly: ONLY the pure assembler,
                                     and the assembler itself only from caller-supplied inputs.
Input C — independent section      : ALREADY EFFECTIVELY TRUE at the assembler's input: it takes
  inputs                             { purposeView, assessments, terminalOutput } — three already-
                                     produced, independently-sourced domain outputs. No whole-home
                                     composer is required to call it. B and C are complementary
                                     here, not rivals: C describes the assembler's INPUT, B its OUTPUT.
Input D — direct domain reads      : REJECTED — high-risk; the UI executing domain reads itself is
                                     exactly the whole-core path AC20's intent forbids.
```

`[DECISION]` **Selected: Input B (AthleteHomeViewModel) as the presentation contract, constructed
exclusively by the pure assembler from Input-C-shaped caller-supplied inputs
(`CurrentPurposeView`, `UnderstandingAssessment[]`, `TerminalOutput?`).** The UI never fetches,
composes, or executes; it is handed already-produced domain outputs.

---

## 6. Decision area 3 — composition ownership

Who may construct the data shown by Athlete Home?

```text
A. UI assembler composes core surfaces directly : REJECTED — the assembler must stay type-only/pure.
B. application-orchestration composes them      : REJECTED — it is actively guarded AGAINST importing
                                                  Athlete/Understanding/Hypothesis/DecisionSupportCase
                                                  (Impl 025 guard); repurposing it would weaken an
                                                  existing, deliberate boundary.
C. operator-runtime composes them               : REJECTED — it is the operator-mediated reflection
                                                  seam, deliberately narrow ("a SAFETY BOUNDARY, not
                                                  a product surface"); loading whole-core reads onto
                                                  it would distort its role.
D. a new production query/composition boundary  : NOT SELECTED HERE — it may eventually be the right
                                                  answer, but approving it requires its own spec with
                                                  its own AC20-relationship decision. This spec does
                                                  not invent it.
E. no production composition selected yet;      : SELECTED — the honest present-tense answer.
   prototype receives explicit fixture/caller-
   supplied inputs
```

`[DECISION]` **Selected: E.** **No safe production owner for cross-aggregate Athlete Home
composition exists today, and this spec explicitly declines to invent one.** The prototype receives
caller-supplied inputs (in tests and the demo, those callers are test/demo code). If and when
Athlete Home becomes a production surface, composition ownership must be decided in its own future
boundary spec — with the option that it becomes the first approved amendment discussion for AC20,
which this spec neither starts nor prejudges.

---

## 7. Decision area 4 — the sample chain

`[FACT]` The audited sample executes Observation → Signal → Hypothesis → Understanding → Decision
Support (§1). Answers to the required questions:

```text
1. Imported by production code?   : by index.ts (public re-export) — yes, in the exposure sense;
                                    no production file CALLS it today.
2. Executable as runtime surface? : not as a server; yes as a one-shot dev command (via the
                                    generator). Bounded, but real.
3. src/ placement implying        : YES — sample/ under src/athlete-home/ is not structurally
   production ownership?            distinguishable from production source by any existing guard.
4. Creates a reusable composer?   : YES — one exported, argument-less function returning a
                                    fully-composed view model.
5. More permissive than the e2e   : YES — the e2e harness is unimportable test code; the sample is
   harness?                          publicly re-exported production-path code.
6. Move / rename / guard / freeze? : DECIDED (not performed here): the sample must be ISOLATED —
                                    (a) its re-export removed from the public index, and
                                    (b) either relocated under a test-classified path or guarded so
                                    that no file outside athlete-home's tests/ and the dev generator
                                    may import it. Until Tech Spec 045-A executes this, the sample is
                                    FROZEN: no new consumer may be added.
```

`[DECISION]` **The sample chain is an allowed test/demo harness in content, currently misplaced in
exposure. It is frozen as-is and must be isolated by Tech Spec 045-A before any further UI work.**
No move is performed in this spec.

---

## 8. Decision area 5 — missing domain models

`[FACT]` `CurrentState`/`StateSnapshot`, `CapacityProfile`/`CapacityEstimate`, and
`ImpactAssessment` exist in `docs/domain-modeling/*.md` only — no production type implements them.
UI-001 renders those three areas as explicit `not-yet-modeled` states naming the exact missing
model, behind a "Por qué" fold.

```text
Option A — allow explicit not-yet-modeled states in prototype UI : SELECTED.
Option B — hide the sections until models exist                  : REJECTED — hiding erases the
           honest shape of the product question; the screen's own hierarchy IS design evidence.
Option C — implement the missing models before further UI        : REJECTED HERE — that is domain
           work with its own evidence bar; nothing in UI-001 justifies rushing it.
```

`[DECISION]` **Option A.** The prototype may honestly render `not-yet-modeled`.
```text
honest absence ≠ mock data · honest absence ≠ domain implementation
```
No CurrentState/CapacityProfile/ImpactAssessment implementation is selected or scheduled by this
spec.

---

## 9. Decision area 6 — first real product surface

`[DECISION]` **UI-001 is product design evidence — NOT the first production product surface.** A
production surface requires, at minimum, the items below; every one remains **intentionally
unselected**:

```text
frontend framework · browser runtime · HTTP delivery · API contract · authentication ·
session identity · persistence/query layer · deployment target · real athlete lookup ·
interactive decision capture
```

---

## 10. Decision area 7 — AthleteDecision

`[FACT]` The rendered page contains **no `<script>` tag** (asserted by test UI-001.13) and no form,
endpoint, or handler — no interaction can create anything.

`[DECISION]` Preserved, unchanged, and binding on all future UI work:
```text
click ≠ AthleteDecision · button press ≠ athlete commitment · silence ≠ decision ·
following Aurora ≠ obedience success
```
No interactive choice in UI-001 (or its successors) may create an AthleteDecision automatically.
AthleteDecision capture is **not selected** in this spec; it remains athlete-declared, gated behind
its own future, separately-approved boundary.

---

## 11. Decision area 8 — epistemic presentation

`[FACT]` The view model carries `epistemic: "declared" | "inferred"` on every content-bearing item,
rendered as visible tags ("declarado por vos" / "interpretación de Aurora").

`[DECISION]` **Legitimate presentation distinction — kept for the prototype.** It preserves the one
distinction that must never blur: `declared ≠ inferred` (athlete-owned vs. defeasible).

`[LIMITATION — documented, not expanded]` The two-value marker deliberately flattens Aurora's
internal epistemic gradient — Observation ≠ Signal ≠ Evidence ≠ Hypothesis ≠ Understanding — into
one "inferred" bucket. For a prototype that is correct restraint (the athlete-facing question is
"did I say this, or is Aurora reading it?"). For future production semantics it is likely
insufficient (e.g., distinguishing a raw self-report from a gate-passed reflection). That richer
model is NOT designed here; expanding it now would be speculation without a product-evidence need.

---

## 12. Decision area 9 — renderer and stack

```text
A. acceptable prototype implementation detail : true, but incomplete as a decision.
B. selected production UI stack               : REJECTED — explicitly NOT selected.
C. intentionally non-binding                  : SELECTED.
```

`[DECISION]` **Option C — the framework-free HTML renderer is intentionally non-binding.** It is an
acceptable prototype implementation detail (A) whose existence decides nothing about the production
stack. No React/Vite/Next/Tailwind decision is made in this spec, and none may be inferred from the
prototype's continued existence. When real evidence (a production-surface decision with delivery
requirements) arrives, the stack gets its own spec; the `render*` functions port as components
regardless of the choice.

```text
prototype HTML ≠ permanent stack decision
```

---

## 13. Decision area 10 — negative capability (future guards specified, NOT added here)

`[FACT]` Already guarded today by UI-001's own tests: renderer imports no domain module (NC3);
production view-model/page files never import all four core surfaces (NC2) and never reference the
sample (NC6); assembler consumes public surfaces only and re-runs no domain logic (NC4/NC5); no
framework/server tokens (NC1); no new dependency (NC9); core and operator-runtime never import
athlete-home (NC10); no forbidden `src/` top-level names (NC8).

`[DECISION]` Tech Spec 045-A must plan (and only it may implement) these ADDITIONAL guards:

```text
1. the athlete-home PUBLIC surface (index.ts) must not export the sample scenario (closes §7's
   exposure seam — the one real gap this audit found).
2. no file outside src/athlete-home/tests/ and the dev generator may import the sample scenario.
3. UI production files must never construct domain objects: no call-shaped reference to
   recordObservationSet / detectSignals / openHypothesis / UnderstandingProfile.initialize /
   openDecisionSupportCase / evaluateDecisionSupportCase (today they are type-only importers;
   the guard makes that structural).
4. UI files must never reference provider adapters, delivery, or event-recording surfaces.
5. UI files must never contain server tokens (createServer/listen() — extend NC1 if the generator
   ever grows).
6. UI files must never create an AthleteDecision (no recordAthleteDecision reference).
```

No guard is added in this spec.

---

## 14. Required options summary

```text
Option A — keep ALL UI-001 work as frozen non-production prototype          : under-selects; leaves
            the sample's public re-export standing, which §2/§7 identified as the real seam.
Option B — keep renderer/view-model as prototype, isolate sample from        : SELECTED — matches
            production exposure                                                the audit exactly;
                                                                               smallest safe change.
Option C — promote UI-001 to production presentation boundary                : premature — no
            (caller-supplied inputs only)                                      runtime/query layer
                                                                               exists to be the caller.
Option D — create a new production Athlete Home query/composition boundary   : explicitly declined
                                                                               (§6, ownership E).
Option E — revert UI-001                                                     : rejected (§3).
```

`[DECISION]` **Primary: Option B.** Secondary step (separate, future): Tech Spec 045-A plans the
sample isolation and the §13 guards. `fa1d12e` remains; nothing moves in this spec.

---

## 15. Required Acceptance Criteria (Given / When / Then)

```text
Given UI-001 exists, when classified, then its production status is explicit (prototype; mixed
  state pending sample isolation; NOT a production surface).

Given the current repo has no frontend runtime, when the UI boundary is defined, then no
  framework/runtime selection is smuggled in implicitly (renderer declared non-binding, §12).

Given AC20 guards only src/modules/, when athlete-home is audited, then technical guard pass is
  not treated as architectural proof (§2's letter-vs-intent split).

Given the sample executes domain behavior, when classified, then test/demo composition is
  distinguished from production composition (content: harness-equivalent; exposure: misplaced;
  frozen pending isolation).

Given no safe production cross-aggregate composer exists, when Athlete Home needs data, then one
  is not invented silently (composition ownership E — explicitly unselected).

Given CurrentState, CapacityProfile, and ImpactAssessment are not implemented, when the UI presents
  those areas, then absence is not replaced with fabricated domain data (not-yet-modeled states).

Given a section is declared or inferred, when rendered, then Aurora does not present inference as
  fact (epistemic tags; imperative language test-banned).

Given a user interacts with the UI, when no AthleteDecision boundary is approved, then no
  AthleteDecision is created (structurally impossible today: no script, no handler).

Given a renderer exists, when future runtime choices are made, then pure HTML prototype code does
  not automatically determine the production stack.

Given AC20 remains active, when UI architecture evolves, then no production whole-core composer is
  introduced (and the sample's exposure seam is closed by 045-A before further UI work).
```

---

## 16. Required Forbidden Behaviors (this spec)

```text
code changes · test changes · file moves · file deletions · revert of fa1d12e ·
new UI implementation · new screen · new route ·
React · Vite · Next · Tailwind · framework dependency ·
HTTP server · API · backend · auth ·
new production composer · whole-core composer ·
new CurrentState implementation · new CapacityProfile implementation ·
new ImpactAssessment implementation ·
new AthleteDecision capture ·
Signal creation from UI · Evidence creation from UI · Hypothesis creation from UI ·
UnderstandingProfile creation from UI · DecisionSupportCase creation from UI ·
provider calls · delivery calls ·
AC20 weakening · AC20 amendment
```

---

## 17. Decision & Next Mission

`[DECISION] Athlete Reflection UI Boundary: Option B — keep the renderer, view model, and assembler
as a frozen non-production prototype (legitimate in both letter and intent), and isolate the sample
scenario's composition from production exposure — remove its public re-export and confine its
importability to test/demo paths — before any further UI work. No production Athlete Home surface,
no production composition owner, no framework, and no runtime are selected. fa1d12e remains; AC20
remains untouched.`

```text
classification of UI-001            : mixed state requiring separation (prototype + one exposure seam).
renderer                             : prototype; imports zero domain modules; non-binding on stack.
view model                           : prototype presentation contract; type-only core imports.
assembler                            : prototype; pure; type-only imports of three public surfaces;
                                       re-runs no domain logic.
sample scenario                      : demo harness in content; misplaced in exposure (public
                                       re-export + src/ placement); FROZEN pending isolation.
generated artifact                   : untracked visual evidence; not a surface.
fa1d12e                              : remains, unreverted, unmodified.
must later move/isolate              : the sample's public re-export (remove) and its importability
                                       (confine) — Tech Spec 045-A.
AC20 technical result                : PASS (athlete-home is outside the src/modules scan).
AC20 architectural-intent result     : renderer/view-model/assembler comply (stronger than required:
                                       type-only); sample complies in content but its exposure is an
                                       unguarded seam — intent NOT fully satisfied until isolated.
selected UI input contract           : AthleteHomeViewModel (Input B), constructed only by the pure
                                       assembler from caller-supplied section inputs (Input C shape).
composition ownership                : E — no production composition owner exists or is selected;
                                       explicitly not invented here.
production Athlete Home exists?      : NO — UI-001 is product design evidence.
CurrentState disposition             : not implemented; prototype renders honest not-yet-modeled.
CapacityProfile disposition          : not implemented; prototype renders honest not-yet-modeled.
ImpactAssessment disposition         : not implemented; prototype renders honest not-yet-modeled.
epistemic presentation               : declared/inferred tags kept; two-value flattening documented
                                       as a future-production limitation, not expanded now.
HTML renderer / stack                : intentionally non-binding; no stack selected.
AthleteDecision                      : no capture; click ≠ decision preserved; structurally
                                       impossible today (no script).
future negative-capability guards    : §13 items 1–6 (sample un-export + import confinement +
                                       no-domain-construction + no provider/delivery + no server +
                                       no AthleteDecision) — planned by 045-A, not added here.
intentionally unselected             : frontend framework · browser runtime · HTTP delivery · API
                                       contract · auth · session identity · persistence/query layer ·
                                       deployment target · real athlete lookup · interactive
                                       decision capture · production composition owner.
```

`[RECOMMENDATION] Next mission: Tech Spec 045-A — Athlete Home Prototype Separation Plan.` Exactly:
plan the removal of the sample re-export from `src/athlete-home/index.ts`, the confinement of the
sample scenario to test/demo importability, and the §13 guards — nothing else. No new screen, no
framework selection, no runtime, no composition boundary.

---

## 18. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1132/1132** (unchanged — this spec is docs-only). No code/
test/package/lockfile change; no dependency added; no guard weakened; no file moved or deleted;
`fa1d12e` unreverted; AC20 untouched.
