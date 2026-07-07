# Aurora — Technical Specification 045-A — Athlete Home Prototype Separation Plan

> **Status (2026-07-07).** Technical Specification phase, building on Spec 045 (`5dc4ffa`). It is
> **docs-only**: it implements no code, modifies no test, moves no file, removes no export, adds no
> guard, adds no UI, selects no framework, creates no HTTP/API/server/auth, creates no production
> composition ownership, adds no missing domain model, and captures no AthleteDecision. Base:
> `tsc --noEmit` clean; `node --test` **1132/1132**. It plans the exact, smallest implementation
> that removes the accidental production exposure of the Athlete Home sample scenario while
> preserving the renderer, view model, assembler, visual prototype, and all current AC20 invariants.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 045, still no
code. It names exact symbols, exact line-level changes, exact guard assertions, and one exact next
Implementation slice.

---

## 1. Required grounding check (verified before planning anything)

`[FACT]` All twelve preconditions re-verified true, directly against current source and current
test output, at authorship of this tech spec:

```text
 1. Baseline is exactly 1132/1132              : TRUE (full suite re-run at authorship).
 2. Working tree is clean                       : TRUE (git status empty at authorship).
 3. fa1d12e remains unchanged                   : TRUE (HEAD is 5dc4ffa, whose only parent-diff is
                                                   the Spec 045 doc; no athlete-home file touched
                                                   since fa1d12e).
 4. index.ts publicly re-exports the sample     : TRUE — src/athlete-home/index.ts line 24:
                                                   export { sampleAthleteHomeViewModel } from
                                                   "./sample/athlete-home-sample-scenario.ts";
 5. Sample imports five public surfaces         : TRUE — athlete/index, observation/index,
                                                   reasoning/index, understanding/index,
                                                   decision-support/index (all value imports),
                                                   plus shared-kernel/time.
 6. Sample executes the near-whole-core chain   : TRUE — declarePurpose -> recordObservationSet ->
                                                   detectSignals -> openHypothesis/attachSignal ->
                                                   updateUnderstandingFromOutcome ->
                                                   openDecisionSupportCase/evaluate.
 7. Renderer imports no domain/application code : TRUE — page/render-athlete-home.ts imports ONLY
                                                   ../view-model/athlete-home-view-model.ts.
 8. View model core imports are type-only       : TRUE — `import type` of UnderstandingLevel
                                                   (understanding/index) and VoiceMode
                                                   (decision-support/index); nothing else.
 9. Assembler imports exactly three public      : TRUE — lines 12-14 of assemble-athlete-home.ts:
    surfaces, type-only                            `import type` from athlete/index,
                                                   understanding/index, decision-support/index.
10. No production code imports the sample       : TRUE — full-repo search: the only references to
                                                   sampleAthleteHomeViewModel / the sample module
                                                   path are index.ts (the re-export under audit),
                                                   the sample itself, the dev generator, and the
                                                   three athlete-home test files. src/modules/** and
                                                   src/operator-runtime/** contain zero references.
11. Generated visual output remains ignored     : TRUE — .gitignore contains athlete-home.html;
                                                   git status shows no tracked artifact.
12. No frontend runtime/framework/server exists : TRUE — package.json deps unchanged (pg,
                                                   @aws-sdk/client-s3 only); no server/router/
                                                   framework token in athlete-home (guard NC1).
```

No discrepancy exists; this plan proceeds exactly as Spec 045 anticipated.

`[FACT]` One additional load-bearing audit fact that shapes the whole plan: **every current
consumer of the sample imports it DIRECTLY by relative path, never through the public barrel**:

```text
tests/athlete-home-view-model.test.ts   : from "../sample/athlete-home-sample-scenario.ts"
tests/render-athlete-home.test.ts        : from "../sample/athlete-home-sample-scenario.ts"
sample/generate-athlete-home-page.ts     : from "./athlete-home-sample-scenario.ts"
```

Therefore **removing the public re-export breaks NOTHING** — no consumer update is required at
all. The seam Spec 045 found is closed by deleting one line (plus its header mention) and guarding
against its return.

---

## 2. Central implementation question — options evaluated

