# Aurora — Technical Specification 046A — Experience Projection Guardrails

> **Status (2026-07-08).** Technical Specification phase, generalizing Spec 046
> (`docs/specs/046-experience-projection-boundary.md`, `dc4cd72`) into an implementable, verifiable checklist.
> **Docs-only.** No UI, no frontend framework, no HTTP/API, no production caller, no `CurrentState`/
> `CapacityProfile`/`ImpactAssessment` implementation, no production whole-core composer, no new shared guard
> utility module, no dependency, no runtime, no production-behavior change. AC20 is not modified. Base at
> authorship: `tsc --noEmit` clean; `node --test` **1156/1156**; working tree clean; HEAD `dc4cd72`.

---

## 0. Phase confirmation

Technical Specification — one level more concrete than Spec 046, still no code. It names the exact checklist,
the exact forbidden/allowed import shapes, the exact guard-test structure, and the exact way athlete-home's
existing 14 tests already satisfy it — no new production surface is opened.

---

## 1. Discovery — read directly, not paraphrased

`[FACT]` Re-verified at authorship: `src/athlete-home/tests/athlete-home-negative-capability.test.ts` currently
holds exactly **14 tests** (NC1–NC14, non-sequential numbering preserved across three implementation slices —
UI-001, Impl 045-A, and the 045-D/045-F surgical passes touched none of the guard tests). AC20's three tests
(`end-to-end-responsible-reflection.test.ts:412-442`) and `application-orchestration`'s stricter forbidden-import
guards (`explicit-orchestration-negative-capability.test.ts:133-135`,
`external-renderable-admission-negative-capability.test.ts:100`) are unchanged since Spec 046 quoted them.

`[FACT]` **No shared guard-utility module exists anywhere in this repository.** The `collectTsFiles`-style
directory-walk helper is independently duplicated in **14 separate test directories** (`athlete-home`, 10 core/
integration modules, `application-orchestration`, `operator-runtime`, plus the top-level `__tests__` harness) —
confirmed by direct search, not assumption. This is the repo's own, consistent, load-bearing convention: **each
guarded surface owns its own local guard file**, never a shared abstraction.

`[DECISION]` This tech spec **does not** create a shared guard-utility module. Proposing one would itself
violate the exact discipline Spec 046 §10/§6.4 established for Experience Projections — "no shared, cross-surface
object" — applied here one level up, to the guards themselves: a shared guard helper used by every future
projection would be a single artifact several surfaces depend on for correctness, is not the repo's existing
convention (§1 above), and each surface's guard file legitimately differs in which paths/tokens it scans (see
§10 for the parts that generalize as *pattern*, not as *shared code*). If a second and third real projection
ever both need the identical directory-walk helper verbatim, *that* is the evidence a future, narrower
refactor could cite — not before.

---

## 2. What is an Experience Projection guard, precisely

`[DECISION]` An **Experience Projection guard** is a **local**, per-surface negative-capability test file, living
beside the projection it guards (its own `tests/` directory, exactly as every other module does), that
mechanically proves the four conditions Spec 046 §5.C named as the difference between *actually* avoiding a
whole-core composer and merely renaming one:

```text
1. type-only / caller-supplied inputs only  (§5 below)
2. never more than 3-of-4 AC20-guarded surfaces imported at runtime in one file  (§6)
3. scoped to exactly one product surface — never shared across surfaces  (§6.4, Spec 046 §6.4)
4. zero new inference — translation/grouping/ordering only, never domain computation  (§7)
```

It is **not** a new kind of test infrastructure, a new module, or a new shared dependency. It is the same
`node:test` + `node:assert/strict` + `node:fs` pattern every existing guard file already uses.

---

## 3. Invariants protected

