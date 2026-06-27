// athlete domain: DecisionChoice — what the athlete actually chose.
//
// NEGATIVE CAPABILITY: a DecisionChoice has NO followed/not-followed boolean and NO compliance
// field. A modification is FIRST-CLASS (free text), never collapsed to binary compliance.

export interface DecisionChoice {
  /** the action the athlete chose, in their terms */
  readonly action: string;
  /** alternatives the athlete was aware of, if reported */
  readonly alternatives?: readonly string[];
  /** how the athlete adapted/combined options, if any (first-class, not a binary flag) */
  readonly modification?: string;
}

export interface DecisionChoiceInput {
  readonly action: string;
  readonly alternatives?: readonly string[];
  readonly modification?: string;
}

export function decisionChoice(input: DecisionChoiceInput): DecisionChoice {
  if (typeof input.action !== "string" || input.action.length === 0) {
    throw new Error("A DecisionChoice requires a non-empty chosen action");
  }
  const base = { action: input.action };
  return Object.freeze({
    ...base,
    ...(input.alternatives !== undefined
      ? { alternatives: Object.freeze([...input.alternatives]) }
      : {}),
    ...(input.modification !== undefined ? { modification: input.modification } : {}),
  });
}
