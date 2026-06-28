# Spec 014 — LLM Rendering Boundary

> Aurora's first **"output out"** boundary: a renderer that turns a **domain-approved** terminal output into human-facing text **downstream of the domain** — preserving voice, uncertainty, limitations, freshness, traceability, and agency — so generated language can **express** what the domain decided but never **decide**, **infer**, **strengthen**, **select voice**, or **become authority**.
>
> Behavioral specification. Not implementation; no LLM provider; no UI; no API; no prompt templates as code; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no provider, no UI/API) |
| **Slice** | `domain-approved TerminalOutput → RenderableDomainOutput → renderer (express only) → RenderedMessage (or safe RenderingFailure)` |
| **Builds on** | Spec/Impl 005 (voice gates) · 006 (end-to-end Reflection) · 008 (projection freshness) · 011 (event records) · 012 (reprojection harness) · 013 (manual input adapter) |
| **Produces (behavior)** | a `RenderableDomainOutput`, `RenderingRequest`, `RenderedMessage`, `RenderingPolicy`, `RenderingFailure`; render-vs-reason rules; the test contract |
| **Explicitly does not produce** | an LLM provider/API call, prompt templates as production code, UI/chat, streaming, delivery/notifications, personalization beyond domain context, model-eval infra |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict renderable/message/policy shapes, where the boundary lives, a **deterministic fake renderer** for tests, the validation pass) follows separately as **014A**. Implementation does not begin from this document, and **no LLM provider, prompt template, or UI/API technology is chosen here**.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora render domain-approved outputs into human-facing language without allowing generated text to create meaning, select voice, strengthen claims, hide uncertainty, or become domain authority?*

[FACT] Implementation 013 added the first *data in* boundary; this slice is its mirror — the first *output out* boundary. The whole core was built to make restraint structural; a rendering surface is the single most likely place to erode it, because **generated language is fluent, confident-sounding, and arrives last**, right at the user. So the boundary is written so the renderer can only **express a decision already made**, never make one.

[FACT] This is the boundary the Core Completion Review names as "the most dangerous next shortcut" — *a voice with a mouth*. The danger guarded: **generated text becoming domain authority** — selecting voice, strengthening a claim, hiding uncertainty, inventing a fact or a citation, or turning a `Withholding`/`Inquiry` into advice.

---

## 2. Core Principle

[FACT] **Rendering is downstream of domain decisions.** The renderer **may express**; it **may not**: decide, infer, strengthen, select voice, create a recommendation, hide uncertainty, replace traceability, or become the source of truth.

[FACT] **The domain output is authoritative. Generated text is a presentation artifact.**

[ASSUMPTION] The guiding sentence: *the domain decides what may be said and how strongly; the renderer only finds words for it — and if it cannot do so faithfully, it produces nothing rather than something unsafe.* If the rendered text could change what the domain meant — its voice, its certainty, its claims, its silence — the boundary is wrong.

