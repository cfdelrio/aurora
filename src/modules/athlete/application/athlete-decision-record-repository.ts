// athlete application: the AthleteDecisionRecord repository PORT (keyed by athleteRef).
// Preserves and restores athlete-owned, append-only decisions; never scores obedience/compliance.

import type { AthleteDecisionRecord } from "../domain/index.ts";

export interface AthleteDecisionRecordRepository {
  save(record: AthleteDecisionRecord): void;
  findByAthleteRef(athleteRef: string): AthleteDecisionRecord | undefined;
  exists(athleteRef: string): boolean;
}