> What is the smallest implementation that removes the accidental production exposure of the sample
> while preserving the useful renderer, view model, assembler, visual prototype, and AC20?

```text
Option A — de-export only                : necessary but NOT sufficient. Removing the barrel export
                                           closes the discoverable path, but the sample would remain
                                           trivially importable by relative path from any future
                                           production file; Spec 045 §2 Q9 explicitly identified
                                           reliance on developer discipline as the risk.
Option B — de-export + importer          : SELECTED. Closes the public seam AND makes the
  confinement (static guards)              confinement structural, using this repo's established
                                           enforcement idiom (text-based negative-capability guards,
                                           the same style as the RECOGNIZED_METRICS and scripts/
                                           allowlist guards). Zero file churn; zero consumer updates.
Option C — move sample to a test/demo    : REJECTED as unnecessary churn. The repo's real
  location                                 convention (044-* fixtures) puts non-test fixtures inside
                                           tests/ directories ONLY when tests are their sole
                                           consumers — but this sample is also legitimately consumed
                                           by the dev generator, a non-test file; moving it into
                                           tests/ would misrepresent that relationship, and a move
                                           adds no enforcement beyond what Option B's Guard 2
                                           already provides statically. "Do not move files merely
                                           for aesthetic purity."
Option D — delete sample                 : REJECTED — the sample has demonstrated prototype value:
                                           it is the only reason the visual artifact shows a
                                           REAL-gate-selected Reflection voice instead of hardcoded
                                           copy, and 20 of the 31 UI-001 tests exercise it.
Option E — revert UI-001                 : REJECTED — Spec 045 §3 already ruled this out; this
                                           audit found nothing broader.
```

`[DECISION]` **Option B — de-export plus static importer confinement. No file moves.**

---

## 3. Decision area 1 — the public barrel

`[FACT]` Exact current exports of `src/athlete-home/index.ts`, classified:

```text
AthleteHomeViewModel, AthleteHomeReady,      : type-only presentation contract — SAFE, stays.
DirectionSection, NotYetModeledSection,
UnderstandingSection,
UnderstandingItemViewModel,
AttentionSection, Epistemic          (types)
assembleAthleteHome                  (value) : pure assembler — SAFE, stays.
AssembleAthleteHomeInput             (type)  : assembler input contract — SAFE, stays.
renderAthleteHomePage, escapeHtml    (value) : renderer — SAFE, stays.
sampleAthleteHomeViewModel           (value) : sample/demo-only — UNSAFE PUBLIC EXPOSURE. The ONLY
                                               sample symbol exported, and the only unsafe export.
```

`[DECISION]` **Remove exactly one export: `sampleAthleteHomeViewModel` (index.ts line 24), plus the
header comment's implication that the barrel covers the sample.** Nothing else is removed — every
other export is legitimate prototype presentation surface, and over-removing would destroy the
useful contract for no safety gain. No other sample symbol is exposed (verified: the barrel has no
other `./sample/` specifier).

---

## 4. Decision area 2 — sample placement

```text
1. Does src/ placement imply production ownership here?  : Partially — src/ placement alone does not
   (src/operator-runtime is src/-placed and non-core),      imply it, but placement PLUS public
                                                            export did. With the export removed and
                                                            Guard 2 in place, placement is inert.
2. Is non-exported source sufficient isolation?           : Not by itself (relative imports remain
                                                            possible) — hence Guard 2.
3. Established demo/fixture convention?                   : Fixtures-inside-tests/ exists (044-*),
                                                            but only for test-only consumers; the
                                                            dev generator makes that a mismatch.
4. Would moving materially improve enforcement?           : NO — Guard 2's static allowlist is
                                                            exactly as strong as path-based
                                                            classification, without churn.
5. Would moving create unnecessary churn?                 : YES — 2 files moved, 4 import paths
                                                            updated, history broken, zero added
                                                            enforcement.
```

`[DECISION]` **The sample STAYS at `src/athlete-home/sample/` — de-exported and import-confined,
not moved.**

---

## 5. Decision area 3 — importer confinement

`[FACT]` Exact current importers of the sample (full-repo search, §1 fact): the two test files, the
dev generator, and the barrel (which will stop). That inventory defines the policy — no invented
architecture, just the observed legitimate consumers made structural:

