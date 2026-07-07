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
// athlete-facing sentence requires a new domain truth — these four strings already exist below).
const HYPOTHESIS_CLAIM =
  "la tolerancia al trabajo sostenido de este atleta podría estar bajo carga acumulada";
const OBSERVATION_NOTE = "HR por encima del rango esperado junto a un reporte subjetivo de pesadez";
const WHY_SUPPORT_MAY_HELP = "un patrón de fatiga no obvio vale la pena mostrarse, no dirigirse";
const REVISION_CONDITION = "una respuesta normal de HR en la próxima sesión";

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

  // 6 — pure assembly (the only step the page itself depends on). The four substance fields are
  // the SAME strings already used to build the domain chain above (§named consts) — nothing new is
  // derived here, only carried through (045-D governing constraint).
  return assembleAthleteHome({
    purposeView: athlete.currentPurposeView(),
    assessments: assessment === undefined ? [] : [assessment],
    terminalOutput: evaluated.selectedOutput,
    athleteLabel: "atleta de muestra",
    interpretationSynthesis: HYPOTHESIS_CLAIM,
    observationNote: OBSERVATION_NOTE,
    purposeRelevanceNote: WHY_SUPPORT_MAY_HELP,
    revisionCondition: REVISION_CONDITION,
  });
}
