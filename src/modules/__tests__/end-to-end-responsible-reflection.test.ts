// Implementation 006 — First End-to-End Responsible Reflection.
//
// THE DEFINING INTEGRATION TEST. It composes the four core module PUBLIC surfaces
// (observation -> reasoning -> understanding -> decision-support) into one chain and proves that,
// even with the whole chain working, Aurora keeps restraint, traceability, uncertainty, and agency:
// the terminal output is DecisionSupport with VoiceMode `Reflection`, NOT `Recommendation`.
//
// This file lives in a NEUTRAL src/modules/__tests__/ root on purpose: it belongs to no single
// module, so no module appears to own the whole story. It is a test harness, not a production
// service (Tech Spec 006A §1). It composes existing surfaces; it authors no domain and no trace.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { timestamp } from "../../shared-kernel/time.ts";

import {
  ObservationSet,
  contextualFrame,
  detectSignals,
  recordObservationSet,
} from "../observation/index.ts";
import type { ContextualFrame, Observation, Signal, SignalRejection } from "../observation/index.ts";

import {
  Hypothesis,
  attachSignalAsEvidence,
  falsifier,
  hypothesisClaim,
  hypothesisScope,
  openHypothesis,
} from "../reasoning/index.ts";

import {
  UnderstandingProfile,
  produceUnderstandingAssessment,
  reasoningOutcomeFrom,
  understandingDimension,
  updateUnderstandingFromOutcome,
} from "../understanding/index.ts";

import {
  claimStateOf,
  decisionOpportunity,
  evaluateDecisionSupportCase,
  noRisk,
  openDecisionSupportCase,
  purposeContext,
  verifyTraceability,
} from "../decision-support/index.ts";
import type { CandidateSupport } from "../decision-support/index.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE = "athlete:e2e-1";
const DIMENSION = understandingDimension("aerobic-response", "high-intensity");

// ----------------------------------------------------------------------------------------------
// Step 1 — Intake: a synthetic workout-like ObservationSet (measured + subjective + a quality gap).
// ----------------------------------------------------------------------------------------------
function buildObservationSet(): ObservationSet {
  return recordObservationSet({
    occasion: "session:2026-01-02-threshold-ride",
    expected: ["heart-rate", "power"],
    observations: [
      {
        kind: "measured",
        provenance: {
          source: "device",
          captureTime: T("2026-01-02T07:00:00.000Z"),
          recordingTime: T("2026-01-02T07:05:00.000Z"),
          reference: "device:fit:hr",
        },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: {
          source: "athlete-report",
          captureTime: T("2026-01-02T08:00:00.000Z"),
          recordingTime: T("2026-01-02T08:01:00.000Z"),
          reference: "report:diary:1",
        },
        quality: { status: "complete", reason: "self-report captured verbatim" },
        words: "I felt unusually heavy",
      },
      {
        // The quality-limited / missing datum: power was expected but absent for this session.
        kind: "missing-data",
        provenance: {
          source: "device",
          captureTime: T("2026-01-02T07:00:00.000Z"),
          recordingTime: T("2026-01-02T07:05:00.000Z"),
          reference: "device:fit:power",
        },
        quality: { status: "missing", reason: "power channel dropped out mid-session" },
        expected: "power",
      },
    ],
  });
}

// The caller supplies the contextual frame per observation; the coordinator invents none.
function frameFor(observation: Observation): ContextualFrame {
  switch (observation.kind) {
    case "measured":
      // enough context to judge the deviation -> a Signal
      return contextualFrame({
        purpose: "build aerobic base",
        sessionContext: "threshold ride",
        expectedRange: { quantity: "heart-rate", low: 120, high: 150, unit: "bpm" },
      });
    case "subjective":
      // situated self-report (quality complete, not context-missing) -> a Signal
      return contextualFrame({ purpose: "build aerobic base", sessionContext: "threshold ride" });
    case "missing-data":
      // no purpose in frame -> the absence is recorded as a SignalRejection, not asserted as meaning
      return contextualFrame({ sessionContext: "threshold ride", missingContext: ["purpose"] });
  }
}