```text
ALLOWED importers of src/athlete-home/sample/** :
  - src/athlete-home/tests/**            (prototype tests)
  - src/athlete-home/sample/**           (the sample's own files: generator -> scenario)

FORBIDDEN importers (everything else), explicitly including:
  - src/athlete-home/index.ts            (the public barrel)
  - src/athlete-home/view-model/**, src/athlete-home/page/**
  - src/modules/**                       (already also guarded by NC10 in reverse)
  - src/operator-runtime/**              (already also guarded by NC10 in reverse)
  - application-orchestration, provider adapters, delivery
  - any future HTTP/API/server code
```

`[DECISION]` **Smallest enforceable policy: sample code may be imported only from
`src/athlete-home/tests/` and from within `src/athlete-home/sample/` itself.** Enforced statically
by Guard 2 (§6), which scans all `src/**/*.ts` for the sample's module-path substring and asserts
every importer falls inside the allowlist.

---

## 6. Decision area 4 — exact guard plan (planned here, ADDED only by Implementation 045-A)

All guards are static, text-based checks in the existing
`src/athlete-home/tests/athlete-home-negative-capability.test.ts` — the same file and idiom as the
current NC1-NC11. No second guard file; no duplication of AC20.

```text
Guard 1 — no sample public export (NEW test):
  read src/athlete-home/index.ts as text; assert it contains neither "sampleAthleteHomeViewModel"
  nor the substring "/sample/" in any export specifier. Closes the seam and prevents its return.
  (Also subsumes tightening NC6: its current `!f.endsWith("index.ts")` exception becomes
  unnecessary — Implementation 045-A removes that exception so index.ts is held to the same
  no-sample-reference rule as every other production file.)

Guard 2 — sample import confinement (NEW test):
  collect all src/**/*.ts files; for every file whose import specifiers reference
  "athlete-home/sample/" or "athlete-home-sample-scenario" (or "./athlete-home-sample-scenario"
  within the slice), assert the importing file's path starts with src/athlete-home/tests/ or
  src/athlete-home/sample/. Exact allowlist from §5 — no directory-wide vagueness.

Guard 3 — renderer purity: ALREADY EXISTS (NC3: renderer must not import src/modules). Extend by
  asserting it also never references operator-runtime, provider, or delivery module paths — one
  token loop added to the existing test, not a new test.

Guard 4 — assembler non-execution (STRENGTHENED, NC4 extended):
  NC4 already proves public-surface-only imports. Add: every core import statement in
  assemble-athlete-home.ts (and athlete-home-view-model.ts) must be an `import type` statement —
  asserted textually (each `from ".../modules/..."` line begins `import type`). This makes the
  audited "cannot execute domain behavior" fact structural.

Guard 5 — no UI-owned domain execution: ALREADY EXISTS in substance (NC2: non-sample production
  files never import all four core surfaces). Add the §13-Spec-045 call-shaped token check to NC5's
  existing token loop: recordObservationSet, detectSignals(, openHypothesis(,
  UnderstandingProfile.initialize, openDecisionSupportCase(, evaluateDecisionSupportCase( must not
  appear in view-model/ or page/ files.

Guard 6 — no AthleteDecision (NEW assertion inside the existing NC suite):
  no athlete-home file (including sample and tests) may reference recordAthleteDecision,
  amendAthleteDecision, or athleteDecision( — the prototype must remain structurally unable to
  create an AthleteDecision.

Guard 7 — no runtime smuggling: ALREADY EXISTS (NC1 token regex includes createserver, listen(,
  express, fastify, websocket, fetch(). No change needed; re-verified, not duplicated.
```

Not planned (rejected as inflation): re-guarding what NC8/NC9/NC10 already prove (no forbidden
src/ top-level names, no dependency change, core never imports athlete-home).

---

## 7. Decision area 5 — relationship to AC20

`[DECISION]` **AC20 remains unchanged.** Not expanded, not amended, not weakened.

