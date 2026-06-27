// signal sub-boundary: the contextual frame an observation could be interpreted against.
// A frame provides interpretive FRAME, not conclusion. It owns nothing — purpose, baseline,
// expected range, etc. are read-only snapshots passed in. Missing context is explicit.

export interface ExpectedRange {
  readonly quantity: string;
  readonly low: number;
  readonly high: number;
  readonly unit: string;
}

export interface ContextualFrame {
  readonly purpose?: string;
  readonly baselineRef?: string;
  readonly expectedRange?: ExpectedRange;
  readonly sessionContext?: string;
  readonly constraints?: readonly string[];
  /** which expected context was absent (explicit, never silent) */
  readonly missingContext: readonly string[];
}

export interface ContextualFrameInput {
  readonly purpose?: string;
  readonly baselineRef?: string;
  readonly expectedRange?: ExpectedRange;
  readonly sessionContext?: string;
  readonly constraints?: readonly string[];
  readonly missingContext?: readonly string[];
}

export function contextualFrame(input: ContextualFrameInput = {}): ContextualFrame {
  const frame: ContextualFrame = {
    ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
    ...(input.baselineRef !== undefined ? { baselineRef: input.baselineRef } : {}),
    ...(input.expectedRange !== undefined
      ? { expectedRange: Object.freeze({ ...input.expectedRange }) }
      : {}),
    ...(input.sessionContext !== undefined ? { sessionContext: input.sessionContext } : {}),
    ...(input.constraints !== undefined
      ? { constraints: Object.freeze([...input.constraints]) }
      : {}),
    missingContext: Object.freeze([...(input.missingContext ?? [])]),
  };
  return Object.freeze(frame);
}
