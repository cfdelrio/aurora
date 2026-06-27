// understanding domain: UnderstandingDimension — an athlete-specific (response x conditions)
// pattern. Emergent, not a fixed taxonomy, never an Athlete attribute.
// dimensionKey is simple and explicit (no fine semantic dedup yet — deferred).

export interface UnderstandingDimension {
  readonly key: string;
  readonly responsePattern: string;
  readonly conditionContext: string;
  readonly description: string;
}

export function dimensionKey(responsePattern: string, conditionContext: string): string {
  return `${responsePattern}::${conditionContext}`;
}

export function understandingDimension(
  responsePattern: string,
  conditionContext: string,
  description?: string,
): UnderstandingDimension {
  if (typeof responsePattern !== "string" || responsePattern.length === 0) {
    throw new Error("UnderstandingDimension requires a non-empty responsePattern");
  }
  if (typeof conditionContext !== "string" || conditionContext.length === 0) {
    throw new Error("UnderstandingDimension requires a non-empty conditionContext");
  }
  return Object.freeze({
    key: dimensionKey(responsePattern, conditionContext),
    responsePattern,
    conditionContext,
    description: description ?? `${responsePattern} under ${conditionContext}`,
  });
}
