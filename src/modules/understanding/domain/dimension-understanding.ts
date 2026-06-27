// understanding domain: DimensionUnderstanding — the per-dimension record inside the profile.
// Not its own aggregate (no independent invariant beyond the profile's).

import type { UnderstandingDimension } from "./understanding-dimension.ts";
import type { UnderstandingLevel } from "./understanding-level.ts";
import type { Fragility } from "./fragility.ts";
import { fragility } from "./fragility.ts";
import type { Staleness } from "./staleness.ts";
import { fresh } from "./staleness.ts";
import type { SurvivedChallenge } from "./survived-challenge.ts";
import type { Surprise } from "./surprise.ts";
import type { UnderstandingChange } from "./understanding-change.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";

export interface DimensionUnderstanding {
  readonly dimension: UnderstandingDimension;
  readonly level: UnderstandingLevel;
  readonly fragility: Fragility;
  readonly staleness: Staleness;
  readonly survivedChallenges: readonly SurvivedChallenge[];
  readonly surprises: readonly Surprise[];
  readonly changes: readonly UnderstandingChange[];
  readonly traces: readonly TraceToHypothesisOutcome[];
}

export function initialDimensionUnderstanding(
  dimension: UnderstandingDimension,
): DimensionUnderstanding {
  return Object.freeze({
    dimension,
    level: "Unknown",
    fragility: fragility("low"),
    staleness: fresh(),
    survivedChallenges: Object.freeze([]),
    surprises: Object.freeze([]),
    changes: Object.freeze([]),
    traces: Object.freeze([]),
  });
}
