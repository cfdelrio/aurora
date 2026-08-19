# Aurora — Domain Modeling — Cross-Paper Governance Decisions

> Domain modeling, not implementation. No code, schemas, APIs, UI, or frameworks. This paper does not
> introduce production architecture, does not touch `CurrentState`/`CapacityProfile`/`ImpactAssessment`,
> does not open application composition, and does not add any new activity type.

## Status

**Accepted.** Resolves the four cross-paper questions `docs/domain-modeling/README.md` §8 (line 190)
carried forward as genuinely unresolved *at the domain level* after papers 001–005 (`CORE_REASONING_MODEL.md`,
`ATHLETE_AGGREGATE.md`, `OBSERVATION_SIGNAL_MODEL.md`, `UNDERSTANDING_PROFILE_MODEL.md`,
`DECISION_SUPPORT_MODEL.md`) were each individually accepted. It is a **sixth, cross-cutting paper** — it
resolves questions that no single one of the five could resolve alone, because each question spans at least
two of them. It does not renumber, rewrite, or supersede any of the five; each question's original
`[QUESTION]` marker in its home paper is left standing as the historical record, and this paper is the
authoritative resolution.

| Marker | Meaning |
|---|---|
| **[FACT]** | Something already true in an accepted paper or in real, shipped code — verified, not inferred. |
| **[DECISION]** | A modeling commitment resolving one of the four questions, with reasoning. |
| **[NON-GOAL]** | Something this paper deliberately does not do. |
| **[OPEN QUESTION]** | Genuinely unresolved, carried forward, not resolved here. |

Each **[DECISION]** carries: **Why** · **Consequence** · **Risk** · **Reversal Point** — the same discipline
as papers 001–005.

---

## Purpose

Four questions were explicitly flagged as open across the accepted domain-modeling papers, each spanning more
than one paper's boundary — which is exactly why none of the five papers resolved them individually:

```text
1. When stated purpose and revealed purpose diverge, which does Impact evaluate against?
     — ATHLETE_AGGREGATE.md:81,432 ("Shared with CRM 001")
2. How far back does a PurposeChanged event reinterpret past hypotheses?
     — CORE_REASONING_MODEL.md:297,359 ("→ Athlete/Purpose modeling")
     — ATHLETE_AGGREGATE.md:344,436 ("Shared, foundation-level")
3. What are the qualitative gate rules per voice?
     — DECISION_SUPPORT_MODEL.md:159 (Decision 7 reversal point), :353
4. Do Inquiry and Reflection remain distinct, or collapse into one concept?
     — DECISION_SUPPORT_MODEL.md:143 (Decision 6 risk/reversal, "if... collapse in practice, revisit")
```

`[FACT]` All four remain, as of this paper's authorship, unresolved in their home papers' own text — verified
directly against the current file content, not summarized from memory.

---

## Context

`[FACT]` Between the five papers' acceptance and this paper, Aurora accumulated real implementation and one
real athlete-review session — evidence none of the five papers had when each question was first raised. This
paper's method throughout is the same: **resolve by recognizing what already-accepted decisions and
already-shipped, already-evidenced behavior jointly imply — never by inventing a new mechanism the domain
hasn't already committed to.**

---

## Question 1 — Stated vs. revealed purpose: which does Impact evaluate against?

`[FACT]` `ATHLETE_AGGREGATE.md:81` already decided the Athlete-side half: *"When stated purpose and revealed
purpose (behavior) diverge, Athlete records the stated purpose as authoritative and surfaces the divergence as
a signal; it does not silently substitute revealed for stated."* This is implemented exactly as decided:
`RevealedPurposeSignal` (`athlete/domain/revealed-purpose.ts`) is explicitly commented *"a placeholder marking
a possible declared-vs-revealed mismatch. It is EVIDENCE/INQUIRY MATERIAL, never a Purpose... carries NO path
to `changePurpose`."* What remained open was the **Reasoning-side** half: when `Hypothesis` (specifically an
impact-subject claim, per `CORE_REASONING_MODEL.md` Q4 — *"An impact claim IS a Hypothesis"*) evaluates
whether a training effect served *the* purpose, which purpose does it read?

`[DECISION]` **Impact evaluates against the athlete's currently *declared* (stated) Purpose — never a revealed
one — and a `RevealedPurposeSignal` never substitutes for it, contributes to Impact's claim, or silently
reframes what "success" means for an open hypothesis. A divergence is not resolved by Reasoning; it is routed
to `Inquiry` (Decision 6, `DECISION_SUPPORT_MODEL.md`) so *the athlete* — never Aurora — decides whether their
stated purpose has actually changed.**

