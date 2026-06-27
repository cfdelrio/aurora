// understanding domain: UnderstandingLevel — per-dimension, ordinal, never a global score.
// No direct mapping from ClaimConfidence exists (the consumed ReasoningOutcome carries none).

export type UnderstandingLevel = "Unknown" | "Thin" | "Working" | "Trusted" | "Mature";

export const LEVEL_ORDER: readonly UnderstandingLevel[] = [
  "Unknown",
  "Thin",
  "Working",
  "Trusted",
  "Mature",
];

export function levelRank(level: UnderstandingLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

export function higherOf(a: UnderstandingLevel, b: UnderstandingLevel): UnderstandingLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

export function demoteOne(level: UnderstandingLevel): UnderstandingLevel {
  const rank = levelRank(level);
  return rank <= 0 ? "Unknown" : (LEVEL_ORDER[rank - 1] as UnderstandingLevel);
}
