# Aurora — Roadmap Status Checkpoint (post Implementation 045-A)

> **Status (2026-07-07).** Docs-only roadmap checkpoint. **Not a spec.** No code, no test, no sample,
> no guard, no export, no package change; no screen added or redesigned; no framework
> (React/Vite/Next/Tailwind) selected; no HTTP/API/server/auth; no production query layer or
> composition owner; no CurrentState/CapacityProfile/ImpactAssessment implementation; no
> AthleteDecision capture; AC20 untouched. It closes the **Athlete Home prototype-isolation arc**
> (UI-001, Spec 045, Tech Spec 045-A, Impl 045-A) and states, per lane, exactly what evidence is
> required before continuing. Validation at authorship: `tsc --noEmit` clean; `node --test`
> **1136/1136**. Prior checkpoint: `...POST_044G.md` (`2796f3f`).

---

## 1. The arc just closed

```text
UI-001                — Athlete Home prototype (first athlete-facing slice)          (fa1d12e)
  → Spec 045          — Athlete Reflection UI Boundary (audit + classification)      (5dc4ffa)
  → Tech Spec 045-A   — Athlete Home Prototype Separation Plan                       (c5a93ea)
  → Impl 045-A        — Isolate Athlete Home Prototype Sample                        (11ed9a8)
```

`[FACT]` This is the first arc in the repository that produced **product-design evidence** — a
visual, athlete-facing prototype — and the first that required a post-hoc boundary audit of its own
output. The audit found exactly one real seam, closed it with a one-line de-export plus static
guards, and preserved everything useful. **1136/1136**; `tsc --noEmit` clean; AC20 untouched
throughout.

---

## 2. Historical sequence — what actually happened

`[FACT]` **UI-001 — initial prototype** (`fa1d12e`): introduced the typed `AthleteHomeViewModel`,
the pure assembler, the framework-free HTML renderer, the sample scenario, the development page
generator, and 31 prototype/negative-capability tests. Its discovery phase established the
structural facts that shaped everything after:

```text
no frontend runtime · no framework · no HTTP/API/server · no production cross-aggregate
composition owner ·
CurrentState: not implemented · CapacityProfile: not implemented · ImpactAssessment: not implemented
```
while, on the implemented side:
```text
Purpose: implemented · UnderstandingAssessment: implemented ·
DecisionSupportCase / TerminalOutput: implemented
```

`[FACT]` **Spec 045** (`5dc4ffa`) — decision: **UI-001 is a mixed prototype state requiring
separation.** Audit findings: renderer = safe prototype presentation; view model = safe prototype
presentation contract; assembler = pure, with **type-only** core dependencies; sample scenario =
legitimate demo/test-harness CONTENT — but **publicly exposed** by the athlete-home barrel. The
critical finding: the sample executes a near-whole-core chain
(Athlete + Observation → Signal → Hypothesis → Understanding → Decision Support) and imports five
public surfaces. AC20 technically passed only because its scan boundary is `src/modules/` and
`src/athlete-home/` sits outside it:
```text
technical AC20 pass ≠ architectural-intent proof
```

`[FACT]` **Tech Spec 045-A** (`c5a93ea`) — selected **Option B: de-export + static importer
confinement.** Explicitly rejected: sample move (churn without added enforcement), sample deletion
(20 of 31 tests and the real-gate-selected Reflection voice depend on it), UI revert (nothing
broader was wrong), and creating a new production composition owner (no evidence).

`[FACT]` **Implementation 045-A** (`11ed9a8`) — exact result:

```text
sampleAthleteHomeViewModel : removed from the public barrel (its only sample export)
sample location             : unchanged — src/athlete-home/sample/
current consumers           : required ZERO updates (all already imported by direct relative path)
allowed sample importers    : src/athlete-home/tests/** and src/athlete-home/sample/**
forbidden                   : everything else in src/ (statically guarded, full-src scan)
validation                  : 1136/1136 (1132 prior + 4 new guard tests; all 31 prior UI-001
                              tests green; one comment-only reword for guard hygiene)
```

