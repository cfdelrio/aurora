// understanding domain: UnderstandingAssessment (read-only) + SafeVoiceCeiling.
//
// SafeVoiceCeiling is NOT a VoiceMode. It is the MAXIMUM assertiveness a future decision-support
// module may use for this dimension, in understanding's own vocabulary. This slice exposes the
// ceiling; it never selects a voice, never recommends, never warns.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { UnderstandingDimension } from "./understanding-dimension.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import type { Fragility } from "./fragility.ts";
import type { Staleness } from "./staleness.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";
import type { ProjectionFreshness } from "./projection-freshness.ts";
import type { ProjectionTrace, ProjectionLimitations } from "./projection-source-ref.ts";

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

/**
 * Clamp a (freshness-independent) ceiling by projection freshness. Non-current freshness can only
 * LOWER the ceiling, never raise it. `stale`/`partial` lower one step; `invalid`/`unknown` collapse
 * to `none` (→ Withholding downstream). This is the single place freshness affects the ceiling, so
 * staleness is never double-counted (the base passed in must already be freshness-free).
 */
export function clampCeilingByFreshness(
  ceiling: SafeVoiceCeiling,
  freshness: ProjectionFreshness,
): SafeVoiceCeiling {
  switch (freshness.status) {
    case "current":
      return ceiling;
    case "stale":
    case "partial":
      return lowerCeiling(ceiling);
    case "invalid":
    case "unknown":
      return "none";
  }
}

export interface UnderstandingAssessment {
  readonly dimension: UnderstandingDimension;
  readonly level: UnderstandingLevel;
  readonly fragility: Fragility;
  readonly staleness: Staleness;
  /** the ceiling AFTER it has been clamped by freshness (the value consumers must honor) */
  readonly safeVoiceCeiling: SafeVoiceCeiling;
  readonly reasons: readonly string[];
  readonly trace: readonly TraceToHypothesisOutcome[];
  // --- projection metadata (Impl 008; optional so 001-007 literals still compile) ---
  readonly freshness?: ProjectionFreshness;
  readonly derivedAt?: Timestamp;
  readonly sourceRefs?: ProjectionTrace;
  readonly limitations?: ProjectionLimitations;
}

/**
 * Produce a NEW assessment with a different freshness, recomputing the clamped ceiling from the
 * assessment's own level/fragility (freshness-free base, so no double-count). The original is never
 * mutated (refresh/constraint produces a new view; the old one stays auditable if retained).
 */
export function applyFreshness(
  assessment: UnderstandingAssessment,
  freshness: ProjectionFreshness,
): UnderstandingAssessment {
  const base = deriveSafeVoiceCeiling(assessment.level, assessment.fragility, { status: "fresh" });
  const safeVoiceCeiling = clampCeilingByFreshness(base, freshness);
  const reasons =
    freshness.status === "current"
      ? assessment.reasons
      : Object.freeze([
          ...assessment.reasons,
          `freshness ${freshness.status}: ${freshness.reasons.join(",")} -> ceiling ${safeVoiceCeiling}`,
        ]);
  return Object.freeze({ ...assessment, freshness, safeVoiceCeiling, reasons });
}
