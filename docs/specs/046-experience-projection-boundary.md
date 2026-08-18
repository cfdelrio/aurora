# Aurora — Specification 046 — Experience Projection Boundary

> **Status (2026-07-08).** Specification phase. Architecture-discovery-first, decision-if-warranted. This
> document is **behavioral/architectural only**: it implements no code, adds no test, adds no frontend
> framework (React/Next/Vite/Tailwind or any other), adds no HTTP server, adds no API, creates no production
> whole-core composer, implements no `CurrentState`/`CapacityProfile`/`ImpactAssessment` domain model, adds
> no dependency, and weakens no guard (AC20 above all). It answers one question — *how may a product surface
> read a composed understanding of the athlete without becoming, or requiring, a central authority over
> Aurora's bounded contexts* — and, because the evidence turns out to be sufficient, it **decides**. Base at
> authorship: `tsc --noEmit` clean; `node --test` **1156/1156**. Working tree clean; HEAD `2fa1115`.
>
> **Naming note.** This document was informally referred to in prior conversation turns as
> "UI-000" and, separately, a *different*, Athlete-Home-specific, athlete-review-gated decision was informally
> reserved as "Specification 046 — Athlete Home Presentation Input Boundary" (see
> `docs/product-design/045-E-athlete-home-comprehension-verification-review.md` §"Presentation Input Boundary
> rule" and the athlete-review protocol package). **This is not that decision.** This spec answers the
> general architecture question — how ANY future product surface may legitimately read Aurora — which is a
> *prerequisite* to, not a substitute for, the Athlete-Home-specific, evidence-gated decision about connecting
> real production data to Athlete Home. That decision remains separately gated behind real athlete-review
> evidence and is not opened, prejudged, or unblocked by this spec. If a numbering collision is ever
> discovered, this file may be renumbered without changing its content.

---

## 0. Phase confirmation

This is the **Specification** phase — architecture discovery first, a decision only because the evidence
(mostly already sitting in the repository, some of it already implemented and load-bearing) turned out to be
sufficient. It implements no code. It selects no frontend technology. It creates no server, no API, no
production whole-core composer, and no new `src/modules/` entry.

---

## 1. Problem

> ¿Cómo puede Aurora presentarle al atleta una comprensión compuesta de su situación sin crear una autoridad
> central que atraviese, posea o colapse todos los bounded contexts?

`[FACT]` The tension is real and was produced by two lines of prior work landing at the same seam from
opposite directions:

1. **Athlete Home (UI-001, Specs 045/045-A/045-C/045-D/045-E, Impl 045-F)** proved, as a prototype, that a
   single screen can meaningfully answer "what does Aurora understand about me" only by drawing on **more
   than one** bounded context at once — Purpose (`athlete`), Understanding (`understanding`), and Attention
   (`decision-support`) — and that doing so with real domain outputs (not mocks) produces something an athlete
   demonstrably understood in a real review session (`docs/product-design/045-athlete-home-athlete-review-session-A01.md`).
2. **AC20** (`src/modules/__tests__/end-to-end-responsible-reflection.test.ts`) exists precisely to forbid a
   single production file from becoming the place that reads all four core module surfaces and speaks for
   Aurora as a whole.

These are not actually in conflict — but nothing in the repository, until this spec, said *why not*, in
architectural terms precise enough to build a second, third, or tenth product surface without re-deriving the
answer from scratch or accidentally violating it. That is the gap this spec closes.

---

## 2. Current architectural facts (verified against the real repository)

`[FACT]` **AC20's exact mechanism** (`end-to-end-responsible-reflection.test.ts:368-442`), read as code, not
paraphrase:

```text
modulesDir = src/modules/                                    (the ENTIRE scan root)
ALLOWED_MODULES = { observation, reasoning, understanding, decision-support,
                     athlete, event-recording, rendering, delivery, application-orchestration }
MODULE_SURFACES = ["observation/index", "reasoning/index", "understanding/index", "decision-support/index"]

AC20-a: every directory directly under src/modules/ must be in ALLOWED_MODULES or be "__tests__".
AC20-b: no PRODUCTION .ts file under src/modules/ (excluding *.test.ts, __tests__/, tests/) may contain
        ALL FOUR literal substrings "observation/index", "reasoning/index", "understanding/index",
        "decision-support/index" anywhere in its source text.
AC20-c: no exported line in the four surfaces' own index.ts may match
        /\b(ui|api|http|database|persistence|eventbus|llm|openai|anthropic)\b/i.
```

`[FACT]` AC20-b is a **literal text scan of import specifiers**, not a transitive-composition analysis, and
it does **not** distinguish `import type` from a runtime `import`. It also only scans `src/modules/` — it has
no visibility into `src/athlete-home/`, `src/operator-runtime/`, or any future sibling directory.

`[FACT]` `application-orchestration` (Impl 025) carries a **strictly stronger** guard than AC20 itself
(`application-orchestration/tests/explicit-orchestration-negative-capability.test.ts:133-135` and
`external-renderable-admission-negative-capability.test.ts:100`): its production files may **import none** of
`observation`/`reasoning`/`understanding`/`athlete` — not "not all four together," but **zero of them**,
period. `application-orchestration` composes only the **downstream** modules (`rendering`/`delivery`/
`event-recording`) over **injected** collaborators; anything upstream-domain-derived must already be handed
to it by a caller.

`[FACT]` **Three real precedents already exist for "how a surface reads Aurora without owning it"**, of
increasing directness:

```text
1. operator-runtime  → imports ONLY application-orchestration/index.ts (a single pre-composed
                        OperatorSessionEnvelope). Zero upstream-domain imports of any kind.
2. athlete-home       → assemble-athlete-home.ts imports EXACTLY THREE of the four AC20-guarded surfaces
                        (athlete/index, understanding/index, decision-support/index — deliberately NEVER
                        observation/index or reasoning/index), and every one of those three imports is
                        `import type` — zero runtime value import of any core module. Anything deeper
                        (a hypothesis claim, an evidence reasoningNote) arrives as a CALLER-SUPPLIED plain
                        string (Spec 045 "Input C" shape), never fetched or derived by the assembler itself.
3. src/modules/__tests__/*  → the ONLY place that freely composes all four surfaces — explicitly exempted
                        from AC20-b by directory (`!f.includes("__tests__")`), and explicitly NOT production.
```

`[FACT]` **The domain-modeling docs already named the exact conceptual category this spec needs — before UI-001
ever existed.** `docs/domain-modeling/ATHLETE_AGGREGATE.md` Decision 5 (line 91): *"`CurrentState` is a
*projection*, assembled on demand from (a) inferred state from `Reasoning`/`Understanding`, (b) recent
`AthleteReport`s, (c) recency/decay metadata. Athlete does *not* store an authoritative current state."*
Decision 6 (line 102) does the same for `CapacityProfile`: *"a *projection* over the `Reasoning` context's
impact hypotheses... not a stored attribute of Athlete."* `docs/domain-modeling/CORE_REASONING_MODEL.md` Q4
(line 79) does the same for `ImpactAssessment`: *"not a separate aggregate — it is a read model / projection
that groups the impact hypotheses... for presentation... derived, never a source of truth."* Table (line 140):
*"ImpactAssessment | Projection / read model | Reasoning | ... Derived, never a source of truth."*

`[FACT]` None of `CurrentState`, `StateSnapshot`, `CapacityProfile`, `CapacityEstimate`, or `ImpactAssessment`
has an implemented production type anywhere in `src/`. They exist only as the domain-modeling decisions
quoted above.

`[FACT]` `Purpose` (`athlete/domain/purpose.ts`), `UnderstandingAssessment`
(`understanding/domain/understanding-assessment.ts`), and `TerminalOutput`
(`decision-support/domain/terminal-output.ts`) are fully implemented, each already carrying its own
confidence/provenance/defeasibility vocabulary (see §7 matrix).

`[FACT]` `src/` top level today: `athlete-home`, `modules`, `operator-runtime`, `shared-kernel` — **no other
top-level directory exists**; AC20 only scans inside `modules`.

---

## 3. Protected invariants (carried forward, unchanged by this spec)

```text
Aurora advises; the athlete decides · Aurora never presents inference as fact ·
declared ≠ inferred · claim confidence ≠ understanding confidence · Signal ≠ Evidence ·
Observation ≠ Signal ≠ Evidence ≠ Hypothesis ≠ Understanding ·
projection ≠ source of truth · projection ≠ new aggregate · derived ≠ authoritative ·
no production whole-core composer · AC20 pass ≠ architectural-intent proof (Spec 045 precedent) ·
honest absence ≠ mock data · not-yet-modeled ≠ implemented
```

---

## 4. Forces and tensions

1. **Coherence vs. composition.** An athlete-facing screen is more useful when it reads as ONE voice, not
   five disconnected widgets — but "one voice" must never mean "one owner of truth."
2. **AC20's literal text scan vs. its architectural intent.** A file can dodge the literal substring check
   (e.g., by importing only 3 of 4 surfaces, or by receiving the 4th as caller-supplied data) while still, in
   spirit, becoming the place "what Aurora understands" gets decided — if it starts re-deriving conclusions
   instead of relaying them. The guard is necessary but not sufficient; discipline must fill the gap the guard
   cannot literally express.
3. **Domain projections that don't exist yet vs. a screen that wants five areas today.** `CurrentState`/
   `CapacityProfile`/`ImpactAssessment` are DECIDED domain concepts with ZERO implementation. A presentation
   boundary cannot honestly show what doesn't exist, and must not quietly invent it to fill a layout.
4. **Reuse vs. proliferation.** If every future surface hand-rolls its own reading of the core from scratch,
   inconsistency and domain leakage risk grow with every new surface. If one shared "reader" is built instead,
   it risks becoming exactly the whole-core composer AC20 forbids, just under a friendlier name.

---

## 5. Alternatives considered

### A. Production whole-core composer

A single production file/module imports and composes `observation`+`reasoning`+`understanding`+
`decision-support` (± `athlete`) directly, producing one "what Aurora currently believes" object.

**Verdict: REJECTED.** Violates AC20-b literally (any such file trips the four-substring scan). More
importantly, it violates the **stronger, already-established** rule that even `application-orchestration` —
the single most privileged composition module in the repository — is explicitly forbidden from importing
*any* upstream domain module at all (§2). If the module built specifically to compose things cannot do this,
no future module should be granted more trust than it. It would also collapse the domain's own deliberate
separation of authority (Purpose is Athlete's; confidence is Understanding's; voice is Decision-Support's)
into one place, reintroducing exactly the "population for the person" / borrowed-confidence failure mode
`UNDERSTANDING_PROFILE_MODEL.md` names as Aurora's most dangerous error — just relocated to presentation.

### B. UI-side composition (ad hoc)

A future UI consults several module surfaces separately and composes them itself, with no shared discipline
or guard beyond what each engineer remembers to do.

**Verdict: REJECTED as a *pattern* (permitted only under the discipline in §6/C).** Real risks, each already
observed or narrowly avoided in this repository's own history:
- **Domain leakage** — nothing stops a UI file from importing an aggregate's *internal* module (not its public
  index) unless a guard says so; athlete-home needed its own Impl 045-A guards specifically because a
  near-whole-core sample was one import away from public exposure.
- **Reasoning duplication** — a UI re-deriving "is this stale," "what does this level mean," or "what's the
  confidence" via its own ad hoc logic instead of reading the domain's own field is precisely what athlete-home's
  NC5 guard (`humanizeUnderstandingReason`/`humanizeTraceReasons` may only *translate* an already-produced
  string, never compute a new one) was built to prevent.
- **Inconsistency** — two surfaces reading the same `UnderstandingLevel` could translate it into different
  human phrases with different implied confidence, silently disagreeing about what Aurora believes.
- **Accidental authority** — repeated, undisciplined UI-side composition normalizes "the UI decides what
  counts as Aurora's view," inverting who the domain says owns that authority.

### C. Experience-facing projection boundary

A thin, per-surface layer receives **already-legitimate outputs** — domain values passed in by a caller, or
type-only shapes of the domain's public surfaces — and reorganizes them for one specific reading experience,
producing no new inference and owning no state.

**Verdict: SELECTED (§9).** This is not hypothetical: it is the **generalization of code that already exists
and has already passed its own negative-capability guard suite** — `src/athlete-home/view-model/
assemble-athlete-home.ts`. The critical finding of this spec's analysis: **this alternative only actually
avoids AC20 — rather than merely renaming it — under four conditions**, all of which the athlete-home assembler
already satisfies and none of which AC20 itself enforces mechanically today (§10):
1. it never *value*-imports (runtime-imports) a domain application function — only types, or caller-supplied
   plain data;
2. it never imports more than **three** of the four AC20-guarded surfaces in a single file;
3. it is scoped **per product surface**, not shared as one universal object across all surfaces;
4. it performs no domain computation — no gate, no confidence derivation, no new hypothesis — only translation,
   grouping, ordering, and honest absence-labeling of values the domain already produced.
Violate any one of the four and Alternative C degrades into Alternative A wearing a nicer name — this is the
central risk the mission asked this spec to test, and the answer is: **real, but avoidable, and already being
avoided in the one place it has been tried.**

### D. Event-derived read model

A view is built exclusively from `event-recording`'s published events, never touching the aggregates directly.

**Verdict: NOT VIABLE with the current architecture — correctly out of scope, not merely deferred.**
`event-recording` (Impl 011/024) is **explicitly dependency-neutral** (imports only `shared-kernel`) and its
`DomainEventRecord` payloads are deliberately **ref-only** (`kind`/`id`/`role?`/`ownerModule?` — no raw draft,
no copied domain content, no confidence/provenance detail). Building a rich experience view from events today
would require either (a) a separate, explicitly-approved decision to make event payloads carry substantially
richer content than the current ref-only discipline allows — a real architecture change this spec does not
make — or (b) dereferencing each ref back to its owning aggregate at read time, which collapses back into
Alternative B/C with `event-recording` as an unnecessary extra hop. Not selected; not silently dismissed
either — its blocking fact is now on record.

### E. Keep surfaces separate (no unified Home)

Do not offer a unified multi-area screen at all; let each area (if and when implemented) get its own narrow
surface.

**Verdict: ORTHOGONAL, not rejected — a legitimate product choice this spec does not make.** This spec decides
**how** composition may happen **if a surface chooses to compose** — it does not decide **whether** any given
screen should. Athlete Home already chose to compose (as a prototype); a future surface may legitimately
choose not to. Both are compatible with the boundary this spec defines.

`[FACT]` No sixth alternative surfaced additional viable structure beyond A–E; C is selected as the smallest
change consistent with everything already proven.

---

## 6. Decision

`[DECISION]` **Alternative C, made precise: the Experience Projection pattern.**

An **Experience Projection** is a small, per-product-surface, pure mapping layer that turns **already-produced,
already-authorized domain outputs** into a shape one specific reading experience needs — never a new shared
object, never a new bounded context, never a source of truth, never a place where a new conclusion about the
athlete is reached. The name is not invented for this spec: it continues the domain's own vocabulary
(`ATHLETE_AGGREGATE.md`/`CORE_REASONING_MODEL.md` already call `CurrentState`/`CapacityProfile`/
`ImpactAssessment` "projections... derived, never a source of truth") combined with this repository's own
naming convention for architecture-boundary specs (031/032/033/045 each end in "...Boundary").

```text
                 Bounded contexts (athlete / understanding / decision-support / …)
                                          │
                    each context's OWN public index — already-authorized outputs
                    (Purpose, UnderstandingAssessment, TerminalOutput, and — once
                     implemented — the CurrentState/CapacityProfile/ImpactAssessment
                     domain projections ATHLETE_AGGREGATE.md/CORE_REASONING_MODEL.md
                     already decided belong INSIDE their owning context, not here)
                                          │
                          ▼ type-only shape (≤3 of 4 AC20 surfaces/file)
                          ▼ OR caller-supplied plain values (Input C shape)
                                          │
                 ┌────────────────────────────────────────────┐
                 │   EXPERIENCE PROJECTION  (per surface)      │
                 │   pure mapping · zero new inference         │
                 │   translates, groups, orders, labels        │
                 │   absence honestly (§8)                     │
                 └────────────────────────────────────────────┘
                                          │
                                  delivery surface
                          (rendering strategy — undecided, §12)
```

**and not:**

```text
UI
 ↓
WholeCoreComposer                          ← rejected (§5.A): forbidden by AC20's letter AND by the
 ├── Athlete                                 stricter application-orchestration precedent that even the
 ├── UnderstandingProfile                    repo's most privileged composition module may import NONE
 ├── Hypothesis                              of these upstream domain modules, not just "not all four."
 └── DecisionSupportCase
```

### 6.1 Why this direction, and what it rejects

- Alternative A is forbidden by AC20's letter and by the *stronger* precedent already governing
  `application-orchestration`.
- Alternative B is rejected as an undisciplined pattern; it is *absorbed into* C once the four conditions
  (§5.C) are made explicit and enforceable.
- Alternative D is not viable with the current event-payload discipline; reopening it requires its own,
  separate, explicitly-approved spec about event-payload richness.
- Alternative E is not rejected; it is orthogonal — a per-surface product decision this spec leaves open.

### 6.2 What invariant this protects

That **no single artifact ever becomes the authority for "what Aurora understands"** — the same invariant
AC20 protects for `src/modules/`, now made explicit and portable to every present and future product surface,
including ones AC20 cannot see (anything outside `src/modules/`).

### 6.3 What new capability this enables

A concrete, named, already-partially-proven pattern any future product surface can follow to compose more
than one bounded context's output honestly — without re-deriving the safety argument from first principles
each time, and without either (a) waiting for a hypothetical universal "Aurora API" that doesn't exist, or
(b) accidentally building a whole-core composer while trying to avoid exactly that.

### 6.4 What this explicitly does NOT enable

- It does not authorize implementing `CurrentState`, `CapacityProfile`, or `ImpactAssessment` — those remain
  separate, evidence-gated domain-modeling decisions (§4.3, §7).
- It does not authorize connecting Athlete Home (or any surface) to real production data — that remains the
  separately-gated Athlete-Home-specific decision this spec explicitly declines to be (see the naming note,
  top of document).
- It does not select a frontend framework, a runtime, an API, or a delivery mechanism (§12).
- It does not create a shared "AuroraExperienceProjection" object usable by every surface at once — that would
  reintroduce Alternative A's exact risk under a nicer name. Each surface gets its own, narrowly-scoped
  projection.

---

## 7. Q5 — the exact matrix: what Aurora can honestly show today

`[FACT]` Built from real source and real domain-modeling docs, not from documentation alone — each row states
explicitly whether the *system can produce* the knowledge, not merely whether the *concept is documented*.

| Area | Source of truth | Aggregate/model | Legitimate output today | Confidence/provenance carried | Reaches a surface without breaking boundaries? | What's missing | Gap type |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Direction/Purpose** | `Athlete` aggregate | `athlete/domain/athlete.ts` | `CurrentPurposeView` (`athlete/index`) — `declared`/`ambiguous`/`unknown` | Source is `athlete-declared`/`athlete-accepted` (never inferred); no separate confidence needed — it's declared, not a claim | **Yes** — proven in production-shaped prototype code today (athlete-home's assembler, type-only) | Nothing structural; a real `AthleteRepository` (not `InMemoryAthleteRepository`) for production use | None (implementation-complete; only a persistence-adapter gap, orthogonal to this spec) |
| **Current State** | *(none — projection, not stored)* | `CurrentState`/`StateSnapshot` — **decided, unimplemented** | *(none)* | *(none — would carry staleness/validity-window per `ATHLETE_AGGREGATE.md` Decision 5, once built)* | **No** — nothing to reach | The projection itself: assembled from Reasoning/Understanding + `AthleteReport`s + recency/decay metadata | **Domain** (the projection's own construction logic doesn't exist) |
| **Capacity** | *(none — projection, not stored)* | `CapacityProfile`/`CapacityEstimate` — **decided, unimplemented** | *(none)* | *(none — would carry confidence + staleness per `ATHLETE_AGGREGATE.md` Decision 6, once built)* | **No** — nothing to reach | The projection over Reasoning's impact hypotheses | **Domain** |
| **Trajectory** | *(none — projection, not stored)* | `ImpactAssessment` — **decided, unimplemented** | *(none)* | *(none — would be derived from live `Hypothesis` objects per `CORE_REASONING_MODEL.md` Q4, once built)* | **No** — nothing to reach | The read-model rollup of impact hypotheses for a period | **Domain** |
| **Attention/Decision Support** | `DecisionSupportCase` | `decision-support/domain/decision-support-case.ts` | `TerminalOutput` (`DecisionSupport`\|`Inquiry`\|`Withholding`) via `decision-support/index` | `TraceabilityChain`, gate-result reasons, explicit uncertainty (`uncertaintyVisible`), `VoiceMode` ≤ safe ceiling | **Yes** — proven in production-shaped prototype code today | A production caller that assembles a real `DecisionSupportCase` from real upstream evidence (today only test harnesses/the demo sample do this) | **Application** (composition-caller gap, not a domain gap) |

`[FINDING]` Two of the five rows are blocked by a **domain** gap (the projection itself was never built) and
cannot be unblocked by any presentation-layer decision, including this one. The other two available rows
(Direction/Purpose, Attention/Decision Support) are blocked only by an **application**-layer gap — no
production caller exists yet that legitimately assembles the real upstream evidence a real `DecisionSupportCase`
needs — which is a narrower, closer, but still separate and evidence-gated future decision, not opened here.

```text
"the concept exists in documentation" ≠ "the system can produce that knowledge" — proven row by row above.
```

---

## 8. Q4 — partial knowledge semantics (derived only from vocabulary the codebase already has)

`[DECISION]` An Experience Projection may represent, first-class, exactly these states — each traced to a
real type already in the codebase, none invented for layout convenience:

```text
available          — a real value exists (e.g. UnderstandingLevel != "Unknown"; a Purpose is declared)
unknown             — matches UnderstandingLevel's OWN "Unknown" rung (understanding/domain/understanding-level.ts)
                       — the domain's own vocabulary, not a presentation invention
stale               — matches Staleness.status "stale" (understanding/domain/staleness.ts) verbatim
withheld            — matches DecisionSupportCase's own Withholding terminal output — a domain-DECIDED silence,
                       never a presentation-layer guess at silence
not-yet-modeled     — the ONE state this layer is allowed to originate itself, because it is a claim about the
                       SYSTEM's implementation state ("this projection doesn't exist in code"), never a claim
                       about the ATHLETE's epistemic state. Already proven honest and non-alarming in real
                       athlete review (session A01: "Sí" — honesto/útil).
```

`[DECISION]` **`contradictory` is explicitly NOT added as a first-class rendered state by this spec.** Nothing
in the current domain model exposes a directly-held "contradictory" VALUE at the type level today — Understanding
has `contradiction` only as an `UnderstandingChangeReason` (a historical *reason a change happened*, not a
current state a projection could read). Adding it now would be exactly the kind of "designing arbitrary states"
the mission forbids. It becomes eligible only if/when a real domain type exposes a directly-held contradictory
value.

`[DECISION]` Absence must never silently become: `null`, generic `"unknown"` string, invented data, mock
content, or a value implied by chart/color/visual-only cues. Every one of the five states above must be
representable **in words**, exactly as `NotYetModeledSection`/`Staleness`/`Withholding` already are in the
athlete-home prototype.

---

## 9. Allowed responsibilities

```text
1. Receive already-authorized outputs — caller-supplied values, or type-only imports of ≤3 of the 4
   AC20-guarded surfaces per file.
2. Translate an already-produced enum/reason-string into human language (a closed, evidenced lookup table —
   as proven by assemble-athlete-home.ts's CHANGE_REASON_PHRASES / GATE_CLAUSES_BY_VERDICT).
3. Group and order already-decided content for one reading surface (a reading-experience concern).
4. Represent absence, staleness, and withholding honestly using the §8 vocabulary.
5. Carry provenance/confidence/defeasibility fields THROUGH, never dropping them, never flattening them into
   a single number or a plain "certain" claim.
6. Compose a template sentence that names, verbatim or near-verbatim, values the domain already produced —
   never asserting a new fact those values don't already support (the exact discipline Impl 045-D/045-F's
   "governing constraint" already established and tested for one surface).
7. Be scoped to exactly one product surface's needs; a second surface gets its own projection, not a shared one.
```

## 10. Forbidden responsibilities

```text
1. Opening more than 3 of the 4 AC20-guarded core surfaces as RUNTIME (non-type) imports in one file.
2. Calling any domain application function that executes reasoning (detectSignals, openHypothesis,
   updateUnderstandingFromOutcome, openDecisionSupportCase, evaluateDecisionSupportCase, or any equivalent
   future CurrentState/CapacityProfile/ImpactAssessment constructor).
3. Re-deriving a value the domain already computed (a confidence number, a staleness flag, a voice) instead
   of reading the domain's own field.
4. Producing a NEW conclusion about the athlete not already present in what it received.
5. Owning state, persisting anything, or becoming referenceable as a source of truth by any other module.
6. Being shared across more than one product surface as a single universal object.
7. Inventing a first-class absence state beyond §8 without a real domain type backing it.
8. Creating an AthleteDecision, calling a provider, calling delivery, or introducing any runtime/HTTP/API/
   auth/persistence surface (all explicitly out of scope for this spec regardless).
```

`[DECISION]` A future, per-surface **negative-capability guard suite** (mirroring athlete-home's existing NC1–
NC14) is the correct enforcement mechanism for §9/§10 — not a repo-wide AC20 amendment. This is deliberate and
explained in §11.

---

## 11. Relationship with AC20

`[FACT]` AC20-b's technical guarantee is exactly: *no production `.ts` file inside `src/modules/` contains all
four surface-index substrings.* That is narrower than this spec's architectural claim (§6.2: no artifact
anywhere becomes the authority for "what Aurora understands"), and it cannot see outside `src/modules/` at all.

`[DISTINCTION]` **Passing AC20 mechanically is not the same as satisfying this spec's invariant** — the exact
lesson Spec 045 already learned the hard way with athlete-home's sample scenario (technically outside AC20's
scan, architecturally still a near-whole-core seam until Impl 045-A closed it with its own local guard). This
spec generalizes that lesson: **every future Experience Projection needs its own local negative-capability
guard**, the same discipline athlete-home already has, not a rewritten or widened AC20.