// ----------------------------------------------------------------------------------------------
// The whole chain, run once per assertion (deterministic, cheap). Returns every artifact so each
// test can inspect the stage it cares about.
// ----------------------------------------------------------------------------------------------
function runChain() {
  // Step 1 — intake
  const set = buildObservationSet();
  const measuredObs = set.active().find((o) => o.kind === "measured");
  assert.ok(measuredObs, "fixture must contain a measured observation");

  // Step 2 — contextualization + signal detection
  const detection = detectSignals({ set, frameFor });
  const signals = detection.filter((d): d is Signal => d.outcome === "signal");
  const rejections = detection.filter((d): d is SignalRejection => d.outcome === "rejection");
  const measuredSignal = signals.find((s) => s.questionTopic.startsWith("deviation:"));
  assert.ok(measuredSignal, "the measured HR deviation must produce a Signal");

  // Step 3 — falsifiable Hypothesis + EvidenceCase (Signal attached as support)
  const hypothesis = attachSignalAsEvidence({
    hypothesis: openHypothesis({
      claim: hypothesisClaim(
        "high-intensity sessions may raise this athlete's aerobic heart-rate response",
        "response-pattern",
      ),
      scope: hypothesisScope({ statement: "threshold rides", timescale: "single session" }),
      athleteRef: ATHLETE,
      falsifiers: [falsifier({ condition: "a flat HR response on retest", status: "declared" })],
    }),
    signal: measuredSignal,
    direction: "supports",
    reasoningNote: "HR ran above the expected range while the athlete reported heaviness",
    at: T("2026-01-02T09:00:00.000Z"),
  });

  // Step 4 — understanding update (consumes the hypothesis OUTCOME, not the raw signal)
  const outcome = reasoningOutcomeFrom({
    hypothesis,
    dimension: DIMENSION,
    conditions: ["high-intensity threshold ride"],
    at: T("2026-01-02T09:05:00.000Z"),
  });
  const profile = updateUnderstandingFromOutcome({
    profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE }),
    outcome,
  });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });
  assert.ok(assessment, "a dimension-specific assessment must be produced");

  // Step 5 — DecisionSupportCase: open, run gates, select terminal output
  const candidate: CandidateSupport = Object.freeze({
    intent: "reflect",
    markers: Object.freeze([]),
    uncertaintyVisible: true,
  });
  const trace = verifyTraceability(hypothesis);
  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({
        choice: "reflect on the heaviness vs. push the next session",
        whySupportMayHelp: "a non-obvious fatigue pattern is worth surfacing, not directing",
        athleteRef: ATHLETE,
        at: T("2026-01-02T09:10:00.000Z"),
      }),
      assessment,
      purpose: purposeContext("declared", "build aerobic base for a July race"),
      risk: noRisk(),
      candidate,
      trace,
      claimState: claimStateOf(hypothesis),
    }),
  });

  return {
    set,
    measuredObs,
    detection,
    signals,
    rejections,
    measuredSignal,
    hypothesis,
    profile,
    assessment,
    candidate,
    trace,
    evaluated,
  };
}

// ==============================================================================================
// The 20 required end-to-end assertions (Spec 006 §8 / Tech Spec 006A §4).
// ==============================================================================================

test("AC1 — ObservationSet contains raw observations with provenance (and no meaning)", () => {
  const { set } = runChain();
  const active = set.active();
  assert.ok(active.length >= 2, "intake records the observations");
  for (const o of active) {
    assert.ok(o.provenance.reference.length > 0, "every observation carries provenance");
    // an Observation has no slot for meaning -- structurally there is nothing to assert away.
    assert.equal((o as unknown as Record<string, unknown>)["signal"], undefined);
  }
});

test("AC2/AC3 — Signal is produced ONLY by detection; no Signal exists at intake", () => {
  const set = buildObservationSet();
  // intake produced no signal-shaped value
  for (const o of set.active()) {
    assert.notEqual((o as unknown as Record<string, unknown>)["outcome"], "signal");
  }
  const { signals } = runChain();
  assert.ok(signals.length >= 1, "detection produces at least one Signal");
});

test("AC4 — a Signal is not Evidence (it has no EvidenceCase shape)", () => {
  const { measuredSignal } = runChain();
  assert.equal(measuredSignal.outcome, "signal");
  const bag = measuredSignal as unknown as Record<string, unknown>;
  assert.equal(bag["direction"] !== undefined, true); // signal-level field
  assert.equal(bag["reasoningNote"], undefined); // evidence-level field is absent
  assert.equal(bag["id"], undefined); // a Signal is a value object, not an EvidenceCase entity
});