[FACT] Three rules, restated for emphasis (the user's framing):
- **LLM rendering ≠ domain reasoning.**
- **Generated text ≠ domain authority.**
- **Voice is selected by `decision-support`, not by the renderer.**

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the renderable-output boundary; the relationship between a `DecisionSupportCase`'s `TerminalOutput` and a rendered message; the relationship between `VoiceMode` and language tone; allowed vs. forbidden rendering inputs; uncertainty preservation; traceability preservation; safe-phrasing constraints; rendering of each terminal output (`DecisionSupport` with its `VoiceMode`/`intent`, `Inquiry`, `Withholding`); the **validation/review** of generated text against the domain output; renderer **failure modes**; and the negative constraints that keep rendering downstream of reasoning.

### Non-Scope
[FACT] LLM provider selection; prompt templates as production code; API calls; streaming; UI; chat interface; user accounts; production message delivery; notification system; analytics; training-plan generation; automatic coaching; personalization beyond domain-approved context; memory outside domain artifacts; external integrations; model-evaluation infrastructure.

[DECISION] **No LLM provider, prompt, or UI/API technology is chosen.** The boundary is defined behaviorally; a future implementation may validate it with a **deterministic fake renderer** (no model call). *How* text reaches a human (UI/API/delivery) is explicitly future work.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The renderer must satisfy **all**:

1. The renderer does **not** select `VoiceMode`.
2. The renderer does **not** create a `TerminalOutput`.
3. The renderer does **not** create a `DecisionSupportCase`.
4. The renderer does **not** create a `Recommendation`.
5. The renderer does **not** convert an `Inquiry` into a recommendation/advice.
6. The renderer does **not** convert a `Withholding` into advice.
7. The renderer does **not** strengthen confidence.
8. The renderer does **not** hide uncertainty.
9. The renderer does **not** remove limitations.
10. The renderer does **not** invent traceability.
11. The renderer does **not** cite sources absent from the domain output.
12. The renderer does **not** introduce new facts.
13. The renderer does **not** infer athlete state.
14. The renderer does **not** overwrite `Purpose`.
15. The renderer does **not** mutate domain state.
16. Renderer output is **not** `Evidence`.
17. Renderer output is **not** `Understanding`.
18. Renderer output is **not** an `AthleteDecision`.
19. Renderer output is **not** source truth.
20. Renderer **failure degrades to safe non-rendering** (or a safe fallback), never to unsafe output.

[ASSUMPTION] The *defining* invariants are **1, 7, 8, 12, 20** — together they make "the generated text selected/escalated voice, strengthened a claim, hid uncertainty, invented a fact, or failed unsafely" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 RenderableDomainOutput
[DECISION] A **domain-approved** object that is safe to render — a projection of a completed `TerminalOutput`, never raw reasoning internals. It may include: the `DecisionSupportCase` id; the **terminal output kind** (`support`/`inquiry`/`withholding`); the **`VoiceMode`** (for `support`); the support/inquiry/withholding **content structure** (`intent`, `question`/`whatNeeded`, `reason`); the **traceability verification status**; **uncertainty/limitations**; **freshness status** (the 5-state `ProjectionFreshness`); the **`safeVoiceCeiling`** if relevant; **purpose context** if relevant; and an explicit **allowed-claims / forbidden-claims** envelope.
- It **must not** be raw reasoning internals **without** a terminal domain decision (no `Hypothesis`/`EvidenceCase`/raw `Signal` exposed for rendering).

### 5.2 RenderingRequest
[DECISION] A request to turn a `RenderableDomainOutput` into human-facing text. It should include: the `RenderableDomainOutput`; **audience context** *if domain-approved*; **language/locale** if provided; **length/style** constraints *if safe*. It **must not** carry new domain facts, and **must not** carry hidden instructions that override domain constraints (a style request can never lift a voice ceiling — §6).

### 5.3 RenderedMessage
[DECISION] The generated **presentation artifact**. It should include: the **text**; a **ref to the source domain output**; a **rendering status**; the **preserved `VoiceMode`**; **preserved uncertainty**; **preserved limitations**; a **traceability summary or refs**; and **renderer warnings** if any.
- It **must not** be domain authority — it is downstream, and it is **never** re-ingested as `Observation`/`Evidence`/`Understanding`/`AthleteDecision` (§7).

### 5.4 RenderingPolicy
[DECISION] The rules that constrain rendering. It enforces: **voice cannot exceed the domain voice**; **claims cannot exceed the allowed claims**; **uncertainty must be visible**; **limitations must be visible**; **`Inquiry` stays inquiry**; **`Withholding` stays withholding**; **generated text cannot add new domain content**. The policy is the *gate on the rendered text*, mirroring how `decision-support` gates the voice — except it can only ever **constrain**, never enable.

### 5.5 RenderingFailure
[DECISION] A **safe failure mode**. Examples: missing terminal output; missing traceability; voice mismatch; generated text overstates a claim; invents a fact; hides a limitation; an unsupported language/style request; or an **unsafe request to produce a recommendation where the domain withheld**. A failure produces **no final rendered message** (or a clearly-marked safe fallback), **never unsafe text** (invariant 20).

---

## 6. VoiceMode → tone (constrain-only)

[FACT] The real domain surface (Impl 005): `TerminalOutput = DecisionSupport | Inquiry | Withholding`; `DecisionSupport` carries `voice: VoiceMode` (`Silence`/`Reflection`/`Framing`/`Warning`/`Recommendation`), `intent` (`reflect`/`frame`/`warn`/`recommend`), `preservesAgency: true`, and `uncertaintyVisible`.

[DECISION] The renderer maps `VoiceMode` to **tone**, and tone may only **match or soften**, never **escalate**:
- `Reflection` → reflective phrasing (observations/questions about the athlete's own experience); **never** advice/recommendation language.
- `Framing` → framing/context phrasing; **never** a directive.
- `Warning` → caution phrasing tied to the domain's risk reason; **never** a stronger claim than the domain made.
- `Recommendation` → may phrase a clear recommendation, **but** must preserve conditions, uncertainty, traceability, and agency (`preservesAgency`).
- A **style request** (e.g. "be decisive") can **never** lift the tone above the domain `VoiceMode` (it is refused or safely degraded).

[ASSUMPTION] The asymmetry from the core holds at the mouth: the renderer may only ever say the **same or less** than the domain authorized — never more.

---

## 7. Relationship to the rest of the system

[DECISION]
- **`decision-support` owns voice and terminal output; the renderer owns phrasing only.** The renderer reads a completed `TerminalOutput` (or a `RenderableDomainOutput` projecting it); it never constructs one.
- **The domain output remains the source of truth; rendered text is downstream presentation.**
- **Rendered text is not re-ingested as truth (invariant 19, UC10):** later reasoning never treats a `RenderedMessage` as `Observation`/`Evidence`/`Understanding`/`AthleteDecision`. Manual input (Impl 013) is source material; **rendered output is not source material** — *unless the athlete separately and explicitly reports it back* via the manual adapter, in which case it enters as a `SubjectiveObservation` like any other report.
- **Freshness (Impl 008)** flows through: a stale/partial/invalid/unknown `RenderableDomainOutput` keeps its limitations visible; the renderer never implies current certainty.
- **Event records (Impl 011)** / **reprojection (Impl 012)** are unaffected: rendering mutates nothing and (if a future spec records "rendered") would do so only as a ref-only occurrence, never a command.

---

## 8. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§10). **Negative criteria are defining.**

### UC1 — Render Reflection
- **AC1.1** — *Given* a case selected `VoiceMode: Reflection`, *when* rendering is requested, *then* the message stays reflective and **does not** become advice or recommendation.

### UC2 — Render Inquiry
- **AC2.1** — *Given* terminal output is `Inquiry`, *when* rendering is requested, *then* the message **asks** the domain-approved question(s) and **does not answer** them.

### UC3 — Render Withholding
- **AC3.1** — *Given* terminal output is `Withholding`, *when* rendering is requested, *then* the message explains Aurora is **not** giving guidance and **preserves the reason/limitation**.

### UC4 — Render Recommendation
- **AC4.1** — *Given* the gates produced a `Recommendation`, *when* rendering is requested, *then* the renderer may phrase it clearly **but** preserves conditions, uncertainty, traceability, and agency.

### UC5 — Prevent voice escalation
- **AC5.1** — *Given* a `Framing`/`Reflection` output, *when* a style request asks to "be decisive", *then* rendering **does not** escalate to recommendation language (it refuses or degrades safely).

### UC6 — Preserve uncertainty and freshness
- **AC6.1** — *Given* the output carries stale/partial/invalid/unknown freshness or limitations, *when* rendered, *then* those limitations **remain visible** and the text **does not** imply current certainty.

### UC7 — Reject invented facts
- **AC7.1** — *Given* a renderer draft includes facts not present in the renderable output, *when* validated, *then* the rendered message is **rejected or marked failed**.

### UC8 — Traceability summary
- **AC8.1** — *Given* traceability refs are present, *when* rendered, *then* the renderer may summarize traceability in human-readable form **without inventing citations or hiding gaps**.

### UC9 — Renderer failure
- **AC9.1** — *Given* required domain output is missing or inconsistent, *when* rendering is requested, *then* **no unsafe text is produced** (safe non-render or fallback).

### UC10 — Generated text not re-ingested as truth
- **AC10.1** — *Given* a `RenderedMessage` exists, *when* later reasoning runs, *then* the rendered text is **not** treated as `Observation`/`Evidence`/`Understanding`/`AthleteDecision` **unless** separately and explicitly reported by the athlete as source material.

---

## 9. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given `Reflection` output, when rendered, then **no recommendation language** appears.
- Given `Inquiry` output, when rendered, then it **remains a question/inquiry**.
- Given `Withholding` output, when rendered, then it **does not become advice**.
- Given `Recommendation` output, when rendered, then **conditions and agency remain visible**.
- Given a lower voice mode, when a user style asks for stronger language, then the renderer **refuses or degrades safely**.
- Given limitations/freshness are present, when rendered, then they **remain visible**.
- Given generated text invents a fact, when validated, then it is **rejected**.
- Given traceability is incomplete, when rendered, then **gaps are preserved**.
- Given rendering completes, then **no domain aggregate is mutated**.
- Given rendered text exists, then it is **not source truth** and cannot update `Understanding`/`DecisionSupport`.
- Given this slice is implemented later, then **no LLM provider/API/UI/external integration** is created (a later tech spec may allow a **fake/test renderer** only).

---

## 10. Explicit Forbidden Behaviors

[FACT] This spec forbids: the renderer selecting `VoiceMode`; creating a `TerminalOutput`; creating a `Recommendation`; turning an `Inquiry` into advice; turning a `Withholding` into advice; strengthening claims; hiding uncertainty; hiding freshness limitations; inventing facts; inventing traceability; citing unavailable sources; using private reasoning as user-facing authority; mutating aggregates; writing event records as commands; turning text into `Evidence`; overwriting `Purpose`; scoring compliance; creating an `AthleteDecision`; calling an LLM provider; and UI/API/external delivery.

[DECISION] These are **testable negative requirements** (§11) — verifiable with a **deterministic fake renderer** (no model needed).

---

## 11. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.** (A future deterministic fake renderer lets every case be tested without a provider.)

**Positive:**
- `Reflection` does not render as a recommendation;
- `Inquiry` renders as an inquiry (question preserved, not answered);
- `Withholding` renders as withholding (reason preserved);
- `Recommendation` renders with conditions/agency preserved;
- uncertainty/freshness/limitations preserved and visible;
- a rendered message **references its source domain output**;
- traceability summarized without invented citations.

**Negative (must prove absence):**
- a **style request cannot escalate voice** (refuse or degrade);
- **invented facts are rejected**; **invented/absent citations are rejected**;
- **incomplete traceability constrains** rendering (gaps preserved, never hidden);
- a `Withholding`/`Inquiry` is **never** turned into advice;
- the renderer **mutates no aggregate** and writes **no event-as-command**;
- a `RenderedMessage` is **not** domain truth — it cannot update `Understanding`/`DecisionSupport`, and is not re-ingested as `Observation`/`Evidence` (UC10);
- **no LLM provider/API/UI/external file** is introduced (structural guard).

**Dependency-boundary:**
- the renderer boundary imports only what produces a `RenderableDomainOutput` (read-only over `decision-support` terminal outputs) + `shared-kernel`; it **never** imports `reasoning`/`understanding` internals to re-derive, and upstream modules never import it;
- **all 317 Impl 001–013 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *the renderer expresses a decision and never makes one*. If they cannot be written/passed, the boundary design is wrong.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 005 (voice gates)** — `decision-support` owns `VoiceMode` + the `TerminalOutput`; the renderer reads, never constructs.
- **Spec/Impl 006 (end-to-end Reflection)** — the demonstrated output (`DecisionSupport · VoiceMode: Reflection`) is exactly the kind of object that becomes a `RenderableDomainOutput`; rendering it must stay Reflection.
- **Spec/Impl 008 (projection freshness)** — freshness/limitations ride into the renderable output and stay visible.
- **Spec/Impl 011 (event records)** / **012 (reprojection harness)** — unaffected; rendering mutates nothing.
- **Spec/Impl 013 (manual input adapter)** — symmetry made explicit: **manual input is source material; rendered output is not source material** unless later reported back by the athlete.

[DECISION] The boundary picture: **`decision-support` decides (voice + terminal output) · the renderer phrases (downstream presentation) · the domain output stays the source of truth · rendered text is never re-ingested as truth.**

---

## 13. Open Questions (do not block this spec)

[QUESTION] whether the first implementation uses a **deterministic fake renderer**; where the renderable-output adapter lives (a `decision-support` read-only projection vs. a neutral boundary); whether a future LLM provider is allowed (and behind what isolation); prompt format; language/localization strategy; tone/style constraints; an approval/review workflow; rendered-message persistence; whether rendering should produce a (ref-only) event record; how a UI will display traceability/limitations.

[ASSUMPTION] None block this slice: Aurora can define what a faithful rendering boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 014A.

---

## 14. Success Criterion

> **"Can Aurora render domain-approved output into human-facing text without letting generated language become reasoning, authority, or voice selection?"**

[ASSUMPTION] Answerable from this spec: a renderer turns a **`RenderableDomainOutput`** (a projection of a completed `TerminalOutput` — kind, `VoiceMode`, content, traceability status, uncertainty/limitations, freshness, allowed/forbidden claims) into a **`RenderedMessage`** governed by a **`RenderingPolicy`** that can only **constrain**: voice may match or soften but **never escalate**; claims may not exceed the allowed set; uncertainty, limitations, freshness, and traceability gaps stay **visible**; `Inquiry` stays a question, `Withholding` stays a refusal; invented facts/citations are **rejected**; and any failure degrades to **safe non-rendering**. The renderer **selects no voice, creates no terminal output/recommendation/`AthleteDecision`, strengthens no claim, invents nothing, mutates nothing, and is never re-ingested as truth** — and **no LLM provider/API/UI/external integration** is chosen (a future **fake renderer** suffices to prove it), with **all 317 existing tests green** — proving generated language can express the domain's decision without ever becoming it.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the renderer selects/escalates voice. **Defense:** invariants 1/4 + UC1/UC5 + §6 — tone may only match-or-soften; a style request can't lift the ceiling; negative test that "be decisive" never escalates.
- **Risk:** generated text strengthens a claim / hides uncertainty. **Defense:** invariants 7/8/9 + UC6 — uncertainty/limitations/freshness stay visible; the validation pass rejects overstatement.
- **Risk:** invented facts or citations. **Defense:** invariants 10/11/12 + UC7/UC8 — validated against the renderable output; anything not present is rejected.
- **Risk:** `Inquiry`/`Withholding` become advice. **Defense:** invariants 5/6 + UC2/UC3 — inquiry stays a question, withholding stays a refusal; negative test.
- **Risk:** unsafe failure (produces something wrong when inputs are missing). **Defense:** invariant 20 + UC9 — failure degrades to safe non-render.
- **Risk:** rendered text re-enters as truth / mutates the domain. **Defense:** invariants 15/19 + UC10 — rendering mutates nothing; rendered text is not source material unless the athlete reports it back via the manual adapter.
- **Risk:** the slice drifts into a provider/UI. **Defense:** §3 non-scope + §10 forbidden + structural guard — behavioral boundary only; a deterministic fake renderer proves it; no provider/API/UI chosen.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fourteenth Specification and the first output-rendering boundary. It defines how a domain-approved terminal output becomes human-facing text downstream of the domain — preserving voice, uncertainty, limitations, freshness, traceability, and agency — and chooses no LLM provider, prompt, or UI/API. Rendering expresses the domain's decision; it never makes one. Generated text is a presentation artifact, never authority.*

*Inputs: [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