```text
why AC20 remains intact       : AC20's scan boundary (src/modules/) and its allowlist protect the
                                CORE's composition discipline. The concern here is local to one
                                prototype slice outside that boundary; expanding AC20's scan would
                                entangle a core invariant with prototype churn and is NOT the
                                smallest mechanism.
what the new local guards     : that athlete-home's near-whole-core sample is reachable only from
  protect                       its own tests and demo tooling — i.e., that the prototype cannot
                                quietly become the system's first production whole-core composer.
what the local guards do NOT  : they claim nothing about src/modules/, do not extend AC20's
  claim                         allowlist, do not approve any composition owner, and do not make
                                athlete-home "AC20-compliant by amendment" — the slice simply stays
                                outside the core, structurally confined.
```
```text
dedicated prototype isolation guard ≠ AC20 amendment
```

---

## 8. Decision area 6 — prototype artifacts preserved

`[DECISION]` Implementation 045-A must leave completely unchanged: `AthleteHomeViewModel` and all
its unions (loading/error/ready; declared/ambiguous/unknown; not-yet-modeled; no-dimensions/
assessed; support/inquiry/withholding/none), the `declared`/`inferred` epistemic labels, the honest
not-yet-modeled states, the pure assembler, the HTML renderer, and visual sample artifact
generation. Exact source inspection found no separate violation in any of them. No UI redesign, no
content rewrite, no new screen.

---

## 9. Decision area 7 — generated artifact

`[FACT]` `athlete-home.html` is gitignored and untracked. `[DECISION]` **No change required.** The
generated page stays ignored; nothing starts tracking it.

---

## 10. Decision area 8 — development execution path

`[FACT]` Exact current mechanics, audited:

```text
1. Executed file        : src/athlete-home/sample/generate-athlete-home-page.ts
2. Invocation           : node src/athlete-home/sample/generate-athlete-home-page.ts [outPath]
                          (direct; Node 22 native TS execution — same mechanism as node --test)
3. Package script?      : NO — none exists, none required.
4. scripts/ allowlist?  : NO — deliberately not a scripts/ entry (the allowlist guards stay
                          untouched; this was already respected by fa1d12e).
5. Import path          : DIRECT relative import ("./athlete-home-sample-scenario.ts") — NOT via
                          the public index.
6. Works after de-export? : YES, unchanged — no consumer update needed (§1).
```

`[DECISION]` **No update to the development execution path.** The smallest necessary change to it
is none. No package script, no launcher, no server, no watch mode, no build system.

---

## 11. Decision area 9 — public prototype contract after separation

`[DECISION]` `src/athlete-home/index.ts` exports, post-separation, exactly:

```text
types  : AthleteHomeViewModel, AthleteHomeReady, DirectionSection, NotYetModeledSection,
         UnderstandingSection, UnderstandingItemViewModel, AttentionSection, Epistemic,
         AssembleAthleteHomeInput
values : assembleAthleteHome, renderAthleteHomePage, escapeHtml
```

`[LIMITATION — documented]` This barrel is a PROTOTYPE contract. Its existence implies **no**
production runtime, **no** real athlete lookup, and **no** production composition ownership — the
only value functions it exposes are a pure mapper and a pure renderer, both inert without
caller-supplied inputs. Implementation 045-A updates the barrel's header comment to state this
explicitly.

---

## 12. Decision area 10 — missing domain models

`[DECISION]` No implementation change. `CurrentState`, `CapacityProfile`, and `ImpactAssessment`
remain unimplemented; the prototype continues rendering honest `not-yet-modeled`.
```text
prototype representation of honest absence ≠ domain implementation
```
Those domain lanes stay closed and are not opened by this plan.

---

## 13. Decision area 11 — epistemic tags

`[DECISION]` `declared` / `inferred` behavior is preserved exactly as-is (source inspection found
no bug). It remains a useful current presentation distinction and NOT a complete mapping of the
full epistemic chain (Observation ≠ Signal ≠ Evidence ≠ Hypothesis ≠ Understanding) — the Spec 045
§11 limitation stands, unexpanded in this slice.

---

## 14. Decision area 12 — future production path

`[DECISION]` This separation work selects **none** of the following, and no follow-up
implementation may be inferred from prototype isolation alone:

