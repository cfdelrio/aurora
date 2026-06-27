// reasoning domain: the claim and its scope.

export type ClaimSubjectKind = "impact" | "state-relation" | "response-pattern" | "interpretation";

export interface HypothesisClaim {
  readonly statement: string;
  readonly subjectKind: ClaimSubjectKind;
}

export function hypothesisClaim(statement: string, subjectKind: ClaimSubjectKind): HypothesisClaim {
  if (typeof statement !== "string" || statement.length === 0) {
    throw new Error("HypothesisClaim requires a non-empty statement");
  }
  return Object.freeze({ statement, subjectKind });
}

export interface HypothesisScope {
  readonly statement: string;
  readonly dimension?: string;
  readonly timescale?: string;
}

export interface HypothesisScopeInput {
  readonly statement: string;
  readonly dimension?: string;
  readonly timescale?: string;
}

export function hypothesisScope(input: HypothesisScopeInput): HypothesisScope {
  if (typeof input.statement !== "string" || input.statement.length === 0) {
    throw new Error("HypothesisScope requires a non-empty statement");
  }
  const scope: HypothesisScope = {
    statement: input.statement,
    ...(input.dimension !== undefined ? { dimension: input.dimension } : {}),
    ...(input.timescale !== undefined ? { timescale: input.timescale } : {}),
  };
  return Object.freeze(scope);
}