`[DECISION]` **AC20 is not amended, expanded, or weakened by this spec.** It continues to protect exactly
`src/modules/`. What this spec adds is the STANDING RULE — binding on every future Experience Projection,
inside or outside AC20's literal scan — that the same architectural intent AC20 encodes for the core must be
independently, locally guarded wherever a projection is built. AC20 remains the backstop for the core; local
guards are the backstop for every projection.

```text
AC20 pass ≠ architectural-intent proof (unchanged, reaffirmed, generalized beyond src/modules/)
```

---

## 12. Relationship with future UI runtimes

`[DECISION]` This spec selects **no rendering technology**. The Experience Projection's output contract (§13)
is deliberately kept independent of React, HTTP, and JSON except where a strong reason exists — none does yet.
It is a **snapshot**, not a stream: nothing in the current domain architecture publishes a live subscription
(event-recording is an append-only ref-only log, not a pub/sub feed — §5.D), and every existing seam
(`orchestrateRenderDeliver`, `athlete-home`'s assembler) is synchronous and pull-based. A future stream-shaped
runtime remains a separate, later decision, unblocked but unforced by this spec.

`[FACT]` This is consistent with `athlete-home`'s own prior, independent finding (Spec 045 §11, §12): its
public barrel exports a presentation contract implying no production runtime, no browser environment, and no
framework choice. This spec confirms that finding generalizes to any future Experience Projection.

---

## 13. Does the experience need its own contract? (Q6)

`[DECISION]` **Yes — architecturally, it should exist — but scoped per surface, not as one universal DTO.**
`athlete-home`'s `AthleteHomeViewModel` is the first real instance; it is not renamed or touched by this spec.
Its shape (discriminated `loading`/`error`/`ready`; per-section `declared`/`inferred`/`not-yet-modeled` states;
`Epistemic` marker) is retroactively recognized here as the first working example of an Experience Projection
contract, not merely a UI-001 artifact.

```text
snapshot, not stream (§12)                              — represents knowledge, reshaped for reading, NEVER
final copy IS allowed — but only mapped/templated,        only presentation: what it says must already be
  never invented (§9.6)                                    true upstream; it just says it more legibly
priority/ordering it MAY decide: reading order,          priority/ordering it may NOT decide: what "merits
  visual grouping, progressive-disclosure depth            attention" in the domain sense — that stays
  (§14)                                                     VoiceSelectionPolicy/DecisionSupportCase's call
outputs from multiple sources without new conclusions:   provenance preserved by carrying refs/trace objects
  YES, exactly as already proven (§7 available rows)        through, never dropping them for cosmetics
defeasibility preserved by keeping the epistemic          non-existence represented via not-yet-modeled
  marker alive end-to-end, never collapsing to flat          (§8) — never hidden, never faked
  certainty
```

---

## 14. Where reasoning ends and presentation begins (Q7)

`[DECISION]` The explicit line, stated once so it never needs re-deriving per surface:

```text
REASONING decides (never presentation):
  what the evidence means · what merits attention · what can be said · with what voice ·
  with what confidence · what is omitted (via gates) · the epistemic status of a claim

PRESENTATION decides (never reasoning):
  in what reading order already-decided content appears on ONE surface ·
  what human words express an already-decided enum/reason-string (translation, not decision) ·
  how much is shown collapsed vs. behind a fold (progressive disclosure) ·
  how absence is worded (§8), never whether absence is real
```

`[DECISION]` The test: *if answering the question requires consulting anything the domain has not already
externalized as a typed field or string, it is reasoning's job.* If it only requires reformatting a value the
domain already externalized, it is presentation's job. This is precisely the discipline athlete-home's NC4/
NC4b/NC5 guards already enforce mechanically (type-only core imports; no call-shaped core-execution token) —
this spec names it as the general rule, not a one-surface accident.

---

## 15. Consequences

- Every future product surface gets a clear, evidenced pattern to follow instead of re-litigating "is this a
  whole-core composer" from scratch.
- Athlete Home's existing assembler is retroactively validated as the first correct instance of this pattern —
  nothing about it needs to change because of this spec.
- The five-area matrix (§7) makes explicit, for the first time in one place, exactly which product ambitions
  are blocked by a domain gap (Current State, Capacity, Trajectory) versus an application-composition gap
  (a production caller for Direction/Purpose + Attention/Decision Support) — these require different future
  specs, not the same one.
- No new module, no new top-level `src/modules/` entry, and no change to AC20's scan boundary was needed to
  reach this decision.

---

## 16. Open questions (deliberately not resolved here)

1. Who is the production caller that assembles real upstream evidence into `DecisionSupportCase`/Purpose for
   a non-prototype surface? (An application-composition gap, §7 — its own future spec.)
2. Should `CurrentState`/`CapacityProfile`/`ImpactAssessment` be implemented, and in what order? (A domain
   gap, §7 — evidence-gated, separate from this spec entirely.)
3. Does a second product surface (beyond Athlete Home) ever get built, and does it reuse the §13 contract
   shape or need its own? (Answered only when a second surface has real requirements.)
4. When, if ever, does a stream-shaped (not snapshot) contract become necessary? (§12 — no evidence yet.)
5. When does the Athlete-Home-specific Presentation Input Boundary decision (reserved separately, athlete-
   review-gated) become ripe? (Explicitly not this spec's call — see the naming note.)

---

## 17. Next implementation slice

`[DECISION]` **No implementation slice is opened by this spec.** The smallest legitimate next step, if and
when pursued, is **not** a new production module — it is:

```text
Tech Spec 046A (future, NOT opened here) — Local negative-capability guard suite for the Experience
Projection pattern, generalizing athlete-home's existing NC1–NC14 into a reusable checklist any future
per-surface projection must satisfy before it may compose more than one bounded context's output.
```

This is deliberately small: it adds no new composition capability, only the enforcement discipline (§10) that
makes every future Experience Projection provably safe the same way athlete-home's already is. It does **not**
implement `CurrentState`/`CapacityProfile`/`ImpactAssessment`, does **not** open a production caller for
Direction/Purpose + Attention/Decision Support, does **not** select a frontend runtime, and does **not** open
the separately-gated Athlete-Home-specific Presentation Input Boundary decision.

`[DECISION]` This spec explicitly does **not** prejudge which of the open questions (§16) should be pursued
next, or in what order — that remains a product decision for whoever reviews this document, made with its
own evidence, exactly as every other boundary spec in this repository's history has required.

---

## 18. Required Behavioral Rules (hold regardless of any future implementation of this pattern)

1. Must not add a frontend framework/runtime.
2. Must not add an HTTP server or API.
3. Must not add a production whole-core composer.
4. Must not implement `CurrentState`, `CapacityProfile`, or `ImpactAssessment` to feed a screen.
5. Must not create a service locator or a facade importing the whole core.
6. Must not weaken AC20 or any existing negative-capability guard.
7. Must not modify guards merely to make a future UI possible.
8. Must not create a shared, cross-surface "AuroraExperienceProjection" object.
9. Must not import more than 3 of the 4 AC20-guarded surfaces as runtime imports in one file.
10. Must not let a projection re-derive a value the domain already computed.
11. Must not invent a first-class absence state without a real domain type backing it.
12. Must not present inference as fact, or absence as a fabricated value.

---

## 19. Required Acceptance Criteria (Given / When / Then)

```text
Given AC20 scans only src/modules/, when an Experience Projection lives outside it, then a local
  negative-capability guard — not AC20 — is the enforcement mechanism (§10, §11).

Given application-orchestration forbids importing any upstream domain module, when Alternative A is
  evaluated, then it is rejected as stricter evidence than AC20 alone already provides (§5.A).

Given athlete-home's assembler already imports type-only, ≤3-of-4 surfaces, when this spec's pattern is
  checked, then it matches an already-proven, already-tested instance, not a hypothetical (§2, §6).

Given CurrentState/CapacityProfile/ImpactAssessment are undecided in code, when the §7 matrix is built, then
  their rows show "no legitimate output today" honestly, with the gap classified as domain, not application
  or projection (§7).

Given Direction/Purpose and Attention/Decision Support have real implemented outputs, when the §7 matrix is
  built, then their rows show a real output and classify the remaining gap as an application-composition
  concern, not a domain concern (§7).

Given the mission forbids inventing arbitrary partial-knowledge states, when §8 is written, then every state
  traces to a real existing type, and "contradictory" is explicitly excluded for lack of a backing type (§8).

Given this is a specification, when the diff is inspected, then it is docs-only: no source, test, or package
  file changed (§20).
```

---

## 20. Validation

`tsc --noEmit` clean; `node --test` **1156/1156** (unchanged — this spec is docs-only). No source/test/
sample/guard/package file touched; AC20 untouched and unamended; no frontend framework, HTTP server, API,
production whole-core composer, or domain model (`CurrentState`/`CapacityProfile`/`ImpactAssessment`) added;
no output invented that the real codebase cannot currently produce (§7 matrix built from source, not
documentation alone).