---

## 3. Current classification — what Athlete Home IS and IS NOT

`[FACT]` **Athlete Home is NOT a production UI.** Component by component:

```text
view model         : prototype presentation contract. Does NOT imply a query layer, a persistence
                     model, or a production API contract.
assembler          : pure prototype presentation assembler. Does NOT execute domain behavior
                     (type-only core imports, now structurally guarded), own production
                     composition, query repositories, or compose the whole core.
renderer           : prototype HTML renderer. Does NOT select a production frontend stack, a
                     browser runtime, or a deployment mechanism.
sample scenario    : isolated development/demo harness. May execute the real near-whole-core chain
                     ONLY inside its confined prototype role. It is NOT a production composer, a
                     query service, a runtime entry point, or a product backend.
generated artifact : development visual evidence — gitignored, never tracked, not a product surface.
```

---

## 4. Isolation result — the exact seam closed and the enforcement added

`[FACT]` The seam:
```text
before : src/athlete-home/index.ts publicly exported sampleAthleteHomeViewModel
         -> near-whole-core demo composition one import away from accidental production reuse
after  : sample export removed from the barrel; sample content, location, and consumers unchanged
```

`[FACT]` Enforcement added (all in the existing athlete-home negative-capability suite):

```text
no sample public export                : NC12 — barrel exports no sample symbol and no /sample/ path
sample importer allowlist              : NC13 — sample importable only from athlete-home tests/ and
                                         sample/ (scans all of src/)
renderer purity reinforcement          : NC3 — renderer also never references
                                         operator-runtime/provider/delivery
assembler import-type enforcement      : NC4b — every core import in view-model files must be
                                         `import type`
non-sample core-execution prohibition  : NC5 — call-shaped core-execution tokens banned across all
                                         presentation files and the barrel
no AthleteDecision in athlete-home     : NC14 — no non-test file references decision-creation APIs
runtime-smuggling protection           : NC1 — retained unchanged (verified sufficient)
```
```text
4 new tests · 3 reinforced tests · current validation 1136/1136
```

---

## 5. AC20

`[FACT]` **AC20: unchanged.** Not expanded, not amended, not weakened; scan boundary and allowlist
exactly as before this arc.

The new LOCAL prototype guards protect: athlete-home sample exposure, athlete-home dependency
boundaries, and athlete-home execution boundaries. They do **not**: replace AC20, expand AC20,
amend AC20, or prove product readiness.
```text
dedicated prototype isolation guard ≠ AC20 amendment
```

---

## 6. Current usable prototype path

```text
caller-supplied section inputs (CurrentPurposeView, UnderstandingAssessment[], TerminalOutput?)
  -> pure Athlete Home assembler (assembleAthleteHome)
  -> AthleteHomeViewModel (loading / error / ready; per-section discriminated states)
  -> HTML renderer (renderAthleteHomePage)
  -> generated prototype artifact (gitignored athlete-home.html)
```

Isolated demo path (development only):
```text
development-only sample scenario (confined to tests/ + sample/)
  -> real domain/application chain (declarePurpose -> intake -> signals -> hypothesis ->
     understanding -> decision-support, through the real gates)
  -> caller-style prototype inputs
  -> assembler -> renderer
```
`[FACT]` **The sample path is not a production runtime.** It is invoked only as
`node src/athlete-home/sample/generate-athlete-home-page.ts` (no package script, no scripts/
allowlist entry, no server).

---

## 7. Product-design principles proven by this arc

