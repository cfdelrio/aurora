// understanding domain: SurvivedChallenge — a hypothesis faced a real chance to be wrong and held.
// Same-condition repetition is NOT a new distinct challenge (distinct conditions are Set-counted).

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { TraceToHypothesisOutcome } from "./reasoning-outcome.ts";

export interface SurvivedChallenge {
  readonly trace: TraceToHypothesisOutcome;
  readonly conditions: readonly string[];
  readonly falsifierSurvived: boolean;
  readonly at: Timestamp;
}

export interface SurvivedChallengeInput {
  readonly trace: TraceToHypothesisOutcome;
  readonly conditions: readonly string[];
  readonly falsifierSurvived: boolean;
  readonly at: Timestamp;
}

export function survivedChallenge(input: SurvivedChallengeInput): SurvivedChallenge {
  return Object.freeze({
    trace: input.trace,
    conditions: Object.freeze([...input.conditions]),
    falsifierSurvived: input.falsifierSurvived,
    at: input.at,
  });
}

/** Distinct relevant conditions across challenges — Set-counted so repetition cannot inflate it. */
export function distinctConditionCount(challenges: readonly SurvivedChallenge[]): number {
  const set = new Set<string>();
  for (const c of challenges) {
    for (const cond of c.conditions) {
      set.add(cond);
    }
  }
  return set.size;
}