- **Why:** `RevealedPurposeSignal`'s own implementation comment already forbids it from reaching
  `changePurpose`; letting Impact quietly weigh it anyway would let inferred behavior override a declared
  intent through a side door Athlete itself explicitly closed. This is the same principle
  `UNDERSTANDING_PROFILE_MODEL.md:214` already applies one level over — *"`PopulationKnowledge` may seed
  hypotheses... but may never raise `UnderstandingProfile`"* — inferred material may inform, but the
  athlete-declared record stays authoritative for judging outcomes against.
- **Consequence:** A `RevealedPurposeSignal` becomes *evidence a Hypothesis about the athlete's purpose
  alignment may cite*, never evidence Impact uses to redefine what the CURRENT stated purpose's Hypothesis is
  being judged against. If revealed behavior diverges enough, repeatedly, from stated purpose, that pattern is
  itself exactly the kind of signal `PurposeGate` (`decision-support/domain/gates.ts`) already routes to
  `Inquiry` when purpose is `ambiguous` — the gate machinery already built to handle this needs no new state.
- **Risk:** An athlete whose stated purpose is stale (they said one thing, months ago, and now train
  differently) could receive impact judgments against an intent they've silently abandoned.
- **Reversal Point:** If real athlete-review evidence (in the style of `045-athlete-home-athlete-review-session-A01.md`)
  repeatedly shows athletes surprised or frustrated that Aurora judged them against a purpose they'd
  mentally moved past, revisit toward a bounded "purpose staleness" trigger that raises an `Inquiry` proactively
  — not toward letting revealed behavior silently substitute.

---

## Question 2 — How far back does `PurposeChanged` reinterpret past hypotheses?

`[FACT]` `athlete/domain/purpose-changed.ts`'s own comment already decided the mechanism, if not the depth:
*"It must NOT rewrite prior reasoning, auto-falsify hypotheses, infer athlete state, or generate a
recommendation. Downstream effects (staleness, gating) are applied by an application/harness layer that
consumes this value — never by Athlete itself."* `UNDERSTANDING_PROFILE_MODEL.md:229` already decided the
downstream mechanism those effects use: *"Decay is accelerated by purpose change, injury, sport change, and
disuse... Nothing about understanding is permanent — even Mature decays — but archived understanding can be
revived."* And `CORE_REASONING_MODEL.md`'s own Evidence Model (referenced throughout) already decided
`Hypothesis`/`EvidenceCase` history is append-only and immutable once formed. What remained open was purely the
**depth/window** question — "all history, or a bounded window?"

`[DECISION]` **A `PurposeChanged` event never rewrites, deletes, or retroactively falsifies any past
`Hypothesis` or `EvidenceCase` — append-only history is absolute, with no exception for a purpose change. What
it does instead is *accelerate staleness decay* (the already-decided mechanism) across every `UnderstandingProfile`
dimension whose scope depended on the superseded purpose, exactly as `UNDERSTANDING_PROFILE_MODEL.md:229`
already names purpose change as a decay accelerant. There is no separate "reinterpretation window" — the
depth of effect is not time-bounded by a fixed rule (e.g., "last N sessions") but *scope*-bounded by which
dimensions the new purpose actually touches, mediated entirely through the existing decay/staleness machinery,
never through history rewriting.**

