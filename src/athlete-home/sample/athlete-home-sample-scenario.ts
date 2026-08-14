// athlete-home SAMPLE SCENARIO — UI-001 (Athlete Home).
//
// ⚠ SAMPLE DATA — NOT PRODUCTION LOGIC, NOT REAL ATHLETE DATA. ⚠
// This module exists so the Athlete Home page can be developed and reviewed visually before a real
// persistence-backed query layer exists. It is:
//   - clearly isolated (this sample/ directory, imported only by tests and the page generator);
//   - typed end-to-end;
//   - explicitly identified (this banner, the athleteLabel below);
//   - trivially replaceable: swap `sampleAthleteHomeViewModel()` for a real data source and
//     everything downstream (assembler, renderer) is untouched.
//
// It is NOT a silent mock: rather than fabricating view-model JSON, it drives the REAL production
// domain chain — the same one proven by src/modules/__tests__/end-to-end-responsible-reflection.ts:
//   Athlete.declarePurpose -> ObservationSet -> detectSignals -> Hypothesis+Evidence ->
//   UnderstandingProfile -> DecisionSupportCase -> TerminalOutput
// so every inferred value on the page was produced by actual domain code under its real gates
// (which is why the sample lands on VoiceMode "Reflection", not "Recommendation").

import { timestamp } from "../../shared-kernel/time.ts";

import { Athlete, purpose } from "../../modules/athlete/index.ts";
import {
  contextualFrame,
  detectSignals,
  recordObservationSet,
} from "../../modules/observation/index.ts";
import type { ContextualFrame, Observation, Signal } from "../../modules/observation/index.ts";
import {
  attachSignalAsEvidence,
  falsifier,
  hypothesisClaim,
  hypothesisScope,
  openHypothesis,
} from "../../modules/reasoning/index.ts";
import {
  UnderstandingProfile,
  produceUnderstandingAssessment,
  reasoningOutcomeFrom,
  understandingDimension,
  updateUnderstandingFromOutcome,
} from "../../modules/understanding/index.ts";
import {
  claimStateOf,
  decisionOpportunity,
  evaluateDecisionSupportCase,
  noRisk,
  openDecisionSupportCase,
  purposeContext,
  verifyTraceability,
} from "../../modules/decision-support/index.ts";
import type { CandidateSupport } from "../../modules/decision-support/index.ts";

import { assembleAthleteHome } from "../view-model/assemble-athlete-home.ts";
import type { AthleteHomeViewModel } from "../view-model/athlete-home-view-model.ts";

const T = (iso: string) => timestamp(iso);
const ATHLETE_REF = "athlete:sample-ui-001";
const PURPOSE_STATEMENT = "Preparar el 200 mariposa de noviembre";
const DIMENSION = understandingDimension("sustained-work-tolerance", "threshold sessions");

// Named once so the SAME real domain-output text both drives the domain chain AND is handed,
// unmodified, to the assembler's caller-supplied substance fields (045-D governing constraint: no
// athlete-facing sentence requires a new domain truth — these strings already exist below).
//
// 045-E surgical pass (Finding 1): phrased in direct second person ("tu tolerancia"), never
// "este atleta" — the athlete-facing headline reads this verbatim, and the rest of the page
// consistently addresses the athlete directly.
const HYPOTHESIS_CLAIM = "tu tolerancia al trabajo sostenido podría estar bajo carga acumulada";
// 045-F surgical pass (A01/Carlos watch item — the observation did not transfer independently in
// review; he retained the conclusion, not this sentence): spelled out in plain Spanish instead of
// the "HR" abbreviation and the clinical "reporte subjetivo" framing — same meaning, same
// evidence, more readable to an athlete without training-data vocabulary.
const OBSERVATION_NOTE =
  "frecuencia cardíaca por encima de lo esperado junto con sensación de pesadez";
// whySupportMayHelp remains a required field of the real DecisionOpportunity domain object — it is
// Aurora's OWN reasoning about why an opportunity is worth surfacing at all (display policy), and
// stays exactly that: an input to the real gates, never athlete-facing copy (045-E Finding 2 — that
// distinction is the whole point of the fix below).
const WHY_SUPPORT_MAY_HELP = "un patrón de fatiga no obvio vale la pena mostrarse, no dirigirse";
const REVISION_CONDITION = "una respuesta normal de HR en la próxima sesión";
// 045-E surgical pass (Finding 2): a COMPLETE, athlete-facing sentence — grounded only in fields
// already present in this scenario (the hypothesis's own scope, "threshold sessions"; the
// understanding dimension key, "sustained-work-tolerance"; and the declared purpose statement
// above) — connecting the observation to the athlete's OWN preparation, not to Aurora's display
// policy. No physiology, causality, recovery state, readiness, or risk is asserted: a 200m race
// being a sustained-effort event is definitional, not a claim about this athlete's body.
const PURPOSE_RELEVANCE_NOTE =
  "Esto pasó en una sesión de umbral — el mismo tipo de esfuerzo sostenido que tu preparación " +
  "para el 200 mariposa necesita entrenar. Por eso esta lectura podría ser relevante para cómo " +
  "se está construyendo esa preparación.";

