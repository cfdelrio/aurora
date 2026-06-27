// decision-support domain: RiskAssessment (input placeholder shape).
// Risk may raise toward caution only; it never justifies a stronger Recommendation.

export type RiskKind =
  | "injury"
  | "overtraining"
  | "psychological"
  | "trust"
  | "adaptation-waste"
  | "safety";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskAssessment {
  readonly level: RiskLevel;
  readonly kinds: readonly RiskKind[];
  readonly note?: string;
}

export function riskAssessment(
  level: RiskLevel,
  kinds: readonly RiskKind[] = [],
  note?: string,
): RiskAssessment {
  const r: RiskAssessment = {
    level,
    kinds: Object.freeze([...kinds]),
    ...(note !== undefined ? { note } : {}),
  };
  return Object.freeze(r);
}

export function noRisk(): RiskAssessment {
  return riskAssessment("low", []);
}