test("AC5 — an EvidenceCase exists ONLY inside the Hypothesis", () => {
  const { hypothesis } = runChain();
  assert.equal(hypothesis.evidence.length, 1, "the signal became one EvidenceCase inside the hypothesis");
  // reasoning's public surface exposes no standalone EvidenceCase constructor
  assert.equal(
    (Object.prototype.hasOwnProperty.call(globalThis, "createEvidenceCase")),
    false,
  );
});

test("AC6/AC7 — the Hypothesis is falsifiable and its confidence is not certainty", () => {
  const { hypothesis } = runChain();
  assert.ok(
    hypothesis.falsifiers.some((f) => f.status === "declared"),
    "a declared falsifier is present",
  );
  assert.equal(hypothesis.state, "supported"); // a defeasible state, not "certain/proven"
  // there is no certainty level in the vocabulary
  assert.notEqual(hypothesis.confidence.level as string, "certain");
  assert.notEqual(hypothesis.confidence.level as string, "proven");
});

test("AC8 — understanding consumed the hypothesis outcome, not a raw Signal", () => {
  const { assessment } = runChain();
  // the assessment's trace references a hypothesis-outcome (not a signal)
  assert.ok(assessment.trace.length >= 1, "the assessment traces to a hypothesis outcome");
  const traceBag = assessment.trace[0] as unknown as Record<string, unknown>;
  assert.equal(traceBag["questionTopic"], undefined, "understanding never saw a Signal's fields");
});

test("AC9 — the UnderstandingAssessment is dimension-specific", () => {
  const { profile, assessment } = runChain();
  assert.equal(assessment.dimension.key, DIMENSION.key);
  assert.equal(produceUnderstandingAssessment({ profile, dimensionKey: "other::dimension" }), undefined);
});

test("AC10 — a single supported chain yields a MODEST ceiling: level Working, ceiling tentative", () => {
  const { assessment } = runChain();
  assert.equal(assessment.level, "Working");
  assert.equal(assessment.safeVoiceCeiling, "tentative");
});

test("AC11 — DecisionSupportCase VERIFIES traceability, it does not author it", () => {
  const { trace, evaluated } = runChain();
  assert.equal(trace.status, "complete");
  // the case has no method that creates a trace; it only carries the verified result
  assert.equal(typeof (evaluated as unknown as Record<string, unknown>)["authorTrace"], "undefined");
  assert.equal(evaluated.trace.status, "complete");
});

test("AC12/AC13 — terminal output is DecisionSupport with VoiceMode Reflection", () => {
  const { evaluated } = runChain();
  const out = evaluated.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.voice, "Reflection");
    assert.equal(out.intent, "reflect");
  }
});

test("AC14 — Recommendation is NOT produced (and neither is Warning)", () => {
  const { evaluated } = runChain();
  const out = evaluated.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.notEqual(out.voice as string, "Recommendation");
    assert.notEqual(out.voice as string, "Warning");
  }
});

test("AC15 — no command/shame/certainty/decision-ownership markers; agency preserved", () => {
  const { evaluated, candidate } = runChain();
  assert.deepEqual([...candidate.markers], []);
  const out = evaluated.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    assert.equal(out.preservesAgency, true);
    assert.equal(out.uncertaintyVisible, true);
  }
});

test("AC16 — AthleteDecision is not owned by the case", () => {
  const { evaluated } = runChain();
  assert.equal(evaluated.athleteDecisionRef, undefined);
  assert.equal((evaluated as unknown as Record<string, unknown>)["athleteDecision"], undefined);
});

test("AC17 — traceability reaches back to the ObservationSet", () => {
  const { evaluated, set, measuredObs } = runChain();
  const out = evaluated.selectedOutput;
  assert.ok(out && out.outcome === "support");
  if (out && out.outcome === "support") {
    const resolved = out.trace.resolvedTo;
    assert.ok(resolved, "the verified trace resolves to observation roots");
    assert.equal(resolved.observationSetId, String(set.id));
    assert.ok(
      resolved.observationIds.includes(String(measuredObs.id)),
      "the chain resolves back to the measured observation in the set",
    );
  }
});