```text
no artifact becomes the authority for "what Aurora understands" (Spec 046 §6.2, generalizing AC20's own intent
  beyond src/modules/) ·
projection ≠ source of truth · projection ≠ new aggregate · derived ≠ authoritative ·
AC20 pass ≠ architectural-intent proof · declared ≠ inferred · honest absence ≠ mock data ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Reusable checklist (the deliverable)

`[DECISION]` Every future Experience Projection's local guard suite must include, at minimum, one test per
row — reusing athlete-home's own test as the worked, already-passing example of each:

| # | Check | What it proves | Athlete-home's existing instance |
| --- | --- | --- | --- |
| G1 | No framework/server/runtime token anywhere in production files of the surface | The surface stays a rendering of state, never a runtime | NC1 |
| G2 | No production file (excluding an explicitly-labeled sample/demo path) imports all 4 AC20 surface substrings | Extends AC20's own discipline outside `src/modules/` | NC2 |
| G3 | The render/output layer imports **no** `src/modules/` path at all — only its own view-model types | Reasoning cannot leak into the last-mile output step | NC3 |
| G4 | The assembler's core-module imports are `/index.ts` (public surface) only, never an internal file | No reach into aggregate internals | NC4 |
| G5 | Every core-module import line in the assembler/view-model is literally `import type` | Structurally impossible to execute domain behavior — not just a promise | NC4b |
| G6 | No call-shaped domain-execution token (gate names, `openHypothesis(`, `detectSignals(`, `evaluateDecisionSupportCase(`, `Math.`, `score`, `percent`, etc. — the exact evidenced set for the surface) appears in any non-sample production file | No re-derivation of a value the domain already computed (Spec 046 §9.3/§10.3) | NC5 |
| G7 | If a demo/sample scenario exists, no production file (including the public barrel) references it | Demo composition never becomes a public production seam | NC6, NC12 |
| G8 | If a demo/sample scenario exists, it is importable **only** from the surface's own `tests/` and `sample/` paths — full-repo scan, not just local | Closes the exact seam Spec 045 found, generalized | NC13 |
| G9 | The demo/sample scenario (if any) is explicitly labeled as sample, non-production, in its own banner comment | No silent mock passed off as real data | NC7 |
| G10 | No new forbidden `src/` top-level directory name (`ui`/`api`/`adapters`/`infrastructure`/`frontend`/`web`/`server`) appears anywhere in the repo | No accidental runtime-shaped sibling directory | NC8 |
| G11 | `package.json` dependencies/devDependencies are byte-for-byte the pre-existing set | No dependency creep riding in on a presentation change | NC9 |
| G12 | **Reverse-import rule**: no file under `src/modules/` or any other product surface references this surface | The core, and other surfaces, never depend on this projection for their own correctness | NC10 |
| G13 | Every branch that renders an `inferred`-epistemic value pairs it with a visible epistemic marker | Inference is never silently presented as fact | NC11 |
| G14 | No `AthleteDecision`-creating call (`recordAthleteDecision`, `amendAthleteDecision`, `athleteDecision(`) appears in any non-test file of the surface | Click/press/silence never become a decision (Spec 046 §10.8) | NC14 |

`[DECISION]` G1–G14 are the **minimum**. A future surface may need additional, surface-specific checks (e.g., a
different set of call-shaped tokens for G6, once `CurrentState`/`Capacity`/`Trajectory` exist) — those are
**additive**, never a substitute for the fourteen above.

---

## 5. How type-only / caller-supplied is validated (G5, generalized)

`[DECISION]` Two independently sufficient, mechanically checkable shapes satisfy Spec 046's "never a runtime
value-import" condition:

```text
(a) import type { X } from ".../modules/<surface>/index.ts";     — every line touching a core module MUST
                                                                     start with the literal token
                                                                     "import type" (G5's exact assertion:
                                                                     line.trimStart().startsWith("import type"))

(b) readonly someField?: string | undefined;                     — a plain, caller-supplied primitive
                                                                     (string/number/boolean/closed-union) on
                                                                     the projection's OWN input interface,
                                                                     never a domain object reference
```

A file may use (a), (b), or both, freely — what it may **never** do is a bare `import { X } from
".../modules/.../index.ts"` (no `type` keyword) for anything beyond what a pure type needs, because that is a
runtime value import capable of executing domain code.

---

## 6. How the whole-core-composer pattern is avoided

`[DECISION]` Three independent, stacked defenses — losing any one still leaves the other two intact:

```text
1. AC20 itself (src/modules/ only)      — G2 extends its literal 4-surface substring check outside
                                           src/modules/, to every production file of the surface.
2. The 3-of-4 rule (Spec 046 §5.C.2)     — no single Experience Projection file may import more than THREE
                                           of {observation, reasoning, understanding, decision-support}
                                           even as types, in the SAME file. Athlete-home's assembler already
                                           satisfies this (athlete/understanding/decision-support — never
                                           observation or reasoning).
3. Per-surface scoping (Spec 046 §6.4)   — no Experience Projection may be imported/reused by a second
                                           product surface (G12's reverse-import check, extended: a future
                                           second surface's own guard must assert it does NOT import the
                                           first surface's projection files).
```

---

## 7. How UI-side reasoning is avoided

`[DECISION]` G5 (type-only imports) makes it **structurally impossible** to call a domain function at all — the
strongest defense. G6 is the **evidenced-token backstop** for the cases G5 cannot catch (a caller-supplied
plain string could still, in principle, be transformed by hand-rolled logic that duplicates a domain
computation — e.g., re-deriving "is this stale" via a date comparison instead of reading `Staleness.status`).
G6's token list must be **evidenced from the actual domain vocabulary already in the codebase** (exactly as
athlete-home's list — `evidenceGate`, `maxVoiceForCeiling`, `claimConfidence(` — traces to real
`decision-support`/`reasoning` symbols), never a generic ban invented in the abstract.

---

## 8. How absence, provenance, and confidence are preserved

`[DECISION]` No NEW guard mechanism is needed here — G6's ban on re-derivation (§7) already forces provenance/
confidence/staleness to be **carried through**, not recomputed, because recomputing them is exactly what G6
forbids. Absence is covered by G13 (every inferred value visibly marked) plus the Spec 046 §8 partial-knowledge
vocabulary (`available`/`unknown`/`stale`/`withheld`/`not-yet-modeled`) — a future guard MAY additionally assert
that these five words (and no others, e.g. no bare `null`/generic `"unknown"` string outside that closed
vocabulary) are the only absence-representation tokens used, mirroring how athlete-home's `NotYetModeledSection`
today is a closed, named union rather than a free-form nullable field. This is recorded as a **recommended G15
for any future surface that reaches Current State/Capacity/Trajectory**, not added to athlete-home today (it
has no such field yet to guard).

---

## 9. Experience Projection vs. application service — the exact difference

`[DECISION]` Both are composition layers over injected/caller-supplied inputs; the difference is what they are
FOR and what they may touch:

| | Application service (e.g. `orchestrateRenderDeliver`) | Experience Projection (e.g. `assembleAthleteHome`) |
| --- | --- | --- |
| Home | `src/modules/application-orchestration/` — inside AC20's `ALLOWED_MODULES` | Outside `src/modules/` entirely (`src/<surface-name>/`) |
| Composes | `rendering`/`delivery`/`event-recording` — **downstream** modules | Already-produced **upstream** domain outputs, as types/caller-supplied data — never their producing functions |
| Imports upstream domain (`observation`/`reasoning`/`understanding`/`athlete`) | **Zero**, structurally forbidden (§1, `explicit-orchestration-negative-capability.test.ts`) | Up to 3-of-4, **type-only** (§6) |
| Produces | A delivery/rendering **outcome** (side-effecting, drives what actually happens next) | A **read-only view shape** for one screen/surface — never drives a side effect |
| Persists / triggers delivery | Yes (its whole purpose) | Never (G14's AthleteDecision ban is one instance of a broader "no side effect" rule) |
| Reused across products | Designed to be the one shared composition core the whole application uses | Explicitly **not** shared across surfaces (§6.3) |

`[DECISION]` If a future layer needs to do BOTH — compose downstream delivery AND compose an upstream
presentation view — that is evidence for a **new, separate** boundary decision, not a reason to blur this
distinction or extend either existing one.

---

## 10. Guard-test structure (pattern, not shared code — §1)

`[DECISION]` Every future Experience Projection's guard file should follow this **template shape** — copy the
pattern into the surface's own `tests/` directory, exactly as athlete-home's file already does; do not import
it from a shared module (§1):

```text
// <surface>-negative-capability.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));      // <surface>/tests
const surfaceDir = join(here, "..");
const srcDir = join(surfaceDir, "..");
const repoRoot = join(srcDir, "..");

function collectTsFiles(dir) { /* identical directory walk as every existing guard file */ }
const productionFiles = () => collectTsFiles(surfaceDir).filter((f) => !f.includes("/tests/"));

test("G1 ...", () => { /* §4 row G1 */ });
test("G2 ...", () => { /* §4 row G2 */ });
...
test("G14 ...", () => { /* §4 row G14, only if the surface has an AthleteDecision-adjacent concern */ });
```

`[FACT]` This is not a new pattern invented here — it is the literal shape of
`src/athlete-home/tests/athlete-home-negative-capability.test.ts`, copy-pasted as a template with `<surface>`
substituted. No shared import, no new file outside the future surface's own `tests/` directory.

---

## 11. Applying the pattern to athlete-home (verification, not a new guard)

`[FACT]` Athlete-home already satisfies G1–G14 in full — this section is a mapping, not new work:

```text
G1  -> NC1     G6  -> NC5     G11 -> NC9
G2  -> NC2     G7  -> NC6/NC12 G12 -> NC10
G3  -> NC3     G8  -> NC13    G13 -> NC11
G4  -> NC4     G9  -> NC7     G14 -> NC14
G5  -> NC4b    G10 -> NC8
```

No test is added, renamed, or modified by this tech spec. `node --test` confirms all 14 remain green (§13).

---

## 12. Applying the pattern to a future Athlete Surface Projection — worked through, not implemented

`[DECISION]` If a second product surface were ever opened (this tech spec does **not** open one), the checklist
would apply as follows — stated to prove the pattern generalizes, without writing a single line of the surface
itself:

```text
Home                  : src/<surface-name>/ (sibling to athlete-home and operator-runtime, NOT inside
                         src/modules/, per Spec 046's own precedent).
G2/G6 token evidence   : re-derived from whatever NEW domain vocabulary that surface's inputs actually use
                         (e.g. if it consumed a future CurrentState projection, G6 would ban re-deriving
                         `StateSnapshot`'s own staleness/validity-window logic, exactly as it bans
                         re-deriving UnderstandingLevel's meaning today).
G12 reverse-import      : MUST additionally assert the new surface does not import athlete-home's projection
                         files, and that athlete-home's guard (NC10-equivalent) is extended to also forbid
                         the reverse — no product surface may depend on another product surface's projection.
G3-G5 (type-only)       : unchanged in shape — the new surface's own assembler would type-import ≤3 of the 4
                         AC20 surfaces, exactly like athlete-home's, with anything deeper as caller-supplied
                         data (Spec 046 §9.1/§9.6).
What stays out of scope: implementing the surface, choosing its rendering technology, wiring a production
                         caller for its inputs (Spec 046 §16 open question #1), and implementing any of
                         CurrentState/Capacity/Trajectory it might eventually want to show.
```

This confirms the checklist is surface-agnostic **before** any second surface exists — exactly the evidence
Spec 046 §17 asked this tech spec to produce.

---

## 13. Forbidden patterns (this tech spec, and binding on every future guard suite built from it)

```text
shared guard-utility module · shared cross-surface Experience Projection object · runtime (non-type) import
of a core module beyond what a type needs · more than 3-of-4 AC20 surfaces imported in one file · re-deriving
a domain-computed value instead of reading it · a projection depended on by another product surface · a
projection triggering delivery/persistence/AthleteDecision · a new src/ top-level layer named ui/api/adapters/
infrastructure/frontend/web/server · a new dependency · a frontend framework · an HTTP server/API · a
production whole-core composer · CurrentState/CapacityProfile/ImpactAssessment implementation · AC20
modification · weakening any existing NC1-NC14 assertion
```

## 14. Allowed patterns

```text
a local, per-surface guard file in the surface's own tests/ directory, copying the §10 template · type-only
imports of ≤3 of the 4 AC20 surfaces · caller-supplied plain-value inputs for anything deeper · translating an
already-produced enum/reason-string into human language via a closed, evidenced lookup table · an explicitly-
labeled, isolated sample/demo scenario confined to tests/+sample/ paths · additive, surface-specific guard
rows beyond G1-G14 (never fewer) · reusing the exact G1-G14 checklist verbatim as the acceptance bar for any
future surface's own guard suite
```

---

## 15. Next recommended slice

`[DECISION]` **None opened by this tech spec.** The correct next step, if and when pursued, is only ever one of
the open questions Spec 046 §16 already recorded (a real production caller for Direction/Purpose + Attention/
Decision Support; a real `CurrentState`/`CapacityProfile`/`ImpactAssessment` domain decision; a second product
surface with real requirements) — each is its own future, evidence-gated spec. This tech spec adds no new
capability; it only makes the existing decision checkable.

---

## 16. Required Acceptance Criteria (Given / When / Then)

```text
Given athlete-home's 14 existing guard tests, when mapped against G1-G14, then every row has a real, currently-
  passing instance (§11) — the checklist is not aspirational.

Given no shared guard-utility module exists in this repository today, when this tech spec is written, then it
  does not create one, and states explicitly why (§1).

Given a hypothetical second product surface, when the checklist is applied on paper (§12), then it generalizes
  without requiring any new architectural concept beyond what Spec 046 already decided.

Given this is a technical specification, when the diff is inspected, then it is docs-only: no source, test, or
  package file changed (§17).
```

---

## 17. Validation

`tsc --noEmit` clean; `node --test` **1156/1156** (unchanged — this tech spec is docs-only; all 14 existing
athlete-home guard tests re-verified green, none modified). No source/test/sample/guard/package file touched;
AC20 untouched and unamended; no frontend framework, HTTP server, API, production whole-core composer, domain
model, or shared guard-utility module added.
