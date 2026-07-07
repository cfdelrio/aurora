// athlete-home assembler — UI-001 (Athlete Home), storytelling pass per Product Design Iteration
// 045-D.
//
// A PURE mapping from already-produced domain outputs to the AthleteHomeViewModel. It consumes only
// PUBLIC module surfaces (athlete, understanding, decision-support — three, deliberately not the
// four-core set AC20 guards) and performs NO domain computation: no gate is re-run, no confidence
// is re-derived, no state is inferred here. If the domain did not say it, this file cannot show it.
//
// 045-D governing constraint: every new athlete-facing sentence below is either (a) an
// already-produced domain string, prefixed/framed by a fixed template, or (b) a closed-vocabulary
// translation of an already-produced, finite-union domain token (gate name, verdict, understanding
// change reason, dimension key) into human Spanish. No sentence requires a new domain truth.
//
// Language discipline (enforced by tests): output copy is defeasible — "Aurora observa…",
// "la evidencia sugiere…", "parece…" — never imperative ("tenés que…", "hoy hacé…"), because
// Aurora helps the athlete think; it does not replace the athlete's decision. Explanation folds are
// athlete-facing traceability, never architecture dumps — no gate names, no enum syntax, no
// repository paths reach rendered copy (045-D §4).

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
  // --- already-available domain substance, caller-supplied as plain strings (Spec 045 Input C
  // shape — independent section inputs, never a whole-home composer). Each is sourced, by the
  // caller, from a real domain output that already exists today (Hypothesis.claim, an
  // EvidenceCase's reasoningNote, a DecisionOpportunity's whySupportMayHelp, a Falsifier's
  // condition) — this file never fetches or derives them itself. ------------------------------
  /** the hypothesis claim text — what Aurora currently thinks is happening */
  readonly interpretationSynthesis?: string | undefined;
  /** the evidence reasoningNote — the concrete thing Aurora noticed */
  readonly observationNote?: string | undefined;
  /** why the support opportunity may help — used to phrase purpose relevance */
  readonly purposeRelevanceNote?: string | undefined;
  /** the falsifier condition — what would make Aurora revise this reading */
  readonly revisionCondition?: string | undefined;
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

// --- honest not-yet-modeled areas, consolidated into ONE section (045-D §5) -----------------------
// Never a repository path or internal domain-model name in the rendered note (045-D §4/AC5) — the
// traceability to docs/domain-modeling lives in code comments, never in athlete-facing copy.

const NOT_YET_MODELED: NotYetModeledSection = Object.freeze({
  state: "not-yet-modeled",
  areas: Object.freeze([
    Object.freeze({ label: "cómo estás hoy" }),
    Object.freeze({ label: "tu capacidad" }),
    Object.freeze({ label: "cómo está cambiando tu entrenamiento en el tiempo" }),
  ]),
  note:
    "Aurora todavía no construyó una forma de leer esto con la misma disciplina que el resto de " +
    "esta página. Antes que inventar un número, prefiere decírtelo.",
});

// --- understanding (real assessments -> sober human words) ----------------------------------------

const LEVEL_PHRASES: Record<UnderstandingLevel, string> = {
  Unknown: "Aurora todavía no te conoce en esta dimensión",
  Thin: "confianza incipiente — poca evidencia todavía",
  Working: "confianza en construcción — evidencia inicial consistente",
  Trusted: "confianza sólida — evidencia repetida y desafiada",
  Mature: "confianza consolidada — patrón personal establecido",
};

// Closed-vocabulary display names for the dimension keys this prototype currently exercises — a
// scoped copy table, not a general terminology framework (045-D §6). Unknown keys fall back to a
// de-hyphenated rendering of the key itself, exactly as before this iteration.
const DIMENSION_DISPLAY_NAMES: Record<string, string> = {
  "sustained-work-tolerance": "tolerancia al trabajo sostenido",
};

function humanizeDimensionLabel(key: string): string {
  const base = key.split("::")[0]!;
  return DIMENSION_DISPLAY_NAMES[base] ?? base.replace(/-/g, " ");
}

// UnderstandingChangeReason is a closed 9-value union (understanding/domain/understanding-change.ts);
// UnderstandingProfile.assess() renders each change as `${reason}: ${from} -> ${to}` (and fragility/
// staleness reasons as `fragility: ...` / `stale: ...`). This table translates that FINITE, already-
// produced vocabulary into human Spanish — no new domain truth, only a closed-set relabeling.
const CHANGE_REASON_PHRASES: Record<string, string> = {
  initial: "Aurora recién empieza a formarse una idea en este tema.",
  "survived-challenge": "Ya viste una situación similar antes, y lo que pasó confirmó esta lectura.",
  contradiction: "Algo que pasó no encajó con lo que Aurora esperaba, y la confianza bajó.",
  falsification: "Lo que haría dudar de esta idea efectivamente pasó, y Aurora la dejó de lado.",
  surprise: "Algo inesperado ocurrió y Aurora está reconsiderando esta lectura.",
  staleness: "Pasó tiempo sin evidencia nueva, así que Aurora es más cautelosa acá.",
  "purpose-change": "Tu dirección cambió, así que esta lectura se está revisando.",
  "constraint-change": "Algo en tu situación cambió, así que esta lectura se está revisando.",
  "context-shift": "El contexto donde se observó esto cambió, y Aurora lo tiene en cuenta.",
};

function humanizeUnderstandingReason(raw: string): string {
  const changeMatch = /^([a-z-]+):\s/.exec(raw);
  if (changeMatch !== null) {
    const known = CHANGE_REASON_PHRASES[changeMatch[1]!];
    if (known !== undefined) return known;
  }
  if (raw.startsWith("fragility: ")) return `Esto todavía es sensible a cambios: ${raw.slice(11)}.`;
  if (raw.startsWith("stale: ")) return `Esto está desactualizado: ${raw.slice(7)}.`;
  return "Este nivel de confianza se ajustó por evidencia reciente.";
}

