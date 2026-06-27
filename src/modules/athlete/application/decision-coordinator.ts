// athlete application: thin coordinators for AthleteDecision. They COORDINATE, they do not reason.
// All append-only/ownership invariants live in AthleteDecisionRecord + the value constructors.
// Imports only the athlete domain (and, transitively, shared-kernel) -- never any downstream module.

import { AthleteDecisionRecord } from "../domain/index.ts";
import type { AthleteDecision, AthleteDecisionAmendment } from "../domain/index.ts";

export interface RecordDecisionInput {
  readonly record: AthleteDecisionRecord;
  readonly decision: AthleteDecision;
}

export function recordAthleteDecision(input: RecordDecisionInput): AthleteDecisionRecord {
  return input.record.record(input.decision);
}

export interface AmendDecisionInput {
  readonly record: AthleteDecisionRecord;
  readonly amendment: AthleteDecisionAmendment;
}

export function amendAthleteDecision(input: AmendDecisionInput): AthleteDecisionRecord {
  return input.record.amend(input.amendment);
}