- **Why:** This is not a new mechanism — it is the *composition* of three already-accepted decisions
  (append-only history, `PurposeChanged`'s explicit non-rewriting contract, and purpose-accelerated decay) that,
  read together, already answer the question the three papers each left open when read separately. Inventing a
  fourth, new "reinterpretation window" concept would duplicate what decay/staleness already does.
- **Consequence:** A dimension whose evidence and scope are orthogonal to the new purpose (e.g., "recovery
  pattern after high-intensity work" when purpose shifts from a 200m butterfly to a marathon-swim goal) need
  not decay at all — its past hypotheses remain exactly as valid as before, because nothing about them was
  purpose-dependent. A dimension tightly scoped to the old purpose (e.g., "sustained work tolerance for
  200m-distance pacing") decays toward `Unknown` at the accelerated rate `UNDERSTANDING_PROFILE_MODEL.md`
  already specifies — never instantly to zero, never silently, and always revivable per that paper's own
  archival/revival decision.
- **Risk:** "Which dimensions the new purpose actually touches" is itself a judgment call with no
  formula given here — implementation risks either over-decaying (throwing away genuinely reusable
  understanding) or under-decaying (keeping confidence that no longer fits the athlete's new goal).
- **Reversal Point:** If, once implemented, purpose-touched-dimension scoping proves too coarse or too
  fine in practice, revisit toward an explicit per-dimension "purpose relevance" tag — but only after real
  evidence of misfire, not speculatively now.

---

## Question 3 — What are the qualitative gate rules per voice?

`[FACT]` `DECISION_SUPPORT_MODEL.md`'s Decision 7 explicitly deferred this with a named condition for
revisiting it: *"If it systematically over- or under-speaks, encode explicit per-gate qualitative rules
(non-numeric) before reaching for tuning"* (line 159) — and line 353 records it as still open, *"deferred
until real cases sharpen them."* `[FACT]` Real cases now exist and have been evidenced: the five gates
(`evidenceGate`, `understandingGate`, `purposeGate`, `riskGate`, `agencyGate` — `decision-support/domain/gates.ts`)
are fully implemented, and a real athlete (session A01, Carlos —
`docs/product-design/045-athlete-home-athlete-review-session-A01.md`) reported, of the humanized rendering of
exactly these gate results, *"da seguridad"* (it builds confidence) — direct evidence the gate logic, as
implemented, did not systematically over- or under-speak in that session. Decision 7's own named reversal
condition is met: real cases have sharpened them.

`[DECISION]` **The already-implemented gate logic is ratified as the domain-level qualitative rule set Decision
7 deferred — formalized here, in domain language, closing the loop from implementation back to the modeling
layer it was built from:**

```text
EvidenceGate       : passes only on a SETTLED, non-weakened claim state (`supported` or
                      `promoted-to-working-knowledge`); a weakened claim LIMITS (never fully blocks) the
                      voice it can support; a contradicted/falsified/retired claim FAILS outright; an
                      unsettled claim (`proposed`/`active`) routes to `Inquiry` — evidence that hasn't finished
                      being tested is treated as absence, never as tentative support.
UnderstandingGate  : passes only when the requested voice's assertiveness rank is ≤ the safe voice ceiling
                      UnderstandingAssessment already computed for that dimension — with one named exception:
                      `Warning` always passes this gate, because it travels the safety-exception path
                      (RiskGate may raise toward Warning independent of understanding level, per
                      DECISION_SUPPORT_MODEL.md Decision 5's own "Warning may fire even at Thin if risk is
                      high" rule).
PurposeGate        : passes only on a DECLARED purpose; both `unknown` and `ambiguous` route to `Inquiry` —
                      there is no voice, however well-evidenced, that outruns not knowing what the advice is
                      FOR.
RiskGate           : passes at low/moderate risk; at high/critical risk it does not fail the case — it
                      escalates toward the cautionary Warning path, independent of what the other four gates
                      would otherwise permit, matching Decision 5's asymmetric safety exception exactly.
AgencyGate         : passes only when the candidate carries none of the five prohibited intent markers
                      (command, shame, certainty-claim, hidden-uncertainty, decision-ownership) — any one
                      present fails the gate outright, with no partial/limited pass; agency is binary, not a
                      matter of degree.
```

- **Why:** Formalizing rules that already exist, are already tested, and were already read by a real athlete
  without over- or under-speaking is lower-risk than inventing new qualitative language in the abstract — the
  exact discipline this whole paper follows for all four questions.
- **Consequence:** Future implementation work on the gates is now answerable against a domain-level
  specification, not only against the current code — the two stay reconcilable rather than only coincidentally
  aligned. This closes Decision 7's own explicitly-named condition for revisiting it.
- **Risk:** Ratifying current behavior risks freezing an implementation detail into domain doctrine before
  broader evidence (more than one athlete, more than one dimension) has tested it.
- **Reversal Point:** Unchanged from Decision 7's own: if broader real-athlete evidence (a second, third,
  Nth session) shows systematic over- or under-speaking these formalized rules do not explain, revise the
  rules — not by discarding gate-level qualitative reasoning in favor of numeric tuning, which Decision 7
  already rejected as the wrong first move.

---

## Question 4 — Do Inquiry and Reflection remain distinct, or collapse?

`[FACT]` `DECISION_SUPPORT_MODEL.md` Decision 6 already gave a strong structural reason to keep them distinct
— *"a clean two-axis model: assertiveness (the VoiceMode ladder)... and acquisition (Inquiry)"* — with an
explicit, named reversal trigger: *"if Inquiry and Reflection collapse in practice, revisit; until then,
distinct."* `[FACT]` They have not collapsed in practice. Verified directly against the implemented type
system (`decision-support/domain/terminal-output.ts`): `Inquiry` structurally carries no `voice` field at all
— it is not merely *conventionally* kept apart from `Reflection`, it is *typed* apart, at the language level,
across every accepted spec from 001 through 046A and the entire real athlete-review arc (045-C through A01),
with zero recorded instance of the two concepts being confused, merged, or found redundant.

`[DECISION]` **Inquiry and Reflection remain distinct. This question is closed, not merely deferred: the
named reversal condition (collapse in practice) has had every opportunity to occur across five accepted
specs, one full prototype iteration arc, and one real athlete session, and has not occurred.**

- **Why:** The distinction is not cosmetic — `Inquiry` admits Aurora lacks something *only the athlete can
  supply* (Decision 6's own framing); `Reflection` is the lowest rung of *asserting something Aurora
  believes*. Session A01 (Carlos) independently confirmed the practical version of this distinction: he
  reported feeling "helped to understand" (`"me ayuda a entender"`) by a `Reflection`-voiced output — the
  athlete experienced Aurora as offering a reading, not as asking a question — exactly the two-axis
  distinction Decision 6 predicted would remain legible.
- **Consequence:** No future spec needs to re-litigate this axis split; `Inquiry`'s type shape (no `voice`
  field) is confirmed as correct domain modeling, not an accident of implementation convenience.
- **Risk:** A future surface with a much larger real-user sample could still surface a collapse this small
  amount of evidence didn't catch.
- **Reversal Point:** Unchanged from Decision 6: revisit only if real practice — not speculation — shows
  the two concepts collapsing for real users. No such evidence exists today, so no revision is made.

---

## Reconciliation with the five accepted papers

```text
CORE_REASONING_MODEL.md    : Q2's "purpose reinterpretation depth" (line 297/359) resolved via composition
                              of that paper's own append-only Evidence Model with Athlete's and Understanding's
                              decisions — no change to Hypothesis/EvidenceCase immutability.
ATHLETE_AGGREGATE.md       : Q1 confirms and extends Decision on stated-purpose authority (line 81); Q2
                              resolves the depth half of the PurposeChanged question that paper's own event
                              table (line 344) left as "All (reopens past impact)" without a bound.
UNDERSTANDING_PROFILE_MODEL.md : Q2's resolution depends entirely on that paper's already-decided decay/
                              staleness/revival mechanism (line 229) — nothing new is added to Understanding;
                              this paper only names WHICH existing mechanism answers the cross-paper question.
DECISION_SUPPORT_MODEL.md  : Q3 ratifies Decision 7's own reversal condition as met; Q4 confirms Decision 6's
                              reversal condition as NOT met. Neither is a reversal — both are closures under
                              the exact conditions those decisions themselves specified in advance.
```

`[NON-GOAL]` This paper does not reopen, weaken, or restate any decision from papers 001–005 beyond what is
needed to answer the four questions above. It does not touch `CurrentState`, `CapacityProfile`, or
`ImpactAssessment` (Spec 046's own domain gap, left exactly as open as Spec 046 left it). It does not open
application composition (Spec 046 §16 Q1, left exactly as open). It does not select a production caller, a
frontend, or any runtime. It does not add a snowboard or any external-activity dimension. It does not modify
Athlete Home, AC20, Spec 045/046/046A, or A01. It does not run A02 or simulate athlete feedback.

---

## Final decision summary

```text
Q1 — stated vs. revealed purpose : Impact evaluates against the DECLARED (stated) purpose only. A
                                    RevealedPurposeSignal never substitutes for it; divergence routes to
                                    Inquiry, decided by the athlete, never inferred by Aurora.

Q2 — PurposeChanged reinterpretation depth : No history rewriting, ever (append-only stays absolute). Effect
                                    is SCOPE-bounded (which dimensions the new purpose actually touches), not
                                    time-window-bounded, mediated entirely through Understanding's existing
                                    purpose-accelerated decay mechanism — no new mechanism introduced.

Q3 — qualitative gate rules per voice : Ratified from already-implemented, already-evidenced gate logic
                                    (EvidenceGate/UnderstandingGate/PurposeGate/RiskGate/AgencyGate) — Decision
                                    7's own named reversal condition ("real cases sharpen them") is met.

Q4 — Inquiry vs. Reflection : Remain distinct. Decision 6's own named reversal condition ("collapse in
                                    practice") has not occurred across five specs, one prototype arc, and one
                                    real athlete session — the question is closed, not merely re-deferred.
```

All four resolutions are **compositions of already-accepted decisions and already-observed evidence** — no
new domain mechanism, aggregate, or concept is introduced anywhere in this paper.
