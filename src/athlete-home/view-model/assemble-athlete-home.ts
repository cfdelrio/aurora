// athlete-home assembler — UI-001 (Athlete Home).
//
// A PURE mapping from already-produced domain outputs to the AthleteHomeViewModel. It consumes only
// PUBLIC module surfaces (athlete, understanding, decision-support — three, deliberately not the
// four-core set AC20 guards) and performs NO domain computation: no gate is re-run, no confidence
// is re-derived, no state is inferred here. If the domain did not say it, this file cannot show it.
//
// Language discipline (enforced by tests): output copy is defeasible — "Aurora observa…",
// "la evidencia sugiere…", "parece…" — never imperative ("tenés que…", "hoy hacé…"), because
// Aurora helps the athlete think; it does not replace the athlete's decision.

import type { CurrentPurposeView } from "../../modules/athlete/index.ts";
import type { UnderstandingAssessment, UnderstandingLevel } from "../../modules/understanding/index.ts";
import type { TerminalOutput, VoiceMode } from "../../modules/decision-support/index.ts";
import type {
  AthleteHomeViewModel,
  AttentionSection,
  DirectionSection,
  NotYetModeledSection,
  UnderstandingItemViewModel,
  UnderstandingSection,
} from "./athlete-home-view-model.ts";

export interface AssembleAthleteHomeInput {
  readonly purposeView: CurrentPurposeView;
  readonly assessments: readonly UnderstandingAssessment[];
  readonly terminalOutput?: TerminalOutput | undefined;
  readonly athleteLabel?: string | undefined;
}

// --- direction (declared, never inferred) ---------------------------------------------------------

function directionFrom(view: CurrentPurposeView): DirectionSection {
  switch (view.status) {
    case "declared":
      return Object.freeze({
        state: "declared",
        statement: view.statement ?? "",
        epistemic: "declared",
      } as const);
    case "ambiguous":
      return Object.freeze(
        view.statement === undefined
          ? ({ state: "ambiguous", epistemic: "declared" } as const)
          : ({ state: "ambiguous", statement: view.statement, epistemic: "declared" } as const),
      );
    case "unknown":
      return Object.freeze({ state: "unknown", epistemic: "declared" } as const);
  }
}

// --- honest not-yet-modeled sections (documented domain gaps, never silent mocks) ------------------

const CURRENT_STATE_GAP: NotYetModeledSection = Object.freeze({
  state: "not-yet-modeled",
  whatIsMissing:
    "El modelo CurrentState/StateSnapshot (docs/domain-modeling/ATHLETE_AGGREGATE.md) todavía no está implementado en el dominio.",
});

const CAPACITY_GAP: NotYetModeledSection = Object.freeze({
  state: "not-yet-modeled",
  whatIsMissing:
    "El modelo CapacityProfile/CapacityEstimate (docs/domain-modeling/ATHLETE_AGGREGATE.md) todavía no está implementado en el dominio.",
});

const TRAJECTORY_GAP: NotYetModeledSection = Object.freeze({
  state: "not-yet-modeled",
  whatIsMissing:
    "El modelo ImpactAssessment (docs/domain-modeling/CORE_REASONING_MODEL.md) todavía no está implementado en el dominio.",
});

// --- understanding (real assessments -> sober human words) ----------------------------------------

const LEVEL_PHRASES: Record<UnderstandingLevel, string> = {
  Unknown: "Aurora todavía no te conoce en esta dimensión",
  Thin: "confianza incipiente — poca evidencia todavía",
  Working: "confianza en construcción — evidencia inicial consistente",
  Trusted: "confianza sólida — evidencia repetida y desafiada",
  Mature: "confianza consolidada — patrón personal establecido",
};

function understandingItem(a: UnderstandingAssessment): UnderstandingItemViewModel {
  return Object.freeze({
    dimensionLabel: a.dimension.key.split("::")[0]!.replace(/-/g, " "),
    level: a.level,
    confidencePhrase: LEVEL_PHRASES[a.level],
    isStale: a.staleness.status === "stale",
    isFragile: a.fragility.level === "high",
    reasons: a.reasons,
    epistemic: "inferred",
  } as const);
}

function understandingFrom(assessments: readonly UnderstandingAssessment[]): UnderstandingSection {
  if (assessments.length === 0) {
    return Object.freeze({ state: "no-dimensions" } as const);
  }
  return Object.freeze({ state: "assessed", items: Object.freeze(assessments.map(understandingItem)) } as const);
}

// --- attention (the terminal output the decision-support gates actually selected) -----------------

const VOICE_PHRASES: Record<Exclude<VoiceMode, "Silence">, string> = {
  Reflection: "Aurora observa algo que puede valer una reflexión.",
  Framing: "Aurora te muestra un trade-off para que lo pienses.",
  Warning: "Aurora ve un riesgo que parece merecer tu atención.",
  Recommendation: "La evidencia sugiere una opción — la decisión sigue siendo tuya.",
};

function attentionFrom(output: TerminalOutput | undefined): AttentionSection {
  if (output === undefined) {
    return Object.freeze({ state: "none" } as const);
  }
  switch (output.outcome) {
    case "support":
      return Object.freeze({
        state: "support",
        voice: output.voice,
        phrase: output.voice === "Silence" ? "" : VOICE_PHRASES[output.voice],
        reasons: output.reasons,
        uncertaintyVisible: output.uncertaintyVisible,
        epistemic: "inferred",
      } as const);
    case "inquiry":
      return Object.freeze({
        state: "inquiry",
        question: output.question,
        whatNeeded: output.whatNeeded,
        epistemic: "inferred",
      } as const);
    case "withholding":
      return Object.freeze({ state: "withholding", reason: output.reason, epistemic: "inferred" } as const);
  }
}

// --- headline: one sentence, synthesized only from what the sections already say -------------------

function headlineFrom(direction: DirectionSection, attention: AttentionSection): {
  readonly text: string;
  readonly epistemic: "declared" | "inferred";
} {
  if (attention.state === "support" || attention.state === "inquiry" || attention.state === "withholding") {
    return Object.freeze({
      text: "Aurora tiene una interpretación en curso sobre vos — es una lectura, no una verdad.",
      epistemic: "inferred",
    } as const);
  }
  if (direction.state === "declared") {
    return Object.freeze({
      text: "Tu dirección está declarada. Aurora todavía está construyendo su comprensión.",
      epistemic: "declared",
    } as const);
  }
  return Object.freeze({
    text: "Aurora todavía no tiene suficiente para interpretarte. Eso también es información honesta.",
    epistemic: "declared",
  } as const);
}

/** Pure assembly. Throws nothing domain-shaped; renders whatever the domain actually produced. */
export function assembleAthleteHome(input: AssembleAthleteHomeInput): AthleteHomeViewModel {
  const direction = directionFrom(input.purposeView);
  const attention = attentionFrom(input.terminalOutput);
  const base = {
    state: "ready" as const,
    headline: headlineFrom(direction, attention),
    direction,
    currentState: CURRENT_STATE_GAP,
    capacity: CAPACITY_GAP,
    trajectory: TRAJECTORY_GAP,
    understanding: understandingFrom(input.assessments),
    attention,
  };
  return Object.freeze(
    input.athleteLabel === undefined ? base : { ...base, athleteLabel: input.athleteLabel },
  );
}
