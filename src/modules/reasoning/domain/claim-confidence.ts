// reasoning domain: ClaimConfidence — claim-specific, qualitative, NEVER certainty,
// NEVER global athlete-understanding. There is deliberately no "certain" level.

export type ConfidenceLevel = "tentative" | "limited" | "moderate" | "well-supported";

export const CONFIDENCE_ORDER: readonly ConfidenceLevel[] = [
  "tentative",
  "limited",
  "moderate",
  "well-supported",
];

export interface ClaimConfidence {
  readonly level: ConfidenceLevel;
  readonly limitations: readonly string[];
}

export function claimConfidence(
  level: ConfidenceLevel,
  limitations: readonly string[] = [],
): ClaimConfidence {
  return Object.freeze({ level, limitations: Object.freeze([...limitations]) });
}