function frameFor(observation: Observation): ContextualFrame {
  switch (observation.kind) {
    case "measured":
      return contextualFrame({
        purpose: PURPOSE_STATEMENT,
        sessionContext: "threshold session",
        expectedRange: { quantity: "heart-rate", low: 120, high: 150, unit: "bpm" },
      });
    case "subjective":
      return contextualFrame({ purpose: PURPOSE_STATEMENT, sessionContext: "threshold session" });
    case "missing-data":
      return contextualFrame({ sessionContext: "threshold session", missingContext: ["purpose"] });
  }
}

/** Runs the real chain once and assembles the view model. Deterministic; sample-labeled. */
export function sampleAthleteHomeViewModel(): AthleteHomeViewModel {
  // 1 — the athlete DECLARES purpose (real Athlete aggregate; never inferred)
  const athlete = Athlete.create({ identityRef: ATHLETE_REF }).declarePurpose(
    purpose({
      statement: PURPOSE_STATEMENT,
      source: "athlete-declared",
      effectiveAt: T("2026-07-01T09:00:00.000Z"),
    }),
  );

  // 2 — a real ObservationSet through the real intake shape
  const set = recordObservationSet({
    occasion: "session:2026-07-05-threshold",
    expected: ["heart-rate"],
    observations: [
      {
        kind: "measured",
        provenance: {
          source: "device",
          captureTime: T("2026-07-05T07:00:00.000Z"),
          recordingTime: T("2026-07-05T07:05:00.000Z"),
          reference: "device:sample:hr",
        },
        quality: { status: "complete", reason: "device recorded cleanly" },
        measurement: { quantity: "heart-rate", magnitude: 168, unit: "bpm" },
      },
      {
        kind: "subjective",
        provenance: {
          source: "athlete-report",
          captureTime: T("2026-07-05T08:00:00.000Z"),
          recordingTime: T("2026-07-05T08:00:00.000Z"),
          reference: "report:sample:post-session",
        },
        quality: { status: "complete", reason: "situated self-report" },
        words: "las últimas series se sintieron más pesadas de lo habitual",
      },
    ],
  });

  // 3 — real signal detection + a real, falsifiable hypothesis
  const detection = detectSignals({ set, frameFor });
  const signal = detection.find((d): d is Signal => d.outcome === "signal");
  if (signal === undefined) {
    return Object.freeze({ state: "error", message: "el escenario sample no produjo señal" } as const);
  }
  const hypothesis = attachSignalAsEvidence({
    hypothesis: openHypothesis({
      claim: hypothesisClaim(HYPOTHESIS_CLAIM, "response-pattern"),
      scope: hypothesisScope({ statement: "threshold sessions", timescale: "single session" }),
      athleteRef: ATHLETE_REF,
      falsifiers: [falsifier({ condition: REVISION_CONDITION, status: "declared" })],
    }),
    signal,
    direction: "supports",
    reasoningNote: OBSERVATION_NOTE,
    at: T("2026-07-05T09:00:00.000Z"),
  });

  // 4 — real understanding update + assessment
  const profile = updateUnderstandingFromOutcome({
    profile: UnderstandingProfile.initialize({ athleteRef: ATHLETE_REF }),
    outcome: reasoningOutcomeFrom({
      hypothesis,
      dimension: DIMENSION,
      conditions: ["threshold session"],
      at: T("2026-07-05T09:05:00.000Z"),
    }),
  });
  const assessment = produceUnderstandingAssessment({ profile, dimensionKey: DIMENSION.key });

  // 5 — real decision-support case through the real gates
  const candidate: CandidateSupport = Object.freeze({
    intent: "reflect",
    markers: Object.freeze([]),
    uncertaintyVisible: true,
  });
  const evaluated = evaluateDecisionSupportCase({
    decisionCase: openDecisionSupportCase({
      opportunity: decisionOpportunity({
        choice: "reflexionar sobre la pesadez vs. buscar intensidad en la próxima sesión",
        whySupportMayHelp: WHY_SUPPORT_MAY_HELP,
        athleteRef: ATHLETE_REF,
        at: T("2026-07-05T09:10:00.000Z"),
      }),
      assessment: assessment!,
      purpose: purposeContext("declared", PURPOSE_STATEMENT),
      risk: noRisk(),
      candidate,
      trace: verifyTraceability(hypothesis),
      claimState: claimStateOf(hypothesis),
    }),
  });

  // 6 — pure assembly (the only step the page itself depends on). The substance fields are the
  // SAME strings already used to build the domain chain above (§named consts) — nothing new is
  // derived here, only carried through (045-D governing constraint). purposeRelevanceNote uses
  // PURPOSE_RELEVANCE_NOTE, not WHY_SUPPORT_MAY_HELP — the latter stays a domain-object-only input
  // (045-E Finding 2).
  return assembleAthleteHome({
    purposeView: athlete.currentPurposeView(),
    assessments: assessment === undefined ? [] : [assessment],
    terminalOutput: evaluated.selectedOutput,
    athleteLabel: "atleta de muestra",
    interpretationSynthesis: HYPOTHESIS_CLAIM,
    observationNote: OBSERVATION_NOTE,
    purposeRelevanceNote: PURPOSE_RELEVANCE_NOTE,
    revisionCondition: REVISION_CONDITION,
  });
}
