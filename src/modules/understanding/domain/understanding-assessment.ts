// understanding domain: UnderstandingAssessment (read-only) + SafeVoiceCeiling.
//
// SafeVoiceCeiling is NOT a VoiceMode. It is the MAXIMUM assertiveness a future decision-support
// module may use for this dimension, in understanding's own vocabulary. This slice exposes the
// ceiling; it never selects a voice, never recommends, never warns.

import type { UnderstandingDimension } from "./understanding-dimension.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import type { Fragility } from "./fragility.ts";
import type { Staleness } from "./staleness.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";

export type SafeVoiceCeiling = "none" | "tentative" | "qualified" | "confident";

const CEILING_ORDER: readonly SafeVoiceCeiling[] = ["none", "tentative", "qualified", "confident"];

function lowerCeiling(c: SafeVoiceCeiling): SafeVoiceCeiling {
  const rank = CEILING_ORDER.indexOf(c);
  return rank <= 0 ? "none" : (CEILING_ORDER[rank - 1] as SafeVoiceCeiling);
}

export function deriveSafeVoiceCeiling(
  level: UnderstandingLevel,
  fragility: Fragility,
  staleness: Staleness,
): SafeVoiceCeiling {
  let ceiling: SafeVoiceCeiling =
    level === "Unknown" || level === "Thin"
      ? "none"
      : level === "Working"
        ? "tentative"
        : level === "Trusted"
          ? "qualified"
          : "confident"; // Mature
  // staleness and high fragility can only LOWER the ceiling, never raise it.
  if (staleness.status === "stale") {
    ceiling = lowerCeiling(ceiling);
  }
  if (fragility.level === "high") {
    ceiling = lowerCeiling(ceiling);
  }
  return ceiling;
}

export interface UnderstandingAssessment {
  readonly dimension: UnderstandingDimension;
  readonly level: UnderstandingLevel;
  readonly fragility: Fragility;
  readonly staleness: Staleness;
  readonly safeVoiceCeiling: SafeVoiceCeiling;
  readonly reasons: readonly string[];
  readonly trace: readonly TraceToHypothesisOutcome[];
}