function understandingItem(a: UnderstandingAssessment): UnderstandingItemViewModel {
  return Object.freeze({
    dimensionLabel: humanizeDimensionLabel(a.dimension.key),
    level: a.level,
    confidencePhrase: LEVEL_PHRASES[a.level],
    isStale: a.staleness.status === "stale",
    isFragile: a.fragility.level === "high",
    reasons: Object.freeze(a.reasons.map(humanizeUnderstandingReason)),
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

const VOICE_FALLBACK_OBSERVATION: Record<Exclude<VoiceMode, "Silence">, string> = {
  Reflection: "Aurora observa algo que puede valer una reflexión.",
  Framing: "Aurora te muestra un trade-off para que lo pienses.",
  Warning: "Aurora ve un riesgo que parece merecer tu atención.",
  Recommendation: "La evidencia sugiere una opción — la decisión sigue siendo tuya.",
};

// DecisionSupport.reasons is produced as `${gate}:${verdict}` over a closed set of five gates
// (EvidenceGate/UnderstandingGate/PurposeGate/RiskGate/AgencyGate) and five verdicts
// (decision-support/domain/gate-result.ts, voice-selection-policy.ts) — a finite, already-produced
// vocabulary. This table translates it into one athlete-facing sentence instead of a raw token
// dump (045-D §4/AC5/AC6): traceability stays semantic, never architectural.
const GATE_CLAUSES_BY_VERDICT: Record<string, Partial<Record<string, string>>> = {
  EvidenceGate: {
    pass: "hay evidencia que lo sostiene",
    limit: "la evidencia todavía es limitada",
    fail: "la evidencia no alcanza",
    "needs-inquiry": "hace falta que confirmes algo antes de seguir",
  },
  UnderstandingGate: {
    pass: "te conoce lo suficiente en este tema",
  },
  PurposeGate: {
    pass: "no contradice lo que declaraste",
    "needs-inquiry": "todavía no sabe bien hacia dónde vas",
  },
  RiskGate: {
    pass: "no implica un riesgo que amerite más cautela",
    "caution-warning": "vale la pena tener cautela",
  },
  AgencyGate: {
    pass: "te lo muestra de un modo que te deja decidir",
  },
};

function humanizeTraceReasons(rawReasons: readonly string[]): string {
  const clauses = rawReasons
    .map((r) => {
      const [gate, verdict] = r.split(":");
      if (gate === undefined || verdict === undefined) return undefined;
      return GATE_CLAUSES_BY_VERDICT[gate]?.[verdict];
    })
    .filter((c): c is string => c !== undefined);
  if (clauses.length === 0) return "Aurora revisó las condiciones habituales antes de mostrarte esto.";
  return `Antes de mostrarte esto, Aurora comprobó que ${clauses.join(", ")}.`;
}

function attentionFrom(
  output: TerminalOutput | undefined,
  substance: {
    readonly observationNote?: string | undefined;
    readonly purposeRelevanceNote?: string | undefined;
    readonly revisionCondition?: string | undefined;
    readonly purposeStatement?: string | undefined;
  },
): AttentionSection {
  if (output === undefined) {
    return Object.freeze({ state: "none" } as const);
  }
  switch (output.outcome) {
    case "support": {
      const observation =
        substance.observationNote ??
        (output.voice === "Silence" ? "" : VOICE_FALLBACK_OBSERVATION[output.voice]);
      const purposeRelevance =
        substance.purposeRelevanceNote === undefined
          ? undefined
          : substance.purposeStatement === undefined
            ? `Esto podría importar porque ${substance.purposeRelevanceNote}.`
            : `Esto podría importar para «${substance.purposeStatement}» porque ${substance.purposeRelevanceNote}.`;
      const base = {
        state: "support" as const,
        voice: output.voice,
        observation,
        traceSummary: humanizeTraceReasons(output.reasons),
        uncertaintyVisible: output.uncertaintyVisible,
        epistemic: "inferred" as const,
      };
      return Object.freeze({
        ...base,
        ...(purposeRelevance === undefined ? {} : { purposeRelevance }),
        ...(substance.revisionCondition === undefined
          ? {}
          : { revisionCondition: `Esto podría cambiar si: ${substance.revisionCondition}.` }),
      });
    }
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

// --- headline: the interpretation itself, never a statement ABOUT having one (045-D §1/AC1) --------

function headlineFrom(direction: DirectionSection, attention: AttentionSection, synthesis: string | undefined): {
  readonly text: string;
  readonly epistemic: "declared" | "inferred";
} {
  if (attention.state === "support" && synthesis !== undefined) {
    return Object.freeze({ text: `Aurora piensa que ${synthesis}.`, epistemic: "inferred" } as const);
  }
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
  const purposeStatement = direction.state === "declared" ? direction.statement : undefined;
  const attention = attentionFrom(input.terminalOutput, {
    observationNote: input.observationNote,
    purposeRelevanceNote: input.purposeRelevanceNote,
    revisionCondition: input.revisionCondition,
    purposeStatement,
  });
  const base = {
    state: "ready" as const,
    headline: headlineFrom(direction, attention, input.interpretationSynthesis),
    direction,
    notYetModeled: NOT_YET_MODELED,
    understanding: understandingFrom(input.assessments),
    attention,
  };
  return Object.freeze(
    input.athleteLabel === undefined ? base : { ...base, athleteLabel: input.athleteLabel },
  );
}
