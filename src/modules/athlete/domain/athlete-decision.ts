// athlete domain: AthleteDecision — an athlete-owned record of a choice made in response to context.
//
// NEGATIVE CAPABILITY (the point of this slice): an AthleteDecision has NO field for a compliance
// score, obedience flag, noncompliance score, moral judgement, automatic correctness, hidden reward,
// or inferred athlete state. Following Aurora is not obedience-success; not-following is not failure.
// `divergedFromSupport` is NEUTRAL FACTUAL metadata (the athlete chose differently than framed) --
// valence-free, feeding no reward. The decision is the athlete's; decision-support may only reference it.

import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { AthleteDecisionId } from "./athlete-decision-id.ts";
import { newAthleteDecisionId } from "./athlete-decision-id.ts";
import type { DecisionChoice } from "./decision-choice.ts";
import type { DecisionRationale } from "./decision-rationale.ts";
import { decisionRationale } from "./decision-rationale.ts";
import type { DecisionContext } from "./decision-context.ts";
import { decisionContext } from "./decision-context.ts";
import type { DecisionOutcomeRef } from "./decision-outcome-ref.ts";

/** Where the decision report came from. Athlete source only -- never inferred/system. */
export type DecisionReportSource = "athlete-declared" | "athlete-reported";

const SOURCES: readonly DecisionReportSource[] = ["athlete-declared", "athlete-reported"];

export interface AthleteDecision {
  readonly id: AthleteDecisionId;
  readonly athleteRef: string;
  readonly choice: DecisionChoice;
  readonly rationale: DecisionRationale;
  readonly context: DecisionContext;
  readonly source: DecisionReportSource;
  readonly at: Timestamp;
  /** the athlete's certainty about their own report, if expressed */
  readonly reportConfidence?: string;
  /** NEUTRAL fact: the athlete chose differently than the support framed. Never a score. */
  readonly divergedFromSupport?: boolean;
  /** handles to later, separate outcome observations (may be empty: "no outcome" is valid) */
  readonly outcomeRefs: readonly DecisionOutcomeRef[];
}

export interface AthleteDecisionInput {
  readonly id?: AthleteDecisionId;
  readonly athleteRef: string;
  readonly choice: DecisionChoice;
  readonly rationale?: DecisionRationale;
  readonly context?: DecisionContext;
  readonly source: DecisionReportSource;
  readonly at: Timestamp;
  readonly reportConfidence?: string;
  readonly divergedFromSupport?: boolean;
  readonly outcomeRefs?: readonly DecisionOutcomeRef[];
}

export function athleteDecision(input: AthleteDecisionInput): AthleteDecision {
  if (typeof input.athleteRef !== "string" || input.athleteRef.length === 0) {
    throw new Error("An AthleteDecision requires an athleteRef (it is athlete-owned)");
  }
  if (input.choice === undefined || typeof input.choice.action !== "string" || input.choice.action.length === 0) {
    throw new Error("An AthleteDecision requires a well-formed DecisionChoice");
  }
  if (!SOURCES.includes(input.source)) {
    throw new Error("An AthleteDecision must be athlete-sourced (declared or reported)");
  }
  const base = {
    id: input.id ?? newAthleteDecisionId(),
    athleteRef: input.athleteRef,
    choice: input.choice,
    rationale: input.rationale ?? decisionRationale(),
    context: input.context ?? decisionContext(),
    source: input.source,
    at: input.at,
    outcomeRefs: Object.freeze([...(input.outcomeRefs ?? [])]),
  };
  return Object.freeze({
    ...base,
    ...(input.reportConfidence !== undefined ? { reportConfidence: input.reportConfidence } : {}),
    ...(input.divergedFromSupport !== undefined ? { divergedFromSupport: input.divergedFromSupport } : {}),
  });
}

/** Add a later outcome reference. Returns a NEW decision; the original is never mutated. */
export function withOutcomeRef(decision: AthleteDecision, ref: DecisionOutcomeRef): AthleteDecision {
  return Object.freeze({ ...decision, outcomeRefs: Object.freeze([...decision.outcomeRefs, ref]) });
}

/**
 * An athlete-local reference to a decision. Shape-compatible with the decision-support
 * AthleteDecisionRef ({ decisionId, at, divergedFromSupport? }) so the harness can adapt it WITHOUT
 * athlete importing decision-support. It identifies a decision; it never implies ownership.
 */
export interface AthleteDecisionRef {
  readonly decisionId: string;
  readonly at: Timestamp;
  readonly divergedFromSupport?: boolean;
}

export function athleteDecisionRefOf(decision: AthleteDecision): AthleteDecisionRef {
  const base = { decisionId: String(decision.id), at: decision.at };
  return Object.freeze(
    decision.divergedFromSupport === undefined
      ? base
      : { ...base, divergedFromSupport: decision.divergedFromSupport },
  );
}