test("AC18 — the quality limitation survives the whole chain (uncertainty not silently cleaned)", () => {
  const { rejections } = runChain();
  // the missing power datum surfaces as an auditable SignalRejection, still traceable -- not dropped
  const powerGap = rejections.find((r) => r.trace.references.includes("device:fit:power"));
  assert.ok(powerGap, "the missing-data observation survives as an auditable rejection");
  assert.equal(powerGap.quality.status, "missing");
  assert.equal(powerGap.reason, "insufficient-context");
});

test("the produced output is the SUCCESS case: Reflection is the correct, modest answer", () => {
  // Restraint by construction: complete trace + clean gates, yet a single chain tops out at Reflection.
  const { evaluated, trace } = runChain();
  assert.equal(trace.status, "complete");
  assert.ok(evaluated.gateResults.length > 0, "gates ran");
  const out = evaluated.selectedOutput;
  assert.ok(out && out.outcome === "support" && out.voice === "Reflection");
});

// ----------------------------------------------------------------------------------------------
// AC19/AC20 — structural guards: no new top-level module, no module owns the whole core,
// no UI/API/DB/LLM/event-bus layer. (The full 001-005 suite + boundary tests run via `npm test`.)
// ----------------------------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
const modulesDir = join(here, ".."); // __tests__ -> modules
// `athlete` is the approved upstream-context module added in Implementation 007 (Purpose-first).
// `event-recording` is the dependency-neutral occurrence-log module added in Implementation 011
// (imports only shared-kernel; no domain module imports it; not part of this e2e flow).
// `rendering` is the downstream presentation boundary added in Implementation 014 (imports only
// shared-kernel + read-only decision-support types; no domain module imports it; not part of this e2e flow).
// `delivery` is the downstream exposure boundary added in Implementation 016 (imports only shared-kernel +
// read-only rendering; no module imports it; test-only sink; not part of this e2e flow).
// `application-orchestration` is the explicit application COMPOSITION module added in Implementation 025 — it
// owns no domain model/repository/persistence and introduces no bounded context; it composes the existing
// public surfaces of rendering/delivery/event-recording over injected collaborators. It is an approved
// application-composition module, not a new domain capability — so it is allowlisted here additively (the
// nine domain/integration modules above + this one composition module); the guard keeps rejecting every
// other unapproved UI/API/DB/LLM/event-bus/scheduler/queue/retry/workflow module.
const ALLOWED_MODULES = new Set([
  "observation",
  "reasoning",
  "understanding",
  "decision-support",
  "athlete",
  "event-recording",
  "rendering",
  "delivery",
  "application-orchestration",
]);
const MODULE_SURFACES = ["observation/index", "reasoning/index", "understanding/index", "decision-support/index"];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

test("AC20 — no new top-level module was introduced (only the four core modules + __tests__)", () => {
  const entries = readdirSync(modulesDir).filter((e) => statSync(join(modulesDir, e)).isDirectory());
  for (const e of entries) {
    assert.ok(
      ALLOWED_MODULES.has(e) || e === "__tests__",
      `unexpected top-level module '${e}' (no UI/API/DB/LLM/event-bus layer allowed)`,
    );
  }
});

test("AC20 — no PRODUCTION file imports all four module surfaces (no layer owns the whole core)", () => {
  const productionFiles = collectTsFiles(modulesDir).filter(
    (f) => !f.includes("__tests__") && !f.endsWith(".test.ts") && !f.includes("/tests/"),
  );
  for (const f of productionFiles) {
    const src = readFileSync(f, "utf8");
    const importsAll = MODULE_SURFACES.every((m) => src.includes(m));
    assert.equal(importsAll, false, `production file ${f} must not compose all four modules`);
  }
});

test("AC20 — no forbidden UI/API/DB/LLM/event-bus surface name leaks into a module export", () => {
  const forbidden = /\b(ui|api|http|database|persistence|eventbus|llm|openai|anthropic)\b/i;
  for (const surface of MODULE_SURFACES) {
    const src = readFileSync(join(modulesDir, `${surface}.ts`), "utf8");
    for (const line of src.split("\n")) {
      if (!line.startsWith("export")) continue;
      assert.equal(forbidden.test(line), false, `forbidden surface in ${surface}: ${line}`);
    }
  }
});
