// athlete domain: DecisionRationale — the athlete's stated reasons for the choice.
//
// Rationale is athlete-reported CONTEXT, not final truth. It may contain disagreement with Aurora,
// purpose conflict, risk concern, constraint, fatigue, preference, uncertainty. It travels the
// ladder like any self-report (it may become Observation; never Evidence directly). It carries NO
// shame/compliance marker.

export interface DecisionRationale {
  /** athlete-stated reasons; may be empty (unreported) */
  readonly statements: readonly string[];
}

export function decisionRationale(statements: readonly string[] = []): DecisionRationale {
  return Object.freeze({ statements: Object.freeze([...statements]) });
}