```text
production Athlete Home · frontend framework · browser runtime · HTTP · API · auth ·
session identity · persistence/query layer · production composition owner ·
real athlete data lookup · deployment · interactive AthleteDecision capture
```

---

## 15. Required implementation slice

```text
Implementation 045-A — Isolate Athlete Home Prototype Sample

scope (exact, from this audit):
  1. src/athlete-home/index.ts : remove the sampleAthleteHomeViewModel re-export (line 24) and
     update the header comment (public barrel = presentation contract only; no production runtime
     implied).
  2. NO consumer updates — all sample consumers already import directly (§1); the dev generation
     path continues working unchanged (§10).
  3. NO file moves, NO deletions.
  4. athlete-home-negative-capability.test.ts : add Guard 1 (index exports no sample), Guard 2
     (sample import-confinement allowlist), Guard 6 (no AthleteDecision tokens); extend NC3
     (renderer also never references operator-runtime/provider/delivery paths), NC4 (core imports
     in view-model files must be `import type`), NC5 (no call-shaped core-execution tokens in
     view-model/page files); tighten NC6 (drop the index.ts exception).
  5. re-run the 31 existing UI-001 tests and the full suite; AC20 untouched and green.

explicitly NOT part of this slice:
  file moves · sample deletion · new screen · UI redesign · framework/runtime/server selection ·
  production composition owner · missing-domain-model implementation · AthleteDecision capture ·
  AC20 change · package/dependency change · package script.
```

---

## 16. Required test plan (planned — not implemented in this tech spec)

```text
 1. public index does not export sampleAthleteHomeViewModel          (NEW — Guard 1)
 2. public index references no sample module path                     (NEW — Guard 1, same test)
 3. sample imports confined to src/athlete-home/tests/ + sample/      (NEW — Guard 2)
 4. renderer imports no domain/application runtime surfaces           (EXISTS NC3; extended tokens)
 5. assembler does not execute core behavior (`import type` enforced) (EXISTS NC4; strengthened)
 6. non-sample athlete-home code composes no near-whole-core chain    (EXISTS NC2; NC5 token add)
 7. athlete-home creates no AthleteDecision                           (NEW assertion — Guard 6)
 8. athlete-home calls no providers                                   (covered by NC3 extension)
 9. athlete-home calls no delivery                                    (covered by NC3 extension)
10. athlete-home introduces no HTTP/API/server runtime                (EXISTS NC1 — unchanged)
11. generated artifact remains ignored                                (EXISTS by .gitignore; NC
                                                                       suite re-verifies untracked
                                                                       status is out of test scope —
                                                                       no new test; .gitignore line
                                                                       is the mechanism)
12. prototype generation still works via the direct dev path          (verified by running the
                                                                       generator during Impl 045-A —
                                                                       not a new permanent test)
13. existing 31 UI-001 tests remain green                             (re-run, assertions unchanged
                                                                       except NC6 tightening)
14. AC20 remains unchanged and green                                  (re-run; zero edits)
```

Expected count change: approximately +3 new tests (Guards 1, 2, 6) with the remainder as
strengthened assertions inside existing tests — the implementation reports the exact final count.
No inflation; every new assertion maps to a seam this audit actually found.

---

## 17. Required Acceptance Criteria (Given / When / Then)

```text
Given the sample scenario executes near-whole-core behavior, when prototype separation is
  implemented, then it is no longer exported from the athlete-home public barrel.

Given a production or general source file, when it attempts to import the sample, then the local
  negative-capability guard rejects that dependency.

Given the renderer, when prototype separation is implemented, then it remains domain-runtime free.

Given the assembler, when prototype separation is implemented, then its core dependencies remain
  type-only and it executes no domain chain.

Given the sample remains useful for visual evidence, when public exposure is removed, then the
  explicit development-only generation path still works (unchanged, direct-import).

Given AC20, when prototype isolation is implemented, then AC20 remains unchanged.

Given UI-001 remains a prototype, when isolation is complete, then no production UI runtime or
  composition owner is implied.

Given missing domain models, when the prototype renders honest absence, then no fabricated
  CurrentState, CapacityProfile, or ImpactAssessment is introduced.

Given no AthleteDecision boundary exists, when prototype code runs, then no AthleteDecision is
  created (and Guard 6 makes that structural).
```