1. Athlete Home can be designed without becoming a metrics dashboard.
2. Purpose can be shown as declared athlete material ("declarado por vos"), never inferred.
3. Aurora inference can be labeled visibly as interpretation ("interpretación de Aurora").
4. Honest absence can be shown instead of fabricated CurrentState, Capacity, or Trajectory data.
5. Qualitative uncertainty can be presented in sober human words, without fake percentages.
6. Decision Support can be shown without making Aurora the decision-maker ("Aurora no decide por
   vos"; imperative copy is test-banned).
7. A prototype can use REAL domain behavior (real gates chose the Reflection voice) without
   promoting that composition into production ownership.
8. Presentation code can remain isolated from domain execution (type-only imports, structurally
   guarded).
9. UI design evidence can exist BEFORE selecting a frontend stack.
10. Prototype isolation can be strengthened without weakening AC20.

---

## 8. Missing domain models

```text
CurrentState     : not implemented (docs/domain-modeling only)
CapacityProfile  : not implemented (docs/domain-modeling only)
ImpactAssessment : not implemented (docs/domain-modeling only)
```
Current prototype disposition: **honest `not-yet-modeled` states allowed** — the page says "Aurora
todavía no tiene un modelo para esto" and names the missing model behind a fold.
```text
honest absence ≠ mock data · prototype display of absence ≠ domain implementation
```
No domain mission is opened by this checkpoint.

---

## 9. Epistemic presentation

Current prototype tags: `declared` / `inferred`. Disposition: **useful current presentation
distinction** — it preserves the one line that must never blur (athlete-owned vs. defeasible).
Limitation, documented and standing:
```text
declared/inferred ≠ complete representation of Observation · Signal · Evidence · Hypothesis ·
Understanding
```
No epistemic-taxonomy implementation mission is opened.

---

## 10. What is now proven

1. A useful Athlete Home visual prototype exists.
2. The prototype renders loading/error/ready states.
3. The prototype distinguishes declared and inferred presentation material.
4. It represents missing domain capability honestly.
5. Renderer code is isolated from runtime-domain execution.
6. The assembler remains pure; core dependencies remain type-only (now structurally guarded).
7. The near-whole-core sample is no longer publicly exported.
8. Sample imports are statically confined to an explicit allowlist.
9. The visual-generation path still works after isolation (re-run and verified).
10. Existing consumers required no migration.
11. AC20 remained unchanged.
12. No production UI runtime was selected.
13. No production composition owner was created.
14. No AthleteDecision capture was introduced.
15. **Prototype success does not prove production UI architecture** (§12).

---

## 11. What remains intentionally unselected

```text
no production Athlete Home ·
no frontend framework · no React · no Vite · no Next · no Tailwind ·
no browser runtime selection ·
no HTTP server · no API · no router · no auth ·
no session identity · no athlete lookup ·
no persistence/query layer · no production presentation-input transport ·
no production cross-aggregate composition owner ·
no CurrentState implementation · no CapacityProfile implementation ·
no ImpactAssessment implementation ·
no interactive AthleteDecision capture ·
no deployment target for UI ·
no production whole-core composer
```
Each was evaluated at least once across Spec 045 / Tech Spec 045-A and explicitly deferred for lack
of evidence — not overlooked.

---

## 12. Unresolved decision lanes — recorded, not opened as missions

```text
Product design        : is the current visual hierarchy/content actually useful to the athlete?
  evidence needed      : visual review, prototype interaction, athlete feedback.

Production input      : what safe contract should a future production Athlete Home consume?
  current candidate    : AthleteHomeViewModel constructed from caller-supplied section inputs.
  but                  : the production composition owner remains unselected (Spec 045 ownership E).

Frontend runtime      : unselected. Requires actual product need, delivery mode, interaction model,
                        deployment constraints.

Missing domain models : CurrentState / CapacityProfile / ImpactAssessment remain separate DOMAIN
                        questions with their own evidence bars.

AthleteDecision       : remains separate and athlete-declared — never created from intake, review,
                        or UI interaction.
```
None of these is turned into a recommended next mission by this checkpoint.

---

## 13. Evidence gates for future work

| Lane | Evidence required before opening |
| --- | --- |
| **Another product-design iteration** | An actual visual review with a specific comprehension, hierarchy, or copy problem — not another screen from possibility alone. |
| **Presentation-input boundary (Spec 046)** | An explicit decision that connecting real production data is now the priority; must answer what contract is consumed and who constructs it WITHOUT introducing whole-core composition. |
| **Frontend framework selection** | A production UI actually selected, plus interaction needs, delivery target, and build/deployment constraints — prototype HTML alone is insufficient. |
| **HTTP/API** | A selected product runtime, a real transport need, and auth/privacy decisions. |
| **CurrentState / Capacity / Impact-Trajectory** | Separate domain evidence and separate domain specs — not UI pressure. |
| **AthleteDecision interaction** | A separate boundary proving click ≠ AthleteDecision and defining athlete-declared commitment semantics. |
| **Production composition owner** | An explicit architecture decision in its own spec — must never arise implicitly from UI needs. |

---

## 14. Allowed future missions — only if evidence appears

```text
Product Design Review 045-C — Athlete Home Visual/Comprehension Review     (needs: visual review)
Specification 046          — Athlete Home Presentation Input Boundary       (needs: real-data
                                                                              priority decision)
Specification [TBD]        — Current State Domain Boundary                  (needs: domain evidence)
Specification [TBD]        — Capacity Domain Boundary                       (needs: domain evidence)
Specification [TBD]        — Impact / Trajectory Domain Boundary            (needs: domain evidence)
Specification [TBD]        — Athlete Decision Interaction Boundary          (needs: interaction
                                                                              boundary evidence)
```
None is recommended automatically; no framework/runtime/backend is selected by default. Listing is
a map of legible re-entry points, not a queue.

---

## 15. Central distinctions (carried through the whole arc)

```text
prototype ≠ production UI · visual evidence ≠ runtime selection · view model ≠ query layer ·
assembler ≠ production composition owner · sample harness ≠ production composer ·
de-exported sample + confinement ≠ product readiness · honest absence ≠ mock data ·
not-yet-modeled ≠ implemented · declared ≠ inferred ·
declared/inferred ≠ complete epistemic chain · rendered option ≠ AthleteDecision ·
click ≠ AthleteDecision · AC20 pass ≠ UI architecture approval ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 16. Recommendation

`[RECOMMENDATION] Pause after prototype isolation.`

- **Current confirmed state.** The Athlete Home prototype is now useful product-design evidence and
  its near-whole-core sample is isolated from public reuse: de-exported, import-confined, guarded —
  with renderer, view model, assembler, content, and the visual-generation path preserved exactly.
  **1136/1136**; `tsc --noEmit` clean; AC20 intact.
- **Do not build another screen.**
- **Do not select a frontend framework.**
- **Do not invent a backend or production composition owner.**
- **The next mission should begin only from one of two concrete priorities:**
  1. **visual/product review of the existing prototype** (Product Design Review 045-C) — does the
     hierarchy actually answer "¿qué entiende Aurora de mí hoy?" for a real reader; **or**
  2. **an explicit decision that connecting real production inputs is now more important than
     further design iteration** (Specification 046 — Athlete Home Presentation Input Boundary).
- **What must remain protected during the pause.** AC20 intact; the sample stays confined (NC12/
  NC13); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/delivery/
  AthleteDecision; inference never presented as fact; all Spec/Tech-Spec/checkpoint documents and
  the athlete-home source remain untouched, never rewritten.

---

## 17. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1136/1136**. AC20 unchanged; no production whole-core
composer; no `reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created
automatically; no `runOperatorSession`/delivery/AthleteDecision triggered by intake, review, or the
prototype; no parser (CSV/FIT/TCX) or Garmin integration; no frontend framework, browser runtime,
HTTP/API/server/auth, persistence/query layer, or production composition owner; no
package/dependency/runtime/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