---

## 18. Required Forbidden Behaviors (this tech spec and its implementation slice)

```text
new UI screen · UI redesign ·
React · Vite · Next · Tailwind · frontend dependency ·
HTTP · API · server · router · auth ·
production composition layer · whole-core composer ·
CurrentState implementation · CapacityProfile implementation · ImpactAssessment implementation ·
AthleteDecision capture ·
provider calls · delivery calls ·
AC20 weakening · AC20 amendment ·
package script (not required by existing mechanism — §10) ·
new dependency · production runtime selection · deployment selection
```

---

## 19. Decision & Next Mission

`[DECISION] Prototype separation implementation plan: Option B — remove exactly one public export
(sampleAthleteHomeViewModel from src/athlete-home/index.ts) and add static importer-confinement
guards; the sample stays at src/athlete-home/sample/ unmoved; no consumer changes are needed
because every consumer already imports it directly; renderer, view model, assembler, and visual
prototype are preserved unchanged; AC20 is untouched.`

```text
exact public export to remove       : sampleAthleteHomeViewModel (index.ts line 24) + header
                                      comment adjustment.
sample stays or moves               : STAYS — src/athlete-home/sample/ (de-exported + guarded);
                                      move rejected as churn without added enforcement.
allowed sample importers            : src/athlete-home/tests/** and src/athlete-home/sample/**.
forbidden sample importers          : everything else — index.ts, view-model/, page/,
                                      src/modules/**, src/operator-runtime/**,
                                      application-orchestration, providers, delivery, any future
                                      HTTP/API/server code.
development generation path         : unchanged — node src/athlete-home/sample/
                                      generate-athlete-home-page.ts [outPath]; direct import;
                                      no package script; no scripts/ allowlist change.
public exports that remain          : 9 types (AthleteHomeViewModel, AthleteHomeReady,
                                      DirectionSection, NotYetModeledSection, UnderstandingSection,
                                      UnderstandingItemViewModel, AttentionSection, Epistemic,
                                      AssembleAthleteHomeInput) + 3 values (assembleAthleteHome,
                                      renderAthleteHomePage, escapeHtml).
renderer disposition                : preserved unchanged; purity guard extended (no operator-
                                      runtime/provider/delivery references).
view-model disposition              : preserved unchanged; type-only core imports made structural.
assembler disposition               : preserved unchanged; `import type` + no-execution-token
                                      guards made structural.
sample disposition                  : stays; de-exported; import-confined; frozen otherwise.
exact new guard plan                : Guard 1 (no sample export from barrel), Guard 2 (import
                                      allowlist), Guard 6 (no AthleteDecision tokens); NC3/NC4/NC5
                                      strengthened; NC6 index exception removed; NC1 verified
                                      sufficient for runtime smuggling — §6.
relationship to AC20                : unchanged, unexpanded, unamended; local guards protect the
                                      prototype seam without claiming anything about the core — §7.
generated artifact disposition      : remains gitignored; no change.
missing-domain-model disposition    : CurrentState/CapacityProfile/ImpactAssessment remain
                                      unimplemented; honest not-yet-modeled rendering continues.
epistemic-tag disposition           : declared/inferred preserved as-is; documented limitation
                                      stands; no expansion.
future production path disposition  : nothing selected — no production Athlete Home, framework,
                                      runtime, HTTP, API, auth, identity, persistence, composition
                                      owner, athlete lookup, deployment, or decision capture.
recommended implementation slice    : Implementation 045-A — Isolate Athlete Home Prototype Sample
                                      (§15).
```

`[RECOMMENDATION] Next mission: Implementation 045-A — Isolate Athlete Home Prototype Sample.`
Exactly the §15 scope: one export removal, the §6 guard additions/strengthenings, zero file moves,
zero consumer updates, zero behavior changes to renderer/view-model/assembler/sample content.

---

## 20. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1132/1132** (unchanged — this tech spec is docs-only). No
code/test/package/lockfile change; no export changed; no guard changed; no file moved or deleted;
no dependency added; `fa1d12e` unchanged; AC20 untouched.
